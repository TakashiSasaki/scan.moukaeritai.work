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

// Helper for normalized summary comparison
function areIdentifierSummariesEqual(
  a: ObjectRecord['identifierSummary'] | undefined,
  b: ObjectRecord['identifierSummary'] | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  if (a.activeIdentifierCount !== b.activeIdentifierCount) return false;
  if (a.hasQr !== b.hasQr) return false;
  if (a.hasNfc !== b.hasNfc) return false;

  const aKinds = Array.isArray(a.activeKinds) ? [...a.activeKinds].sort() : [];
  const bKinds = Array.isArray(b.activeKinds) ? [...b.activeKinds].sort() : [];

  if (aKinds.length !== bKinds.length) return false;
  for (let i = 0; i < aKinds.length; i++) {
    if (aKinds[i] !== bKinds[i]) return false;
  }

  return true;
}

// Bounded helper for summary computation
async function loadObjectIdentifiersForSummaryBounded(
  db: Firestore,
  ownerId: string,
  objectId: string,
  limitCount: number
): Promise<IdentifierRecord[]> {
  const q = query(
    collection(db, 'identifiers'),
    where('ownerId', '==', ownerId),
    where('objectId', '==', objectId),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as IdentifierRecord);
}

export interface DryRunLimits {
  maxIdentifiers: number;
  maxObjects: number;
  maxObservations: number;
  maxCandidates: number;
  maxSamplesPerCategory: number;
  maxBindingsPerObject: number;
  maxIdentifiersPerObject: number;
}

export interface DryRunOptions extends Partial<DryRunLimits> {}

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
      try {
        let patch: Record<string, any> = {};
        let skipReason = '';
        let itemConfidence: 'high' | 'medium' | 'low' = 'high';
        let itemNotes: string[] = [];

        // Fetch real observations for this identifier
        // New records use ownerId. Legacy records used observerUid.
        // Query both and deduplicate.
        const obsQNew = query(
          collection(db, 'identifierObservations'),
          where('identifierKey', '==', identifier.identifierKey),
          where('ownerId', '==', ownerId), // Enforce owner scope for observations
          orderBy('observedAt', 'asc'),
          limit(limits.maxObservations)
        );
        const obsQLegacy = query(
          collection(db, 'identifierObservations'),
          where('identifierKey', '==', identifier.identifierKey),
          where('observerUid', '==', ownerId), // Enforce owner scope for legacy observations
          orderBy('observedAt', 'asc'),
          limit(limits.maxObservations)
        );

        const [obsSnapNew, obsSnapLegacy] = await Promise.all([
            getDocs(obsQNew),
            getDocs(obsQLegacy)
        ]);

        const obsMap = new Map<string, IdentifierObservationRecord>();
        for (const d of obsSnapNew.docs) {
            obsMap.set(d.id, d.data() as IdentifierObservationRecord);
        }
        for (const d of obsSnapLegacy.docs) {
            if (!obsMap.has(d.id)) {
                obsMap.set(d.id, d.data() as IdentifierObservationRecord);
            }
        }

        const observations = Array.from(obsMap.values());

        // Add note if ownerId is missing on any queried observations for this identifier
        const missingOwnerIdCount = observations.filter(o => !o.ownerId).length;
        if (missingOwnerIdCount > 0) {
            itemNotes.push(`Found ${missingOwnerIdCount} observation(s) missing ownerId.`);
        }

        // A. Discovery State
        if (!identifier.discoveryState) {
          if (identifier.status === 'unassigned' && !identifier.objectId) {
            if (observations.length > 0 || identifier.firstObservedAt) {
              patch.discoveryState = 'observed';
            } else {
              skipReason = 'ambiguous-discovery-state';
              itemNotes.push('Unassigned identifier without real observations.');
            }
          } else if (identifier.status === 'active' && identifier.objectId) {
            patch.discoveryState = 'registered';
          } else if (identifier.status === 'replaced') {
            patch.discoveryState = 'detached';
            itemConfidence = 'medium';
            itemNotes.push('discoveryState detached is inferred from replaced status.');
          } else if (identifier.status === 'retired' || identifier.status === 'lost') {
            skipReason = 'ambiguous-discovery-state';
            itemNotes.push(`Status ${identifier.status} is ambiguous for discoveryState.`);
          } else if (identifier.status === 'unassigned' && identifier.objectId) {
            skipReason = 'ambiguous-discovery-state';
            itemNotes.push('Inconsistent state: unassigned but has objectId.');
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

        if (skipReason && Object.keys(patch).length === 0) {
            result.skipped.push({
                targetCollection: 'identifiers',
                targetDocId: identifier.identifierKey,
                reason: skipReason,
                notes: itemNotes.length > 0 ? itemNotes.join(' ') : undefined
            });
        } else if (Object.keys(patch).length > 0) {
            if (result.counts.candidateCounts.identifiers >= limits.maxCandidates) {
                result.skipped.push({
                    targetCollection: 'identifiers',
                    targetDocId: identifier.identifierKey,
                    reason: 'candidate-limit-reached'
                });
                result.warnings.push({
                    type: 'candidate-limit-reached',
                    message: 'Maximum candidate limit reached for identifiers. Subsequent valid candidates were skipped.'
                });
                break; // Stop scanning further identifiers since limit is reached
            } else {
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
                    confidence: itemConfidence,
                    notes: itemNotes.length > 0 ? itemNotes.join(' ') : undefined
                });
                result.counts.candidateCounts.identifiers++;
            }
        }
      } catch (err: any) {
        result.warnings.push({
          type: 'identifier-processing-error',
          message: `Failed to process identifier ${identifier.identifierKey}: ${err.message}`
        });
        result.skipped.push({
          targetCollection: 'identifiers',
          targetDocId: identifier.identifierKey,
          reason: 'processing-error'
        });
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
      try {
        let patch: Record<string, any> = {};
        let skipReason = '';
        let itemConfidence: 'high' | 'medium' | 'low' = 'high';
        let itemNotes: string[] = [];

        if (!obj.visibility) {
          patch.visibility = 'private';
        }

        if (obj.ownerId && !obj.ownerUid) {
          patch.ownerUid = obj.ownerId;
        }

        if (!obj.createdBy) {
            if (obj.ownerId) {
                patch.createdBy = obj.ownerId;
                itemConfidence = 'medium';
                itemNotes.push('createdBy is inferred from ownerId.');
            } else {
                result.skipped.push({
                  targetCollection: 'objects',
                  targetDocId: obj.objectId,
                  reason: 'ambiguous-created-by',
                  notes: 'No ownerId to infer createdBy.'
                });
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
            let activeIdentifiers = await loadObjectIdentifiersForSummaryBounded(db, ownerId, obj.objectId, limits.maxIdentifiersPerObject);
            if (activeIdentifiers.length >= limits.maxIdentifiersPerObject) {
              result.warnings.push({
                type: 'dry-run-limit-hit',
                message: `Object ${obj.objectId} reached maxIdentifiersPerObject limit (${limits.maxIdentifiersPerObject}). Skipping identifierSummary check.`,
              });
            } else {
              const computedSummary = computeIdentifierSummary(activeIdentifiers);

              if (!areIdentifierSummariesEqual(obj.identifierSummary, computedSummary)) {
                  patch.identifierSummary = computedSummary;
              }
            }

            for (const bindingSnap of bindingsSnap.docs) {
                const binding = bindingSnap.data() as ObjectIdentifierBindingRecord;

                const obsQNew = query(
                    collection(db, 'identifierObservations'),
                    where('identifierKey', '==', binding.identifierKey),
                    where('ownerId', '==', ownerId),
                    orderBy('observedAt', 'asc'),
                    limit(limits.maxObservations)
                );
                const obsQLegacy = query(
                    collection(db, 'identifierObservations'),
                    where('identifierKey', '==', binding.identifierKey),
                    where('observerUid', '==', ownerId),
                    orderBy('observedAt', 'asc'),
                    limit(limits.maxObservations)
                );

                const [obsSnapNew, obsSnapLegacy] = await Promise.all([
                    getDocs(obsQNew),
                    getDocs(obsQLegacy)
                ]);

                const obsMap = new Map<string, IdentifierObservationRecord>();
                for (const d of obsSnapNew.docs) {
                    obsMap.set(d.id, d.data() as IdentifierObservationRecord);
                }
                for (const d of obsSnapLegacy.docs) {
                    if (!obsMap.has(d.id)) {
                        obsMap.set(d.id, d.data() as IdentifierObservationRecord);
                    }
                }

                allObservations.push(...Array.from(obsMap.values()));
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

        if (skipReason && Object.keys(patch).length === 0) {
            result.skipped.push({
                targetCollection: 'objects',
                targetDocId: obj.objectId,
                reason: skipReason
            });
        } else if (Object.keys(patch).length > 0) {
            if (result.counts.candidateCounts.objects >= limits.maxCandidates) {
                result.skipped.push({
                    targetCollection: 'objects',
                    targetDocId: obj.objectId,
                    reason: 'candidate-limit-reached'
                });
                result.warnings.push({
                    type: 'candidate-limit-reached',
                    message: 'Maximum candidate limit reached for objects. Subsequent valid candidates were skipped.'
                });
                break; // Stop scanning further objects since limit is reached
            } else {
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
                    confidence: itemConfidence,
                    notes: itemNotes.length > 0 ? itemNotes.join(' ') : undefined
                });
                result.counts.candidateCounts.objects++;
            }
        }
      } catch (err: any) {
        result.warnings.push({
          type: 'object-processing-error',
          message: `Failed to process object ${obj.objectId}: ${err.message}`
        });
        result.skipped.push({
          targetCollection: 'objects',
          targetDocId: obj.objectId,
          reason: 'processing-error'
        });
      }
    }

  } catch (err: any) {
    result.warnings.push({
      type: 'dry-run-error',
      message: err.message,
    });
  }

  // Sample limiting for skipped records per reason and targetCollection to avoid huge payloads
  // Groups by `${targetCollection}-${reason}` and keeps up to `limits.maxSamplesPerCategory`
  const skippedByGroup: Record<string, DryRunSkipped[]> = {};
  for (const skipped of result.skipped) {
    const key = `${skipped.targetCollection}-${skipped.reason}`;
    if (!skippedByGroup[key]) {
      skippedByGroup[key] = [];
    }
    if (skippedByGroup[key].length < limits.maxSamplesPerCategory) {
      skippedByGroup[key].push(skipped);
    }
  }

  result.skipped = [];
  for (const key of Object.keys(skippedByGroup)) {
    result.skipped.push(...skippedByGroup[key]);
  }

  return result;
}