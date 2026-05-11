export function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export interface AppCacheInfo {
  name: string;
  size: number;
}

export async function getAppCacheSizes(): Promise<{ totalSize: number; caches: AppCacheInfo[] }> {
  if (!('caches' in window)) {
    return { totalSize: 0, caches: [] };
  }

  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    const cacheInfos: AppCacheInfo[] = [];

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      let size = 0;

      for (const request of requests) {
        try {
          const response = await cache.match(request);
          if (response) {
            const contentLength = response.headers.get('Content-Length');
            if (contentLength) {
              size += parseInt(contentLength, 10);
            } else {
              const blob = await response.clone().blob();
              size += blob.size;
            }
          }
        } catch (err) {
          console.warn(`Could not calculate size for request ${request.url}`, err);
        }
      }

      cacheInfos.push({ name, size });
      totalSize += size;
    }

    return { totalSize, caches: cacheInfos };
  } catch (error) {
    console.error('Error calculating cache sizes', error);
    return { totalSize: 0, caches: [] };
  }
}

export function getImageFormatFromUrl(url?: string): string {
  if (!url) return 'IMG';
  try {
    const urlObj = new URL(url);
    const pathname = decodeURIComponent(urlObj.pathname);
    const extensionMatch = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (extensionMatch && extensionMatch[1]) {
      const ext = extensionMatch[1].toUpperCase();
      if (ext === 'JPG') return 'JPEG'; // normalize
      return ext;
    }
  } catch (e) {
    const extensionMatch = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
    if (extensionMatch && extensionMatch[1]) {
      const ext = extensionMatch[1].toUpperCase();
      if (ext === 'JPG') return 'JPEG';
      return ext;
    }
  }
  return 'JPEG'; // Since all our uploads right now are forced to .jpg
}

/**
 * Sanitize an item ID to ensure it contains only URL-safe characters
 * that do not require percent-encoding.
 */
export function sanitizeItemId(id: string): string {
  // Allow alphanumeric, dash, underscore, and period.
  // These are standard unreserved characters in URIs.
  return id.replace(/[^a-zA-Z0-9\-_.]/g, '');
}

/**
 * Extract an item ID from a scanned text (which might be a URL),
 * convert it to uppercase for case-insensitivity (to support alphanumeric QR codes),
 * and sanitize it.
 */
export function extractItemId(scannedText: string): string {
  let id = scannedText;
  try {
    const url = new URL(scannedText);
    if (url.searchParams.has('id')) {
      id = url.searchParams.get('id') || id;
    } else {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        id = parts[parts.length - 1];
      }
    }
  } catch (e) {
    // Not a valid URL, treat the whole string as ID
  }
  return sanitizeItemId(id.toUpperCase());
}
