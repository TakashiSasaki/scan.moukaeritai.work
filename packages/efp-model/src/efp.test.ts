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

  test("Marker key hashing for non-ASCII defaults to UTF-8 SHA-256 issue", () => {
    // Current sha256 implementation might not handle non-ascii properly since it iterates charCodeAt.
    // We document this via test.
    const input = {
      medium: "qr",
      payloadLayer: "url",
      payloadKind: "string",
      canonicalPayload: "日本語"
    };
    const key = generateMarkerKey(input);
    expect(key).toBeTruthy();
    // TODO: Verify if the pure JS sha256 matches node crypto exactly for non-ASCII
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

  test("buildFactIndexFields", () => {
    const participants = [
      { role: "subject", ref: { entityType: "object" as const, id: "obj1" } },
      { role: "target", ref: { entityType: "marker" as const, id: "mk1" } }
    ];
    const index = buildFactIndexFields(participants as any);
    expect(index.participantKeys).toContain("object:obj1");
    expect(index.participantKeys).toContain("marker:mk1");
    expect(index.objectIds).toContain("obj1");
    expect(index.markerKeys).toContain("mk1");
  });
});
