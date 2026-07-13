import { describe, expect, test } from "vitest";
import { SubmitFactCommandCoreError } from "../src/submitFactCommandCore";
import { createSubmitFactCommandHarness } from "./harness/submitFactCommandHarness";

const owner = "test-user";
const uuid = (n: number) =>
  `123e4567-e89b-42d3-a456-426614174${String(n).padStart(3, "0")}`;
const eventRequest = (commandId = uuid(0), eventType = "test") => ({
  commandId,
  factType: "event",
  data: {
    eventType,
    time: { occurredAt: "2026-07-12T05:00:00Z" },
    provenance: { source: "user_confirmed", confidence: "high" },
    participants: [
      { role: "object", ref: { entityType: "object", id: "object1" } },
    ],
  },
});
const assocRequest = (
  commandId: string,
  operation: string,
  marker = "marker1",
  subjectAssociationId?: string,
  participants?: any[],
) => ({
  commandId,
  factType: "association",
  data: {
    operation,
    ...(subjectAssociationId ? { subjectAssociationId } : {}),
    effectiveAt: "2026-07-12T05:00:00Z",
    provenance: { source: "user_confirmed", confidence: "high" },
    participants: participants || [
      { role: "object", ref: { entityType: "object", id: "object1" } },
      { role: "marker", ref: { entityType: "marker", id: marker } },
    ],
  },
});
const baseDocs = {
  "objects/object1": { ownerId: owner },
  "objects/object2": { ownerId: "other" },
  "objects/object:colon": { ownerId: owner },
  "markers/marker1": { ownerId: owner },
  "markers/marker2": { ownerId: owner },
  "markers/marker-other": { ownerId: "other" },
  "markers/marker:colon": { ownerId: owner },
  "associations/assoc1": {
    ownerId: owner,
    operation: "attach",
    participantKeys: ["marker:marker1", "object:object1"],
    objectIds: ["object1"],
    markerKeys: ["marker1"],
  },
  "associations/assoc-detached": {
    ownerId: owner,
    operation: "detach",
    participantKeys: ["marker:marker1", "object:object1"],
    objectIds: ["object1"],
    markerKeys: ["marker1"],
  },
  "associations/assoc-replaced": {
    ownerId: owner,
    operation: "replace",
    participantKeys: ["marker:marker1", "object:object1"],
    objectIds: ["object1"],
    markerKeys: ["marker1"],
  },
  "associations/assoc-foreign": {
    ownerId: "other",
    operation: "attach",
    participantKeys: ["marker:marker1", "object:object1"],
    objectIds: ["object1"],
    markerKeys: ["marker1"],
  },
  "associations/assoc-old-missing": {
    ownerId: owner,
    operation: "attach",
    participantKeys: ["marker:missing", "object:object1"],
    objectIds: ["object1"],
    markerKeys: ["missing"],
  },
  "associations/assoc-old-foreign": {
    ownerId: owner,
    operation: "attach",
    participantKeys: ["marker:marker-other", "object:object1"],
    objectIds: ["object1"],
    markerKeys: ["marker-other"],
  },
  "associations/assoc:colon": {
    ownerId: owner,
    operation: "attach",
    participantKeys: ["marker:marker:colon", "object:object:colon"],
    objectIds: ["object:colon"],
    markerKeys: ["marker:colon"],
  },
  "associations/duplicate-detach": {
    ownerId: owner,
    operation: "detach",
    subjectAssociationId: "assoc1",
  },
};
async function rejectCode(p: Promise<unknown>) {
  try {
    await p;
    throw new Error("expected rejection");
  } catch (e: any) {
    expect(e).toBeInstanceOf(SubmitFactCommandCoreError);
    return e.code;
  }
}
const factWrites = (h: any) =>
  h.firestore.operationLog.filter(
    (op: any) =>
      op.type === "write" &&
      /^(associations|events|observations|measurements)\//.test(op.path),
  ).length;
const receiptWrites = (h: any) =>
  h.firestore.operationLog.filter(
    (op: any) => op.type === "write" && op.path.includes("/factCommands/"),
  ).length;

describe("submitFactCommand behavioral harness", () => {
  test("isolates state between harness instances", async () => {
    const h1 = createSubmitFactCommandHarness({ initial: baseDocs });
    await h1.submit(owner, eventRequest(uuid(10)));
    const h2 = createSubmitFactCommandHarness({ initial: baseDocs });
    expect(
      h2.firestore.get(`users/${owner}/factCommands/${uuid(10)}`),
    ).toBeUndefined();
    expect(h2.firestore.writesTo("events/")).toHaveLength(0);
  });

  test("idempotency full matrix", async () => {
    const h = createSubmitFactCommandHarness({
      initial: baseDocs,
      uuids: [
        "01900000-0000-7000-8000-000000000101",
        "01900000-0000-7000-8000-000000000102",
      ],
    });
    const request = eventRequest(uuid(11));
    const first = await h.submit(owner, request);
    expect(factWrites(h)).toBe(1);
    expect(receiptWrites(h)).toBe(1);
    h.firestore.operationLog.length = 0;
    const replay = await h.submit(owner, request);
    expect(replay.factId).toBe(first.factId);
    expect(factWrites(h)).toBe(0);
    expect(receiptWrites(h)).toBe(0);
    h.firestore.assertReadsBeforeWrites();
    for (const [name, mutate] of [
      ["different data", (r: any) => (r.data.eventType = "other")],
      [
        "different factType",
        (r: any) => {
          r.factType = "measurement";
          r.data = {
            measurementType: "m",
            time: { measuredAt: "2026-07-12T05:00:00Z" },
            provenance: { source: "user_confirmed", confidence: "high" },
            participants: r.data.participants,
          };
        },
      ],
    ] as const) {
      h.firestore.operationLog.length = 0;
      const r = JSON.parse(JSON.stringify(request));
      mutate(r);
      expect(await rejectCode(h.submit(owner, r))).toBe("invalid-argument");
      expect(factWrites(h), name).toBe(0);
      expect(receiptWrites(h), name).toBe(0);
    }
    for (const missing of [
      "callableApiVersion",
      "canonicalJsonVersion",
      "requestHashVersion",
    ] as const) {
      const legacy = createSubmitFactCommandHarness({
        initial: {
          ...baseDocs,
          [`users/${owner}/factCommands/${uuid(12)}`]: {
            commandId: uuid(12),
            ownerId: owner,
            factId: "legacy",
            factType: "event",
            callableApiVersion: "1.1.9",
            canonicalJsonVersion: 1,
            requestHashVersion: "sha256-canonical-json-v1",
            requestHash: "x",
          },
        },
      });
      delete (
        legacy.firestore.get(`users/${owner}/factCommands/${uuid(12)}`) as any
      )?.[missing];
      legacy.firestore.seed(`users/${owner}/factCommands/${uuid(12)}`, {
        commandId: uuid(12),
        ownerId: owner,
        factId: "legacy",
        factType: "event",
        requestHash: "x",
      });
      expect(
        await rejectCode(legacy.submit(owner, eventRequest(uuid(12)))),
      ).toBe("invalid-argument");
      expect(factWrites(legacy)).toBe(0);
      expect(receiptWrites(legacy)).toBe(0);
    }
    const hOwners = createSubmitFactCommandHarness({
      initial: {
        ...baseDocs,
        "objects/object-other": { ownerId: "other-user" },
      },
      uuids: [
        "01900000-0000-7000-8000-000000000201",
        "01900000-0000-7000-8000-000000000202",
      ],
    });
    const a = await hOwners.submit(owner, request);
    const other = eventRequest(uuid(11));
    other.data.participants[0].ref.id = "object-other";
    const b = await hOwners.submit("other-user", other);
    expect(a.factId).not.toBe(b.factId);
    expect(
      hOwners.firestore.get(`users/${owner}/factCommands/${uuid(11)}`),
    ).toBeTruthy();
    expect(
      hOwners.firestore.get(`users/other-user/factCommands/${uuid(11)}`),
    ).toBeTruthy();
  });

  test.each([
    ["valid attach", assocRequest(uuid(20), "attach"), true, undefined],
    [
      "valid detach",
      assocRequest(uuid(21), "detach", "marker1", "assoc1"),
      true,
      undefined,
    ],
    [
      "valid replace",
      assocRequest(uuid(22), "replace", "marker2", "assoc1"),
      true,
      undefined,
    ],
    [
      "subject missing",
      assocRequest(uuid(23), "detach", "marker1", "missing"),
      false,
      "failed-precondition",
    ],
    [
      "subject foreign",
      assocRequest(uuid(24), "detach", "marker1", "assoc-foreign"),
      false,
      "permission-denied",
    ],
    [
      "subject detach",
      assocRequest(uuid(25), "detach", "marker1", "assoc-detached"),
      false,
      "failed-precondition",
    ],
    [
      "subject replace",
      assocRequest(uuid(26), "detach", "marker1", "assoc-replaced"),
      false,
      "failed-precondition",
    ],
    [
      "object mismatch",
      assocRequest(uuid(27), "detach", "marker1", "assoc1", [
        { role: "object", ref: { entityType: "object", id: "object2" } },
        { role: "marker", ref: { entityType: "marker", id: "marker1" } },
      ]),
      false,
      "permission-denied",
    ],
    [
      "detach marker mismatch",
      assocRequest(uuid(28), "detach", "marker2", "assoc1"),
      false,
      "failed-precondition",
    ],
    [
      "replace same marker",
      assocRequest(uuid(29), "replace", "marker1", "assoc1"),
      false,
      "failed-precondition",
    ],
    [
      "replace marker missing",
      assocRequest(uuid(30), "replace", "missing", "assoc1"),
      false,
      "failed-precondition",
    ],
    [
      "replace multiple markers",
      assocRequest(uuid(31), "replace", "marker2", "assoc1", [
        { role: "object", ref: { entityType: "object", id: "object1" } },
        { role: "marker", ref: { entityType: "marker", id: "marker2" } },
        { role: "marker", ref: { entityType: "marker", id: "marker1" } },
      ]),
      false,
      "failed-precondition",
    ],
    [
      "existing detach",
      assocRequest(uuid(32), "detach", "marker1", "assoc1"),
      false,
      "failed-precondition",
    ],
    [
      "old marker missing",
      assocRequest(uuid(33), "replace", "marker2", "assoc-old-missing"),
      false,
      "failed-precondition",
    ],
    [
      "old marker foreign",
      assocRequest(uuid(34), "replace", "marker2", "assoc-old-foreign"),
      false,
      "permission-denied",
    ],
    [
      "new marker foreign",
      assocRequest(uuid(35), "replace", "marker-other", "assoc1"),
      false,
      "permission-denied",
    ],
    [
      "participant order valid detach",
      assocRequest(uuid(36), "detach", "marker1", "assoc1", [
        { role: "marker", ref: { entityType: "marker", id: "marker1" } },
        { role: "object", ref: { entityType: "object", id: "object1" } },
      ]),
      true,
      undefined,
    ],
    [
      "colon ids",
      assocRequest(uuid(37), "detach", "marker:colon", "assoc:colon", [
        { role: "marker", ref: { entityType: "marker", id: "marker:colon" } },
        { role: "object", ref: { entityType: "object", id: "object:colon" } },
      ]),
      true,
      undefined,
    ],
  ])("association transition matrix: %s", async (_name, request, ok, code) => {
    const initial = { ...baseDocs } as Record<string, unknown>;
    if (!_name.startsWith("existing"))
      delete initial["associations/duplicate-detach"];
    const h = createSubmitFactCommandHarness({ initial });
    if (ok) {
      await h.submit(owner, request);
      expect(factWrites(h)).toBe(1);
      expect(receiptWrites(h)).toBe(1);
    } else {
      expect(await rejectCode(h.submit(owner, request))).toBe(code);
      expect(factWrites(h)).toBe(0);
      expect(receiptWrites(h)).toBe(0);
    }
    h.firestore.assertReadsBeforeWrites();
  });
});
