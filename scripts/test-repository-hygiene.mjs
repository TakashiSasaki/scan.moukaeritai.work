import fs from 'fs';
import path from 'path';

console.log("Running repository hygiene check...");

const rootDir = process.cwd();
const files = fs.readdirSync(rootDir);

const violations = [];

const isViolation = (file) => {
  if (file.startsWith('fix_') && file.endsWith('.py')) return true;
  if (file.startsWith('update_') && file.endsWith('.py')) return true;
  if (file.startsWith('patch') && file.endsWith('.cjs')) return true;
  if (file === 'run_all.sh') return true;
  if (file.includes('reply_payload') || file.includes('scratch.json')) return true;
  return false;
};

for (const file of files) {
  if (isViolation(file)) {
    violations.push(file);
  }
}

if (violations.length > 0) {
  console.error("Repository hygiene check failed. Found temporary or one-off files in the root directory:");
  violations.forEach(v => console.error(" - " + v));
  process.exit(1);
}

console.log("Repository hygiene check passed.");
