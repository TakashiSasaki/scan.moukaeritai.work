import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const functionsSrcDir = path.join(rootDir, 'functions', 'src');
const functionsDir = path.join(rootDir, 'functions');

const IMPORT_REGEX = /(?:import|export)\s+(?:[^"']+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)/g;

let hasError = false;

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let match;

  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    const specifier = match[1] || match[2] || match[3];

    // Check only relative imports/exports
    if (specifier && specifier.startsWith('.')) {
      const fileDir = path.dirname(filePath);
      const resolvedPath = path.resolve(fileDir, specifier);

      if (!resolvedPath.startsWith(functionsDir)) {
        console.error(`Boundary Violation in ${path.relative(rootDir, filePath)}`);
        console.error(`  Specifier: "${specifier}"`);
        console.error(`  Resolved : ${resolvedPath}`);
        console.error(`  Error    : functions/src must not import files outside functions/`);
        console.error('');
        hasError = true;
      }
    }
  }
}

console.log(`Scanning ${path.relative(rootDir, functionsSrcDir)} for boundary violations...`);
scanDirectory(functionsSrcDir);

if (hasError) {
  console.error('Validation failed: Boundary violations found.');
  process.exit(1);
} else {
  console.log('Validation passed: No boundary violations found.');
}
