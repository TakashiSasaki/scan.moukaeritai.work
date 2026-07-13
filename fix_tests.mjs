import fs from 'fs';

let lfTest = fs.readFileSync('functions/test/logicalFactBuilder.test.ts', 'utf8');
lfTest = lfTest.replace(/factType: "([^"]+)",\n\s*data: \{\n\s*commandId: "([^"]+)",/g, 'commandId: "$2",\n      factType: "$1",\n      data: {');
fs.writeFileSync('functions/test/logicalFactBuilder.test.ts', lfTest);

let authTest = fs.readFileSync('functions/test/submitFactCommandAuthority.test.ts', 'utf8');
authTest = authTest.replace(/const \{ mockSet, mockGet, mockRunTransaction, mockWhere \} = vi.hoisted/, 'const { mockSet, mockGet, mockRunTransaction, mockWhere, idempotencyState } = vi.hoisted');
fs.writeFileSync('functions/test/submitFactCommandAuthority.test.ts', authTest);
