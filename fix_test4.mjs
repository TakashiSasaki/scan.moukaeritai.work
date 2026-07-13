import fs from 'fs';
let content = fs.readFileSync('functions/test/logicalFactBuilder.test.ts', 'utf8');

content = content.replace(/role: "subject"/g, 'role: "object"');
content = content.replace(/role: "target"/g, 'role: "marker"');
content = content.replace(/role: "location"/g, 'role: "place"');

fs.writeFileSync('functions/test/logicalFactBuilder.test.ts', content);

let content2 = fs.readFileSync('functions/test/submitFactCommandAuthority.test.ts', 'utf8');
content2 = content2.replace(/role: "subject"/g, 'role: "object"');
content2 = content2.replace(/role: "target"/g, 'role: "marker"');
content2 = content2.replace(/role: "location"/g, 'role: "place"');
content2 = content2.replace(/source: "test"/g, 'source: "user_confirmed"');
content2 = content2.replace(/participants: \[\]/g, 'participants: [{ role: "object", ref: { entityType: "object", id: "object1" } }]');
content2 = content2.replace(/effectiveAt: "2026-07-12T05:00:00Z",/g, 'effectiveAt: "2026-07-12T05:00:00Z", provenance: { source: "user_confirmed", confidence: "high" },');

fs.writeFileSync('functions/test/submitFactCommandAuthority.test.ts', content2);
