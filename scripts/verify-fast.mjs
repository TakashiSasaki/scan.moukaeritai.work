import fs from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';

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
  const candidates = [];
  if (process.env.VERIFY_FAST_BASE_REF) candidates.push(process.env.VERIFY_FAST_BASE_REF);
  if (process.env.GITHUB_BASE_REF) candidates.push(`origin/${process.env.GITHUB_BASE_REF}`);
  candidates.push('HEAD~1');
  for (const ref of candidates) {
    try { output(`git rev-parse --verify ${ref}^{commit}`); return ref; } catch {}
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

const workingTreeFiles = new Set([
  ...output('git diff --name-only HEAD').split('\n').filter(Boolean),
  ...output('git diff --name-only --cached').split('\n').filter(Boolean),
  ...output('git ls-files --others --exclude-standard').split('\n').filter(Boolean)
]);
const baseRef = workingTreeFiles.size > 0 ? null : resolveBaseRef();
let files = [...workingTreeFiles];
if (files.length === 0 && baseRef) {
  files = output(`git diff --name-only ${baseRef}...HEAD || git diff --name-only ${baseRef}`).split('\n').filter(Boolean);
}

console.log(`verify:fast base: ${baseRef ?? 'working tree'}`);
console.log(`Changed files: ${files.length ? files.join(', ') : '(none)'}`);

const needs = {
  docs: files.length === 0,
  frontend: false,
  routing: false,
  functionsSource: false,
  functionsPackaging: false,
  efpBuild: false,
  efpTypecheck: false,
  efpTest: false,
  contracts: false,
  firestorePolicy: false,
  versionStatic: false,
};

for (const file of files) {
  if (/^(README\.md|AGENTS\.md|\.agents\/|docs\/|.*\.md$)/.test(file)) needs.docs = true;
  if (/^(src\/components\/|src\/lib\/|src\/App|src\/main|src\/routing\/)/.test(file)) needs.frontend = true;
  if (/^(src\/routing\/|src\/lib\/routeCatalog\.ts$)/.test(file)) needs.routing = true;
  if (/^functions\/(src|test)\//.test(file)) needs.functionsSource = true;
  if (/^functions\/(package(-lock)?\.json|vendor\/|deploy-functions\.allowlist\.json|deploy-allowlist|\.npmignore)/.test(file) || /^scripts\/(prepare-functions-artifact|test-functions-artifact)/.test(file)) needs.functionsPackaging = true;
  if (/^packages\/efp-model\//.test(file)) {
    needs.efpBuild = true;
    needs.efpTypecheck = true;
    needs.efpTest = true;
  }
  if (/^contracts\//.test(file)) {
    needs.efpBuild = true;
    needs.contracts = true;
  }
  if (file === 'firestore.rules') needs.firestorePolicy = true;
  if (/^scripts\/(validate-documentation-state|verify-version|verify-fast)\.mjs$/.test(file) || file === 'package.json') {
    needs.docs = true;
    needs.versionStatic = true;
  }
}

const phases = [
  [], // 1 prerequisite package builds
  [], // 2 artifact preparation
  [], // 3 compilation
  [], // 4 unit tests
  [], // 5 artifact and boundary tests
  [], // 6 frontend checks
];
const add = (phase, cmd) => { if (!phases[phase].includes(cmd)) phases[phase].push(cmd); };

if (needs.efpBuild || needs.functionsPackaging || needs.contracts) add(0, 'npm --prefix packages/efp-model run build');
if (needs.efpTypecheck) add(0, 'npm --prefix packages/efp-model run typecheck');
if (needs.functionsPackaging) add(1, 'npm run prepare:functions-artifact');
if (needs.functionsSource || needs.functionsPackaging) {
  add(2, 'npm --prefix functions run build');
  add(3, 'npm run test:functions');
}
if (needs.efpTest) add(3, 'npm --prefix packages/efp-model run test');
if (needs.docs) add(4, 'npm run test:documentation-state');
if (needs.versionStatic) add(4, 'npm run version:verify');
if (needs.contracts) {
  add(4, 'npm run contracts:validate');
  add(4, 'npm run contracts:check-generated');
}
if (needs.firestorePolicy) add(4, 'npm run test:firestore-policy');
if (needs.functionsPackaging) {
  add(4, 'npm run test:functions-artifact');
  add(4, 'npm run test:functions-boundary');
  add(4, 'npm run test:functions-runtime-gate');
  add(4, 'npm run test:functions-artifact:isolation');
}
if (needs.routing) {
  add(5, 'npm run test:routing');
  add(5, 'npm run test:routing-boundary');
}
if (needs.frontend || needs.routing) {
  add(5, 'npm run lint');
  add(5, 'npm run test');
  add(5, 'npm run build');
}

const commands = phases.flat();
if (commands.length === 0) commands.push('npm run test:documentation-state');
for (const cmd of commands) sh(cmd);
console.log('\n✅ verify:fast completed selected checks.');
