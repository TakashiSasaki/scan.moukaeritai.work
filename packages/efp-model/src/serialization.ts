function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isTimestampLike(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function' &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  );
}

export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null) {
    return value;
  }
  if (isTimestampLike(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    // Drop undefined and sparse holes, preserve null, keep order, recursively clean elements.
    return value.filter(item => item !== undefined).map(item => stripUndefinedDeep(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const val = value[key];
        if (val !== undefined) {
          result[key] = stripUndefinedDeep(val);
        }
      }
    }
    return result as T;
  }
  return value;
}
