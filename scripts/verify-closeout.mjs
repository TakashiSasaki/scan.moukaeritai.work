import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚧 Running Stride Closeout Verification Gate...');

function fail(msg) {
  console.error(`❌ Closeout Gate Failed: ${msg}`);
  process.exit(1);
}

// 1. Run full node baseline verification
console.log('🔹 Running release verification (verify:release)...');
try {
  execSync('npm run verify:release', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Node-only baseline passed successfully!');
} catch (e) {
  fail('release verification failed.');
}

// 2. Git diff check (whitespace issues or conflict markers)
console.log('🔹 Running git diff --check for layout issues or conflict markers...');
try {
  execSync('git diff --check', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ No whitespace or conflict marker issues found!');
} catch (e) {
  fail('git diff --check found issues.');
}

// 3. Untracked files check
console.log('🔹 Verification of untracked files...');
try {
  const porcelain = execSync('git status --porcelain', { encoding: 'utf8', cwd: rootDir });
  const lines = porcelain.split('\n').map(l => l.trim()).filter(Boolean);
  const untracked = lines.filter(l => l.startsWith('??'));
  
  if (untracked.length > 0) {
    console.error('❌ Untracked files of unknown usage detected:');
    untracked.forEach(u => console.error(`   - ${u.substring(3)}`));
    fail('All untracked files must be removed, git-ignored, or tracked before closeout.');
  } else {
    console.log('✅ No untracked files found!');
  }
} catch (e) {
  fail(`Failed to verify untracked files: ${e.message}`);
}

console.log('🎉 Stride Closeout Verification Completed Successfully!');
console.log('📝 Node-only gates implemented and passing locally');
console.log('⚠️ GitHub Actions confirmation unavailable (verification is local-only)');
process.exit(0);
