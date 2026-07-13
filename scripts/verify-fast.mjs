import { execSync, spawnSync } from 'node:child_process';

function sh(cmd) {
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

const commands = new Set();
const add = (cmd) => commands.add(cmd);

if (files.length === 0) add('npm run test:documentation-state');

for (const file of files) {
  if (/^(README\.md|AGENTS\.md|\.agents\/|docs\/|.*\.md$)/.test(file)) add('npm run test:documentation-state');
  if (/^(src\/components\/|src\/lib\/|src\/App|src\/main|src\/routing\/)/.test(file)) {
    add('npm run lint');
    add('npm run test');
    add('npm run build');
  }
  if (/^(src\/routing\/|src\/lib\/routeCatalog\.ts$)/.test(file)) {
    add('npm run test:routing');
    add('npm run test:routing-boundary');
    add('npm run lint');
  }
  if (/^functions\/src\//.test(file) || /^functions\/test\//.test(file)) {
    add('npm run prepare:functions-artifact');
    add('npm ci --prefix functions');
    add('npm --prefix functions run build');
    add('npm run test:functions');
  }
  if (/^functions\/(package(-lock)?\.json|vendor\/|deploy-allowlist|\.npmignore)/.test(file) || /^scripts\/(prepare-functions-artifact|test-functions-artifact)/.test(file)) {
    add('npm run prepare:functions-artifact');
    add('npm run test:functions-artifact');
    add('npm run test:functions-artifact:isolation');
  }
  if (/^packages\/efp-model\//.test(file)) {
    add('npm --prefix packages/efp-model run typecheck');
    add('npm --prefix packages/efp-model run test');
    add('npm --prefix packages/efp-model run build');
  }
  if (/^contracts\//.test(file)) {
    add('npm --prefix packages/efp-model run build');
    add('npm run contracts:validate');
    add('npm run contracts:check-generated');
  }
  if (file === 'firestore.rules') add('npm run test:firestore-policy');
  if (/^scripts\/(validate-documentation-state|verify-version|verify-fast)\.mjs$/.test(file) || file === 'package.json') {
    add('npm run test:documentation-state');
    add('npm run version:verify');
  }
}

if (commands.size === 0) {
  add('npm run test:documentation-state');
}

for (const cmd of commands) sh(cmd);
console.log('\n✅ verify:fast completed selected checks.');
