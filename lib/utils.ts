import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getSupabaseStoragePublicUrl } from "./supabase/config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeEventImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/uploads/')) {
    return getSupabaseStoragePublicUrl(url.replace(/^\/uploads\//, ''));
  }
  if (url.startsWith('/api/uploads/')) {
    return getSupabaseStoragePublicUrl(url.replace(/^\/api\/uploads\//, ''));
  }
  return url;
}

export function parseEventImages(imageUrl: string | null | undefined): { coverUrl: string; bgUrl: string } {
  if (!imageUrl) return { coverUrl: '', bgUrl: '' };
  
  try {
    const parsed = JSON.parse(imageUrl);
    if (parsed && typeof parsed === 'object') {
      return {
        coverUrl: normalizeEventImageUrl(parsed.coverUrl),
        bgUrl: normalizeEventImageUrl(parsed.bgUrl)
      };
    }
  } catch (e) {
    // If it's not JSON, assume it's a legacy single plain URL
    const normalizedUrl = normalizeEventImageUrl(imageUrl);
    return { coverUrl: normalizedUrl, bgUrl: normalizedUrl };
  }
  
  const normalizedUrl = normalizeEventImageUrl(imageUrl);
  return { coverUrl: normalizedUrl, bgUrl: normalizedUrl };
}
