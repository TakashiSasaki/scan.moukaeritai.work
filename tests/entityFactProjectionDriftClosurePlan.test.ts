import { describe, it, expect } from 'vitest';
import {
  validateEntityFactProjectionDriftClosurePlan,
  formatEntityFactProjectionDriftClosurePlanValidation
} from '../scripts/lib/entity-fact-projection-drift-closure-plan.mjs';

describe('validateEntityFactProjectionDriftClosurePlan', () => {
  const getValidPlan = () => ({
    planType: "entity-fact-projection-drift-closure-plan",
    schemaVersion: 1,
    status: "planning-only",
    runtimeBehaviorChanged: false,
    firestoreRulesChanged: false,
    indexesChanged: false,
    readSwitchingAuthorized: false,
    migrationExecutionAuthorized: false,
    sourceAudit: "docs/migrations/entity-fact-projection-drift-audit.json",
    closureItems: [
      {
        id: "item-1",
        sourceDriftItemId: "audit-item-1",
        closureTrack: "track-1",
        runtimeChangeInThisStride: false,
        firestoreRulesChangeInThisStride: false,
        indexesChangeInThisStride: false,
        readSwitchingAuthorized: false,
        migrationExecutionAuthorized: false,
        closureStatus: "planned-not-started"
      }
    ],
    rulesIndexReadiness: {
      status: "planning-only",
      rulesChangedInThisStride: false,
      indexesChangedInThisStride: false,
      requiredChecksBeforeRulesHardening: [
        "npm run test:rules passes",
        "target rules reject unknown fields",
        "userIds-only access paths are tested where applicable",
        "legacy.ownerId-only access paths are tested where applicable",
        "normal users cannot update Facts",
        "normal users cannot create or update Projections",
        "admin/backend-only projection write path is separately validated"
      ],
      targetCollections: [
        "markers", "associations", "observations", "measurements", "events",
        "objectSummaries", "markerSummaries", "placeSummaries"
      ]
    }
  });

  const getValidAudit = () => ({
    driftItems: [
      { id: "audit-item-1" }
    ]
  });

  it('valid closure plan + valid audit returns "drift-closure-plan-valid"', () => {
    const plan = getValidPlan();
    const audit = getValidAudit();
    const result = validateEntityFactProjectionDriftClosurePlan(plan, { audit });
    expect(result.valid).toBe(true);
    expect(result.status).toBe('drift-closure-plan-valid');
  });

  it('missing source drift item coverage blocks/fails', () => {
    const plan = getValidPlan();
    const audit = { driftItems: [{ id: "audit-item-1" }, { id: "audit-item-2" }] };
    const result = validateEntityFactProjectionDriftClosurePlan(plan, { audit });
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('Audit drift item "audit-item-2" is not covered by any closure item'))).toBe(true);
  });

  it('duplicate source drift coverage warning or fail', () => {
    const plan = getValidPlan();
    plan.closureItems.push({
      ...plan.closureItems[0],
      id: "item-2" // maps to same sourceDriftItemId
    });
    const audit = getValidAudit();
    const result = validateEntityFactProjectionDriftClosurePlan(plan, { audit });
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('mapped to multiple closure items'))).toBe(true);
  });

  it('runtimeBehaviorChanged:true fails', () => {
    const plan = getValidPlan();
    plan.runtimeBehaviorChanged = true;
    const result = validateEntityFactProjectionDriftClosurePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('firestoreRulesChanged:true fails', () => {
    const plan = getValidPlan();
    plan.firestoreRulesChanged = true;
    const result = validateEntityFactProjectionDriftClosurePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('indexesChanged:true fails', () => {
    const plan = getValidPlan();
    plan.indexesChanged = true;
    const result = validateEntityFactProjectionDriftClosurePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('readSwitchingAuthorized:true fails', () => {
    const plan = getValidPlan();
    plan.readSwitchingAuthorized = true;
    const result = validateEntityFactProjectionDriftClosurePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('migrationExecutionAuthorized:true fails', () => {
    const plan = getValidPlan();
    plan.migrationExecutionAuthorized = true;
    const result = validateEntityFactProjectionDriftClosurePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('closure item with runtimeChangeInThisStride:true fails', () => {
    const plan = getValidPlan();
    plan.closureItems[0].runtimeChangeInThisStride = true;
    const result = validateEntityFactProjectionDriftClosurePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('closure item with firestoreRulesChangeInThisStride:true fails', () => {
    const plan = getValidPlan();
    plan.closureItems[0].firestoreRulesChangeInThisStride = true;
    const result = validateEntityFactProjectionDriftClosurePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('closure item with indexesChangeInThisStride:true fails', () => {
    const plan = getValidPlan();
    plan.closureItems[0].indexesChangeInThisStride = true;
    const result = validateEntityFactProjectionDriftClosurePlan(plan);
    expect(result.valid).toBe(false);
  });

  it('missing required rules hardening check fails', () => {
    const plan = getValidPlan();
    plan.rulesIndexReadiness.requiredChecksBeforeRulesHardening.pop();
    const result = validateEntityFactProjectionDriftClosurePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('missing required check'))).toBe(true);
  });

  it('missing target collection fails', () => {
    const plan = getValidPlan();
    plan.rulesIndexReadiness.targetCollections.pop();
    const result = validateEntityFactProjectionDriftClosurePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('missing required collection'))).toBe(true);
  });

  it('forbidden positive status phrase fails', () => {
    const plan = getValidPlan();
    plan.closureItems[0].closureStatus = "migration-complete";
    const result = validateEntityFactProjectionDriftClosurePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('Forbidden positive status phrase found'))).toBe(true);
  });
});

describe('formatEntityFactProjectionDriftClosurePlanValidation', () => {
  it('human-readable formatter contains all required text', () => {
    const result = {
      status: "drift-closure-plan-valid",
      valid: true,
      closureItemCount: 14,
      blockers: [],
      warnings: []
    };
    const str = formatEntityFactProjectionDriftClosurePlanValidation(result);

    expect(str).toContain("planning-only");
    expect(str).toContain("no runtime behavior changes");
    expect(str).toContain("no Firestore rules changes");
    expect(str).toContain("no index changes");
    expect(str).toContain("no migration execution");
    expect(str).toContain("no UI read switching");
    expect(str).toContain("not migration approval");
  });
});
