import fs from 'node:fs';
import path from 'node:path';

function main() {
  const inputPath = process.argv[2];

  if (!inputPath || inputPath.trim() === '') {
    console.error('Error: Path is required and cannot be empty.');
    process.exit(1);
  }

  // Prevent absolute paths
  if (path.isAbsolute(inputPath)) {
    console.error('Error: Absolute paths are not allowed.');
    process.exit(1);
  }

  // Prevent path traversal
  if (inputPath.includes('..')) {
    console.error('Error: Path traversal (..) is not allowed.');
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File does not exist at ${inputPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(resolvedPath);
  if (!stats.isFile()) {
    console.error(`Error: Path must point to a file, not a directory or other type: ${inputPath}`);
    process.exit(1);
  }

  // Print the normalized safe path so it can be captured by the caller if needed
  console.log(inputPath);
}

main();
