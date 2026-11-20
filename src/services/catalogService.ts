import { apiFetch, apiPostJson, apiRequestJson } from '../utils/apiClient';

export interface CatalogSpecs {
  standardCode?: string;
  boardOptions?: string;
  finishOptions?: string;
  applications?: string;
  sheetHint?: string;
}

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
  flipbookId?: string;
  coverTemplate?: string;
  wordpressShortcode?: string;
  specs?: CatalogSpecs;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const catalogService = {
  async fetchCatalogs(isPublishedOnly = false): Promise<CatalogItem[]> {
    try {
      const route = isPublishedOnly ? 'catalogs' : 'catalogs?admin=true';
      const { res, data } = await apiRequestJson<CatalogItem[]>(route, {}, 15000);
      if (res.ok && Array.isArray(data)) {
        return isPublishedOnly ? data.filter((c) => c.isPublished) : data;
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
    return list.find((c) => c.slug === slugOrId || String(c.id) === slugOrId || c.uuid === slugOrId) || null;
  },

  async saveCatalogItem(item: Partial<CatalogItem> & { title: string }): Promise<CatalogItem> {
    let res: Response;
    let data: (CatalogItem & { error?: string }) | null = null;
    try {
      const result = await apiPostJson<CatalogItem & { error?: string }>('catalogs', item, 20000);
      res = result.res;
      data = result.data;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('مهلت ذخیره کاتالوگ در لیست سایت به پایان رسید.');
      }
      throw new Error('ارتباط با سرور برای ثبت کاتالوگ برقرار نشد.');
    }
    if (!res.ok || !data) {
      throw new Error(data?.error || `ذخیره کاتالوگ در سرور با خطا مواجه شد (کد ${res.status}).`);
    }
    return data as CatalogItem;
  },

  async toggleCatalogStatus(
    id: string | number,
    patch: { isPublished?: boolean; category?: string }
  ): Promise<CatalogItem> {
    const { res, data } = await apiPostJson<CatalogItem & { error?: string }>(
      `catalogs/${encodeURIComponent(String(id))}/status`,
      patch,
      15000
    );
    if (!res.ok || !data) {
      throw new Error(data?.error || 'تغییر وضعیت کاتالوگ ناموفق بود.');
    }
    return data as CatalogItem;
  },

  async fetchCategories(): Promise<string[]> {
    try {
      const { res, data } = await apiRequestJson<string[]>('catalog-categories', {}, 15000);
      if (res.ok && Array.isArray(data)) return data;
    } catch {
      // fallback below
    }
    return [
      'کارتن‌های صنعتی و صادراتی',
      'هاردباکس و لوکس',
      'ای‌کامرس و پستی',
      'دارویی و بهداشتی',
      'کاتالوگ دیجیتال محصول',
    ];
  },

  async saveCategories(categories: string[]): Promise<string[]> {
    const { res, data } = await apiPostJson<{ categories?: string[]; error?: string }>(
      'catalog-categories',
      { categories },
      15000
    );
    if (!res.ok || !Array.isArray(data?.categories)) {
      throw new Error(data?.error || 'ذخیره دسته‌بندی‌ها با خطا مواجه شد.');
    }
    return data.categories as string[];
  },

  async deleteCatalogItem(id: string | number): Promise<void> {
    const res = await apiFetch(
      `catalogs/${encodeURIComponent(String(id))}/delete`,
      { method: 'POST' },
      15000
    );
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || 'حذف کاتالوگ با خطا مواجه شد.');
    }
  },
};
