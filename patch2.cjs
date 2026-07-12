const fs = require('fs');
let content = fs.readFileSync('tests/version-verifier.test.ts', 'utf8');

// replace the 'version増加 -> pass' block
content = content.replace(/test\("version増加 -> pass", \(\) => {[\s\S]*?}\);/, `test("version増加 -> pass", () => {
    fs.writeFileSync('src/index.ts', 'console.log("changed");');
    writeJson('package.json', { version: "2.0.10" });
    writeJson('functions/package.json', { version: "2.0.10" });
    writeJson('packages/efp-model/package.json', { version: "2.0.10" });
    writeJson('contracts/profiles/current-application.json', { applicationVersion: "2.0.10" });
    fs.writeFileSync('README.md', 'Version 2.0.10');
    execSync('git commit -am "bump version"');
    
    const res = runVerifier();
    expect(res.success).toBe(true);
    execSync('git reset --hard HEAD~1');
  });`);

content = content.replace(/test\("profile version不一致 -> fail", \(\) => {[\s\S]*?}\);/, `test("profile version不一致 -> fail", () => {
    writeJson('package.json', { version: '2.0.10' });
    writeJson('functions/package.json', { version: '2.0.10' });
    writeJson('packages/efp-model/package.json', { version: '2.0.10' });
    // Don't update profile
    execSync('git commit -am "bump pkg only"');
    const res = runVerifier();
    expect(res.success).toBe(false);
    expect(res.error).toContain("Version mismatch in current-application.json");
    execSync('git reset --hard HEAD~1');
  });`);

content = content.replace(/test\("README version不一致 -> fail", \(\) => {[\s\S]*?}\);/, `test("README version不一致 -> fail", () => {
    writeJson('package.json', { version: "2.0.10" });
    writeJson('functions/package.json', { version: "2.0.10" });
    writeJson('packages/efp-model/package.json', { version: "2.0.10" });
    writeJson('contracts/profiles/current-application.json', { applicationVersion: "2.0.10" });
    // Don't update README
    execSync('git commit -am "bump pkgs only"');
    const res = runVerifier();
    expect(res.success).toBe(false);
    expect(res.error).toContain("README.md does not contain the current version");
    execSync('git reset --hard HEAD~1');
  });`);

fs.writeFileSync('tests/version-verifier.test.ts', content);
