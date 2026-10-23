export const pageImageCache = new Map<string, string>();

const DB_NAME = "ashk_ghalam_catalog_cache";
const STORE_NAME = "catalog_pages";
const DB_VERSION = 1;
let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error("IndexedDB open request failed");
        reject(request.error);
      };
    } catch (err) {
      console.error("IndexedDB fallback error", err);
      reject(err);
    }
  });
  
  return dbPromise;
}

export async function getCachedBlob(url: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(url);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn("IndexedDB cache read failed:", err);
    return null;
  }
}

export async function saveBlobToCache(url: string, blob: Blob): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, url);
      
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn("IndexedDB cache write failed:", err);
  }
}

export function getCachedPageUrl(url: string): string {
  if (!url) return '';
  return pageImageCache.get(url) || url;
}

export function createSvgPlaceholder(title: string = "کاتالوگ اشک قلم", pageNum?: number): string {
  const safeTitle = (title || "کاتالوگ اشک قلم").replace(/[<>&'"]/g, '');
  const pageText = pageNum ? `صفحه ${pageNum}` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
    <defs>
      <linearGradient id="bg_${pageNum || 0}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="50%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#090d16" />
      </linearGradient>
      <linearGradient id="gold_${pageNum || 0}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>
      <pattern id="grid_${pageNum || 0}" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(245, 158, 11, 0.08)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg_${pageNum || 0})" />
    <rect width="100%" height="100%" fill="url(#grid_${pageNum || 0})" />
    <circle cx="400" cy="450" r="180" fill="rgba(245, 158, 11, 0.03)" stroke="rgba(245, 158, 11, 0.2)" stroke-width="2" stroke-dasharray="8 8" />
    <rect x="300" y="380" width="200" height="140" rx="16" fill="rgba(30, 41, 59, 0.8)" stroke="url(#gold_${pageNum || 0})" stroke-width="3" />
    <path d="M340 430 L460 430 M340 460 L460 460 M340 490 L420 490" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
    <text x="50%" y="620" font-family="Tahoma, Arial, sans-serif" font-size="28" font-weight="bold" fill="#f8fafc" text-anchor="middle" direction="rtl">${safeTitle}</text>
    <text x="50%" y="670" font-family="Tahoma, Arial, sans-serif" font-size="18" fill="#f59e0b" text-anchor="middle" direction="rtl">${pageText || 'اشک قلم - صنایع چاپ و بسته‌بندی'}</text>
    <rect x="250" y="720" width="300" height="2" fill="url(#gold_${pageNum || 0})" opacity="0.6" />
    <text x="50%" y="1030" font-family="Tahoma, Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle" direction="rtl">www.ashkghalam.ir</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getSafeImageUrl(url: string | undefined | null, title?: string, pageNum?: number): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return createSvgPlaceholder(title, pageNum);
  }
  return url;
}

export async function prefetchAndCache(url: string): Promise<string> {
  if (!url) return createSvgPlaceholder("اشک قلم");

  if (pageImageCache.has(url)) {
    return pageImageCache.get(url)!;
  }

  // 1. Check IndexedDB Cache first
  const cachedBlob = await getCachedBlob(url);
  if (cachedBlob) {
    try {
      const objUrl = URL.createObjectURL(cachedBlob);
      pageImageCache.set(url, objUrl);
      return objUrl;
    } catch (err) {
      console.warn("Could not create object URL from cached blob", err);
    }
  }

  // 2. Fetch from network if not cached
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const blob = await res.blob();
    // Save to IndexedDB for browser-persistent storage
    await saveBlobToCache(url, blob);
    const objUrl = URL.createObjectURL(blob);
    pageImageCache.set(url, objUrl);
    return objUrl;
  } catch (err) {
    console.warn("Network download failed for URL, using fallback placeholder:", url);
    const fallback = createSvgPlaceholder("اشک قلم");
    pageImageCache.set(url, fallback);
    return fallback;
  }
}

// Prefetch multiple URLs in background
export function prefetchCatalogPages(urls: string[]) {
  if (!urls) return;
  urls.forEach(url => {
    if (url) {
      prefetchAndCache(url).catch(err => {
        console.warn("Background prefetch failed for", url, err);
      });
    }
  });
}
