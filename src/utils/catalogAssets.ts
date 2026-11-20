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

export function getUploadFallbackUrl(src?: string | null): string | null {
  if (!src || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;
  if (trimmed.includes('upload-file') && trimmed.includes('p=')) return null;

  const clean = trimmed.split('#')[0];
  const match = clean.match(/(?:^|\/)uploads\/([^?]+)/i);
  if (!match || !match[1]) return null;
  const rel = match[1].replace(/^\/+/, '');
  if (!rel || rel.includes('..')) return null;
  return `/api.php?r=upload-file&p=${encodeURIComponent(rel)}`;
}

