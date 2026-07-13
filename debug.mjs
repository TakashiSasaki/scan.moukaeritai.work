import fs from 'fs';
let code = fs.readFileSync('functions/test/submitFactCommandAuthority.test.ts', 'utf8');
code = code.replace(/set: mockSet\.mockImplementation\(\(ref, data\) => \{/g, `set: mockSet.mockImplementation((ref, data) => {
         console.log("MOCKSET CALLED WITH", ref?.path);`);
fs.writeFileSync('functions/test/submitFactCommandAuthority.test.ts', code);
