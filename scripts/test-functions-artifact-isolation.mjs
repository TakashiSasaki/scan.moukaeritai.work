import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createRequire } from 'node:module';

const rootDir = path.resolve(new URL('..', import.meta.url).pathname);
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-functions-artifact-'));
const isolatedFunctions = path.join(tmpRoot, 'functions');
fs.cpSync(path.join(rootDir, 'functions'), isolatedFunctions, { recursive: true, filter: (src) => !src.includes(`${path.sep}node_modules`) && !src.includes(`${path.sep}lib`) });
fs.cpSync(path.join(rootDir, 'node_modules'), path.join(tmpRoot, 'node_modules'), { recursive: true, dereference: false });

function fail(msg) { console.error(`❌ ${msg}`); process.exit(1); }
function assertExists(p, label) { if (!fs.existsSync(p)) fail(`Missing ${label}: ${p}`); }
function runCheck(mutator, shouldFail, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-functions-artifact-mut-'));
  fs.cpSync(isolatedFunctions, path.join(dir, 'functions'), { recursive: true });
  fs.symlinkSync(path.join(rootDir, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  const fnNodeModules = path.join(dir, 'functions', 'node_modules');
  fs.mkdirSync(path.join(fnNodeModules, '@scan'), { recursive: true });
  fs.symlinkSync(path.join(dir, 'functions', 'vendor', 'efp-model'), path.join(fnNodeModules, '@scan', 'efp-model'), 'dir');
  fs.mkdirSync(path.join(fnNodeModules, 'firebase-functions', 'v2'), { recursive: true });
  fs.writeFileSync(path.join(fnNodeModules, 'firebase-functions', 'package.json'), JSON.stringify({ type: 'module', exports: { './v2/https': './v2/https.js' } }));
  fs.writeFileSync(path.join(fnNodeModules, 'firebase-functions', 'v2', 'https.js'), 'export class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } } export function onCall(fn){ return fn; }\n');
  fs.mkdirSync(path.join(fnNodeModules, 'firebase-admin'), { recursive: true });
  fs.writeFileSync(path.join(fnNodeModules, 'firebase-admin', 'package.json'), JSON.stringify({ type: 'module', exports: { '.': './index.js', './firestore': './firestore.js' } }));
  fs.writeFileSync(path.join(fnNodeModules, 'firebase-admin', 'index.js'), 'export function app(){ return {}; }\n');
  fs.writeFileSync(path.join(fnNodeModules, 'firebase-admin', 'firestore.js'), 'export function getFirestore(){ return {}; } export class Timestamp { static now(){ return new Timestamp(); } static fromDate(){ return new Timestamp(); } } export class GeoPoint { constructor(latitude, longitude){ this.latitude=latitude; this.longitude=longitude; } }\n');
  if (mutator) mutator(path.join(dir, 'functions'));
  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', new URL(import.meta.url).pathname, '--check-only', path.join(dir, 'functions')], { cwd: dir, encoding: 'utf8' });
  if (shouldFail && result.status === 0) fail(`${label} mutation unexpectedly passed`);
  if (!shouldFail && result.status !== 0) fail(`${label} unexpectedly failed:\n${result.stdout}\n${result.stderr}`);
}

async function check(functionsDir) {
  const vendorContracts = path.join(functionsDir, 'vendor', 'contracts');
  const runtimeProfilePath = path.join(vendorContracts, 'runtime-profile.json');
  assertExists(runtimeProfilePath, 'runtime-profile.json');
  const profile = JSON.parse(fs.readFileSync(runtimeProfilePath, 'utf8'));
  if (profile.applicationVersion !== '2.0.18' || profile.callableApiVersion !== '1.1.7' || profile.efpModelVersion !== '3.0.0') fail('runtime-profile.json has unexpected versions');

  const ajv = new Ajv({ allErrors: true, strict: false }); addFormats(ajv);
  const apiDir = path.join(vendorContracts, 'callable-functions-api', profile.callableApiVersion);
  const efpDir = path.join(vendorContracts, 'efp-model', profile.efpModelVersion);
  assertExists(path.join(apiDir, 'submit-fact-command-request.schema.json'), 'Callable request schema');
  for (const sf of ['association-command-data.schema.json','observation-command-data.schema.json','measurement-command-data.schema.json','event-command-data.schema.json']) {
    ajv.addSchema(JSON.parse(fs.readFileSync(path.join(apiDir, sf), 'utf8')), sf);
  }
  ajv.compile(JSON.parse(fs.readFileSync(path.join(apiDir, 'submit-fact-command-request.schema.json'), 'utf8')));
  for (const fact of ['association','observation','measurement','event']) assertExists(path.join(efpDir, 'facts', `${fact}.schema.json`), `${fact} EFP schema`);

  const req = createRequire(path.join(functionsDir, 'index.js'));
  let modelPath;
  try { modelPath = req.resolve('@scan/efp-model'); } catch { modelPath = path.join(functionsDir, 'vendor', 'efp-model', 'dist', 'esm', 'index.js'); }
  const model = await import(pathToFileURL(modelPath).href);
  if (typeof model.buildFactIndexFields !== 'function') fail('@scan/efp-model missing buildFactIndexFields');
  const identity = await import(pathToFileURL(path.join(functionsDir, 'src', 'canonicalRequestIdentity.ts')).href);
  const logical = await import(pathToFileURL(path.join(functionsDir, 'src', 'logicalFactBuilder.ts')).href);
  await import(pathToFileURL(path.join(functionsDir, 'src', 'submitFactCommand.ts')).href);
  const hash = identity.getCanonicalRequestIdentity('1.1.7', 'association', { participants: [{ role:'object', ref:{ entityType:'object', id:'obj1' }}] });
  if (!hash.requestHash) fail('canonical identity did not produce requestHash');
  const base = { factId:'018f2f21-7f91-7f00-8000-000000000000', ownerId:'user1', receivedAt:'2024-01-01T00:00:00.000Z', recordCreatedAt:'2024-01-01T00:00:00.000Z', actorUid:'user1', efpModelVersion:'3.0.0', callableApiVersion:'1.1.7' };
  const samples = {
    association:{ commandId:'00000000-0000-4000-8000-000000000000', factType:'association', data:{ operation:'attach', participants:[{ role:'object', ref:{ entityType:'object', id:'obj1'}},{ role:'marker', ref:{entityType:'marker', id:'mk1'}}], provenance:{source:'user_confirmed', confidence:'high'}, effectiveAt:'2024-01-01T00:00:00.000Z'}},
    observation:{ commandId:'00000000-0000-4000-8000-000000000000', factType:'observation', data:{ participants:[{ role:'object', ref:{entityType:'object', id:'obj1'}}], observationType:'visual', time:{observedAt:'2024-01-01T00:00:00.000Z'}, provenance:{source:'user_confirmed', confidence:'high'}}},
    measurement:{ commandId:'00000000-0000-4000-8000-000000000000', factType:'measurement', data:{ participants:[{ role:'object', ref:{entityType:'object', id:'obj1'}}], measurementType:'temperature', time:{measuredAt:'2024-01-01T00:00:00.000Z'}, provenance:{source:'location_measurement', confidence:'high'}}},
    event:{ commandId:'00000000-0000-4000-8000-000000000000', factType:'event', data:{ participants:[{ role:'place', ref:{entityType:'place', id:'pl1'}}], eventType:'maintenance', time:{occurredAt:'2024-01-01T00:00:00.000Z'}, provenance:{source:'user_report', confidence:'high'}}}
  };
  for (const data of Object.values(samples)) logical.buildLogicalFact({ ...base, data });
}

if (process.argv[2] === '--check-only') {
  await check(path.resolve(process.argv[3]));
} else {
  runCheck(null, false, 'isolated artifact');
  runCheck(f => fs.rmSync(path.join(f, 'vendor/contracts/runtime-profile.json')), true, 'missing runtime profile');
  runCheck(f => fs.rmSync(path.join(f, 'vendor/contracts/efp-model/3.0.0/facts/association.schema.json')), true, 'missing EFP schema');
  console.log('✅ Isolated functions artifact validation passed.');
}
