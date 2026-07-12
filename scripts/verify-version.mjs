import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function fail(msg) {
  console.error(`❌ Version Verification Failed: ${msg}`);
  process.exit(1);
}

function isSemverGreater(current, base) {
  if (!current || !base) return false;
  const cParts = current.split('.').map(Number);
  const bParts = base.split('.').map(Number);
  if (cParts.length !== 3 || bParts.length !== 3 || cParts.some(isNaN) || bParts.some(isNaN)) {
    fail(`Invalid SemVer format: ${current} or ${base}`);
  }
  for (let i = 0; i < 3; i++) {
    if (cParts[i] > bParts[i]) return true;
    if (cParts[i] < bParts[i]) return false;
  }
  return false;
}

console.log('🔍 Running Version Verification...');

let baseRef = 'HEAD~1';
if (process.env.GITHUB_BASE_REF) {
  baseRef = `origin/${process.env.GITHUB_BASE_REF}`;
} else if (process.env.GITHUB_SHA) {
  baseRef = `${process.env.GITHUB_SHA}~1`;
}
console.log(`Comparing against base reference: ${baseRef}`);

let changedFiles = [];
try {
  if (process.env.GITHUB_BASE_REF) {
    execSync(`git fetch --depth=10 origin ${process.env.GITHUB_BASE_REF}`, { stdio: 'inherit' });
  }
  const output = execSync(`git diff --name-only ${baseRef}`, { encoding: 'utf8' });
  changedFiles = output.split('\n').map(f => f.trim()).filter(Boolean);
} catch (err) {
  fail(`Git comparison failed: ${err.message}`);
}
console.log(`Changed files count: ${changedFiles.length}`);

const sensitivePaths = [
  /^src\//,
  /^functions\//,
  /^packages\//,
  /^contracts\//,
  /^scripts\//,
  /^firestore\.rules$/,
  /^storage\.rules$/,
  /^firebase\.json$/,
  /^vite\.config\..*$/,
  /^tsconfig.*\.json$/,
  /^\.github\/workflows\//
];

const codeChanged = changedFiles.some(file => {
  if (file.endsWith('.md')) return false;
  return sensitivePaths.some(pattern => pattern.test(file));
});

let currentVersion;
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  currentVersion = pkg.version;
  if (!currentVersion) fail('Missing version in package.json');
} catch (e) {
  fail(`Failed to read/parse current package.json: ${e.message}`);
}

let baseVersion;
try {
  const basePackageContent = execSync(`git show ${baseRef}:package.json`, { encoding: 'utf8' });
  const basePackage = JSON.parse(basePackageContent);
  baseVersion = basePackage.version;
  if (!baseVersion) fail('Missing version in base package.json');
} catch (err) {
  fail(`Could not retrieve or parse package.json from base ref: ${err.message}`);
}

console.log(`Current version: ${currentVersion}`);
console.log(`Base version:    ${baseVersion}`);

if (codeChanged) {
  if (currentVersion === baseVersion) {
    fail(`The version in package.json must be bumped. Code changed under sensitive paths, but version remained "${currentVersion}".`);
  }
  if (!isSemverGreater(currentVersion, baseVersion)) {
    fail(`Current version "${currentVersion}" is not greater than base version "${baseVersion}".`);
  }
}

// Check other versions to be consistent
const checkPackageVersion = (pkgPath) => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, pkgPath), 'utf8'));
    if (pkg.version !== currentVersion) {
      fail(`Version mismatch in ${pkgPath}: Expected ${currentVersion}, got ${pkg.version}`);
    }
  } catch (e) {
    fail(`Failed to verify ${pkgPath}: ${e.message}`);
  }
};
checkPackageVersion('functions/package.json');
checkPackageVersion('packages/efp-model/package.json');

try {
  const profilePath = path.join(rootDir, 'contracts/profiles/current-application.json');
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  if (profile.applicationVersion !== currentVersion) {
    fail(`Version mismatch in current-application.json: Expected ${currentVersion}, got ${profile.applicationVersion}`);
  }
} catch (e) {
  fail(`Failed to verify current-application.json: ${e.message}`);
}

try {
  const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
  if (!readme.includes(`Version ${currentVersion}`) && !readme.includes(`v${currentVersion}`)) {
    fail(`README.md does not contain the current version ${currentVersion}`);
  }
} catch (e) {
  fail(`Failed to verify README.md: ${e.message}`);
}

// Major bump human approval check
const currentParts = currentVersion.split('.').map(Number);
const baseParts = baseVersion.split('.').map(Number);
if (currentParts[0] > baseParts[0]) {
  try {
    const approvalRecord = execSync(`git show ${baseRef}:contracts/governance/major-bump-approval.json`, { encoding: 'utf8', stdio: 'pipe' });
    const approval = JSON.parse(approvalRecord);
    if (approval.approvedVersion !== currentVersion) {
      fail(`Major version bump requires pre-existing human approval for ${currentVersion} in base branch.`);
    }
  } catch (e) {
    fail(`Major version bump detected without a valid pre-existing human approval record in base branch: ${e.message}`);
  }
}

console.log(`✅ Version bump verified! "${baseVersion}" -> "${currentVersion}"`);
