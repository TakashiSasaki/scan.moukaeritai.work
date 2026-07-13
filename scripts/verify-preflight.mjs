import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🏁 Running Stride Preflight Verification Gate...');

function fail(msg) {
  console.error(`❌ Preflight Gate Failed: ${msg}`);
  process.exit(1);
}

// 1. Manifest Integrity Check
console.log('🔹 Validating skill manifest integrity...');
try {
  execSync('npm run test:agent-skills', { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  fail('Skill manifest validation failed.');
}

// 2. Version Static Consistency
console.log('🔹 Validating static version consistency...');
try {
  execSync('npm run version:verify:static', { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  fail('Static version consistency check failed.');
}

// 3. Active Contract Uniqueness & Profile Resolution
console.log('🔹 Resolving current contract profile...');
try {
  const profilePath = path.join(rootDir, 'contracts/profiles/current-application.json');
  if (!fs.existsSync(profilePath)) {
    fail('Current application profile does not exist.');
  }
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  console.log(`Resolved Profile Version: ${profile.applicationVersion}`);
  
  for (const [pkg, ver] of Object.entries(profile.contracts)) {
    const pkgPath = path.join(rootDir, 'contracts/packages', pkg, ver);
    if (!fs.existsSync(pkgPath)) {
      fail(`Contract package "${pkg}" version "${ver}" specified in profile cannot be resolved at "${pkgPath}"`);
    }
  }
  console.log('✅ All contract packages successfully resolved!');
  
  // Ensure generated EFP model artifact exists after fresh npm ci; dist is gitignored.
  const validatorArtifact = path.join(rootDir, 'packages/efp-model/dist/esm/validators/association-validator.js');
  if (!fs.existsSync(validatorArtifact)) {
    console.log('🔹 Building @scan/efp-model for contract validation artifact...');
    execSync('npm --prefix packages/efp-model run build', { stdio: 'inherit', cwd: rootDir });
  }

  // Also run comprehensive contract registry validation
  console.log('🔹 Executing contracts validation test suite...');
  execSync('npm run contracts:validate', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Contracts validation completed successfully!');
} catch (e) {
  fail(`Contract profile or validation check failed: ${e.message}`);
}

// 4. Branch & HEAD display
console.log('🔹 Repository Info:');
try {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  if (!branch) {
    fail('Git branch is empty.');
  }
  if (!commit) {
    fail('Git HEAD commit is empty.');
  }
  console.log(`   Branch: ${branch}`);
  console.log(`   HEAD Commit: ${commit}`);
} catch (e) {
  fail(`Could not retrieve git branch/HEAD info: ${e.message}`);
}

// 5. Working Tree Status & Dirty check
console.log('🔹 Checking working tree status...');
try {
  const status = execSync('git status --short', { encoding: 'utf8' }).trim();
  if (status) {
    console.log('⚠️ Working tree is DIRTY:');
    console.log(status);
    fail('Working tree is dirty. Preflight checks require a completely clean workspace to start a new stride safely.');
  } else {
    console.log('✅ Working tree is clean!');
  }
} catch (e) {
  fail(`Failed to execute git status: ${e.message}`);
}

console.log('🎉 Stride Preflight Checks Passed Successfully! Ready for modifications.');
process.exit(0);
