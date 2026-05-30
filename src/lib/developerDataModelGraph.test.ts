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
});
