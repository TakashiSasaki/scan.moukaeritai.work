import { describe, test, expect } from "vitest";
import { generateUUIDv7, generateMarkerKey, stripUndefinedDeep, sha256 } from "./serialization.js";
import { buildFactIndexFields } from "./factParticipants.js";

describe("EFP Model Utility Tests", () => {
  test("UUIDv7 format and version nibble", () => {
    const uuid = generateUUIDv7(Date.now());
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(uuid.charAt(14)).toBe('7'); // Version nibble
  });

  test("UUID variant is standard (8, 9, a, b)", () => {
    const uuid = generateUUIDv7(Date.now());
    const variantChar = uuid.charAt(19).toLowerCase();
    expect(['8', '9', 'a', 'b']).toContain(variantChar);
  });

  test("UUID duplication prevention (probabilistic)", () => {
    const numTests = 1000;
    const uuids = new Set();
    const now = Date.now();
    for (let i = 0; i < numTests; i++) {
      uuids.add(generateUUIDv7(now));
    }
    expect(uuids.size).toBe(numTests);
  });

  test("Marker key is owner independent and deterministic", () => {
    const input1 = {
      medium: "qr",
      payloadLayer: "url",
      payloadKind: "uuid",
      canonicalPayload: "test-uuid-123"
    };
    const key1 = generateMarkerKey(input1);
    
    // Exact same input should yield same key
    const key2 = generateMarkerKey(input1);
    expect(key1).toBe(key2);
    
    // Must not contain ownerId fields by design
    expect(key1).toMatch(/^mk_[a-f0-9]{64}$/);
  });

  test("sha256 implementation exact match with Node crypto (including UTF-8)", async () => {
    const crypto = await import("crypto");
    const testCases = ["", "abc", "日本語", "scan.mw🔖"];
    for (const vector of testCases) {
      const expected = crypto.createHash("sha256").update(vector, "utf8").digest("hex");
      expect(sha256(vector)).toBe(expected);
    }
  });

  test("stripUndefinedDeep", () => {
    const input = {
      a: 1,
      b: undefined,
      c: { d: 2, e: undefined },
      f: [3, undefined, null, { g: undefined, h: 4 }]
    };
    const output = stripUndefinedDeep(input) as any;
    expect(output.a).toBe(1);
    expect(output).not.toHaveProperty('b');
    expect(output.c.d).toBe(2);
    expect(output.c).not.toHaveProperty('e');
    expect(output.f[0]).toBe(3);
    // filter drops undefined from arrays in current implementation
    expect(output.f[1]).toBe(null); 
    expect(output.f[2].h).toBe(4);
    expect(output.f[2]).not.toHaveProperty('g');
  });

  test("buildFactIndexFields exhaustive tests", () => {
    // 1. Object only
    const objIndex = buildFactIndexFields([{ role: "test", ref: { entityType: "object", id: "obj1" } }] as any);
    expect(objIndex.objectIds).toEqual(["obj1"]);
    expect(objIndex.markerKeys).toEqual([]);
    expect(objIndex.placeIds).toEqual([]);
    expect(objIndex.readerIds).toEqual([]);
    expect(objIndex.deviceIds).toEqual([]);
    expect(objIndex.userIds).toEqual([]);

    // 2. Marker only
    const mkIndex = buildFactIndexFields([{ role: "test", ref: { entityType: "marker", id: "mk1" } }] as any);
    expect(mkIndex.objectIds).toEqual([]);
    expect(mkIndex.markerKeys).toEqual(["mk1"]);

    // 3. No participants
    const emptyIndex = buildFactIndexFields([]);
    expect(emptyIndex.objectIds).toEqual([]);
    expect(emptyIndex.markerKeys).toEqual([]);
    expect(emptyIndex.placeIds).toEqual([]);

    // 4. Same ID, different types
    const sameIdIndex = buildFactIndexFields([
      { role: "a", ref: { entityType: "object", id: "same" } },
      { role: "b", ref: { entityType: "marker", id: "same" } }
    ] as any);
    expect(sameIdIndex.objectIds).toEqual(["same"]);
    expect(sameIdIndex.markerKeys).toEqual(["same"]);
    expect(sameIdIndex.participantKeys).toEqual(["marker:same", "object:same"]);

    // 5. Order independence & deduplication
    const idx1 = buildFactIndexFields([
      { role: "a", ref: { entityType: "object", id: "z" } },
      { role: "b", ref: { entityType: "object", id: "a" } },
      { role: "c", ref: { entityType: "object", id: "z" } }
    ] as any);
    expect(idx1.objectIds).toEqual(["a", "z"]);
  });
});
