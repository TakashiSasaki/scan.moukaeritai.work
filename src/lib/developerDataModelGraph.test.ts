import { describe, it, expect } from 'vitest';
import { dataModelNodes, dataModelEdges } from './developerDataModelGraph';

describe('developerDataModelGraph', () => {
  it('should have unique node IDs', () => {
    const ids = new Set<string>();
    for (const node of dataModelNodes) {
      expect(ids.has(node.id)).toBe(false);
      ids.add(node.id);
    }
  });

  it('should have unique edge IDs', () => {
    const ids = new Set<string>();
    for (const edge of dataModelEdges) {
      expect(ids.has(edge.id)).toBe(false);
      ids.add(edge.id);
    }
  });

  it('every edge source and target should refer to an existing node', () => {
    const nodeIds = new Set(dataModelNodes.map(n => n.id));

    for (const edge of dataModelEdges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it('should include the core collections', () => {
    const coreCollections = [
      'objects',
      'identifiers',
      'objectIdentifierBindings',
      'identifierObservations',
      'objectEvents',
      'objectImages',
    ];

    const collectionNodes = dataModelNodes.filter(n => n.type === 'collection');
    const collectionLabels = collectionNodes.map(n => n.label);

    for (const core of coreCollections) {
      expect(collectionLabels).toContain(core);
    }
  });

  it('should have required metadata fields if newly introduced', () => {
    // Assert all nodes have descriptions now that we added them in this PR
    for (const node of dataModelNodes) {
      expect(node.description).toBeDefined();
      expect(typeof node.description).toBe('string');

      expect(node.status).toBeDefined();
      expect(['current', 'legacy', 'future-only', 'blocked', 'transitional']).toContain(node.status);
    }
  });

  it('should include specific conceptual nodes', () => {
    const labels = dataModelNodes.map(n => n.label);
    expect(labels).toContain('ACL future-only');
    expect(labels).toContain('identifierClaims future-only');
    expect(labels).toContain('Ownerless global identifier model');
    expect(labels).toContain('Phase 7E migration execution blocked');
  });

  it('should model semantic identity inclusion and exclusion edges correctly', () => {
    const edges = dataModelEdges;

    // Check inclusions
    const includesKind = edges.find(e => e.type === 'includesInIdentity' && e.target === 'fld_kind');
    expect(includesKind).toBeDefined();

    const includesCanonicalValue = edges.find(e => e.type === 'includesInIdentity' && e.target === 'fld_canonicalValue');
    expect(includesCanonicalValue).toBeDefined();

    // Check exclusions
    const excludesOwnerId = edges.find(e => e.type === 'excludesFromIdentity' && e.target === 'fld_ownerId');
    expect(excludesOwnerId).toBeDefined();

    const excludesObjectId = edges.find(e => e.type === 'excludesFromIdentity' && e.target === 'fld_objectId');
    expect(excludesObjectId).toBeDefined();
  });
});
