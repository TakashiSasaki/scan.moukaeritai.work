import fs from 'fs';
let content = fs.readFileSync('functions/test/logicalFactBuilder.test.ts', 'utf8');

content = content.replace(/operation: "attach",/g, 'operation: "attach",\n        provenance: { source: "user_confirmed", confidence: "high" },');
content = content.replace(/expect\(fact\.objectIds\)\.toEqual\(\[\]\);/g, 'expect(fact.objectIds).toEqual(["obj1"]);');

fs.writeFileSync('functions/test/logicalFactBuilder.test.ts', content);

let auth = fs.readFileSync('functions/test/submitFactCommandAuthority.test.ts', 'utf8');
auth = auth.replace(/let idempotencyState: any = \{\};/g, 'let idempotencyState: any = {};\n  let setCallCount = 0;');
auth = auth.replace(/return \{ mockSet, mockGet, mockRunTransaction, mockWhere, databaseState, idempotencyState \};/g, 'return { mockSet, mockGet, mockRunTransaction, mockWhere, databaseState, idempotencyState, getSetCallCount: () => setCallCount, resetSetCallCount: () => { setCallCount = 0; } };');

auth = auth.replace(/set: mockSet\.mockImplementation\(\(ref, data\) => \{[\s\S]*?\}\)/, `set: (ref, data) => {
         setCallCount++;
         if (ref && ref.path && ref.path.startsWith('doc/test-user|')) {
           idempotencyState[ref.path] = data;
         } else if (ref && ref.path) {
           databaseState[ref.path] = data;
         }
      }`);

auth = auth.replace(/const mockWhere = vi\.fn\(\)\.mockImplementation\(\(field, op, val\) => \{[\s\S]*?return query;\n  \}\);/, `const mockWhere = vi.fn().mockImplementation(function(this: any, field, op, val) {
     let query: any = { _isQuery: true, get: mockGet, _duplicateMatch: this?._duplicateMatch };
     query.where = mockWhere.bind(query);
     if (field === "subjectAssociationId" && val === "assoc1_already_detached") {
        query._duplicateMatch = true;
     }
     return query;
  });`);

auth = auth.replace(/const \{ mockSet, mockGet, mockRunTransaction, mockWhere, idempotencyState \} = vi\.hoisted/, 'const { mockGet, mockRunTransaction, mockWhere, idempotencyState, getSetCallCount, resetSetCallCount } = vi.hoisted');

auth = auth.replace(/mockSet\.mockClear\(\);/g, 'resetSetCallCount();');
auth = auth.replace(/expect\(mockSet\)\.toHaveBeenCalledTimes\(2\);/g, 'expect(getSetCallCount()).toBe(2);');
auth = auth.replace(/expect\(mockSet\)\.not\.toHaveBeenCalled\(\);/g, 'expect(getSetCallCount()).toBe(0);');

fs.writeFileSync('functions/test/submitFactCommandAuthority.test.ts', auth);
