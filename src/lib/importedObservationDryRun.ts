import {
  collection,
  getDocs,
  query,
  limit,
  where,
  doc,
  getDoc,
  Firestore,
  DocumentReference,
} from 'firebase/firestore';
import { IdentifierRecord, IdentifierObservationRecord } from '../types';
import { APPLICATION_UUID_V5_NAMESPACE, uuidV5FromCanonicalPayload } from './deterministicUuid';

export interface ImportedObservationDryRunLimits {
  maxIdentifiers: number;
  maxObservationsPerIdentifier: number;
  maxCandidates: number;
  maxSamplesPerCategory: number;
}

export interface Candidate {
  identifierKey: string;
  ownerId: string;
  observationId: string;
  deterministicPayload: any;
  proposedObservation: any;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface Skipped {
  identifierKey: string;
  reason: string;
  notes?: string;
}

export interface Warning {
  type: string;
  message: string;
}

export interface ImportedObservationDryRunResult {
  checkedAt: string;
  scope: {
    ownerId: string;
    mode: 'owner-scoped';
  };
  limits: ImportedObservationDryRunLimits;
  counts: {
    identifiersChecked: number;
    observationsChecked: number;
  };
  candidateCounts: number;
  candidates: Candidate[];
  skipped: Skipped[];
  warnings: Warning[];
}

// Utility to distinguish between non-existent and inaccessible docs
type SafeGetDocResult<T> =
  | { status: 'exists'; data: T; id: string }
  | { status: 'missing' }
  | { status: 'inaccessible'; code?: string; message?: string };

async function safeGetDoc<T>(docRef: DocumentReference): Promise<SafeGetDocResult<T>> {
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { status: 'exists', data: snap.data() as T, id: snap.id };
    } else {
      return { status: 'missing' };
    }
  } catch (e: any) {
    return { status: 'inaccessible', code: e?.code, message: e?.message };
  }
}

export async function runImportedObservationDryRun(
  db: Firestore,
  ownerId: string,
  options?: Partial<ImportedObservationDryRunLimits>
): Promise<ImportedObservationDryRunResult> {
  const limits: ImportedObservationDryRunLimits = {
    maxIdentifiers: 50,
    maxObservationsPerIdentifier: 20,
    maxCandidates: 50,
    maxSamplesPerCategory: 5,
    ...options,
  };

  const result: ImportedObservationDryRunResult = {
    checkedAt: new Date().toISOString(),
    scope: { ownerId, mode: 'owner-scoped' },
    limits,
    counts: {
      identifiersChecked: 0,
      observationsChecked: 0,
    },
    candidateCounts: 0,
    candidates: [],
    skipped: [],
    warnings: [],
  };

  const warningCounts = new Map<string, number>();
  const addWarning = (type: string, message: string) => {
    const count = warningCounts.get(type) || 0;
    if (count < limits.maxSamplesPerCategory) {
      result.warnings.push({ type, message });
      warningCounts.set(type, count + 1);
    }
  };

  const skippedCounts = new Map<string, number>();
  const addSkipped = (skipped: Skipped) => {
    const count = skippedCounts.get(skipped.reason) || 0;
    if (count < limits.maxSamplesPerCategory) {
      result.skipped.push(skipped);
      skippedCounts.set(skipped.reason, count + 1);
    }
  };

  const addCandidate = (candidate: Candidate) => {
    result.candidateCounts++;
    if (result.candidates.length < limits.maxCandidates) {
      result.candidates.push(candidate);
    }
  };

  try {
    // 1. Fetch sample identifiers owned by the user
    const idenQuery = query(
      collection(db, 'identifiers'),
      where('ownerId', '==', ownerId),
      limit(limits.maxIdentifiers)
    );
    const idenSnap = await getDocs(idenQuery);

    result.counts.identifiersChecked = idenSnap.docs.length;

    for (const docSnap of idenSnap.docs) {
      const iden = docSnap.data() as IdentifierRecord;
      const { identifierKey } = iden;

      if (!identifierKey) {
         addSkipped({ identifierKey: docSnap.id, reason: 'missing-required-source-data', notes: 'identifierKey is missing' });
         continue;
      }

      // 2. Check identifier status policy
      if (iden.status === 'retired' || iden.status === 'lost' || iden.status === 'replaced') {
         addSkipped({ identifierKey, reason: 'unsupported-identifier-status', notes: `Status is ${iden.status}` });
         continue;
      }

      // Check required fields
      if (!iden.createdAt || !iden.kind || !iden.scheme || !iden.canonicalValue || !iden.status) {
         addSkipped({ identifierKey, reason: 'missing-required-source-data', notes: 'Missing one or more required fields (createdAt, kind, scheme, canonicalValue, status)' });
         continue;
      }

      // 3. Check for existing "real" observations
      let hasRealObservations = false;
      try {
        const obsQueryNew = query(
          collection(db, 'identifierObservations'),
          where('identifierKey', '==', identifierKey),
          where('ownerId', '==', ownerId),
          limit(limits.maxObservationsPerIdentifier)
        );
        const obsQueryLegacy = query(
          collection(db, 'identifierObservations'),
          where('identifierKey', '==', identifierKey),
          where('observerUid', '==', ownerId),
          limit(limits.maxObservationsPerIdentifier)
        );

        const [obsSnapNew, obsSnapLegacy] = await Promise.all([
          getDocs(obsQueryNew),
          getDocs(obsQueryLegacy)
        ]);

        result.counts.observationsChecked += obsSnapNew.size + obsSnapLegacy.size;

        if (obsSnapNew.size === limits.maxObservationsPerIdentifier || obsSnapLegacy.size === limits.maxObservationsPerIdentifier) {
          hasRealObservations = true;
        } else {
          const allObs = new Map<string, IdentifierObservationRecord>();
          obsSnapNew.docs.forEach(d => allObs.set(d.id, d.data() as IdentifierObservationRecord));
          obsSnapLegacy.docs.forEach(d => allObs.set(d.id, d.data() as IdentifierObservationRecord));

          for (const obs of allObs.values()) {
            // A real observation is one that is not imported.
            const isImported = obs.source === 'import' || obs.observationType === 'imported';
            if (!isImported) {
               hasRealObservations = true;
               break;
            }
          }
        }
      } catch (err: any) {
        addWarning('observation-check-failed', `Failed reading observations for ${identifierKey}: ${err.message}`);
        addSkipped({ identifierKey, reason: 'observation-check-inaccessible' });
        continue;
      }

      if (hasRealObservations) {
        addSkipped({ identifierKey, reason: 'has-real-observations' });
        continue;
      }

      // 4. Timestamp policy
      // Use identifier.createdAt for preview. We represent it as a string for preview purposes.
      const observedAtPreview = iden.createdAt.toDate ? iden.createdAt.toDate().toISOString() : JSON.stringify(iden.createdAt);

      // 5. Deterministic UUIDv5 observation ID
      const deterministicPayload = {
        app: "scan.moukaeritai.work",
        idKind: "identifierObservation",
        idPurpose: "imported-baseline-observation",
        schemaVersion: 1,
        migration: "observation-model-migration",
        migrationPhase: "phase-6a",
        baseline: "tag-1.0.0",
        ownerId: ownerId,
        identifierKey: identifierKey
      };

      let observationId: string;
      try {
         observationId = uuidV5FromCanonicalPayload(deterministicPayload);
      } catch (err: any) {
         addSkipped({ identifierKey, reason: 'uuid-generation-failed', notes: err.message });
         continue;
      }

      // 6. Conflict checks
      const obsDocRef = doc(db, 'identifierObservations', observationId);
      const obsCheck = await safeGetDoc<IdentifierObservationRecord>(obsDocRef);

      if (obsCheck.status === 'exists') {
        addSkipped({ identifierKey, reason: 'deterministic-observation-already-exists' });
        continue;
      } else if (obsCheck.status === 'inaccessible') {
        addSkipped({ identifierKey, reason: 'deterministic-observation-inaccessible', notes: obsCheck.message });
        continue;
      }

      // 7. Proposed imported observation shape
      const metadata = {
        migration: {
          name: "observation-model-migration",
          phase: "phase-6a",
          version: "v1",
          baseline: "tag-1.0.0",
          importedFrom: "identifiers",
          sourceIdentifierKey: identifierKey,
          ...(iden.status === 'active' && iden.objectId ? { sourceObjectId: iden.objectId } : {}),
          timestampSource: "identifier.createdAt",
          observedAtIsInferred: true,
          deterministicIdNamespace: APPLICATION_UUID_V5_NAMESPACE,
          deterministicIdPayloadSchemaVersion: 1
        }
      };

      const proposedObservation = {
        observationId,
        identifierKey,
        ownerId,
        observerKind: "system",
        observedAt: observedAtPreview,
        receivedAt: "<serverTimestamp at execute time>",
        createdAt: "<serverTimestamp at execute time>",
        source: "import",
        observationType: "imported",
        visibility: "private",
        schemaVersion: 1,
        ...(iden.status === 'active' && iden.objectId ? { objectId: iden.objectId } : {}),
        metadata
      };

      addCandidate({
        identifierKey,
        ownerId,
        observationId,
        deterministicPayload,
        proposedObservation,
        reason: 'Missing imported baseline observation',
        confidence: 'high'
      });
    }

  } catch (err: any) {
    addWarning('diagnostics-read-error', `Failed reading identifiers: ${err.message}`);
  }

  return result;
}
