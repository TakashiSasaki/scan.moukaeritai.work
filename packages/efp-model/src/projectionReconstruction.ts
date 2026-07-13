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
 * Safely extracts milliseconds from a logical string Timestamp (RFC 3339).
 */
function toMillisSafely(ts: Timestamp | undefined): number | undefined {
  if (!ts) return undefined;
  const parsed = Date.parse(ts);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Gets the effective transition time for an association.
 */
export function getAssociationEffectiveTransitionTime(
  association: AssociationDoc
): Timestamp | undefined {
  return association.effectiveAt;
}

/**
 * Deterministically sorts two facts by effective time (ascending),
 * tie-broken by ID (lexicographically ascending).
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
 * Resolves the latest state of an object-marker relationship under immutable operations.
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

  const relevant = associations.filter(
    (a) => a.objectIds?.includes(objectId) && a.markerKeys?.includes(markerKey)
  );

  if (relevant.length === 0) {
    return { state: 'unknown' };
  }

  // Sort ascending by effectiveAt, then associationId
  const sorted = [...relevant].sort((left, right) =>
    compareFactsByEffectiveTimeThenId(
      { id: left.associationId, time: left.effectiveAt },
      { id: right.associationId, time: right.effectiveAt }
    )
  );

  let state: 'active' | 'detached' | 'unknown' = 'unknown';
  let latestId: string | undefined;
  let activeAttachId: string | undefined;

  for (const a of sorted) {
    if (a.operation === 'attach') {
      state = 'active';
      latestId = a.associationId;
      activeAttachId = a.associationId;
    } else if (a.operation === 'detach' || a.operation === 'replace') {
      if (!a.subjectAssociationId || a.subjectAssociationId === activeAttachId) {
        state = 'detached';
        latestId = a.associationId;
        activeAttachId = undefined;
      }
    }
  }

  return {
    state,
    latestAssociationId: latestId,
  };
}

// -----------------------------------------------------------------------------
// ObjectSummary Reconstruction
// -----------------------------------------------------------------------------

export function reconstructObjectSummary(input: {
  objectId: string;
  ownerId: string;
  associations?: AssociationDoc[];
  measurements?: MeasurementDoc[];
  observations?: ObservationDoc[];
  asOf: Timestamp;
}): ObjectSummaryDoc {
  const { objectId, ownerId, asOf, associations = [], measurements = [], observations = [] } = input;
  const derivedFactIds = new Set<string>();

  // 1. activeMarkerKeys
  const activeMarkerKeys: string[] = [];

  const assocsForObject = associations.filter(
    (a) => a.objectIds?.includes(objectId)
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
    ownerId,
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
  ownerId: string;
  associations?: AssociationDoc[];
  observations?: ObservationDoc[];
  measurements?: MeasurementDoc[];
  events?: EventDoc[];
  asOf: Timestamp;
}): PlaceSummaryDoc {
  const { placeId, ownerId, asOf, observations = [], measurements = [], events = [] } = input;
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
      lastActivityAt = ts;
      latestActivityFactId = factId;
    }
  }

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
    ownerId,
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
    result.derivedFromFactIds = Array.from(derivedFactIds).sort();
  }

  return result;
}

// -----------------------------------------------------------------------------
// MarkerSummary Reconstruction
// -----------------------------------------------------------------------------

export function reconstructMarkerSummary(input: {
  markerKey: string;
  ownerId: string;
  associations?: AssociationDoc[];
  observations?: ObservationDoc[];
  asOf: Timestamp;
  recentObservationWindowDays?: number;
}): MarkerSummaryDoc {
  const { markerKey, ownerId, asOf, associations = [], observations = [], recentObservationWindowDays = 30 } = input;
  const derivedFactIds = new Set<string>();

  // 1. relatedObjectIds
  const relatedObjectIds: string[] = [];

  const assocsForMarker = associations.filter(
    (a) => a.markerKeys?.includes(markerKey)
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

    // B. lastObservedPlaceId
    for (let i = validObservations.length - 1; i >= 0; i--) {
      const obs = validObservations[i];
      if (obs.placeIds && obs.placeIds.length > 0) {
        const sortedPlaces = [...obs.placeIds].sort();
        lastObservedPlaceId = sortedPlaces[0];
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
    ownerId,
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
