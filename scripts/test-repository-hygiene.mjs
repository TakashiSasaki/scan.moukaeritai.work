import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_ROOT_FILES = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'vitest.config.ts',
  'vitest.rules.config.ts',
  '.gitignore',
  '.git',
  '.env.example',
  '.firebaserc',
  'firebase.json',
  'firebase-blueprint.json',
  'firebase-applet-config.json',
  'firestore.rules',
  'firestore.indexes.json',
  'index.html',
  'metadata.json',
  'AGENTS.md',
  'README.md'
]);

const ALLOWED_ROOT_DIRS = new Set([
  '.agents',
  '.git',
  '.github',
  '.Jules',
  '.local-data',
  'assets',
  'contracts',
  'docs',
  'dist',
  'functions',
  'packages',
  'public',
  'scripts',
  'src',
  'tests',
  'node_modules'
]);

// Content checks
const FORBIDDEN_CONTENT_PATTERNS = [
  {
    name: 'git config --global',
    regex: /git\s+config\s+--global/i
  },
  {
    name: 'git add .',
    regex: /git\s+add\s+\./i
  },
  {
    name: 'hard-coded commit command',
    regex: /git\s+commit\s+(-m|--message)/i
  },
  {
    name: 'source file ad-hoc regex patch',
    // Matches scripts that read a file, do a regex/string replacement, and write it back
    check: (content, filePath) => {
      // Only apply to scripts, not tests or the hygiene script itself
      const isScript = filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.ts');
      const filename = path.basename(filePath);
      const isTestOrHygiene = filename.includes('test') || filename.includes('hygiene') || filename.includes('fixture');
      if (isScript && !isTestOrHygiene) {
        const hasRead = content.includes('readFileSync');
        const hasWrite = content.includes('writeFileSync');
        const hasReplace = content.includes('.replace(');
        if (hasRead && hasWrite && hasReplace) {
          return true;
        }
      }
      return false;
    }
  }
];

function checkHygiene(dir, isSelfTest = false, selfTestRoot = null) {
  const violations = [];
  const files = fs.readdirSync(dir);
  for (const inactive of ['pnpm-lock.yaml','yarn.lock','bun.lock','bun.lockb']) {
    if (files.includes(inactive)) violations.push(`Inactive package manager lockfile is forbidden: "${inactive}"`);
  }
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.packageManager && !String(packageJson.packageManager).startsWith('npm@')) {
        violations.push(`Non-npm packageManager declaration is forbidden: ${packageJson.packageManager}`);
      }
    } catch (error) {
      violations.push(`Unable to parse package.json for packageManager policy: ${error.message}`);
    }
  }

  // 1. Root level checks
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const isDir = fs.statSync(fullPath).isDirectory();

    if (isDir) {
      if (!ALLOWED_ROOT_DIRS.has(file)) {
        violations.push(`Forbidden root directory: "${file}"`);
      }
    } else {
      if (!ALLOWED_ROOT_FILES.has(file)) {
        violations.push(`Forbidden root file: "${file}"`);
      }
    }
  }

  // 2. Recursive content scanning
  const scanContent = (currentDir) => {
    const list = fs.readdirSync(currentDir);
    for (const item of list) {
      const fullPath = path.join(currentDir, item);
      const relativePath = path.relative(isSelfTest ? selfTestRoot : dir, fullPath);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip ignored directories
        if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'lib' || item === 'vendor') {
          continue;
        }
        scanContent(fullPath);
      } else {
        // Skip test, hygiene, fixture, and EFP compilation files from content checks
        const lowercasePath = fullPath.toLowerCase();
        const filename = path.basename(fullPath).toLowerCase();
        
        const shouldSkipContentCheck = (
          filename.includes('test') ||
          filename.includes('hygiene') ||
          filename.includes('fixture') ||
          filename.includes('vitest') ||
          lowercasePath.includes('export-legacy-data') ||
          lowercasePath.includes('packages/efp-model/scripts')
        );

        if (shouldSkipContentCheck && (!isSelfTest || filename.includes('test') || filename.includes('hygiene'))) {
          continue;
        }

        // Skip standard non-script/non-source formats to speed up and prevent binary false positives
        const ext = path.extname(item);
        if (!['.sh', '.js', '.cjs', '.mjs', '.ts', '.tsx', '.json', '.yml', '.yaml'].includes(ext)) {
          continue;
        }
        // Skip lock files
        if (item === 'package-lock.json') {
          continue;
        }

        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of FORBIDDEN_CONTENT_PATTERNS) {
          if (pattern.regex && pattern.regex.test(content)) {
            violations.push(`Prohibited content ("${pattern.name}") in file: "${relativePath}"`);
          } else if (pattern.check && pattern.check(content, fullPath)) {
            violations.push(`Prohibited content ("${pattern.name}") in file: "${relativePath}"`);
          }
        }
      }
    }
  };

  scanContent(dir);
  return violations;
}

// Self-test implementation
function runSelfTest() {
  console.log("🧪 Running Hygiene Self-Test Suite...");
  const tempDir = fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(fileURLToPath(import.meta.url))), 'hygiene-test-'));

  try {
    const createStructure = (filesAndDirs) => {
      for (const [name, content] of Object.entries(filesAndDirs)) {
        const fullPath = path.join(tempDir, name);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content || '');
      }
    };

    // Case 1: Pristine state (should pass)
    createStructure({
      'package.json': '{}',
      'README.md': '# Welcome',
      'src/App.tsx': 'console.log("hello");',
      'scripts/valid.mjs': 'console.log("all good");'
    });

    let violations = checkHygiene(tempDir, true, tempDir);
    if (violations.length > 0) {
      throw new Error(`Self-test Scenario 1 (Clean tree) failed. Got violations: ${JSON.stringify(violations)}`);
    }

    // Case 2: Prohibited file in root (should fail)
    fs.writeFileSync(path.join(tempDir, 'test.tmp'), '');
    violations = checkHygiene(tempDir, true, tempDir);
    if (!violations.some(v => v.includes('Forbidden root file') && v.includes('test.tmp'))) {
      throw new Error('Self-test Scenario 2 (Forbidden root file) failed to catch test.tmp');
    }
    fs.unlinkSync(path.join(tempDir, 'test.tmp'));

    // Case 3: Prohibited directory in root (should fail)
    fs.mkdirSync(path.join(tempDir, 'temp_folder'));
    violations = checkHygiene(tempDir, true, tempDir);
    if (!violations.some(v => v.includes('Forbidden root directory') && v.includes('temp_folder'))) {
      throw new Error('Self-test Scenario 3 (Forbidden root folder) failed to catch temp_folder');
    }
    fs.rmdirSync(path.join(tempDir, 'temp_folder'));

    // Case 4: Prohibited content: git add . (should fail)
    fs.writeFileSync(path.join(tempDir, 'scripts/bad-git-add.sh'), 'git add .');
    violations = checkHygiene(tempDir, true, tempDir);
    if (!violations.some(v => v.includes('git add .'))) {
      throw new Error('Self-test Scenario 4 (git add .) failed to catch bad shell code');
    }
    fs.unlinkSync(path.join(tempDir, 'scripts/bad-git-add.sh'));

    // Case 5: Prohibited content: git config --global (should fail)
    fs.writeFileSync(path.join(tempDir, 'scripts/bad-git-config.sh'), 'git config --global user.name "AI"');
    violations = checkHygiene(tempDir, true, tempDir);
    if (!violations.some(v => v.includes('git config --global'))) {
      throw new Error('Self-test Scenario 5 (git config --global) failed to catch bad shell code');
    }
    fs.unlinkSync(path.join(tempDir, 'scripts/bad-git-config.sh'));

    // Case 6: Prohibited content: ad-hoc regex patches on source (should fail)
    fs.writeFileSync(path.join(tempDir, 'scripts/regex-patch.js'), 'const code = fs.readFileSync("src/App.tsx", "utf8"); const newCode = code.replace(/hello/, "world"); fs.writeFileSync("src/App.tsx", newCode);');
    violations = checkHygiene(tempDir, true, tempDir);
    if (!violations.some(v => v.includes('source file ad-hoc regex patch'))) {
      throw new Error('Self-test Scenario 6 (ad-hoc regex patch) failed to catch code rewriting logic');
    }
    fs.unlinkSync(path.join(tempDir, 'scripts/regex-patch.js'));

    for (const lock of ['pnpm-lock.yaml','yarn.lock','bun.lock','bun.lockb']) {
      fs.writeFileSync(path.join(tempDir, lock), 'forbidden');
      violations = checkHygiene(tempDir, true, tempDir);
      if (!violations.some(v => v.includes('Inactive package manager lockfile') && v.includes(lock))) {
        throw new Error(`Self-test inactive lockfile failed to catch ${lock}`);
      }
      fs.unlinkSync(path.join(tempDir, lock));
    }
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.0.0' }));
    violations = checkHygiene(tempDir, true, tempDir);
    if (!violations.some(v => v.includes('Non-npm packageManager'))) {
      throw new Error('Self-test non-npm packageManager failed');
    }

    console.log("🟢 All Hygiene Self-Test Scenarios Passed Perfectly!");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Check arguments
if (process.argv.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

// Normal run
const rootDir = process.cwd();
console.log(`Running repository hygiene check on root: "${rootDir}"`);
const violations = checkHygiene(rootDir);

if (violations.length > 0) {
  console.error("❌ Repository hygiene check failed. Prohibited files or content patterns found:");
  violations.forEach(v => console.error(` - ${v}`));
  process.exit(1);
}

console.log("✅ Repository hygiene check passed successfully!");
process.exit(0);
