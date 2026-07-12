export interface PortableCoordinates {
  latitude: number;
  longitude: number;
}

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
}

export interface FirestoreGeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Pure conversion: Firestore Timestamp -> RFC 3339 UTC string
 */
export function firestoreTimestampToUtcString(timestamp: FirestoreTimestamp | null | undefined): string | null {
  if (!timestamp) return null;
  
  // Handlers for standard Date fallback
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  // Handle standard firebase-admin / client Timestamp structure
  if (typeof timestamp.seconds === 'number') {
    const seconds = timestamp.seconds;
    const nanoseconds = timestamp.nanoseconds || 0;
    const ms = seconds * 1000 + Math.floor(nanoseconds / 1000000);
    return new Date(ms).toISOString();
  }

  return null;
}

/**
 * Pure conversion: RFC 3339 UTC string -> Firestore Timestamp
 * Accepts a factory/constructor to instantiate client-specific or admin-specific Timestamp classes.
 */
export function utcStringToFirestoreTimestamp<T = any>(
  utcString: string | null | undefined,
  timestampConstructor: (date: Date) => T
): T | null {
  if (!utcString) return null;
  const date = new Date(utcString);
  if (isNaN(date.getTime())) return null;
  return timestampConstructor(date);
}

/**
 * Pure conversion: Firestore GeoPoint -> portable coordinates
 */
export function firestoreGeoPointToCoordinates(geoPoint: FirestoreGeoPoint | null | undefined): PortableCoordinates | null {
  if (!geoPoint) return null;
  if (typeof geoPoint.latitude === 'number' && typeof geoPoint.longitude === 'number') {
    return {
      latitude: geoPoint.latitude,
      longitude: geoPoint.longitude,
    };
  }
  return null;
}

/**
 * Pure conversion: portable coordinates -> Firestore GeoPoint
 * Accepts a factory/constructor to instantiate client-specific or admin-specific GeoPoint classes.
 */
export function coordinatesToFirestoreGeoPoint<T = any>(
  coords: PortableCoordinates | null | undefined,
  geoPointConstructor: (lat: number, lng: number) => T
): T | null {
  if (!coords) return null;
  if (typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    return null;
  }
  return geoPointConstructor(coords.latitude, coords.longitude);
}
