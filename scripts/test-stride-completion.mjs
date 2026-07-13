import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedStatuses = new Set(['pending','in-progress','complete','ready-for-main-pr']);
const requiredIds = ['version-governance-monotonic','version-2.0.20','callable-api-1.1.8-active','request-hash-version-contract-runtime-alignment','functions-artifact-profile-resolution','functions-artifact-compiled-isolation','owner-aware-fake-firestore','idempotency-regression-matrix','association-transition-matrix','marker-replace-normative-policy','version-specific-callable-compatibility','executable-regression-fixtures','query-index-baseline','stride-gate-hardening','documentation-reality','node-only-baseline','main-target-ci'];
function fail(msg){ throw new Error(msg); }
function validate(manifest){
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir,'package.json'),'utf8'));
  if (manifest.applicationVersion !== pkg.version) fail('manifest applicationVersion must match package.json');
  if (!allowedStatuses.has(manifest.status)) fail(`invalid top-level status ${manifest.status}`);
  const reqs = manifest.requirements || []; const ids = new Set();
  for (const id of requiredIds) if (!reqs.some(r=>r.id===id)) fail(`missing required requirement ${id}`);
  for (const req of reqs) { if (ids.has(req.id)) fail(`duplicate requirement ${req.id}`); ids.add(req.id); if(!allowedStatuses.has(req.status)) fail(`invalid status ${req.status}`); }
  if (manifest.status === 'complete' && reqs.some(r=>r.status!=='complete')) fail('complete manifest cannot contain pending requirements');
  if (manifest.status === 'ready-for-main-pr' && reqs.some(r=>r.status!=='complete' && r.id!=='main-target-ci')) fail('ready-for-main-pr only allows main-target-ci pending');
  for (const req of reqs.filter(r=>r.status==='complete')) {
    if (!req.evidence?.length) fail(`${req.id} missing evidence`);
    if (!req.verificationCommands?.length) fail(`${req.id} missing verificationCommands`);
    const scripts = JSON.parse(fs.readFileSync(path.join(rootDir,'package.json'),'utf8')).scripts || {};
    for (const ev of req.evidence) if (!fs.existsSync(path.join(rootDir,ev))) fail(`${req.id} evidence missing: ${ev}`);
    for (const cmd of req.verificationCommands) if (!scripts[cmd]) fail(`${req.id} command missing: ${cmd}`);
    if (/runtime|artifact|firestore|idempotency|association|hash|callable|regression/i.test(req.id) && req.evidence.every(e=>/README|AGENTS|\.md$/.test(e))) fail(`${req.id} has documentation-only evidence`);
    if (/compatibility/i.test(req.id) && !req.evidence.some(e=>e.includes('contracts/fixtures/compatibility'))) fail(`${req.id} missing version-specific fixture evidence`);
    if (/regression/i.test(req.id)) { if (!req.evidence.some(e=>e.includes('contracts/fixtures/regressions'))) fail(`${req.id} missing regression fixture evidence`); for (const f of fs.readdirSync(path.join(rootDir,'contracts/fixtures/regressions')).filter(f=>f.endsWith('.json'))) { const raw=fs.readFileSync(path.join(rootDir,'contracts/fixtures/regressions',f),'utf8'); if(raw.includes('regression must be rejected or covered')) fail(`placeholder regression fixture ${f}`); } }
  }
}
const manifestPath = path.join(rootDir,'.agents/strides/2.0.20.json');
if (process.argv.includes('--self-test')) { const good=JSON.parse(fs.readFileSync(manifestPath,'utf8')); validate(good); for (const mut of [m=>m.applicationVersion='2.0.18', m=>m.requirements.pop(), m=>m.requirements.push({...m.requirements[0]}), m=>m.requirements[0].evidence=['missing'], m=>m.requirements[0].verificationCommands=['missing'], m=>{m.requirements[3].evidence=['README.md']}, m=>{m.status='complete'}]) { const c=structuredClone(good); let failed=false; try{mut(c); validate(c);}catch{failed=true;} if(!failed) fail('self-test mutation did not fail'); } console.log('Stride completion self-test passed.'); }
else { try { validate(JSON.parse(fs.readFileSync(manifestPath,'utf8'))); console.log('Stride completion gate passed.'); } catch(e){ console.error(`❌ Stride completion gate failed: ${e.message}`); process.exit(1); } }
