import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

describe("version-verifier integration tests", () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "version-verifier-test-"));
    process.chdir(tmpDir);

    // Initialize git
    execSync('git init && git branch -m main');
    execSync('git config user.name "Test User"');
    execSync('git config user.email "test@example.com"');

    // Create necessary folders
    fs.mkdirSync('scripts');
    fs.mkdirSync('src');
    fs.mkdirSync('functions');
    fs.mkdirSync('packages/efp-model', { recursive: true });
    fs.mkdirSync('contracts/profiles', { recursive: true });
    fs.mkdirSync('contracts/governance', { recursive: true });

    // Copy script
    fs.copyFileSync(path.join(originalCwd, 'scripts', 'verify-version.mjs'), 'scripts/verify-version.mjs');

    // Create initial state
    writeJson('package.json', { version: "2.0.8" });
    writeJson('functions/package.json', { version: "2.0.8" });
    writeJson('packages/efp-model/package.json', { version: "2.0.8" });
    writeJson('contracts/profiles/current-application.json', { applicationVersion: "2.0.8" });
    fs.writeFileSync('README.md', 'Version 2.0.8');
    fs.writeFileSync('src/index.ts', 'console.log("hello");');
    
    execSync('git add -A');
    execSync('git commit -m "initial commit"');
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeJson = (file: string, data: any) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2)); };

  const runVerifier = () => {
    try {
      execSync('node scripts/verify-version.mjs', { stdio: 'pipe', env: { ...process.env, GITHUB_BASE_REF: '', GITHUB_SHA: '' } });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.stderr?.toString() || e.message };
    }
  };

  test("internal code change + version unchanged -> pass", () => {
    fs.writeFileSync('src/index.ts', 'console.log("changed");');
    execSync('git commit -am "change src"');
    const res = runVerifier();
    expect(res.success).toBe(true);
    execSync('git reset --hard HEAD~1'); // revert
  });

  test("version増加 -> pass", () => {
    fs.writeFileSync('src/index.ts', 'console.log("changed");');
    writeJson('package.json', { version: "2.0.9" });
    writeJson('functions/package.json', { version: "2.0.9" });
    writeJson('packages/efp-model/package.json', { version: "2.0.9" });
    writeJson('contracts/profiles/current-application.json', { applicationVersion: "2.0.9" });
    fs.writeFileSync('README.md', 'Version 2.0.9');
    execSync('git commit -am "bump version"');
    
    const res = runVerifier();
    expect(res.success).toBe(true);
    execSync('git reset --hard HEAD~1');
  });

  test("version減少 -> fail", () => {
    fs.writeFileSync('src/index.ts', 'console.log("changed");');
    writeJson('package.json', { version: "2.0.7" });
    execSync('git commit -am "decrease version"');
    const res = runVerifier();
    expect(res.success).toBe(false);
    expect(res.error).toContain("did not monotonically increase");
    execSync('git reset --hard HEAD~1');
  });

  test("invalid SemVer -> fail", () => {
    fs.writeFileSync('src/index.ts', 'console.log("changed");');
    writeJson('package.json', { version: "2.0" });
    execSync('git commit -am "invalid semver"');
    const res = runVerifier();
    expect(res.success).toBe(false);
    expect(res.error).toContain("Invalid SemVer format");
    execSync('git reset --hard HEAD~1');
  });

  test("base package.json欠落 -> fail", () => {
    execSync('git checkout -b no-base-pkg');
    execSync('git rm package.json');
    execSync('git commit -m "remove package.json"');
    
    // Create a new commit on top where we pretend we bumped
    writeJson('package.json', { version: "2.0.9" });
    execSync('git add package.json');
    execSync('git commit -m "add back package.json"');
    
    const res = runVerifier();
    expect(res.success).toBe(false);
    expect(res.error).toContain("Git comparison failed");
    execSync('git checkout main');
    execSync('git branch -D no-base-pkg');
  });

  test("profile, README, and package version duplication are not required", () => {
    writeJson('package.json', { version: '2.0.9' });
    // Deliberately leave functions/package.json, efp-model package.json, profile, and README at 2.0.8.
    execSync('git commit -am "bump root app version only"');
    const res = runVerifier();
    expect(res.success).toBe(true);
    execSync('git reset --hard HEAD~1');
  });

  test("major bump + approval recordなし -> fail", () => {
    writeJson('package.json', { version: "3.0.0" });
    writeJson('functions/package.json', { version: "3.0.0" });
    writeJson('packages/efp-model/package.json', { version: "3.0.0" });
    writeJson('contracts/profiles/current-application.json', { applicationVersion: "3.0.0" });
    fs.writeFileSync('README.md', 'Version 3.0.0');
    execSync('git commit -am "major bump without approval"');
    const res = runVerifier();
    expect(res.success).toBe(false);
    expect(res.error).toContain("Major version bump detected without valid pre-existing human approval");
    execSync('git reset --hard HEAD~1');
  });

  test("major bump +同じ変更内だけのapproval record -> fail", () => {
    writeJson('package.json', { version: "3.0.0" });
    writeJson('functions/package.json', { version: "3.0.0" });
    writeJson('packages/efp-model/package.json', { version: "3.0.0" });
    writeJson('contracts/profiles/current-application.json', { applicationVersion: "3.0.0" });
    fs.writeFileSync('README.md', 'Version 3.0.0');
    writeJson('contracts/governance/major-bump-approval.json', { approvedVersion: "3.0.0" });
    execSync('git add contracts/governance/major-bump-approval.json');
    execSync('git commit -am "major bump with inline approval"');
    
    // The approval was added in the same commit, so it doesn't exist in baseRef
    const res = runVerifier();
    expect(res.success).toBe(false);
    expect(res.error).toContain("Major version bump detected without valid pre-existing human approval");
    execSync('git reset --hard HEAD~1');
  });

  test("major bump +baseに事前approvalあり -> pass", () => {
    // Commit the approval first
    writeJson('contracts/governance/major-bump-approval.json', { approvedVersion: "3.0.0" });
    execSync('git add contracts/governance/major-bump-approval.json');
    execSync('git commit -m "pre-approve major bump"');
    
    // Now do the bump
    writeJson('package.json', { version: "3.0.0" });
    writeJson('functions/package.json', { version: "3.0.0" });
    writeJson('packages/efp-model/package.json', { version: "3.0.0" });
    writeJson('contracts/profiles/current-application.json', { applicationVersion: "3.0.0" });
    fs.writeFileSync('README.md', 'Version 3.0.0');
    execSync('git commit -am "major bump"');
    
    const res = runVerifier();
    expect(res.success).toBe(true);
    execSync('git reset --hard HEAD~2'); // revert both
  });

  test("static-only command -> metadata validation passes even without Git history", () => {
    // Create a separate temp directory with NO git repository
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), "version-verifier-nongit-"));
    try {
      fs.mkdirSync(path.join(nonGitDir, 'scripts'));
      fs.mkdirSync(path.join(nonGitDir, 'functions'));
      fs.mkdirSync(path.join(nonGitDir, 'packages/efp-model'), { recursive: true });
      fs.mkdirSync(path.join(nonGitDir, 'contracts/profiles'), { recursive: true });
      fs.copyFileSync(path.join(originalCwd, 'scripts', 'verify-version.mjs'), path.join(nonGitDir, 'scripts', 'verify-version.mjs'));
      fs.writeFileSync(path.join(nonGitDir, 'package.json'), JSON.stringify({ version: "2.0.13" }));
      fs.writeFileSync(path.join(nonGitDir, 'functions', 'package.json'), JSON.stringify({ version: "2.0.13" }));
      fs.writeFileSync(path.join(nonGitDir, 'packages/efp-model/package.json'), JSON.stringify({ version: "2.0.13" }));
      fs.writeFileSync(path.join(nonGitDir, 'contracts/profiles/current-application.json'), JSON.stringify({ applicationVersion: "2.0.13" }));
      fs.writeFileSync(path.join(nonGitDir, 'README.md'), "Version 2.0.13");

      // Run with --static (should pass)
      execSync('node scripts/verify-version.mjs --static', { cwd: nonGitDir, stdio: 'pipe' });
      
      // Run without --static (should fail since it's not a git repository)
      let failed = false;
      try {
        execSync('node scripts/verify-version.mjs', { cwd: nonGitDir, stdio: 'pipe' });
      } catch (e) {
        failed = true;
      }
      expect(failed).toBe(true);
    } finally {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    }
  });

  test("Git comparison failure or base ref missing or not a git repository -> formal verification fails", () => {
    // Run the verifier with a completely invalid base ref
    let failed = false;
    try {
      execSync('git show completely-invalid-ref-12345:package.json', { stdio: 'pipe' });
    } catch (e) {
      // confirm git fails on invalid ref
    }

    try {
      execSync('node scripts/verify-version.mjs', { 
        stdio: 'pipe', 
        env: { ...process.env, GITHUB_BASE_REF: 'completely-invalid-ref-12345' } 
      });
      failed = false;
    } catch (e) {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});
