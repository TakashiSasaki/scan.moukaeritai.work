import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Running Enhanced Agent Skill Integrity Gate...');

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

// Helper to check prefix packages
const getPackageScripts = (prefixDir) => {
  try {
    const pkgPath = path.join(rootDir, prefixDir, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return new Set(Object.keys(pkg.scripts || {}));
  } catch (e) {
    return null;
  }
};

// 2. Read and Validate manifest
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

// Ensure unique IDs and paths
const ids = new Set();
const paths = new Set();
const allowedStatuses = new Set(['active', 'legacy', 'disabled']);
const activeSkillsInManifest = new Map();
const allSkillsInManifest = new Map();

for (const entry of manifest.skills) {
  // Validate presence and type of required fields
  if (!entry.id || typeof entry.id !== 'string') {
    fail(`Manifest entry missing or invalid field "id": ${JSON.stringify(entry)}`);
  }
  if (!entry.path || typeof entry.path !== 'string') {
    fail(`Manifest entry missing or invalid field "path": ${JSON.stringify(entry)}`);
  }
  if (!entry.status || typeof entry.status !== 'string') {
    fail(`Manifest entry missing or invalid field "status": ${JSON.stringify(entry)}`);
  }
  if (!entry.description || typeof entry.description !== 'string') {
    fail(`Manifest entry missing or invalid field "description": ${JSON.stringify(entry)}`);
  }
  if (!entry.requiredFor || !Array.isArray(entry.requiredFor) || entry.requiredFor.length === 0) {
    fail(`Manifest entry missing or empty array "requiredFor" for skill "${entry.id}"`);
  }

  if (entry.managedBy !== undefined) {
  if (typeof entry.managedBy !== 'string' || entry.managedBy.length === 0) {
    fail(`Manifest entry has invalid field "managedBy" for skill "${entry.id}"`);
  }
  const managerPath = path.join(rootDir, entry.managedBy);
  if (!fs.existsSync(managerPath)) {
    fail(`Skill "${entry.id}" references missing manager "${entry.managedBy}"`);
  }
}

  // Validate status
  if (!allowedStatuses.has(entry.status)) {
    fail(`Skill "${entry.id}" has invalid status "${entry.status}". Allowed values: active, legacy, disabled.`);
  }

  // Check unique constraints
  if (ids.has(entry.id)) {
    fail(`Duplicate skill id found in manifest: "${entry.id}"`);
  }
  ids.add(entry.id);

  if (paths.has(entry.path)) {
    fail(`Duplicate skill path found in manifest: "${entry.path}"`);
  }
  paths.add(entry.path);

  allSkillsInManifest.set(entry.id, entry);
  if (entry.status === 'active') {
    activeSkillsInManifest.set(entry.id, entry);
  }

  // Legacy skill check: legacy skill must not reside in active directory (.agents/skills)
  if (entry.status === 'legacy') {
    if (entry.path.startsWith('.agents/skills/')) {
      fail(`Legacy skill "${entry.id}" must not reside in the active directory ".agents/skills/". Path is: "${entry.path}"`);
    }
  }
}

// Required core skills list
const REQUIRED_CORE_SKILLS = [
  'repository-preflight',
  'validate-agent-policy',
  'version-governance',
  'contract-change',
  'functions-artifact-verification',
  'repository-hygiene',
  'documentation-reality-check',
  'stride-closeout',
  'run-local-tests'
];

// Check if all required core skills are present and active
for (const core of REQUIRED_CORE_SKILLS) {
  const entry = allSkillsInManifest.get(core);
  if (!entry) {
    fail(`Required core skill "${core}" is completely missing from manifest.json`);
  }
  if (entry.status !== 'active') {
    fail(`Required core skill "${core}" is not marked as active in manifest.json (status: "${entry.status}")`);
  }
}

// Detect any unregistered active-looking skill directories under .agents/skills/
const skillsDir = path.join(rootDir, '.agents/skills');
if (fs.existsSync(skillsDir)) {
  const dirs = fs.readdirSync(skillsDir).filter(f => {
    const p = path.join(skillsDir, f);
    return fs.statSync(p).isDirectory();
  });

  for (const d of dirs) {
    // Each directory under .agents/skills should have a matching entry in manifest.json
    const found = manifest.skills.some(s => s.path.startsWith(`.agents/skills/${d}/`));
    if (!found) {
      fail(`Unregistered active-looking skill directory found under .agents/skills: "${d}"`);
    }
  }
}

// 5. Validate each active skill file and command integrity
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

  if (skill.managedBy === '.agent-policy.yml') {
  const requiredMarkers = [
    'agent-policy-generated: true',
    `source-skill: ${skillId}`,
    'DO NOT EDIT DIRECTLY',
    `name: ${skillId}`
  ];
  for (const marker of requiredMarkers) {
    if (!content.includes(marker)) {
      fail(`Managed skill "${skillId}" is missing generated marker: "${marker}"`);
    }
  }
  continue;
}

  // Verify sections
  for (const section of REQUIRED_SECTIONS) {
    const headerPattern = new RegExp(`^#+\\s+${section}\\s*$`, 'im');
    if (!headerPattern.test(content)) {
      fail(`Skill "${skillId}" SKILL.md is missing required section header: "${section}"`);
    }
  }

  // Scan for inline code blocks (any text in backticks starting with node, npm, or npx)
  // Let's use a robust pattern that matches backtick commands: `cmd ...`
  const codeBlockPattern = /`([^`\n]+)`/g;
  let match;
  while ((match = codeBlockPattern.exec(content)) !== null) {
    const rawCmd = match[1].trim();
    
    // Check if it's an npm run, node execution, npm install, or npx execution
    if (rawCmd.startsWith('npm run ') || rawCmd.startsWith('npm --prefix') || rawCmd.startsWith('node ') || rawCmd.startsWith('npm ci') || rawCmd.startsWith('npx ')) {
      // Parse command structure
      // 1) npm run <script>
      if (/^npm\s+run\s+([a-zA-Z0-9:-]+)$/.test(rawCmd)) {
        const scriptName = rawCmd.match(/^npm\s+run\s+([a-zA-Z0-9:-]+)$/)[1];
        if (!availableScripts.has(scriptName)) {
          fail(`Skill "${skillId}" references non-existent npm script "${scriptName}" in root package.json: \`${rawCmd}\``);
        }
      }
      // 2) npm --prefix <dir> run <script>
      else if (/^npm\s+--prefix\s+(\S+)\s+run\s+([a-zA-Z0-9:-]+)$/.test(rawCmd)) {
        const parts = rawCmd.match(/^npm\s+--prefix\s+(\S+)\s+run\s+([a-zA-Z0-9:-]+)$/);
        const prefixDir = parts[1];
        const scriptName = parts[2];
        const prefixScripts = getPackageScripts(prefixDir);
        if (prefixScripts === null) {
          fail(`Skill "${skillId}" references non-existent package.json directory "${prefixDir}": \`${rawCmd}\``);
        }
        if (!prefixScripts.has(scriptName)) {
          fail(`Skill "${skillId}" references non-existent script "${scriptName}" in "${prefixDir}/package.json": \`${rawCmd}\``);
        }
      }
      // 3) npm ci --prefix <dir>
      else if (/^npm\s+ci\s+--prefix\s+(\S+)$/.test(rawCmd)) {
        const prefixDir = rawCmd.match(/^npm\s+ci\s+--prefix\s+(\S+)$/)[1];
        const pkgPath = path.join(rootDir, prefixDir, 'package.json');
        if (!fs.existsSync(pkgPath)) {
          fail(`Skill "${skillId}" references non-existent package.json under prefix "${prefixDir}": \`${rawCmd}\``);
        }
      }
      // 4) node <script-path>
      else if (/^node\s+(\S+)(?:\s+.*)?$/.test(rawCmd)) {
        const scriptPath = rawCmd.match(/^node\s+(\S+)/)[1];
        const fullScriptPath = path.join(rootDir, scriptPath);
        if (!fs.existsSync(fullScriptPath)) {
          fail(`Skill "${skillId}" references non-existent script path "${scriptPath}": \`${rawCmd}\``);
        }
        // Verify path is inside repository
        const relative = path.relative(rootDir, fullScriptPath);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          fail(`Skill "${skillId}" references path "${scriptPath}" which is outside the repository: \`${rawCmd}\``);
        }
      }
      // 5) npx <package> <args>
      else if (/^npx\s+(.*)$/.test(rawCmd)) {
        const afterNpx = rawCmd.match(/^npx\s+(.*)$/)[1].trim();
        let parts = afterNpx.split(/\s+/);
        // Skip common npx flags
        while (parts.length > 0 && (parts[0].startsWith('--') || parts[0].startsWith('-'))) {
          parts.shift();
        }
        if (parts.length === 0) {
          fail(`Skill "${skillId}" uses npx without specifying a package name: \`${rawCmd}\``);
        }
        
        const pkgName = parts[0];
        const isLocalScript = fs.existsSync(path.join(rootDir, pkgName));
        if (!isLocalScript) {
          const deps = packageJson.dependencies || {};
          const devDeps = packageJson.devDependencies || {};
          
          let mappedPackage = pkgName;
          if (pkgName === 'tsc') mappedPackage = 'typescript';
          if (pkgName === 'firebase') mappedPackage = 'firebase-tools';
          
          const inDeps = deps[mappedPackage] !== undefined || devDeps[mappedPackage] !== undefined;
          if (!inDeps) {
            fail(`Skill "${skillId}" references npx package "${mappedPackage}" (from command \`${rawCmd}\`) which is not registered in package.json dependencies or devDependencies.`);
          }
        }
      }
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

console.log('✅ Enhanced Agent Skill Integrity Gate Passed Successfully!');
process.exit(0);
