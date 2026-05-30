import { describe, it, expect } from 'vitest';
import {
  buildIdentifierSemanticIdentityPayload,
  getIdentifierIdentityModelVersion,
  isV2IdentifierRecord,
} from './identifierIdentity';
import { IdentifierRecord } from '../types';

describe('identifierIdentity', () => {
  describe('buildIdentifierSemanticIdentityPayload', () => {
    it('should construct a valid payload with correct constant fields', () => {
      const input: Partial<IdentifierRecord> = {
        kind: 'qr',
        scheme: 'test-scheme',
        canonicalValue: 'test-value',
      };

      const payload = buildIdentifierSemanticIdentityPayload(input);

      expect(payload).toEqual({
        app: 'scan.moukaeritai.work',
        idKind: 'identifier',
        identitySchemaVersion: 1,
        canonicalizationVersion: 1,
        kind: 'qr',
        scheme: 'test-scheme',
        canonicalValue: 'test-value',
      });
    });

    it('should strictly exclude ephemeral, owner-scoped, and mutable fields', () => {
      // Input containing all sorts of fields that should be ignored
      const input: any = {
        kind: 'nfc',
        scheme: 'test-scheme',
        canonicalValue: 'test-value',
        ownerId: 'user-123',
        objectId: 'obj-456',
        rawPayload: { some: 'data' },
        status: 'active',
        label: 'My Label',
        idPurpose: 'test',
        identityModelVersion: 2,
        rawValue: 'raw-test-value',
        legacyItemId: 'old-item',
        firstObservedAt: 'timestamp',
      };

      const payload = buildIdentifierSemanticIdentityPayload(input);

      // Verify the returned object only has the 7 expected keys
      const keys = Object.keys(payload);
      expect(keys).toHaveLength(7);

      expect(payload).not.toHaveProperty('ownerId');
      expect(payload).not.toHaveProperty('objectId');
      expect(payload).not.toHaveProperty('rawPayload');
      expect(payload).not.toHaveProperty('status');
      expect(payload).not.toHaveProperty('label');
      expect(payload).not.toHaveProperty('idPurpose');
      expect(payload).not.toHaveProperty('identityModelVersion');
      expect(payload).not.toHaveProperty('rawValue');
    });

    it('should throw if kind is missing', () => {
      expect(() => buildIdentifierSemanticIdentityPayload({ scheme: 's', canonicalValue: 'v' })).toThrowError(/kind/);
    });

    it('should throw if scheme is missing', () => {
      expect(() => buildIdentifierSemanticIdentityPayload({ kind: 'qr', canonicalValue: 'v' })).toThrowError(/scheme/);
    });

    it('should throw if canonicalValue is missing', () => {
      expect(() => buildIdentifierSemanticIdentityPayload({ kind: 'qr', scheme: 's' })).toThrowError(/canonicalValue/);
    });

    it('changing kind changes the semantic identity payload', () => {
      const p1 = buildIdentifierSemanticIdentityPayload({ kind: 'qr', scheme: 's', canonicalValue: 'v' });
      const p2 = buildIdentifierSemanticIdentityPayload({ kind: 'nfc', scheme: 's', canonicalValue: 'v' });
      expect(p1.kind).not.toEqual(p2.kind);
      expect(p1).not.toEqual(p2);
    });

    it('changing scheme changes the semantic identity payload', () => {
      const p1 = buildIdentifierSemanticIdentityPayload({ kind: 'qr', scheme: 's1', canonicalValue: 'v' });
      const p2 = buildIdentifierSemanticIdentityPayload({ kind: 'qr', scheme: 's2', canonicalValue: 'v' });
      expect(p1.scheme).not.toEqual(p2.scheme);
      expect(p1).not.toEqual(p2);
    });

    it('changing canonicalValue changes the semantic identity payload', () => {
      const p1 = buildIdentifierSemanticIdentityPayload({ kind: 'qr', scheme: 's', canonicalValue: 'v1' });
      const p2 = buildIdentifierSemanticIdentityPayload({ kind: 'qr', scheme: 's', canonicalValue: 'v2' });
      expect(p1.canonicalValue).not.toEqual(p2.canonicalValue);
      expect(p1).not.toEqual(p2);
    });
  });

  describe('getIdentifierIdentityModelVersion', () => {
    it('should return 1 when identityModelVersion is absent', () => {
      expect(getIdentifierIdentityModelVersion({})).toBe(1);
    });

    it('should return 1 when identityModelVersion is 1', () => {
      expect(getIdentifierIdentityModelVersion({ identityModelVersion: 1 })).toBe(1);
    });

    it('should return 2 when identityModelVersion is 2', () => {
      expect(getIdentifierIdentityModelVersion({ identityModelVersion: 2 })).toBe(2);
    });
  });

  describe('isV2IdentifierRecord', () => {
    it('should return false for missing version', () => {
      expect(isV2IdentifierRecord({})).toBe(false);
    });

    it('should return false for version 1', () => {
      expect(isV2IdentifierRecord({ identityModelVersion: 1 })).toBe(false);
    });

    it('should return true for version 2', () => {
      expect(isV2IdentifierRecord({ identityModelVersion: 2 })).toBe(true);
    });
  });
});
