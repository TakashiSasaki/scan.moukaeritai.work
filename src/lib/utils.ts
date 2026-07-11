import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeItemId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-]/g, '').toUpperCase();
}

export function extractItemId(id: string): string {
  // If it's a URL, extract the last part
  if (id.includes('/') || id.includes('?')) {
    try {
      const url = new URL(id);
      const pathname = url.pathname;
      const parts = pathname.split('/').filter(Boolean);
      return sanitizeItemId(parts[parts.length - 1] || id);
    } catch {
      const parts = id.split('/').filter(Boolean);
      return sanitizeItemId(parts[parts.length - 1] || id);
    }
  }
  return sanitizeItemId(id);
}

export function getImageFormatFromUrl(url: string): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const extension = pathname.split('.').pop()?.toLowerCase();
    if (extension === 'webp') return 'WEBP';
    if (extension === 'jpg' || extension === 'jpeg') return 'JPEG';
    if (extension === 'png') return 'PNG';
    
    // Check contentType param if it's a firebase storage url
    const contentType = urlObj.searchParams.get('contentType');
    if (contentType) {
      if (contentType.includes('webp')) return 'WEBP';
      if (contentType.includes('jpeg')) return 'JPEG';
      if (contentType.includes('png')) return 'PNG';
    }
  } catch {
    // Ignore URL parsing errors
  }
  return '';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
