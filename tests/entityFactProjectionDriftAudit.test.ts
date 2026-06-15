import { describe, it, expect } from 'vitest';
import {
  validateEntityFactProjectionDriftAudit,
  formatEntityFactProjectionDriftAuditValidation
} from '../scripts/lib/entity-fact-projection-drift-audit.mjs';

describe('validateEntityFactProjectionDriftAudit', () => {
  const getValidAudit = () => (({
    auditType: "entity-fact-projection-drift-audit",
    schemaVersion: 1,
    status: "documentation-only",
    runtimeBehaviorChanged: false,
    sourceOfTruth: {
      currentRuntime: "legacy",
      targetModel: "EFP"
    },
    driftItems: [
      { id: "objects-current-location", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "objects-identifier-summary", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "object-record-created-at-updated-at", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "identifier-record-observed-at", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "identifier-record-created-at-updated-at", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "object-identifier-binding-attached-detached-at", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "object-identifier-binding-created-at-updated-at", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "identifiers-owner-id", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "identifiers-object-id", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false, currentRuntimeAuthoritative: false },
      { id: "object-identifier-bindings-collection", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "identifier-observations-collection", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "object-events-collection", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "object-images-collection", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false },
      { id: "items-collection", currentPath: "x", targetModel: "y", classification: "z", migrationStatus: "w", followUp: "a", runtimeChangeInThisStride: false, readSwitchingAuthorized: false }
    ],
    nonGoals: [],
    validation: {}
  } as any));

  it('should return drift-audit-valid for a fully valid audit', () => {
    const audit = getValidAudit();
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(true);
    expect(result.status).toBe('drift-audit-valid');
    expect(result.blockerCount).toBe(0);
  });

  it('should fail if missing required drift items', () => {
    const audit = getValidAudit();
    audit.driftItems = audit.driftItems.slice(0, 5); // remove some items
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.blockerCount).toBeGreaterThan(0);
    expect(result.blockers.some(b => b.includes("Missing required drift item"))).toBe(true);
  });

  it('should fail if runtimeBehaviorChanged is true', () => {
    const audit = getValidAudit();
    audit.runtimeBehaviorChanged = true;
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("runtimeBehaviorChanged must be false"))).toBe(true);
  });

  it('should fail if top-level written is true', () => {
    const audit = getValidAudit();
    audit.written = true;
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("written must be strictly false or omitted"))).toBe(true);
  });

  it('should fail if top-level written is a non-boolean truthy value', () => {
    const audit = getValidAudit();
    audit.written = "true";
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("written must be strictly false or omitted"))).toBe(true);
  });

  it('should fail if top-level readSwitchingAuthorized is true', () => {
    const audit = getValidAudit();
    audit.readSwitchingAuthorized = true;
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("readSwitchingAuthorized must be strictly false or omitted"))).toBe(true);
  });

  it('should fail if top-level readSwitchingAuthorized is a non-boolean truthy value', () => {
    const audit = getValidAudit();
    audit.readSwitchingAuthorized = 1;
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("readSwitchingAuthorized must be strictly false or omitted"))).toBe(true);
  });

  it('should fail if a drift item has runtimeChangeInThisStride as true', () => {
    const audit = getValidAudit();
    audit.driftItems[0].runtimeChangeInThisStride = true;
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("invalid runtimeChangeInThisStride"))).toBe(true);
  });

  it('should fail if a drift item has readSwitchingAuthorized as true', () => {
    const audit = getValidAudit();
    audit.driftItems[0].readSwitchingAuthorized = true;
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("invalid readSwitchingAuthorized"))).toBe(true);
  });

  it('should fail if identifiers-object-id is marked authoritative', () => {
    const audit = getValidAudit();
    const objectIdItem = audit.driftItems.find((i: any) => i.id === "identifiers-object-id");
    if (objectIdItem) {
      objectIdItem.currentRuntimeAuthoritative = true;
    }
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("must be non-authoritative"))).toBe(true);
  });

  it('should fail if a forbidden positive status phrase is present', () => {
    const audit = getValidAudit();
    audit.nonGoals.push("We are not production-ready yet."); // using the forbidden word
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("Forbidden positive status phrase found"))).toBe(true);
  });

  it('should fail if a drift item is malformed', () => {
    const audit = getValidAudit();
    delete audit.driftItems[0].currentPath;
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("missing required string property 'currentPath'"))).toBe(true);
  });

  it('should fail if auditType is incorrect', () => {
    const audit = getValidAudit();
    audit.auditType = "invalid-type";
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("Invalid auditType"))).toBe(true);
  });

  it('should fail if status is not documentation-only', () => {
    const audit = getValidAudit();
    audit.status = "something-else";
    const result = validateEntityFactProjectionDriftAudit(audit);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes("Invalid status"))).toBe(true);
  });
});

describe('formatEntityFactProjectionDriftAuditValidation', () => {
  it('should output the required safety notes in human readable format', () => {
    const result = {
      status: "drift-audit-valid",
      auditType: "test",
      driftItemCount: 1,
      requiredDriftItemCoverage: {},
      blockerCount: 0,
      warningCount: 0,
      blockers: [],
      warnings: [],
      safetyNotes: [
        "This is a documentation/local validation only.",
        "Passing this validation does not authorize runtime migration, backfill, projection recompute behavior changes, Firestore rule changes, or UI read switching.",
        "drift-audit-valid is not migration approval."
      ]
    };

    const formatted = formatEntityFactProjectionDriftAuditValidation(result);

    expect(formatted).toContain("This is a documentation/local validation only.");
    expect(formatted).toContain("No runtime behavior changes.");
    expect(formatted).toContain("No UI read switching.");
    expect(formatted).toContain("drift-audit-valid is not migration approval.");
  });
});
