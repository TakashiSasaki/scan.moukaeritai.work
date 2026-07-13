import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fail(msg){ console.error(`❌ Documentation Reality Gate Failed: ${msg}`); process.exit(1); }
console.log('🔍 Running Documentation Reality Gate...');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir,'package.json'),'utf8'));
const currentVersion = pkg.version;
const readme = fs.readFileSync(path.join(rootDir,'README.md'),'utf8');
const agents = fs.readFileSync(path.join(rootDir,'AGENTS.md'),'utf8');
if (!readme.includes(`Version ${currentVersion}`) && !readme.includes(`v${currentVersion}`)) fail('README current version mismatch');
if (!agents.includes(`scan.mw ${currentVersion}`) && !agents.includes(`version **${currentVersion}**`)) fail('AGENTS current version mismatch');
for (const phrase of ['Node-only verification passed locally.','Main-target GitHub Actions confirmation is pending.']) { if (!readme.includes(phrase)) fail(`README missing ${phrase}`); if (!agents.includes(phrase)) fail(`AGENTS missing ${phrase}`); }
for (const forbidden of [/CI green/i,/GitHub Actions passed/i,/fully verified in CI/i,/version downgrade.*repair/i,/2\.0\.18.*Current/i]) if (forbidden.test(readme+agents)) fail(`Forbidden documentation claim: ${forbidden}`);
const profile = JSON.parse(fs.readFileSync(path.join(rootDir,'contracts/profiles/current-application.json'),'utf8')); if (profile.applicationVersion !== currentVersion) fail('profile applicationVersion mismatch');
function roadmap(text, file){ const entries=[]; const seen=new Set(); for (const line of text.split('\n').filter(l=>l.trim().startsWith('- **2.'))) { const m=line.match(/\*\*(2\.\d+\.\d+)\*\*:\s*(.*?)\s*\((.*?)\)/); if (m) { if(seen.has(m[1])) fail(`${file} duplicate roadmap ${m[1]}`); seen.add(m[1]); entries.push({version:m[1],name:m[2],status:m[3],line}); } } return entries; }
const r1=roadmap(readme,'README.md'), r2=roadmap(agents,'AGENTS.md');
const required=[['2.0.18','Fact Runtime Recovery and Regression Gate Closure'],['2.0.19','Hermes Branch Integration and Branch Workflow Update'],['2.0.20','Fact Runtime Closure Correction and Version Governance Repair'],['2.0.21','Projection Reliability and Ordering'],['2.0.22','Rules, Legacy Runtime and Export Closure'],['2.1.0','EFP-native First Vertical Slice']];
for (const [v,n] of required) for (const [file,r] of [['README.md',r1],['AGENTS.md',r2]]) { const e=r.find(x=>x.version===v); if(!e) fail(`${file} missing ${v}`); if(!e.name.includes(n)) fail(`${file} ${v} name mismatch`); }
const c1=r1.find(e=>/Current/.test(e.status)), c2=r2.find(e=>/Current/.test(e.status)); if(!c1||!c2||c1.version!==c2.version) fail('README and AGENTS Current differ'); if(c1.version!==currentVersion) fail('Current roadmap version differs from package');
if (!readme.includes('2.0.19') || !agents.includes('2.0.19')) fail('2.0.19 history removed');
const stridePath=path.join(rootDir,'.agents/strides',`${currentVersion}.json`); if(!fs.existsSync(stridePath)) fail('missing current stride manifest'); const stride=JSON.parse(fs.readFileSync(stridePath,'utf8')); if(stride.status==='ready-for-main-pr' && /Completed in 2\.0\.20|2\.0\.20.*Completed/i.test(readme+agents)) fail('ready-for-main-pr documented as Completed');
const contract = JSON.parse(fs.readFileSync(path.join(rootDir,'contracts/packages/callable-functions-api',profile.contracts['callable-functions-api'],'contract.json'),'utf8')); const canonical = fs.readFileSync(path.join(rootDir,'functions/src/canonicalRequestIdentity.ts'),'utf8'); if(!canonical.includes((contract.metadata && contract.metadata.requestHashVersion))) fail('requestHashVersion contract/runtime mismatch');
console.log('✅ Documentation Reality Gate Passed successfully!');
