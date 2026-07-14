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
const activeContracts = profile.activeContracts || profile.contracts || {};
const activeVersion = activeContracts.find ? activeContracts.find(c => c.contractId === 'callable-functions-api')?.version : activeContracts['callable-functions-api'];

const vendorDir = path.join(rootDir, 'functions', 'vendor', 'efp-model');
const vendorContractsDir = path.join(rootDir, 'functions', 'vendor', 'contracts', 'callable-functions-api', activeVersion);
const activeVersionJsonPath = path.join(rootDir, 'functions', 'vendor', 'contracts', 'callable-functions-api', 'active-version.json');
const functionsContractsDir = path.join(rootDir, 'functions', 'vendor', 'contracts', 'callable-functions-api');

let errors = [];

// 1. active-version.json
if (!fs.existsSync(activeVersionJsonPath)) {
  errors.push("Missing active-version.json in vendor directory");
} else {
  const av = JSON.parse(fs.readFileSync(activeVersionJsonPath, 'utf8'));
  if (av.activeVersion !== activeVersion) {
    errors.push(`active-version.json has version ${av.activeVersion}, expected ${activeVersion}`);
  }
}

// 2. Package resolution check
const functionsPackageJsonPath = path.join(rootDir, 'functions', 'package.json');
const functionsPackageJson = JSON.parse(fs.readFileSync(functionsPackageJsonPath, 'utf8'));
if (functionsPackageJson.dependencies['@scan/efp-model'] !== 'file:vendor/efp-model') {
  errors.push("@scan/efp-model is not configured via file:vendor/efp-model in functions/package.json");
}

try {
  // Use createRequire to simulate node package resolution from the functions directory
  const functionsRequire = createRequire(path.join(rootDir, 'functions', 'index.js'));
  const efpModelMain = functionsRequire.resolve('@scan/efp-model');
  const efpModel = await import('file://' + efpModelMain);
  
  if (typeof efpModel.generateUUIDv7 !== 'function') errors.push("efp-model missing generateUUIDv7");
  if (typeof efpModel.generateMarkerKey !== 'function') errors.push("efp-model missing generateMarkerKey");
  if (typeof efpModel.validateAssociationSemantics !== 'function') errors.push("efp-model missing validateAssociationSemantics");
} catch (e) {
  errors.push(`Failed to import @scan/efp-model using package resolution: ${e.message}`);
}

// 3. Schema compilation
const schemaFiles = [
  'submit-fact-command-request.schema.json',
  'submit-fact-command-response.schema.json',
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
  
  validators['request'] = ajv.compile(schemas['submit-fact-command-request.schema.json']);
  validators['response'] = ajv.compile(schemas['submit-fact-command-response.schema.json']);
  
  validators['association'] = ajv.getSchema('association-command-data.schema.json');
  validators['observation'] = ajv.getSchema('observation-command-data.schema.json');
  validators['measurement'] = ajv.getSchema('measurement-command-data.schema.json');
  validators['event'] = ajv.getSchema('event-command-data.schema.json');
} catch (e) {
  errors.push(`Failed to compile schemas: ${e.message}`);
}

// 4. Validate fixtures
const fixturesDir = path.join(rootDir, 'contracts', 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  errors.push(`Fixtures directory does not exist: ${fixturesDir}`);
} else {
  const validFiles = [
    'submit-fact-command-request-association.json',
    'submit-fact-command-request-observation.json',
    'submit-fact-command-request-measurement.json',
    'submit-fact-command-request-event.json',
    'submit-fact-command-request.json',
    'submit-fact-command-response.json'
  ];
  
  let validExecuted = 0;
  for (const f of validFiles) {
    const filePath = path.join(fixturesDir, 'valid', f);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing valid fixture: ${f}`);
      continue;
    }
    
    try {
      const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (f === 'submit-fact-command-response.json') {
        if (!validators['response'](payload)) {
          errors.push(`Valid response fixture ${f} failed validation: ${ajv.errorsText(validators['response'].errors)}`);
        } else {
          validExecuted++;
        }
      } else {
        if (!validators['request'](payload)) {
          errors.push(`Valid request fixture ${f} failed validation: ${ajv.errorsText(validators['request'].errors)}`);
        } else {
          validExecuted++;
        }
      }
    } catch(e) {
      errors.push(`Error checking valid fixture ${f}: ${e.message}`);
    }
  }

  let invalidExecuted = 0;
  for (const f of validFiles) {
    const filePath = path.join(fixturesDir, 'invalid', f);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing invalid fixture: ${f}`);
      continue;
    }
    
    try {
      const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (f === 'submit-fact-command-response.json') {
        if (validators['response'](payload)) {
          errors.push(`Invalid response fixture ${f} incorrectly passed validation`);
        } else {
          invalidExecuted++;
        }
      } else {
        if (validators['request'](payload)) {
          errors.push(`Invalid request fixture ${f} incorrectly passed validation`);
        } else {
          invalidExecuted++;
        }
      }
    } catch(e) {
      errors.push(`Error checking invalid fixture ${f}: ${e.message}`);
    }
  }
  
  if (validExecuted === 0 || invalidExecuted === 0) {
    errors.push("Failed to execute any fixtures (0 executed).");
  }
  if (validExecuted !== validFiles.length || invalidExecuted !== validFiles.length) {
    errors.push(`Fixture count mismatch. Expected ${validFiles.length} valid and invalid.`);
  }
}

// 5. Unwanted old contract versions
const otherVersions = fs.readdirSync(functionsContractsDir).filter(f => f !== activeVersion && f !== 'active-version.json');
if (otherVersions.length > 0) {
  errors.push(`Old contract version directories found in vendor: ${otherVersions.join(', ')}`);
}

if (errors.length > 0) {
  console.error("Functions artifact validation failed:");
  errors.forEach(e => console.error(" - " + e));
  process.exit(1);
} else {
  console.log("Functions artifact validation passed.");
}
