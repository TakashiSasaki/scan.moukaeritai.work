const fs = require('fs');
let code = fs.readFileSync('functions/src/submitFactCommand.ts', 'utf8');

// Add crypto import
if (!code.includes('import * as crypto from "crypto";')) {
  code = code.replace('import * as fs from "fs";', 'import * as crypto from "crypto";\nimport * as fs from "fs";');
}

// Add canonical stringifier
const hashFunc = `
function computeRequestHash(data: any): string {
  const canonicalStringify = (obj: any): string => {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(canonicalStringify).join(',') + ']';
    const keys = Object.keys(obj).sort();
    let result = '{';
    for (let i = 0; i < keys.length; i++) {
      if (i > 0) result += ',';
      result += JSON.stringify(keys[i]) + ':' + canonicalStringify(obj[keys[i]]);
    }
    return result + '}';
  };
  const str = canonicalStringify(data);
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}
`;
if (!code.includes('function computeRequestHash')) {
  code = code.replace('export const submitFactCommand', hashFunc + '\nexport const submitFactCommand');
}

// Update idempotency to be owner-scoped and check hash
// Replace:
/*
  // 3. Enforce Idempotency
  const idempotencyRef = db.collection("factCommands").doc(commandId);
*/
const idempotencyOld = `
  // 3. Enforce Idempotency
  const idempotencyRef = db.collection("factCommands").doc(commandId);
  const existingCommand = await idempotencyRef.get();
  if (existingCommand.exists) {
    const cmdData = existingCommand.data();
    if (cmdData && cmdData.ownerId === ownerId) {
      console.log(\`Idempotent Command hit for "\${commandId}". Returning cached receipt.\`);
      return {
        success: true,
        factId: cmdData.factId as string,
        commandId,
        projectionStatus: "pending"
      };
    } else {
      throw new HttpsError("permission-denied", "Idempotency collision with another user's command.");
    }
  }
`;

const idempotencyNew = `
  // 3. Compute Canonical Hash
  const requestHash = computeRequestHash(data);

  // 4. Validate participants & generate index arrays
`;
code = code.replace(idempotencyOld, idempotencyNew);

// Wait, if we remove idempotencyOld, how do we enforce idempotency? We enforce it inside the transaction!
// Let's modify the transaction part.

const transactionOld = `
  // 7. Write Fact and Command receipt in a single atomic transaction
  await db.runTransaction(async (transaction) => {
    // Write command receipt first
    transaction.set(idempotencyRef, {
      commandId,
      factType,
      factId,
      ownerId,
      executedAt: Timestamp.now()
    });

    // Write physical Fact document
    const factDocRef = db.collection(collectionName).doc(factId);
    transaction.set(factDocRef, documentToSave);
  });
`;

const transactionNew = `
  // 7. Write Fact and Command receipt in a single atomic transaction
  // owner-scoped command receipt
  const idempotencyRef = db.collection("users").doc(ownerId).collection("factCommands").doc(commandId);

  let returnedFactId = factId;

  await db.runTransaction(async (transaction) => {
    const existingCommand = await transaction.get(idempotencyRef);
    if (existingCommand.exists) {
      const cmdData = existingCommand.data();
      if (cmdData?.requestHash !== requestHash) {
        throw new HttpsError("invalid-argument", "Same commandId received with a different payload.");
      }
      // Idempotent hit
      returnedFactId = cmdData.factId as string;
      return;
    }

    // Association concurrency guard
    if (factType === "association" && (documentToSave.operation === "detach" || documentToSave.operation === "replace")) {
      const subjectAssociationId = documentToSave.subjectAssociationId;
      const duplicateQuery = db.collection("associations")
        .where("subjectAssociationId", "==", subjectAssociationId)
        .where("ownerId", "==", ownerId);
      const duplicateSnap = await transaction.get(duplicateQuery);
      const isAlreadyDetached = duplicateSnap.docs.some(doc => {
        const op = doc.data().operation;
        return op === "detach" || op === "replace";
      });
      if (isAlreadyDetached) {
        throw new HttpsError("failed-precondition", \`Referenced association "\${subjectAssociationId}" is already detached or replaced.\`);
      }
    }

    // Write command receipt
    transaction.set(idempotencyRef, {
      commandId,
      factType,
      factId,
      requestHash,
      ownerId,
      executedAt: Timestamp.now()
    });

    // Write physical Fact document
    const factDocRef = db.collection(collectionName).doc(factId);
    transaction.set(factDocRef, documentToSave);
  });

  console.log(\`Successfully processed command "\${commandId}" for Fact "\${returnedFactId}".\`);

  return {
    success: true,
    factId: returnedFactId,
    commandId,
    projectionStatus: "pending"
  };
`;

code = code.replace(transactionOld, transactionNew);
code = code.replace(/console\.log\(\`Successfully created immutable Fact.*?;/, '');
code = code.replace(/return \{\n    success: true,\n    factId,\n    commandId,\n    projectionStatus: "pending"\n  \};/, '');


// Now update provenance and time.receivedAt
// For provenance, we need to enforce actorUid = ownerId.
const replaceProvenance = (factType) => {
  // we can just regex replace this
};
// Actually, let's just do a string replace for documentToSave assignments.

// Association provenance
code = code.replace(
  /const associationProvenance = provenance \|\| \{\n      source: "user_confirmed",\n      confidence: "confirmed",\n      actorUid: ownerId\n    \};/,
  'const associationProvenance = { ...(provenance || { source: "user_confirmed", confidence: "confirmed" }), actorUid: ownerId };'
);

// General provenance replacement
code = code.replace(/provenance,\n      participants:/g, 'provenance: { ...(provenance || {}), actorUid: ownerId },\n      participants:');


// General time replacement to make receivedAt backend authoritative
code = code.replace(
  /receivedAt: Timestamp\.fromDate\(new Date\(time\.receivedAt \|\| new Date\(\)\.toISOString\(\)\)\)/g,
  'receivedAt: Timestamp.now()'
);

fs.writeFileSync('functions/src/submitFactCommand.ts', code);
