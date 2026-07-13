import { describe, test, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

describe('Functions artifact tests', () => {
  test('can resolve vendor schemas', () => {
    const activeVersionPath = path.join(__dirname, '..', 'vendor', 'contracts', 'callable-functions-api', 'active-version.json');
    expect(fs.existsSync(activeVersionPath)).toBe(true);
    const versionData = JSON.parse(fs.readFileSync(activeVersionPath, 'utf8'));
    expect(versionData.version || versionData.activeVersion).toBeTruthy();

    const reqSchemaPath = path.join(__dirname, '..', 'vendor', 'contracts', 'callable-functions-api', versionData.version || versionData.activeVersion, 'submit-fact-command-request.schema.json');
    expect(fs.existsSync(reqSchemaPath)).toBe(true);
  });

  test('can import efp-model', async () => {
    const efpModel = await import('@scan/efp-model');
    expect(typeof efpModel.generateUUIDv7).toBe('function');
    expect(typeof efpModel.stripUndefinedDeep).toBe('function');
  });
});
