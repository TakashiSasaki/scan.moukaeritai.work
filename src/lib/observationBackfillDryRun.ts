import {
  collection,
  getDocs,
  query,
  limit,
  where,
  Firestore,
  orderBy,
} from 'firebase/firestore';
import {
  IdentifierRecord,
  ObjectRecord,
  IdentifierObservationRecord,
  ObjectIdentifierBindingRecord,
} from '../types';
import { computeIdentifierSummary } from './objectSummaries';
import { loadObjectIdentifiersForSummary } from './identifierBindings';

export interface DryRunLimits {
  maxIdentifiers: number;
  maxObjects: number;
  maxObservations: number;
  maxCandidates: number;
  maxSamplesPerCategory: number;
  maxBindingsPerObject: number;
  maxIdentifiersPerObject: number;
}

export interface DryRunOptions extends Partial<DryRunLimits> {
  includeSamples?: boolean;
}

export interface DryRunCounts {
  identifiersChecked: number;
  objectsChecked: number;
  candidateCounts: {
    identifiers: number;
    objects: number;
  };
}

export interface DryRunCandidate {
  targetCollection: 'identifiers' | 'objects';
  targetDocId: string;
  reason: string;
  proposedPatch: Record<string, any>;
  currentValues: Record<string, any>;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface DryRunSkipped {
  targetCollection: 'identifiers' | 'objects';
  targetDocId: string;
  reason: string;
  notes?: string;
}

export interface DryRunResult {
  checkedAt: string;
  scope: { ownerId: string; mode: string };
  limits: DryRunLimits;
  counts: DryRunCounts;
  candidates: DryRunCandidate[];
  skipped: DryRunSkipped[];
  warnings: any[];
}

const DEFAULT_LIMITS: DryRunLimits = {
  maxIdentifiers: 50,
  maxObjects: 50,
  maxObservations: 100,
  maxCandidates: 50,
  maxSamplesPerCategory: 5,
  maxBindingsPerObject: 50,
  maxIdentifiersPerObject: 50,
};

export async function runObservationBackfillDryRun(
  db: Firestore,
  ownerId: string,
  options?: DryRunOptions
): Promise<DryRunResult> {
  const limits: DryRunLimits = { ...DEFAULT_LIMITS, ...options };
  const result: DryRunResult = {
    checkedAt: new Date().toISOString(),
    scope: { ownerId, mode: 'owner-scoped' },
    limits,
    counts: {
      identifiersChecked: 0,
      objectsChecked: 0,
      candidateCounts: { identifiers: 0, objects: 0 },
    },
    candidates: [],
    skipped: [],
    warnings: [],
  };

  try {
    // 1. Process Identifiers
    const identifiersQuery = query(
      collection(db, 'identifiers'),
      where('ownerId', '==', ownerId),
      limit(limits.maxIdentifiers)
    );
    const identifiersSnap = await getDocs(identifiersQuery);
    result.counts.identifiersChecked = identifiersSnap.size;

    for (const docSnap of identifiersSnap.docs) {
      const identifier = docSnap.data() as IdentifierRecord;
      let patch: Record<string, any> = {};
      let skipReason = '';

      // Fetch real observations for this identifier
      const obsQuery = query(
        collection(db, 'identifierObservations'),
        where('identifierKey', '==', identifier.identifierKey),
        orderBy('observedAt', 'asc'),
        limit(limits.maxObservations)
      );
      const obsSnap = await getDocs(obsQuery);
      const observations = obsSnap.docs.map(d => d.data() as IdentifierObservationRecord);

      // A. Discovery State
      if (!identifier.discoveryState) {
        if (identifier.status === 'unassigned' && !identifier.objectId) {
          if (observations.length > 0 || identifier.firstObservedAt) {
            patch.discoveryState = 'observed';
          }
        } else if (identifier.status === 'active' && identifier.objectId) {
          patch.discoveryState = 'registered';
        } else if (identifier.status === 'retired' || identifier.status === 'lost') {
            patch.discoveryState = 'detached'; // Wait, let's stick to simple inference. Status 'detached' isn't standard status, it's discovery state detached.
        } else {
            // Check if status implies detached but unambiguous
            // The instructions say: "If the identifier appears detached/inactive according to existing status conventions, propose "discoveryState: 'detached'" only if that status is already explicit and unambiguous."
            // Statuses: 'active' | 'unassigned' | 'retired' | 'lost' | 'replaced'
            if (identifier.status === 'unassigned' && identifier.objectId) {
                // Actually unassigned shouldn't have objectId.
                skipReason = 'ambiguous-discovery-state';
            }
        }
      }

      // B & C. First/Last Observation fields
      if (observations.length > 0) {
        // Sort by observedAt, then receivedAt, then observationId
        observations.sort((a, b) => {
            const timeA = a.observedAt.toMillis();
            const timeB = b.observedAt.toMillis();
            if (timeA !== timeB) return timeA - timeB;
            const recA = a.receivedAt.toMillis();
            const recB = b.receivedAt.toMillis();
            if (recA !== recB) return recA - recB;
            return a.observationId.localeCompare(b.observationId);
        });

        const firstObs = observations[0];
        const lastObs = observations[observations.length - 1];

        if (!identifier.firstObservedAt) patch.firstObservedAt = firstObs.observedAt;
        if (!identifier.firstObservationId) patch.firstObservationId = firstObs.observationId;
        if (!identifier.firstObservedBy && firstObs.observerUid) patch.firstObservedBy = firstObs.observerUid;

        if (!identifier.lastObservedAt) patch.lastObservedAt = lastObs.observedAt;
        if (!identifier.lastObservationId) patch.lastObservationId = lastObs.observationId;
        if (!identifier.lastObservedBy && lastObs.observerUid) patch.lastObservedBy = lastObs.observerUid;
        if (!identifier.lastObservedSource) patch.lastObservedSource = lastObs.source;
      } else {
          if (Object.keys(patch).length === 0 && !skipReason) {
              skipReason = 'no-real-observations';
          }
      }

      if (skipReason) {
          result.skipped.push({
              targetCollection: 'identifiers',
              targetDocId: identifier.identifierKey,
              reason: skipReason
          });
      } else if (Object.keys(patch).length > 0) {
          if (result.counts.candidateCounts.identifiers < limits.maxCandidates) {
              result.candidates.push({
                  targetCollection: 'identifiers',
                  targetDocId: identifier.identifierKey,
                  reason: 'backfill-optional-fields',
                  proposedPatch: patch,
                  currentValues: {
                      discoveryState: identifier.discoveryState,
                      firstObservedAt: identifier.firstObservedAt,
                      lastObservedAt: identifier.lastObservedAt,
                      status: identifier.status,
                      objectId: identifier.objectId
                  },
                  confidence: 'high'
              });
          }
          result.counts.candidateCounts.identifiers++;
      }
    }

    // 2. Process Objects
    const objectsQuery = query(
      collection(db, 'objects'),
      where('ownerId', '==', ownerId),
      limit(limits.maxObjects)
    );
    const objectsSnap = await getDocs(objectsQuery);
    result.counts.objectsChecked = objectsSnap.size;

    for (const docSnap of objectsSnap.docs) {
      const obj = docSnap.data() as ObjectRecord;
      let patch: Record<string, any> = {};
      let skipReason = '';

      if (!obj.visibility) {
        patch.visibility = 'private';
      }

      if (obj.ownerId && !obj.ownerUid) {
        patch.ownerUid = obj.ownerId;
      }

      if (!obj.createdBy) {
          if (obj.ownerId) {
              patch.createdBy = obj.ownerId;
          } else {
              skipReason = 'ambiguous-created-by';
          }
      }

      // Fetch currently attached active identifiers
      const bindingsQuery = query(
          collection(db, 'objectIdentifierBindings'),
          where('ownerId', '==', ownerId),
          where('objectId', '==', obj.objectId),
          where('status', '==', 'active'),
          limit(limits.maxBindingsPerObject)
      );
      const bindingsSnap = await getDocs(bindingsQuery);

      if (bindingsSnap.empty) {
          if (Object.keys(patch).length === 0 && !skipReason) skipReason = 'no-real-observations';
      } else {
          // Check lastReported fields and identifierSummary staleness
          let allObservations: IdentifierObservationRecord[] = [];

          // Compute summary staleness
          let activeIdentifiers = await loadObjectIdentifiersForSummary(db, ownerId, obj.objectId);
          if (activeIdentifiers.length > limits.maxIdentifiersPerObject) {
            result.warnings.push({
              type: 'dry-run-limit-hit',
              message: `Object ${obj.objectId} exceeded maxIdentifiersPerObject limit (${limits.maxIdentifiersPerObject}). Computed summary may be inaccurate.`,
            });
            activeIdentifiers = activeIdentifiers.slice(0, limits.maxIdentifiersPerObject);
          }
          const computedSummary = computeIdentifierSummary(activeIdentifiers);

          if (JSON.stringify(obj.identifierSummary) !== JSON.stringify(computedSummary)) {
              patch.identifierSummary = computedSummary;
          }

          for (const bindingSnap of bindingsSnap.docs) {
              const binding = bindingSnap.data() as ObjectIdentifierBindingRecord;
              const obsQuery = query(
                  collection(db, 'identifierObservations'),
                  where('identifierKey', '==', binding.identifierKey),
                  orderBy('observedAt', 'asc'),
                  limit(limits.maxObservations)
              );
              const obsSnap = await getDocs(obsQuery);
              allObservations.push(...obsSnap.docs.map(d => d.data() as IdentifierObservationRecord));
          }

          if (allObservations.length > 0) {
              allObservations.sort((a, b) => {
                  const timeA = a.observedAt.toMillis();
                  const timeB = b.observedAt.toMillis();
                  if (timeA !== timeB) return timeA - timeB;
                  const recA = a.receivedAt.toMillis();
                  const recB = b.receivedAt.toMillis();
                  if (recA !== recB) return recA - recB;
                  return a.observationId.localeCompare(b.observationId);
              });

              const latestObs = allObservations[allObservations.length - 1];

              if (!obj.lastReportedAt || latestObs.observedAt.toMillis() > obj.lastReportedAt.toMillis()) {
                  patch.lastReportedAt = latestObs.observedAt;
                  if (latestObs.observerUid) patch.lastReportedBy = latestObs.observerUid;
                  if (latestObs.placeLabel) patch.lastReportedPlaceLabel = latestObs.placeLabel;
              }
          }
      }

      if (skipReason) {
          result.skipped.push({
              targetCollection: 'objects',
              targetDocId: obj.objectId,
              reason: skipReason
          });
      } else if (Object.keys(patch).length > 0) {
          if (result.counts.candidateCounts.objects < limits.maxCandidates) {
              result.candidates.push({
                  targetCollection: 'objects',
                  targetDocId: obj.objectId,
                  reason: 'backfill-optional-fields',
                  proposedPatch: patch,
                  currentValues: {
                      visibility: obj.visibility,
                      ownerUid: obj.ownerUid,
                      createdBy: obj.createdBy,
                      lastReportedAt: obj.lastReportedAt,
                      identifierSummary: obj.identifierSummary
                  },
                  confidence: 'high'
              });
          }
          result.counts.candidateCounts.objects++;
      }

    }

  } catch (err: any) {
    result.warnings.push({
      type: 'dry-run-error',
      message: err.message,
    });
  }

  // Sample limiting for skipped records to avoid huge payloads
  if (result.skipped.length > limits.maxSamplesPerCategory) {
      result.skipped = result.skipped.slice(0, limits.maxSamplesPerCategory);
  }

  return result;
}