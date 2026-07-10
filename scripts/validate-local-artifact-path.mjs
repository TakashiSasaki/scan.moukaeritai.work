import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

export function validateLocalArtifactPath(inputPath, options = {}) {
  const cwd = options.cwd || process.cwd();

  if (!inputPath || inputPath.trim() === '') {
    throw new Error('Path is required and cannot be empty.');
  }

  if (path.isAbsolute(inputPath)) {
    throw new Error('Absolute paths are not allowed.');
  }

  if (inputPath.includes('..')) {
    throw new Error('Path traversal (..) is not allowed.');
  }

  const resolvedPath = path.resolve(cwd, inputPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File does not exist at ${inputPath}`);
  }

  const stats = fs.statSync(resolvedPath);
  if (!stats.isFile()) {
    throw new Error(`Path must point to a file, not a directory or other type: ${inputPath}`);
  }

  return inputPath;
}

function main() {
  const inputPath = process.argv[2];

  try {
    const validatedPath = validateLocalArtifactPath(inputPath);
    console.log(validatedPath);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  main();
}
