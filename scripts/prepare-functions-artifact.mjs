import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}
function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (err) { fail(`Failed to read JSON ${filePath}: ${err.message}`); }
}
function requireString(value, label) {
  if (!value || typeof value !== 'string') fail(`Missing required profile value: ${label}`);
  return value;
}
function assertContractActive(registry, contractId, version) {
  const entry = registry.contracts?.find(c => c.contractId === contractId && c.version === version);
  if (!entry) fail(`Registry missing ${contractId}@${version}`);
  if (entry.status !== 'active') fail(`Registry entry ${contractId}@${version} must be active, got ${entry.status}`);
}
function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) fail(`Command failed: ${command} ${args.join(' ')}`);
}

const profilePath = path.join(rootDir, 'contracts', 'profiles', 'current-application.json');
const profile = readJson(profilePath);
const contracts = profile.contracts;
if (!contracts || typeof contracts !== 'object') fail('current-application profile is missing contracts map');
const callableApiVersion = requireString(contracts['callable-functions-api'], 'contracts["callable-functions-api"]');
const efpModelVersion = requireString(contracts['efp-model'], 'contracts["efp-model"]');
const applicationVersion = requireString(profile.applicationVersion, 'applicationVersion');
const registry = readJson(path.join(rootDir, 'contracts', 'registry.json'));
assertContractActive(registry, 'callable-functions-api', callableApiVersion);
assertContractActive(registry, 'efp-model', efpModelVersion);

const activeVersionJson = readJson(path.join(rootDir, 'contracts', 'packages', 'callable-functions-api', 'active-version.json'));
if ((activeVersionJson.version || activeVersionJson.activeVersion) !== callableApiVersion || activeVersionJson.activeVersion !== callableApiVersion) {
  fail(`active-version.json does not match profile Callable API ${callableApiVersion}`);
}

const packageDir = path.join(rootDir, 'packages', 'efp-model');
const vendorDir = path.join(rootDir, 'functions', 'vendor', 'efp-model');
const vendorContractsRoot = path.join(rootDir, 'functions', 'vendor', 'contracts');
const srcCallableApiVersionDir = path.join(rootDir, 'contracts', 'packages', 'callable-functions-api', callableApiVersion);
const srcEfpModelDir = path.join(rootDir, 'contracts', 'packages', 'efp-model', efpModelVersion);
if (!fs.existsSync(srcCallableApiVersionDir)) fail(`Missing Callable API source directory: ${srcCallableApiVersionDir}`);
if (!fs.existsSync(srcEfpModelDir)) fail(`Missing EFP model source directory: ${srcEfpModelDir}`);

console.log('Building @scan/efp-model...');
runCommand('npm', ['run', 'build'], packageDir);
console.log('Validating @scan/efp-model artifact...');
runCommand('npm', ['run', 'test:artifact'], packageDir);
const distDir = path.join(packageDir, 'dist');
if (!fs.existsSync(distDir)) fail('Missing packages/efp-model/dist after build.');

console.log('Preparing functions/vendor/efp-model...');
fs.rmSync(vendorDir, { recursive: true, force: true });
fs.mkdirSync(vendorDir, { recursive: true });
fs.cpSync(path.join(packageDir, 'package.json'), path.join(vendorDir, 'package.json'));
fs.cpSync(path.join(packageDir, 'README.md'), path.join(vendorDir, 'README.md'));
fs.cpSync(distDir, path.join(vendorDir, 'dist'), { recursive: true });

console.log('Preparing functions/vendor/contracts...');
fs.rmSync(vendorContractsRoot, { recursive: true, force: true });
fs.mkdirSync(vendorContractsRoot, { recursive: true });
const callableApiDir = path.join(vendorContractsRoot, 'callable-functions-api');
fs.mkdirSync(callableApiDir, { recursive: true });
fs.cpSync(path.join(rootDir, 'contracts', 'packages', 'callable-functions-api', 'active-version.json'), path.join(callableApiDir, 'active-version.json'));
fs.cpSync(srcCallableApiVersionDir, path.join(callableApiDir, callableApiVersion), { recursive: true });
const efpModelDir = path.join(vendorContractsRoot, 'efp-model');
fs.mkdirSync(efpModelDir, { recursive: true });
fs.cpSync(srcEfpModelDir, path.join(efpModelDir, efpModelVersion), { recursive: true });
const runtimeProfile = { applicationVersion, callableApiVersion, efpModelVersion };
const runtimeProfilePath = path.join(vendorContractsRoot, 'runtime-profile.json');
fs.writeFileSync(runtimeProfilePath, JSON.stringify(runtimeProfile, null, 2));
const written = readJson(runtimeProfilePath);
for (const [key, expected] of Object.entries(runtimeProfile)) if (written[key] !== expected) fail(`runtime-profile ${key} drift: ${written[key]} !== ${expected}`);
console.log('✅ Prepared functions/vendor dependencies and schemas successfully.');
