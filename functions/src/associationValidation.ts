import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Validates 'attach' operation.
 */
export function validateAttach(data: any) {
  if (data.subjectAssociationId) {
    throw new HttpsError("invalid-argument", "Attach operation must not provide a subjectAssociationId.");
  }
}

/**
 * Validates 'detach' operation and checks for duplicate detaches.
 */
export async function validateDetach(
  db: admin.firestore.Firestore,
  ownerId: string,
  subjectAssociationId: string
) {
  if (!subjectAssociationId) {
    throw new HttpsError("invalid-argument", "Detach operation requires a subjectAssociationId.");
  }

  // 1. Verify the subject association exists and belongs to the owner
  const subjectSnap = await db.collection("associations").doc(subjectAssociationId).get();
  if (!subjectSnap.exists) {
    throw new HttpsError("failed-precondition", `Referenced subject association ID "${subjectAssociationId}" was not found.`);
  }
  if (subjectSnap.data()?.ownerId !== ownerId) {
    throw new HttpsError("permission-denied", `Referenced subject association "${subjectAssociationId}" does not belong to you.`);
  }

  // 2. Check for duplicate detaches: is there already an association with operation 'detach' or 'replace' referencing this subject?
  const duplicateSnap = await db
    .collection("associations")
    .where("subjectAssociationId", "==", subjectAssociationId)
    .where("ownerId", "==", ownerId)
    .get();

  const isAlreadyDetached = duplicateSnap.docs.some(doc => {
    const op = doc.data().operation;
    return op === "detach" || op === "replace";
  });

  if (isAlreadyDetached) {
    throw new HttpsError("failed-precondition", `Referenced association "${subjectAssociationId}" is already detached or replaced.`);
  }
}

/**
 * Validates 'replace' operation and checks for duplicate replacement/detach.
 */
export async function validateReplace(
  db: admin.firestore.Firestore,
  ownerId: string,
  subjectAssociationId: string
) {
  await validateDetach(db, ownerId, subjectAssociationId);
}
