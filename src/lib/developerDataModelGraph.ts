export type GraphNodeType = 'collection' | 'field' | 'semanticIdentityPayload' | 'documentId' | 'relationship' | 'migrationPhase' | 'futureConcept' | 'ruleImpact' | 'legacyCompatibility';
export type GraphEdgeType = 'hasField' | 'documentIdIs' | 'derivesKeyFrom' | 'includesInIdentity' | 'excludesFromIdentity' | 'references' | 'canonicalRelation' | 'legacyCompatibility' | 'futureOnly' | 'migrationDependsOn' | 'rulesAffectedBy';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  x: number;
  y: number;
  description?: string;
  status?: 'current' | 'legacy' | 'future-only' | 'blocked' | 'transitional';
  notes?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  label: string;
  description?: string;
}

export const dataModelNodes: GraphNode[] = [
  // Collections
  { id: 'col_objects', label: 'objects', type: 'collection', x: 0, y: 0, description: 'Core physical asset records.', status: 'current' },
  { id: 'col_identifiers', label: 'identifiers', type: 'collection', x: 4, y: 0, description: 'Lookup records for scannable tags (e.g. QR, NFC). Currently migrating to an ownerless/global model.', status: 'current' },
  { id: 'col_objectIdentifierBindings', label: 'objectIdentifierBindings', type: 'collection', x: 2, y: -2, description: 'Canonical active relationship state tying an identifier to an object.', status: 'current' },
  { id: 'col_identifierObservations', label: 'identifierObservations', type: 'collection', x: 6, y: -2, description: 'Time-series evidence records of scans or sightings.', status: 'current' },
  { id: 'col_objectEvents', label: 'objectEvents', type: 'collection', x: 0, y: 4, description: 'Append-only operational history/audit log for objects.', status: 'current' },
  { id: 'col_objectImages', label: 'objectImages', type: 'collection', x: 0, y: -4, description: 'Normalized storage for images associated with objects.', status: 'current' },
  { id: 'col_items', label: 'items (legacy)', type: 'collection', x: -4, y: 0, description: 'Original flat data model combining object, tags, and images. Now legacy.', status: 'legacy' },
  { id: 'col_users', label: 'users', type: 'collection', x: -6, y: -2, description: 'Standard mapping for authenticated user data.', status: 'current' },
  { id: 'col_admins', label: 'admins', type: 'collection', x: -6, y: 2, description: 'System administrators with elevated privileges.', status: 'current' },

  // Semantic Identity Payload
  { id: 'payload_semanticIdentity', label: 'Identifier semantic identity payload', type: 'semanticIdentityPayload', x: 8, y: 2, description: 'The strictly canonical JSON payload used to generate deterministic UUIDv5 identifierKeys.', status: 'current' },

  // Fields
  { id: 'fld_identifierKey', label: 'identifierKey', type: 'field', x: 4, y: 2, description: 'UUIDv5 document ID derived from the semantic identity payload.', status: 'current' },
  { id: 'fld_objectId', label: 'objectId', type: 'field', x: 0, y: 2, description: 'The UUIDv4 ID of an object. In identifiers, this acts as a legacy non-authoritative reference.', status: 'current', notes: 'Canonical object relationship is defined by objectIdentifierBindings.' },
  { id: 'fld_ownerId', label: 'ownerId', type: 'field', x: 2, y: 4, description: 'The user owning the record. Excluded from semantic identity.', status: 'current' },
  { id: 'fld_kind', label: 'kind', type: 'field', x: 8, y: 4, description: 'The general category (e.g., qr, nfc, manual).', status: 'current' },
  { id: 'fld_scheme', label: 'scheme', type: 'field', x: 10, y: 4, description: 'The sub-scheme (e.g., qr-url-token).', status: 'current' },
  { id: 'fld_canonicalValue', label: 'canonicalValue', type: 'field', x: 9, y: 5, description: 'The canonicalized tag value (e.g., standardizing capitalization).', status: 'current' },
  { id: 'fld_rawValue', label: 'rawValue', type: 'field', x: 6, y: 4, description: 'Legacy exact snapshot of the tag data. Preferred approach is rawPayload.', status: 'legacy' },
  { id: 'fld_rawPayload', label: 'rawPayload', type: 'field', x: 7, y: 5, description: 'Optional exact source JSON from the tag, strictly constrained to a top-level map in rules (Stage 1).', status: 'current', notes: 'Stage 7D.10 allowed this additively.' },
  { id: 'fld_identityModelVersion', label: 'identityModelVersion', type: 'field', x: 10, y: 3, description: 'Runtime interpretation model version. Values: 1 or 2.', status: 'current' },
  { id: 'fld_identitySchemaVersion', label: 'identitySchemaVersion', type: 'field', x: 11, y: 2, description: 'UUIDv5 payload structure version. Value: 1.', status: 'current' },
  { id: 'fld_canonicalizationVersion', label: 'canonicalizationVersion', type: 'field', x: 10, y: 1, description: 'Rule version for JCS canonicalization. Value: 1.', status: 'current' },
  { id: 'fld_createdAt', label: 'createdAt', type: 'field', x: 2, y: 2, description: 'Firestore serverTimestamp upon creation. Excluded from identity.', status: 'current' },
  { id: 'fld_updatedAt', label: 'updatedAt', type: 'field', x: 1, y: 3, description: 'Firestore serverTimestamp upon update. Excluded from identity.', status: 'current' },

  // Excluded Fields
  { id: 'fld_status', label: 'status (excluded)', type: 'field', x: 12, y: 4, description: 'Mutable state (e.g., active, lost) excluded from deterministic identity.', status: 'current' },
  { id: 'fld_label', label: 'label (excluded)', type: 'field', x: 12, y: 5, description: 'Mutable human-readable label excluded from deterministic identity.', status: 'current' },

  // Relationships/Concepts
  { id: 'rel_binding', label: 'Object-Identifier Binding', type: 'relationship', x: 2, y: 0, description: 'Canonical mapping tying an identifier to an object.', status: 'current' },
  { id: 'rel_legacy', label: 'Legacy objectId compatibility', type: 'legacyCompatibility', x: 4, y: -4, description: 'Retaining objectId on identifiers for backward compatibility.', status: 'legacy' },
  { id: 'rel_ownerless', label: 'Ownerless global identifier model', type: 'futureConcept', x: 8, y: -4, description: 'Directional shift to stop relying on ownerId for identifier identity.', status: 'future-only' },
  { id: 'rel_rules', label: 'Firestore rules transition', type: 'ruleImpact', x: -4, y: -4, description: 'Incremental stages for Firestore security rules changes.', status: 'transitional' },
  { id: 'rel_phase7e', label: 'Phase 7E migration execution blocked', type: 'migrationPhase', x: -4, y: 2, description: 'Execution of legacy item observation backfill is blocked.', status: 'blocked' },
  { id: 'rel_acl', label: 'ACL future-only', type: 'futureConcept', x: 6, y: -6, description: 'Future granular access control on identifiers (currently rejected).', status: 'future-only' },
  { id: 'rel_claims', label: 'identifierClaims future-only', type: 'futureConcept', x: 8, y: -6, description: 'Future mechanism to assert ownership without hard locks.', status: 'future-only' }
];

export const dataModelEdges: GraphEdge[] = [
  // Collection to Fields
  { id: 'e1', source: 'col_identifiers', target: 'fld_identifierKey', type: 'hasField', label: 'has', description: 'Identifiers use identifierKey as document ID.' },
  { id: 'e2', source: 'col_identifiers', target: 'fld_objectId', type: 'hasField', label: 'legacy ref', description: 'Legacy non-authoritative reference.' },
  { id: 'e3', source: 'col_identifiers', target: 'fld_kind', type: 'hasField', label: 'has' },
  { id: 'e4', source: 'col_identifiers', target: 'fld_scheme', type: 'hasField', label: 'has' },
  { id: 'e5', source: 'col_identifiers', target: 'fld_canonicalValue', type: 'hasField', label: 'has' },
  { id: 'e6', source: 'col_identifiers', target: 'fld_rawValue', type: 'hasField', label: 'has' },
  { id: 'e7', source: 'col_identifiers', target: 'fld_rawPayload', type: 'hasField', label: 'has' },
  { id: 'e8', source: 'col_objects', target: 'fld_objectId', type: 'documentIdIs', label: 'doc ID', description: 'Objects use objectId as document ID.' },
  { id: 'e_col_id_ownerId', source: 'col_identifiers', target: 'fld_ownerId', type: 'hasField', label: 'has', description: 'Still required by current rules but moving towards ownerless.' },
  { id: 'e_col_id_createdAt', source: 'col_identifiers', target: 'fld_createdAt', type: 'hasField', label: 'has' },
  { id: 'e_col_id_updatedAt', source: 'col_identifiers', target: 'fld_updatedAt', type: 'hasField', label: 'has' },

  // Bindings
  { id: 'e9', source: 'col_objectIdentifierBindings', target: 'col_objects', type: 'references', label: 'binds', description: 'References the target objectId.' },
  { id: 'e10', source: 'col_objectIdentifierBindings', target: 'col_identifiers', type: 'references', label: 'binds', description: 'References the target identifierKey.' },
  { id: 'e11', source: 'col_objectIdentifierBindings', target: 'rel_binding', type: 'canonicalRelation', label: 'represents', description: 'Active canonical relationship.' },

  // Semantic Identity
  { id: 'e12', source: 'payload_semanticIdentity', target: 'fld_identifierKey', type: 'derivesKeyFrom', label: 'generates', description: 'UUIDv5 hash of canonical JCS payload.' },
  { id: 'e13', source: 'payload_semanticIdentity', target: 'fld_kind', type: 'includesInIdentity', label: 'includes' },
  { id: 'e14', source: 'payload_semanticIdentity', target: 'fld_scheme', type: 'includesInIdentity', label: 'includes' },
  { id: 'e15', source: 'payload_semanticIdentity', target: 'fld_canonicalValue', type: 'includesInIdentity', label: 'includes' },
  { id: 'e16', source: 'payload_semanticIdentity', target: 'fld_identitySchemaVersion', type: 'includesInIdentity', label: 'includes' },
  { id: 'e17', source: 'payload_semanticIdentity', target: 'fld_canonicalizationVersion', type: 'includesInIdentity', label: 'includes' },

  // Exclusions from Semantic Identity
  { id: 'e18', source: 'payload_semanticIdentity', target: 'fld_ownerId', type: 'excludesFromIdentity', label: 'excludes', description: 'ownerId does not affect semantic identity.' },
  { id: 'e19', source: 'payload_semanticIdentity', target: 'fld_objectId', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e20', source: 'payload_semanticIdentity', target: 'fld_rawPayload', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e21', source: 'payload_semanticIdentity', target: 'fld_rawValue', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e22', source: 'payload_semanticIdentity', target: 'fld_status', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e23', source: 'payload_semanticIdentity', target: 'fld_label', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e24', source: 'payload_semanticIdentity', target: 'rel_claims', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e_payload_createdAt', source: 'payload_semanticIdentity', target: 'fld_createdAt', type: 'excludesFromIdentity', label: 'excludes' },
  { id: 'e_payload_updatedAt', source: 'payload_semanticIdentity', target: 'fld_updatedAt', type: 'excludesFromIdentity', label: 'excludes' },

  // Observations
  { id: 'e25', source: 'col_identifierObservations', target: 'col_identifiers', type: 'references', label: 'observes' },
  { id: 'e26', source: 'col_identifierObservations', target: 'col_objects', type: 'references', label: 'optional ref', description: 'objectId is optional for loose observation evidence.' },
  { id: 'e_obs_ownerId', source: 'col_identifierObservations', target: 'fld_ownerId', type: 'hasField', label: 'has', description: 'Used for scoping/access control.' },

  // Legacy & Migration
  { id: 'e27', source: 'col_items', target: 'col_objects', type: 'legacyCompatibility', label: 'migrated to', description: 'Legacy items model migration path.' },
  { id: 'e28', source: 'col_identifiers', target: 'rel_legacy', type: 'legacyCompatibility', label: 'has objectId', description: 'Retained for backwards compatibility.' },
  { id: 'e29', source: 'col_identifiers', target: 'rel_ownerless', type: 'futureOnly', label: 'moving towards' },
  { id: 'e30', source: 'rel_phase7e', target: 'col_items', type: 'migrationDependsOn', label: 'blocks', description: 'Migration execution is strictly blocked.' },

  // Events
  { id: 'e31', source: 'col_objectEvents', target: 'col_objects', type: 'references', label: 'belongs to' },

  // Images
  { id: 'e32', source: 'col_objectImages', target: 'col_objects', type: 'references', label: 'belongs to' },

  // Rules
  { id: 'e33', source: 'rel_rules', target: 'col_identifiers', type: 'rulesAffectedBy', label: 'affects', description: 'Stage 1 additive field allowance.' },
  { id: 'e34', source: 'rel_rules', target: 'col_objects', type: 'rulesAffectedBy', label: 'affects' }
];
