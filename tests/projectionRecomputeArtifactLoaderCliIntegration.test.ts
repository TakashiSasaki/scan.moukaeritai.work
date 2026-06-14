import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const SCRIPT_PATH = path.resolve(__dirname, '../scripts/validate-projection-backfill-operation.mjs');

describe('validate-projection-backfill-operation CLI integration', () => {
  let tmpDir: string;

  const writeManifest = (name, content) => {
    const fullPath = path.join(tmpDir, name);
    fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
    return fullPath;
  };

  const writeArtifact = (name, content) => {
    const fullPath = path.join(tmpDir, name);
    fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
    return fullPath;
  };

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projection-backfill-cli-test-'));
  });

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects when both recomputeResponse and recomputeResponses are provided', () => {
    writeArtifact('test-packet.json', {
      packetType: 'projection-backfill-operation-packet',
      valid: true,
      written: false,
      mode: 'dryRun',
      totalTargets: 1,
      batches: [{ batchIndex: 0, targets: [{ targetType: 'object', targetId: '1' }] }]
    });

    writeArtifact('resp1.json', { result: { targetType: 'object', targetId: '1', success: true } });
    writeArtifact('resp2.json', [{ result: { targetType: 'object', targetId: '1', success: true } }]);

    const manifestPath = writeManifest('reject-both.json', {
      operationPacket: 'test-packet.json',
      batches: [
        {
          batchIndex: 0,
          recomputeResponse: 'resp1.json',
          recomputeResponses: ['resp2.json']
        }
      ]
    });

    try {
      execSync(`node ${SCRIPT_PATH} --manifest ${manifestPath} --json`);
      expect.fail('Should have thrown an error');
    } catch (error) {
      const output = (error.stdout ? error.stdout.toString() : '') + (error.stderr ? error.stderr.toString() : '');
      expect(output).toContain('Do not provide both recomputeResponse and recomputeResponses');
    }
  });

  it('processes a singular recomputeResponse containing an array (flattening it)', () => {
    writeArtifact('test-packet-2.json', {
      packetType: 'projection-backfill-operation-packet',
      valid: true,
      written: false,
      mode: 'dryRun',
      totalTargets: 2,
      batches: [{
        batchIndex: 0,
        targets: [
          { targetType: 'object', targetId: '1' },
          { targetType: 'marker', targetId: '2' }
        ]
      }]
    });

    // Array inside a single artifact file
    writeArtifact('array-resp.json', [
      { targetType: 'object', targetId: '1', success: true, dryRun: true, written: false },
      { targetType: 'marker', targetId: '2', success: true, dryRun: true, written: false }
    ]);

    const manifestPath = writeManifest('flatten-single.json', {
      operationPacket: 'test-packet-2.json',
      batches: [
        {
          batchIndex: 0,
          recomputeResponse: 'array-resp.json'
        }
      ]
    });

    const output = execSync(`node ${SCRIPT_PATH} --manifest ${manifestPath} --json`);
    const result = JSON.parse(output.toString());
    expect(result.overallStatus).toBe('dry-run-evidence-pass');
    expect(result.recomputeResponseCount).toBe(2);
  });

  it('processes plural recomputeResponses where an element is an array (flattening it)', () => {
    writeArtifact('test-packet-3.json', {
      packetType: 'projection-backfill-operation-packet',
      valid: true,
      written: false,
      mode: 'dryRun',
      totalTargets: 3,
      batches: [{
        batchIndex: 0,
        targets: [
          { targetType: 'object', targetId: '1' },
          { targetType: 'marker', targetId: '2' },
          { targetType: 'place', targetId: '3' }
        ]
      }]
    });

    writeArtifact('resp-single.json', { targetType: 'object', targetId: '1', success: true, dryRun: true, written: false });
    writeArtifact('resp-array.json', [
      { targetType: 'marker', targetId: '2', success: true, dryRun: true, written: false },
      { targetType: 'place', targetId: '3', success: true, dryRun: true, written: false }
    ]);

    const manifestPath = writeManifest('flatten-plural.json', {
      operationPacket: 'test-packet-3.json',
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: ['resp-single.json', 'resp-array.json']
        }
      ]
    });

    const output = execSync(`node ${SCRIPT_PATH} --manifest ${manifestPath} --json`);
    const result = JSON.parse(output.toString());
    expect(result.overallStatus).toBe('dry-run-evidence-pass');
    expect(result.recomputeResponseCount).toBe(3);
  });
});
