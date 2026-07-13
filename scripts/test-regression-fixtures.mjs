import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import Ajv from 'ajv';import addFormats from 'ajv-formats';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'); const dir=path.join(root,'contracts/fixtures/regression'); function fail(m){throw new Error(m)}
if(fs.existsSync(path.join(root,'contracts/fixtures/regressions'))) fail('legacy regressions directory must not exist');
const requiredRunners=['sha256-known-vector','callable-schema-validation','participant-index','submit-fact-idempotency','association-transition','artifact-isolation-mutation','query-index-mutation','documentation-mutation','version-governance-mutation','stride-manifest-mutation'];
const ajv=new Ajv({allErrors:true,strict:false}); addFormats(ajv); const fixtureSchema=JSON.parse(fs.readFileSync(path.join(dir,'fixture.schema.json'),'utf8')); const validateFixture=ajv.compile(fixtureSchema);
const profile=JSON.parse(fs.readFileSync(path.join(root,'contracts/profiles/current-application.json'),'utf8')); const api=profile.contracts['callable-functions-api']; const apiDir=path.join(root,'contracts/packages/callable-functions-api',api); for(const f of ['association-command-data','observation-command-data','measurement-command-data','event-command-data']) ajv.addSchema(JSON.parse(fs.readFileSync(path.join(apiDir,`${f}.schema.json`),'utf8')),`${f}.schema.json`); const validateReq=ajv.compile(JSON.parse(fs.readFileSync(path.join(apiDir,'submit-fact-command-request.schema.json'),'utf8')));
const behavior=(file)=>execFileSync(process.execPath,['./node_modules/tsx/dist/cli.mjs','scripts/run-regression-behavior.ts',file],{cwd:root,stdio:'pipe'});
const run={
 'sha256-known-vector':fx=>{const h=crypto.createHash('sha256').update(fx.input.text,'utf8').digest('hex'); if(h!==fx.expected.sha256) fail(`${fx.id} hash mismatch`)},
 'callable-schema-validation':fx=>{const data=JSON.parse(fs.readFileSync(path.join(root,fx.input.path),'utf8')); const ok=validateReq(data); if(ok!==fx.expected.valid) fail(`${fx.id} schema expectation mismatch ${ajv.errorsText(validateReq.errors)}`)},
 'participant-index':(fx,file)=>behavior(file), 'submit-fact-idempotency':(fx,file)=>behavior(file), 'association-transition':(fx,file)=>behavior(file),
 'artifact-isolation-mutation':()=>execFileSync(process.execPath,['scripts/test-functions-artifact-isolation.mjs','--self-test'],{cwd:root,stdio:'pipe'}),
 'query-index-mutation':()=>execFileSync(process.execPath,['scripts/test-query-index-contract.mjs','--self-test'],{cwd:root,stdio:'pipe'}),
 'documentation-mutation':()=>execFileSync(process.execPath,['scripts/validate-documentation-state.mjs'],{cwd:root,stdio:'pipe'}),
 'version-governance-mutation':()=>execFileSync(process.execPath,['scripts/verify-version.mjs','--self-test'],{cwd:root,stdio:'pipe'}),
 'stride-manifest-mutation':()=>execFileSync(process.execPath,['scripts/test-stride-completion.mjs','--self-test'],{cwd:root,stdio:'pipe'})
};
const seen=new Set(); for(const fileName of fs.readdirSync(dir).filter(f=>f.endsWith('.json')&&f!=='fixture.schema.json')){const file=path.join(dir,fileName); const fx=JSON.parse(fs.readFileSync(file,'utf8')); if(!validateFixture(fx)) fail(`${fileName} schema invalid: ${ajv.errorsText(validateFixture.errors)}`); if(!run[fx.runner]) fail(`${fx.id} unknown runner ${fx.runner}`); seen.add(fx.runner); run[fx.runner](fx,file)}
for(const r of requiredRunners) if(!seen.has(r)) fail(`missing behavioral runner fixture ${r}`); console.log(`Behavioral regression fixtures passed with runners: ${[...seen].sort().join(', ')}.`);
