import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import { defineSecret } from "firebase-functions/params";
import { MetricServiceClient } from "@google-cloud/monitoring";

// Initialize Firebase Admin globally
admin.initializeApp();

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work",
  storageBucket: "photo-moukaeritai-work"
};

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const metricClient = new MetricServiceClient();

/**
 * Callable function to securely fetch infrastructure metrics.
 * Since normal clients cannot access these GCP/Firebase backend metrics directly.
 */
export const getAppMetrics = onCall(async (request: any) => {
  // 1. Verify Authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  // 2. Verify Admin Status (ABAC)
  const db = getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
  const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "You do not have administrative privileges.");
  }

  try {
    const bucket = admin.storage().bucket(appletConfig.storageBucket);
    
    // Simplistic Bucket Size Calculation (Iterates files, good for small/medium buckets)
    // For massive scale, replace with @google-cloud/monitoring API fetching 'storage.googleapis.com/storage/total_bytes'
    const [files] = await bucket.getFiles();
    const totalBytes = files.reduce((sum: any, file: any) => sum + Number(file.metadata.size || 0), 0);
    const byteStringToMB = (totalBytes / (1024 * 1024)).toFixed(2);

    let firestoreReadsEstimated: string | number = 0;
    let geminiInvocations: string | number = 0;

    const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || "moukaeritaid";
    const now = Date.now();
    const startTimeMillis = now - 1000 * 60 * 60 * 24 * 30; // 30 days
    const startTime = { seconds: Math.floor(startTimeMillis / 1000) };
    const endTime = { seconds: Math.floor(now / 1000) };

    try {
      const [timeSeries] = await metricClient.listTimeSeries({
        name: metricClient.projectPath(projectId),
        filter: `metric.type="firestore.googleapis.com/document/read_count" AND resource.labels.database_id="${appletConfig.firestoreDatabaseId}"`,
        interval: { startTime, endTime },
      });
      firestoreReadsEstimated = timeSeries.reduce((acc, ts) => {
        const points = ts.points || [];
        return acc + points.reduce((pAcc, point) => pAcc + Number(point.value?.int64Value || 0), 0);
      }, 0);
    } catch(e) {
      console.warn("Could not fetch firestore metrics", e);
      firestoreReadsEstimated = "Error";
    }

    try {
      const dbApiKey = geminiApiKey.value() ?? "";
      const [timeSeries] = await metricClient.listTimeSeries({
        name: metricClient.projectPath(projectId),
        filter: `metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.labels.service="generativelanguage.googleapis.com" AND metric.labels.credential_id="apikey:${dbApiKey}"`,
        interval: { startTime, endTime },
      });
      geminiInvocations = timeSeries.reduce((acc, ts) => {
        const points = ts.points || [];
        return acc + points.reduce((pAcc, point) => pAcc + Number(point.value?.int64Value || 0), 0);
      }, 0);
    } catch(e) {
      console.warn("Could not fetch gemini metrics", e);
      geminiInvocations = "Error";
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
  } catch (error) {
    console.error("Failed to calculate metrics:", error);
    throw new HttpsError("internal", "Failed to calculate infrastructure metrics.");
  }
});

// Configure Gemini API inside the functions
function getGeminiClient() {
  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "GEMINI_API_KEY is not set on the server.");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Callable function to identify matching items from an image.
 */
export const identifyMatches = onCall({ secrets: [geminiApiKey] }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const searchImageBase64 = request.data.searchImageBase64;
  const items = request.data.items;

  if (!searchImageBase64 || !items) {
    throw new HttpsError("invalid-argument", "searchImageBase64 and items are required.");
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
    throw new HttpsError("internal", "Failed to identify matches from the image.");
  }
});

/**
 * Callable function to describe an image.
 */
export const describeImage = onCall({ secrets: [geminiApiKey] }, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const imageBase64 = request.data.imageBase64;
  if (!imageBase64) {
    throw new HttpsError("invalid-argument", "imageBase64 is required.");
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
    throw new HttpsError("internal", "Failed to describe the image.");
  }
});
