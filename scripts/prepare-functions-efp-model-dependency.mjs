import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', 'efp-model');
const vendorDir = path.join(rootDir, 'functions', 'vendor', 'efp-model');

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

console.log('✅ Prepared functions/vendor/efp-model dependency successfully.');
