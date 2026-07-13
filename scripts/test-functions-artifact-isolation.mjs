import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createRequire } from 'node:module';

const rootDir = path.resolve(new URL('..', import.meta.url).pathname);
function fail(msg) { console.error(`❌ ${msg}`); process.exit(1); }
function assertExists(p, label) { if (!fs.existsSync(p)) fail(`Missing ${label}: ${p}`); }
function copyArtifact(targetFunctions) {
  fs.mkdirSync(targetFunctions, { recursive: true });
  for (const name of ['lib', 'vendor', 'package.json', 'package-lock.json', 'node_modules']) {
    const src = path.join(rootDir, 'functions', name);
    assertExists(src, `functions/${name}`);
    fs.cpSync(src, path.join(targetFunctions, name), { recursive: true, dereference: false });
  }
}
function runCheck(mutator, shouldFail, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-functions-artifact-'));
  const functionsDir = path.join(dir, 'functions');
  copyArtifact(functionsDir);
  if (mutator) mutator(functionsDir);
  const result = spawnSync(process.execPath, [new URL(import.meta.url).pathname, '--check-only', functionsDir], { cwd: functionsDir, encoding: 'utf8' });
  if (shouldFail && result.status === 0) fail(`${label} mutation unexpectedly passed`);
  if (!shouldFail && result.status !== 0) fail(`${label} unexpectedly failed:\n${result.stdout}\n${result.stderr}`);
}
async function check(functionsDir) {
  const vendorContracts = path.join(functionsDir, 'vendor', 'contracts');
  const runtimeProfilePath = path.join(vendorContracts, 'runtime-profile.json');
  const activeVersionPath = path.join(vendorContracts, 'callable-functions-api', 'active-version.json');
  assertExists(path.join(functionsDir, 'lib'), 'compiled lib');
  assertExists(runtimeProfilePath, 'runtime-profile.json');
  assertExists(activeVersionPath, 'active-version.json');
  const profile = JSON.parse(fs.readFileSync(runtimeProfilePath, 'utf8'));
  if (profile.applicationVersion !== '2.0.20' || profile.callableApiVersion !== '1.1.8' || profile.efpModelVersion !== '3.0.0') fail('runtime-profile.json has unexpected versions');
  const active = JSON.parse(fs.readFileSync(activeVersionPath, 'utf8'));
  if (active.activeVersion !== profile.callableApiVersion || active.version !== profile.callableApiVersion) fail('active-version.json does not match runtime profile');
  const ajv = new Ajv({ allErrors: true, strict: false }); addFormats(ajv);
  const apiDir = path.join(vendorContracts, 'callable-functions-api', profile.callableApiVersion);
  const efpDir = path.join(vendorContracts, 'efp-model', profile.efpModelVersion);
  for (const sf of ['association-command-data.schema.json','observation-command-data.schema.json','measurement-command-data.schema.json','event-command-data.schema.json']) ajv.addSchema(JSON.parse(fs.readFileSync(path.join(apiDir, sf), 'utf8')), sf);
  ajv.compile(JSON.parse(fs.readFileSync(path.join(apiDir, 'submit-fact-command-request.schema.json'), 'utf8')));
  for (const fact of ['association','observation','measurement','event']) assertExists(path.join(efpDir, 'facts', `${fact}.schema.json`), `${fact} EFP schema`);
  const req = createRequire(path.join(functionsDir, 'lib', 'index.js'));
  const modelPackagePath = path.join(functionsDir, 'node_modules', '@scan', 'efp-model');
  assertExists(modelPackagePath, '@scan/efp-model in functions/node_modules');
  const modelPath = req.resolve('@scan/efp-model');
  const model = await import(pathToFileURL(modelPath).href);
  if (typeof model.buildFactIndexFields !== 'function') fail('@scan/efp-model missing buildFactIndexFields');
  const identity = await import(pathToFileURL(path.join(functionsDir, 'lib', 'canonicalRequestIdentity.js')).href);
  const logical = await import(pathToFileURL(path.join(functionsDir, 'lib', 'logicalFactBuilder.js')).href);
  await import(pathToFileURL(path.join(functionsDir, 'lib', 'submitFactCommand.js')).href);
  const hash = identity.getCanonicalRequestIdentity('1.1.8', 'association', { participants: [{ role:'object', ref:{ entityType:'object', id:'obj1' }}] });
  if (hash.canonicalJsonVersion !== 1 || hash.requestHashVersion !== 'sha256-canonical-json-v1') fail('canonical identity versions mismatch');
  const base = { factId:'018f2f21-7f91-7f00-8000-000000000000', ownerId:'user1', receivedAt:'2024-01-01T00:00:00.000Z', recordCreatedAt:'2024-01-01T00:00:00.000Z', actorUid:'user1', efpModelVersion:'3.0.0', callableApiVersion:'1.1.8' };
  const samples = [
    { commandId:'00000000-0000-4000-8000-000000000000', factType:'association', data:{ operation:'attach', participants:[{ role:'object', ref:{ entityType:'object', id:'obj1'}},{ role:'marker', ref:{entityType:'marker', id:'mk1'}}], provenance:{source:'user_confirmed', confidence:'high'}, effectiveAt:'2024-01-01T00:00:00.000Z'}},
    { commandId:'00000000-0000-4000-8000-000000000000', factType:'observation', data:{ participants:[{ role:'object', ref:{entityType:'object', id:'obj1'}}], observationType:'visual', time:{observedAt:'2024-01-01T00:00:00.000Z'}, provenance:{source:'user_confirmed', confidence:'high'}}},
    { commandId:'00000000-0000-4000-8000-000000000000', factType:'measurement', data:{ participants:[{ role:'object', ref:{entityType:'object', id:'obj1'}}], measurementType:'temperature', time:{measuredAt:'2024-01-01T00:00:00.000Z'}, provenance:{source:'location_measurement', confidence:'high'}}},
    { commandId:'00000000-0000-4000-8000-000000000000', factType:'event', data:{ participants:[{ role:'place', ref:{entityType:'place', id:'pl1'}}], eventType:'maintenance', time:{occurredAt:'2024-01-01T00:00:00.000Z'}, provenance:{source:'user_report', confidence:'high'}}}
  ];
  for (const data of samples) logical.buildLogicalFact({ ...base, data });
}
if (process.argv[2] === '--check-only') await check(path.resolve(process.argv[3]));
else {
  runCheck(null, false, 'isolated compiled artifact');
  runCheck(f => fs.rmSync(path.join(f, 'vendor/contracts/runtime-profile.json')), true, 'missing runtime profile');
  runCheck(f => fs.rmSync(path.join(f, 'vendor/contracts/callable-functions-api/active-version.json')), true, 'missing active version');
  runCheck(f => fs.rmSync(path.join(f, 'vendor/contracts/efp-model/3.0.0/facts/association.schema.json')), true, 'missing Association schema');
  runCheck(f => fs.rmSync(path.join(f, 'node_modules/@scan/efp-model'), { recursive: true, force: true }), true, 'missing @scan/efp-model');
  runCheck(f => fs.rmSync(path.join(f, 'lib'), { recursive: true, force: true }), true, 'missing compiled lib');
  console.log('✅ Isolated functions artifact validation passed.');
}
