import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import {
  classifyChangedFiles as classifyFiles,
  isVerificationInfrastructureFile,
  buildVerificationPlan
} from "../scripts/lib/verify-fast-classifier.mjs";

describe("verify-fast integration and unit tests", () => {
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  test("classification rules - docs", () => {
    const res = classifyFiles(["README.md"]);
    expect(res.docs).toBe(true);
    expect(res.frontend).toBe(false);
  });

  test("classification rules - frontend", () => {
    const res = classifyFiles(["src/App.tsx"]);
    expect(res.frontend).toBe(true);
    expect(res.docs).toBe(false);
  });

  test("classification rules - routing", () => {
    const res = classifyFiles(["src/lib/routeCatalog.ts"]);
    expect(res.routing).toBe(true);
    expect(res.frontend).toBe(true);
  });

  test("classification rules - functions source", () => {
    const res = classifyFiles(["functions/src/index.ts"]);
    expect(res.functionsSource).toBe(true);
  });

  test("classification rules - functions packaging", () => {
    const res = classifyFiles(["functions/package.json"]);
    expect(res.functionsPackaging).toBe(true);
  });

  test("classification rules - efp-model", () => {
    const res = classifyFiles(["packages/efp-model/package.json"]);
    expect(res.efpBuild).toBe(true);
    expect(res.efpTypecheck).toBe(true);
    expect(res.efpTest).toBe(true);
  });

  test("classification rules - contracts", () => {
    const res = classifyFiles(["contracts/profiles/current-application.json"]);
    expect(res.contracts).toBe(true);
    expect(res.efpBuild).toBe(true);
  });

  test("classification rules - firestore rules", () => {
    const res = classifyFiles(["firestore.rules"]);
    expect(res.firestorePolicy).toBe(true);
  });

  test("classification rules - static scripts", () => {
    const res = classifyFiles(["scripts/verify-version.mjs"]);
    expect(res.docs).toBe(true);
    expect(res.versionStatic).toBe(true);
  });

  test("resolution failure aborts execution", () => {
    // Create a temporary non-git directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-fast-failclosed-"));
    try {
      fs.mkdirSync(path.join(tempDir, "scripts"));
      fs.copyFileSync(
        path.join(originalCwd, "scripts", "verify-fast.mjs"),
        path.join(tempDir, "scripts", "verify-fast.mjs")
      );

      // Run it in the non-git directory. Since no git exists, runGit() will exit 1, OR if resolved baseRef is null and no working tree changes, it exits 1.
      let failed = false;
      try {
        execSync("node scripts/verify-fast.mjs", {
          cwd: tempDir,
          stdio: "pipe",
          env: { ...process.env, VERIFY_FAST_BASE_REF: "invalid_ref_xyz" }
        });
      } catch (e) {
        failed = true;
      }
      expect(failed).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("explicit base resolution behavior", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-fast-git-"));
    try {
      execSync("git init", { cwd: tempDir, stdio: "pipe" });
      execSync("git config user.name 'Test'", { cwd: tempDir, stdio: "pipe" });
      execSync("git config user.email 'test@example.com'", { cwd: tempDir, stdio: "pipe" });

      const testPkg = {
        name: "test-repo",
        scripts: {
          "test:documentation-state": "echo ok",
          "version:verify": "echo ok",
          "test:routing": "echo ok",
          "test:routing-boundary": "echo ok",
          "lint": "echo ok",
          "test": "echo ok",
          "build": "echo ok"
        }
      };

      fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify(testPkg, null, 2));
      execSync("git add package.json && git commit -m 'first'", { cwd: tempDir, stdio: "pipe" });

      fs.mkdirSync(path.join(tempDir, "scripts"));
      fs.mkdirSync(path.join(tempDir, "scripts", "lib"));

      fs.writeFileSync(path.join(tempDir, "scripts", "verify-version.mjs"), "console.log('verify-version ok');");
      fs.writeFileSync(path.join(tempDir, "scripts", "validate-repository-bootstrap.mjs"), "console.log('bootstrap ok');");

      fs.copyFileSync(
        path.join(originalCwd, "scripts", "verify-fast.mjs"),
        path.join(tempDir, "scripts", "verify-fast.mjs")
      );
      fs.copyFileSync(
        path.join(originalCwd, "scripts", "lib", "verify-fast-classifier.mjs"),
        path.join(tempDir, "scripts", "lib", "verify-fast-classifier.mjs")
      );

      execSync("git add . && git commit -m 'add scripts and files'", { cwd: tempDir, stdio: "pipe" });

      // 1. valid explicit base -> selected (should pass, let's use HEAD)
      let out1 = execSync("node scripts/verify-fast.mjs", {
        cwd: tempDir,
        stdio: "pipe",
        env: { ...process.env, VERIFY_FAST_BASE_REF: "HEAD" }
      }).toString();
      expect(out1).toContain("base: HEAD");

      // 2. invalid explicit base -> failure
      let failed2 = false;
      try {
        execSync("node scripts/verify-fast.mjs", {
          cwd: tempDir,
          stdio: "pipe",
          env: { ...process.env, VERIFY_FAST_BASE_REF: "nonexistent_ref_123" }
        });
      } catch (e) {
        failed2 = true;
      }
      expect(failed2).toBe(true);

      // 3. no explicit base and valid HEAD~1 -> selected
      // We need a second commit to have HEAD~1
      execSync("git commit --allow-empty -m 'second'", { cwd: tempDir, stdio: "pipe" });
      let out3 = execSync("node scripts/verify-fast.mjs", {
        cwd: tempDir,
        stdio: "pipe",
        env: { ...process.env, VERIFY_FAST_BASE_REF: "" }
      }).toString();
      expect(out3).toContain("base: HEAD~1");

      // 4. no valid base -> failure
      // We can mock this by running in a fresh single-commit repo with no working tree changes and no HEAD~1
      const freshRepo = fs.mkdtempSync(path.join(os.tmpdir(), "verify-fast-freshrepo-"));
      execSync("git init", { cwd: freshRepo, stdio: "pipe" });
      execSync("git config user.name 'Test'", { cwd: freshRepo, stdio: "pipe" });
      execSync("git config user.email 'test@example.com'", { cwd: freshRepo, stdio: "pipe" });
      fs.writeFileSync(path.join(freshRepo, "package.json"), JSON.stringify(testPkg, null, 2));
      fs.mkdirSync(path.join(freshRepo, "scripts"));
      fs.mkdirSync(path.join(freshRepo, "scripts", "lib"));

      fs.writeFileSync(path.join(freshRepo, "scripts", "verify-version.mjs"), "console.log('verify-version ok');");
      fs.writeFileSync(path.join(freshRepo, "scripts", "validate-repository-bootstrap.mjs"), "console.log('bootstrap ok');");

      fs.copyFileSync(
        path.join(originalCwd, "scripts", "verify-fast.mjs"),
        path.join(freshRepo, "scripts", "verify-fast.mjs")
      );
      fs.copyFileSync(
        path.join(originalCwd, "scripts", "lib", "verify-fast-classifier.mjs"),
        path.join(freshRepo, "scripts", "lib", "verify-fast-classifier.mjs")
      );
      execSync("git add -A && git commit -m 'committed all'", { cwd: freshRepo, stdio: "pipe" });

      let failed4 = false;
      try {
        execSync("node scripts/verify-fast.mjs", {
          cwd: freshRepo,
          stdio: "pipe",
          env: { ...process.env, VERIFY_FAST_BASE_REF: "", GITHUB_BASE_REF: "" }
        });
      } catch (e) {
        failed4 = true;
      }
      expect(failed4).toBe(true);
      fs.rmSync(freshRepo, { recursive: true, force: true });

    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("classification rules - routing plus frontend mapping", () => {
    const files = [
      "src/App.tsx",
      "src/routing/example.ts",
      "src/lib/routeCatalog.ts",
      "scripts/test-routing-boundary.mjs",
      "scripts/lib/route-catalog-validator.mjs",
      "tests/routing/integration.test.tsx",
      "tests/routing/authorization.test.ts",
      "tests/route-catalog-validator.test.ts"
    ];

    for (const file of files) {
      const needs = classifyFiles([file]);
      expect(needs.routing).toBe(true);
      expect(needs.frontend).toBe(true);

      const plan = buildVerificationPlan([file]);
      expect(plan).toContain("npm run test:routing");
      expect(plan).toContain("npm run test:routing-boundary");
      expect(plan).toContain("npm run lint");
      expect(plan).toContain("npm run test");
      expect(plan).toContain("npm run build");
    }
  });

  test("conservative verification-infrastructure rule", () => {
    const infraFiles = [
      "scripts/verify-fast.mjs",
      "scripts/lib/verify-fast-classifier.mjs",
      "scripts/verify-version.mjs",
      "scripts/validate-repository-bootstrap.mjs",
      "scripts/test-routing-boundary.mjs",
      "scripts/lib/route-catalog-validator.mjs",
      "tests/verify-fast.test.ts",
      "tests/version-verifier.test.ts",
      "tests/route-catalog-validator.test.ts",
      "package.json",
      "package-lock.json"
    ];

    for (const file of infraFiles) {
      const plan = buildVerificationPlan([file]);
      expect(plan).toContain("node scripts/validate-repository-bootstrap.mjs");
      expect(plan).toContain("node scripts/verify-version.mjs");
      expect(plan).toContain("npm run test:routing");
      expect(plan).toContain("npm run test:routing-boundary");
      expect(plan).toContain("npm run lint");
      expect(plan).toContain("npm run test");
      expect(plan).toContain("npm run build");
    }
  });

  test("version and bootstrap files map to version check", () => {
    const files = [
      "scripts/verify-version.mjs",
      "scripts/validate-repository-bootstrap.mjs",
      "tests/version-verifier.test.ts",
      "package.json",
      "package-lock.json",
      "functions/package.json",
      "functions/package-lock.json",
      "packages/efp-model/package.json",
      "packages/efp-model/package-lock.json",
      "contracts/profiles/current-application.json"
    ];

    for (const file of files) {
      const plan = buildVerificationPlan([file]);
      expect(plan).toContain("node scripts/validate-repository-bootstrap.mjs");
      expect(plan).toContain("node scripts/verify-version.mjs");
    }
  });
});
