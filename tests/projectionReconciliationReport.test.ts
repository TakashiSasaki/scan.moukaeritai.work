import { describe, it, expect } from 'vitest';
import {
  parseCallableResultEnvelope,
  buildProjectionReconciliationReport,
  formatProjectionReconciliationReport,
} from '../scripts/lib/projection-reconciliation-report.mjs';

describe('projection-reconciliation-report helper', () => {
  describe('parseCallableResultEnvelope', () => {
    it('1. accepts callable { result: ... } envelope', () => {
      const input = { result: { success: true, count: 1 } };
      expect(parseCallableResultEnvelope(input)).toEqual({ success: true, count: 1 });
    });

    it('2. accepts direct result object', () => {
      const input = { success: true, count: 1 };
      expect(parseCallableResultEnvelope(input)).toEqual({ success: true, count: 1 });
    });

    it('14. rejects invalid JSON-like shapes', () => {
      expect(() => parseCallableResultEnvelope(null)).toThrow('Input must be a non-null object');
      expect(() => parseCallableResultEnvelope('not an object')).toThrow('Input must be a non-null object');
    });
  });

  describe('buildProjectionReconciliationReport', () => {
    it('3. classifies equal target', () => {
      const input = {
        success: true,
        totalTargets: 1,
        equalCount: 1,
        differentCount: 0,
        missingSummaryCount: 0,
        errorCount: 0,
        results: [
          {
            success: true,
            targetType: 'object',
            targetId: 'obj-1',
            summaryPath: 'objectSummaries/obj-1',
            existingSummaryExists: true,
            reconciliation: { equal: true }
          }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      expect(report.targets[0].status).toBe('equal');
      expect(report.computedCounts.equal).toBe(1);
    });

    it('4. classifies different target', () => {
      const input = {
        success: true,
        totalTargets: 1,
        equalCount: 0,
        differentCount: 1,
        missingSummaryCount: 0,
        errorCount: 0,
        results: [
          {
            success: true,
            targetType: 'object',
            targetId: 'obj-1',
            summaryPath: 'objectSummaries/obj-1',
            existingSummaryExists: true,
            reconciliation: {
              equal: false,
              differenceCount: 2,
              diff: {
                changedPaths: ['a'],
                missingPaths: ['b'],
              }
            }
          }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      expect(report.targets[0].status).toBe('different');
      expect(report.targets[0].differenceCount).toBe(2);
      expect(report.computedCounts.different).toBe(1);
    });

    it('5. classifies missing summary target', () => {
      const input = {
        success: true,
        totalTargets: 1,
        equalCount: 0,
        differentCount: 0,
        missingSummaryCount: 1,
        errorCount: 0,
        results: [
          {
            success: true,
            targetType: 'object',
            targetId: 'obj-1',
            summaryPath: 'objectSummaries/obj-1',
            existingSummaryExists: false
          }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      expect(report.targets[0].status).toBe('missing-summary');
      expect(report.computedCounts.missingSummary).toBe(1);
    });

    it('6. classifies error target', () => {
      const input = {
        success: true,
        totalTargets: 1,
        equalCount: 0,
        differentCount: 0,
        missingSummaryCount: 0,
        errorCount: 1,
        results: [
          {
            success: false,
            targetType: 'object',
            targetId: 'obj-1',
            summaryPath: 'objectSummaries/obj-1',
            error: { code: 'not-found', message: 'Entity not found' }
          }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      expect(report.targets[0].status).toBe('error');
      expect(report.targets[0].error).toEqual({ code: 'not-found', message: 'Entity not found' });
      expect(report.computedCounts.errors).toBe(1);
    });

    it('7. computes aggregate counts from results', () => {
      const input = {
        success: true,
        totalTargets: 3,
        equalCount: 1,
        differentCount: 1,
        missingSummaryCount: 1,
        errorCount: 0,
        results: [
          { success: true, existingSummaryExists: true, reconciliation: { equal: true } },
          { success: true, existingSummaryExists: true, reconciliation: { equal: false } },
          { success: true, existingSummaryExists: false }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      expect(report.computedCounts.equal).toBe(1);
      expect(report.computedCounts.different).toBe(1);
      expect(report.computedCounts.missingSummary).toBe(1);
      expect(report.computedCounts.errors).toBe(0);
      expect(report.countMismatch).toBe(false);
    });

    it('8. detects count mismatch', () => {
      const input = {
        success: true,
        totalTargets: 2, // Mismatch: results array has 1 item
        equalCount: 1,
        differentCount: 0,
        missingSummaryCount: 0,
        errorCount: 0,
        results: [
          { success: true, existingSummaryExists: true, reconciliation: { equal: true } }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      expect(report.countMismatch).toBe(true);
    });

    it('9. sets overallStatus pass when all equal', () => {
      const input = {
        success: true,
        totalTargets: 1,
        equalCount: 1,
        differentCount: 0,
        missingSummaryCount: 0,
        errorCount: 0,
        results: [
          { success: true, existingSummaryExists: true, reconciliation: { equal: true } }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      expect(report.overallStatus).toBe('pass');
    });

    it('10. sets overallStatus attention for differences without errors', () => {
      const input = {
        success: true,
        totalTargets: 1,
        equalCount: 0,
        differentCount: 1,
        missingSummaryCount: 0,
        errorCount: 0,
        results: [
          { success: true, existingSummaryExists: true, reconciliation: { equal: false } }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      expect(report.overallStatus).toBe('attention');
    });

    it('11. sets overallStatus attention for missing summaries without errors', () => {
      const input = {
        success: true,
        totalTargets: 1,
        equalCount: 0,
        differentCount: 0,
        missingSummaryCount: 1,
        errorCount: 0,
        results: [
          { success: true, existingSummaryExists: false }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      expect(report.overallStatus).toBe('attention');
    });

    it('12. sets overallStatus fail for target errors', () => {
      const input = {
        success: true,
        totalTargets: 1,
        equalCount: 0,
        differentCount: 0,
        missingSummaryCount: 0,
        errorCount: 1,
        results: [
          { success: false }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      expect(report.overallStatus).toBe('fail');
    });

    it('13. sets overallStatus fail for count mismatch', () => {
      const input = {
        success: true,
        totalTargets: 1, // Will mismatch because 0 results
        equalCount: 0,
        differentCount: 0,
        missingSummaryCount: 0,
        errorCount: 0,
        results: []
      };
      const report = buildProjectionReconciliationReport(input);
      expect(report.countMismatch).toBe(true);
      expect(report.overallStatus).toBe('fail');
    });

    it('rejects invalid inputs to buildProjectionReconciliationReport', () => {
      expect(() => buildProjectionReconciliationReport({ noSuccessField: true })).toThrow('Invalid result object');
    });
  });

  describe('formatProjectionReconciliationReport', () => {
    it('15. formats a readable report containing target identifiers and status labels', () => {
      const input = {
        success: true,
        totalTargets: 2,
        equalCount: 1,
        differentCount: 1,
        missingSummaryCount: 0,
        errorCount: 0,
        results: [
          {
            success: true,
            targetType: 'object',
            targetId: 'obj-1',
            summaryPath: 'objectSummaries/obj-1',
            existingSummaryExists: true,
            reconciliation: { equal: true }
          },
          {
            success: true,
            targetType: 'marker',
            targetId: 'm-1',
            summaryPath: 'markerSummaries/m-1',
            existingSummaryExists: true,
            reconciliation: {
              equal: false,
              differenceCount: 2,
              diff: {
                changedPaths: ['some.path'],
                missingPaths: ['other.path'],
                extraPaths: []
              }
            }
          }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      const text = formatProjectionReconciliationReport(report);
      expect(text).toContain('Overall status: attention');
      expect(text).toContain('Total targets: 2');
      expect(text).toContain('- object obj-1 objectSummaries/obj-1: equal');
      expect(text).toContain('- marker m-1 markerSummaries/m-1: different (differenceCount=2, changed=1, missing=1, extra=0)');
    });

    it('formats a report containing errors', () => {
      const input = {
        success: true,
        totalTargets: 1,
        equalCount: 0,
        differentCount: 0,
        missingSummaryCount: 0,
        errorCount: 1,
        results: [
          {
            success: false,
            targetType: 'object',
            targetId: 'obj-1',
            summaryPath: 'objectSummaries/obj-1',
            error: { message: 'Entity not found' }
          }
        ]
      };
      const report = buildProjectionReconciliationReport(input);
      const text = formatProjectionReconciliationReport(report);
      expect(text).toContain('Overall status: fail');
      expect(text).toContain('- object obj-1 objectSummaries/obj-1: error (error=Entity not found)');
    });

    it('outputs valid JSON', () => {
      const input = { success: true, totalTargets: 0, equalCount: 0, differentCount: 0, missingSummaryCount: 0, errorCount: 0, results: [] };
      const report = buildProjectionReconciliationReport(input);
      const jsonStr = formatProjectionReconciliationReport(report, { json: true });
      const parsed = JSON.parse(jsonStr);
      expect(parsed.overallStatus).toBe('pass');
    });

    it('formats mismatch count warning', () => {
      const input = { success: true, totalTargets: 1, equalCount: 0, differentCount: 0, missingSummaryCount: 0, errorCount: 0, results: [] };
      const report = buildProjectionReconciliationReport(input);
      const text = formatProjectionReconciliationReport(report);
      expect(text).toContain('WARNING: Count mismatch detected between computed counts and reported top-level counts.');
    });
  });
});
