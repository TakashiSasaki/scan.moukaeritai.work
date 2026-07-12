import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const profilePath = path.join(rootDir, 'contracts', 'profiles', 'current-application.json');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const activeVersion = profile.contracts['callable-functions-api'];

const vendorDir = path.join(rootDir, 'functions', 'vendor', 'efp-model');
const vendorContractsDir = path.join(rootDir, 'functions', 'vendor', 'contracts', 'callable-functions-api', activeVersion);
const activeVersionJsonPath = path.join(rootDir, 'functions', 'vendor', 'contracts', 'callable-functions-api', 'active-version.json');

let errors = [];

if (!fs.existsSync(activeVersionJsonPath)) {
  errors.push("Missing active-version.json in vendor directory");
}

if (!fs.existsSync(path.join(vendorDir, 'package.json'))) {
  errors.push("Missing efp-model package.json in vendor directory");
}

if (!fs.existsSync(path.join(vendorDir, 'dist'))) {
  errors.push("Missing efp-model dist in vendor directory");
}

// 1. Try importing from functions context
try {
  // We point directly to the vendor index file to mimic what node will do when it resolves file:vendor/efp-model
  const efpModel = await import(path.join(vendorDir, 'dist', 'esm', 'index.js').replace(/\\/g, '/'));
  if (typeof efpModel.generateUUIDv7 !== 'function') errors.push("efp-model missing generateUUIDv7");
  if (typeof efpModel.generateMarkerKey !== 'function') errors.push("efp-model missing generateMarkerKey");
  if (typeof efpModel.stripUndefinedDeep !== 'function') errors.push("efp-model missing stripUndefinedDeep");
} catch (e) {
  errors.push(`Failed to import @scan/efp-model from vendor dir: ${e.message}`);
}

// 2. Validate schemas
const schemaFiles = [
  'submit-fact-command-request.schema.json',
  'association-command-data.schema.json',
  'observation-command-data.schema.json',
  'measurement-command-data.schema.json',
  'event-command-data.schema.json',
];


const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validators = {};
const schemas = {};

for (const sf of schemaFiles) {
  const sfPath = path.join(vendorContractsDir, sf);
  if (!fs.existsSync(sfPath)) {
    errors.push(`Missing schema ${sf} in vendor directory`);
    continue;
  }
  try {
    const content = JSON.parse(fs.readFileSync(sfPath, 'utf8'));
    schemas[sf] = content;
  } catch (e) {
    errors.push(`Failed to parse schema ${sf}: ${e.message}`);
  }
}

try {
  ajv.addSchema(schemas['association-command-data.schema.json'], 'association-command-data.schema.json');
  ajv.addSchema(schemas['observation-command-data.schema.json'], 'observation-command-data.schema.json');
  ajv.addSchema(schemas['measurement-command-data.schema.json'], 'measurement-command-data.schema.json');
  ajv.addSchema(schemas['event-command-data.schema.json'], 'event-command-data.schema.json');
  validators['submit-fact-command-request.schema.json'] = ajv.compile(schemas['submit-fact-command-request.schema.json']);
  validators['association-command-data.schema.json'] = ajv.getSchema('association-command-data.schema.json');
  validators['observation-command-data.schema.json'] = ajv.getSchema('observation-command-data.schema.json');
  validators['measurement-command-data.schema.json'] = ajv.getSchema('measurement-command-data.schema.json');
  validators['event-command-data.schema.json'] = ajv.getSchema('event-command-data.schema.json');
} catch (e) {
  errors.push(`Failed to compile schemas: ${e.message}`);
}


// 3. Validate fixtures
const fixturesDir = path.join(rootDir, 'contracts', 'packages', 'callable-functions-api', activeVersion, 'fixtures');
if (fs.existsSync(fixturesDir) && validators['submit-fact-command-request.schema.json']) {
  const reqValidator = validators['submit-fact-command-request.schema.json'];
  const dataValidators = {
    'association': validators['association-command-data.schema.json'],
    'observation': validators['observation-command-data.schema.json'],
    'measurement': validators['measurement-command-data.schema.json'],
    'event': validators['event-command-data.schema.json']
  };

  const validFiles = fs.readdirSync(fixturesDir).filter(f => f.startsWith('valid-') && f.endsWith('.json'));
  const invalidFiles = fs.readdirSync(fixturesDir).filter(f => f.startsWith('invalid-') && f.endsWith('.json'));

  for (const f of validFiles) {
    try {
      const payload = JSON.parse(fs.readFileSync(path.join(fixturesDir, f), 'utf8'));
      if (!reqValidator(payload)) {
        errors.push(`Valid fixture ${f} failed request schema validation: ${ajv.errorsText(reqValidator.errors)}`);
      } else {
        const factType = payload.data.factType;
        const dValidator = dataValidators[factType];
        if (dValidator && !dValidator(payload.data.data)) {
          errors.push(`Valid fixture ${f} failed data payload validation for ${factType}: ${ajv.errorsText(dValidator.errors)}`);
        }
      }
    } catch(e) {
      errors.push(`Error checking valid fixture ${f}: ${e.message}`);
    }
  }

  for (const f of invalidFiles) {
    try {
      const payload = JSON.parse(fs.readFileSync(path.join(fixturesDir, f), 'utf8'));
      const isReqValid = reqValidator(payload);
      if (isReqValid) {
        const factType = payload.data?.factType;
        const dValidator = dataValidators[factType];
        if (dValidator && dValidator(payload.data?.data)) {
           errors.push(`Invalid fixture ${f} incorrectly passed validation`);
        }
      }
    } catch(e) {
      // JSON parse errors on invalid files are acceptable depending on definition, but here we expect valid JSON failing schemas.
    }
  }
}

if (errors.length > 0) {
  console.error("Functions artifact validation failed:");
  errors.forEach(e => console.error(" - " + e));
  process.exit(1);
} else {
  console.log("Functions artifact validation passed.");
}
