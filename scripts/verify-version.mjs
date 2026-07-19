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

export function isApplicationCodePath(file) {
  const normalized = file.replaceAll('\\', '/');
  const isDocumentation = /^(README\.md|AGENTS\.md|\.agents\/|docs\/|.*\.md$)/i.test(normalized);
  const isAgentPolicyMetadata = /^(\.agent-policy(?:\.yml|\.lock|\/))/i.test(normalized);
  const isRepositoryAutomation = /^\.github\//i.test(normalized);
  const isTest = /(^|\/)(__tests__|tests?)\//i.test(normalized)
    || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(normalized);
  const isVersionGovernanceTooling = normalized === 'scripts/verify-version.mjs';
  return !(
    isDocumentation
    || isAgentPolicyMetadata
    || isRepositoryAutomation
    || isTest
    || isVersionGovernanceTooling
  );
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

  const pathCases = [
    ['application source', 'src/App.tsx', true],
    ['contract data', 'contracts/profiles/current-application.json', true],
    ['agent-policy config', '.agent-policy.yml', false],
    ['agent-policy lock', '.agent-policy.lock', false],
    ['agent-policy state', '.agent-policy/adoption.json', false],
    ['repository workflow', '.github/workflows/ci.yml', false],
    ['repository policy', 'policy/project.md', false],
    ['top-level tests', 'tests/routing/catalog.test.ts', false],
    ['nested test file', 'src/lib/routeCatalog.spec.ts', false],
    ['version governance tooling', 'scripts/verify-version.mjs', false]
  ];
  for (const [name, file, expected] of pathCases) {
    if (isApplicationCodePath(file) !== expected) fail(`Path classification self-test failed for ${name}: ${file}`);
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

// UNCONDITIONAL workspace version synchronization checks
const targetVersion = pkg.version;
const checkEquals = (val, expected, label) => {
  if (val !== expected) {
    fail(`Workspace synchronization mismatch in ${label}: expected ${expected}, got ${val}`);
  }
};

try {
  const funPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'functions/package.json'), 'utf8'));
  checkEquals(funPkg.version, targetVersion, 'functions/package.json version');
} catch (error) {
  fail(`Failed to validate functions/package.json: ${error.message}`);
}

try {
  const efpPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'packages/efp-model/package.json'), 'utf8'));
  checkEquals(efpPkg.version, targetVersion, 'packages/efp-model/package.json version');
} catch (error) {
  fail(`Failed to validate packages/efp-model/package.json: ${error.message}`);
}

try {
  const profile = JSON.parse(fs.readFileSync(path.join(rootDir, 'contracts/profiles/current-application.json'), 'utf8'));
  checkEquals(profile.applicationVersion, targetVersion, 'contracts/profiles/current-application.json applicationVersion');
} catch (error) {
  fail(`Failed to validate contracts/profiles/current-application.json: ${error.message}`);
}

try {
  const lock = JSON.parse(fs.readFileSync(path.join(rootDir, 'package-lock.json'), 'utf8'));
  checkEquals(lock.version, targetVersion, 'package-lock.json root version');
  checkEquals(lock.packages?.[""]?.version, targetVersion, 'package-lock.json packages[""].version');
} catch (error) {
  fail(`Failed to validate package-lock.json: ${error.message}`);
}

try {
  const funLock = JSON.parse(fs.readFileSync(path.join(rootDir, 'functions/package-lock.json'), 'utf8'));
  checkEquals(funLock.version, targetVersion, 'functions/package-lock.json root version');
  checkEquals(funLock.packages?.[""]?.version, targetVersion, 'functions/package-lock.json packages[""].version');
} catch (error) {
  fail(`Failed to validate functions/package-lock.json: ${error.message}`);
}

try {
  const efpLock = JSON.parse(fs.readFileSync(path.join(rootDir, 'packages/efp-model/package-lock.json'), 'utf8'));
  checkEquals(efpLock.version, targetVersion, 'packages/efp-model/package-lock.json root version');
  checkEquals(efpLock.packages?.[""]?.version, targetVersion, 'packages/efp-model/package-lock.json packages[""].version');
} catch (error) {
  fail(`Failed to validate packages/efp-model/package-lock.json: ${error.message}`);
}

if (!isStatic) {
  let baseRef = null;
  if (process.env.VERIFY_VERSION_BASE_REF) {
    baseRef = process.env.VERIFY_VERSION_BASE_REF;
  } else if (process.env.VERIFY_FAST_BASE_REF) {
    baseRef = process.env.VERIFY_FAST_BASE_REF;
  } else if (process.env.GITHUB_BASE_REF) {
    baseRef = `origin/${process.env.GITHUB_BASE_REF}`;
  } else if (process.env.GITHUB_SHA) {
    baseRef = `${process.env.GITHUB_SHA}~1`;
  } else {
    baseRef = 'HEAD~1';
  }
  console.log(`Comparing version metadata against base reference: ${baseRef}`);

  try {
    execSync(`git rev-parse --verify ${baseRef}`, { stdio: 'ignore' });
  } catch (_) {
    fail(`Base reference "${baseRef}" cannot be resolved in Git.`);
  }

  try {
    if (process.env.GITHUB_BASE_REF) execSync(`git fetch --depth=10 origin ${process.env.GITHUB_BASE_REF}`, { stdio: 'inherit' });
    const basePackage = JSON.parse(execSync(`git show ${baseRef}:package.json`, { encoding: 'utf8', stdio: 'pipe' }));

    // Check if there are application-code changes
    const diffFiles = execSync(`git diff --name-only ${baseRef}`, { encoding: 'utf8', stdio: 'pipe' })
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);

    const hasCodeChanges = diffFiles.some(isApplicationCodePath);

    if (basePackage.version) {
      if (basePackage.version === pkg.version) {
        if (hasCodeChanges) {
          fail(`package.json version is unchanged (${pkg.version}) despite application code changes. Every change modifying application code or contracts must increment the application version.`);
        }
      } else {
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

console.log('• Version verification passed.');
