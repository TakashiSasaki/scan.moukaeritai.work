import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const profilePath = path.join(rootDir, 'contracts', 'profiles', 'current-application.json');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const activeVersion = profile.contracts['callable-functions-api'];

const vendorDir = path.join(rootDir, 'functions', 'vendor', 'efp-model');
const vendorContractsDir = path.join(rootDir, 'functions', 'vendor', 'contracts', 'callable-functions-api', activeVersion);

let errors = [];

if (!fs.existsSync(path.join(vendorDir, 'package.json'))) {
  errors.push("Missing efp-model package.json in vendor directory");
}
if (!fs.existsSync(path.join(vendorDir, 'dist'))) {
  errors.push("Missing efp-model dist in vendor directory");
}
if (!fs.existsSync(path.join(vendorContractsDir, 'submit-fact-command-request.schema.json'))) {
  errors.push("Missing submit-fact-command-request.schema.json in vendor directory");
}

if (errors.length > 0) {
  console.error("Functions artifact validation failed:");
  errors.forEach(e => console.error(" - " + e));
  process.exit(1);
} else {
  console.log("Functions artifact validation passed.");
}
