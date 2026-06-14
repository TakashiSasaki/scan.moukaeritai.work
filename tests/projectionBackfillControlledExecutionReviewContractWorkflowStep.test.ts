import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

describe('run-projection-backfill-controlled-execution-review-contract-workflow-step.mjs', () => {
  let tmpDir = '';
  let scriptPath = '';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-step-contract-test-'));
    scriptPath = path.resolve('scripts/run-projection-backfill-controlled-execution-review-contract-workflow-step.mjs');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('fails if execution-design-manifest is missing', () => {
    const result = spawnSync(process.execPath, [scriptPath, '--packet', 'packet.json', '--gate', 'gate.json', '--output-dir', tmpDir], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Error: --execution-design-manifest, --packet, --gate, and --output-dir are required.');
  });

  it('fails if validation bundle is missing', () => {
    const manifestPath = path.join(tmpDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({ validationBundles: ['nonexistent-bundle.json'] }));

    const result = spawnSync(process.execPath, [
       scriptPath,
       '--execution-design-manifest', manifestPath,
       '--packet', 'packet.json',
       '--gate', 'gate.json',
       '--output-dir', tmpDir
    ], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Validation bundle path cannot be resolved: nonexistent-bundle.json');
  });

  it('generates contract and summary successfully with valid inputs', () => {
    // Generate valid input files
    const manifestPath = path.join(tmpDir, 'manifest.json');
    const bundlePath = path.join(tmpDir, 'bundle.json');
    const gatePath = path.join(tmpDir, 'gate.json');
    const packetPath = path.join(tmpDir, 'packet.json');

    fs.writeFileSync(manifestPath, JSON.stringify({ validationBundles: ['bundle.json'] }));

    const validBundle = {
      bundleType: "projection-backfill-operation-validation-bundle",
      valid: true,
      success: true,
      overallStatus: "dry-run-evidence-pass",
      written: false,
      batches: [
        {
          targets: [
             { targetType: "object", targetId: "test-obj" }
          ]
        }
      ]
    };
    fs.writeFileSync(bundlePath, JSON.stringify(validBundle));

    const validGate = {
      gateType: "projection-backfill-execution-design-gate",
      valid: true,
      success: true,
      overallStatus: "ready-for-execution-design",
      executionAuthorization: false,
      written: false,
      executed: false,
      bundleCount: 1,
      totalTargets: 1,
      evidenceModes: ["dry-run-evidence-pass"],
      targetTypeCoverage: {
         object: { targetCount: 1, hasManualWriteEvidence: false }
      }
    };
    fs.writeFileSync(gatePath, JSON.stringify(validGate));

    const validPacket = {
      packetType: "projection-backfill-controlled-execution-design-packet",
      valid: true,
      success: true,
      overallStatus: "ready-for-controlled-execution-design-review",
      bundleCount: 1,
      totalTargets: 1,
      evidenceModes: ["dry-run-evidence-pass"],
      executionAuthorization: false,
      written: false,
      executed: false,
      contractType: "not-a-review-contract"
    };
    fs.writeFileSync(packetPath, JSON.stringify(validPacket));


    const result = spawnSync(process.execPath, [
       scriptPath,
       '--execution-design-manifest', manifestPath,
       '--packet', packetPath,
       '--gate', gatePath,
       '--output-dir', tmpDir,
       '--environment', 'test-env',
       '--operator', 'test-operator'
    ], { encoding: 'utf8' });

    expect(result.status).toBe(0);

    const contractOutputPath = path.join(tmpDir, 'controlled-execution-review-contract.json');
    expect(fs.existsSync(contractOutputPath)).toBe(true);

    const summaryPath = path.join(tmpDir, 'controlled-execution-review-contract-summary.md');
    expect(fs.existsSync(summaryPath)).toBe(true);

    const contractData = JSON.parse(fs.readFileSync(contractOutputPath, 'utf8'));
    expect(contractData.overallStatus).toBe('ready-for-controlled-execution-design-review');
    expect(contractData.environment).toBe('test-env');
    expect(contractData.operator).toBe('test-operator');
  });
});
