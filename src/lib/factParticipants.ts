import { EntityRef, Participant, FactIndexFields } from '../types/entityFactProjection';

/**
 * Returns a stable string representation of an EntityRef for indexing.
 * E.g., { entityType: 'marker', id: 'MK-1' } -> 'marker:MK-1'
 */
export function entityKey(ref: EntityRef): string {
  return `${ref.entityType}:${ref.id}`;
}

/**
 * Derives a sorted, deduplicated array of participant keys from an array of Participants.
 * Useful for deterministic array comparisons and indexing.
 */
export function buildParticipantKeys(participants: Participant[]): string[] {
  const keys = participants.map(p => entityKey(p.ref));
  return Array.from(new Set(keys)).sort();
}

/**
 * Derives indexing fields from an array of Participants.
 * All derived arrays are sorted and deduplicated.
 */
export function buildFactIndexFields(participants: Participant[]): FactIndexFields {
  const participantKeys = buildParticipantKeys(participants);

  const objectIds = new Set<string>();
  const markerKeys = new Set<string>();
  const placeIds = new Set<string>();
  const readerIds = new Set<string>();
  const deviceIds = new Set<string>();
  const userIds = new Set<string>();

  for (const p of participants) {
    const id = p.ref.id;
    switch (p.ref.entityType) {
      case 'object':
        objectIds.add(id);
        break;
      case 'marker':
        markerKeys.add(id);
        break;
      case 'place':
        placeIds.add(id);
        break;
      default:
        // Handle specific roles mapping to unknown entity types if necessary,
        // though typically role and entityType align or are mapped contextually.
        // For derived index arrays like readerIds, we might infer from role or entityType:
        if (p.role === 'reader') readerIds.add(id);
        if (p.role === 'device') deviceIds.add(id);
        if (p.role === 'user') userIds.add(id);
        break;
    }
  }

  const result: FactIndexFields = {
    participants, // The original array order is preserved
    participantKeys,
  };

  if (objectIds.size > 0) result.objectIds = Array.from(objectIds).sort();
  if (markerKeys.size > 0) result.markerKeys = Array.from(markerKeys).sort();
  if (placeIds.size > 0) result.placeIds = Array.from(placeIds).sort();
  if (readerIds.size > 0) result.readerIds = Array.from(readerIds).sort();
  if (deviceIds.size > 0) result.deviceIds = Array.from(deviceIds).sort();
  if (userIds.size > 0) result.userIds = Array.from(userIds).sort();

  return result;
}
