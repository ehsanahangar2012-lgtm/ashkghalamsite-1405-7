import { CatalogItem, CatalogFilterOptions, CatalogHotspot } from '../types/catalog';

const STORAGE_KEY = 'ashk_3d_catalogs_v3';
const IDB_NAME = 'ashk_catalogs_db_v1';
const IDB_STORE = 'catalogs';

function openCatalogIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function getAllFromIDB(): Promise<CatalogItem[]> {
  const db = await openCatalogIDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as CatalogItem[]) || []);
      req.onerror = () => resolve([]);
    } catch (_) {
      resolve([]);
    }
  });
}

async function saveToIDB(item: CatalogItem): Promise<boolean> {
  const db = await openCatalogIDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(item);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (_) {
      resolve(false);
    }
  });
}

async function deleteFromIDB(id: string): Promise<boolean> {
  const db = await openCatalogIDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (_) {
      resolve(false);
    }
  });
}

// Default Luxury Initial Catalogs array - cleared to ensure no simulated or mock catalogs re-appear
export const DEFAULT_3D_CATALOGS: CatalogItem[] = [];

class CatalogService {
  private localCatalogs: CatalogItem[] = [];
  private deletedCatalogIds: Set<string> = new Set();

  constructor() {
    this.initLocalStore();
  }

  private initLocalStore() {
    if (typeof window === 'undefined') return;
    try {
      const deletedSaved = localStorage.getItem('ashk_3d_deleted_catalogs');
      if (deletedSaved) {
        const parsedDeleted = JSON.parse(deletedSaved);
        if (Array.isArray(parsedDeleted)) {
          this.deletedCatalogIds = new Set(parsedDeleted.map(String));
        }
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.localCatalogs = parsed.filter(c => c && c.id && !this.deletedCatalogIds.has(String(c.id)));
        }
      } else {
        this.localCatalogs = [];
      }

      // Asynchronously load full items with base64 images from IndexedDB
      getAllFromIDB().then((idbItems) => {
        if (Array.isArray(idbItems) && idbItems.length > 0) {
          const map = new Map<string, CatalogItem>();
          this.localCatalogs.forEach(item => map.set(String(item.id), item));
          idbItems.forEach(item => {
            if (item && item.id && !this.deletedCatalogIds.has(String(item.id))) {
              const existing = map.get(String(item.id));
              if (!existing || (item.pages && item.pages.length > 0)) {
                map.set(String(item.id), item);
              }
            }
          });
          this.localCatalogs = Array.from(map.values());
        }
      }).catch(() => {});

    } catch (e) {
      console.warn('LocalStorage error in CatalogService:', e);
      this.localCatalogs = [];
    }
  }

  private persistLocal() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ashk_3d_deleted_catalogs', JSON.stringify(Array.from(this.deletedCatalogIds)));
      
      // Save full catalog items to IndexedDB
      this.localCatalogs.forEach(cat => {
        if (cat && cat.id) saveToIDB(cat);
      });

      // Lightweight backup for localStorage
      const sanitized = this.localCatalogs.map(cat => ({
        ...cat,
        coverImage: (cat?.coverImage && cat.coverImage.startsWith('data:'))
          ? cat.coverImage.substring(0, 100) + '...'
          : (cat?.coverImage || ''),
        thumbnailUrl: (cat?.thumbnailUrl && cat.thumbnailUrl.startsWith('data:'))
          ? cat.thumbnailUrl.substring(0, 100) + '...'
          : (cat?.thumbnailUrl || ''),
        pages: (cat?.pages || []).map(p => ({
          ...p,
          imageUrl: (p?.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.startsWith('data:'))
            ? p.imageUrl.substring(0, 100) + '...'
            : (p?.imageUrl || ''),
          thumbnailUrl: (p?.thumbnailUrl && typeof p.thumbnailUrl === 'string' && p.thumbnailUrl.startsWith('data:'))
            ? p.thumbnailUrl.substring(0, 100) + '...'
            : (p?.thumbnailUrl || '')
        }))
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('LocalStorage quota limit reached; IndexedDB handles full media storage.', e);
    }
  }

  public async fetchCatalogs(options: CatalogFilterOptions = {}, cachedFirestoreItems?: CatalogItem[]): Promise<CatalogItem[]> {
    const mergedMap = new Map<string, CatalogItem>();

    // 0. Seed map with local state
    this.localCatalogs.forEach(item => {
      if (item && item.id && !this.deletedCatalogIds.has(String(item.id))) {
        mergedMap.set(String(item.id), item);
      }
    });

    // 1. Fetch from PHP host backend or /api/catalogs endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      let phpRes = await fetch('./save_catalog.php', { signal: controller.signal }).catch(() => null);
      if (!phpRes || !phpRes.ok) {
        phpRes = await fetch('/api/catalogs', { signal: controller.signal }).catch(() => null);
      }
      clearTimeout(timeoutId);
      if (phpRes && phpRes.ok) {
        const phpList = await phpRes.json();
        if (Array.isArray(phpList) && phpList.length > 0) {
          phpList.forEach((item: CatalogItem) => {
            if (item && item.id && !this.deletedCatalogIds.has(String(item.id))) {
              mergedMap.set(String(item.id), item);
              saveToIDB(item);
            }
          });
        }
      }
    } catch (_) {
      // Offline or local dev environment
    }

    // 2. Fetch full items from IndexedDB
    try {
      const idbList = await getAllFromIDB();
      if (Array.isArray(idbList) && idbList.length > 0) {
        idbList.forEach((item) => {
          if (item && item.id && !this.deletedCatalogIds.has(String(item.id))) {
            const existing = mergedMap.get(String(item.id));
            if (!existing || (item.pages && item.pages.length > 0 && (!existing.pages || existing.pages.length === 0))) {
              mergedMap.set(String(item.id), item);
            }
          }
        });
      }
    } catch (_) {}

    // 3. Keep local-state catalogItems
    // Fully decoupled from remote cloud Firebase.
    const normalizeUrl = (url?: string): string => {
      if (!url) return '';
      if (url.startsWith('uploads/')) return '/' + url;
      return url;
    };

    let list = Array.from(mergedMap.values()).map(item => ({
      ...item,
      coverImage: normalizeUrl(item.coverImage),
      thumbnailUrl: normalizeUrl(item.thumbnailUrl),
      pages: (item.pages || []).map(p => ({
        ...p,
        imageUrl: normalizeUrl(p.imageUrl),
        webpUrl: normalizeUrl(p.webpUrl),
        thumbnailUrl: normalizeUrl(p.thumbnailUrl)
      }))
    }));
    this.localCatalogs = list;

    // Apply filtering
    if (options.isPublishedOnly) {
      list = list.filter(item => item.isPublished !== false);
    }

    if (options.featuredOnly) {
      list = list.filter(item => item.featured);
    }

    if (options.category && options.category !== 'همه') {
      list = list.filter(item => item.category === options.category);
    }

    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const q = options.searchQuery.trim().toLowerCase();
      list = list.filter(item =>
        (item?.title || '').toLowerCase().includes(q) ||
        (item?.description || '').toLowerCase().includes(q) ||
        (item?.category || '').toLowerCase().includes(q) ||
        (item?.pages || []).some(p => p?.extractedText?.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (options.sortBy === 'popular') {
      list.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (options.sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title, 'fa'));
    } else if (options.sortBy === 'order') {
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } else {
      // default newest
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }

  public async getCatalogBySlugOrId(identifier: string): Promise<CatalogItem | null> {
    const list = await this.fetchCatalogs();
    const found = list.find(
      item => String(item.id) === String(identifier) || item.slug === identifier || item.uuid === identifier
    );
    return found || null;
  }

  public async saveCatalog(catalog: CatalogItem): Promise<CatalogItem> {
    const idStr = String(catalog.id);
    this.deletedCatalogIds.delete(idStr);

    let finalCatalog: CatalogItem = {
      ...catalog,
      updatedAt: new Date().toISOString()
    };

    // 1. Send to PHP cPanel backend (save_catalog.php) to convert base64 images into static /uploads/ files (with 1.5s timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const phpRes = await fetch('./save_catalog.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalog: finalCatalog }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (phpRes.ok) {
        const phpData = await phpRes.json();
        if (phpData && phpData.catalog) {
          finalCatalog = { ...finalCatalog, ...phpData.catalog };
        }
      }
    } catch (_) {
      // Local development or offline fallback
    }

    const existingIndex = this.localCatalogs.findIndex(c => String(c.id) === idStr);
    if (existingIndex >= 0) {
      this.localCatalogs[existingIndex] = finalCatalog;
    } else {
      this.localCatalogs.unshift(finalCatalog);
    }

    // 2. Save to IndexedDB (Instant local persistence for heavy images)
    await saveToIDB(finalCatalog);

    // 3. Save metadata & lightweight copy to LocalStorage
    this.persistLocal();

    return finalCatalog;
  }

  public async deleteCatalog(id: string): Promise<boolean> {
    const idStr = String(id);
    this.deletedCatalogIds.add(idStr);
    this.localCatalogs = this.localCatalogs.filter(c => String(c.id) !== idStr);
    
    // 1. Delete from PHP cPanel server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      await fetch(`./save_catalog.php?id=${idStr}`, { method: 'DELETE', signal: controller.signal });
      clearTimeout(timeoutId);
    } catch (_) {}

    // 2. Delete from IndexedDB & LocalStorage
    await deleteFromIDB(idStr);
    this.persistLocal();

    return true;
  }

  public async recordAnalytics(id: string, action: 'view' | 'download'): Promise<void> {
    const catalog = this.localCatalogs.find(c => String(c.id) === String(id));
    if (catalog) {
      if (action === 'view') catalog.views = (catalog.views || 0) + 1;
      if (action === 'download') catalog.downloads = (catalog.downloads || 0) + 1;
      this.persistLocal();
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      await fetch(`${apiBase}/api/catalogs/${id}/analytics`.replace(/\/\//g, '/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
    } catch (_) {}
  }

  public generateJSONLD(catalog: CatalogItem): string {
    const schema = {
      "@context": "https://schema.org",
      "@type": "ProductCatalog",
      "name": catalog.title,
      "description": catalog.description,
      "image": catalog.coverImage,
      "publisher": {
        "@type": "Organization",
        "name": catalog.publisher || "مجتمع چاپ و بسته‌بندی اشک قلم",
        "url": "https://ashkghalam.ir"
      },
      "inLanguage": catalog.language,
      "numberOfPages": catalog.pageCount,
      "datePublished": catalog.createdAt
    };
    return JSON.stringify(schema);
  }
}

export const catalogService = new CatalogService();
