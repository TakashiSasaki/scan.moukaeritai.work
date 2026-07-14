import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const profilePath = path.join(rootDir, 'contracts', 'profiles', 'current-application.json');
const registryPath = path.join(rootDir, 'contracts', 'registry.json');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));




function requiredString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Missing required ${label} in current application profile.`);
  return value;
}
function requireActiveContract(contractId, version) {
  const entry = registry.contracts.find((c) => c.contractId === contractId && c.version === version);
  if (!entry) throw new Error(`Registry entry not found for ${contractId}@${version}.`);
  if (entry.status !== 'active') throw new Error(`Registry entry ${contractId}@${version} must be active, got ${entry.status}.`);
  return entry;
}

const applicationVersion = requiredString(profile.applicationVersion, 'applicationVersion');
const callableApiVersion = requiredString(profile.contracts?.['callable-functions-api'], 'contracts["callable-functions-api"]');
const efpModelVersion = requiredString(profile.contracts?.['efp-model'], 'contracts["efp-model"]');
requireActiveContract('callable-functions-api', callableApiVersion);
requireActiveContract('efp-model', efpModelVersion);

function requiredString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Missing required ${label} in current application profile.`);
  return value;
}
function requireActiveContract(contractId, version) {
  const entry = registry.contracts.find((c) => c.contractId === contractId && c.version === version);
  if (!entry) throw new Error(`Registry entry not found for ${contractId}@${version}.`);
  if (entry.status !== 'active') throw new Error(`Registry entry ${contractId}@${version} must be active, got ${entry.status}.`);
  return entry;
}

const applicationVersion = requiredString(profile.applicationVersion, 'applicationVersion');
const callableApiVersion = requiredString(profile.contracts?.['callable-functions-api'], 'contracts["callable-functions-api"]');
const efpModelVersion = requiredString(profile.contracts?.['efp-model'], 'contracts["efp-model"]');
requireActiveContract('callable-functions-api', callableApiVersion);
requireActiveContract('efp-model', efpModelVersion);

const packageDir = path.join(rootDir, 'packages', 'efp-model');
const vendorDir = path.join(rootDir, 'functions', 'vendor', 'efp-model');
const vendorContractsRoot = path.join(rootDir, 'functions', 'vendor', 'contracts');
function runCommand(command, args, cwd) { const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true }); if (result.status !== 0) process.exit(result.status ?? 1); }
console.log('Building @scan/efp-model...'); runCommand('npm', ['run', 'build'], packageDir);
console.log('Validating @scan/efp-model artifact...'); runCommand('npm', ['run', 'test:artifact'], packageDir);
const distDir = path.join(packageDir, 'dist'); if (!fs.existsSync(distDir)) throw new Error('Missing packages/efp-model/dist after build.');
if (fs.existsSync(vendorDir)) fs.rmSync(vendorDir, { recursive: true, force: true }); fs.mkdirSync(vendorDir, { recursive: true });
fs.cpSync(path.join(packageDir, 'package.json'), path.join(vendorDir, 'package.json')); fs.cpSync(path.join(packageDir, 'README.md'), path.join(vendorDir, 'README.md')); fs.cpSync(distDir, path.join(vendorDir, 'dist'), { recursive: true });
if (fs.existsSync(vendorContractsRoot)) fs.rmSync(vendorContractsRoot, { recursive: true, force: true }); fs.mkdirSync(vendorContractsRoot, { recursive: true });
const callableApiDir = path.join(vendorContractsRoot, 'callable-functions-api'); fs.mkdirSync(callableApiDir, { recursive: true });
const srcCallableApiVersionJson = path.join(rootDir, 'contracts', 'packages', 'callable-functions-api', 'active-version.json');
const activeVersion = JSON.parse(fs.readFileSync(srcCallableApiVersionJson, 'utf8'));
if ((activeVersion.version || activeVersion.activeVersion) !== callableApiVersion || activeVersion.activeVersion !== callableApiVersion) throw new Error('Callable active-version.json does not match current profile.');
fs.cpSync(srcCallableApiVersionJson, path.join(callableApiDir, 'active-version.json'));
const srcCallableApiVersionDir = path.join(rootDir, 'contracts', 'packages', 'callable-functions-api', callableApiVersion); if (!fs.existsSync(srcCallableApiVersionDir)) throw new Error(`Missing callable contract source directory: ${srcCallableApiVersionDir}`);
fs.cpSync(srcCallableApiVersionDir, path.join(callableApiDir, callableApiVersion), { recursive: true });
const efpModelDir = path.join(vendorContractsRoot, 'efp-model'); fs.mkdirSync(efpModelDir, { recursive: true });
const srcEfpModelDir = path.join(rootDir, 'contracts', 'packages', 'efp-model', efpModelVersion); if (!fs.existsSync(srcEfpModelDir)) throw new Error(`Missing EFP model source directory: ${srcEfpModelDir}`);
fs.cpSync(srcEfpModelDir, path.join(efpModelDir, efpModelVersion), { recursive: true });
const runtimeProfile = { applicationVersion, callableApiVersion, efpModelVersion };
fs.writeFileSync(path.join(vendorContractsRoot, 'runtime-profile.json'), JSON.stringify(runtimeProfile, null, 2) + '\n');
const writtenProfile = JSON.parse(fs.readFileSync(path.join(vendorContractsRoot, 'runtime-profile.json'), 'utf8'));
for (const key of Object.keys(runtimeProfile)) if (writtenProfile[key] !== runtimeProfile[key]) throw new Error(`runtime-profile mismatch for ${key}.`);
console.log('✅ Prepared functions/vendor dependencies and schemas successfully.');
