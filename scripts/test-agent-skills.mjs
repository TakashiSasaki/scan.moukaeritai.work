import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Running Agent Skill Integrity Gate...');

function fail(msg) {
  console.error(`❌ Skill Integrity Gate Failed: ${msg}`);
  process.exit(1);
}

// 1. Read package.json scripts to validate commands
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
} catch (e) {
  fail(`Failed to read root package.json: ${e.message}`);
}
const availableScripts = new Set(Object.keys(packageJson.scripts || {}));

// 2. Read manifest
const manifestPath = path.join(rootDir, '.agents/skills/manifest.json');
if (!fs.existsSync(manifestPath)) {
  fail(`manifest.json not found at ${manifestPath}`);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (e) {
  fail(`Failed to parse manifest.json: ${e.message}`);
}

if (!Array.isArray(manifest.skills)) {
  fail('manifest.json must contain a "skills" array.');
}

// 3. Required core skills list
const REQUIRED_CORE_SKILLS = [
  'repository-preflight',
  'version-governance',
  'contract-change',
  'functions-artifact-verification',
  'repository-hygiene',
  'documentation-reality-check',
  'stride-closeout',
  'run-local-tests'
];

const activeSkillsInManifest = new Map();
for (const entry of manifest.skills) {
  if (!entry.id || !entry.path || !entry.status) {
    fail(`Manifest entry missing required fields: ${JSON.stringify(entry)}`);
  }
  if (entry.status === 'active') {
    activeSkillsInManifest.set(entry.id, entry);
  }
}

// Check if all required core skills are present and active
for (const core of REQUIRED_CORE_SKILLS) {
  if (!activeSkillsInManifest.has(core)) {
    fail(`Required core skill "${core}" is missing or not active in manifest.json`);
  }
}

// 4. Check for legacy skills in active manifest
const FORBIDDEN_LEGACY_SKILLS = [
  'manage-efp-migration',
  'manage-scanner-dual-write'
];
for (const legacy of FORBIDDEN_LEGACY_SKILLS) {
  if (activeSkillsInManifest.has(legacy)) {
    fail(`Forbidden legacy skill "${legacy}" is marked as active in manifest.json`);
  }
}

// 5. Validate each active skill file and sections
const REQUIRED_SECTIONS = [
  'Purpose',
  'When to use',
  'Inputs',
  'Procedure',
  'Stop conditions',
  'Verification',
  'Related scripts',
  'Outputs'
];

for (const [skillId, skill] of activeSkillsInManifest.entries()) {
  const fullPath = path.join(rootDir, skill.path);
  if (!fs.existsSync(fullPath)) {
    fail(`SKILL.md for active skill "${skillId}" not found at "${fullPath}"`);
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  // Verify sections
  for (const section of REQUIRED_SECTIONS) {
    const headerPattern = new RegExp(`^#+\\s+${section}\\s*$`, 'im');
    if (!headerPattern.test(content)) {
      fail(`Skill "${skillId}" SKILL.md is missing required section header: "${section}"`);
    }
  }

  // Parse and validate npm commands in backticks
  const npmCmdPattern = /`npm\s+run\s+([a-zA-Z0-9:-]+)`/g;
  let match;
  while ((match = npmCmdPattern.exec(content)) !== null) {
    const cmd = match[1];
    if (!availableScripts.has(cmd)) {
      fail(`Skill "${skillId}" references non-existent npm script "${cmd}" in package.json`);
    }
  }
}

// 6. Check that AGENTS.md refers to the manifest
const agentsMdPath = path.join(rootDir, 'AGENTS.md');
if (!fs.existsSync(agentsMdPath)) {
  fail('AGENTS.md not found in workspace root.');
}
const agentsMdContent = fs.readFileSync(agentsMdPath, 'utf8');
if (!agentsMdContent.includes('.agents/skills/manifest.json')) {
  fail('AGENTS.md must reference the agent skill manifest (.agents/skills/manifest.json).');
}

console.log('✅ Agent Skill Integrity Gate Passed!');
process.exit(0);
