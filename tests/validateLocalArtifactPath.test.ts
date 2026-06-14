import { describe, it, expect } from 'vitest';
import { validateLocalArtifactPath } from '../scripts/validate-local-artifact-path.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('validateLocalArtifactPath', () => {
  it('throws an error if path is empty', () => {
    expect(() => validateLocalArtifactPath('')).toThrow('Path is required and cannot be empty.');
    expect(() => validateLocalArtifactPath('   ')).toThrow('Path is required and cannot be empty.');
    expect(() => validateLocalArtifactPath(undefined)).toThrow('Path is required and cannot be empty.');
  });

  it('throws an error if path is absolute', () => {
    expect(() => validateLocalArtifactPath('/absolute/path')).toThrow('Absolute paths are not allowed.');
  });

  it('throws an error if path contains traversal characters', () => {
    expect(() => validateLocalArtifactPath('some/../path')).toThrow('Path traversal (..) is not allowed.');
  });

  it('throws an error if file does not exist', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-local-artifact-path-test-'));
    expect(() => validateLocalArtifactPath('non-existent-file.txt', { cwd: tmpDir })).toThrow(/File does not exist at/);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws an error if path points to a directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-local-artifact-path-test-'));
    const subDir = path.join(tmpDir, 'subdir');
    fs.mkdirSync(subDir);
    expect(() => validateLocalArtifactPath('subdir', { cwd: tmpDir })).toThrow(/Path must point to a file, not a directory/);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns the input path if the file exists and is valid', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-local-artifact-path-test-'));
    const testFile = path.join(tmpDir, 'test-file.txt');
    fs.writeFileSync(testFile, 'test content');

    expect(validateLocalArtifactPath('test-file.txt', { cwd: tmpDir })).toBe('test-file.txt');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
