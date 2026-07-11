import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const contractsDir = path.join(rootDir, 'contracts');

const ajv = new Ajv({ allErrors: true, strict: false });

function fail(msg) {
  console.error(`❌ Validation Failure: ${msg}`);
  process.exit(1);
}

console.log('🔍 Starting Contract Registry and Schema validation...');

// 1. Check registry.json existence & validity
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

if (!registry.contracts || !Array.isArray(registry.contracts)) {
  fail('registry.json is missing a "contracts" array');
}

// 2. Load and validate individual contracts
const contractMap = new Map();
const contractIds = new Set();

for (const entry of registry.contracts) {
  const { contractId, version, path: relativePath } = entry;
  
  if (!contractId || !version || !relativePath) {
    fail(`Registry entry is missing critical fields: ${JSON.stringify(entry)}`);
  }

  // Check duplicate contractIds
  const mapKey = `${contractId}@${version}`;
  if (contractMap.has(mapKey)) {
    fail(`Duplicate contractId & version in registry.json: ${mapKey}`);
  }
  contractMap.set(mapKey, entry);

  if (contractIds.has(contractId)) {
    // contractId is duplicate in registry
    // wait, different versions of the same contractId is allowed in registry, but let's make sure contractId duplication for the *same* version is caught.
  }

  const fullContractPath = path.join(contractsDir, relativePath);
  if (!fs.existsSync(fullContractPath)) {
    fail(`Referenced contract JSON file does not exist: ${fullContractPath}`);
  }

  let contractJson;
  try {
    contractJson = JSON.parse(fs.readFileSync(fullContractPath, 'utf8'));
  } catch (err) {
    fail(`Failed to parse contract JSON at ${fullContractPath}: ${err.message}`);
  }

  // Check contract version and directory version match
  if (contractJson.version !== version) {
    fail(`Contract version mismatch: registry expected "${version}" but contract.json specified "${contractJson.version}" at ${fullContractPath}`);
  }
  
  // Verify directory match
  // e.g. packages/core-vocabulary/1.0.0/contract.json -> version is 1.0.0
  const dirParts = relativePath.split('/');
  const dirVersion = dirParts[dirParts.length - 2];
  if (dirVersion !== version) {
    fail(`Contract directory version ("${dirVersion}") does not match version ("${version}") for path ${relativePath}`);
  }

  // Validate normativeArtifacts existence
  const parentDir = path.dirname(fullContractPath);
  if (contractJson.normativeArtifacts) {
    for (const artifact of contractJson.normativeArtifacts) {
      const artifactPath = path.join(parentDir, artifact);
      if (!fs.existsSync(artifactPath)) {
        fail(`Normative artifact does not exist: "${artifactPath}" referenced in ${fullContractPath}`);
      }

      // If it's a JSON schema, validate its syntax
      if (artifact.endsWith('.schema.json')) {
        try {
          const schema = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
          const validSchema = ajv.validateSchema(schema);
          if (!validSchema) {
            console.error(ajv.errorsText());
            fail(`Invalid JSON Schema syntax in ${artifactPath}`);
          }
        } catch (err) {
          fail(`Failed to parse or validate JSON Schema at ${artifactPath}: ${err.message}`);
        }
      }
    }
  }
}

// 3. Check current-application.json profile
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

for (const [contractId, version] of Object.entries(profile.contracts)) {
  const mapKey = `${contractId}@${version}`;
  if (!contractMap.has(mapKey)) {
    fail(`Profile references an unregistered contract or version: ${mapKey}`);
  }
}

console.log('✅ All contracts, registries, schemas, and profiles validated successfully!');
