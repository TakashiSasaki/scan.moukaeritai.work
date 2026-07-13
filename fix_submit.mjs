import fs from 'fs';
let content = fs.readFileSync('functions/src/submitFactCommand.ts', 'utf8');

content = content.replace(/if \(factType === "association"\) \{/, `if (factType === "association") {
      const operation = payloadData.operation;
      const subjectAssociationId = payloadData.subjectAssociationId;`);

fs.writeFileSync('functions/src/submitFactCommand.ts', content);
