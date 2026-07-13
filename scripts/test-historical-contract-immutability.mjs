import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const approved={'contracts/packages/callable-functions-api/1.1.8':'85b8e85829eecaeec47faa2939f8d6b9983d9e009830ca0a8c2a39474002e201'};
function digest(dir){const h=crypto.createHash('sha256'); for(const f of fs.readdirSync(path.join(root,dir)).sort()){const full=path.join(root,dir,f); if(fs.statSync(full).isFile()){h.update(f+'\0'); h.update(fs.readFileSync(full)); h.update('\0');}} return h.digest('hex');}
for(const [dir,hash] of Object.entries(approved)){const actual=digest(dir); if(actual!==hash) throw new Error(`Historical contract package changed: ${dir} expected ${hash} actual ${actual}`);} console.log('Historical contract immutability passed.');
