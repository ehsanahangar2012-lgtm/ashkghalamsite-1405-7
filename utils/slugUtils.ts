/**
 * Slug helper functions for clean Persian and ASCII URL routing.
 * Converts titles and identifiers to consistent, human-readable slugs
 * and matches them stably against items.
 */

export function toSlug(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    // Replace spaces, underscores and punctuation with single hyphen
    .replace(/[\s\-_]+/g, '-')
    // Remove unwanted non-alphanumeric characters (keeps Persian/Arabic and latin chars)
    .replace(/[^\p{L}\p{N}\-]+/gu, '')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Finds an item in a list by matching against id, slug, or slugified title.
 */
export function findBySlugOrId<T extends { id?: string | number; slug?: string; title?: string }>(
  items: T[],
  identifier: string | undefined
): T | undefined {
  if (!identifier) return undefined;
  
  const decoded = decodeURIComponent(identifier).trim();
  const decodedLower = decoded.toLowerCase();
  const slugifiedInput = toSlug(decoded);

  return items.find(item => {
    // 1. Direct match with id
    if (item.id !== undefined && String(item.id).toLowerCase() === decodedLower) {
      return true;
    }
    // 2. Direct match with item.slug if present
    if (item.slug && item.slug.toLowerCase() === decodedLower) {
      return true;
    }
    // 3. Match item.slug with slugified input
    if (item.slug && toSlug(item.slug) === slugifiedInput) {
      return true;
    }
    // 4. Match slugified title
    if (item.title) {
      const titleSlug = toSlug(item.title);
      if (titleSlug === slugifiedInput || titleSlug === decodedLower) {
        return true;
      }
    }
    return false;
  });
}
