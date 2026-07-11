export interface DryRunResult {
  counts: {
    identifiersChecked: number;
    objectsChecked: number;
    candidateCounts: {
      identifiers: number;
      objects: number;
    };
  };
  candidates: any[];
  skipped: any[];
  warnings: any[];
}

export async function runObservationBackfillDryRun(db: any, uid: string, limits: any): Promise<DryRunResult> {
  return {
    counts: { identifiersChecked: 0, objectsChecked: 0, candidateCounts: { identifiers: 0, objects: 0 } },
    candidates: [],
    skipped: [],
    warnings: []
  };
}
