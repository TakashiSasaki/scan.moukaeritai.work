const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const targetRules = rules.match(/\/\/ --- ASSOCIATIONS \(Target Fact\) ---[\s\S]*?\/\/ --- PROJECTIONS \(Derived Summaries\) ---/)[0];

const newAssocRule = targetRules.replace(`        && incoming().participants is list
        && incoming().participantKeys is list
        && (!('objectIds' in incoming()) || incoming().objectIds is list)
        && (!('markerKeys' in incoming()) || incoming().markerKeys is list)
        && (!('placeIds' in incoming()) || incoming().placeIds is list)
        && (!('readerIds' in incoming()) || incoming().readerIds is list)
        && (!('deviceIds' in incoming()) || incoming().deviceIds is list)
        && (!('userIds' in incoming()) || incoming().userIds is list)`, `        && incoming().participants is list
        && incoming().participantKeys is list
        && (!('objectIds' in incoming()) || incoming().objectIds is list)
        && (!('markerKeys' in incoming()) || incoming().markerKeys is list)
        && (!('placeIds' in incoming()) || incoming().placeIds is list)
        && (!('readerIds' in incoming()) || incoming().readerIds is list)
        && (!('deviceIds' in incoming()) || incoming().deviceIds is list)
        && (!('userIds' in incoming()) || incoming().userIds is list)`);

// Actually wait, instead of rewriting this complex logic, I can write a generic consistency function
// Since this is a lot of map/filter logic which is very hard in Firestore rules,
// a simpler way is to just force the client to use backend migration/admin flows, or verify the sizes match.
// Let me look at the comment again: "the rules should enforce consistency or prevent untrusted clients from supplying these derived fields directly."
