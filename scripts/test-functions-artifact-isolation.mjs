import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createRequire } from 'node:module';

const rootDir = path.resolve(new URL('..', import.meta.url).pathname);
function fail(msg) { console.error(`❌ ${msg}`); process.exit(1); }
function assertExists(p, label) { if (!fs.existsSync(p)) fail(`Missing ${label}: ${p}`); }
function copyArtifact(targetRoot) {
  const src = path.join(rootDir, 'functions');
  const dst = path.join(targetRoot, 'functions');
  for (const item of ['lib','vendor','package.json','package-lock.json','node_modules']) fs.cpSync(path.join(src,item), path.join(dst,item), { recursive:true, dereference:false });
  return dst;
}
async function check(functionsDir) {
  assertExists(path.join(functionsDir,'lib','submitFactCommand.js'), 'compiled submitFactCommand');
  const req = createRequire(path.join(functionsDir, 'lib', 'index.js'));
  const nodeModuleLink = path.join(functionsDir, 'node_modules', '@scan', 'efp-model');
  assertExists(nodeModuleLink, '@scan/efp-model in functions/node_modules');
  const modelPath = req.resolve('@scan/efp-model');
  if (!modelPath.includes(`${path.sep}vendor${path.sep}efp-model`) && !modelPath.includes(`${path.sep}node_modules${path.sep}@scan${path.sep}efp-model`)) fail(`@scan/efp-model resolved outside functions artifact: ${modelPath}`);
  const identity = await import(pathToFileURL(path.join(functionsDir,'lib','canonicalRequestIdentity.js')).href);
  const logical = await import(pathToFileURL(path.join(functionsDir,'lib','logicalFactBuilder.js')).href);
  await import(pathToFileURL(path.join(functionsDir,'lib','submitFactCommand.js')).href);
  const vendorContracts = path.join(functionsDir, 'vendor', 'contracts');
  const profile = JSON.parse(fs.readFileSync(path.join(vendorContracts, 'runtime-profile.json'), 'utf8'));
  if (profile.applicationVersion !== '2.0.20' || profile.callableApiVersion !== '1.1.8' || profile.efpModelVersion !== '3.0.0') fail('runtime-profile.json has unexpected versions');
  assertExists(path.join(vendorContracts,'callable-functions-api','active-version.json'), 'active-version.json');
  const apiDir = path.join(vendorContracts, 'callable-functions-api', profile.callableApiVersion);
  const efpDir = path.join(vendorContracts, 'efp-model', profile.efpModelVersion);
  const ajv = new Ajv({ allErrors:true, strict:false }); addFormats(ajv);
  for (const sf of ['association-command-data.schema.json','observation-command-data.schema.json','measurement-command-data.schema.json','event-command-data.schema.json']) ajv.addSchema(JSON.parse(fs.readFileSync(path.join(apiDir,sf),'utf8')), sf);
  ajv.compile(JSON.parse(fs.readFileSync(path.join(apiDir,'submit-fact-command-request.schema.json'),'utf8')));
  for (const fact of ['association','observation','measurement','event']) assertExists(path.join(efpDir, 'facts', `${fact}.schema.json`), `${fact} EFP schema`);
  const hash = identity.getCanonicalRequestIdentity('1.1.8', 'association', { participants:[{role:'object', ref:{entityType:'object', id:'obj1'}}] });
  if (hash.requestHashVersion !== 'sha256-canonical-json-v1' || hash.canonicalJsonVersion !== 1) fail('canonical identity constants mismatch');
  const base = { factId:'018f2f21-7f91-7f00-8000-000000000000', ownerId:'user1', receivedAt:'2024-01-01T00:00:00.000Z', recordCreatedAt:'2024-01-01T00:00:00.000Z', actorUid:'user1', efpModelVersion:'3.0.0', callableApiVersion:'1.1.8' };
  const samples = [
    { commandId:'00000000-0000-4000-8000-000000000000', factType:'association', data:{ operation:'attach', participants:[{ role:'object', ref:{ entityType:'object', id:'obj1'}},{ role:'marker', ref:{entityType:'marker', id:'mk1'}}], provenance:{source:'user_confirmed', confidence:'high'}, effectiveAt:'2024-01-01T00:00:00.000Z'}},
    { commandId:'00000000-0000-4000-8000-000000000000', factType:'observation', data:{ participants:[{ role:'object', ref:{entityType:'object', id:'obj1'}}], observationType:'visual', time:{observedAt:'2024-01-01T00:00:00.000Z'}, provenance:{source:'user_confirmed', confidence:'high'}}},
    { commandId:'00000000-0000-4000-8000-000000000000', factType:'measurement', data:{ participants:[{ role:'object', ref:{entityType:'object', id:'obj1'}}], measurementType:'temperature', time:{measuredAt:'2024-01-01T00:00:00.000Z'}, provenance:{source:'location_measurement', confidence:'high'}}},
    { commandId:'00000000-0000-4000-8000-000000000000', factType:'event', data:{ participants:[{ role:'place', ref:{entityType:'place', id:'pl1'}}], eventType:'maintenance', time:{occurredAt:'2024-01-01T00:00:00.000Z'}, provenance:{source:'user_report', confidence:'high'}}}
  ];
  for (const data of samples) logical.buildLogicalFact({ ...base, data });
}
function runMutation(label, mutator, shouldFail=true) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-functions-compiled-'));
  const functionsDir = copyArtifact(tmp);
  if (mutator) mutator(functionsDir);
  const result = spawnSync(process.execPath, [new URL(import.meta.url).pathname, '--check-only', functionsDir], { cwd: tmp, encoding:'utf8' });
  if (shouldFail && result.status === 0) fail(`${label} mutation unexpectedly passed`);
  if (!shouldFail && result.status !== 0) fail(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}
if (process.argv[2] === '--check-only') await check(path.resolve(process.argv[3]));
else {
  runMutation('baseline compiled isolation', null, false);
  runMutation('missing runtime profile', f => fs.rmSync(path.join(f,'vendor/contracts/runtime-profile.json')));
  runMutation('missing active version', f => fs.rmSync(path.join(f,'vendor/contracts/callable-functions-api/active-version.json')));
  runMutation('missing association schema', f => fs.rmSync(path.join(f,'vendor/contracts/efp-model/3.0.0/facts/association.schema.json')));
  runMutation('missing efp vendor', f => { fs.rmSync(path.join(f,'vendor/efp-model'), {recursive:true, force:true}); fs.rmSync(path.join(f,'node_modules/@scan/efp-model'), {recursive:true, force:true}); });
  runMutation('missing compiled lib', f => fs.rmSync(path.join(f,'lib'), {recursive:true, force:true}));
  console.log('✅ Compiled functions artifact isolation validation passed.');
}
