/**
 * Helper to normalize and flatten parsed JSON artifacts containing recompute responses.
 */

/**
 * Normalizes parsed JSON representing one or more recompute responses.
 * If the parsed JSON is an array, it flattens it by exactly one level.
 * Rejects nested arrays, nulls, and primitives.
 * Does not parse callable envelopes (that is handled later by `parseCallableResultEnvelope`).
 *
 * @param {any} parsedJson
 * @returns {Array<any>} An array of valid response objects.
 */
export function normalizeRecomputeArtifact(parsedJson) {
  if (parsedJson === null || parsedJson === undefined) {
    throw new Error('Recompute artifact is null or undefined.');
  }

  if (typeof parsedJson !== 'object') {
    throw new Error(`Recompute artifact must be an object or array, got ${typeof parsedJson}.`);
  }

  if (Array.isArray(parsedJson)) {
    const flattened = [];
    for (let i = 0; i < parsedJson.length; i++) {
      const item = parsedJson[i];

      if (item === null || typeof item !== 'object') {
        throw new Error(`Array element at index ${i} must be an object, got ${item === null ? 'null' : typeof item}.`);
      }

      if (Array.isArray(item)) {
        throw new Error(`Array element at index ${i} cannot be a nested array.`);
      }

      flattened.push(item);
    }
    return flattened;
  }

  // It's a single object
  return [parsedJson];
}
