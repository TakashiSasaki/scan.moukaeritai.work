import {
  submitFactCommandCore,
  RuntimeProfile,
} from "../../src/submitFactCommandCore";
import { createFakeFirestoreHarness } from "./fakeFirestore";

export function createSubmitFactCommandHarness(
  options: {
    initial?: Record<string, unknown>;
    runtimeProfile?: RuntimeProfile;
    uuids?: string[];
    now?: string[];
  } = {},
) {
  const firestore = createFakeFirestoreHarness(options.initial);
  const runtimeProfile = options.runtimeProfile || {
    applicationVersion: "2.1.0",
    callableApiVersion: "1.1.9",
    efpModelVersion: "3.0.0",
  };
  const uuids = [
    ...(options.uuids || [
      "01900000-0000-7000-8000-000000000001",
      "01900000-0000-7000-8000-000000000002",
      "01900000-0000-7000-8000-000000000003",
    ]),
  ];
  const times = [
    ...(options.now || [
      "2026-07-13T00:00:00.000Z",
      "2026-07-13T00:00:01.000Z",
      "2026-07-13T00:00:02.000Z",
    ]),
  ];
  const submit = (actorUid: string, data: any) =>
    submitFactCommandCore(
      { actorUid, data },
      {
        db: firestore,
        runtimeProfile,
        generateFactId: () =>
          uuids.shift() ||
          `01900000-0000-7000-8000-${String(Math.floor(Math.random() * 1e12)).padStart(12, "0")}`,
        nowIso: () => times.shift() || "2026-07-13T00:00:59.000Z",
        serverTimestamp: () => ({
          __type: "serverTimestamp",
          at: times[0] || "2026-07-13T00:00:59.000Z",
        }),
        timestampFromDate: (date) => ({
          __type: "timestamp",
          value: date.toISOString(),
        }),
        geoPoint: (latitude, longitude) => ({
          __type: "geoPoint",
          latitude,
          longitude,
        }),
      },
    );
  return {
    firestore,
    submit,
    seed: firestore.seed,
    resetProof:
      "factory-created state per test; no module-level databaseState is shared",
  };
}
