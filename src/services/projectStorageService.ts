import { CatalogProject, SavedProjectSummary } from '../types/flipbook';
import { optimizeDataUrlToWebP } from '../utils/imageOptimizer';

const ACTIVE_PROJECT_KEY = 'varaghnegar_active_project_v1';
const SAVED_PROJECTS_KEY = 'varaghnegar_saved_projects_v1';

/**
 * Strip duplicate raw originalDataUrl when storing so payload & quota stay 50% smaller.
 * Consumers always read `p.optimizedDataUrl || p.originalDataUrl`.
 */
function compactProjectForStorage(project: CatalogProject): CatalogProject {
  return {
    ...project,
    pages: project.pages.map((p) => {
      const primary = p.optimizedDataUrl || p.originalDataUrl;
      return {
        ...p,
        originalDataUrl: p.optimizedDataUrl ? '' : primary,
        optimizedDataUrl: primary,
      };
    }),
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function uploadImageAssetToServer(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  try {
    const res = await fetchWithTimeout(
      '/api/flipbooks/upload-image',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      },
      15000
    );
    if (!res.ok) return dataUrl;
    const data = await res.json().catch(() => null);
    if (data?.ok && typeof data.url === 'string' && data.url) {
      return data.url;
    }
  } catch {
    // Fallback cleanly to inline dataUrl if individual upload route fails/times out
  }
  return dataUrl;
}

export function saveActiveProjectToLocal(project: CatalogProject): boolean {
  try {
    const compacted = compactProjectForStorage({
      ...project,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(compacted));
    return true;
  } catch {
    return false;
  }
}

export function loadActiveProjectFromLocal(): CatalogProject | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogProject;
    if (!parsed || !Array.isArray(parsed.pages) || !parsed.cover) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function listSavedProjects(): SavedProjectSummary[] {
  try {
    const raw = localStorage.getItem(SAVED_PROJECTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as CatalogProject[];
    if (!Array.isArray(list)) return [];
    return list.map((p) => ({
      id: p.id,
      name: p.name || p.cover?.title || 'کاتالوگ بدون نام',
      pageCount: Array.isArray(p.pages) ? p.pages.length : 0,
      updatedAt: p.updatedAt,
      publishedId: p.publishedId,
    }));
  } catch {
    return [];
  }
}

export function saveNamedProjectToLocal(project: CatalogProject): { ok: boolean; error?: string } {
  try {
    const raw = localStorage.getItem(SAVED_PROJECTS_KEY);
    const list: CatalogProject[] = raw ? JSON.parse(raw) : [];
    const compacted = compactProjectForStorage({
      ...project,
      updatedAt: new Date().toISOString(),
    });
    const idx = list.findIndex((item) => item.id === compacted.id);
    if (idx >= 0) {
      list[idx] = compacted;
    } else {
      list.unshift(compacted);
    }
    localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(list.slice(0, 12)));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'حافظه مرورگر پر شده است. می‌توانید پروژه را به صورت فایل JSON دانلود و ذخیره کنید.',
    };
  }
}

export function loadSavedProjectById(id: string): CatalogProject | null {
  try {
    const raw = localStorage.getItem(SAVED_PROJECTS_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw) as CatalogProject[];
    return list.find((item) => item.id === id) || null;
  } catch {
    return null;
  }
}

export function deleteSavedProjectById(id: string): void {
  try {
    const raw = localStorage.getItem(SAVED_PROJECTS_KEY);
    if (!raw) return;
    const list = JSON.parse(raw) as CatalogProject[];
    const next = list.filter((item) => item.id !== id);
    localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export function downloadProjectAsJson(project: CatalogProject): void {
  const payload = compactProjectForStorage({
    ...project,
    updatedAt: new Date().toISOString(),
  });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (project.name || project.cover.title || 'catalog')
    .replace(/[^\w\u0600-\u06FF-]+/g, '-')
    .slice(0, 48);
  a.href = url;
  a.download = `${safeName || 'catalog'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function parseProjectFromJsonFile(file: File): Promise<CatalogProject> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('فایل انتخاب‌شده ساختار JSON معتبر ندارد.');
  }
  if (!parsed || !parsed.cover || !Array.isArray(parsed.pages)) {
    throw new Error('این فایل متعلق به پروژه کاتالوگ ورق‌نگار نیست.');
  }
  return {
    ...parsed,
    id: parsed.id || `proj-${Date.now()}`,
    flipDirection: parsed.flipDirection === 'ltr' ? 'ltr' : 'rtl',
    optimization: parsed.optimization || { quality: 0.82, maxDimension: 1200 },
    updatedAt: new Date().toISOString(),
  } as CatalogProject;
}

export async function publishProjectToServer(
  project: CatalogProject
): Promise<{ id: string; project: CatalogProject }> {
  const optimization = project.optimization || { quality: 0.8, maxDimension: 1200 };

  // 1. Ensure all inline pages are WebP-compressed and uploaded individually so /api/flipbooks stays tiny
  const preparedPages = [];
  for (const page of project.pages) {
    let src = page.optimizedDataUrl || page.originalDataUrl || '';
    let width = page.width;
    let height = page.height;
    let optimizedSizeBytes = page.optimizedSizeBytes;

    if (src.startsWith('data:image/') && !src.startsWith('data:image/webp')) {
      try {
        const opt = await optimizeDataUrlToWebP(src, page.originalSizeBytes || 0, optimization);
        src = opt.optimizedDataUrl;
        width = opt.width;
        height = opt.height;
        optimizedSizeBytes = opt.optimizedSizeBytes;
      } catch {
        // Keep original data URL if canvas compression is skipped
      }
    }

    const uploadedUrl = src.startsWith('data:image/')
      ? await uploadImageAssetToServer(src)
      : src;

    preparedPages.push({
      ...page,
      width,
      height,
      optimizedSizeBytes,
      originalDataUrl: uploadedUrl.startsWith('data:') ? '' : uploadedUrl,
      optimizedDataUrl: uploadedUrl,
    });
  }

  // 2. Upload any inline cover assets individually as well
  const cover = { ...project.cover };
  if (cover.frontCustomImageUrl?.startsWith('data:image/')) {
    cover.frontCustomImageUrl = await uploadImageAssetToServer(cover.frontCustomImageUrl);
  }
  if (cover.backCustomImageUrl?.startsWith('data:image/')) {
    cover.backCustomImageUrl = await uploadImageAssetToServer(cover.backCustomImageUrl);
  }
  if (cover.logoDataUrl?.startsWith('data:image/')) {
    cover.logoDataUrl = await uploadImageAssetToServer(cover.logoDataUrl);
  }

  const preparedProject: CatalogProject = compactProjectForStorage({
    ...project,
    cover,
    pages: preparedPages,
    updatedAt: new Date().toISOString(),
  });

  // 3. Save lightweight JSON metadata to /api/flipbooks with strict timeout
  let response: Response;
  try {
    response = await fetchWithTimeout(
      '/api/flipbooks',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preparedProject),
      },
      25000
    );
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('مهلت پاسخ سرور به پایان رسید. لطفاً اتصال اینترنت یا سرور Node.js هاست را بررسی کنید.');
    }
    throw new Error('ارتباط با سرور برای ثبت کاتالوگ برقرار نشد.');
  }

  if (response.status === 413) {
    throw new Error('حجم تصاویر بیش از حد مجاز سرور است. لطفاً در بخش فشرده‌سازی WebP ابعاد را روی 1200px قرار دهید.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `سرور پاسخ معتبر JSON نداد (کد ${response.status}). مطمئن شوید سرویس Node.js در هاست فعال است.`
    );
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.id) {
    throw new Error(data?.error || `انتشار کاتالوگ روی سرور با خطا مواجه شد (کد ${response.status}).`);
  }

  const publishedId = String(data.id);
  return {
    id: publishedId,
    project: {
      ...preparedProject,
      publishedId,
    },
  };
}

export async function fetchPublishedProject(id: string): Promise<CatalogProject> {
  const response = await fetchWithTimeout(`/api/flipbooks/${encodeURIComponent(id)}`, {}, 15000);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(data?.error || 'کاتالوگ درخواستی یافت نشد.');
  }
  return data as CatalogProject;
}
