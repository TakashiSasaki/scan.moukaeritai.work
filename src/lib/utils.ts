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
