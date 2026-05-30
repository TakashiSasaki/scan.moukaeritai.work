export interface GraphNode {
  id: string;
  label: string;
  type: 'collection' | 'field' | 'semanticIdentityPayload' | 'documentId' | 'relationship' | 'migrationPhase' | 'futureConcept' | 'ruleImpact' | 'legacyCompatibility';
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'hasField' | 'documentIdIs' | 'derivesKeyFrom' | 'includesInIdentity' | 'excludesFromIdentity' | 'references' | 'canonicalRelation' | 'legacyCompatibility' | 'futureOnly' | 'migrationDependsOn' | 'rulesAffectedBy';
  label: string;
}

export const dataModelNodes: GraphNode[] = [
  // Collections
  { id: 'col_objects', label: 'objects', type: 'collection', x: 0, y: 0 },
  { id: 'col_identifiers', label: 'identifiers', type: 'collection', x: 4, y: 0 },
  { id: 'col_objectIdentifierBindings', label: 'objectIdentifierBindings', type: 'collection', x: 2, y: -2 },
  { id: 'col_identifierObservations', label: 'identifierObservations', type: 'collection', x: 6, y: -2 },
  { id: 'col_objectEvents', label: 'objectEvents', type: 'collection', x: 0, y: 4 },
  { id: 'col_objectImages', label: 'objectImages', type: 'collection', x: 0, y: -4 },
  { id: 'col_items', label: 'items (legacy)', type: 'collection', x: -4, y: 0 },

  // Semantic Identity Payload
  { id: 'payload_semanticIdentity', label: 'Identifier semantic identity payload', type: 'semanticIdentityPayload', x: 8, y: 2 },

  // Fields
  { id: 'fld_identifierKey', label: 'identifierKey', type: 'field', x: 4, y: 2 },
  { id: 'fld_objectId', label: 'objectId', type: 'field', x: 0, y: 2 },
  { id: 'fld_ownerId', label: 'ownerId', type: 'field', x: 2, y: 4 },
  { id: 'fld_kind', label: 'kind', type: 'field', x: 8, y: 4 },
  { id: 'fld_scheme', label: 'scheme', type: 'field', x: 10, y: 4 },
  { id: 'fld_canonicalValue', label: 'canonicalValue', type: 'field', x: 9, y: 5 },
  { id: 'fld_rawValue', label: 'rawValue', type: 'field', x: 6, y: 4 },
  { id: 'fld_rawPayload', label: 'rawPayload', type: 'field', x: 7, y: 5 },
  { id: 'fld_identityModelVersion', label: 'identityModelVersion', type: 'field', x: 10, y: 3 },
  { id: 'fld_identitySchemaVersion', label: 'identitySchemaVersion', type: 'field', x: 11, y: 2 },
  { id: 'fld_canonicalizationVersion', label: 'canonicalizationVersion', type: 'field', x: 10, y: 1 },

  // Excluded Fields
  { id: 'fld_status', label: 'status (excluded)', type: 'field', x: 12, y: 4 },
  { id: 'fld_label', label: 'label (excluded)', type: 'field', x: 12, y: 5 },

  // Relationships/Concepts
  { id: 'rel_binding', label: 'Object-Identifier Binding', type: 'relationship', x: 2, y: 0 },
  { id: 'rel_legacy', label: 'Legacy objectId compatibility', type: 'legacyCompatibility', x: 4, y: -4 },
  { id: 'rel_ownerless', label: 'Ownerless global identifier model', type: 'futureConcept', x: 8, y: -4 },
  { id: 'rel_rules', label: 'Firestore rules transition', type: 'ruleImpact', x: -4, y: -4 },
  { id: 'rel_phase7e', label: 'Phase 7E migration execution blocked', type: 'migrationPhase', x: -4, y: 2 },
  { id: 'rel_acl', label: 'ACL future-only', type: 'futureConcept', x: 6, y: -6 },
  { id: 'rel_claims', label: 'identifierClaims future-only', type: 'futureConcept', x: 8, y: -6 }
];

export const dataModelEdges: GraphEdge[] = [
  // Collection to Fields
  { id: 'e1', source: 'col_identifiers', target: 'fld_identifierKey', type: 'hasField', label: 'has' },
  { id: 'e2', source: 'col_identifiers', target: 'fld_objectId', type: 'hasField', label: 'legacy ref' },
  { id: 'e3', source: 'col_identifiers', target: 'fld_kind', type: 'hasField', label: 'has' },
  { id: 'e4', source: 'col_identifiers', target: 'fld_scheme', type: 'hasField', label: 'has' },
  { id: 'e5', source: 'col_identifiers', target: 'fld_canonicalValue', type: 'hasField', label: 'has' },
  { id: 'e6', source: 'col_identifiers', target: 'fld_rawValue', type: 'hasField', label: 'has' },
  { id: 'e7', source: 'col_identifiers', target: 'fld_rawPayload', type: 'hasField', label: 'has' },
  { id: 'e8', source: 'col_objects', target: 'fld_objectId', type: 'documentIdIs', label: 'doc ID' },

  // Bindings
  { id: 'e9', source: 'col_objectIdentifierBindings', target: 'col_objects', type: 'references', label: 'binds' },
  { id: 'e10', source: 'col_objectIdentifierBindings', target: 'col_identifiers', type: 'references', label: 'binds' },
  { id: 'e11', source: 'col_objectIdentifierBindings', target: 'rel_binding', type: 'canonicalRelation', label: 'represents' },

  // Semantic Identity
  { id: 'e12', source: 'payload_semanticIdentity', target: 'fld_identifierKey', type: 'derivesKeyFrom', label: 'generates' },
  { id: 'e13', source: 'payload_semanticIdentity', target: 'fld_kind', type: 'includesInIdentity', label: 'includes' },
  { id: 'e14', source: 'payload_semanticIdentity', target: 'fld_scheme', type: 'includesInIdentity', label: 'includes' },
  { id: 'e15', source: 'payload_semanticIdentity', target: 'fld_canonicalValue', type: 'includesInIdentity', label: 'includes' },
  { id: 'e16', source: 'payload_semanticIdentity', target: 'fld_identitySchemaVersion', type: 'includesInIdentity', label: 'includes' },
  { id: 'e17', source: 'payload_semanticIdentity', target: 'fld_canonicalizationVersion', type: 'includesInIdentity', label: 'includes' },

  // Exclusions from Semantic Identity
  { id: 'e18', source: 'payload_semanticIdentity', target: 'fld_ownerId', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e19', source: 'payload_semanticIdentity', target: 'fld_objectId', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e20', source: 'payload_semanticIdentity', target: 'fld_rawPayload', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e21', source: 'payload_semanticIdentity', target: 'fld_rawValue', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e22', source: 'payload_semanticIdentity', target: 'fld_status', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e23', source: 'payload_semanticIdentity', target: 'fld_label', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e24', source: 'payload_semanticIdentity', target: 'rel_claims', type: 'excludesFromIdentity', label: 'excludes' },

  // Observations
  { id: 'e25', source: 'col_identifierObservations', target: 'col_identifiers', type: 'references', label: 'observes' },
  { id: 'e26', source: 'col_identifierObservations', target: 'col_objects', type: 'references', label: 'optional ref' },

  // Legacy & Migration
  { id: 'e27', source: 'col_items', target: 'col_objects', type: 'legacyCompatibility', label: 'migrated to' },
  { id: 'e28', source: 'col_identifiers', target: 'rel_legacy', type: 'legacyCompatibility', label: 'has objectId' },
  { id: 'e29', source: 'col_identifiers', target: 'rel_ownerless', type: 'futureOnly', label: 'moving towards' },
  { id: 'e30', source: 'rel_phase7e', target: 'col_items', type: 'migrationDependsOn', label: 'blocks' },

  // Events
  { id: 'e31', source: 'col_objectEvents', target: 'col_objects', type: 'references', label: 'belongs to' },

  // Images
  { id: 'e32', source: 'col_objectImages', target: 'col_objects', type: 'references', label: 'belongs to' },

  // Rules
  { id: 'e33', source: 'rel_rules', target: 'col_identifiers', type: 'rulesAffectedBy', label: 'affects' },
  { id: 'e34', source: 'rel_rules', target: 'col_objects', type: 'rulesAffectedBy', label: 'affects' }
];
