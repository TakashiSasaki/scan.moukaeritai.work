import fs from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import {
  isVerificationInfrastructureFile,
  buildVerificationPlan
} from './lib/verify-fast-classifier.mjs';

function sh(cmd) {
  if (cmd.includes('functions') && (cmd.includes('build') || cmd.includes('test'))) {
    requireFunctionsDependencies();
  }
  console.log(`\n$ ${cmd}`);
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function output(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function resolveBaseRef() {
  if (process.env.VERIFY_FAST_BASE_REF) {
    const ref = process.env.VERIFY_FAST_BASE_REF;
    try {
      output(`git rev-parse --verify ${ref}^{commit}`);
      return ref;
    } catch {
      console.error(`\n❌ Error: Invalid explicit Git base reference provided: "${ref}".`);
      console.error(`The reference could not be resolved to a valid commit.`);
      process.exit(1);
    }
  }

  const candidates = [];
  if (process.env.GITHUB_BASE_REF) candidates.push(`origin/${process.env.GITHUB_BASE_REF}`);
  candidates.push('HEAD~1');
  for (const ref of candidates) {
    try {
      output(`git rev-parse --verify ${ref}^{commit}`);
      return ref;
    } catch {}
  }
  return null;
}

function requireFunctionsDependencies() {
  if (!fs.existsSync('functions/node_modules')) {
    console.error('Functions dependencies are not installed.');
    console.error('Run: npm ci --prefix functions');
    process.exit(1);
  }
  if (!fs.existsSync('functions/node_modules/@scan/efp-model')) {
    console.error('Functions @scan/efp-model dependency is not installed from the prepared vendor artifact.');
    console.error('Run: npm run prepare:functions-artifact && npm ci --prefix functions');
    process.exit(1);
  }
}

function runGit(cmd) {
  try {
    return output(cmd);
  } catch (e) {
    console.error(`\n❌ Git is unavailable or corrupt!`);
    console.error(`Failed Git operation: ${cmd}`);
    console.error(`Essential error: ${e.message}`);
    console.error(`Supported remediation: Please ensure Git is installed, the repository is not corrupt, and you are running within a valid Git working directory. If corruption persists, delete corrupt objects or clone/fetch a fresh repository state.`);
    process.exit(1);
  }
}

let files = [];
let baseRef = null;

if (process.env.VERIFY_FAST_BASE_REF) {
  baseRef = resolveBaseRef();
}

const workingTreeFiles = new Set([
  ...runGit('git diff --name-only HEAD').split('\n').filter(Boolean),
  ...runGit('git diff --name-only --cached').split('\n').filter(Boolean),
  ...runGit('git ls-files --others --exclude-standard').split('\n').filter(Boolean)
]);

if (baseRef) {
  const diffFiles = runGit(`git diff --name-only ${baseRef}...HEAD || git diff --name-only ${baseRef}`).split('\n').filter(Boolean);
  files = Array.from(new Set([...workingTreeFiles, ...diffFiles]));
} else {
  files = [...workingTreeFiles];
  if (files.length === 0) {
    baseRef = resolveBaseRef();
    if (!baseRef) {
      console.error('❌ Base revision resolution failed! Could not resolve any valid base git reference, and no working tree changes exist.');
      process.exit(1);
    }
    files = runGit(`git diff --name-only ${baseRef}...HEAD || git diff --name-only ${baseRef}`).split('\n').filter(Boolean);
  }
}

console.log(`verify:fast base: ${baseRef ?? 'working tree'}`);
console.log(`Changed files: ${files.length ? files.join(', ') : '(none)'}`);

const commands = buildVerificationPlan(files);
for (const cmd of commands) sh(cmd);
console.log('\n✅ verify:fast completed selected checks.');
