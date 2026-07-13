import { describe, test, expect, beforeEach } from "vitest";
import { buildLogicalFact, resetValidatorsCache } from "../src/logicalFactBuilder";

describe("Logical Fact Builder", () => {
  beforeEach(() => {
    resetValidatorsCache();
  });

  const baseParams = {
    factId: "018f2f21-7f91-7f00-8000-000000000000", // v7
    ownerId: "user123",
    receivedAt: "2024-01-01T00:00:00.000Z",
    recordCreatedAt: "2024-01-01T00:00:00.000Z",
    actorUid: "user123",
    efpModelVersion: "3.0.0",
    callableApiVersion: "1.1.7"
  };

  test("valid Association fact", () => {
    const data = {
      commandId: "00000000-0000-4000-8000-000000000000",
      factType: "association",
      data: {
        operation: "attach",
        provenance: { source: "user_confirmed", confidence: "high" },
        participants: [
          { role: "object", ref: { entityType: "object", id: "obj1" } },
          { role: "marker", ref: { entityType: "marker", id: "mk1" } }
        ],
        effectiveAt: "2024-01-01T00:00:00.000Z"
      }
    };

    const fact = buildLogicalFact({ ...baseParams, data });
    expect(fact.factType).toBeUndefined(); // factType is stripped in logical form, associationId is added
    expect(fact.associationId).toBe(baseParams.factId);
    expect(fact.ownerId).toBe(baseParams.ownerId);
    expect(fact.participants).toHaveLength(2);
    expect(fact.objectIds).toEqual(["obj1"]);
    expect(fact.markerKeys).toEqual(["mk1"]);
    expect(fact.placeIds).toEqual([]);
    expect(fact.readerIds).toEqual([]);
    expect(fact.deviceIds).toEqual([]);
    expect(fact.userIds).toEqual([]);
    expect(fact.participantKeys).toEqual(["marker:mk1", "object:obj1"]);
    expect(fact._meta.recordCreatedBy).toBe(baseParams.actorUid);
  });

  test("valid Observation fact", () => {
    const data = {
      commandId: "00000000-0000-4000-8000-000000000000",
      factType: "observation",
      data: {
        participants: [
          { role: "object", ref: { entityType: "object", id: "obj1" } }
        ],
        observationType: "visual",
        time: { observedAt: "2024-01-01T00:00:00.000Z" },
        provenance: { source: "user_confirmed", confidence: "high" }
      }
    };
    const fact = buildLogicalFact({ ...baseParams, data });
    expect(fact.observationId).toBe(baseParams.factId);
    expect(fact.time.receivedAt).toBe(baseParams.receivedAt);
    expect(fact.provenance.actorUid).toBe(baseParams.actorUid);
  });

  test("valid Measurement fact", () => {
    const data = {
      commandId: "00000000-0000-4000-8000-000000000000",
      factType: "measurement",
      data: {
        participants: [{ role: "object", ref: { entityType: "object", id: "obj1" } }],
        measurementType: "temperature",
        time: { measuredAt: "2024-01-01T00:00:00.000Z" },
        provenance: { source: "location_measurement", confidence: "high" }
      }
    };
    const fact = buildLogicalFact({ ...baseParams, data });
    expect(fact.measurementId).toBe(baseParams.factId);
    expect(fact.objectIds).toEqual(["obj1"]);
  });

  test("valid Event fact", () => {
    const data = {
      commandId: "00000000-0000-4000-8000-000000000000",
      factType: "event",
      data: {
        participants: [
          { role: "place", ref: { entityType: "place", id: "pl1" } }
        ],
        eventType: "maintenance",
        time: { occurredAt: "2024-01-01T00:00:00.000Z" },
        provenance: { source: "user_report", confidence: "high" }
      }
    };
    const fact = buildLogicalFact({ ...baseParams, data });
    expect(fact.eventId).toBe(baseParams.factId);
    expect(fact.placeIds).toEqual(["pl1"]);
  });

  test("invalid timestamp -> fail", () => {
    const data = {
      commandId: "00000000-0000-4000-8000-000000000000",
      factType: "event",
      data: {
        participants: [{ role: "object", ref: { entityType: "object", id: "obj1" } }],
        eventType: "maintenance",
        time: { occurredAt: "not-a-timestamp" },
        provenance: { source: "user_report", confidence: "high" }
      }
    };
    expect(() => buildLogicalFact({ ...baseParams, data })).toThrow(/Invalid request format/);
  });

  test("backend field missing logic -> schema catch (simulated)", () => {
    const data = {
      commandId: "00000000-0000-4000-8000-000000000000",
      factType: "event",
      data: {
        participants: [{ role: "object", ref: { entityType: "object", id: "obj1" } }],
        eventType: "maintenance",
        time: { occurredAt: "2024-01-01T00:00:00.000Z" },
        provenance: { source: "user_report", confidence: "high" }
      }
    };
    // Force bad params
    const badParams = { ...baseParams, ownerId: undefined as any };
    expect(() => buildLogicalFact({ ...badParams, data })).toThrow(/Logical Fact schema validation failed/);
  });
});
