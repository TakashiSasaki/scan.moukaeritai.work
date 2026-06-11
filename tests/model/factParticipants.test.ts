import { describe, it, expect } from 'vitest';
import { entityKey, buildParticipantKeys, buildFactIndexFields } from '../../src/lib/factParticipants';
import { Participant } from '../../src/types/entityFactProjection';

describe('factParticipants', () => {
  it('entityKey returns "entityType:id"', () => {
    expect(entityKey({ entityType: 'object', id: 'OBJ-1' })).toBe('object:OBJ-1');
  });

  it('buildParticipantKeys deduplicates and sorts keys', () => {
    const participants: Participant[] = [
      { role: 'device', ref: { entityType: 'device', id: 'D-2' } },
      { role: 'object', ref: { entityType: 'object', id: 'O-1' } },
      { role: 'object', ref: { entityType: 'object', id: 'O-1' } },
    ];
    const keys = buildParticipantKeys(participants);
    expect(keys).toEqual(['device:D-2', 'object:O-1']);
  });

  it('buildFactIndexFields derives objectIds', () => {
    const participants: Participant[] = [
      { role: 'subject', ref: { entityType: 'object', id: 'OBJ-1' } }
    ];
    const index = buildFactIndexFields(participants);
    expect(index.objectIds).toEqual(['OBJ-1']);
  });

  it('buildFactIndexFields derives markerKeys', () => {
    const participants: Participant[] = [
      { role: 'tag', ref: { entityType: 'marker', id: 'MK-1' } }
    ];
    const index = buildFactIndexFields(participants);
    expect(index.markerKeys).toEqual(['MK-1']);
  });

  it('buildFactIndexFields derives placeIds', () => {
    const participants: Participant[] = [
      { role: 'location', ref: { entityType: 'place', id: 'PLACE-1' } }
    ];
    const index = buildFactIndexFields(participants);
    expect(index.placeIds).toEqual(['PLACE-1']);
  });

  it('buildFactIndexFields derives readerIds', () => {
    const participants: Participant[] = [
      { role: 'reader', ref: { entityType: 'reader', id: 'READER-1' } }
    ];
    const index = buildFactIndexFields(participants);
    expect(index.readerIds).toEqual(['READER-1']);
  });

  it('buildFactIndexFields derives deviceIds', () => {
    const participants: Participant[] = [
      { role: 'device', ref: { entityType: 'device', id: 'DEVICE-1' } }
    ];
    const index = buildFactIndexFields(participants);
    expect(index.deviceIds).toEqual(['DEVICE-1']);
  });

  it('buildFactIndexFields derives userIds', () => {
    const participants: Participant[] = [
      { role: 'actor', ref: { entityType: 'user', id: 'USER-1' } }
    ];
    const index = buildFactIndexFields(participants);
    expect(index.userIds).toEqual(['USER-1']);
  });

  it('buildFactIndexFields does not mutate participant order', () => {
    const participants: Participant[] = [
      { role: 'user', ref: { entityType: 'user', id: 'U-1' } },
      { role: 'object', ref: { entityType: 'object', id: 'O-1' } },
    ];
    const copy = [...participants];
    buildFactIndexFields(participants);
    expect(participants).toEqual(copy);
  });
});
