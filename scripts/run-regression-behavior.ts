import fs from "node:fs";
import { buildFactIndexFields } from "../packages/efp-model/src/factParticipants";
import { createSubmitFactCommandHarness } from "../functions/test/harness/submitFactCommandHarness";
const fixture = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const owner = "fixture-user";
function counts(h: any) { return { factWrites: h.firestore.operationLog.filter((op: any) => op.type === "write" && /^(associations|events|observations|measurements)\//.test(op.path)).length, receiptWrites: h.firestore.operationLog.filter((op: any) => op.type === "write" && op.path.includes("/factCommands/")).length }; }
if (fixture.runner === "participant-index") {
  const actual = buildFactIndexFields(fixture.input.participants);
  for (const [key, expected] of Object.entries(fixture.expected)) if (JSON.stringify((actual as any)[key]) !== JSON.stringify(expected)) throw new Error(`${key} mismatch`);
} else if (fixture.runner === "submit-fact-idempotency" || fixture.runner === "association-transition") {
  const initial = fixture.runner === "association-transition" ? fixture.input.documents : { "objects/object1": { ownerId: owner } };
  const h = createSubmitFactCommandHarness({ initial });
  try { await h.submit(owner, fixture.input.request); if (fixture.expected.result !== "success") throw new Error("expected rejection"); }
  catch (e: any) { if (fixture.expected.result === "success") throw e; if (e.code !== fixture.expected.errorCode) throw new Error(`errorCode mismatch ${e.code}`); }
  h.firestore.assertReadsBeforeWrites();
  const actual = counts(h);
  if (actual.factWrites !== fixture.expected.factWrites || actual.receiptWrites !== fixture.expected.receiptWrites) throw new Error(`write count mismatch ${JSON.stringify(actual)}`);
}
