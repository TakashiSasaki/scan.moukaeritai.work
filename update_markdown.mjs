import fs from 'fs';

function updateRoadmap(content) {
  const roadmapRegex = /### 📅 Stride Roadmap & Backlog\n([\s\S]*?)##/m;
  const newRoadmap = `### 📅 Stride Roadmap & Backlog
- **2.0.15**: Transactional Fact and Projection Safety Closure (Completed)
- **2.0.16**: Partial Fact Command Integrity (Completed)
- **2.0.17**: Fact Command Integrity Closure Repair (修復対象)
- **2.0.18**: Fact Runtime Recovery and Regression Gate Closure (Current)
- **2.0.19**: Projection Reliability and Ordering (Deferred)
- **2.0.20**: Rules, Legacy Runtime and Export Closure (Deferred)
- **2.1.0**: EFP-native First Vertical Slice (Deferred)

##`;
  return content.replace(roadmapRegex, newRoadmap);
}

const agents = fs.readFileSync('AGENTS.md', 'utf8');
const agentsUpdated = updateRoadmap(agents)
  .replace(/\*\*Completed in 2\.0\.18 \(Fact Command Integrity Closure Repair\)\*\*/, '**Completed in 2.0.17 (Fact Command Integrity Closure Repair)**')
  .replace(/2\.0\.18\*\*: Fact Command Integrity Closure Repair/g, '2.0.17**: Fact Command Integrity Closure Repair');
fs.writeFileSync('AGENTS.md', agentsUpdated);

const readme = fs.readFileSync('README.md', 'utf8');
const readmeUpdated = updateRoadmap(readme)
  .replace(/Fact Command Integrity Closure Repair \(v2\.0\.18\)/, 'Fact Command Integrity Closure Repair (v2.0.17)')
  .replace(/Version 2\.0\.18 repairs/, 'Version 2.0.17 repairs');
fs.writeFileSync('README.md', readmeUpdated);
