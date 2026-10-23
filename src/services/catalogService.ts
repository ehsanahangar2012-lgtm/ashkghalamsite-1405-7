export interface CatalogItem {
  id: string | number;
  uuid?: string;
  slug: string;
  title: string;
  category: string;
  description?: string;
  coverImage?: string;
  pdfUrl?: string;
  pageCount?: number;
  pages?: string[];
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const catalogService = {
  async fetchCatalogs(isPublishedOnly = false): Promise<CatalogItem[]> {
    try {
      const url = isPublishedOnly ? '/api/catalogs' : '/api/catalogs?admin=true';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return isPublishedOnly ? data.filter(c => c.isPublished) : data;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch catalogs from server:', e);
    }
    return [];
  },

  async fetchPublicCatalogs(): Promise<CatalogItem[]> {
    return this.fetchCatalogs(true);
  },

  async getCatalogBySlugOrId(slugOrId: string): Promise<CatalogItem | null> {
    const list = await this.fetchPublicCatalogs();
    return list.find(c => c.slug === slugOrId || String(c.id) === slugOrId || c.uuid === slugOrId) || null;
  }
};
