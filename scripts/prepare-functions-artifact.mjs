import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const profilePath = path.join(rootDir, 'contracts', 'profiles', 'current-application.json');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const activeVersion = profile.contracts['callable-functions-api'];

const packageDir = path.join(rootDir, 'packages', 'efp-model');
const vendorDir = path.join(rootDir, 'functions', 'vendor', 'efp-model');
const vendorContractsDir = path.join(rootDir, 'functions', 'vendor', 'contracts', 'callable-functions-api', activeVersion);

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

if (!fs.existsSync(path.join(vendorDir, 'package.json'))) {
  console.error(`❌ Failed to copy package.json to vendor dir.`);
  process.exit(1);
}
if (!fs.existsSync(path.join(vendorDir, 'dist'))) {
  console.error(`❌ Failed to copy dist to vendor dir.`);
  process.exit(1);
}

console.log(`Preparing functions/vendor/contracts/callable-functions-api/${activeVersion}...`);

const vendorContractsRoot = path.join(rootDir, 'functions', 'vendor', 'contracts');
if (fs.existsSync(vendorContractsRoot)) {
  fs.rmSync(vendorContractsRoot, { recursive: true, force: true });
}

fs.mkdirSync(vendorContractsDir, { recursive: true });

const srcContractsDir = path.join(rootDir, 'contracts', 'packages', 'callable-functions-api', activeVersion);
if (!fs.existsSync(srcContractsDir)) {
  console.error(`❌ Source contracts directory not found at: ${srcContractsDir}`);
  process.exit(1);
}
fs.cpSync(srcContractsDir, vendorContractsDir, { recursive: true });

if (!fs.existsSync(path.join(vendorContractsDir, 'submit-fact-command-request.schema.json'))) {
  console.error(`❌ Failed to copy contract schemas to vendor contracts dir.`);
  process.exit(1);
}

console.log('✅ Prepared functions/vendor/efp-model and contracts dependencies successfully.');

// Generate active-version.json for the runtime to use
const activeVersionPath = path.join(rootDir, 'functions', 'vendor', 'contracts', 'callable-functions-api', 'active-version.json');
fs.writeFileSync(activeVersionPath, JSON.stringify({ activeVersion }, null, 2));
console.log('✅ Wrote active-version.json');
