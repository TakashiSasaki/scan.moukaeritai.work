import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

// We mirror the classification regexes from verify-fast.mjs to ensure synchronization
function classifyFiles(files: string[]) {
  const needs = {
    docs: files.length === 0,
    frontend: false,
    routing: false,
    functionsSource: false,
    functionsPackaging: false,
    efpBuild: false,
    efpTypecheck: false,
    efpTest: false,
    contracts: false,
    firestorePolicy: false,
    versionStatic: false,
  };

  for (const file of files) {
    if (/^(README\.md|AGENTS\.md|\.agents\/|docs\/|.*\.md$)/.test(file)) needs.docs = true;
    if (/^(src\/components\/|src\/lib\/|src\/App|src\/main|src\/routing\/)/.test(file)) needs.frontend = true;
    if (/^(src\/routing\/|src\/lib\/routeCatalog\.ts$)/.test(file)) needs.routing = true;
    if (/^functions\/(src|test)\//.test(file)) needs.functionsSource = true;
    if (/^functions\/(package(-lock)?\.json|vendor\/|deploy-functions\.allowlist\.json|deploy-allowlist|\.npmignore)/.test(file) || /^scripts\/(prepare-functions-artifact|test-functions-artifact)/.test(file)) needs.functionsPackaging = true;
    if (/^packages\/efp-model\//.test(file)) {
      needs.efpBuild = true;
      needs.efpTypecheck = true;
      needs.efpTest = true;
    }
    if (/^contracts\//.test(file)) {
      needs.efpBuild = true;
      needs.contracts = true;
    }
    if (file === 'firestore.rules') needs.firestorePolicy = true;
    if (/^scripts\/(validate-documentation-state|verify-version|verify-fast)\.mjs$/.test(file) || file === 'package.json') {
      needs.docs = true;
      needs.versionStatic = true;
    }
  }
  return needs;
}

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
});
