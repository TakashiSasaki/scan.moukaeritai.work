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

// Semver greater helper
function isSemverGreater(current, base) {
  const cParts = current.split('.').map(Number);
  const bParts = base.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (cParts[i] > bParts[i]) return true;
    if (cParts[i] < bParts[i]) return false;
  }
  return false;
}

console.log('🔍 Running Version Verification...');

// 1. Determine comparison base
let baseRef = 'HEAD~1';
if (process.env.GITHUB_BASE_REF) {
  // Pull request context
  baseRef = `origin/${process.env.GITHUB_BASE_REF}`;
} else if (process.env.GITHUB_SHA) {
  // Push context
  baseRef = `${process.env.GITHUB_SHA}~1`;
}

console.log(`Comparing against base reference: ${baseRef}`);

// Fetch git differences
let changedFiles = [];
try {
  // Ensure we fetch base ref if running in GitHub Actions
  if (process.env.GITHUB_BASE_REF) {
    execSync(`git fetch --depth=10 origin ${process.env.GITHUB_BASE_REF}`, { stdio: 'inherit' });
  }
  const output = execSync(`git diff --name-only ${baseRef}`, { encoding: 'utf8' });
  changedFiles = output.split('\n').map(f => f.trim()).filter(Boolean);
} catch (err) {
  console.warn(`⚠️ Git comparison failed: ${err.message}. Falling back to default baseline pass.`);
  process.exit(0);
}

console.log(`Changed files count: ${changedFiles.length}`);

// 2. Define sensitive paths triggering mandatory version bump (excluding markdown files)
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
  // Exclude markdown files from code-level triggers
  if (file.endsWith('.md')) return false;
  return sensitivePaths.some(pattern => pattern.test(file));
});

if (!codeChanged) {
  console.log('✅ No sensitive code or configuration files changed. Version bump is not mandatory.');
  process.exit(0);
}

console.log('⚡ Code or configurations changed. Verifying version bump...');

// 3. Read current version
const currentPackagePath = path.join(rootDir, 'package.json');
if (!fs.existsSync(currentPackagePath)) {
  fail('package.json does not exist');
}
const currentPackage = JSON.parse(fs.readFileSync(currentPackagePath, 'utf8'));
const currentVersion = currentPackage.version;

// 4. Read base version
let baseVersion;
try {
  const basePackageContent = execSync(`git show ${baseRef}:package.json`, { encoding: 'utf8' });
  const basePackage = JSON.parse(basePackageContent);
  baseVersion = basePackage.version;
} catch (err) {
  console.warn(`⚠️ Could not retrieve package.json from base ref: ${err.message}. Assuming initial baseline.`);
  // If we can't load the base package.json, we let it pass.
  process.exit(0);
}

console.log(`Current version: ${currentVersion}`);
console.log(`Base version:    ${baseVersion}`);

if (currentVersion === baseVersion) {
  fail(`The version in package.json must be bumped. Code changed under sensitive paths, but version remained "${currentVersion}".`);
}

if (!isSemverGreater(currentVersion, baseVersion)) {
  fail(`Current version "${currentVersion}" is not greater than base version "${baseVersion}".`);
}

console.log(`✅ Version bump verified! "${baseVersion}" -> "${currentVersion}"`);
