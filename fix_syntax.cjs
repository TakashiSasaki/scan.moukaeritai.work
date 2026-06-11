const fs = require('fs');
let tests = fs.readFileSync('tests/firestore-rules/firestore.rules.test.ts', 'utf8');

// I replaced things a bit loosely. Let's fix the syntax error.
// "Unexpected }" on line 502 means there are too many closing braces.
// Let's remove the last `});` since `describe('Entity / Fact / Projection target collection rules', ...)` was inside the main `describe('Firestore Rules Baseline', ...)`.

tests = tests.replace(/  \}\);\n\}\);\n$/, '});\n');

fs.writeFileSync('tests/firestore-rules/firestore.rules.test.ts', tests);
