import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const workflowDir = path.join(rootDir, '.github', 'workflows');

let hasError = false;

function fail(msg) {
  console.error(`❌ Validation error: ${msg}`);
  hasError = true;
}

if (!fs.existsSync(workflowDir)) {
  console.error(`❌ Workflow directory ${workflowDir} does not exist.`);
  process.exit(1);
}

const files = fs.readdirSync(workflowDir);

for (const file of files) {
  if (file.endsWith('.yml') || file.endsWith('.yaml')) {
    const filePath = path.join(workflowDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Check for empty sequence item raw string level
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*-\s*$/.test(line)) {
        fail(`Empty array item in workflow file "${file}" at line ${i + 1}`);
      }
    }

    // 2. Parse YAML
    let parsed;
    try {
      parsed = YAML.parse(content);
    } catch (e) {
      fail(`Failed to parse YAML in "${file}": ${e.message}`);
      continue;
    }

    // 3. File specific checks
    if (file === 'ci.yml') {
      const pushBranches = parsed.on?.push?.branches || [];
      const prBranches = parsed.on?.pull_request?.branches || [];
      if (!pushBranches.includes('main')) {
        fail('ci.yml is missing "main" branch in on.push.branches');
      }
      if (!prBranches.includes('main')) {
        fail('ci.yml is missing "main" branch in on.pull_request.branches');
      }

      const steps = parsed.jobs?.validate?.steps || [];
      
      for (const step of steps) {
        if (step.uses && step.uses.includes('setup-java')) {
          fail('ci.yml must not contain "setup-java"');
        }
        if (step.run && step.run.includes('firebase emulators:exec')) {
          fail('ci.yml must not contain "firebase emulators:exec"');
        }
      }

      const hasRootNpmCi = steps.some(step => step.run && step.run.trim() === 'npm ci');
      if (!hasRootNpmCi) {
        fail('ci.yml is missing root "npm ci" execution step.');
      }

      const prepareArtifactIndex = steps.findIndex(step => step.run && step.run.includes('prepare:functions-artifact'));
      if (prepareArtifactIndex === -1) {
        fail('ci.yml is missing "npm run prepare:functions-artifact" step.');
      }

      const functionsNpmCiIndex = steps.findIndex(step => {
        if (!step.run) return false;
        const runsNpmCi = step.run.includes('npm ci');
        const worksOnFunctions = step.run.includes('functions') || (step['working-directory'] && step['working-directory'].includes('functions'));
        return runsNpmCi && worksOnFunctions;
      });

      if (functionsNpmCiIndex === -1) {
        fail('ci.yml is missing npm ci in Functions directory.');
      } else if (functionsNpmCiIndex < prepareArtifactIndex) {
        fail('ci.yml must install Functions dependencies AFTER preparing Functions artifact.');
      }

      const hasBaselineVerify = steps.some(step => step.run && step.run.includes('verify:pr'));
      if (!hasBaselineVerify) {
        fail('ci.yml is missing "npm run verify:pr" step.');
      }
    }

    if (file === 'deploy-functions.yml' || file === 'deploy-hosting.yml') {
      const triggers = Object.keys(parsed.on || {});
      if (triggers.length !== 1 || triggers[0] !== 'workflow_dispatch') {
        fail(`Deploy workflow "${file}" must be triggerable strictly via "workflow_dispatch" only.`);
      }

      if (file === 'deploy-functions.yml') {
        const steps = parsed.jobs?.deploy?.steps || [];
        const deployIndex = steps.findIndex(step => step.run && step.run.includes('firebase-tools deploy'));
        
        const requiredBeforeSteps = [
          'contracts:validate',
          'version:verify',
          'prepare:functions-artifact',
          'test:functions-artifact',
          'test:functions-runtime-gate',
          'test:functions-boundary'
        ];

        for (const req of requiredBeforeSteps) {
          const idx = steps.findIndex(step => step.run && step.run.includes(req));
          if (idx === -1) {
            fail(`deploy-functions.yml is missing required safety gate: "${req}"`);
          } else if (deployIndex !== -1 && idx > deployIndex) {
            fail(`deploy-functions.yml runs safety gate "${req}" AFTER deploy step. It must run BEFORE deploy.`);
          }
        }
      }
    }

    if (file === 'sync-branches.yml') {
      const targets = parsed.jobs?.sync?.strategy?.matrix?.target_branch || [];
      if (targets.length !== 3 || !targets.includes('jules') || !targets.includes('codex') || !targets.includes('hermes')) {
        fail(`sync-branches.yml targets must be strictly [jules, codex, hermes]. Found: ${JSON.stringify(targets)}`);
      }
      if (targets.includes('chatgpt')) {
        fail('sync-branches.yml must not automatically sync chatgpt branch.');
      }
    }

    if (file === 'create-draft-prs-to-main.yml') {
      const pushBranches = parsed.on?.push?.branches || [];
      const invalidBranches = pushBranches.filter(b => b !== 'jules' && b !== 'codex' && b !== 'hermes');
      if (invalidBranches.length > 0) {
        fail(`create-draft-prs-to-main.yml trigger branches contain invalid targets: ${JSON.stringify(invalidBranches)}`);
      }
      if (content.includes('chatgpt')) {
        fail('create-draft-prs-to-main.yml must not mention chatgpt.');
      }
    }
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('✅ Real YAML-parsed workflows check passed successfully.');
}
