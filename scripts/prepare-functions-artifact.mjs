import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const profilePath = path.join(rootDir, 'contracts', 'profiles', 'current-application.json');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const callableApiVersion = profile.contracts['callable-functions-api'] || '1.1.7';
const efpModelVersion = profile.contracts['efp-model'] || '3.0.0';
const applicationVersion = profile.applicationVersion || '2.0.18';

const packageDir = path.join(rootDir, 'packages', 'efp-model');
const vendorDir = path.join(rootDir, 'functions', 'vendor', 'efp-model');
const vendorContractsRoot = path.join(rootDir, 'functions', 'vendor', 'contracts');

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`❌ Command failed: ${command} ${args.join(' ')}`);
    process.exit(1);
  }
}

console.log('Building @scan/efp-model...');
runCommand('npm', ['run', 'build'], packageDir);

console.log('Validating @scan/efp-model artifact...');
runCommand('npm', ['run', 'test:artifact'], packageDir);

const distDir = path.join(packageDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.error(`❌ Missing packages/efp-model/dist after build.`);
  process.exit(1);
}

console.log('Preparing functions/vendor/efp-model...');
if (fs.existsSync(vendorDir)) {
  fs.rmSync(vendorDir, { recursive: true, force: true });
}
fs.mkdirSync(vendorDir, { recursive: true });
fs.cpSync(path.join(packageDir, 'package.json'), path.join(vendorDir, 'package.json'));
fs.cpSync(path.join(packageDir, 'README.md'), path.join(vendorDir, 'README.md'));
fs.cpSync(distDir, path.join(vendorDir, 'dist'), { recursive: true });

console.log('Preparing functions/vendor/contracts...');
if (fs.existsSync(vendorContractsRoot)) {
  fs.rmSync(vendorContractsRoot, { recursive: true, force: true });
}
fs.mkdirSync(vendorContractsRoot, { recursive: true });

// Copy callable-functions-api active-version.json and schema
const callableApiDir = path.join(vendorContractsRoot, 'callable-functions-api');
fs.mkdirSync(callableApiDir, { recursive: true });
const srcCallableApiVersionJson = path.join(rootDir, 'contracts', 'packages', 'callable-functions-api', 'active-version.json');
fs.cpSync(srcCallableApiVersionJson, path.join(callableApiDir, 'active-version.json'));
const srcCallableApiVersionDir = path.join(rootDir, 'contracts', 'packages', 'callable-functions-api', callableApiVersion);
fs.cpSync(srcCallableApiVersionDir, path.join(callableApiDir, callableApiVersion), { recursive: true });

// Copy efp-model schemas
const efpModelDir = path.join(vendorContractsRoot, 'efp-model');
fs.mkdirSync(efpModelDir, { recursive: true });
const srcEfpModelDir = path.join(rootDir, 'contracts', 'packages', 'efp-model', efpModelVersion);
fs.cpSync(srcEfpModelDir, path.join(efpModelDir, efpModelVersion), { recursive: true });

// Write runtime-profile.json
const runtimeProfilePath = path.join(vendorContractsRoot, 'runtime-profile.json');
fs.writeFileSync(runtimeProfilePath, JSON.stringify({
  applicationVersion,
  callableApiVersion,
  efpModelVersion
}, null, 2));

console.log('✅ Prepared functions/vendor dependencies and schemas successfully.');
