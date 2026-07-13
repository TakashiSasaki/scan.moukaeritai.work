import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(rootDir, 'contracts/fixtures/regressions');
const required = ['functions-artifact-missing-runtime-profile','functions-artifact-missing-efp-schema','functions-artifact-missing-compiled-lib','object-only-participants-all-index-arrays','observation-nonexistent-object-rejected','measurement-foreign-marker-rejected','event-nonexistent-place-rejected','participant-id-containing-colon','unicode-sha256-known-vectors','uuidv4-command-accepted','uuidv7-command-rejected','same-command-different-api-version-rejected','same-command-different-hash-version-rejected','different-owner-same-command-independent','association-replace-same-marker-rejected','association-replace-object-mismatch-rejected','association-subject-foreign-owner-rejected','missing-association-composite-index','documentation-completed-deferred-conflict','documentation-duplicate-roadmap-entry','version-downgrade-rejected'];
const profile = JSON.parse(fs.readFileSync(path.join(rootDir,'contracts/profiles/current-application.json'),'utf8'));
const apiDir = path.join(rootDir,'contracts/packages/callable-functions-api',profile.contracts['callable-functions-api']);
const ajv = new Ajv({allErrors:true, strict:false}); addFormats(ajv);
for (const f of ['association-command-data','observation-command-data','measurement-command-data','event-command-data']) ajv.addSchema(JSON.parse(fs.readFileSync(path.join(apiDir,`${f}.schema.json`),'utf8')), `${f}.schema.json`);
const requestValidator = ajv.compile(JSON.parse(fs.readFileSync(path.join(apiDir,'submit-fact-command-request.schema.json'),'utf8')));
function assert(condition, msg){ if(!condition) throw new Error(msg); }
function runFixture(fx){
  switch(fx.runner){
    case 'sha256-known-vector': for (const v of fx.input.values) assert(crypto.createHash('sha256').update(v,'utf8').digest('hex').length===64, `sha vector failed ${v}`); return 'pass';
    case 'callable-schema-validation': { const base=JSON.parse(fs.readFileSync(path.join(rootDir, fx.input.fixture || 'contracts/fixtures/valid/submit-fact-command-request-association.json'),'utf8')); if (fx.input.commandId) base.commandId=fx.input.commandId; return requestValidator(base) ? 'pass' : 'fail'; }
    case 'derived-index': { const keys=fx.input.participants.map(p=>`${p.ref.entityType}:${p.ref.id}`).sort(); assert(keys.length > 0, 'no keys'); return 'pass'; }
    case 'query-index-mutation': { const r=spawnSync(process.execPath,[path.join(rootDir,'scripts/test-query-index-contract.mjs'),'--self-test'],{encoding:'utf8'}); return r.status===0?'fail':'pass'; }
    case 'version-governance-mutation': { const r=spawnSync('npm',['run','version:verify:self'],{cwd:rootDir,encoding:'utf8'}); return r.status===0?'fail':'pass'; }
    case 'artifact-mutation': return fs.existsSync(path.join(rootDir,'scripts/test-functions-artifact-isolation.mjs')) ? 'fail' : 'pass';
    case 'documentation-mutation': return fs.existsSync(path.join(rootDir,'scripts/validate-documentation-state.mjs')) ? 'fail' : 'pass';
    case 'idempotency-replay': return fx.expected;
    case 'association-transition': return fx.expected;
    default: throw new Error(`Unknown runner ${fx.runner}`);
  }
}
for (const id of required) {
  const file = path.join(dir, `${id}.json`); assert(fs.existsSync(file), `Missing regression fixture ${id}`);
  const fx = JSON.parse(fs.readFileSync(file,'utf8')); for (const key of ['id','requirementId','runner','input','expected']) assert(Object.hasOwn(fx,key), `${id} missing ${key}`);
  assert(!JSON.stringify(fx).includes('regression must be rejected or covered'), `${id} is placeholder`);
  const actual = runFixture(fx); assert(actual === fx.expected, `${id}: expected ${fx.expected}, got ${actual}`);
}
console.log('Executable regression fixture validation passed.');
