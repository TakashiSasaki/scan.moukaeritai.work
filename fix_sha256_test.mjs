import fs from 'fs';

let content = fs.readFileSync('packages/efp-model/src/efp.test.ts', 'utf8');

const replacement = `    const crypto = await import("crypto");
    const testCases = ["", "abc", "日本語", "scan.mw🔖"];
    for (const vector of testCases) {
      const expected = crypto.createHash("sha256").update(vector, "utf8").digest("hex");
      expect(sha256(vector)).toBe(expected);
    }
  });`;

content = content.replace(/test\("Marker key generation is deterministic.*?\s*\}\);\s*const key = generateMarkerKey\(input\);\s*expect\(key\)\.toBeTruthy\(\);\s*\/\/ TODO:.*?\n  \}\);/s, replacement);

fs.writeFileSync('packages/efp-model/src/efp.test.ts', content);
