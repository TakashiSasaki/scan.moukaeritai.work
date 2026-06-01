import { normalizeObjectId } from './objectSummaries';
export type IdentifierKind = 'qr' | 'nfc' | 'manual' | 'barcode' | 'bluetooth';

export function buildIdentifierKey(kind: IdentifierKind, scheme: string, canonicalValue: string): string {
  // Key format: kind:scheme:canonicalValue
  // Replace slashes or special chars with underscores to make it firestore document ID safe
  const rawKey = `${kind}:${scheme}:${canonicalValue}`;
  return rawKey.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
}

export function extractIdentifierFromUrlOrText(scannedText: string): { kind: IdentifierKind, scheme: string, canonicalValue: string } | null {
  if (!scannedText) return null;

  try {
    const url = new URL(scannedText);

    // Check if it's our app domain (e.g. https://scan.moukaeritai.work/item/ITEM-123)
    if (url.hostname.includes('moukaeritai.work')) {
      const pathSegments = url.pathname.split('/').filter(Boolean);

      // Handle /item/:id
      if (pathSegments.length >= 2 && pathSegments[0] === 'item') {
        const itemId = normalizeObjectId(pathSegments[1]);
        return {
          kind: 'qr',
          scheme: 'qr-url-token',
          canonicalValue: itemId
        };
      }

      // Handle /object/:id
      if (pathSegments.length >= 2 && pathSegments[0] === 'object') {
        const objectId = normalizeObjectId(pathSegments[1]);
        return {
          kind: 'qr',
          scheme: 'qr-url-token',
          canonicalValue: objectId
        };
      }
    }

    // It's a valid URL, but not our domain. Maybe a general QR token.
    return {
      kind: 'qr',
      scheme: 'qr-url-token',
      canonicalValue: encodeURIComponent(scannedText)
    };

  } catch (e) {
    // Not a valid URL. Treat as a plain token.
    const token = scannedText.trim().toUpperCase();
    if (token) {
       return {
         kind: 'qr',
         scheme: 'qr-plain-token',
         canonicalValue: token
       };
    }
  }

  return null;
}

export function normalizeIdentifierInput(input: string, kind: IdentifierKind = 'qr', scheme: string = 'qr-plain-token'): { kind: IdentifierKind, scheme: string, canonicalValue: string } {
  // Always attempt URL extraction for QR codes to handle legacy app URLs properly.
  // extractIdentifierFromUrlOrText already handles falling back to plain-token format if it's not a valid URL.
  if (kind === 'qr') {
    const extracted = extractIdentifierFromUrlOrText(input);
    if (extracted) {
      return extracted;
    }
  }

  return {
    kind,
    scheme,
    canonicalValue: input.trim().toUpperCase()
  };
}

/**
 * Provides the Stage 1 additive metadata for newly created identifier records.
 * Intentionally omits `rawPayload` until a source payload policy is finalized.
 * Does not generate `identifierKey` or include `ownerId`, `objectId`, or timestamps.
 */
export function buildStage1IdentifierMetadata() {
  return {
    identityModelVersion: 2 as const,
    identitySchemaVersion: 1 as const,
    canonicalizationVersion: 1 as const,
  };
}
