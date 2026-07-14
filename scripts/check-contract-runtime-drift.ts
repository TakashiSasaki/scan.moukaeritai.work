import fs from "node:fs";import path from "node:path";import { fileURLToPath } from "node:url";
import { CANONICAL_JSON_VERSION, REQUEST_HASH_VERSION, COMMAND_RECEIPT_FIELDS, REPLAY_COMPARISON_FIELDS } from "../functions/src/submitFactCommandCore";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'); const profile=JSON.parse(fs.readFileSync(path.join(root,'contracts/profiles/current-application.json'),'utf8')); const v=profile.contracts['callable-functions-api']; const c=JSON.parse(fs.readFileSync(path.join(root,'contracts/packages/callable-functions-api',v,'contract.json'),'utf8'));
function fail(m:string):never{throw new Error(m)}
if(!c.requestIdentity) fail('contract missing requestIdentity metadata');
if(c.requestIdentity.canonicalJsonVersion!==CANONICAL_JSON_VERSION) fail('canonicalJsonVersion drift');
if(c.requestIdentity.requestHashVersion!==REQUEST_HASH_VERSION) fail('requestHashVersion drift');
if(JSON.stringify(c.requestIdentity.receiptFields)!==JSON.stringify(COMMAND_RECEIPT_FIELDS)) fail('receipt fields drift');
if(JSON.stringify(c.requestIdentity.replayComparisonFields)!==JSON.stringify(REPLAY_COMPARISON_FIELDS)) fail('replay fields drift');
console.log(`Contract/runtime drift gate passed for Callable API ${v}.`);
