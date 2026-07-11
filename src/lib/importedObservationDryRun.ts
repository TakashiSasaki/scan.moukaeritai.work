export interface ImportedObservationDryRunResult {
  counts: {
    identifiersChecked: number;
  };
  candidateCounts: number;
  candidates: any[];
  skipped: any[];
  warnings: any[];
}

export async function runImportedObservationDryRun(db: any, uid: string, limits: any): Promise<ImportedObservationDryRunResult> {
  return {
    counts: { identifiersChecked: 0 },
    candidateCounts: 0,
    candidates: [],
    skipped: [],
    warnings: []
  };
}
