import fs from 'fs';
let content = fs.readFileSync('functions/test/submitFactCommandAuthority.test.ts', 'utf8');

// Fix idempotency schema error
content = content.replace(/provenance: \{ source: "t", confidence: "h" \}, participants: \[\]/g, 'provenance: { source: "user_confirmed", confidence: "high" }, participants: [{ role: "object", ref: { entityType: "object", id: "object1" } }]');

// Fix Duplicate Check test
content = content.replace(/'doc\/assoc2': \{ ownerId: 'test-user', operation: 'detach',/g, `'doc/assoc1_already_detached': { ownerId: 'test-user', operation: 'attach', participantKeys: ['marker:marker1', 'object:object1'], objectIds: ['object1'], markerKeys: ['marker1'] },
    'doc/assoc2': { ownerId: 'test-user', operation: 'detach',`);

content = content.replace(/val === "assoc2"/g, 'val === "assoc1_already_detached"');

content = content.replace(/subjectAssociationId: "assoc2", \/\/ mock duplicate check returns true for assoc2/g, 'subjectAssociationId: "assoc1_already_detached", // mock duplicate check returns true');

fs.writeFileSync('functions/test/submitFactCommandAuthority.test.ts', content);
