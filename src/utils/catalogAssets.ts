export function resolveCatalogCoverImage(coverImage?: string, _id?: string | number): string | undefined {
  if (!coverImage || typeof coverImage !== 'string') {
    return undefined;
  }
  const trimmed = coverImage.trim();
  if (
    !trimmed ||
    trimmed.includes('/src/assets/images/catalog_') ||
    trimmed.includes('/src/assets/images/demo_')
  ) {
    return undefined;
  }
  return trimmed;
}

export function isSupportedImageFile(file: File): boolean {
  if (!file) return false;
  if (file.type && file.type.toLowerCase().startsWith('image/')) {
    return true;
  }
  return /\.(jpe?g|png|webp|gif|bmp|avif|svg)$/i.test(file.name || '');
}

function extractUploadsRelativePath(src: string): string | null {
  const clean = src.split('#')[0];

  // Already a query-param upload-file URL: extract `p` parameter
  const queryMatch = clean.match(/[?&]p=([^&]+)/i);
  if (clean.includes('upload-file') && queryMatch && queryMatch[1]) {
    try {
      const decoded = decodeURIComponent(queryMatch[1]).replace(/^\/+/, '');
      if (decoded && !decoded.includes('..')) return decoded;
    } catch {
      return null;
    }
  }

  const match = clean.match(/(?:^|\/)uploads\/([^?]+)/i);
  if (!match || !match[1]) return null;
  const rel = match[1].replace(/^\/+/, '');
  if (!rel || rel.includes('..')) return null;
  return rel;
}

export function getUploadFallbackUrl(src?: string | null): string | null {
  if (!src || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;
  if (trimmed.includes('api.php') && trimmed.includes('upload-file') && trimmed.includes('p=')) {
    return null;
  }

  const rel = extractUploadsRelativePath(trimmed);
  if (!rel) return null;
  return `/api.php?r=upload-file&p=${encodeURIComponent(rel)}`;
}

/**
 * Returns an ordered, deduplicated list of candidate image URLs so that if
 * `/uploads/...` is blocked by cPanel/Apache/proxy or fails transiently,
 * the UI seamlessly tries `/api/upload-file?p=...`, `/api.php?r=upload-file&p=...`,
 * and finally any secondary fallback URL (e.g., originalDataUrl).
 */
export function getUploadFallbackCandidates(
  primary?: string | null,
  secondary?: string | null
): string[] {
  const seen = new Set<string>();
  const list: string[] = [];

  const pushUnique = (u?: string | null) => {
    if (!u || typeof u !== 'string') return;
    const t = u.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    list.push(t);
  };

  const addWithUploadAlternates = (raw?: string | null) => {
    if (!raw || typeof raw !== 'string') return;
    const t = raw.trim();
    if (!t) return;
    pushUnique(t);
    if (t.startsWith('data:') || t.startsWith('blob:')) return;

    const rel = extractUploadsRelativePath(t);
    if (rel) {
      const encoded = encodeURIComponent(rel);
      pushUnique(`/uploads/${rel}`);
      pushUnique(`/api/upload-file?p=${encoded}`);
      pushUnique(`/api.php?r=upload-file&p=${encoded}`);
    }
  };

  addWithUploadAlternates(primary);
  addWithUploadAlternates(secondary);

  return list;
}

export function resolveAbsoluteAssetUrl(src?: string | null): string {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return trimmed.startsWith('/')
      ? `${window.location.origin}${trimmed}`
      : `${window.location.origin}/${trimmed}`;
  }
  return trimmed;
}
