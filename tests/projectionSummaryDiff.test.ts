import { describe, it, expect } from "vitest";
import { diffProjectionSummaries } from "../functions/src/projectionSummaryDiff";

describe("diffProjectionSummaries", () => {
  it("equal primitive values", () => {
    const diff = diffProjectionSummaries("hello", "hello");
    expect(diff.equal).toBe(true);
    expect(diff.differenceCount).toBe(0);
  });

  it("changed primitive values", () => {
    const diff = diffProjectionSummaries("hello", "world");
    expect(diff.equal).toBe(false);
    expect(diff.differenceCount).toBe(1);
    expect(diff.changedPaths).toEqual(["$"]);
  });

  it("equal nested objects", () => {
    const objA = { a: 1, b: { c: 2 } };
    const objB = { a: 1, b: { c: 2 } };
    const diff = diffProjectionSummaries(objA, objB);
    expect(diff.equal).toBe(true);
  });

  it("missing nested field", () => {
    const expected = { a: 1, b: 2 };
    const actual = { a: 1 };
    const diff = diffProjectionSummaries(expected, actual);
    expect(diff.equal).toBe(false);
    expect(diff.missingPaths).toEqual(["$.b"]);
  });

  it("extra nested field", () => {
    const expected = { a: 1 };
    const actual = { a: 1, b: 2 };
    const diff = diffProjectionSummaries(expected, actual);
    expect(diff.equal).toBe(false);
    expect(diff.extraPaths).toEqual(["$.b"]);
  });

  it("changed nested field", () => {
    const expected = { a: 1, b: { c: 2 } };
    const actual = { a: 1, b: { c: 3 } };
    const diff = diffProjectionSummaries(expected, actual);
    expect(diff.equal).toBe(false);
    expect(diff.changedPaths).toEqual(["$.b.c"]);
  });

  it("equal arrays", () => {
    const diff = diffProjectionSummaries([1, 2, 3], [1, 2, 3]);
    expect(diff.equal).toBe(true);
  });

  it("changed array element", () => {
    const diff = diffProjectionSummaries([1, 2, 3], [1, 5, 3]);
    expect(diff.equal).toBe(false);
    expect(diff.changedPaths).toEqual(["$[1]"]);
  });

  it("missing array element due to shorter actual array", () => {
    const diff = diffProjectionSummaries([1, 2, 3], [1, 2]);
    expect(diff.equal).toBe(false);
    expect(diff.missingPaths).toEqual(["$[2]"]);
  });

  it("extra array element due to longer actual array", () => {
    const diff = diffProjectionSummaries([1, 2], [1, 2, 3]);
    expect(diff.equal).toBe(false);
    expect(diff.extraPaths).toEqual(["$[2]"]);
  });

  it("deterministic ordering of reported paths", () => {
    const expected = { z: 1, a: 2, m: 3 };
    const actual = { z: 2, a: 3, m: 4 };
    const diff = diffProjectionSummaries(expected, actual);
    expect(diff.changedPaths).toEqual(["$.a", "$.m", "$.z"]);
  });

  it("root-level missing / null / type mismatch behavior", () => {
    let diff = diffProjectionSummaries(null, undefined);
    expect(diff.equal).toBe(false);
    expect(diff.missingPaths).toEqual(["$"]);

    diff = diffProjectionSummaries(undefined, null);
    expect(diff.equal).toBe(false);
    expect(diff.extraPaths).toEqual(["$"]);

    diff = diffProjectionSummaries({ a: 1 }, null);
    expect(diff.equal).toBe(false);
    expect(diff.changedPaths).toEqual(["$"]);
  });

  it("ignores specified paths and considers objects equal", () => {
    const expected = { a: 1, b: { asOf: 100 } };
    const actual = { a: 1, b: { asOf: 200 } };
    const diff = diffProjectionSummaries(expected, actual, { ignoredPaths: ["$.b.asOf"] });
    expect(diff.equal).toBe(true);
    expect(diff.differenceCount).toBe(0);
    expect(diff.ignoredPaths).toEqual(["$.b.asOf"]);
  });

  it("reports changes in non-ignored paths even when some paths are ignored", () => {
    const expected = { a: 1, b: { asOf: 100, x: 10 } };
    const actual = { a: 2, b: { asOf: 200, x: 10 } };
    const diff = diffProjectionSummaries(expected, actual, { ignoredPaths: ["$.b.asOf"] });
    expect(diff.equal).toBe(false);
    expect(diff.changedPaths).toEqual(["$.a"]);
    expect(diff.ignoredPaths).toEqual(["$.b.asOf"]);
  });
});
