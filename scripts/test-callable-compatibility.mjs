import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(fs.readFileSync(path.join(rootDir, 'contracts/profiles/current-application.json'), 'utf8'));
const activeVersion = profile.contracts['callable-functions-api'];
const activeDir = path.join(rootDir, 'contracts/packages/callable-functions-api', activeVersion);
const contract = JSON.parse(fs.readFileSync(path.join(activeDir, 'contract.json'), 'utf8'));
const compatibleWith = contract.compatibility?.compatibleWith || [];
const ajv = new Ajv({ allErrors:true, strict:false }); addFormats(ajv);
for (const f of ['association-command-data','observation-command-data','measurement-command-data','event-command-data']) ajv.addSchema(JSON.parse(fs.readFileSync(path.join(activeDir, `${f}.schema.json`),'utf8')), `${f}.schema.json`);
const requestValidator = ajv.compile(JSON.parse(fs.readFileSync(path.join(activeDir, 'submit-fact-command-request.schema.json'), 'utf8')));
function assertAccept(file, label) { const data=JSON.parse(fs.readFileSync(file,'utf8')); if (!requestValidator(data)) throw new Error(`${label} not accepted by ${activeVersion}: ${ajv.errorsText(requestValidator.errors)}`); }
function assertReject(data, label) { if (requestValidator(data)) throw new Error(`${label} unexpectedly accepted by ${activeVersion}`); }
const validFixtureNames = ['submit-fact-command-request-association.json','submit-fact-command-request-observation.json','submit-fact-command-request-measurement.json','submit-fact-command-request-event.json'];
for (const version of compatibleWith) {
  const dir = path.join(rootDir, 'contracts/fixtures/compatibility', version, 'valid');
  if (!fs.existsSync(dir)) throw new Error(`Missing version-specific compatibility fixture directory: ${dir}`);
  for (const name of validFixtureNames) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) throw new Error(`Missing version-specific compatibility fixture: ${version}/valid/${name}`);
    assertAccept(file, `${version}/${name}`);
  }
}
const base = JSON.parse(fs.readFileSync(path.join(rootDir, 'contracts/fixtures/valid/submit-fact-command-request-association.json'), 'utf8'));
assertReject({ ...base, commandId: '018f2f21-7f91-7f00-8000-000000000000' }, 'UUIDv7 commandId fixture');
assertReject({ ...base, commandId: '00000000-0000-4000-7000-000000000000' }, 'invalid UUID variant fixture');
assertReject({ ...base, commandId: 'not-a-uuid' }, 'malformed UUID fixture');
console.log(`Callable compatibility gate passed for ${activeVersion}.`);
