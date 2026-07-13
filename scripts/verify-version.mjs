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


if (process.argv.includes('--self-test')) {
  const cases = [
    ['2.0.20', '2.0.19', true],
    ['2.0.19', '2.0.19', false],
    ['2.0.18', '2.0.19', false]
  ];
  for (const [current, base, expected] of cases) {
    if (isSemverGreater(current, base) !== expected) {
      fail(`Self-test failed for ${base} -> ${current}`);
    }
  }
  console.log('✅ Version verifier self-test passed: 2.0.19→2.0.20 pass; equal/downgrade fail; major bump remains approval-gated in formal mode.');
  process.exit(0);
}

console.log('🔍 Running Version Verification...');

const isStatic = process.argv.includes('--static');

let baseRef = 'HEAD~1';
if (process.env.GITHUB_BASE_REF) {
  baseRef = `origin/${process.env.GITHUB_BASE_REF}`;
} else if (process.env.GITHUB_SHA) {
  baseRef = `${process.env.GITHUB_SHA}~1`;
}

let changedFiles = [];
let baseVersion;

if (!isStatic) {
  console.log(`Comparing against base reference: ${baseRef}`);
  try {
    if (process.env.GITHUB_BASE_REF) {
      execSync(`git fetch --depth=10 origin ${process.env.GITHUB_BASE_REF}`, { stdio: 'inherit' });
    }
    const output = execSync(`git diff --name-only ${baseRef}`, { encoding: 'utf8', stdio: 'pipe' });
    changedFiles = output.split('\n').map(f => f.trim()).filter(Boolean);
  } catch (err) {
    fail(`Git comparison failed: ${err.message}. Any failure to compare against Git reference must fail the formal version gate.`);
  }

  try {
    const basePackageContent = execSync(`git show ${baseRef}:package.json`, { encoding: 'utf8', stdio: 'pipe' });
    const basePackage = JSON.parse(basePackageContent);
    baseVersion = basePackage.version;
    if (!baseVersion) fail('Missing version in base package.json');
  } catch (err) {
    fail(`Could not retrieve or parse package.json from base ref: ${err.message}`);
  }
} else {
  console.log('⚠️ Running in STATIC alignment verification mode. Git history comparison is bypassed.');
}

if (!isStatic) {
  console.log(`Changed files count: ${changedFiles.length}`);
}

let currentVersion;
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  currentVersion = pkg.version;
  if (!currentVersion) fail('Missing version in package.json');
} catch (e) {
  fail(`Failed to read/parse current package.json: ${e.message}`);
}

console.log(`Current version: ${currentVersion}`);
if (!isStatic) {
  console.log(`Base version:    ${baseVersion}`);
}

// 1. Perform git-history-based checks only if in formal (non-static) mode
if (!isStatic) {
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

  if (codeChanged) {
    if (currentVersion === baseVersion) {
      fail(`The version in package.json must be bumped. Code changed under sensitive paths, but version remained "${currentVersion}".`);
    }
    if (!isSemverGreater(currentVersion, baseVersion)) {
      fail(`Current version "${currentVersion}" is not greater than base version "${baseVersion}".`);
    }
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
}

// 2. Verify that all other packages and configuration files are perfectly synchronized
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

if (!isStatic) {
  console.log(`✅ Version bump verified! "${baseVersion}" -> "${currentVersion}"`);
} else {
  console.log(`✅ Version consistency check passed successfully (Static Alignment)! Current version is "${currentVersion}"`);
}
