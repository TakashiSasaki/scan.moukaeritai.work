import fs from 'fs';

let content = fs.readFileSync('functions/src/logicalFactBuilder.ts', 'utf8');

const replacement = `const ajvInstances: Record<string, Ajv> = {};
const apiValidatorsMap: Record<string, any> = {};
const efpValidatorsMap: Record<string, any> = {};

export function resetValidatorsCache() {
  for (const key of Object.keys(ajvInstances)) delete ajvInstances[key];
  for (const key of Object.keys(apiValidatorsMap)) delete apiValidatorsMap[key];
  for (const key of Object.keys(efpValidatorsMap)) delete efpValidatorsMap[key];
}

function getAjvInstance(cacheKey: string) {
  if (!ajvInstances[cacheKey]) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    ajvInstances[cacheKey] = ajv;
  }
  return ajvInstances[cacheKey];
}

function loadAndParseSchema(fileName: string, baseFolder: string) {`;

content = content.replace(/const ajv = new Ajv\(\{ allErrors: true, strict: false \}\);\s*addFormats\(ajv\);\s*let efpValidators: Record<string, any> \| null = null;\s*let apiValidators: Record<string, any> \| null = null;\s*function loadAndParseSchema/, replacement);

content = content.replace(/function addSchemaWithUri\(fileName: string, baseFolder: string\) \{/g, 'function addSchemaWithUri(fileName: string, baseFolder: string, ajv: Ajv) {');
content = content.replace(/const schema = loadAndParseSchema\(fileName, baseFolder\);/g, `const schema = loadAndParseSchema(fileName, baseFolder);`);

const initReplacement = `function initValidators(activeApiVersion: string, activeEfpVersion: string) {
  const cacheKey = \`\${activeApiVersion}|\${activeEfpVersion}\`;
  if (apiValidatorsMap[cacheKey] && efpValidatorsMap[cacheKey]) return {
    apiValidators: apiValidatorsMap[cacheKey],
    efpValidators: efpValidatorsMap[cacheKey]
  };

  const ajv = getAjvInstance(cacheKey);
  const apiBase = \`callable-functions-api/\${activeApiVersion}\`;
  const efpBase = \`efp-model/\${activeEfpVersion}\`;

  const requestSchema = addSchemaWithUri("submit-fact-command-request.schema.json", apiBase, ajv);
  addSchemaWithUri("association-command-data.schema.json", apiBase, ajv);
  addSchemaWithUri("observation-command-data.schema.json", apiBase, ajv);
  addSchemaWithUri("measurement-command-data.schema.json", apiBase, ajv);
  addSchemaWithUri("event-command-data.schema.json", apiBase, ajv);

  const apiValidators = {
    request: ajv.compile(requestSchema)
  };

  addSchemaWithUri("common/entity-reference.schema.json", efpBase, ajv);
  addSchemaWithUri("common/participant.schema.json", efpBase, ajv);
  addSchemaWithUri("common/provenance.schema.json", efpBase, ajv);
  addSchemaWithUri("common/record-metadata.schema.json", efpBase, ajv);
  addSchemaWithUri("facts/association.schema.json", efpBase, ajv);
  addSchemaWithUri("facts/observation.schema.json", efpBase, ajv);
  addSchemaWithUri("facts/measurement.schema.json", efpBase, ajv);
  addSchemaWithUri("facts/event.schema.json", efpBase, ajv);

  const efpValidators = {
    association: ajv.getSchema("http://scan.mw/facts/association.schema.json")!,
    observation: ajv.getSchema("http://scan.mw/facts/observation.schema.json")!,
    measurement: ajv.getSchema("http://scan.mw/facts/measurement.schema.json")!,
    event: ajv.getSchema("http://scan.mw/facts/event.schema.json")!
  };

  apiValidatorsMap[cacheKey] = apiValidators;
  efpValidatorsMap[cacheKey] = efpValidators;
  return { apiValidators, efpValidators };
}`;

content = content.replace(/function initValidators[\s\S]*?efpValidators = \{[\s\S]*?\};\n\}/, initReplacement);
content = content.replace(/initValidators\(params\.callableApiVersion, params\.efpModelVersion\);/g, `const { apiValidators, efpValidators } = initValidators(params.callableApiVersion, params.efpModelVersion);`);

content = content.replace(/apiValidators!\.request/g, 'apiValidators.request');
content = content.replace(/efpValidators!\[factType\]/g, 'efpValidators[factType]');
content = content.replace(/ajv\.errorsText\(apiValidators\.request\.errors\)/g, 'getAjvInstance(`${params.callableApiVersion}|${params.efpModelVersion}`).errorsText(apiValidators.request.errors)');
content = content.replace(/ajv\.errorsText\(efpValidators\[factType\]\.errors\)/g, 'getAjvInstance(`${params.callableApiVersion}|${params.efpModelVersion}`).errorsText(efpValidators[factType].errors)');

fs.writeFileSync('functions/src/logicalFactBuilder.ts', content);
