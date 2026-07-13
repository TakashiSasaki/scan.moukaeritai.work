import fs from 'fs';

let content = fs.readFileSync('packages/efp-model/src/serialization.ts', 'utf8');

const replacement = `  const asciiBytes: number[] = Array.from(new TextEncoder().encode(ascii));
  const asciiLength = asciiBytes.length * 8;`;

content = content.replace(/  const asciiLength = ascii\.length \* 8;\s*let hash = \[/, `  let hash = [`);
content = content.replace(/  const asciiBytes: number\[\] = Array\.from\(new TextEncoder\(\)\.encode\(ascii\)\);/, replacement);

fs.writeFileSync('packages/efp-model/src/serialization.ts', content);
