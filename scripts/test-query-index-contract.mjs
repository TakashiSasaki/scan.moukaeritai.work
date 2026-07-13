import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexesPath = path.join(__dirname, "../firestore.indexes.json");
const submitFactPath = path.join(__dirname, "../functions/src/submitFactCommand.ts");

const indexesContent = JSON.parse(fs.readFileSync(indexesPath, "utf8"));
const submitFactContent = fs.readFileSync(submitFactPath, "utf8");

const hasOwnerIdSubjectQuery = submitFactContent.includes('.where("subjectAssociationId", "==", subjectAssociationId)') && submitFactContent.includes('.where("ownerId", "==", ownerId)');

if (!hasOwnerIdSubjectQuery) {
  throw new Error("Missing query requirement: where subjectAssociationId == X and ownerId == Y");
}

const requiredIndex = indexesContent.indexes.find(idx => 
  idx.collectionGroup === "associations" &&
  idx.fields.length === 2 &&
  idx.fields.some(f => f.fieldPath === "ownerId" && f.order === "ASCENDING") &&
  idx.fields.some(f => f.fieldPath === "subjectAssociationId" && f.order === "ASCENDING")
);

if (!requiredIndex) {
  throw new Error("Missing required index: ownerId ASCENDING, subjectAssociationId ASCENDING on associations collection");
}

console.log("Query index contract check passed.");
