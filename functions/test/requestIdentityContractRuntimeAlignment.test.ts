import { describe, expect, test } from "vitest";
import fs from "fs";
import path from "path";
import { COMMAND_RECEIPT_FIELDS, REPLAY_COMPARISON_FIELDS, CANONICAL_JSON_VERSION, REQUEST_HASH_VERSION } from "../src/submitFactCommand";

describe("Callable API request identity contract/runtime alignment", () => {
  test("runtime constants match active contract metadata", () => {
    const profile = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../contracts/profiles/current-application.json"), "utf8"));
    const contract = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../contracts/packages/callable-functions-api/${profile.contracts["callable-functions-api"]}/contract.json`), "utf8"));
    expect(contract.requestIdentity.canonicalJsonVersion).toBe(CANONICAL_JSON_VERSION);
    expect(contract.requestIdentity.requestHashVersion).toBe(REQUEST_HASH_VERSION);
    expect(contract.requestIdentity.receiptFields).toEqual([...COMMAND_RECEIPT_FIELDS]);
    expect(contract.requestIdentity.replayComparisonFields).toEqual([...REPLAY_COMPARISON_FIELDS]);
  });
});
