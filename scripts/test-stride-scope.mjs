import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(rootDir, '.agents/strides/2.0.20.json');
const allowed = ['Projection Reliability and Ordering', 'Rules, Legacy Runtime and Export Closure'];
function fail(msg){ throw new Error(msg); }
function validate(manifest){ for (const d of manifest.deferrals || []) if (!allowed.includes(d.scope)) fail(`Unallowed deferral: ${d.scope}`); const serialized=JSON.stringify(manifest.deferrals||[]); for (const forbidden of ['Fact runtime','version governance','requestHashVersion','idempotency']) if (serialized.includes(forbidden)) fail(`Fact closure item deferred: ${forbidden}`); }
if (process.argv.includes('--self-test')) { const good=JSON.parse(fs.readFileSync(manifestPath,'utf8')); validate(good); const bad=structuredClone(good); bad.deferrals.push({target:'2.0.21',scope:'Fact runtime',items:['idempotency']}); let failed=false; try{validate(bad)}catch{failed=true} if(!failed) fail('self-test did not fail for unallowed deferral'); console.log('Stride scope self-test passed.'); }
else { try { validate(JSON.parse(fs.readFileSync(manifestPath,'utf8'))); console.log('Stride scope gate passed.'); } catch(e){ console.error(`❌ Stride scope gate failed: ${e.message}`); process.exit(1); } }
