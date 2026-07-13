import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(rootDir, 'contracts/fixtures/regressions');
const required = ['functions-artifact-missing-runtime-profile','functions-artifact-missing-efp-schema','object-only-participants-all-index-arrays','observation-nonexistent-object-rejected','measurement-foreign-marker-rejected','participant-id-containing-colon','unicode-sha256-known-vectors','uuidv4-command-accepted','uuidv7-command-rejected','same-command-different-api-version-rejected','association-replace-same-marker-rejected','association-replace-object-mismatch-rejected','missing-association-composite-index','documentation-completed-deferred-conflict','documentation-duplicate-roadmap-entry'];
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir,'.agents/strides/2.0.18.json'),'utf8'));
const evidence = new Set(manifest.requirements.flatMap(r => r.evidence || []));
for (const id of required) {
  const rel = `contracts/fixtures/regressions/${id}.json`;
  if (!fs.existsSync(path.join(rootDir, rel))) throw new Error(`Missing regression fixture ${id}`);
  if (![...evidence].some(e => e === rel || e.startsWith('contracts/fixtures/regressions'))) throw new Error(`Fixture ${id} is not tied to stride evidence`);
}
console.log('Regression fixture validation passed.');
