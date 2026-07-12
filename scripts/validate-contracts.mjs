import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const contractsDir = path.join(rootDir, 'contracts');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function fail(msg) {
  console.error(`❌ Validation Failure: ${msg}`);
  process.exit(1);
}

console.log('🔍 Starting Comprehensive Contract Registry and Schema Validation...');

// 1. SemVer format validator
const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
function validateSemVer(version, context) {
  if (!semverRegex.test(version)) {
    fail(`Invalid SemVer format "${version}" for ${context}`);
  }
}

// 2. Allowed contract types
const ALLOWED_CONTRACT_TYPES = new Set([
  'vocabulary',
  'data-model',
  'semantics',
  'exchange-format',
  'import-protocol',
  'data-binding',
  'api-contract'
]);

// 3. Define Registry JSON Schema
const registrySchema = {
  type: 'object',
  required: ['registryVersion', 'contracts'],
  additionalProperties: false,
  properties: {
    registryVersion: { type: 'string' },
    contracts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['contractId', 'version', 'status', 'title', 'description', 'contractType', 'path'],
        additionalProperties: false,
        properties: {
          contractId: { type: 'string' },
          version: { type: 'string' },
          status: { type: 'string', enum: ['active', 'deprecated', 'experimental'] },
          title: { type: 'string' },
          description: { type: 'string' },
          contractType: { type: 'string' },
          path: { type: 'string' }
        }
      }
    }
  }
};

const validateRegistry = ajv.compile(registrySchema);

// 4. Load and Validate registry.json
const registryPath = path.join(contractsDir, 'registry.json');
if (!fs.existsSync(registryPath)) {
  fail('registry.json does not exist in contracts/');
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
} catch (err) {
  fail(`Failed to parse registry.json: ${err.message}`);
}

const isRegistryValid = validateRegistry(registry);
if (!isRegistryValid) {
  console.error(ajv.errorsText(validateRegistry.errors));
  fail('registry.json structure violates the registry schema');
}

console.log('✅ Registry schema validation passed.');

// 5. Schema validation for individual contract.json files
const contractSchemaSpec = {
  type: 'object',
  required: ['contractId', 'version', 'status', 'title', 'description', 'contractType'],
  additionalProperties: false,
  properties: {
    contractId: { type: 'string' },
    version: { type: 'string' },
    status: { type: 'string', enum: ['active', 'deprecated', 'experimental'] },
    title: { type: 'string' },
    description: { type: 'string' },
    contractType: { type: 'string' },
    normativeArtifacts: {
      type: 'array',
      items: { type: 'string' }
    },
    dependencies: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    compatibility: {
      type: 'object',
      required: ['breaksBackwardCompatibility', 'compatibleWith'],
      properties: {
        breaksBackwardCompatibility: { type: 'boolean' },
        compatibleWith: { type: 'array', items: { type: 'string' } }
      }
    }
  }
};
const validateContractSpec = ajv.compile(contractSchemaSpec);

const contractMap = new Map(); // map of `${contractId}@${version}` -> registryEntry

// 6. Loop and validate contracts, check duplicates, match paths, match IDs/versions, validate semver
for (const entry of registry.contracts) {
  const { contractId, version, path: relativePath, contractType } = entry;

  validateSemVer(version, `registry contract "${contractId}"`);

  if (!ALLOWED_CONTRACT_TYPES.has(contractType)) {
    fail(`Forbidden contractType "${contractType}" for contract "${contractId}" in registry`);
  }

  const mapKey = `${contractId}@${version}`;
  if (contractMap.has(mapKey)) {
    fail(`Duplicate contractId & version detected in registry.json: ${mapKey}`);
  }
  contractMap.set(mapKey, entry);

  // Ensure contract.json exists
  const fullContractPath = path.join(contractsDir, relativePath);
  if (!fs.existsSync(fullContractPath)) {
    fail(`Referenced contract JSON file does not exist: ${fullContractPath}`);
  }

  // Verify path matches structural standards
  const dirParts = relativePath.split('/');
  const dirVersion = dirParts[dirParts.length - 2];
  if (dirVersion !== version) {
    fail(`Contract directory version ("${dirVersion}") does not match declared version ("${version}") for path: ${relativePath}`);
  }

  let contractJson;
  try {
    contractJson = JSON.parse(fs.readFileSync(fullContractPath, 'utf8'));
  } catch (err) {
    fail(`Failed to parse contract JSON at ${fullContractPath}: ${err.message}`);
  }

  // Validate contract.json structure
  const isContractJsonValid = validateContractSpec(contractJson);
  if (!isContractJsonValid) {
    console.error(ajv.errorsText(validateContractSpec.errors));
    fail(`contract.json at ${fullContractPath} structure violates the contract specification schema`);
  }

  // contractId / version matching check
  if (contractJson.contractId !== contractId) {
    fail(`Contract ID mismatch: registry expected "${contractId}" but contract.json specified "${contractJson.contractId}" at ${fullContractPath}`);
  }
  if (contractJson.version !== version) {
    fail(`Contract version mismatch: registry expected "${version}" but contract.json specified "${contractJson.version}" at ${fullContractPath}`);
  }
  if (contractJson.contractType !== contractType) {
    fail(`Contract type mismatch: registry expected "${contractType}" but contract.json specified "${contractJson.contractType}" at ${fullContractPath}`);
  }
}

console.log('✅ Individual contract.json checks, duplicate checks, path alignments, and SemVer checks passed.');

// 7. Verify dependencies & validate JSON schemas meta-validation and compilation
const ajvCompiler = new Ajv({ allErrors: true, strict: false });
addFormats(ajvCompiler);

// Compile all normative schema files across all registered contracts
for (const entry of registry.contracts) {
  const { contractId, version, path: relativePath } = entry;
  const fullContractPath = path.join(contractsDir, relativePath);
  const parentDir = path.dirname(fullContractPath);
  const contractJson = JSON.parse(fs.readFileSync(fullContractPath, 'utf8'));

  // Verify dependencies exist in registry
  if (contractJson.dependencies) {
    for (const [depId, depVer] of Object.entries(contractJson.dependencies)) {
      const depKey = `${depId}@${depVer}`;
      if (!contractMap.has(depKey)) {
        fail(`Contract "${contractId}@${version}" references missing dependency: "${depKey}"`);
      }
    }
  }

  // Process and compile normative schema artifacts
  if (contractJson.normativeArtifacts) {
    for (const artifact of contractJson.normativeArtifacts) {
      const artifactPath = path.join(parentDir, artifact);
      if (!fs.existsSync(artifactPath)) {
        fail(`Normative artifact does not exist: "${artifactPath}" referenced in ${fullContractPath}`);
      }

      if (artifact.endsWith('.schema.json')) {
        let schema;
        try {
          schema = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        } catch (err) {
          fail(`Failed to parse JSON Schema at ${artifactPath}: ${err.message}`);
        }

        // Meta schema validation
        const isValidSchema = ajvCompiler.validateSchema(schema);
        if (!isValidSchema) {
          console.error(ajvCompiler.errorsText());
          fail(`Invalid JSON Schema draft-07 syntax in: ${artifactPath}`);
        }

        // Register the schema with its ID or file-based key in AJV to allow resolving references
        // We will assign a unique key to refer to this schema, or use its $id if defined, or derive from path
        const schemaKey = path.relative(contractsDir, artifactPath).replace(/\\/g, '/');
        try {
          if (!ajvCompiler.getSchema(schemaKey)) {
            ajvCompiler.addSchema(schema, schemaKey);
          }
        } catch (err) {
          fail(`Failed to register schema "${schemaKey}": ${err.message}`);
        }
      }
    }
  }
}

// Ensure all registered schemas compile perfectly and can resolve relative/absolute $refs
for (const entry of registry.contracts) {
  const { path: relativePath } = entry;
  const fullContractPath = path.join(contractsDir, relativePath);
  const parentDir = path.dirname(fullContractPath);
  const contractJson = JSON.parse(fs.readFileSync(fullContractPath, 'utf8'));

  if (contractJson.normativeArtifacts) {
    for (const artifact of contractJson.normativeArtifacts) {
      if (artifact.endsWith('.schema.json')) {
        const artifactPath = path.join(parentDir, artifact);
        const schemaKey = path.relative(contractsDir, artifactPath).replace(/\\/g, '/');
        try {
          ajvCompiler.getSchema(schemaKey);
        } catch (err) {
          fail(`Failed to compile and resolve all $ref dependencies for schema "${schemaKey}": ${err.message}`);
        }
      }
    }
  }
}

console.log('✅ Dependency existences, schema meta-validations, reference resolutions, and compilations passed.');

// 8. Verify profiles reference registered versions
const profilePath = path.join(contractsDir, 'profiles', 'current-application.json');
if (!fs.existsSync(profilePath)) {
  fail('profiles/current-application.json does not exist');
}

let profile;
try {
  profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
} catch (err) {
  fail(`Failed to parse profiles/current-application.json: ${err.message}`);
}

if (!profile.contracts || typeof profile.contracts !== 'object') {
  fail('current-application.json is missing a "contracts" object');
}

for (const [contractId, ver] of Object.entries(profile.contracts)) {
  const mapKey = `${contractId}@${ver}`;
  if (!contractMap.has(mapKey)) {
    fail(`Profile "current-application.json" references unregistered contract or version: ${mapKey}`);
  }
}

console.log('✅ Profile contract assignment mapping verified.');

// 9. Fixture execution: Validate mock data against compiled v3.0.0 schemas
console.log('🧪 Executing schema fixture validation test suites...');

const fixtures = [
  { file: 'object.json', schema: 'packages/efp-model/3.0.0/entities/object.schema.json' },
  { file: 'marker.json', schema: 'packages/efp-model/3.0.0/entities/marker.schema.json' },
  { file: 'place.json', schema: 'packages/efp-model/3.0.0/entities/place.schema.json' },
  { file: 'association.json', schema: 'packages/efp-model/3.0.0/facts/association.schema.json' },
  { file: 'observation.json', schema: 'packages/efp-model/3.0.0/facts/observation.schema.json' },
  { file: 'measurement.json', schema: 'packages/efp-model/3.0.0/facts/measurement.schema.json' },
  { file: 'event.json', schema: 'packages/efp-model/3.0.0/facts/event.schema.json' },
  { file: 'submit-fact-command-request-association.json', schema: 'packages/callable-functions-api/1.1.1/submit-fact-command-request.schema.json' },
  { file: 'submit-fact-command-request-observation.json', schema: 'packages/callable-functions-api/1.1.1/submit-fact-command-request.schema.json' },
  { file: 'submit-fact-command-request-measurement.json', schema: 'packages/callable-functions-api/1.1.1/submit-fact-command-request.schema.json' },
  { file: 'submit-fact-command-request-event.json', schema: 'packages/callable-functions-api/1.1.1/submit-fact-command-request.schema.json' },
  { file: 'submit-fact-command-request.json', schema: 'packages/callable-functions-api/1.1.1/submit-fact-command-request.schema.json', isRequestEnvelope: true },
  { file: 'submit-fact-command-response.json', schema: 'packages/callable-functions-api/1.1.1/submit-fact-command-response.schema.json' },
  { file: 'export-format.json', schema: 'packages/export-format/1.0.0/export-format.schema.json' }
];

const fixturesDir = path.join(contractsDir, 'fixtures');

for (const fix of fixtures) {
  const schemaCompiler = ajvCompiler.getSchema(fix.schema);
  if (!schemaCompiler) {
    fail(`Required schema key "${fix.schema}" is not registered/compiled in AJV.`);
  }

  // Validate Valid Fixture
  const validPath = path.join(fixturesDir, 'valid', fix.file);
  if (fs.existsSync(validPath)) {
    const validData = JSON.parse(fs.readFileSync(validPath, 'utf8'));
    if (!schemaCompiler(validData)) {
      console.error(`Validation Errors for Valid Fixture ${fix.file}:`, ajvCompiler.errorsText(schemaCompiler.errors));
      fail(`Valid fixture "${fix.file}" failed validation under schema "${fix.schema}"`);
    }
    console.log(`  ✅ Valid fixture passed: ${fix.file}`);
  }

  // Validate Invalid Fixture
  const invalidFile = fix.isRequestEnvelope ? 'submit-fact-command-request.json' : fix.file;
  const invalidPath = path.join(fixturesDir, 'invalid', invalidFile);
  if (fs.existsSync(invalidPath)) {
    const invalidData = JSON.parse(fs.readFileSync(invalidPath, 'utf8'));
    if (schemaCompiler(invalidData)) {
      fail(`Invalid fixture "${invalidFile}" falsely passed schema validation for "${fix.schema}"!`);
    }
    console.log(`  ✅ Invalid fixture correctly rejected: ${invalidFile}`);
  }
}

console.log('✅ All schema valid & invalid fixture validation tests executed successfully.');

console.log('🎉 SUCCESS: All contracts, registries, schemas, and profiles validated successfully against exact specifications!');
