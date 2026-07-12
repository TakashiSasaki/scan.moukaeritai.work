const fs = require('fs');
const content = fs.readFileSync('tests/version-verifier.test.ts', 'utf8');
const newContent = content.replace(
  `writeJson('package.json', { version: "2.0" });`,
  `writeJson('package.json', { version: "2.0" });
    writeJson('functions/package.json', { version: "2.0" });
    writeJson('packages/efp-model/package.json', { version: "2.0" });
    writeJson('contracts/profiles/current-application.json', { applicationVersion: "2.0" });
    fs.writeFileSync('README.md', 'Version 2.0');`
);
fs.writeFileSync('tests/version-verifier.test.ts', newContent);
