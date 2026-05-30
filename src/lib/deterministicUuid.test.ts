import { describe, it, expect } from 'vitest';
import {
  APPLICATION_UUID_V5_NAMESPACE,
  canonicalizeJson,
  uuidV5FromCanonicalPayload,
} from './deterministicUuid';

describe('deterministicUuid', () => {
  describe('APPLICATION_UUID_V5_NAMESPACE', () => {
    it('should be the correct hardcoded constant', () => {
      // Do not change the namespace!
      expect(APPLICATION_UUID_V5_NAMESPACE).toBe('e23891cf-81cd-4231-b750-836376f90efe');
    });
  });

  describe('canonicalizeJson', () => {
    it('canonicalizes simple strings, numbers, booleans, and null', () => {
      expect(canonicalizeJson('test')).toBe('"test"');
      expect(canonicalizeJson(123)).toBe('123');
      expect(canonicalizeJson(true)).toBe('true');
      expect(canonicalizeJson(false)).toBe('false');
      expect(canonicalizeJson(null)).toBe('null');
    });

    it('sorts object keys deterministically', () => {
      const obj1 = { b: 2, a: 1, c: 3 };
      const obj2 = { a: 1, c: 3, b: 2 };

      expect(canonicalizeJson(obj1)).toBe('{"a":1,"b":2,"c":3}');
      expect(canonicalizeJson(obj1)).toEqual(canonicalizeJson(obj2));
    });

    it('preserves array order', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [3, 2, 1];

      expect(canonicalizeJson(arr1)).toBe('[1,2,3]');
      expect(canonicalizeJson(arr1)).not.toEqual(canonicalizeJson(arr2));
    });

    it('rejects undefined, NaN, and Infinity', () => {
      expect(() => canonicalizeJson(undefined)).toThrowError();
      expect(() => canonicalizeJson(NaN)).toThrowError(/NaN/);
      expect(() => canonicalizeJson(Infinity)).toThrowError(/Infinity/);
      expect(() => canonicalizeJson(-Infinity)).toThrowError(/Infinity/);
    });

    it('rejects arrays with undefined elements', () => {
      expect(() => canonicalizeJson([1, undefined, 3])).toThrowError(/undefined array elements/);
    });

    it('rejects non-plain objects like Date, Map, Set', () => {
      expect(() => canonicalizeJson(new Date())).toThrowError(/Unsupported object type/);
      expect(() => canonicalizeJson(new Map())).toThrowError(/Unsupported object type/);
      expect(() => canonicalizeJson(new Set())).toThrowError(/Unsupported object type/);
    });
  });

  describe('uuidV5FromCanonicalPayload', () => {
    it('generates the same UUID for the same input', () => {
      const payload = {
        app: 'scan.moukaeritai.work',
        idKind: 'identifier',
        identitySchemaVersion: 1,
        canonicalizationVersion: 1,
        kind: 'qr',
        scheme: 'https',
        canonicalValue: 'https://example.com/qr',
      };

      const uuid1 = uuidV5FromCanonicalPayload(payload);
      const uuid2 = uuidV5FromCanonicalPayload(payload);

      expect(uuid1).toBe(uuid2);
    });

    it('generates different UUIDs for different inputs', () => {
      const payload1 = { a: 1 };
      const payload2 = { a: 2 };

      const uuid1 = uuidV5FromCanonicalPayload(payload1);
      const uuid2 = uuidV5FromCanonicalPayload(payload2);

      expect(uuid1).not.toEqual(uuid2);
    });
  });
});
