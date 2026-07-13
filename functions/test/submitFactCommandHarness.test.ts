import { describe, expect, test } from "vitest";
import { createSubmitFactCommandHarness } from "./harness/submitFactCommandHarness";

describe("submit Fact command harness isolation", () => {
  test("factory creates independent state per test harness", () => {
    const a = createSubmitFactCommandHarness();
    const b = createSubmitFactCommandHarness();
    a.firestore.state.set("users/u1/factCommands/c1", { factId: "f1" });
    expect(b.firestore.state.has("users/u1/factCommands/c1")).toBe(false);
  });
});
