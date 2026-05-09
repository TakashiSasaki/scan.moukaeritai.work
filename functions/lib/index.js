"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppMetrics = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize Firebase Admin globally
admin.initializeApp();
/**
 * Callable function to securely fetch infrastructure metrics.
 * Since normal clients cannot access these GCP/Firebase backend metrics directly.
 */
exports.getAppMetrics = functions.https.onCall(async (request) => {
    // 1. Verify Authentication
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
    }
    // 2. Verify Admin Status (ABAC)
    const adminDoc = await admin.firestore().collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists) {
        throw new functions.https.HttpsError("permission-denied", "You do not have administrative privileges.");
    }
    try {
        const bucket = admin.storage().bucket();
        // Simplistic Bucket Size Calculation (Iterates files, good for small/medium buckets)
        // For massive scale, replace with @google-cloud/monitoring API fetching 'storage.googleapis.com/storage/total_bytes'
        const [files] = await bucket.getFiles();
        const totalBytes = files.reduce((sum, file) => sum + Number(file.metadata.size || 0), 0);
        const byteStringToMB = (totalBytes / (1024 * 1024)).toFixed(2);
        return {
            success: true,
            metrics: {
                storageTotalMB: byteStringToMB,
                storageFileCount: files.length,
                // Hint: You can expand this to use `@google-cloud/monitoring` 
                // to retrieve Firestore read/write stats and Vision API invocations securely.
                firestoreReadsEstimated: "Requires Cloud Monitoring API Setup",
            }
        };
    }
    catch (error) {
        console.error("Failed to calculate metrics:", error);
        throw new functions.https.HttpsError("internal", "Failed to calculate infrastructure metrics.");
    }
});
//# sourceMappingURL=index.js.map