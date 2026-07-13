import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Running Documentation Reality Gate...');

function fail(msg) {
  console.error(`❌ Documentation Reality Gate Failed: ${msg}`);
  process.exit(1);
}

// 1. Load package.json for target version
let currentVersion;
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  currentVersion = pkg.version;
} catch (e) {
  fail(`Failed to read/parse package.json: ${e.message}`);
}

// 2. Validate README.md version and content
const readmePath = path.join(rootDir, 'README.md');
if (!fs.existsSync(readmePath)) {
  fail('README.md not found.');
}
const readme = fs.readFileSync(readmePath, 'utf8');

if (!readme.includes(`Version ${currentVersion}`) && !readme.includes(`v${currentVersion}`)) {
  fail(`README.md does not contain the current version "${currentVersion}"`);
}

// Check prohibited claims in README.md
if (readme.includes('Closed and fully validated')) {
  fail('README.md contains the phrase "Closed and fully validated". Since CI is unconfirmed, this must be "implemented", "stabilized locally", or "awaiting CI confirmation".');
}
if (readme.includes('complete fail-closed verification pipeline')) {
  fail('README.md contains the phrase "complete fail-closed verification pipeline". Since CI is unconfirmed, this must refer to "awaiting CI confirmation" or "stabilized locally".');
}

// 3. Validate AGENTS.md version and content
const agentsPath = path.join(rootDir, 'AGENTS.md');
if (!fs.existsSync(agentsPath)) {
  fail('AGENTS.md not found.');
}
const agents = fs.readFileSync(agentsPath, 'utf8');

if (!agents.includes(`scan.mw ${currentVersion}`) && !agents.includes(`version **${currentVersion}**`)) {
  fail(`AGENTS.md does not contain the current version "${currentVersion}"`);
}

// Check prohibited absolute claims in README.md and AGENTS.md
const prohibitedPhrases = [
  { phrase: 'All verification passed', regex: /all\s+verification\s+passed/i },
  { phrase: 'All checks are 100% green', regex: /all\s+(checks|tests|verification|validations)\s+are\s+(100%|100\s*%)\s*green/i },
  { phrase: 'behavioral tests passed', regex: /behavioral\s+tests\s+passed/i },
  { phrase: 'fully verified in CI', regex: /fully\s+verified\s+in\s+CI/i }
];

for (const p of prohibitedPhrases) {
  if (p.regex.test(readme)) {
    fail(`README.md contains prohibited absolute verification claim: "${p.phrase}"`);
  }
  if (p.regex.test(agents)) {
    fail(`AGENTS.md contains prohibited absolute verification claim: "${p.phrase}"`);
  }
}

// Ensure local-only verification claim exists in README.md
if (!readme.includes('Node-only verification passed locally.')) {
  fail('README.md is missing the required local-only verification claim: "Node-only verification passed locally."');
}
if (!readme.includes('Main-target GitHub Actions confirmation is pending.')) {
  fail('README.md is missing the required local-only verification claim: "Main-target GitHub Actions confirmation is pending."');
}

// Ensure local-only verification claim exists in AGENTS.md
if (!agents.includes('Node-only verification passed locally.')) {
  fail('AGENTS.md is missing the required local-only verification claim: "Node-only verification passed locally."');
}
if (!agents.includes('Main-target GitHub Actions confirmation is pending.')) {
  fail('AGENTS.md is missing the required local-only verification claim: "Main-target GitHub Actions confirmation is pending."');
}

// 4. Validate current-application.json applicationVersion
const profilePath = path.join(rootDir, 'contracts/profiles/current-application.json');
if (!fs.existsSync(profilePath)) {
  fail('current-application.json not found.');
}
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
if (profile.applicationVersion !== currentVersion) {
  fail(`contracts/profiles/current-application.json version (${profile.applicationVersion}) does not match package.json version (${currentVersion})`);
}


function extractRoadmap(text, fileName) {
  const lines = text.split('\n').filter(line => line.trim().startsWith('- **2.'));
  const entries = [];
  for (const line of lines) {
    const match = line.match(/\*\*(2\.\d+\.\d+)\*\*:\s*(.*?)\s*\((.*?)\)/);
    if (match) entries.push({ version: match[1], name: match[2], status: match[3], line });
  }
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.version)) fail(`${fileName} contains duplicate roadmap entry for ${entry.version}`);
    seen.add(entry.version);
  }
  return entries;
}
const readmeRoadmap = extractRoadmap(readme, 'README.md');
const agentsRoadmap = extractRoadmap(agents, 'AGENTS.md');
const requiredRoadmap = [
  ['2.0.17', 'Fact Command Integrity Closure Repair'],
  ['2.0.18', 'Fact runtime recovery initial implementation'],
  ['2.0.19', 'Main branch Hermes integration and branch workflow update'],
  ['2.0.20', 'Fact Runtime Closure Correction and Version Governance Repair'],
  ['2.0.21', 'Projection Reliability and Ordering'],
  ['2.0.22', 'Rules, Legacy Runtime and Export Closure'],
  ['2.1.0', 'EFP-native First Vertical Slice']
];
for (const [version, name] of requiredRoadmap) {
  for (const [fileName, roadmap] of [['README.md', readmeRoadmap], ['AGENTS.md', agentsRoadmap]]) {
    const entry = roadmap.find(e => e.version === version);
    if (!entry) fail(`${fileName} is missing roadmap entry ${version}`);
    if (!entry.name.includes(name)) fail(`${fileName} roadmap entry ${version} has unexpected name: ${entry.name}`);
  }
}
const readmeCurrent = readmeRoadmap.find(e => /Current/.test(e.status));
const agentsCurrent = agentsRoadmap.find(e => /Current/.test(e.status));
if (!readmeCurrent || !agentsCurrent || readmeCurrent.version !== agentsCurrent.version) fail('README and AGENTS current roadmap entries differ');
if (readmeCurrent.version !== currentVersion) fail(`Current roadmap ${readmeCurrent.version} does not match package version ${currentVersion}`);
for (const text of [readme, agents]) {
  const completedLines = text.split('\n').filter(l => /Completed/i.test(l));
  const deferredLines = text.split('\n').filter(l => /Deferred/i.test(l));
  for (const c of completedLines) for (const d of deferredLines) if (c.trim() && d.includes(c.replace(/Completed/ig,'').trim())) fail('Same item appears as Completed and Deferred');
}
const stridePath = path.join(rootDir, '.agents/strides', `${currentVersion}.json`);
if (fs.existsSync(stridePath)) {
  const stride = JSON.parse(fs.readFileSync(stridePath, 'utf8'));
  if ((stride.requirements || []).some(req => req.status !== 'complete') && /2\.0\.20.*Completed/i.test(readme + agents)) fail('Stride manifest is incomplete but documentation claims Completed');
} else {
  fail(`Missing stride manifest for current version: ${currentVersion}`);
}
for (const forbidden of ['CI green', 'GitHub Actions passed', 'fully verified in CI']) {
  if ((readme + agents).includes(forbidden)) fail(`Documentation contains unconfirmed CI claim: ${forbidden}`);
}

// 5. Verify no premature completed status for uncompleted features
const incompletePatterns = [
  { name: 'Object/Marker Workflows', regex: /object.*marker.*work.*(complete|done|closed)/i },
  { name: 'Projection Reliability', regex: /projection.*reliability.*(complete|done|closed)/i },
  { name: 'Rules Closure', regex: /rules.*closure.*(complete|done|closed)/i }
];

for (const pattern of incompletePatterns) {
  // We check if either README or AGENTS claims they are "completed" (not counting "incomplete" or "not complete")
  // Let's search for lines containing these topics, and assert they don't claim complete success without qualifiers.
  const checkClaim = (text, fileName) => {
    const lines = text.split('\n');
    for (const line of lines) {
      if (pattern.regex.test(line)) {
        // Allow if qualified by "not", "incomplete", "deferred", "pending", "awaiting"
        const lowercaseLine = line.toLowerCase();
        if (
          lowercaseLine.includes('not') || 
          lowercaseLine.includes('incomplete') || 
          lowercaseLine.includes('defer') || 
          lowercaseLine.includes('pend') || 
          lowercaseLine.includes('await') ||
          lowercaseLine.includes('scheduled') ||
          lowercaseLine.includes('unimplemented')
        ) {
          continue;
        }
        fail(`Premature claim of completion for "${pattern.name}" found in ${fileName}: "${line.trim()}"`);
      }
    }
  };
  
  checkClaim(readme, 'README.md');
  checkClaim(agents, 'AGENTS.md');
}

console.log('✅ Documentation Reality Gate Passed successfully!');
process.exit(0);
