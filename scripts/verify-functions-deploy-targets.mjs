import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowlistPath = path.resolve(__dirname, '../functions/deploy-functions.allowlist.json');

try {
  const allowlistContent = fs.readFileSync(allowlistPath, 'utf8');
  const allowlist = JSON.parse(allowlistContent);

  if (!allowlist || !Array.isArray(allowlist.ownedFunctions)) {
    console.error('Error: Invalid allowlist format. Expected "ownedFunctions" array.');
    process.exit(1);
  }

  const ownedFunctions = allowlist.ownedFunctions;

  if (ownedFunctions.length === 0) {
    console.error('Error: Function target list is empty.');
    process.exit(1);
  }

  const seen = new Set();
  const validNameRegex = /^[A-Za-z][A-Za-z0-9_]*$/;

  for (const name of ownedFunctions) {
    if (typeof name !== 'string') {
      console.error(`Error: Function name is not a string: ${name}`);
      process.exit(1);
    }
    if (!validNameRegex.test(name)) {
      console.error(`Error: Invalid function name format: ${name}`);
      process.exit(1);
    }
    if (seen.has(name)) {
      console.error(`Error: Duplicate function name found: ${name}`);
      process.exit(1);
    }
    seen.add(name);
  }

  const targetString = ownedFunctions.map((name) => `functions:${name}`).join(',');

  if (!targetString || targetString === 'functions' || targetString === 'functions:') {
    console.error('Error: Generated deploy target is invalid or bare "functions".');
    process.exit(1);
  }

  // Print exact target string without trailing newline or anything else
  process.stdout.write(targetString);
} catch (error) {
  console.error('Error reading or parsing deploy-functions.allowlist.json:', error.message);
  process.exit(1);
}
