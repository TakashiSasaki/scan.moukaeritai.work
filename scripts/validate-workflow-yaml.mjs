import fs from 'fs';
import path from 'path';

const workflowDir = '.github/workflows';
const files = fs.readdirSync(workflowDir);

let hasError = false;
for (const file of files) {
  if (file.endsWith('.yml') || file.endsWith('.yaml')) {
    const filePath = path.join(workflowDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*-\s*$/.test(line)) {
        console.error(`Empty array item in \${file} at line \${i + 1}`);
        hasError = true;
      }
    }
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log("YAML workflows syntactic check passed.");
}
