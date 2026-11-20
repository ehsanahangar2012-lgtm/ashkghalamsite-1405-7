import { CatalogProject, SavedProjectSummary } from '../types/flipbook';
import { optimizeDataUrlToWebP } from '../utils/imageOptimizer';
import { apiFetch, apiPostJson, apiRequestJson } from '../utils/apiClient';

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

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  try {
    const trimmed = dataUrl.trim();
    const b64Marker = ';base64,';
    const lower = trimmed.toLowerCase();
    const markerIdx = lower.indexOf(b64Marker);
    if (!lower.startsWith('data:image/') || markerIdx < 0) return null;

    const rawSub = lower.slice('data:image/'.length, markerIdx).split(';')[0].trim();
    let ext = 'webp';
    let mime = 'image/webp';
    if (rawSub === 'jpeg' || rawSub === 'jpg') {
      ext = 'jpg';
      mime = 'image/jpeg';
    } else if (rawSub === 'png') {
      ext = 'png';
      mime = 'image/png';
    } else if (rawSub === 'gif') {
      ext = 'gif';
      mime = 'image/gif';
    } else if (rawSub === 'svg+xml' || rawSub === 'svg') {
      ext = 'svg';
      mime = 'image/svg+xml';
    } else if (rawSub === 'webp') {
      ext = 'webp';
      mime = 'image/webp';
    } else {
      ext = 'webp';
      mime = `image/${rawSub}`;
    }

    const base64Clean = trimmed.slice(markerIdx + b64Marker.length).replace(/\s+/g, '');
    if (!base64Clean) return null;
    const byteString = atob(base64Clean);
    if (byteString.length === 0) return null;

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i += 1) {
      ia[i] = byteString.charCodeAt(i);
    }
    return {
      blob: new Blob([ab], { type: mime }),
      ext,
    };
  } catch {
    return null;
  }
}

export async function uploadImageAssetToServer(
  dataUrl: string,
  allowRetryCompress = true
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  let lastStatus = 0;
  let lastErrorMsg = '';

  // Primary path: standard multipart/form-data (tries /api/flipbooks/upload-image then /api.php?r=...)
  const converted = dataUrlToBlob(dataUrl);
  if (converted) {
    try {
      const formData = new FormData();
      formData.append('file', converted.blob, `page-${Date.now()}.${converted.ext}`);
      const res = await apiFetch(
        'flipbooks/upload-image',
        {
          method: 'POST',
          body: formData,
        },
        30000
      );
      lastStatus = res.status;
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && typeof data.url === 'string' && data.url) {
        return data.url;
      }
      if (data?.error && typeof data.error === 'string') {
        lastErrorMsg = data.error;
      }
    } catch {
      // Fall through to WAF-safe Base64 / JSON fallback
    }
  }

  // Fallback path: JSON / Base64 payload_file upload (apiPostJson includes automatic /api.php + payload_file WAF bypass)
  try {
    const { res, data } = await apiPostJson<{ ok?: boolean; url?: string; error?: string }>(
      'flipbooks/upload-image',
      { dataUrl },
      30000
    );
    lastStatus = res.status;
    if (res.ok && data?.ok && typeof data.url === 'string' && data.url) {
      return data.url;
    }
    if (data?.error && typeof data.error === 'string') {
      lastErrorMsg = data.error;
    }
  } catch {
    // Fall through to tighter compression retry
  }

  // Tighter WebP compression retry for oversized images (>90KB) on strict shared cPanel limits
  if (allowRetryCompress && dataUrl.length > 90_000) {
    try {
      const recompressed = await optimizeDataUrlToWebP(dataUrl, 0, {
        quality: 0.72,
        maxDimension: 960,
      });
      if (recompressed?.optimizedDataUrl && recompressed.optimizedDataUrl.length < dataUrl.length) {
        return await uploadImageAssetToServer(recompressed.optimizedDataUrl, false);
      }
    } catch {
      // Ignore compression error
    }
  }

  if (lastStatus > 0 && lastStatus !== 200) {
    throw new Error(
      lastErrorMsg ||
        `آپلود تصویر کاتالوگ روی سرور با کد ${lastStatus} متوقف شد. دسترسی نوشتن پوشه uploads/flipbooks را در هاست بررسی کنید.`
    );
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

    const isInlineSvgOrGif =
      src.startsWith('data:image/svg+xml') || src.startsWith('data:image/gif');
    if (
      src.startsWith('data:image/') &&
      !src.startsWith('data:image/webp') &&
      !isInlineSvgOrGif &&
      src.length > 260_000
    ) {
      try {
        const opt = await optimizeDataUrlToWebP(src, page.originalSizeBytes || 0, optimization);
        if (opt.optimizedDataUrl && opt.optimizedDataUrl.length < src.length) {
          src = opt.optimizedDataUrl;
          width = opt.width;
          height = opt.height;
          optimizedSizeBytes = opt.optimizedSizeBytes;
        }
      } catch {
        // Keep original data URL if canvas compression is skipped
      }
    }

    const uploadedUrl = src.startsWith('data:image/')
      ? await uploadImageAssetToServer(src)
      : src;

    if (uploadedUrl.startsWith('data:image/') && uploadedUrl.length > 120_000) {
      throw new Error(
        `آپلود تصویر صفحه «${page.title || page.fileName || 'محصول'}» روی سرور با خطا مواجه شد. لطفاً دسترسی نوشتن پوشه uploads/flipbooks را در هاست cPanel بررسی کنید.`
      );
    }

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
    if (cover.frontCustomImageUrl.startsWith('data:image/') && cover.frontCustomImageUrl.length > 120_000) {
      throw new Error('آپلود تصویر جلد کاتالوگ روی سرور با خطا مواجه شد. لطفاً دسترسی پوشه uploads را بررسی کنید.');
    }
  }
  if (cover.backCustomImageUrl?.startsWith('data:image/')) {
    cover.backCustomImageUrl = await uploadImageAssetToServer(cover.backCustomImageUrl);
    if (cover.backCustomImageUrl.startsWith('data:image/') && cover.backCustomImageUrl.length > 120_000) {
      throw new Error('آپلود تصویر پشت‌جلد کاتالوگ روی سرور با خطا مواجه شد.');
    }
  }
  if (cover.logoDataUrl?.startsWith('data:image/')) {
    cover.logoDataUrl = await uploadImageAssetToServer(cover.logoDataUrl);
  }

  const normalizedId =
    project.publishedId ||
    (project.id && project.id !== 'demo-catalog-2026' && project.id !== 'catalog-new'
      ? project.id
      : `fb-${Date.now()}`);

  const preparedProject: CatalogProject = compactProjectForStorage({
    ...project,
    id: normalizedId,
    publishedId: normalizedId,
    cover,
    pages: preparedPages,
    updatedAt: new Date().toISOString(),
  });

  // 3. Save lightweight JSON metadata via WAF-resilient transport (auto-falls back to /api.php & Base64 payload_file)
  let response: Response;
  let data: { id?: string; error?: string } | null = null;
  try {
    const res = await apiPostJson<{ id?: string; error?: string }>('flipbooks', preparedProject, 25000);
    response = res.res;
    data = res.data;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('مهلت پاسخ سرور به پایان رسید. لطفاً اتصال اینترنت یا دسترسی نوشتن فایل‌های هاست cPanel را بررسی کنید.');
    }
    throw new Error('ارتباط با سرور برای ثبت کاتالوگ برقرار نشد.');
  }

  if (response.status === 413) {
    throw new Error('حجم تصاویر بیش از حد مجاز سرور است. لطفاً در بخش فشرده‌سازی WebP ابعاد را روی 1200px قرار دهید.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `سرور پاسخ معتبر JSON نداد (کد ${response.status}). مطمئن شوید فایل‌های api.php و .htaccess در روت public_html قرار دارند و دسترسی فایل‌ها 644 است.`
    );
  }

  if (!response.ok || !data?.id) {
    throw new Error(data?.error || `انتشار کاتالوگ روی سرور با خطا مواجه شد (کد ${response.status}).`);
  }

  const publishedId = String(data.id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ashk-media-synced'));
  }
  return {
    id: publishedId,
    project: {
      ...preparedProject,
      id: publishedId,
      publishedId,
    },
  };
}

export async function fetchPublishedProject(id: string): Promise<CatalogProject> {
  const { res, data } = await apiRequestJson<CatalogProject & { error?: string }>(
    `flipbooks/${encodeURIComponent(id)}`,
    {},
    15000
  );
  if (!res.ok || !data) {
    throw new Error(data?.error || 'کاتالوگ درخواستی یافت نشد.');
  }
  return data as CatalogProject;
}
