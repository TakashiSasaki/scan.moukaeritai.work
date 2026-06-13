import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import {
  reconstructObjectSummary,
  reconstructMarkerSummary,
  reconstructPlaceSummary,
  stripUndefinedDeep,
} from "@scan/efp-model";
import type { Timestamp } from "@scan/efp-model";
import {
  parseRecomputeProjectionSummaryInput,
  ProjectionRecomputeInputError,
  type RecomputeProjectionSummaryInput,
} from "./projectionRecomputeInput";
import { getProjectionRecomputeFactQueryPlan } from "./projectionRecomputeFactPlan";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

function getDb() {
  return getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
}

function withDocumentId<T extends Record<string, unknown>>(
  doc: admin.firestore.QueryDocumentSnapshot,
  idField: string
): T {
  const data = doc.data() as T;
  return {
    ...data,
    [idField]: data[idField] ?? doc.id
  } as T;
}

export const recomputeProjectionSummary = onCall(
  async (request: CallableRequest<RecomputeProjectionSummaryInput>) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

  const db = getDb();
  const adminDoc = await db.collection("admins").doc(request.auth.uid).get();

  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Admin privileges are required.");
  }

    let parsedInput;
    try {
      parsedInput = parseRecomputeProjectionSummaryInput(request.data);
    } catch (error) {
      if (error instanceof ProjectionRecomputeInputError) {
        throw new HttpsError("invalid-argument", error.message);
      }
      throw error;
    }

    const {
      targetType,
      targetId,
      dryRun,
      entityCollection,
      summaryCollection,
      summaryPath,
    } = parsedInput;

    try {
      const entitySnap = await db.collection(entityCollection).doc(targetId).get();
    if (!entitySnap.exists) {
      throw new HttpsError("not-found", "Target entity not found.");
    }

    const asOf = admin.firestore.Timestamp.now() as unknown as Timestamp;

    let associations: any[] = [];
    let observations: any[] = [];
    let measurements: any[] = [];
    let events: any[] = [];

    let summary: any;

      const factQueryPlan = getProjectionRecomputeFactQueryPlan(targetType);

      await Promise.all(
        factQueryPlan.map(async (entry) => {
          const snap = await db
            .collection(entry.collection)
            .where(entry.indexField, "array-contains", targetId)
            .get();

          const facts = snap.docs.map((doc) => withDocumentId(doc, entry.idField));

          if (entry.resultKey === "associations") associations = facts;
          else if (entry.resultKey === "observations") observations = facts;
          else if (entry.resultKey === "measurements") measurements = facts;
          else if (entry.resultKey === "events") events = facts;
        })
      );

      if (targetType === "object") {
        summary = reconstructObjectSummary({
          objectId: targetId,
          associations,
          measurements,
          observations,
          asOf,
        });

      } else if (targetType === "marker") {
        summary = reconstructMarkerSummary({
          markerKey: targetId,
          associations,
          observations,
          asOf,
        });

      } else if (targetType === "place") {
        summary = reconstructPlaceSummary({
          placeId: targetId,
          associations,
          observations,
          measurements,
          events,
          asOf,
        });
      }

      let written = false;
      const cleanSummary = stripUndefinedDeep(summary);

      if (!dryRun) {
        await db.collection(summaryCollection).doc(targetId).set(cleanSummary);
        written = true;
      }

      return {
        success: true,
        dryRun,
        targetType,
        targetId,
        summaryPath,
        summary: cleanSummary,
        factsRead: {
          associations: associations.length,
          observations: observations.length,
          measurements: measurements.length,
          events: events.length,
        },
        written,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Projection Recompute Error:", error);
      throw new HttpsError("internal", "An unexpected error occurred during projection recomputation.");
    }
  }
);
