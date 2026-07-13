import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const originalFile = path.join(rootDir, 'packages', 'efp-model', 'src', 'generated', 'types.ts');
const tempFile = path.join(rootDir, 'packages', 'efp-model', 'src', 'generated', 'types.temp.ts');

console.log('Checking for generated types drift...');

// 1. Back up the original file
if (!fs.existsSync(originalFile)) {
  console.error(`❌ Original file does not exist: ${originalFile}`);
  process.exit(1);
}
const originalContent = fs.readFileSync(originalFile, 'utf8');

// 2. Run the type generator
try {
  // We temporarily change OUTPUT_FILE or copy original, run generate, then compare.
  // Since packages/efp-model/scripts/generate-types.mjs always writes to OUTPUT_FILE,
  // we can read OUTPUT_FILE, copy it to temp, then run the generator which overwrites original,
  // compare, and restore original!
  
  // Execute generator
  execSync('node packages/efp-model/scripts/generate-types.mjs', { stdio: 'inherit', cwd: rootDir });
  
  const newlyGeneratedContent = fs.readFileSync(originalFile, 'utf8');
  
  // Restore original just in case we are on a clean working copy
  fs.writeFileSync(originalFile, originalContent, 'utf8');
  
  if (originalContent !== newlyGeneratedContent) {
    console.error('❌ Drift detected between committed generated types and dynamic schema-derived types!');
    // Log diff if possible
    fs.writeFileSync(tempFile, newlyGeneratedContent, 'utf8');
    try {
      execSync(`git diff --no-index ${originalFile} ${tempFile}`, { stdio: 'inherit' });
    } catch (diffErr) {
      // git diff exits with 1 when differences are found
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
    process.exit(1);
  }
  
  console.log('✅ No generated types drift detected. Generated types match JSON schemas perfectly.');
  process.exit(0);
} catch (err) {
  console.error(`❌ Check failed with error: ${err.message}`);
  // Make sure original content is restored
  fs.writeFileSync(originalFile, originalContent, 'utf8');
  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  process.exit(1);
}
