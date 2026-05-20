"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateInventoryModel = exports.getClientIp = exports.describeImage = exports.identifyMatches = exports.getAppMetrics = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const genai_1 = require("@google/genai");
const params_1 = require("firebase-functions/params");
const monitoring_1 = require("@google-cloud/monitoring");
const dns = require("dns/promises");
// Initialize Firebase Admin globally
admin.initializeApp();
const appletConfig = {
    firestoreDatabaseId: "photo-moukaeritai-work",
    storageBucket: "photo-moukaeritai-work"
};
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
const metricClient = new monitoring_1.MetricServiceClient();
/**
 * Callable function to securely fetch infrastructure metrics.
 * Since normal clients cannot access these GCP/Firebase backend metrics directly.
 */
exports.getAppMetrics = (0, https_1.onCall)(async (request) => {
    // 1. Verify Authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    }
    // 2. Verify Admin Status (ABAC)
    const db = (0, firestore_1.getFirestore)(admin.app(), appletConfig.firestoreDatabaseId);
    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "You do not have administrative privileges.");
    }
    try {
        const bucket = admin.storage().bucket(appletConfig.storageBucket);
        // Simplistic Bucket Size Calculation (Iterates files, good for small/medium buckets)
        // For massive scale, replace with @google-cloud/monitoring API fetching 'storage.googleapis.com/storage/total_bytes'
        const [files] = await bucket.getFiles();
        const totalBytes = files.reduce((sum, file) => sum + Number(file.metadata.size || 0), 0);
        const byteStringToMB = (totalBytes / (1024 * 1024)).toFixed(2);
        let firestoreReadsEstimated = 0;
        let geminiInvocations = 0;
        const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || "moukaeritaid";
        const now = Date.now();
        const startTimeMillis = now - 1000 * 60 * 60 * 24 * 30; // 30 days
        const startTime = { seconds: Math.floor(startTimeMillis / 1000) };
        const endTime = { seconds: Math.floor(now / 1000) };
        try {
            const [timeSeries] = await metricClient.listTimeSeries({
                name: metricClient.projectPath(projectId),
                filter: 'metric.type="firestore.googleapis.com/document/read_count"',
                interval: { startTime, endTime },
            });
            firestoreReadsEstimated = timeSeries.reduce((acc, ts) => {
                const points = ts.points || [];
                return acc + points.reduce((pAcc, point) => { var _a; return pAcc + Number(((_a = point.value) === null || _a === void 0 ? void 0 : _a.int64Value) || 0); }, 0);
            }, 0);
        }
        catch (e) {
            console.warn("Could not fetch firestore metrics", e);
            firestoreReadsEstimated = `Error: ${e instanceof Error ? e.message : String(e)}`;
        }
        try {
            const [timeSeries] = await metricClient.listTimeSeries({
                name: metricClient.projectPath(projectId),
                filter: 'metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.labels.service="generativelanguage.googleapis.com"',
                interval: { startTime, endTime },
            });
            geminiInvocations = timeSeries.reduce((acc, ts) => {
                const points = ts.points || [];
                return acc + points.reduce((pAcc, point) => { var _a; return pAcc + Number(((_a = point.value) === null || _a === void 0 ? void 0 : _a.int64Value) || 0); }, 0);
            }, 0);
        }
        catch (e) {
            console.warn("Could not fetch gemini metrics", e);
            geminiInvocations = `Error: ${e instanceof Error ? e.message : String(e)}`;
        }
        return {
            success: true,
            metrics: {
                storageTotalMB: byteStringToMB,
                storageFileCount: files.length,
                firestoreReadsEstimated,
                geminiInvocations,
            }
        };
    }
    catch (error) {
        console.error("Failed to calculate metrics:", error);
        throw new https_1.HttpsError("internal", "Failed to calculate infrastructure metrics.");
    }
});
// Configure Gemini API inside the functions
function getGeminiClient() {
    const apiKey = geminiApiKey.value();
    if (!apiKey) {
        throw new https_1.HttpsError("failed-precondition", "GEMINI_API_KEY is not set on the server.");
    }
    return new genai_1.GoogleGenAI({ apiKey });
}
/**
 * Callable function to identify matching items from an image.
 */
exports.identifyMatches = (0, https_1.onCall)({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    }
    const searchImageBase64 = request.data.searchImageBase64;
    const items = request.data.items;
    if (!searchImageBase64 || !items) {
        throw new https_1.HttpsError("invalid-argument", "searchImageBase64 and items are required.");
    }
    const ai = getGeminiClient();
    const itemsContext = items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description
    }));
    const prompt = `
    You are a visual search assistant. The user has uploaded an image (enclosed in the request).
    The user also has a catalog of items they track.
    Your task is to identify which items from the catalog below most likely match the object in the uploaded photo.
    
    Catalog Items:
    ${JSON.stringify(itemsContext, null, 2)}
    
    Return a list of IDs of the matching items, in order of relevance.
    If no item clearly matches, suggest 0 or more IDs that are most similar.
    If you see a new item not in the catalog, mention that too.
    
    Response format: JUST a JSON array of item IDs.
  `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: searchImageBase64
                        }
                    },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });
        const result = JSON.parse(response.text || "[]");
        return result;
    }
    catch (error) {
        console.error("Gemini Search Error:", error);
        throw new https_1.HttpsError("internal", "Failed to identify matches from the image.");
    }
});
/**
 * Callable function to describe an image.
 */
exports.describeImage = (0, https_1.onCall)({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    }
    const imageBase64 = request.data.imageBase64;
    if (!imageBase64) {
        throw new https_1.HttpsError("invalid-argument", "imageBase64 is required.");
    }
    const ai = getGeminiClient();
    const prompt = `
    Describe this object concisely for a search engine. Include:
    1. What the object is.
    2. Color, material, and distinctive features.
    3. Any text visible on it.
    4. Possible categories (e.g. tools, electronics, kitchenware).
    
    Return as a short string of keywords.
  `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: imageBase64
                        }
                    },
                    { text: prompt }
                ]
            }
        });
        return response.text;
    }
    catch (error) {
        console.error("Gemini Describe Error:", error);
        throw new https_1.HttpsError("internal", "Failed to describe the image.");
    }
});
/**
 * Callable function to get the client's IP address and perform a reverse DNS lookup.
 */
exports.getClientIp = (0, https_1.onCall)(async (request) => {
    const req = request.rawRequest;
    let ip = "";
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
        ip = typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : forwardedFor[0].split(",")[0].trim();
    }
    else if (req.headers["fastly-client-ip"]) {
        ip = typeof req.headers["fastly-client-ip"] === "string" ? req.headers["fastly-client-ip"] : req.headers["fastly-client-ip"][0];
    }
    else if (req.ip) {
        ip = req.ip;
    }
    else if (req.socket && req.socket.remoteAddress) {
        ip = req.socket.remoteAddress;
    }
    // Remove IPv6 mapped IPv4 prefix if present
    if (ip && ip.startsWith("::ffff:")) {
        ip = ip.substring(7);
    }
    let reverseDns = [];
    if (ip) {
        try {
            reverseDns = await dns.reverse(ip);
        }
        catch (e) {
            console.warn(`Reverse DNS failed for IP: ${ip}`, e);
        }
    }
    return {
        ip: ip || "Unknown",
        reverseDns: reverseDns,
    };
});
/**
 * Callable function to migrate legacy `items` to the new normalized `objects` model.
 */
exports.migrateInventoryModel = (0, https_1.onCall)(async (request) => {
    // 1. Verify Authentication and Admin Status
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    }
    const db = (0, firestore_1.getFirestore)(admin.app(), appletConfig.firestoreDatabaseId);
    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "You do not have administrative privileges.");
    }
    const data = request.data || {};
    const dryRun = data.dryRun !== false; // default true
    const limit = data.limit || 500;
    let stats = {
        processed: 0,
        objectsCreated: 0,
        identifiersCreated: 0,
        imagesCreated: 0,
        eventsCreated: 0,
        skipped: 0,
        errors: 0
    };
    try {
        const itemsSnapshot = await db.collection("items").limit(limit).get();
        if (itemsSnapshot.empty) {
            return { success: true, message: "No legacy items found.", stats, dryRun };
        }
        let batch = db.batch();
        let batchWrites = 0;
        for (const doc of itemsSnapshot.docs) {
            stats.processed++;
            const item = doc.data();
            const itemId = doc.id;
            // Check if already migrated
            const existingObject = await db.collection("objects").doc(itemId).get();
            if (existingObject.exists) {
                stats.skipped++;
                continue;
            }
            if (!dryRun) {
                // 1. Create Object
                const objectRef = db.collection("objects").doc(itemId);
                batch.set(objectRef, {
                    objectId: itemId,
                    ownerId: item.ownerId,
                    name: item.name || '',
                    description: item.description || '',
                    status: 'active',
                    currentLocation: item.location || null,
                    createdAt: item.createdAt || admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: item.updatedAt || admin.firestore.FieldValue.serverTimestamp(),
                    legacy: {
                        sourceCollection: 'items',
                        legacyItemId: itemId
                    }
                });
                stats.objectsCreated++;
                batchWrites++;
                // 2. Create Identifier if QR or NFC
                // To be safe, we create a QR token for ALL legacy items since they were accessed via URLs using their ID.
                const idKey = `QR:QR-URL-TOKEN:${itemId.toUpperCase()}`.replace(/[^a-zA-Z0-9_-]/g, '_');
                const idRef = db.collection("identifiers").doc(idKey);
                batch.set(idRef, {
                    identifierKey: idKey,
                    ownerId: item.ownerId,
                    objectId: itemId,
                    kind: 'qr',
                    scheme: 'qr-url-token',
                    canonicalValue: itemId.toUpperCase(),
                    status: 'active',
                    createdAt: item.createdAt || admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: item.updatedAt || admin.firestore.FieldValue.serverTimestamp()
                });
                stats.identifiersCreated++;
                batchWrites++;
                // 3. Migrate Primary Image
                if (item.mainImageUrl) {
                    const imageId = `${itemId}-primary`;
                    const imageRef = db.collection("objectImages").doc(imageId);
                    batch.set(imageRef, {
                        imageId,
                        ownerId: item.ownerId,
                        objectId: itemId,
                        role: 'primary',
                        downloadUrl: item.mainImageUrl,
                        createdAt: item.createdAt || admin.firestore.FieldValue.serverTimestamp(),
                        createdBy: item.ownerId,
                        legacy: {
                            sourceField: 'mainImageUrl',
                            sourceUrl: item.mainImageUrl
                        }
                    });
                    // Update object to point to primary image
                    batch.update(objectRef, { primaryImageId: imageId });
                    stats.imagesCreated++;
                    batchWrites++;
                }
                // Context images (simplified for batch limits, skip if array is too large, but usually small)
                if (Array.isArray(item.contextImageUrls)) {
                    item.contextImageUrls.forEach((url, idx) => {
                        const imageId = `${itemId}-context-${idx}`;
                        const imageRef = db.collection("objectImages").doc(imageId);
                        batch.set(imageRef, {
                            imageId,
                            ownerId: item.ownerId,
                            objectId: itemId,
                            role: 'context',
                            downloadUrl: url,
                            sortOrder: idx,
                            createdAt: item.createdAt || admin.firestore.FieldValue.serverTimestamp(),
                            createdBy: item.ownerId,
                            legacy: {
                                sourceField: 'contextImageUrls',
                                sourceUrl: url
                            }
                        });
                        stats.imagesCreated++;
                        batchWrites++;
                    });
                }
                // 4. Create Migration Event
                const eventId = db.collection("objectEvents").doc().id;
                batch.set(db.collection("objectEvents").doc(eventId), {
                    eventId,
                    ownerId: item.ownerId,
                    objectId: itemId,
                    type: 'migrated',
                    occurredAt: admin.firestore.FieldValue.serverTimestamp(),
                    actorUid: request.auth.uid,
                    source: 'migration'
                });
                stats.eventsCreated++;
                batchWrites++;
                // Execute batch if near limit
                if (batchWrites > 400) {
                    await batch.commit();
                    batch = db.batch();
                    batchWrites = 0;
                }
            }
            else {
                // DRY RUN mode: just increment stats
                stats.objectsCreated++;
                stats.identifiersCreated++;
                if (item.mainImageUrl)
                    stats.imagesCreated++;
                if (Array.isArray(item.contextImageUrls))
                    stats.imagesCreated += item.contextImageUrls.length;
                stats.eventsCreated++;
            }
        }
        if (!dryRun && batchWrites > 0) {
            await batch.commit();
        }
        return {
            success: true,
            dryRun,
            stats
        };
    }
    catch (error) {
        console.error("Migration error:", error);
        throw new https_1.HttpsError("internal", "Migration failed.");
    }
});
//# sourceMappingURL=index.js.map