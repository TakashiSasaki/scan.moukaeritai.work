import type {
  Timestamp,
  AssociationDoc,
  MeasurementDoc,
  ObservationDoc,
  EventDoc,
  ObjectSummaryDoc,
  MarkerSummaryDoc,
  PlaceSummaryDoc,
} from './entityFactProjection.js';

// -----------------------------------------------------------------------------
// Timestamp & Timeline Helpers
// -----------------------------------------------------------------------------

/**
 * Safely extracts milliseconds from a Timestamp-like object if valid.
 */
function toMillisSafely(ts: Timestamp | undefined): number | undefined {
  if (!ts) return undefined;
  if (typeof ts.toMillis === 'function') {
    return ts.toMillis();
  }
  return undefined;
}

/**
 * Gets the effective transition time for an association based on its status.
 * 'active' uses validFrom.
 * 'detached' uses validUntil.
 */
export function getAssociationEffectiveTransitionTime(
  association: AssociationDoc
): Timestamp | undefined {
  if (association.status === 'active') {
    return association.time?.validFrom;
  }
  if (association.status === 'detached' || association.status === 'superseded' || association.status === 'replaced') {
    return association.time?.validUntil;
  }
  return undefined;
}

/**
 * Deterministically sorts two facts by effective time (ascending),
 * tie-broken by ID (lexicographically ascending).
 *
 * In this implementation, missing timestamps are considered "smaller"
 * but semantically callers should generally filter them out as invalid
 * before sorting if they need strict timeline ordering.
 */
export function compareFactsByEffectiveTimeThenId(
  left: { id: string; time?: Timestamp },
  right: { id: string; time?: Timestamp }
): number {
  const leftMillis = toMillisSafely(left.time) ?? 0;
  const rightMillis = toMillisSafely(right.time) ?? 0;

  if (leftMillis !== rightMillis) {
    return leftMillis - rightMillis;
  }

  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

/**
 * Resolves the latest state of an object-marker relationship.
 */
export function resolveObjectMarkerRelationState(input: {
  objectId: string;
  markerKey: string;
  associations: AssociationDoc[];
}): {
  state: 'active' | 'detached' | 'unknown';
  latestAssociationId?: string;
} {
  const { objectId, markerKey, associations } = input;

  const relevantAssocs = associations.filter(
    (a) =>
      a.associationType === 'object_has_marker' &&
      a.objectIds?.includes(objectId) &&
      a.markerKeys?.includes(markerKey)
  );

  const assocsWithTime = relevantAssocs
    .map((a) => ({
      assoc: a,
      effectiveTime: getAssociationEffectiveTransitionTime(a),
    }))
    .filter((a) => a.effectiveTime !== undefined);

  if (assocsWithTime.length === 0) {
    return { state: 'unknown' };
  }

  // Sort ascending by time, then id
  assocsWithTime.sort((left, right) =>
    compareFactsByEffectiveTimeThenId(
      { id: left.assoc.associationId, time: left.effectiveTime },
      { id: right.assoc.associationId, time: right.effectiveTime }
    )
  );

  const latest = assocsWithTime[assocsWithTime.length - 1].assoc;

  return {
    state: latest.status === 'active' ? 'active' : latest.status === 'detached' ? 'detached' : 'unknown',
    latestAssociationId: latest.associationId,
  };
}

// -----------------------------------------------------------------------------
// ObjectSummary Reconstruction
// -----------------------------------------------------------------------------

export function reconstructObjectSummary(input: {
  objectId: string;
  associations?: AssociationDoc[];
  measurements?: MeasurementDoc[];
  observations?: ObservationDoc[];
  asOf: Timestamp;
}): ObjectSummaryDoc {
  const { objectId, asOf, associations = [], measurements = [], observations = [] } = input;
  const derivedFactIds = new Set<string>();

  // 1. activeMarkerKeys
  const activeMarkerKeys: string[] = [];

  // Group associations by markerKey for this objectId
  const assocsForObject = associations.filter(
    (a) => a.associationType === 'object_has_marker' && a.objectIds?.includes(objectId)
  );

  const markerKeysSet = new Set<string>();
  for (const a of assocsForObject) {
    if (a.markerKeys) {
      for (const mk of a.markerKeys) {
        markerKeysSet.add(mk);
      }
    }
  }

  for (const markerKey of markerKeysSet) {
    const relation = resolveObjectMarkerRelationState({
      objectId,
      markerKey,
      associations: assocsForObject,
    });
    if (relation.state === 'active') {
      activeMarkerKeys.push(markerKey);
      if (relation.latestAssociationId) {
        derivedFactIds.add(relation.latestAssociationId);
      }
    } else if (relation.state === 'detached') {
      if (relation.latestAssociationId) {
        derivedFactIds.add(relation.latestAssociationId);
      }
    }
  }

  // 2. currentPosition & lastMeasuredAt
  let currentPosition: { latitude: number; longitude: number; accuracyMeters?: number } | undefined;
  let lastMeasuredAt: Timestamp | undefined;

  const validPositionMeasurements = measurements
    .filter((m) => m.objectIds?.includes(objectId))
    .filter((m) => m.measurementType === 'location' || m.measurementType === 'gps_position')
    .filter((m) => m.position?.latitude !== undefined && m.position?.longitude !== undefined)
    .filter((m) => toMillisSafely(m.time?.measuredAt) !== undefined)
    .sort((a, b) => compareFactsByEffectiveTimeThenId(
      { id: a.measurementId, time: a.time.measuredAt },
      { id: b.measurementId, time: b.time.measuredAt }
    ));

  if (validPositionMeasurements.length > 0) {
    const latestMeasurement = validPositionMeasurements[validPositionMeasurements.length - 1];
    if (latestMeasurement.position) {
      currentPosition = {
        latitude: latestMeasurement.position.latitude,
        longitude: latestMeasurement.position.longitude,
        accuracyMeters: latestMeasurement.position.accuracyMeters,
      };
      lastMeasuredAt = latestMeasurement.time.measuredAt;
      derivedFactIds.add(latestMeasurement.measurementId);
    }
  }

  // 3. lastObservedAt
  let lastObservedAt: Timestamp | undefined;

  const validObservations = observations
    .filter((o) => o.objectIds?.includes(objectId))
    .filter((o) => toMillisSafely(o.time?.observedAt) !== undefined)
    .sort((a, b) => compareFactsByEffectiveTimeThenId(
      { id: a.observationId, time: a.time.observedAt },
      { id: b.observationId, time: b.time.observedAt }
    ));

  if (validObservations.length > 0) {
    const latestObs = validObservations[validObservations.length - 1];
    lastObservedAt = latestObs.time.observedAt;
    derivedFactIds.add(latestObs.observationId);
  }

  const result: ObjectSummaryDoc = {
    objectId,
    asOf,
  };

  if (activeMarkerKeys.length > 0) {
    result.activeMarkerKeys = activeMarkerKeys.sort();
  }

  if (currentPosition) {
    result.currentPosition = currentPosition;
  }

  if (lastMeasuredAt) {
    result.lastMeasuredAt = lastMeasuredAt;
  }

  if (lastObservedAt) {
    result.lastObservedAt = lastObservedAt;
  }

  if (derivedFactIds.size > 0) {
    result.derivedFromFactIds = Array.from(derivedFactIds).sort();
  }

  return result;
}

// -----------------------------------------------------------------------------
// PlaceSummary Reconstruction
// -----------------------------------------------------------------------------

export function reconstructPlaceSummary(input: {
  placeId: string;
  associations?: AssociationDoc[];
  observations?: ObservationDoc[];
  measurements?: MeasurementDoc[];
  events?: EventDoc[];
  asOf: Timestamp;
}): PlaceSummaryDoc {
  const { placeId, asOf, observations = [], measurements = [], events = [] } = input;
  const derivedFactIds = new Set<string>();

  const currentObjectIds = new Set<string>();
  const currentMarkerKeys = new Set<string>();

  let lastActivityAt: Timestamp | undefined;
  let latestActivityFactId: string | undefined;
  let latestActivityMillis = 0;

  function updateActivity(factId: string, ts: Timestamp | undefined) {
    const millis = toMillisSafely(ts);
    if (millis !== undefined && millis > latestActivityMillis) {
      latestActivityMillis = millis;
      lastActivityAt = ts;
      latestActivityFactId = factId;
    } else if (millis !== undefined && millis === latestActivityMillis && factId > (latestActivityFactId ?? '')) {
      // Deterministic tie-breaker for identical timestamps
      lastActivityAt = ts;
      latestActivityFactId = factId;
    }
  }

  // Note: Future Place runtime design may refine currentObjectIds/currentMarkerKeys
  // into stricter current-presence semantics instead of a simple accumulation.

  // Observations
  for (const o of observations) {
    if (o.placeIds?.includes(placeId)) {
      if (o.objectIds) o.objectIds.forEach((id) => currentObjectIds.add(id));
      if (o.markerKeys) o.markerKeys.forEach((k) => currentMarkerKeys.add(k));
      if (o.time?.observedAt) updateActivity(o.observationId, o.time.observedAt);
      derivedFactIds.add(o.observationId);
    }
  }

  // Measurements
  for (const m of measurements) {
    if (m.placeIds?.includes(placeId)) {
      if (m.objectIds) m.objectIds.forEach((id) => currentObjectIds.add(id));
      if (m.markerKeys) m.markerKeys.forEach((k) => currentMarkerKeys.add(k));
      if (m.time?.measuredAt) updateActivity(m.measurementId, m.time.measuredAt);
      derivedFactIds.add(m.measurementId);
    }
  }

  // Events
  for (const e of events) {
    if (e.placeIds?.includes(placeId)) {
      if (e.objectIds) e.objectIds.forEach((id) => currentObjectIds.add(id));
      if (e.markerKeys) e.markerKeys.forEach((k) => currentMarkerKeys.add(k));
      if (e.time?.occurredAt) updateActivity(e.eventId, e.time.occurredAt);
      derivedFactIds.add(e.eventId);
    }
  }

  const result: PlaceSummaryDoc = {
    placeId,
    asOf,
  };

  if (currentObjectIds.size > 0) {
    result.currentObjectIds = Array.from(currentObjectIds).sort();
  }

  if (currentMarkerKeys.size > 0) {
    result.currentMarkerKeys = Array.from(currentMarkerKeys).sort();
  }

  if (lastActivityAt) {
    result.lastActivityAt = lastActivityAt;
  }

  if (derivedFactIds.size > 0) {
    // Optimization: only strictly include the latest activity fact if not already present
    // but the instruction says "include Fact IDs directly used for currentObjectIds/currentMarkerKeys"
    // and "selected latest place activity fact ID".
    // We already added all matched facts above.
    result.derivedFromFactIds = Array.from(derivedFactIds).sort();
  }

  return result;
}

// -----------------------------------------------------------------------------
// MarkerSummary Reconstruction
// -----------------------------------------------------------------------------

export function reconstructMarkerSummary(input: {
  markerKey: string;
  associations?: AssociationDoc[];
  observations?: ObservationDoc[];
  asOf: Timestamp;
  recentObservationWindowDays?: number;
}): MarkerSummaryDoc {
  const { markerKey, asOf, associations = [], observations = [], recentObservationWindowDays = 30 } = input;
  const derivedFactIds = new Set<string>();

  // 1. relatedObjectIds
  const relatedObjectIds: string[] = [];

  const assocsForMarker = associations.filter(
    (a) => a.associationType === 'object_has_marker' && a.markerKeys?.includes(markerKey)
  );

  const objectIdsSet = new Set<string>();
  for (const a of assocsForMarker) {
    if (a.objectIds) {
      for (const oid of a.objectIds) {
        objectIdsSet.add(oid);
      }
    }
  }

  for (const objectId of objectIdsSet) {
    const relation = resolveObjectMarkerRelationState({
      objectId,
      markerKey,
      associations: assocsForMarker,
    });
    if (relation.state === 'active') {
      relatedObjectIds.push(objectId);
      if (relation.latestAssociationId) {
        derivedFactIds.add(relation.latestAssociationId);
      }
    } else if (relation.state === 'detached') {
      if (relation.latestAssociationId) {
        derivedFactIds.add(relation.latestAssociationId);
      }
    }
  }

  // 2. Observations processing
  let lastObservedAt: Timestamp | undefined;
  let lastObservedPlaceId: string | undefined;
  let recentObservationCount: number | undefined;

  const validObservations = observations
    .filter((o) => o.markerKeys?.includes(markerKey))
    .filter((o) => toMillisSafely(o.time?.observedAt) !== undefined)
    .sort((a, b) => compareFactsByEffectiveTimeThenId(
      { id: a.observationId, time: a.time.observedAt },
      { id: b.observationId, time: b.time.observedAt }
    ));

  if (validObservations.length > 0) {
    // A. lastObservedAt
    const latestObs = validObservations[validObservations.length - 1];
    lastObservedAt = latestObs.time.observedAt;
    derivedFactIds.add(latestObs.observationId);

    // B. lastObservedPlaceId (search backwards for first observation with explicit placeIds)
    for (let i = validObservations.length - 1; i >= 0; i--) {
      const obs = validObservations[i];
      if (obs.placeIds && obs.placeIds.length > 0) {
        const sortedPlaces = [...obs.placeIds].sort();
        lastObservedPlaceId = sortedPlaces[0];
        // Note: we do not add this observation to derivedFactIds unless we want to,
        // but since we only need the absolute latest observation ID per instructions:
        // "include latest observationId if selected", we keep it minimal.
        break;
      }
    }

    // C. recentObservationCount
    const asOfMillis = toMillisSafely(asOf) ?? 0;
    const windowMillis = recentObservationWindowDays * 24 * 60 * 60 * 1000;
    const windowStartMillis = asOfMillis - windowMillis;

    recentObservationCount = validObservations.filter((o) => {
      const obsMillis = toMillisSafely(o.time.observedAt)!;
      return obsMillis >= windowStartMillis && obsMillis <= asOfMillis;
    }).length;
  }

  const result: MarkerSummaryDoc = {
    markerKey,
    asOf,
  };

  if (relatedObjectIds.length > 0) {
    result.relatedObjectIds = relatedObjectIds.sort();
  }

  if (lastObservedAt) {
    result.lastObservedAt = lastObservedAt;
  }

  if (lastObservedPlaceId) {
    result.lastObservedPlaceId = lastObservedPlaceId;
  }

  if (recentObservationCount !== undefined) {
    result.recentObservationCount = recentObservationCount;
  }

  if (derivedFactIds.size > 0) {
    result.derivedFromFactIds = Array.from(derivedFactIds).sort();
  }

  return result;
}
