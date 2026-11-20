import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { catalogService, CatalogItem } from '../services/catalogService';
import { fetchPublishedProject } from '../services/projectStorageService';
import { apiFetch } from '../utils/apiClient';
import { CatalogProject } from '../types/flipbook';

const DEFAULT_CATEGORIES: string[] = [
  'کارتن‌های صنعتی و صادراتی',
  'هاردباکس و لوکس',
  'ای‌کامرس و پستی',
  'دارویی و بهداشتی',
  'کاتالوگ دیجیتال محصول',
];

const MAX_FLIPBOOK_CACHE_ENTRIES = 16;

interface CatalogContextValue {
  catalogs: CatalogItem[];
  publicCatalogs: CatalogItem[];
  categories: string[];
  loading: boolean;
  hasLoadedPublic: boolean;
  hasLoadedAdmin: boolean;
  error: string | null;
  ensureLoaded: (includeUnpublished?: boolean) => Promise<void>;
  refreshCatalogs: (includeUnpublished?: boolean) => Promise<void>;
  toggleCatalogStatus: (
    id: string | number,
    patch: { isPublished?: boolean; category?: string }
  ) => Promise<CatalogItem>;
  saveCatalogItem: (item: Partial<CatalogItem> & { title: string }) => Promise<CatalogItem>;
  deleteCatalogItem: (id: string | number, flipbookId?: string) => Promise<void>;
  saveCategories: (nextCategories: string[]) => Promise<string[]>;
  getFlipbookProject: (flipbookId: string) => Promise<CatalogProject>;
  cacheFlipbookProject: (flipbookId: string, project: CatalogProject) => void;
  invalidateFlipbookCache: (flipbookId?: string) => void;
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasLoadedPublic, setHasLoadedPublic] = useState<boolean>(false);
  const [hasLoadedAdmin, setHasLoadedAdmin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const hasLoadedPublicRef = useRef(false);
  const hasLoadedAdminRef = useRef(false);
  const inFlightPublicRef = useRef<Promise<void> | null>(null);
  const inFlightAdminRef = useRef<Promise<void> | null>(null);

  // Bounded LRU cache for heavy 3D flipbook payloads (prevents memory leaks on repeated open/close)
  const flipbookCacheRef = useRef<Map<string, CatalogProject>>(new Map());
  const inFlightFlipbooksRef = useRef<Map<string, Promise<CatalogProject>>>(new Map());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      flipbookCacheRef.current.clear();
      inFlightFlipbooksRef.current.clear();
    };
  }, []);

  const performFetch = useCallback(async (includeUnpublished: boolean): Promise<void> => {
    const existingFlight = includeUnpublished
      ? inFlightAdminRef.current
      : inFlightPublicRef.current || inFlightAdminRef.current;

    if (existingFlight) {
      return existingFlight;
    }

    const task = (async () => {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const [fetchedCatalogs, fetchedCategories] = await Promise.all([
          catalogService.fetchCatalogs(!includeUnpublished),
          includeUnpublished ? catalogService.fetchCategories() : Promise.resolve(null),
        ]);

        if (!mountedRef.current) return;

        setCatalogs((prev) => {
          // If fetching public-only while admin already loaded, preserve hidden items while updating published ones
          if (!includeUnpublished && hasLoadedAdminRef.current) {
            const fetchedById = new Map(fetchedCatalogs.map((item) => [String(item.id), item]));
            return prev.map((existing) => fetchedById.get(String(existing.id)) ?? existing);
          }
          return fetchedCatalogs;
        });

        if (fetchedCategories) {
          setCategories(fetchedCategories);
        }

        hasLoadedPublicRef.current = true;
        setHasLoadedPublic(true);
        if (includeUnpublished) {
          hasLoadedAdminRef.current = true;
          setHasLoadedAdmin(true);
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'دریافت فهرست کاتالوگ‌ها با خطا مواجه شد.');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        if (includeUnpublished) {
          inFlightAdminRef.current = null;
        } else {
          inFlightPublicRef.current = null;
        }
      }
    })();

    if (includeUnpublished) {
      inFlightAdminRef.current = task;
    } else {
      inFlightPublicRef.current = task;
    }

    return task;
  }, []);

  const ensureLoaded = useCallback(
    async (includeUnpublished = false) => {
      if (includeUnpublished) {
        if (hasLoadedAdminRef.current) return;
        return performFetch(true);
      }
      if (hasLoadedPublicRef.current || hasLoadedAdminRef.current) return;
      return performFetch(false);
    },
    [performFetch]
  );

  const refreshCatalogs = useCallback(
    async (includeUnpublished = true) => {
      return performFetch(includeUnpublished);
    },
    [performFetch]
  );

  useEffect(() => {
    const handleMediaSync = () => {
      flipbookCacheRef.current.clear();
      if (hasLoadedAdminRef.current || hasLoadedPublicRef.current) {
        void performFetch(hasLoadedAdminRef.current);
      }
    };
    window.addEventListener('ashk-media-synced', handleMediaSync);
    return () => window.removeEventListener('ashk-media-synced', handleMediaSync);
  }, [performFetch]);

  // Optimistic instant toggle so admin switches respond in 0ms without blocking or re-fetching
  const toggleCatalogStatus = useCallback(
    async (
      id: string | number,
      patch: { isPublished?: boolean; category?: string }
    ): Promise<CatalogItem> => {
      let previousSnapshot: CatalogItem | undefined;

      setCatalogs((prev) =>
        prev.map((item) => {
          if (String(item.id) !== String(id)) return item;
          previousSnapshot = item;
          return {
            ...item,
            ...(patch.isPublished !== undefined ? { isPublished: patch.isPublished } : {}),
            ...(patch.category !== undefined ? { category: patch.category } : {}),
            updatedAt: new Date().toISOString(),
          };
        })
      );

      try {
        const updated = await catalogService.toggleCatalogStatus(id, patch);
        if (mountedRef.current) {
          setCatalogs((prev) =>
            prev.map((item) => (String(item.id) === String(updated.id) ? updated : item))
          );
        }
        return updated;
      } catch (err) {
        if (mountedRef.current && previousSnapshot) {
          const rollbackItem = previousSnapshot;
          setCatalogs((prev) =>
            prev.map((item) => (String(item.id) === String(id) ? rollbackItem : item))
          );
        }
        throw err;
      }
    },
    []
  );

  const saveCatalogItem = useCallback(
    async (item: Partial<CatalogItem> & { title: string }): Promise<CatalogItem> => {
      const saved = await catalogService.saveCatalogItem(item);
      if (mountedRef.current) {
        setCatalogs((prev) => {
          const exists = prev.some((c) => String(c.id) === String(saved.id));
          if (exists) {
            return prev.map((c) => (String(c.id) === String(saved.id) ? saved : c));
          }
          return [saved, ...prev];
        });
      }
      return saved;
    },
    []
  );

  const deleteCatalogItem = useCallback(
    async (id: string | number, flipbookId?: string): Promise<void> => {
      await catalogService.deleteCatalogItem(id);
      if (flipbookId) {
        await apiFetch(`flipbooks/${encodeURIComponent(flipbookId)}/delete`, {
          method: 'POST',
        }).catch(() => {});
        flipbookCacheRef.current.delete(flipbookId);
      }
      if (mountedRef.current) {
        setCatalogs((prev) => prev.filter((c) => String(c.id) !== String(id)));
      }
    },
    []
  );

  const saveCategories = useCallback(async (nextCategories: string[]): Promise<string[]> => {
    const saved = await catalogService.saveCategories(nextCategories);
    if (mountedRef.current) {
      setCategories(saved);
    }
    return saved;
  }, []);

  const cacheFlipbookProject = useCallback((flipbookId: string, project: CatalogProject) => {
    const cache = flipbookCacheRef.current;
    if (cache.has(flipbookId)) {
      cache.delete(flipbookId);
    } else if (cache.size >= MAX_FLIPBOOK_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(flipbookId, project);
  }, []);

  const invalidateFlipbookCache = useCallback((flipbookId?: string) => {
    if (!flipbookId) {
      flipbookCacheRef.current.clear();
    } else {
      flipbookCacheRef.current.delete(flipbookId);
    }
  }, []);

  const getFlipbookProject = useCallback(
    async (flipbookId: string): Promise<CatalogProject> => {
      const cached = flipbookCacheRef.current.get(flipbookId);
      if (cached) {
        // Refresh LRU order
        flipbookCacheRef.current.delete(flipbookId);
        flipbookCacheRef.current.set(flipbookId, cached);
        return cached;
      }

      const existingFlight = inFlightFlipbooksRef.current.get(flipbookId);
      if (existingFlight) {
        return existingFlight;
      }

      const promise = fetchPublishedProject(flipbookId)
        .then((proj) => {
          cacheFlipbookProject(flipbookId, proj);
          return proj;
        })
        .finally(() => {
          inFlightFlipbooksRef.current.delete(flipbookId);
        });

      inFlightFlipbooksRef.current.set(flipbookId, promise);
      return promise;
    },
    [cacheFlipbookProject]
  );

  const publicCatalogs = useMemo(
    () => catalogs.filter((c) => c.isPublished !== false),
    [catalogs]
  );

  const value = useMemo<CatalogContextValue>(
    () => ({
      catalogs,
      publicCatalogs,
      categories,
      loading,
      hasLoadedPublic,
      hasLoadedAdmin,
      error,
      ensureLoaded,
      refreshCatalogs,
      toggleCatalogStatus,
      saveCatalogItem,
      deleteCatalogItem,
      saveCategories,
      getFlipbookProject,
      cacheFlipbookProject,
      invalidateFlipbookCache,
    }),
    [
      catalogs,
      publicCatalogs,
      categories,
      loading,
      hasLoadedPublic,
      hasLoadedAdmin,
      error,
      ensureLoaded,
      refreshCatalogs,
      toggleCatalogStatus,
      saveCatalogItem,
      deleteCatalogItem,
      saveCategories,
      getFlipbookProject,
      cacheFlipbookProject,
      invalidateFlipbookCache,
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = (): CatalogContextValue => {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used inside a CatalogProvider');
  }
  return ctx;
};
