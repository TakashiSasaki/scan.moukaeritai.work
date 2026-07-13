import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fail(message) { throw new Error(message); }
export function validateStrideManifest(manifest) {
  if (manifest.status !== 'historical') fail('2.0.22 stride must be historical, not an active roadmap gate');
  if (!/Behavioral Harness/.test(manifest.name)) fail('historical stride name drifted');
  if (manifest.roadmap) fail('historical stride must not carry an active roadmap');
  if (JSON.stringify(manifest).includes('Legacy Runtime and Export Closure') && !manifest.cancelled?.includes('Legacy Runtime and Export Closure')) fail('legacy runtime closure may only appear as cancelled');
  if (!/EFP-native First Vertical Slice/i.test(manifest.nextPriority?.name ?? '')) fail('next priority must be the EFP-native first vertical slice');
  for (const requirement of manifest.requirements ?? []) {
    for (const evidence of requirement.evidence ?? []) {
      if (!fs.existsSync(path.join(root, evidence.path))) fail(`missing evidence ${evidence.path}`);
    }
  }
}
function load() { return JSON.parse(fs.readFileSync(path.join(root, '.agents/strides/2.0.22.json'), 'utf8')); }
if (process.argv.includes('--self-test')) {
  validateStrideManifest(load());
  console.log('Stride completion self-test is deprecated; minimal historical manifest check passed.');
} else {
  validateStrideManifest(load());
  console.log('Stride historical manifest check passed.');
}
