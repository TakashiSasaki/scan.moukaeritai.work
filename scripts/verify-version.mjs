import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function fail(msg) {
  console.error(`❌ Version Verification Failed: ${msg}`);
  process.exit(1);
}

function parseSemver(version) {
  const match = semverPattern.exec(version);
  if (!match) throw new Error(`Invalid SemVer format: ${version}`);
  return match.slice(1, 4).map(Number);
}

export function isSemverGreater(current, base) {
  const cParts = parseSemver(current);
  const bParts = parseSemver(base);
  for (let i = 0; i < 3; i++) {
    if (cParts[i] > bParts[i]) return true;
    if (cParts[i] < bParts[i]) return false;
  }
  return false;
}

function verifyTransition({ baseVersion, currentVersion, approval, approvalInBase = true }) {
  if (!isSemverGreater(currentVersion, baseVersion)) return false;
  const [currentMajor] = parseSemver(currentVersion);
  const [baseMajor] = parseSemver(baseVersion);
  if (currentMajor > baseMajor) return Boolean(approvalInBase && approval?.approvedVersion === currentVersion);
  return true;
}

if (process.argv.includes('--self-test')) {
  const cases = [
    ['patch increase', { baseVersion: '2.0.20', currentVersion: '2.0.21' }, true],
    ['equal version', { baseVersion: '2.0.20', currentVersion: '2.0.20' }, false],
    ['downgrade', { baseVersion: '2.0.20', currentVersion: '2.0.19' }, false],
    ['major without approval', { baseVersion: '2.0.20', currentVersion: '3.0.0' }, false],
    ['major wrong approval', { baseVersion: '2.0.20', currentVersion: '3.0.0', approval: { approvedVersion: '3.0.1' } }, false],
    ['major with base approval', { baseVersion: '2.0.20', currentVersion: '3.0.0', approval: { approvedVersion: '3.0.0' }, approvalInBase: true }, true],
    ['major with branch-only approval', { baseVersion: '2.0.20', currentVersion: '3.0.0', approval: { approvedVersion: '3.0.0' }, approvalInBase: false }, false]
  ];
  for (const [name, input, expected] of cases) {
    if (verifyTransition(input) !== expected) fail(`Self-test failed for ${name}`);
  }
  console.log('✅ Version governance self-test passed.');
  process.exit(0);
}

console.log('🔍 Running Version Verification...');
const isStatic = process.argv.includes('--static');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
if (!pkg.version) fail('Missing version in package.json');
try { parseSemver(pkg.version); } catch (error) { fail(error.message); }
console.log(`Current application version: ${pkg.version}`);

if (!isStatic) {
  let baseRef = 'HEAD~1';
  if (process.env.GITHUB_BASE_REF) baseRef = `origin/${process.env.GITHUB_BASE_REF}`;
  else if (process.env.GITHUB_SHA) baseRef = `${process.env.GITHUB_SHA}~1`;
  console.log(`Comparing version metadata against base reference: ${baseRef}`);

  try {
    if (process.env.GITHUB_BASE_REF) execSync(`git fetch --depth=10 origin ${process.env.GITHUB_BASE_REF}`, { stdio: 'inherit' });
    const basePackage = JSON.parse(execSync(`git show ${baseRef}:package.json`, { encoding: 'utf8', stdio: 'pipe' }));
    if (basePackage.version && basePackage.version !== pkg.version) {
      if (!isSemverGreater(pkg.version, basePackage.version)) {
        fail(`package.json version changed from ${basePackage.version} to ${pkg.version}, but did not monotonically increase.`);
      }
      const [currentMajor] = parseSemver(pkg.version);
      const [baseMajor] = parseSemver(basePackage.version);
      if (currentMajor > baseMajor) {
        try {
          const approval = JSON.parse(execSync(`git show ${baseRef}:contracts/governance/major-bump-approval.json`, { encoding: 'utf8', stdio: 'pipe' }));
          if (approval.approvedVersion !== pkg.version) fail(`Major version bump requires pre-existing human approval for ${pkg.version} in base branch.`);
        } catch (error) {
          fail(`Major version bump detected without valid pre-existing human approval in base branch: ${error.message}`);
        }
      }
    }
  } catch (error) {
    fail(`Git comparison failed: ${error.message}`);
  }
} else {
  console.log('⚠️ Static mode: Git history comparison is bypassed.');
}

if (process.env.RELEASE_TASK === 'true') {
  const profilePath = path.join(rootDir, 'contracts/profiles/current-application.json');
  if (!fs.existsSync(profilePath)) fail('Release task requires contracts/profiles/current-application.json.');
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  if (!profile.applicationVersion) fail('Release task requires applicationVersion metadata in current-application.json.');
}

console.log('✅ Version verification passed.');
