import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const distDir = path.join(packageRoot, 'dist');

// 1. Remove dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Helper to run commands
function runCommand(command, args) {
  const result = spawnSync(command, args, { cwd: packageRoot, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`Command failed: ${command} ${args.join(' ')}`);
    process.exit(1);
  }
}

// 2. Run TypeScript build for ESM output
console.log('Building ESM output...');
runCommand('npx', ['tsc', '-p', 'tsconfig.esm.json']);

// 3. Run TypeScript build for CJS output
console.log('Building CJS output...');
runCommand('npx', ['tsc', '-p', 'tsconfig.cjs.json']);

// 4. Emit declaration files once
console.log('Building type declarations...');
runCommand('npx', ['tsc', '-p', 'tsconfig.types.json']);

// 5. Write dist/cjs/package.json
const cjsPackageJsonPath = path.join(distDir, 'cjs', 'package.json');
fs.writeFileSync(cjsPackageJsonPath, JSON.stringify({ type: "commonjs" }, null, 2));
console.log('Wrote dist/cjs/package.json');

console.log('Build completed successfully.');
