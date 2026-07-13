import { v7 as uuidv7 } from "uuid";
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isTimestampLike(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function' &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  );
}

export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null) {
    return value;
  }
  if (isTimestampLike(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    // Drop undefined and sparse holes, preserve null, keep order, recursively clean elements.
    return value.filter(item => item !== undefined).map(item => stripUndefinedDeep(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const val = value[key];
        if (val !== undefined) {
          result[key] = stripUndefinedDeep(val);
        }
      }
    }
    return result as T;
  }
  return value;
}

/**
 * Generates a standard time-ordered UUIDv7 using the official uuid package.
 */
export function generateUUIDv7(timestampMs?: number): string {
  return timestampMs ? uuidv7({ msecs: timestampMs }) : uuidv7();
}

/**
 * Pure JS SHA-256 implementation, safe to run in any Node or Web sandbox.
 */
export function sha256(ascii: string): string {
  const rightRotate = (value: number, amount: number) => {
    return (value >>> amount) | (value << (32 - amount));
  };

  const words: number[] = [];
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const asciiBytes: number[] = Array.from(new TextEncoder().encode(ascii));
  const asciiLength = asciiBytes.length * 8;

  asciiBytes.push(0x80);
  while (asciiBytes.length % 64 !== 56) {
    asciiBytes.push(0);
  }

  const lenHi = Math.floor(asciiLength / 0x100000000);
  const lenLo = asciiLength & 0xffffffff;
  asciiBytes.push((lenHi >> 24) & 0xff);
  asciiBytes.push((lenHi >> 16) & 0xff);
  asciiBytes.push((lenHi >> 8) & 0xff);
  asciiBytes.push(lenHi & 0xff);
  asciiBytes.push((lenLo >> 24) & 0xff);
  asciiBytes.push((lenLo >> 16) & 0xff);
  asciiBytes.push((lenLo >> 8) & 0xff);
  asciiBytes.push(lenLo & 0xff);

  for (let i = 0; i < asciiBytes.length; i += 4) {
    words.push(
      (asciiBytes[i] << 24) |
      (asciiBytes[i + 1] << 16) |
      (asciiBytes[i + 2] << 8) |
      asciiBytes[i + 3]
    );
  }

  for (let i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (let j = 0; j < 64; j++) {
      if (j >= 16) {
        const s0 =
          (rightRotate(w[j - 15], 7) ^
            rightRotate(w[j - 15], 18) ^
            (w[j - 15] >>> 3)) >>>
          0;
        const s1 =
          (rightRotate(w[j - 2], 17) ^
            rightRotate(w[j - 2], 19) ^
            (w[j - 2] >>> 10)) >>>
          0;
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const s1 =
        (rightRotate(hash[4], 6) ^
          rightRotate(hash[4], 11) ^
          rightRotate(hash[4], 25)) >>>
        0;
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[j] + w[j]) | 0;

      const s0 =
        (rightRotate(hash[0], 2) ^
          rightRotate(hash[0], 13) ^
          rightRotate(hash[0], 22)) >>>
        0;
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.length = 8;
    }

    for (let j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    result += (hash[i] >>> 0).toString(16).padStart(8, '0');
  }

  return result;
}

export interface MarkerIdentityInput {
  medium: string;
  payloadLayer: string;
  payloadKind: string;
  scheme?: string;
  canonicalPayload?: string;
  nativeIdKind?: string;
  canonicalNativeId?: string;
}

/**
 * Deterministic owner-independent Marker key generation from canonical attributes.
 */
export function generateMarkerKey(input: MarkerIdentityInput): string {
  const keys: Array<keyof MarkerIdentityInput> = [
    'medium',
    'payloadLayer',
    'payloadKind',
    'scheme',
    'canonicalPayload',
    'nativeIdKind',
    'canonicalNativeId'
  ];
  
  const parts = keys.map(k => {
    const val = input[k] ?? '';
    return `${k}:${val}`;
  });
  
  const serialized = `identityModelVersion:v2|canonicalizationVersion:v1|${parts.join('|')}`;
  const hashVal = sha256(serialized);
  return `mk_${hashVal}`;
}
