import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'); const profile=JSON.parse(fs.readFileSync(path.join(root,'contracts/profiles/current-application.json'),'utf8')); const v=profile.contracts['callable-functions-api']; const c=JSON.parse(fs.readFileSync(path.join(root,'contracts/packages/callable-functions-api',v,'contract.json'),'utf8'));
function fail(m){throw new Error(m)}; const src=fs.readFileSync(path.join(root,'functions/src/canonicalRequestIdentity.ts'),'utf8')+fs.readFileSync(path.join(root,'functions/src/submitFactCommand.ts'),'utf8');
if(!c.requestIdentity) fail('contract missing requestIdentity metadata');
if(c.requestIdentity.canonicalJsonVersion!==1) fail('canonicalJsonVersion drift'); if(c.requestIdentity.requestHashVersion!=='sha256-canonical-json-v1') fail('requestHashVersion drift');
for(const f of c.requestIdentity.receiptFields) if(!src.includes(f)) fail(`receipt field ${f} missing from runtime`);
for(const f of c.requestIdentity.replayComparisonFields) if(!src.includes(f)) fail(`replay field ${f} missing from runtime`);
if(!src.includes('CANONICAL_JSON_VERSION = 1')||!src.includes('REQUEST_HASH_VERSION = "sha256-canonical-json-v1"')) fail('runtime constants drift');
console.log(`Contract/runtime drift gate passed for Callable API ${v}.`);
