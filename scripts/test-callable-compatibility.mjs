import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const activeDir = path.join(rootDir, 'contracts/packages/callable-functions-api/1.1.7');
const contract = JSON.parse(fs.readFileSync(path.join(activeDir, 'contract.json'), 'utf8'));
const compatibleWith = contract.compatibility?.compatibleWith || [];
for (const v of ['1.1.6','1.1.5']) if (!compatibleWith.includes(v)) throw new Error(`1.1.7 compatibility missing ${v}`);
const ajv = new Ajv({ allErrors:true, strict:false }); addFormats(ajv);
for (const f of ['association-command-data','observation-command-data','measurement-command-data','event-command-data']) ajv.addSchema(JSON.parse(fs.readFileSync(path.join(activeDir, `${f}.schema.json`),'utf8')), `${f}.schema.json`);
const requestValidator = ajv.compile(JSON.parse(fs.readFileSync(path.join(activeDir, 'submit-fact-command-request.schema.json'), 'utf8')));
function assertAccept(file, label) { const data=JSON.parse(fs.readFileSync(file,'utf8')); if (!requestValidator(data)) throw new Error(`${label} not accepted by 1.1.7: ${ajv.errorsText(requestValidator.errors)}`); }
function assertReject(data, label) { if (requestValidator(data)) throw new Error(`${label} unexpectedly accepted by 1.1.7`); }
const validFixtureNames = ['submit-fact-command-request.json','submit-fact-command-request-association.json','submit-fact-command-request-observation.json','submit-fact-command-request-measurement.json','submit-fact-command-request-event.json'];
for (const version of compatibleWith) {
  let count = 0;
  for (const name of validFixtureNames) {
    const versioned = path.join(rootDir, 'contracts/fixtures/compatibility', version, 'valid', name);
    const fallback = path.join(rootDir, 'contracts/fixtures/valid', name);
    const file = fs.existsSync(versioned) ? versioned : fallback;
    if (fs.existsSync(file)) { assertAccept(file, `${version}/${name}`); count++; }
  }
  if (count === 0) throw new Error(`No compatibility fixtures found for ${version}`);
}
const base = JSON.parse(fs.readFileSync(path.join(rootDir, 'contracts/fixtures/valid/submit-fact-command-request-association.json'), 'utf8'));
assertReject({ ...base, commandId: '018f2f21-7f91-7f00-8000-000000000000' }, 'UUIDv7 commandId fixture');
assertReject({ ...base, commandId: '00000000-0000-4000-7000-000000000000' }, 'invalid UUID variant fixture');
assertReject({ ...base, commandId: 'not-a-uuid' }, 'malformed UUID fixture');
console.log('Callable compatibility gate passed.');
