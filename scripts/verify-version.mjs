import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function fail(msg) { console.error(`❌ Version Verification Failed: ${msg}`); process.exit(1); }
function parseSemver(v) { const p = String(v).split('.').map(Number); if (p.length !== 3 || p.some(Number.isNaN)) throw new Error(`Invalid SemVer format: ${v}`); return p; }
function isSemverGreater(current, base) { const c=parseSemver(current), b=parseSemver(base); for (let i=0;i<3;i++){ if(c[i]>b[i]) return true; if(c[i]<b[i]) return false; } return false; }
function isMajorBump(current, base) { return parseSemver(current)[0] > parseSemver(base)[0]; }
function hasValidMajorApproval(current, approvalJson) { try { const a=JSON.parse(approvalJson); return a.approvedVersion === current; } catch { return false; } }
function evaluateVersionTransition({ currentVersion, baseVersion, codeChanged, approvalJson }) {
  if (codeChanged) {
    if (currentVersion === baseVersion) return { ok:false, reason:`The version in package.json must be bumped. Code changed under sensitive paths, but version remained "${currentVersion}".` };
    if (!isSemverGreater(currentVersion, baseVersion)) return { ok:false, reason:`Current version "${currentVersion}" is not greater than base version "${baseVersion}".` };
  }
  if (isMajorBump(currentVersion, baseVersion) && !hasValidMajorApproval(currentVersion, approvalJson || '')) return { ok:false, reason:`Major version bump detected without a valid pre-existing human approval record for ${currentVersion}.` };
  return { ok:true };
}
function runSelfTest() {
  const cases = [
    { name:'2.0.19 -> 2.0.20 pass', currentVersion:'2.0.20', baseVersion:'2.0.19', codeChanged:true, ok:true },
    { name:'2.0.19 -> 2.0.19 fail', currentVersion:'2.0.19', baseVersion:'2.0.19', codeChanged:true, ok:false },
    { name:'2.0.19 -> 2.0.18 fail', currentVersion:'2.0.18', baseVersion:'2.0.19', codeChanged:true, ok:false },
    { name:'2.0.19 -> 3.0.0 no approval fail', currentVersion:'3.0.0', baseVersion:'2.0.19', codeChanged:true, ok:false },
    { name:'2.0.19 -> 3.0.0 approved pass', currentVersion:'3.0.0', baseVersion:'2.0.19', codeChanged:true, approvalJson:JSON.stringify({approvedVersion:'3.0.0'}), ok:true }
  ];
  for (const c of cases) { const r=evaluateVersionTransition(c); if (r.ok !== c.ok) fail(`Self-test failed: ${c.name} => ${JSON.stringify(r)}`); }
  console.log('✅ Version verifier self-test passed.');
}

console.log('🔍 Running Version Verification...');
if (process.argv.includes('--self-test')) { runSelfTest(); process.exit(0); }
const isStatic = process.argv.includes('--static');
let baseRef = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : (process.env.GITHUB_SHA ? `${process.env.GITHUB_SHA}~1` : 'HEAD~1');
let changedFiles = [], baseVersion, approvalJson='';
if (!isStatic) {
  console.log(`Comparing against base reference: ${baseRef}`);
  try { if (process.env.GITHUB_BASE_REF) execSync(`git fetch --depth=10 origin ${process.env.GITHUB_BASE_REF}`, { stdio:'inherit' }); changedFiles = execSync(`git diff --name-only ${baseRef}`, {encoding:'utf8'}).split('\n').map(f=>f.trim()).filter(Boolean); } catch (err) { fail(`Git comparison failed: ${err.message}. Any failure to compare against Git reference must fail the formal version gate.`); }
  try { baseVersion = JSON.parse(execSync(`git show ${baseRef}:package.json`, {encoding:'utf8'})).version; if (!baseVersion) fail('Missing version in base package.json'); } catch (err) { fail(`Could not retrieve or parse package.json from base ref: ${err.message}`); }
  try { approvalJson = execSync(`git show ${baseRef}:contracts/governance/major-bump-approval.json`, {encoding:'utf8', stdio:['ignore','pipe','ignore']}); } catch { approvalJson = ''; }
} else console.log('⚠️ Running in STATIC alignment verification mode. Git history comparison is bypassed.');
const currentVersion = JSON.parse(fs.readFileSync(path.join(rootDir,'package.json'),'utf8')).version;
console.log(`Current version: ${currentVersion}`); if (!isStatic) console.log(`Base version:    ${baseVersion}`);
if (!isStatic) {
  const sensitivePaths=[/^src\//,/^functions\//,/^packages\//,/^contracts\//,/^scripts\//,/^firestore\.rules$/,/^storage\.rules$/,/^firebase\.json$/,/^vite\.config\..*$/,/^tsconfig.*\.json$/,/^\.github\/workflows\//];
  const codeChanged = changedFiles.some(file => !file.endsWith('.md') && sensitivePaths.some(p=>p.test(file)));
  const result = evaluateVersionTransition({ currentVersion, baseVersion, codeChanged, approvalJson });
  if (!result.ok) fail(result.reason);
}
function checkPackageVersion(pkgPath) { const pkg=JSON.parse(fs.readFileSync(path.join(rootDir,pkgPath),'utf8')); if (pkg.version !== currentVersion) fail(`Version mismatch in ${pkgPath}: Expected ${currentVersion}, got ${pkg.version}`); }
checkPackageVersion('functions/package.json'); checkPackageVersion('packages/efp-model/package.json');
const profile=JSON.parse(fs.readFileSync(path.join(rootDir,'contracts/profiles/current-application.json'),'utf8')); if (profile.applicationVersion !== currentVersion) fail(`Version mismatch in current-application.json: Expected ${currentVersion}, got ${profile.applicationVersion}`);
const readme=fs.readFileSync(path.join(rootDir,'README.md'),'utf8'); if (!readme.includes(`Version ${currentVersion}`) && !readme.includes(`v${currentVersion}`)) fail(`README.md does not contain the current version ${currentVersion}`);
console.log(isStatic ? `✅ Version consistency check passed successfully (Static Alignment)! Current version is "${currentVersion}"` : `✅ Version bump verified! "${baseVersion}" -> "${currentVersion}"`);
