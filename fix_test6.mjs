import fs from 'fs';
let content = fs.readFileSync('functions/test/submitFactCommandAuthority.test.ts', 'utf8');

content = content.replace(/set: \(ref, data\) => \{[\s\S]*?\}\n      \}/, `set: (ref: any, data: any) => {
         mockSet(ref, data);
         if (ref && ref.path && ref.path.startsWith('doc/test-user|')) {
           idempotencyState[ref.path] = data;
         } else if (ref && ref.path) {
           databaseState[ref.path] = data;
         }
      }`);

content = content.replace(/expect\(getSetCallCount\(\)\).toBe\(2\);/g, 'expect(mockSet).toHaveBeenCalledTimes(2);');
content = content.replace(/expect\(getSetCallCount\(\)\).toBe\(0\);/g, 'expect(mockSet).toHaveBeenCalledTimes(0);');
content = content.replace(/resetSetCallCount\(\);/g, 'mockSet.mockClear();');

fs.writeFileSync('functions/test/submitFactCommandAuthority.test.ts', content);
