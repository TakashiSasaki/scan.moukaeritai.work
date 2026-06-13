import { describe, it, expect } from 'vitest';
import {
  parseRecomputeProjectionSummaryInput,
  ProjectionRecomputeInputError,
} from '../functions/src/projectionRecomputeInput';

describe('parseRecomputeProjectionSummaryInput', () => {
  it('object input maps to objects/objectSummaries and dryRun=true by default', () => {
    const input = {
      targetType: 'object',
      targetId: 'obj-123',
    };
    const result = parseRecomputeProjectionSummaryInput(input);
    expect(result.targetType).toBe('object');
    expect(result.targetId).toBe('obj-123');
    expect(result.dryRun).toBe(true);
    expect(result.entityCollection).toBe('objects');
    expect(result.summaryCollection).toBe('objectSummaries');
    expect(result.summaryPath).toBe('objectSummaries/obj-123');
  });

  it('marker input maps to markers/markerSummaries', () => {
    const input = {
      targetType: 'marker',
      targetId: 'mrk-456',
    };
    const result = parseRecomputeProjectionSummaryInput(input);
    expect(result.targetType).toBe('marker');
    expect(result.targetId).toBe('mrk-456');
    expect(result.dryRun).toBe(true);
    expect(result.entityCollection).toBe('markers');
    expect(result.summaryCollection).toBe('markerSummaries');
    expect(result.summaryPath).toBe('markerSummaries/mrk-456');
  });

  it('place input maps to places/placeSummaries', () => {
    const input = {
      targetType: 'place',
      targetId: 'plc-789',
    };
    const result = parseRecomputeProjectionSummaryInput(input);
    expect(result.targetType).toBe('place');
    expect(result.targetId).toBe('plc-789');
    expect(result.dryRun).toBe(true);
    expect(result.entityCollection).toBe('places');
    expect(result.summaryCollection).toBe('placeSummaries');
    expect(result.summaryPath).toBe('placeSummaries/plc-789');
  });

  it('dryRun=false is preserved', () => {
    const input = {
      targetType: 'object',
      targetId: 'obj-123',
      dryRun: false,
    };
    const result = parseRecomputeProjectionSummaryInput(input);
    expect(result.dryRun).toBe(false);
  });

  it('dryRun=true is preserved', () => {
    const input = {
      targetType: 'object',
      targetId: 'obj-123',
      dryRun: true,
    };
    const result = parseRecomputeProjectionSummaryInput(input);
    expect(result.dryRun).toBe(true);
  });

  it('dryRun as string is rejected', () => {
    const input = {
      targetType: 'object',
      targetId: 'obj-123',
      dryRun: 'false',
    };
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow(ProjectionRecomputeInputError);
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow('dryRun must be a boolean when provided.');
  });

  it('missing targetType is rejected', () => {
    const input = {
      targetId: 'obj-123',
    };
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow(ProjectionRecomputeInputError);
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow('targetType must be "object", "marker", or "place".');
  });

  it('invalid targetType is rejected', () => {
    const input = {
      targetType: 'invalid-type',
      targetId: 'obj-123',
    };
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow(ProjectionRecomputeInputError);
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow('targetType must be "object", "marker", or "place".');
  });

  it('missing targetId is rejected', () => {
    const input = {
      targetType: 'object',
    };
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow(ProjectionRecomputeInputError);
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow('targetId must be a non-empty string.');
  });

  it('empty targetId is rejected', () => {
    const input = {
      targetType: 'object',
      targetId: '',
    };
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow(ProjectionRecomputeInputError);
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow('targetId must be a non-empty string.');
  });

  it('whitespace targetId is rejected', () => {
    const input = {
      targetType: 'object',
      targetId: '   ',
    };
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow(ProjectionRecomputeInputError);
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow('targetId must be a non-empty string.');
  });

  it('targetId is trimmed', () => {
    const input = {
      targetType: 'object',
      targetId: '  obj-123  ',
    };
    const result = parseRecomputeProjectionSummaryInput(input);
    expect(result.targetId).toBe('obj-123');
    expect(result.summaryPath).toBe('objectSummaries/obj-123');
  });

  it('targetId containing "/" is rejected', () => {
    const input = {
      targetType: 'object',
      targetId: 'obj/123',
    };
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow(ProjectionRecomputeInputError);
    expect(() => parseRecomputeProjectionSummaryInput(input)).toThrow("targetId must not contain '/'.");
  });

  it('summaryPath uses normalized targetId', () => {
    const input = {
      targetType: 'place',
      targetId: '   plc-789   ',
    };
    const result = parseRecomputeProjectionSummaryInput(input);
    expect(result.targetId).toBe('plc-789');
    expect(result.summaryPath).toBe('placeSummaries/plc-789');
  });
});
