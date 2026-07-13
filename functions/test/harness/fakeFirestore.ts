export interface FakeFirestoreHarness {
  state: Map<string, unknown>;
  reads: string[];
  writes: string[];
  queries: Array<{ collectionPath: string; field: string; operator: string; value: unknown }>;
  assertReadsBeforeWrites(): void;
}

export function createFakeFirestoreHarness(): FakeFirestoreHarness {
  const state = new Map<string, unknown>();
  const reads: string[] = [];
  const writes: string[] = [];
  const queries: FakeFirestoreHarness["queries"] = [];
  return {
    state,
    reads,
    writes,
    queries,
    assertReadsBeforeWrites() {
      if (writes.length > 0 && reads.some((_, index) => index > reads.length - 1)) {
        throw new Error("Invalid fake Firestore read/write ordering");
      }
    }
  };
}
