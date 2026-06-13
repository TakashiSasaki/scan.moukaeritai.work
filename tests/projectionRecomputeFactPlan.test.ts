import { describe, it, expect } from 'vitest';
import {
  getProjectionRecomputeFactQueryPlan,
  type ProjectionRecomputeTargetType
} from '../functions/src/projectionRecomputeFactPlan';

describe('getProjectionRecomputeFactQueryPlan', () => {
  it('object plan has exactly associations, observations, measurements', () => {
    const plan = getProjectionRecomputeFactQueryPlan('object');
    expect(plan).toHaveLength(3);
    const collections = plan.map(e => e.collection);
    expect(collections).toContain('associations');
    expect(collections).toContain('observations');
    expect(collections).toContain('measurements');
    expect(collections).not.toContain('events');
  });

  it('object plan uses objectIds for all entries', () => {
    const plan = getProjectionRecomputeFactQueryPlan('object');
    plan.forEach(entry => {
      expect(entry.indexField).toBe('objectIds');
    });
  });

  it('object plan has correct idField values', () => {
    const plan = getProjectionRecomputeFactQueryPlan('object');
    const assoc = plan.find(e => e.collection === 'associations');
    expect(assoc?.idField).toBe('associationId');

    const obs = plan.find(e => e.collection === 'observations');
    expect(obs?.idField).toBe('observationId');

    const meas = plan.find(e => e.collection === 'measurements');
    expect(meas?.idField).toBe('measurementId');
  });

  it('marker plan has exactly associations, observations', () => {
    const plan = getProjectionRecomputeFactQueryPlan('marker');
    expect(plan).toHaveLength(2);
    const collections = plan.map(e => e.collection);
    expect(collections).toContain('associations');
    expect(collections).toContain('observations');
    expect(collections).not.toContain('measurements');
    expect(collections).not.toContain('events');
  });

  it('marker plan uses markerKeys for all entries', () => {
    const plan = getProjectionRecomputeFactQueryPlan('marker');
    plan.forEach(entry => {
      expect(entry.indexField).toBe('markerKeys');
    });
  });

  it('place plan has exactly associations, observations, measurements, events', () => {
    const plan = getProjectionRecomputeFactQueryPlan('place');
    expect(plan).toHaveLength(4);
    const collections = plan.map(e => e.collection);
    expect(collections).toContain('associations');
    expect(collections).toContain('observations');
    expect(collections).toContain('measurements');
    expect(collections).toContain('events');
  });

  it('place plan uses placeIds for all entries', () => {
    const plan = getProjectionRecomputeFactQueryPlan('place');
    plan.forEach(entry => {
      expect(entry.indexField).toBe('placeIds');
    });
  });

  it('place plan has correct idField values', () => {
    const plan = getProjectionRecomputeFactQueryPlan('place');
    const assoc = plan.find(e => e.collection === 'associations');
    expect(assoc?.idField).toBe('associationId');

    const obs = plan.find(e => e.collection === 'observations');
    expect(obs?.idField).toBe('observationId');

    const meas = plan.find(e => e.collection === 'measurements');
    expect(meas?.idField).toBe('measurementId');

    const ev = plan.find(e => e.collection === 'events');
    expect(ev?.idField).toBe('eventId');
  });

  it('no plan includes legacy collections', () => {
    const targets: ProjectionRecomputeTargetType[] = ['object', 'marker', 'place'];
    targets.forEach(target => {
      const plan = getProjectionRecomputeFactQueryPlan(target);
      const collections = plan.map(e => e.collection);
      expect(collections).not.toContain('items');
      expect(collections).not.toContain('identifiers');
      expect(collections).not.toContain('objectIdentifierBindings');
      expect(collections).not.toContain('objectEvents');
    });
  });

  it('no plan includes unknown index fields', () => {
    const targets: ProjectionRecomputeTargetType[] = ['object', 'marker', 'place'];
    targets.forEach(target => {
      const plan = getProjectionRecomputeFactQueryPlan(target);
      plan.forEach(entry => {
        expect(['objectIds', 'markerKeys', 'placeIds']).toContain(entry.indexField);
      });
    });
  });
});
