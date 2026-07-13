import { describe, test, expect } from "vitest";
import { getCanonicalRequestIdentity } from "../src/canonicalRequestIdentity";

describe("Canonical Request Identity", () => {
  test("object key order independence", () => {
    const r1 = getCanonicalRequestIdentity("1.1.8", "association", { a: 1, b: 2 });
    const r2 = getCanonicalRequestIdentity("1.1.8", "association", { b: 2, a: 1 });
    expect(r1.requestHash).toBe(r2.requestHash);
  });

  test("nested key order independence", () => {
    const r1 = getCanonicalRequestIdentity("1.1.8", "association", { nested: { a: 1, b: 2 } });
    const r2 = getCanonicalRequestIdentity("1.1.8", "association", { nested: { b: 2, a: 1 } });
    expect(r1.requestHash).toBe(r2.requestHash);
  });

  test("array order dependence", () => {
    const r1 = getCanonicalRequestIdentity("1.1.8", "association", { arr: [1, 2] });
    const r2 = getCanonicalRequestIdentity("1.1.8", "association", { arr: [2, 1] });
    expect(r1.requestHash).not.toBe(r2.requestHash);
  });

  test("factType dependence", () => {
    const r1 = getCanonicalRequestIdentity("1.1.8", "association", { a: 1 });
    const r2 = getCanonicalRequestIdentity("1.1.8", "event", { a: 1 });
    expect(r1.requestHash).not.toBe(r2.requestHash);
  });

  test("API version dependence", () => {
    const r1 = getCanonicalRequestIdentity("1.1.8", "association", { a: 1 });
    const r2 = getCanonicalRequestIdentity("1.1.7", "association", { a: 1 });
    expect(r1.requestHash).not.toBe(r2.requestHash);
  });

  test("UTF-8 SHA-256 equivalence", async () => {
    const crypto = await import("crypto");
    const testData = { text: "scan.mw🔖日本語" };
    const r1 = getCanonicalRequestIdentity("1.1.8", "association", testData);
    const expectedJson = `{"callableApiVersion":"1.1.8","data":{"text":"scan.mw🔖日本語"},"factType":"association"}`;
    const expectedHash = crypto.createHash("sha256").update(expectedJson, "utf8").digest("hex");
    expect(r1.canonicalJson).toBe(expectedJson);
    expect(r1.requestHash).toBe(expectedHash);
  });

  test("reject undefined", () => {
    expect(() => getCanonicalRequestIdentity("1.1.8", "association", { a: undefined })).toThrow(/Unsupported type: undefined/);
  });

  test("reject NaN / Infinity", () => {
    expect(() => getCanonicalRequestIdentity("1.1.8", "association", { a: NaN })).toThrow(/Invalid number value/);
    expect(() => getCanonicalRequestIdentity("1.1.8", "association", { a: Infinity })).toThrow(/Invalid number value/);
  });

  test("reject bigint / function / symbol", () => {
    expect(() => getCanonicalRequestIdentity("1.1.8", "association", { a: 1n })).toThrow(/Unsupported type/);
    expect(() => getCanonicalRequestIdentity("1.1.8", "association", { a: () => {} })).toThrow(/Unsupported type/);
    expect(() => getCanonicalRequestIdentity("1.1.8", "association", { a: Symbol("a") })).toThrow(/Unsupported type/);
  });

  test("reject non-plain objects like Date or class instances", () => {
    expect(() => getCanonicalRequestIdentity("1.1.8", "association", { a: new Date() })).toThrow(/Only plain objects are allowed/);
    class MyClass { b = 1; }
    expect(() => getCanonicalRequestIdentity("1.1.8", "association", { a: new MyClass() })).toThrow(/Only plain objects are allowed/);
  });
});
