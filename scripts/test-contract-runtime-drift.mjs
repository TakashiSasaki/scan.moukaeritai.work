import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['./node_modules/tsx/dist/cli.mjs','scripts/check-contract-runtime-drift.ts'],{stdio:'inherit'});
