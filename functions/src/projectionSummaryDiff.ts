export interface ProjectionSummaryDiff {
  equal: boolean;
  differenceCount: number;
  missingPaths: string[];
  extraPaths: string[];
  changedPaths: string[];
  ignoredPaths?: string[];
}

export interface DiffProjectionSummariesOptions {
  ignoredPaths?: string[];
}

export function diffProjectionSummaries(
  expected: unknown,
  actual: unknown,
  options?: DiffProjectionSummariesOptions
): ProjectionSummaryDiff {
  const missingPaths: string[] = [];
  const extraPaths: string[] = [];
  const changedPaths: string[] = [];
  const ignoredPathsSet = new Set(options?.ignoredPaths || []);

  function compare(path: string, exp: unknown, act: unknown) {
    if (ignoredPathsSet.has(path)) {
      return;
    }

    if (exp === act) {
      return;
    }

    const typeExp = Array.isArray(exp) ? "array" : exp === null ? "null" : typeof exp;
    const typeAct = Array.isArray(act) ? "array" : act === null ? "null" : typeof act;

    if (exp !== undefined && act === undefined) {
      missingPaths.push(path);
      return;
    }

    if (exp === undefined && act !== undefined) {
      extraPaths.push(path);
      return;
    }

    if (typeExp !== typeAct) {
      changedPaths.push(path);
      return;
    }

    if (typeExp === "object" && typeAct === "object") {
      const expKeys = Object.keys(exp as object).sort();
      const actKeys = Object.keys(act as object).sort();

      const allKeys = new Set([...expKeys, ...actKeys]);
      const sortedKeys = Array.from(allKeys).sort();

      for (const key of sortedKeys) {
        const nextPath = path === "$" ? `$.${key}` : `${path}.${key}`;
        const expVal = (exp as Record<string, unknown>)[key];
        const actVal = (act as Record<string, unknown>)[key];
        compare(nextPath, expVal, actVal);
      }
      return;
    }

    if (typeExp === "array" && typeAct === "array") {
      const expArr = exp as unknown[];
      const actArr = act as unknown[];

      const maxLen = Math.max(expArr.length, actArr.length);
      for (let i = 0; i < maxLen; i++) {
        const nextPath = `${path}[${i}]`;
        compare(nextPath, expArr[i], actArr[i]);
      }
      return;
    }

    // Primitives that didn't match via ===
    changedPaths.push(path);
  }

  compare("$", expected, actual);

  return {
    equal: missingPaths.length === 0 && extraPaths.length === 0 && changedPaths.length === 0,
    differenceCount: missingPaths.length + extraPaths.length + changedPaths.length,
    missingPaths,
    extraPaths,
    changedPaths,
    ...(options?.ignoredPaths ? { ignoredPaths: options.ignoredPaths } : {}),
  };
}
