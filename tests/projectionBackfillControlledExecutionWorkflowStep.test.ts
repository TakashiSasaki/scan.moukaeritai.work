import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

describe('run-projection-backfill-controlled-execution-design-workflow-step.mjs', () => {
  let tmpDir = '';
  let scriptPath = '';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-step-test-'));
    scriptPath = path.resolve('scripts/run-projection-backfill-controlled-execution-design-workflow-step.mjs');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('fails if execution-design-manifest is missing', () => {
    const result = spawnSync(process.execPath, [scriptPath, '--gate', 'gate.json', '--output-dir', tmpDir], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Error: --execution-design-manifest, --gate, and --output-dir are required.');
  });

  it('fails if validation bundle is missing', () => {
    const manifestPath = path.join(tmpDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({ validationBundles: ['nonexistent-bundle.json'] }));

    const result = spawnSync(process.execPath, [
       scriptPath,
       '--execution-design-manifest', manifestPath,
       '--gate', 'gate.json',
       '--output-dir', tmpDir
    ], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Validation bundle path cannot be resolved: nonexistent-bundle.json');
  });

  it('generates packet and summary successfully with valid inputs', () => {
    // Generate valid input files
    const manifestPath = path.join(tmpDir, 'manifest.json');
    const bundlePath = path.join(tmpDir, 'bundle.json');
    const gatePath = path.join(tmpDir, 'gate.json');

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
      written: false,
      bundleCount: 1,
      totalTargets: 1,
      evidenceModes: ["dry-run-evidence-pass"],
      targetTypeCoverage: {
         object: { targetCount: 1, hasManualWriteEvidence: false }
      }
    };
    fs.writeFileSync(gatePath, JSON.stringify(validGate));

    const result = spawnSync(process.execPath, [
       scriptPath,
       '--execution-design-manifest', manifestPath,
       '--gate', gatePath,
       '--output-dir', tmpDir,
       '--environment', 'test-env',
       '--operator', 'test-operator'
    ], { encoding: 'utf8' });

    expect(result.status).toBe(0);

    const packetPath = path.join(tmpDir, 'controlled-execution-design-packet.json');
    expect(fs.existsSync(packetPath)).toBe(true);

    const summaryPath = path.join(tmpDir, 'controlled-execution-design-summary.md');
    expect(fs.existsSync(summaryPath)).toBe(true);

    const packetData = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
    expect(packetData.overallStatus).toBe('ready-for-controlled-execution-design-review');
    expect(packetData.environment).toBe('test-env');
    expect(packetData.operator).toBe('test-operator');
  });
});
