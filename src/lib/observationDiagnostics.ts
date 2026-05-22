import {
  collection,
  getDocs,
  query,
  limit,
  where,
  doc,
  getDoc,
  Firestore,
} from 'firebase/firestore';
import {
  IdentifierObservationRecord,
  IdentifierRecord,
  ObjectRecord,
  ObjectIdentifierBindingRecord,
} from '../types';
import {
  loadObjectIdentifiersForSummary,
  findCanonicalBindingsForOwner,
} from './identifierBindings';
import { computeIdentifierSummary } from './objectSummaries';

export interface DiagnosticsLimits {
  maxObservations: number;
  maxIdentifiers: number;
  maxObjects: number;
  maxBindings: number;
  maxSamplesPerIssue: number;
}

export interface DiagnosticsIssue {
  type: string;
  description: string;
  severity: 'error' | 'warning';
  samples: any[];
}

export interface DiagnosticsCounts {
  observationsChecked: number;
  identifiersChecked: number;
  objectsChecked: number;
  bindingsChecked: number;
}

export interface ObservationDiagnosticsResult {
  checkedAt: string;
  limits: DiagnosticsLimits;
  counts: DiagnosticsCounts;
  issues: DiagnosticsIssue[];
}

export async function runObservationDiagnostics(
  db: Firestore,
  ownerId: string,
  limits: Partial<DiagnosticsLimits> = {}
): Promise<ObservationDiagnosticsResult> {
  const mergedLimits: DiagnosticsLimits = {
    maxObservations: 50,
    maxIdentifiers: 50,
    maxObjects: 50,
    maxBindings: 50,
    maxSamplesPerIssue: 5,
    ...limits,
  };

  const counts: DiagnosticsCounts = {
    observationsChecked: 0,
    identifiersChecked: 0,
    objectsChecked: 0,
    bindingsChecked: 0,
  };

  const issuesMap = new Map<string, DiagnosticsIssue>();

  const reportIssue = (
    type: string,
    description: string,
    severity: 'error' | 'warning',
    sample: any
  ) => {
    if (!issuesMap.has(type)) {
      issuesMap.set(type, { type, description, severity, samples: [] });
    }
    const issue = issuesMap.get(type)!;
    if (issue.samples.length < mergedLimits.maxSamplesPerIssue) {
      issue.samples.push(sample);
    }
  };

  // Safe get helper for optional relationships
  const safeGetDoc = async (docRef: any) => {
    try {
      return await getDoc(docRef);
    } catch (e) {
      // Permission denied or other error
      return null;
    }
  };

  // --- 1. Check Observations ---
  try {
    const obsQ = query(collection(db, 'identifierObservations'), where('observerUid', '==', ownerId), limit(mergedLimits.maxObservations));
    const obsSnap = await getDocs(obsQ);
    counts.observationsChecked = obsSnap.docs.length;

    for (const d of obsSnap.docs) {
      const obs = d.data() as IdentifierObservationRecord;

      // Check B: Observation document ID consistency
      if (obs.observationId !== d.id) {
        reportIssue('observation-id-mismatch', 'observationId field does not match document ID', 'error', { docId: d.id, observationId: obs.observationId });
      }

      // Check A: Observation -> identifier reference
      if (obs.identifierKey) {
        const idSnap = await safeGetDoc(doc(db, 'identifiers', obs.identifierKey));
        if (!idSnap || !idSnap.exists()) {
          reportIssue('observation-missing-identifier', 'Observation references missing identifier', 'error', { observationId: obs.observationId, identifierKey: obs.identifierKey });
        }
      } else {
        reportIssue('observation-missing-identifier-key', 'Observation lacks identifierKey', 'error', { observationId: obs.observationId });
      }

      // Check C: Observation object reference
      if (obs.objectId) {
        const objSnap = await safeGetDoc(doc(db, 'objects', obs.objectId));
        if (!objSnap || !objSnap.exists()) {
          reportIssue('observation-missing-object', 'Observation references missing object', 'error', { observationId: obs.observationId, objectId: obs.objectId });
        }
      }

      // Check D: Observation value sanity
      if (obs.observerKind === 'user') {
        const invalidSources = ['import', 'gateway', 'ble'];
        if (invalidSources.includes(obs.source)) {
          reportIssue('observation-invalid-source', 'User observation uses reserved source', 'warning', { observationId: obs.observationId, source: obs.source });
        }
        const invalidTypes = ['imported', 'proximity', 'gateway_seen'];
        if (invalidTypes.includes(obs.observationType)) {
          reportIssue('observation-invalid-type', 'User observation uses reserved type', 'warning', { observationId: obs.observationId, observationType: obs.observationType });
        }
      }
    }
  } catch (err: any) {
    reportIssue('diagnostics-read-error', `Failed reading observations: ${err.message}`, 'error', {});
  }

  // --- 2. Check Identifiers ---
  try {
    const idQ = query(collection(db, 'identifiers'), where('ownerId', '==', ownerId), limit(mergedLimits.maxIdentifiers));
    const idSnap = await getDocs(idQ);
    counts.identifiersChecked = idSnap.docs.length;

    for (const d of idSnap.docs) {
      const iden = d.data() as IdentifierRecord;

      // Check E: Identifier observation summary references
      if (iden.lastObservationId) {
        const obsSnap = await safeGetDoc(doc(db, 'identifierObservations', iden.lastObservationId));
        if (!obsSnap || !obsSnap.exists()) {
          reportIssue('identifier-missing-last-observation', 'Identifier references missing lastObservationId', 'warning', { identifierKey: iden.identifierKey, lastObservationId: iden.lastObservationId });
        }
      }
      if (iden.firstObservationId) {
        const obsSnap = await safeGetDoc(doc(db, 'identifierObservations', iden.firstObservationId));
        if (!obsSnap || !obsSnap.exists()) {
          reportIssue('identifier-missing-first-observation', 'Identifier references missing firstObservationId', 'warning', { identifierKey: iden.identifierKey, firstObservationId: iden.firstObservationId });
        }
      }

      // Check F: Identifier state sanity
      if (iden.discoveryState === 'observed' && iden.status !== 'unassigned') {
        reportIssue('identifier-unexpected-status', 'Observed identifier has non-unassigned status', 'warning', { identifierKey: iden.identifierKey, status: iden.status });
      }
      if (iden.status === 'unassigned' && iden.objectId) {
        reportIssue('identifier-unassigned-has-object', 'Unassigned identifier has objectId set', 'warning', { identifierKey: iden.identifierKey, objectId: iden.objectId });
      }

      // Check G: Active identifier / binding consistency
      if (iden.status === 'active' && iden.objectId) {
        // Safe check using helper
        const bindings = await findCanonicalBindingsForOwner(db, ownerId, iden.objectId, iden.identifierKey);
        const activeBindings = bindings.filter(b => b.data().status === 'active');
        if (activeBindings.length === 0) {
          reportIssue('active-identifier-missing-canonical-binding', 'Active identifier lacks canonical active binding', 'error', { identifierKey: iden.identifierKey, objectId: iden.objectId });
        } else if (activeBindings.length > 1) {
          reportIssue('active-identifier-duplicate-bindings', 'Active identifier has multiple active bindings', 'error', { identifierKey: iden.identifierKey, objectId: iden.objectId });
        }
      }
    }
  } catch (err: any) {
    reportIssue('diagnostics-read-identifiers-error', `Failed reading identifiers: ${err.message}`, 'error', {});
  }

  // --- 3. Check Bindings ---
  try {
    const bindQ = query(collection(db, 'objectIdentifierBindings'), where('ownerId', '==', ownerId), limit(mergedLimits.maxBindings));
    const bindSnap = await getDocs(bindQ);
    counts.bindingsChecked = bindSnap.docs.length;

    for (const d of bindSnap.docs) {
      const binding = d.data() as ObjectIdentifierBindingRecord;

      if (binding.status === 'active') {
        // Check H: Binding -> identifier/object consistency
        const idSnap = await safeGetDoc(doc(db, 'identifiers', binding.identifierKey));
        if (!idSnap || !idSnap.exists()) {
          reportIssue('binding-missing-identifier', 'Binding references missing identifier', 'error', { bindingId: binding.bindingId, identifierKey: binding.identifierKey });
        }

        const objSnap = await safeGetDoc(doc(db, 'objects', binding.objectId));
        if (!objSnap || !objSnap.exists()) {
          reportIssue('binding-missing-object', 'Binding references missing object', 'error', { bindingId: binding.bindingId, objectId: binding.objectId });
        }
      }
    }
  } catch (err: any) {
    reportIssue('diagnostics-read-bindings-error', `Failed reading bindings: ${err.message}`, 'error', {});
  }

  // --- 4. Check Objects ---
  try {
    const objQ = query(collection(db, 'objects'), where('ownerId', '==', ownerId), limit(mergedLimits.maxObjects));
    const objSnap = await getDocs(objQ);
    counts.objectsChecked = objSnap.docs.length;

    for (const d of objSnap.docs) {
      const obj = d.data() as ObjectRecord;

      // Check I: Object identifier summary staleness
      if (obj.objectId && ownerId === obj.ownerId) {
        // Enforce a strict bound on identifiers loaded per object to prevent latency spikes
        const maxIdentifiersPerObject = 100;
        const idQ = query(
          collection(db, 'identifiers'),
          where('ownerId', '==', ownerId),
          where('objectId', '==', obj.objectId),
          limit(maxIdentifiersPerObject)
        );
        const currentIdentifiersSnap = await getDocs(idQ);

        if (currentIdentifiersSnap.docs.length >= maxIdentifiersPerObject) {
          reportIssue('object-identifier-summary-partial-check', 'Object has too many identifiers for bounded staleness check', 'warning', { objectId: obj.objectId, maxLimit: maxIdentifiersPerObject });
          continue;
        }

        const currentIdentifiers = currentIdentifiersSnap.docs.map(doc => doc.data() as IdentifierRecord);
        const computedSummary = computeIdentifierSummary(currentIdentifiers);

        const storedSummary = obj.identifierSummary || {
          activeKinds: [],
          activeIdentifierCount: 0,
          hasQr: false,
          hasNfc: false,
        };

        const isStale =
          computedSummary.activeIdentifierCount !== storedSummary.activeIdentifierCount ||
          computedSummary.hasQr !== storedSummary.hasQr ||
          computedSummary.hasNfc !== storedSummary.hasNfc ||
          [...computedSummary.activeKinds].sort().join(',') !== [...(storedSummary.activeKinds || [])].sort().join(',');

        if (isStale) {
          reportIssue('object-identifier-summary-stale', 'Object identifierSummary does not match active identifiers', 'warning', {
            objectId: obj.objectId,
            stored: storedSummary,
            computed: computedSummary
          });
        }
      }
    }
  } catch (err: any) {
    reportIssue('diagnostics-read-objects-error', `Failed reading objects: ${err.message}`, 'error', {});
  }

  return {
    checkedAt: new Date().toISOString(),
    limits: mergedLimits,
    counts,
    issues: Array.from(issuesMap.values()),
  };
}
