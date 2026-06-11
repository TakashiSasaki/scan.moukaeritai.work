import { describe, it, expect } from 'vitest';
import { entityKey, buildParticipantKeys, buildFactIndexFields } from '../src/lib/factParticipants';
import { Participant } from '../src/types/entityFactProjection';

describe('factParticipants', () => {
  describe('entityKey', () => {
    it('formats entity refs correctly', () => {
      expect(entityKey({ entityType: 'marker', id: 'MK-1' })).toBe('marker:MK-1');
      expect(entityKey({ entityType: 'object', id: 'OBJ-1' })).toBe('object:OBJ-1');
    });
  });

  describe('buildParticipantKeys', () => {
    it('returns sorted and deduplicated keys', () => {
      const participants: Participant[] = [
        { role: 'object', ref: { entityType: 'object', id: 'OBJ-2' } },
        { role: 'marker', ref: { entityType: 'marker', id: 'MK-1' } },
        { role: 'marker', ref: { entityType: 'marker', id: 'MK-1' } }, // Duplicate
        { role: 'object', ref: { entityType: 'object', id: 'OBJ-1' } },
      ];

      const keys = buildParticipantKeys(participants);
      expect(keys).toEqual([
        'marker:MK-1',
        'object:OBJ-1',
        'object:OBJ-2',
      ]);
    });
  });

  describe('buildFactIndexFields', () => {
    it('populates derived arrays correctly with sorting and deduplication', () => {
      const participants: Participant[] = [
        { role: 'object', ref: { entityType: 'object', id: 'OBJ-B' } },
        { role: 'marker', ref: { entityType: 'marker', id: 'MK-1' } },
        { role: 'place', ref: { entityType: 'place', id: 'PLC-1' } },
        { role: 'reader', ref: { entityType: 'event', id: 'RDR-1' } }, // 'reader' role maps to readerIds
        { role: 'device', ref: { entityType: 'observation', id: 'DEV-1' } }, // 'device' role maps to deviceIds
        { role: 'user', ref: { entityType: 'association', id: 'USR-2' } }, // 'user' role maps to userIds
        { role: 'user', ref: { entityType: 'association', id: 'USR-1' } },
        { role: 'object', ref: { entityType: 'object', id: 'OBJ-A' } },
        { role: 'object', ref: { entityType: 'object', id: 'OBJ-A' } }, // Duplicate
      ];

      const fields = buildFactIndexFields(participants);

      // Should preserve original array reference
      expect(fields.participants).toBe(participants);

      // Keys should be sorted
      expect(fields.participantKeys).toEqual([
        'association:USR-1',
        'association:USR-2',
        'event:RDR-1',
        'marker:MK-1',
        'object:OBJ-A',
        'object:OBJ-B',
        'observation:DEV-1',
        'place:PLC-1',
      ]);

      // Derived fields
      expect(fields.objectIds).toEqual(['OBJ-A', 'OBJ-B']);
      expect(fields.markerKeys).toEqual(['MK-1']);
      expect(fields.placeIds).toEqual(['PLC-1']);
      expect(fields.readerIds).toEqual(['RDR-1']);
      expect(fields.deviceIds).toEqual(['DEV-1']);
      expect(fields.userIds).toEqual(['USR-1', 'USR-2']);
    });

    it('omits empty arrays', () => {
      const participants: Participant[] = [
        { role: 'marker', ref: { entityType: 'marker', id: 'MK-1' } }
      ];

      const fields = buildFactIndexFields(participants);

      expect(fields.markerKeys).toEqual(['MK-1']);
      expect(fields.objectIds).toBeUndefined();
      expect(fields.placeIds).toBeUndefined();
    });
  });
});
