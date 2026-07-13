import fs from 'fs';

let content = fs.readFileSync('packages/efp-model/src/efp.test.ts', 'utf8');

const newTest = `  test("buildFactIndexFields exhaustive tests", () => {
    // 1. Object only
    const objIndex = buildFactIndexFields([{ role: "test", ref: { entityType: "object", id: "obj1" } }] as any);
    expect(objIndex.objectIds).toEqual(["obj1"]);
    expect(objIndex.markerKeys).toEqual([]);
    expect(objIndex.placeIds).toEqual([]);
    expect(objIndex.readerIds).toEqual([]);
    expect(objIndex.deviceIds).toEqual([]);
    expect(objIndex.userIds).toEqual([]);

    // 2. Marker only
    const mkIndex = buildFactIndexFields([{ role: "test", ref: { entityType: "marker", id: "mk1" } }] as any);
    expect(mkIndex.objectIds).toEqual([]);
    expect(mkIndex.markerKeys).toEqual(["mk1"]);

    // 3. No participants
    const emptyIndex = buildFactIndexFields([]);
    expect(emptyIndex.objectIds).toEqual([]);
    expect(emptyIndex.markerKeys).toEqual([]);
    expect(emptyIndex.placeIds).toEqual([]);

    // 4. Same ID, different types
    const sameIdIndex = buildFactIndexFields([
      { role: "a", ref: { entityType: "object", id: "same" } },
      { role: "b", ref: { entityType: "marker", id: "same" } }
    ] as any);
    expect(sameIdIndex.objectIds).toEqual(["same"]);
    expect(sameIdIndex.markerKeys).toEqual(["same"]);
    expect(sameIdIndex.participantKeys).toEqual(["marker:same", "object:same"]);

    // 5. Order independence & deduplication
    const idx1 = buildFactIndexFields([
      { role: "a", ref: { entityType: "object", id: "z" } },
      { role: "b", ref: { entityType: "object", id: "a" } },
      { role: "c", ref: { entityType: "object", id: "z" } }
    ] as any);
    expect(idx1.objectIds).toEqual(["a", "z"]);
  });`;

content = content.replace(/  test\("buildFactIndexFields", \(\) => \{[\s\S]*?  \}\);/, newTest);
fs.writeFileSync('packages/efp-model/src/efp.test.ts', content);
