import { IdentifierRecord } from '../types';

export function normalizeObjectId(legacyId: string): string {
  return legacyId.toUpperCase();
}

export function computeIdentifierSummary(identifiers: IdentifierRecord[]) {
  const activeIdentifiers = identifiers.filter(id => id.status === 'active');
  const activeKinds = Array.from(new Set(activeIdentifiers.map(id => id.kind)));

  return {
    activeKinds,
    activeIdentifierCount: activeIdentifiers.length,
    hasQr: activeKinds.includes('qr'),
    hasNfc: activeKinds.includes('nfc')
  };
}
