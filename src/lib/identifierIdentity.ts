import { IdentifierRecord } from '../types';

/**
 * The canonical payload representing the deterministic semantic identity of an identifier.
 * This object structure strictly omits any ephemeral, owner-scoped, or mutable fields.
 */
export type IdentifierSemanticIdentityPayload = {
  app: 'scan.moukaeritai.work';
  idKind: 'identifier';
  identitySchemaVersion: number;
  canonicalizationVersion: number;
  kind: string;
  scheme: string;
  canonicalValue: string;
}

/**
 * Constructs a pure semantic identity payload from an IdentifierRecord or partial input.
 * Ensures the result only contains fields safe for UUIDv5 derivation.
 * Missing required identifying fields will result in an error.
 */
export function buildIdentifierSemanticIdentityPayload(
  input: Partial<IdentifierRecord>
): IdentifierSemanticIdentityPayload {
  if (!input.kind) throw new Error('Missing required field: kind');
  if (!input.scheme) throw new Error('Missing required field: scheme');
  if (!input.canonicalValue) throw new Error('Missing required field: canonicalValue');

  return {
    app: 'scan.moukaeritai.work',
    idKind: 'identifier',
    identitySchemaVersion: 1,
    canonicalizationVersion: 1,
    kind: input.kind,
    scheme: input.scheme,
    canonicalValue: input.canonicalValue,
  };
}

/**
 * Helper to get the semantic model version from an IdentifierRecord.
 * Defaults to 1 (legacy/current model) if not explicitly set to 2.
 */
export function getIdentifierIdentityModelVersion(input: Partial<IdentifierRecord>): 1 | 2 {
  return input.identityModelVersion === 2 ? 2 : 1;
}

/**
 * Helper to determine if an identifier record is intended to follow v2 semantics.
 */
export function isV2IdentifierRecord(input: Partial<IdentifierRecord>): boolean {
  return getIdentifierIdentityModelVersion(input) === 2;
}
