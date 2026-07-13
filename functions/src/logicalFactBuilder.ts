import * as path from "path";
import * as fs from "fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { buildFactIndexFields } from "@scan/efp-model";

const ajvInstances: Record<string, Ajv> = {};
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

function loadAndParseSchema(fileName: string, baseFolder: string) {
  const vendorCandidates = [
    path.join(__dirname, "../vendor/contracts", baseFolder, fileName),
    path.join(__dirname, "../../vendor/contracts", baseFolder, fileName),
    path.join(process.cwd(), "vendor/contracts", baseFolder, fileName),
    path.join(process.cwd(), "functions/vendor/contracts", baseFolder, fileName),
  ];
  const testContractsRoot = process.env.SCAN_MW_CONTRACTS_ROOT;
  const testCandidates = process.env.NODE_ENV === "test" || testContractsRoot
    ? [
        ...(testContractsRoot ? [path.join(testContractsRoot, "packages", baseFolder, fileName)] : []),
        path.join(process.cwd(), "contracts/packages", baseFolder, fileName),
        path.join(process.cwd(), "../contracts/packages", baseFolder, fileName),
        path.join(process.cwd(), "../../contracts/packages", baseFolder, fileName),
      ]
    : [];

  for (const p of [...vendorCandidates, ...testCandidates]) {
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, "utf8"));
      if (!data.$id) {
         data.$id = "http://scan.mw/" + fileName.replace("../common/", "common/");
      }
      return data;
    }
  }
  throw new Error(`Schema file not found: ${fileName} in ${baseFolder}`);
}

function resolveRefs(schema: any, baseUri: string) {
  if (typeof schema !== "object" || schema === null) return schema;
  if (schema.$ref && typeof schema.$ref === "string") {
    let ref = schema.$ref;
    if (ref.startsWith("../common/")) {
       schema.$ref = "http://scan.mw/" + ref.substring(3);
    } else if (ref.endsWith(".schema.json#") || ref.endsWith(".schema.json")) {
       schema.$ref = "http://scan.mw/" + ref.replace("#", "");
    }
  }
  for (const key in schema) {
    resolveRefs(schema[key], baseUri);
  }
  return schema;
}

function addSchemaWithUri(fileName: string, baseFolder: string, ajv: Ajv) {
   const schema = loadAndParseSchema(fileName, baseFolder);
   resolveRefs(schema, "");
   schema.$id = "http://scan.mw/" + fileName;
   if (!ajv.getSchema(schema.$id)) {
      ajv.addSchema(schema, schema.$id);
   }
   if (fileName === "common/entity-reference.schema.json") {
      if (!ajv.getSchema("http://scan.mw/entity-reference.schema.json")) {
         ajv.addSchema(schema, "http://scan.mw/entity-reference.schema.json");
      }
   }
   return schema;
}

function initValidators(activeApiVersion: string, activeEfpVersion: string) {
  const cacheKey = `${activeApiVersion}|${activeEfpVersion}`;
  if (apiValidatorsMap[cacheKey] && efpValidatorsMap[cacheKey]) return {
    apiValidators: apiValidatorsMap[cacheKey],
    efpValidators: efpValidatorsMap[cacheKey]
  };

  const ajv = getAjvInstance(cacheKey);
  const apiBase = `callable-functions-api/${activeApiVersion}`;
  const efpBase = `efp-model/${activeEfpVersion}`;

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
}

export function buildLogicalFact(params: {
  data: any,
  factId: string,
  ownerId: string,
  receivedAt: string,
  recordCreatedAt: string,
  actorUid: string,
  efpModelVersion: string,
  callableApiVersion: string
}) {
  const { apiValidators, efpValidators } = initValidators(params.callableApiVersion, params.efpModelVersion);

  const { data, factId, ownerId, receivedAt, recordCreatedAt, actorUid } = params;

  const isReqValid = apiValidators.request(data);
  if (!isReqValid) {
    throw new Error(`Invalid request format: ${getAjvInstance(`${params.callableApiVersion}|${params.efpModelVersion}`).errorsText(apiValidators.request.errors)}`);
  }

  const factType = data.factType;
  const payload = data.data;
  const derived = buildFactIndexFields(payload.participants);

  const _meta = {
    schemaVersion: parseInt(params.efpModelVersion.split(".")[0], 10),
    
    recordCreatedAt: recordCreatedAt,
    recordCreatedBy: actorUid,
    recordUpdatedAt: recordCreatedAt,
    recordUpdatedBy: actorUid
  };

  const provenance = {
    ...(payload.provenance || {}),
    actorUid
  };

  let logicalFact: any = {
    ownerId,
    participants: payload.participants,
    ...derived,
    provenance,
    _meta
  };

  if (factType === "association") {
    logicalFact.associationId = factId;
    logicalFact.operation = payload.operation;
    if (payload.subjectAssociationId) logicalFact.subjectAssociationId = payload.subjectAssociationId;
    
    logicalFact.effectiveAt = payload.effectiveAt || receivedAt;
    if (payload.note) logicalFact.note = payload.note;
    if (payload.source) logicalFact.source = payload.source;

  } else if (factType === "observation") {
    logicalFact.observationId = factId;
    logicalFact.observationType = payload.observationType;
    logicalFact.time = {
      observedAt: payload.time.observedAt,
      receivedAt: receivedAt
    };
    if (payload.source) logicalFact.source = payload.source;
    if (payload.note) logicalFact.note = payload.note;
    if (payload.payload) logicalFact.payload = payload.payload;

  } else if (factType === "measurement") {
    logicalFact.measurementId = factId;
    logicalFact.measurementType = payload.measurementType;
    logicalFact.time = {
      measuredAt: payload.time.measuredAt,
      receivedAt: receivedAt
    };
    if (payload.position) {
      logicalFact.position = payload.position;
    }
    if (payload.place) logicalFact.place = payload.place;
    if (payload.signal) logicalFact.signal = payload.signal;
    if (payload.note) logicalFact.note = payload.note;

  } else if (factType === "event") {
    logicalFact.eventId = factId;
    logicalFact.eventType = payload.eventType;
    logicalFact.time = {
      occurredAt: payload.time.occurredAt,
      receivedAt: receivedAt
    };
    if (payload.note) logicalFact.note = payload.note;
  }

  const isValid = efpValidators[factType](logicalFact);
  if (!isValid) {
    const errorDetails = getAjvInstance(`${params.callableApiVersion}|${params.efpModelVersion}`).errorsText(efpValidators[factType].errors);
    console.error(`[EFP Schema Validation Failed] factId=${factId}: ${errorDetails}`);
    throw new Error(`Logical Fact schema validation failed. details: ${errorDetails}`);
  }

  return logicalFact;
}
