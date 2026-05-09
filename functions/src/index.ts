import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import { defineSecret } from "firebase-functions/params";

// Initialize Firebase Admin globally
admin.initializeApp();

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work",
  storageBucket: "photo-moukaeritai-work"
};

const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * Callable function to securely fetch infrastructure metrics.
 * Since normal clients cannot access these GCP/Firebase backend metrics directly.
 */
export const getAppMetrics = functions.https.onCall(async (request: any) => {
  // 1. Verify Authentication
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  // 2. Verify Admin Status (ABAC)
  const db = getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
  const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "You do not have administrative privileges.");
  }

  try {
    const bucket = admin.storage().bucket(appletConfig.storageBucket);
    
    // Simplistic Bucket Size Calculation (Iterates files, good for small/medium buckets)
    // For massive scale, replace with @google-cloud/monitoring API fetching 'storage.googleapis.com/storage/total_bytes'
    const [files] = await bucket.getFiles();
    const totalBytes = files.reduce((sum: any, file: any) => sum + Number(file.metadata.size || 0), 0);
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
  } catch (error) {
    console.error("Failed to calculate metrics:", error);
    throw new functions.https.HttpsError("internal", "Failed to calculate infrastructure metrics.");
  }
});

// Configure Gemini API inside the functions
function getGeminiClient() {
  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new functions.https.HttpsError("failed-precondition", "GEMINI_API_KEY is not set on the server.");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Callable function to identify matching items from an image.
 */
export const identifyMatches = functions.runWith({ secrets: [geminiApiKey] }).https.onCall(async (request: any) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  const searchImageBase64 = request.data.searchImageBase64;
  const items = request.data.items;

  if (!searchImageBase64 || !items) {
    throw new functions.https.HttpsError("invalid-argument", "searchImageBase64 and items are required.");
  }

  const ai = getGeminiClient();

  const itemsContext = items.map((item: any) => ({
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
    return result as string[];
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to identify matches from the image.");
  }
});

/**
 * Callable function to describe an image.
 */
export const describeImage = functions.runWith({ secrets: [geminiApiKey] }).https.onCall(async (request: any) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  const imageBase64 = request.data.imageBase64;
  if (!imageBase64) {
    throw new functions.https.HttpsError("invalid-argument", "imageBase64 is required.");
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
  } catch (error) {
    console.error("Gemini Describe Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to describe the image.");
  }
});
