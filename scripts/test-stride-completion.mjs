import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(rootDir, '.agents/strides/2.0.18.json');
function fail(msg){ throw new Error(msg); }
function validate(manifest){
  if (!Array.isArray(manifest.requirements) || manifest.requirements.length === 0) fail('requirement missing');
  const scripts = JSON.parse(fs.readFileSync(path.join(rootDir,'package.json'),'utf8')).scripts || {};
  for (const req of manifest.requirements) {
    if (!req.id) fail('requirement missing id');
    if (req.status === 'complete') {
      if (!Array.isArray(req.evidence) || req.evidence.length === 0) fail(`${req.id} evidence missing`);
      if (!Array.isArray(req.verificationCommands) || req.verificationCommands.length === 0) fail(`${req.id} verificationCommands missing`);
      for (const ev of req.evidence) if (!fs.existsSync(path.join(rootDir, ev))) fail(`${req.id} evidence does not exist: ${ev}`);
      for (const cmd of req.verificationCommands) if (!scripts[cmd]) fail(`${req.id} command not in package.json scripts: ${cmd}`);
      if (req.evidence.every(ev => /README|AGENTS|\.md$/.test(ev))) fail(`${req.id} is complete with documentation-only evidence`);
    }
  }
}
if (process.argv.includes('--self-test')) {
  const good = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  validate(good);
  for (const [label, mut] of [
    ['requirement missing', m => { delete m.requirements; }],
    ['evidence missing', m => { m.requirements[0].evidence=[]; }],
    ['nonexistent command', m => { m.requirements[0].verificationCommands=['nope']; }],
    ['documentation only', m => { m.requirements[0].evidence=['README.md']; }]
  ]) {
    const clone = structuredClone(good); mut(clone); let failed=false; try { validate(clone); } catch { failed=true; }
    if (!failed) throw new Error(`self-test did not fail for ${label}`);
  }
  console.log('Stride completion self-test passed.');
} else { try { validate(JSON.parse(fs.readFileSync(manifestPath,'utf8'))); console.log('Stride completion gate passed.'); } catch (e) { console.error(`❌ Stride completion gate failed: ${e.message}`); process.exit(1); } }
