import fs from 'fs';
let content = fs.readFileSync('functions/test/logicalFactBuilder.test.ts', 'utf8');

content = content.replace(/participants: \[\]/g, 'participants: [{ role: "subject", ref: { entityType: "object", id: "obj1" } }]');
content = content.replace(/source: "manual"/g, 'source: "user_confirmed"');
content = content.replace(/source: "sensor"/g, 'source: "location_measurement"');
content = content.replace(/source: "user"/g, 'source: "user_report"');
content = content.replace(/toThrow\(\/Logical Fact schema validation failed\/\)/, 'toThrow(/Invalid request format/)');

fs.writeFileSync('functions/test/logicalFactBuilder.test.ts', content);
