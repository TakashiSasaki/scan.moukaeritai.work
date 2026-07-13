import { getCanonicalRequestIdentity } from "../../src/canonicalRequestIdentity";
import { createFakeFirestoreHarness } from "./fakeFirestore";

export function createSubmitFactCommandHarness() {
  const firestore = createFakeFirestoreHarness();
  return {
    firestore,
    identity: getCanonicalRequestIdentity,
    resetProof: "factory-created state per test; no module-level databaseState is shared"
  };
}
