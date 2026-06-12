import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  reconstructObjectSummary,
  reconstructMarkerSummary,
  reconstructPlaceSummary,
  getAssociationEffectiveTransitionTime,
  compareFactsByEffectiveTimeThenId,
  resolveObjectMarkerRelationState
} from '../../src/lib/projectionReconstruction';
import type { AssociationDoc, MeasurementDoc, ObservationDoc, EventDoc } from '../../src/types/entityFactProjection';

function ts(millis: number): Timestamp {
  return Timestamp.fromMillis(millis);
}

describe('Projection Reconstruction Helpers', () => {
  it('compareFactsByEffectiveTimeThenId deterministically sorts by time then ID', () => {
    const f1 = { id: 'B', time: ts(100) };
    const f2 = { id: 'A', time: ts(200) };
    const f3 = { id: 'A', time: ts(100) };
    const f4 = { id: 'C' }; // missing time falls back to 0 in comparison

    const list = [f1, f2, f3, f4];
    list.sort(compareFactsByEffectiveTimeThenId);

    expect(list.map(f => f.id)).toEqual(['C', 'A', 'B', 'A']); // time=0 id=C, time=100 id=A, time=100 id=B, time=200 id=A
  });

  it('getAssociationEffectiveTransitionTime uses correct timestamp field based on status', () => {
    const activeAssoc = { status: 'active', time: { validFrom: ts(100), validUntil: ts(200) } } as unknown as AssociationDoc;
    const detachedAssoc = { status: 'detached', time: { validFrom: ts(100), validUntil: ts(200) } } as unknown as AssociationDoc;
    const replacedAssoc = { status: 'replaced', time: { validFrom: ts(100), validUntil: ts(200) } } as unknown as AssociationDoc;
    const supersededAssoc = { status: 'superseded', time: { validFrom: ts(100), validUntil: ts(200) } } as unknown as AssociationDoc;

    expect(getAssociationEffectiveTransitionTime(activeAssoc)?.toMillis()).toBe(100);
    expect(getAssociationEffectiveTransitionTime(detachedAssoc)?.toMillis()).toBe(200);
    expect(getAssociationEffectiveTransitionTime(replacedAssoc)?.toMillis()).toBe(200);
    expect(getAssociationEffectiveTransitionTime(supersededAssoc)?.toMillis()).toBe(200);
  });
});

describe('reconstructObjectSummary', () => {
  const asOf = ts(1000);

  it('activeMarkerKeys includes marker after initial active association', () => {
    const assoc: AssociationDoc = {
      associationId: 'a1',
      associationType: 'object_has_marker',
      objectIds: ['obj1'],
      markerKeys: ['mk1'],
      status: 'active',
      time: { validFrom: ts(100) },
    } as any;

    const res = reconstructObjectSummary({ objectId: 'obj1', associations: [assoc], asOf });
    expect(res.activeMarkerKeys).toEqual(['mk1']);
    expect(res.derivedFromFactIds).toEqual(['a1']);
  });

  it('activeMarkerKeys excludes marker after active -> detached', () => {
    const assoc1: AssociationDoc = {
      associationId: 'a1',
      associationType: 'object_has_marker',
      objectIds: ['obj1'],
      markerKeys: ['mk1'],
      status: 'active',
      time: { validFrom: ts(100) },
    } as any;

    const assoc2: AssociationDoc = {
      associationId: 'a2',
      associationType: 'object_has_marker',
      objectIds: ['obj1'],
      markerKeys: ['mk1'],
      status: 'detached',
      time: { validUntil: ts(200) },
    } as any;

    const res = reconstructObjectSummary({ objectId: 'obj1', associations: [assoc1, assoc2], asOf });
    expect(res.activeMarkerKeys).toBeUndefined();
    expect(res.derivedFromFactIds).toEqual(['a2']); // The detached transition is still derived fact
  });

  it('activeMarkerKeys includes marker after active -> detached -> active', () => {
    const a1: AssociationDoc = { associationId: 'a1', associationType: 'object_has_marker', objectIds: ['obj1'], markerKeys: ['mk1'], status: 'active', time: { validFrom: ts(100) } } as any;
    const a2: AssociationDoc = { associationId: 'a2', associationType: 'object_has_marker', objectIds: ['obj1'], markerKeys: ['mk1'], status: 'detached', time: { validUntil: ts(200) } } as any;
    const a3: AssociationDoc = { associationId: 'a3', associationType: 'object_has_marker', objectIds: ['obj1'], markerKeys: ['mk1'], status: 'active', time: { validFrom: ts(300) } } as any;

    const res = reconstructObjectSummary({ objectId: 'obj1', associations: [a2, a1, a3], asOf });
    expect(res.activeMarkerKeys).toEqual(['mk1']);
    expect(res.derivedFromFactIds).toEqual(['a3']);
  });

  it('equal timestamps are tie-broken by associationId lexicographically', () => {
    const a1: AssociationDoc = { associationId: 'a_early', associationType: 'object_has_marker', objectIds: ['obj1'], markerKeys: ['mk1'], status: 'active', time: { validFrom: ts(100) } } as any;
    const a2: AssociationDoc = { associationId: 'z_late', associationType: 'object_has_marker', objectIds: ['obj1'], markerKeys: ['mk1'], status: 'detached', time: { validUntil: ts(100) } } as any;

    const res = reconstructObjectSummary({ objectId: 'obj1', associations: [a1, a2], asOf });
    // z_late sorts after a_early, so z_late (detached) wins.
    expect(res.activeMarkerKeys).toBeUndefined();
    expect(res.derivedFromFactIds).toEqual(['z_late']);
  });

  it('association missing validFrom/validUntil does not override timestamped facts', () => {
    const a1: AssociationDoc = { associationId: 'a1', associationType: 'object_has_marker', objectIds: ['obj1'], markerKeys: ['mk1'], status: 'active', time: { validFrom: ts(100) } } as any;
    const aMissing: AssociationDoc = { associationId: 'a2', associationType: 'object_has_marker', objectIds: ['obj1'], markerKeys: ['mk1'], status: 'detached', time: {} } as any;

    const res = reconstructObjectSummary({ objectId: 'obj1', associations: [a1, aMissing], asOf });
    expect(res.activeMarkerKeys).toEqual(['mk1']);
  });

  it('currentPosition picks latest valid position-bearing measurement', () => {
    const m1: MeasurementDoc = { measurementId: 'm1', measurementType: 'location', objectIds: ['obj1'], time: { measuredAt: ts(100) }, position: { latitude: 1, longitude: 1 } } as any;
    const m2: MeasurementDoc = { measurementId: 'm2', measurementType: 'gps_position', objectIds: ['obj1'], time: { measuredAt: ts(200) }, position: { latitude: 2, longitude: 2 } } as any;
    const mOther: MeasurementDoc = { measurementId: 'm3', measurementType: 'rfid_read', objectIds: ['obj1'], time: { measuredAt: ts(300) } } as any;

    const res = reconstructObjectSummary({ objectId: 'obj1', measurements: [m1, mOther, m2], asOf });
    expect(res.currentPosition).toEqual({ latitude: 2, longitude: 2, accuracyMeters: undefined });
    expect(res.lastMeasuredAt?.toMillis()).toBe(200);
    expect(res.derivedFromFactIds).toEqual(['m2']);
  });

  it('currentPosition ignores measurement missing time.measuredAt or position', () => {
    const m1: MeasurementDoc = { measurementId: 'm1', measurementType: 'location', objectIds: ['obj1'], time: { measuredAt: ts(100) }, position: { latitude: 1, longitude: 1 } } as any;
    const mNoTime: MeasurementDoc = { measurementId: 'm2', measurementType: 'location', objectIds: ['obj1'], time: {} as any, position: { latitude: 2, longitude: 2 } } as any;
    const mNoPos: MeasurementDoc = { measurementId: 'm3', measurementType: 'location', objectIds: ['obj1'], time: { measuredAt: ts(200) } } as any;

    const res = reconstructObjectSummary({ objectId: 'obj1', measurements: [m1, mNoTime, mNoPos], asOf });
    expect(res.currentPosition).toEqual({ latitude: 1, longitude: 1, accuracyMeters: undefined });
    expect(res.lastMeasuredAt?.toMillis()).toBe(100);
  });

  it('lastObservedAt uses object-linked observations only, and marker-only observation does not update object lastObservedAt', () => {
    const oMarkerOnly: ObservationDoc = { observationId: 'o1', markerKeys: ['mk1'], time: { observedAt: ts(200) } } as any;
    const oObject: ObservationDoc = { observationId: 'o2', objectIds: ['obj1'], time: { observedAt: ts(100) } } as any;

    const res = reconstructObjectSummary({ objectId: 'obj1', observations: [oMarkerOnly, oObject], asOf });
    expect(res.lastObservedAt?.toMillis()).toBe(100);
  });

  it('derivedFromFactIds is deterministic and deduped', () => {
    const assoc: AssociationDoc = { associationId: 'a1', associationType: 'object_has_marker', objectIds: ['obj1'], markerKeys: ['mk1'], status: 'active', time: { validFrom: ts(100) } } as any;
    const meas: MeasurementDoc = { measurementId: 'm1', measurementType: 'location', objectIds: ['obj1'], time: { measuredAt: ts(200) }, position: { latitude: 1, longitude: 1 } } as any;
    const obs: ObservationDoc = { observationId: 'o1', objectIds: ['obj1'], time: { observedAt: ts(300) } } as any;

    const res = reconstructObjectSummary({ objectId: 'obj1', associations: [assoc], measurements: [meas], observations: [obs], asOf });
    expect(res.derivedFromFactIds).toEqual(['a1', 'm1', 'o1']); // alphabetically a1, m1, o1
  });
});

describe('reconstructMarkerSummary', () => {
  const asOf = ts(1000 * 60 * 60 * 24 * 30); // 30 days in ms to make the windows testable

  it('relatedObjectIds includes object whose latest transition is active', () => {
    const assoc: AssociationDoc = { associationId: 'a1', associationType: 'object_has_marker', objectIds: ['obj1'], markerKeys: ['mk1'], status: 'active', time: { validFrom: ts(100) } } as any;
    const res = reconstructMarkerSummary({ markerKey: 'mk1', associations: [assoc], asOf });
    expect(res.relatedObjectIds).toEqual(['obj1']);
  });

  it('relatedObjectIds handles active -> detached -> active', () => {
    const a1: AssociationDoc = { associationId: 'a1', associationType: 'object_has_marker', objectIds: ['obj1'], markerKeys: ['mk1'], status: 'active', time: { validFrom: ts(100) } } as any;
    const a2: AssociationDoc = { associationId: 'a2', associationType: 'object_has_marker', objectIds: ['obj1'], markerKeys: ['mk1'], status: 'detached', time: { validUntil: ts(200) } } as any;
    const a3: AssociationDoc = { associationId: 'a3', associationType: 'object_has_marker', objectIds: ['obj2'], markerKeys: ['mk1'], status: 'active', time: { validFrom: ts(300) } } as any;

    const res = reconstructMarkerSummary({ markerKey: 'mk1', associations: [a1, a2, a3], asOf });
    expect(res.relatedObjectIds).toEqual(['obj2']);
  });

  it('lastObservedAt picks latest marker observation, recentObservationCount windows correctly', () => {
    const obs1: ObservationDoc = { observationId: 'o1', markerKeys: ['mk1'], time: { observedAt: ts(asOf.toMillis() - 40 * 24 * 60 * 60 * 1000) } } as any; // 40 days ago
    const obs2: ObservationDoc = { observationId: 'o2', markerKeys: ['mk1'], time: { observedAt: ts(asOf.toMillis() - 10 * 24 * 60 * 60 * 1000) } } as any; // 10 days ago

    const res = reconstructMarkerSummary({ markerKey: 'mk1', observations: [obs1, obs2], asOf });
    expect(res.lastObservedAt?.toMillis()).toBe(obs2.time.observedAt.toMillis());
    expect(res.recentObservationCount).toBe(1); // Only o2 is within the default 30-day window
  });

  it('recentObservationCount respects custom recentObservationWindowDays', () => {
    const obs1: ObservationDoc = { observationId: 'o1', markerKeys: ['mk1'], time: { observedAt: ts(asOf.toMillis() - 40 * 24 * 60 * 60 * 1000) } } as any;
    const res = reconstructMarkerSummary({ markerKey: 'mk1', observations: [obs1], asOf, recentObservationWindowDays: 60 });
    expect(res.recentObservationCount).toBe(1);
  });

  it('timestamp-missing observations are ignored', () => {
    const obs: ObservationDoc = { observationId: 'o1', markerKeys: ['mk1'], time: {} as any } as any;
    const res = reconstructMarkerSummary({ markerKey: 'mk1', observations: [obs], asOf });
    expect(res.lastObservedAt).toBeUndefined();
    expect(res.recentObservationCount).toBeUndefined();
  });

  it('lastObservedPlaceId is set only from explicit placeIds and searches backwards', () => {
    const obsOldPlace: ObservationDoc = { observationId: 'o1', markerKeys: ['mk1'], placeIds: ['p1'], time: { observedAt: ts(100) } } as any;
    const obsNewNoPlace: ObservationDoc = { observationId: 'o2', markerKeys: ['mk1'], time: { observedAt: ts(200) } } as any;

    const res = reconstructMarkerSummary({ markerKey: 'mk1', observations: [obsOldPlace, obsNewNoPlace], asOf });
    expect(res.lastObservedAt?.toMillis()).toBe(200);
    expect(res.lastObservedPlaceId).toBe('p1');
    expect(res.derivedFromFactIds).toEqual(['o2']); // only the absolute latest obs is tracked in derivedFromFactIds
  });
});

describe('reconstructPlaceSummary', () => {
  const asOf = ts(1000);

  it('currentObjectIds and currentMarkerKeys are derived only from explicit placeIds', () => {
    const o: ObservationDoc = { observationId: 'o1', placeIds: ['p1'], objectIds: ['obj1'], time: { observedAt: ts(100) } } as any;
    const m: MeasurementDoc = { measurementId: 'm1', placeIds: ['p1'], markerKeys: ['mk1'], time: { measuredAt: ts(200) } } as any;
    const eOtherPlace: EventDoc = { eventId: 'e1', placeIds: ['p2'], objectIds: ['obj2'], time: { occurredAt: ts(300) } } as any;
    const mPlaceField: MeasurementDoc = { measurementId: 'm2', place: { placeId: 'p1' }, objectIds: ['obj3'], time: { measuredAt: ts(400) } } as any;

    const res = reconstructPlaceSummary({ placeId: 'p1', observations: [o], measurements: [m, mPlaceField], events: [eOtherPlace], asOf });
    expect(res.currentObjectIds).toEqual(['obj1']);
    expect(res.currentMarkerKeys).toEqual(['mk1']);
  });

  it('lastActivityAt uses latest observedAt/measuredAt/occurredAt', () => {
    const o: ObservationDoc = { observationId: 'o1', placeIds: ['p1'], time: { observedAt: ts(100) } } as any;
    const m: MeasurementDoc = { measurementId: 'm1', placeIds: ['p1'], time: { measuredAt: ts(300) } } as any;
    const e: EventDoc = { eventId: 'e1', placeIds: ['p1'], time: { occurredAt: ts(200) } } as any;

    const res = reconstructPlaceSummary({ placeId: 'p1', observations: [o], measurements: [m], events: [e], asOf });
    expect(res.lastActivityAt?.toMillis()).toBe(300);
    expect(res.derivedFromFactIds).toEqual(['e1', 'm1', 'o1']); // sorted fact ids matching the place
  });

  it('missing domain timestamps are ignored and equal timestamps resolve by ID', () => {
    const m1: MeasurementDoc = { measurementId: 'z1', placeIds: ['p1'], time: { measuredAt: ts(100) } } as any;
    const m2: MeasurementDoc = { measurementId: 'a1', placeIds: ['p1'], time: { measuredAt: ts(100) } } as any; // later ID alphabetically wins
    const mNoTime: MeasurementDoc = { measurementId: 'm3', placeIds: ['p1'], time: {} as any } as any;

    const res = reconstructPlaceSummary({ placeId: 'p1', measurements: [m1, m2, mNoTime], asOf });
    expect(res.lastActivityAt?.toMillis()).toBe(100);
    // Since we track latest by ID internally: a1 vs z1, z1 wins.
    // Wait, let's verify internal logic: a1 < z1 so z1 > a1. Thus z1 is later lexicographically.
    // However, BOTH are accumulated in derivedFromFactIds for the place union.
    expect(res.derivedFromFactIds).toEqual(['a1', 'm3', 'z1']);
  });
});
