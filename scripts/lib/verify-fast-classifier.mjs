import fs from 'node:fs';

export function classifyChangedFiles(files) {
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
    // Check for docs / md / agents rules
    if (/^(README\.md|AGENTS\.md|\.agents\/|docs\/|.*\.md$)/.test(file)) {
      needs.docs = true;
    }

    // Routing + Frontend files (Step 3: each must select routing and frontend verification)
    const isRoutingPlusFrontend = /^(src\/App\.tsx|src\/routing\/|src\/lib\/routeCatalog\.ts$|scripts\/test-routing-boundary\.mjs$|scripts\/lib\/route-catalog-validator\.mjs$|tests\/routing\/|tests\/route-catalog-validator\.test\.ts$)/.test(file);
    if (isRoutingPlusFrontend) {
      needs.routing = true;
      needs.frontend = true;
    }

    // Normal frontend-only files
    if (/^(src\/components\/|src\/lib\/|src\/App|src\/main|src\/routing\/)/.test(file)) {
      needs.frontend = true;
    }

    // Normal routing-only files (already handled by routing-plus-frontend but kept for compatibility)
    if (/^(src\/routing\/|src\/lib\/routeCatalog\.ts$)/.test(file)) {
      needs.routing = true;
    }

    // Functions Source
    if (/^functions\/(src|test)\//.test(file)) {
      needs.functionsSource = true;
    }

    // Functions Packaging
    const isFunctionsPackaging = /^functions\/(package(-lock)?\.json|vendor\/|deploy-functions\.allowlist\.json|deploy-allowlist|\.npmignore)/.test(file) || /^scripts\/(prepare-functions-artifact|test-functions-artifact)/.test(file);
    if (isFunctionsPackaging) {
      needs.functionsPackaging = true;
    }

    // EFP-model packages
    if (/^packages\/efp-model\//.test(file)) {
      needs.efpBuild = true;
      needs.efpTypecheck = true;
      needs.efpTest = true;
    }

    // Contracts
    if (/^contracts\//.test(file)) {
      needs.efpBuild = true;
      needs.contracts = true;
    }

    // Firestore rules
    if (file === 'firestore.rules') {
      needs.firestorePolicy = true;
    }

    // Version and bootstrap verification (versionStatic)
    const isVersionStaticFile = /^(scripts\/(validate-documentation-state|verify-version|verify-fast)\.mjs|package\.json|package-lock\.json|functions\/package\.json|functions\/package-lock\.json|packages\/efp-model\/package\.json|packages\/efp-model\/package-lock\.json|contracts\/profiles\/current-application.json|tests\/version-verifier\.test\.ts|scripts\/validate-repository-bootstrap\.mjs)$/.test(file);
    if (isVersionStaticFile) {
      needs.docs = true;
      needs.versionStatic = true;
    }
  }

  return needs;
}

export function isVerificationInfrastructureFile(file) {
  const infra = [
    'scripts/verify-fast.mjs',
    'scripts/lib/verify-fast-classifier.mjs',
    'scripts/verify-version.mjs',
    'scripts/validate-repository-bootstrap.mjs',
    'scripts/test-routing-boundary.mjs',
    'scripts/lib/route-catalog-validator.mjs',
    'tests/verify-fast.test.ts',
    'tests/version-verifier.test.ts',
    'tests/route-catalog-validator.test.ts',
    'package.json',
    'package-lock.json'
  ];
  return infra.includes(file);
}

export function buildVerificationPlan(files) {
  const needs = classifyChangedFiles(files);
  const phases = [[], [], [], [], [], []];
  const add = (phase, cmd) => { if (!phases[phase].includes(cmd)) phases[phase].push(cmd); };

  // Base build & typecheck for EFP
  if (needs.efpBuild || needs.functionsPackaging || needs.contracts) {
    add(0, 'npm --prefix packages/efp-model run build');
  }
  if (needs.efpTypecheck) {
    add(0, 'npm --prefix packages/efp-model run typecheck');
  }

  // Functions artifact preparation
  if (needs.functionsPackaging) {
    add(1, 'npm run prepare:functions-artifact');
  }

  // Functions building & testing
  if (needs.functionsSource || needs.functionsPackaging) {
    add(2, 'npm --prefix functions run build');
    add(3, 'npm run test:functions');
  }

  // EFP model test
  if (needs.efpTest) {
    add(3, 'npm --prefix packages/efp-model run test');
  }

  // Documentation / Static validation checks
  if (needs.docs) {
    add(4, 'npm run test:documentation-state');
  }

  // Selected plan must validate current workspace version synchronization
  if (needs.versionStatic) {
    add(4, 'node scripts/validate-repository-bootstrap.mjs');
    add(4, 'node scripts/verify-version.mjs');
  }

  if (needs.contracts) {
    add(4, 'npm run contracts:validate');
    add(4, 'npm run contracts:check-generated');
  }

  if (needs.firestorePolicy) {
    add(4, 'npm run test:firestore-policy');
  }

  // Functions packaging and validation sequence
  if (needs.functionsPackaging) {
    add(4, 'npm run test:functions-artifact');
    add(4, 'npm run test:functions-boundary');
    add(4, 'npm run test:functions-runtime-gate');
    add(4, 'npm run test:functions-artifact:isolation');
  }

  // Routing
  if (needs.routing) {
    add(5, 'npm run test:routing');
    add(5, 'npm run test:routing-boundary');
  }

  // Frontend
  if (needs.frontend || needs.routing) {
    add(5, 'npm run lint');
    add(5, 'npm run test');
    add(5, 'npm run build');
  }

  // Conservative handling of verification-infrastructure changes (Step 4)
  const containsInfraChange = files.some(file => isVerificationInfrastructureFile(file));
  if (containsInfraChange) {
    // Plan must include at least:
    // node scripts/validate-repository-bootstrap.mjs
    // node scripts/verify-version.mjs
    // npm run test:routing
    // npm run test:routing-boundary
    // npm run lint
    // npm run test
    // npm run build
    add(4, 'node scripts/validate-repository-bootstrap.mjs');
    add(4, 'node scripts/verify-version.mjs');
    add(5, 'npm run test:routing');
    add(5, 'npm run test:routing-boundary');
    add(5, 'npm run lint');
    add(5, 'npm run test');
    add(5, 'npm run build');
  }

  const commands = phases.flat();
  if (commands.length === 0) {
    commands.push('npm run test:documentation-state');
  }
  return commands;
}
