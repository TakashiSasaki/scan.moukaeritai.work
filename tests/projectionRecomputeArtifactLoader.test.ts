import { describe, it, expect } from 'vitest';
import { normalizeRecomputeArtifact } from '../scripts/lib/projection-recompute-artifact-loader.mjs';

describe('normalizeRecomputeArtifact', () => {
  it('should return a single object as an array with one element', () => {
    const input = { result: { targetType: 'object', targetId: '1' } };
    const output = normalizeRecomputeArtifact(input);
    expect(output).toEqual([{ result: { targetType: 'object', targetId: '1' } }]);
  });

  it('should flatten an array of objects by one level', () => {
    const input = [
      { targetType: 'object', targetId: '1' },
      { result: { targetType: 'marker', targetId: '2' } }
    ];
    const output = normalizeRecomputeArtifact(input);
    expect(output).toEqual([
      { targetType: 'object', targetId: '1' },
      { result: { targetType: 'marker', targetId: '2' } }
    ]);
  });

  it('should reject null', () => {
    expect(() => normalizeRecomputeArtifact(null)).toThrow('Recompute artifact is null or undefined.');
  });

  it('should reject undefined', () => {
    expect(() => normalizeRecomputeArtifact(undefined)).toThrow('Recompute artifact is null or undefined.');
  });

  it('should reject primitives', () => {
    expect(() => normalizeRecomputeArtifact(42)).toThrow('Recompute artifact must be an object or array, got number.');
    expect(() => normalizeRecomputeArtifact("string")).toThrow('Recompute artifact must be an object or array, got string.');
  });

  it('should reject nested arrays in top-level arrays', () => {
    const input = [
      { targetType: 'object', targetId: '1' },
      [{ targetType: 'marker', targetId: '2' }]
    ];
    expect(() => normalizeRecomputeArtifact(input)).toThrow('Array element at index 1 cannot be a nested array.');
  });

  it('should reject nulls inside arrays', () => {
    const input = [
      { targetType: 'object', targetId: '1' },
      null
    ];
    expect(() => normalizeRecomputeArtifact(input)).toThrow('Array element at index 1 must be an object, got null.');
  });

  it('should reject primitives inside arrays', () => {
    const input = [
      { targetType: 'object', targetId: '1' },
      42
    ];
    expect(() => normalizeRecomputeArtifact(input)).toThrow('Array element at index 1 must be an object, got number.');
  });
});
