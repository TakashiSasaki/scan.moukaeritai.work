import { describe, it, expect } from 'vitest';
import { buildProjectionBackfillExecutionDesignGate, formatProjectionBackfillExecutionDesignGate } from '../scripts/lib/projection-backfill-execution-design-gate.mjs';

function createValidBundle(overallStatus, targets = [{ type: 'object', id: 'obj1' }, { type: 'marker', id: 'mrk1' }, { type: 'place', id: 'plc1' }]) {
  return {
    bundleType: 'projection-backfill-operation-validation-bundle',
    valid: true,
    written: false,
    overallStatus,
    batches: [
      {
        targets: targets.map(t => ({ targetType: t.type, targetId: t.id }))
      }
    ]
  };
}

describe('ProjectionBackfillExecutionDesignGate', () => {
  it('1. builds ready-for-execution-design from valid manual-write evidence covering object/marker/place', () => {
    const bundle = createValidBundle('manual-write-evidence-pass');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] });
    expect(gate.overallStatus).toBe('ready-for-execution-design');
    expect(gate.valid).toBe(true);
    expect(gate.manualWriteBundleCount).toBe(1);
    expect(gate.targetTypeCoverage['object'].hasEvidence).toBe(true);
    expect(gate.targetTypeCoverage['marker'].hasEvidence).toBe(true);
    expect(gate.targetTypeCoverage['place'].hasEvidence).toBe(true);
  });

  it('2. builds ready-for-execution-design from dry-run-only evidence when requireManualWriteEvidence:false', () => {
    const bundle = createValidBundle('dry-run-evidence-pass');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] }, { requireManualWriteEvidence: false });
    expect(gate.overallStatus).toBe('ready-for-execution-design');
    expect(gate.valid).toBe(true);
    expect(gate.dryRunBundleCount).toBe(1);
  });

  it('3. blocks dry-run-only evidence when manual evidence is required', () => {
    const bundle = createValidBundle('dry-run-evidence-pass');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] }, { requireManualWriteEvidence: true });
    expect(gate.overallStatus).toBe('blocked');
    expect(gate.valid).toBe(false);
    expect(gate.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing-manual-write-evidence' })]));
  });

  it('4. rejects missing validationBundles', () => {
    const gate = buildProjectionBackfillExecutionDesignGate({});
    expect(gate.overallStatus).toBe('fail');
    expect(gate.valid).toBe(false);
    expect(gate.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing-bundles' })]));
  });

  it('5. rejects empty validationBundles', () => {
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [] });
    expect(gate.overallStatus).toBe('fail');
    expect(gate.valid).toBe(false);
    expect(gate.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing-bundles' })]));
  });

  it('6. fails malformed bundle', () => {
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [null] });
    expect(gate.overallStatus).toBe('fail');
    expect(gate.valid).toBe(false);
    expect(gate.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'malformed-bundle' })]));
  });

  it('7. fails invalid bundle', () => {
    const bundle = createValidBundle('manual-write-evidence-pass');
    bundle.valid = false;
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] });
    expect(gate.overallStatus).toBe('fail');
    expect(gate.valid).toBe(false);
    expect(gate.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'invalid-bundle' })]));
  });

  it('8. fails bundle with overallStatus:"fail"', () => {
    const bundle = createValidBundle('fail');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] });
    expect(gate.overallStatus).toBe('fail');
    expect(gate.valid).toBe(false);
    expect(gate.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'bundle-failed' })]));
  });

  it('9. blocks bundle with overallStatus:"blocked"', () => {
    const bundle = createValidBundle('blocked');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] });
    expect(gate.overallStatus).toBe('blocked');
    expect(gate.valid).toBe(false);
    expect(gate.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'bundle-blocked' })]));
  });

  it('10. blocks missing required target type evidence', () => {
    const bundle = createValidBundle('manual-write-evidence-pass', [{ type: 'object', id: 'obj1' }, { type: 'marker', id: 'mrk1' }]);
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] });
    expect(gate.overallStatus).toBe('blocked');
    expect(gate.valid).toBe(false);
    expect(gate.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing-target-coverage' })]));
  });

  it('11. detects object target type coverage', () => {
    const bundle = createValidBundle('manual-write-evidence-pass', [{ type: 'object', id: 'obj1' }, { type: 'object', id: 'obj2' }]);
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] }, { requiredTargetTypes: ['object'] });
    expect(gate.targetTypeCoverage['object'].targetCount).toBe(2);
  });

  it('12. detects marker target type coverage', () => {
    const bundle = createValidBundle('manual-write-evidence-pass', [{ type: 'marker', id: 'mrk1' }, { type: 'marker', id: 'mrk2' }]);
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] }, { requiredTargetTypes: ['marker'] });
    expect(gate.targetTypeCoverage['marker'].targetCount).toBe(2);
  });

  it('13. detects place target type coverage', () => {
    const bundle = createValidBundle('manual-write-evidence-pass', [{ type: 'place', id: 'plc1' }, { type: 'place', id: 'plc2' }]);
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] }, { requiredTargetTypes: ['place'] });
    expect(gate.targetTypeCoverage['place'].targetCount).toBe(2);
  });

  it('14. blocks duplicate target evidence by default', () => {
    const bundle1 = createValidBundle('manual-write-evidence-pass', [{ type: 'object', id: 'obj1' }]);
    const bundle2 = createValidBundle('manual-write-evidence-pass', [{ type: 'object', id: 'obj1' }]);
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle1, bundle2] }, { requiredTargetTypes: ['object'] });
    expect(gate.overallStatus).toBe('blocked');
    expect(gate.valid).toBe(false);
    expect(gate.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'duplicate-target-evidence' })]));
  });

  it('15. allows duplicate target evidence when option enabled', () => {
    const bundle1 = createValidBundle('manual-write-evidence-pass', [{ type: 'object', id: 'obj1' }]);
    const bundle2 = createValidBundle('manual-write-evidence-pass', [{ type: 'object', id: 'obj1' }]);
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle1, bundle2] }, { requiredTargetTypes: ['object'], allowDuplicateTargetEvidence: true });
    expect(gate.overallStatus).toBe('ready-for-execution-design');
    expect(gate.valid).toBe(true);
    expect(gate.blockers).toEqual([]);
  });

  it('16. carries environment/operator metadata', () => {
    const bundle = createValidBundle('manual-write-evidence-pass');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle], environment: 'staging', operator: 'test-user' });
    expect(gate.environment).toBe('staging');
    expect(gate.operator).toBe('test-user');
  });

  it('17. carries notes', () => {
    const bundle = createValidBundle('manual-write-evidence-pass');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle], notes: ['test note'] });
    expect(gate.notes).toEqual(['test note']);
  });

  it('18. returns written:false', () => {
    const bundle = createValidBundle('manual-write-evidence-pass');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] });
    expect(gate.written).toBe(false);
  });

  it('19. formatter JSON output is parseable', () => {
    const bundle = createValidBundle('manual-write-evidence-pass');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] });
    const jsonStr = formatProjectionBackfillExecutionDesignGate(gate, { json: true });
    const parsed = JSON.parse(jsonStr);
    expect(parsed.gateType).toBe('projection-backfill-execution-design-gate');
  });

  it('20. readable formatter includes safety note', () => {
    const bundle = createValidBundle('manual-write-evidence-pass');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] });
    const text = formatProjectionBackfillExecutionDesignGate(gate);
    expect(text).toContain('*** SAFETY NOTE ***');
    expect(text).toContain('does not execute backfill');
  });

  it('21. invalid gate includes blockers in text output', () => {
    const gate = buildProjectionBackfillExecutionDesignGate({});
    const text = formatProjectionBackfillExecutionDesignGate(gate);
    expect(text).toContain('BLOCKERS:');
    expect(text).toContain('[missing-bundles]');
  });

  it('22. ready-for-execution-design text does not contain ready-for-backfill-execution', () => {
    const bundle = createValidBundle('manual-write-evidence-pass');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] });
    const text = formatProjectionBackfillExecutionDesignGate(gate);
    expect(text).not.toContain('ready-for-backfill-execution');
  });

  it('23. ready-for-execution-design text does not contain ready-for-ui-read-switching', () => {
    const bundle = createValidBundle('manual-write-evidence-pass');
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [bundle] });
    const text = formatProjectionBackfillExecutionDesignGate(gate);
    expect(text).not.toContain('ready-for-ui-read-switching');
  });

  it('24. blocks when manual evidence is required but missing for some required target types', () => {
    const manualBundle = createValidBundle('manual-write-evidence-pass', [{ type: 'object', id: 'obj1' }]);
    const dryRunBundle = createValidBundle('dry-run-evidence-pass', [{ type: 'marker', id: 'mrk1' }, { type: 'place', id: 'plc1' }]);
    const gate = buildProjectionBackfillExecutionDesignGate({ validationBundles: [manualBundle, dryRunBundle] });
    expect(gate.overallStatus).toBe('blocked');
    expect(gate.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing-manual-write-target-coverage' })]));
  });
});
