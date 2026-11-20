import { OptimizationSettings } from '../types/flipbook';
import { getUploadFallbackCandidates, isSupportedImageFile } from './catalogAssets';

export interface OptimizedImageResult {
  originalDataUrl: string;
  optimizedDataUrl: string;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
}

const MAX_SAFE_CANVAS_DIM = 4096;
const MAX_SAFE_CANVAS_PIXELS = 16_000_000;

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
        resolve(reader.result);
      } else {
        reject(new Error('خطا در خواندن داده تصویر'));
      }
    };
    reader.onerror = () => reject(new Error('خواندن فایل تصویر با خطا مواجه شد'));
    reader.readAsDataURL(blob);
  });
}

async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.decoding = 'sync';
    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode().catch(() => undefined);
        }
      } catch {
        // ignore decode rejection if image already loaded with valid dimensions
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error('تصویر معتبر نیست یا در مرورگر قابل بارگذاری نمی‌باشد'));
    img.src = src;
  });
}

function estimateDataUrlByteSize(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) return dataUrl.length;
  const b64 = dataUrl.slice(commaIdx + 1).replace(/\s+/g, '');
  return Math.max(0, Math.floor((b64.length * 3) / 4));
}

function parseDataUrlMime(dataUrl: string): string {
  const m = dataUrl.match(/^data:(image\/[a-z0-9.+-]+)(?:;[^,]*)?,/i);
  return m ? m[1].toLowerCase() : '';
}

function canvasToBlobAsync(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            resolve(null);
          }
        },
        mime,
        quality
      );
    } catch {
      resolve(null);
    }
  });
}

function drawOnWhiteBackedCanvas(
  sourceCanvas: HTMLCanvasElement
): HTMLCanvasElement {
  const whiteCanvas = document.createElement('canvas');
  whiteCanvas.width = sourceCanvas.width;
  whiteCanvas.height = sourceCanvas.height;
  const wctx = whiteCanvas.getContext('2d');
  if (wctx) {
    wctx.fillStyle = '#ffffff';
    wctx.fillRect(0, 0, whiteCanvas.width, whiteCanvas.height);
    wctx.drawImage(sourceCanvas, 0, 0);
  }
  return whiteCanvas;
}

async function encodeCanvasSafely(
  canvas: HTMLCanvasElement,
  quality: number,
  preserveAlphaIfNoWebp: boolean
): Promise<Blob> {
  // 1. Primary: WebP encoding
  const webpBlob = await canvasToBlobAsync(canvas, 'image/webp', quality);
  if (webpBlob && webpBlob.size >= 24 && webpBlob.type === 'image/webp') {
    return webpBlob;
  }

  // Some browsers (e.g. older Safari/WebKit) ignore 'image/webp' and silently return 'image/png'.
  // If alpha must be preserved and the PNG is reasonably sized, keep PNG; otherwise encode clean JPEG on white.
  if (preserveAlphaIfNoWebp) {
    const pngBlob =
      webpBlob && webpBlob.type === 'image/png' && webpBlob.size >= 24
        ? webpBlob
        : await canvasToBlobAsync(canvas, 'image/png');
    if (pngBlob && pngBlob.size >= 24 && pngBlob.size <= 1_800_000) {
      return pngBlob;
    }
  }

  // 2. Fallback: JPEG over white background so transparent pixels never turn black
  const whiteCanvas = drawOnWhiteBackedCanvas(canvas);
  const jpegBlob = await canvasToBlobAsync(whiteCanvas, 'image/jpeg', quality);
  if (jpegBlob && jpegBlob.size >= 24) {
    return jpegBlob;
  }

  // 3. Final fallback: PNG
  const finalPng = await canvasToBlobAsync(canvas, 'image/png');
  if (finalPng && finalPng.size >= 24) {
    return finalPng;
  }

  throw new Error('فشرده‌سازی تصویر در مرورگر انجام نشد');
}

function computeTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number
): { width: number; height: number } {
  const maxDim = Math.min(MAX_SAFE_CANVAS_DIM, Math.max(320, maxDimension || 1200));
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (targetWidth > maxDim || targetHeight > maxDim) {
    const ratio = Math.min(maxDim / targetWidth, maxDim / targetHeight);
    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
    targetHeight = Math.max(1, Math.round(targetHeight * ratio));
  }

  // Guard against extreme aspect ratios exceeding browser canvas pixel limits
  if (targetWidth * targetHeight > MAX_SAFE_CANVAS_PIXELS) {
    const scale = Math.sqrt(MAX_SAFE_CANVAS_PIXELS / (targetWidth * targetHeight));
    targetWidth = Math.max(1, Math.floor(targetWidth * scale));
    targetHeight = Math.max(1, Math.floor(targetHeight * scale));
  }

  return { width: targetWidth, height: targetHeight };
}

async function decodeDrawableSource(
  source: Blob | string
): Promise<{
  drawable: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  // Prefer createImageBitmap for Blob inputs when available (honors EXIF orientation & avoids huge base64 memory)
  if (source instanceof Blob && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(source, {
        imageOrientation: 'from-image',
      } as ImageBitmapOptions);
      if (bitmap.width > 0 && bitmap.height > 0) {
        return {
          drawable: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => {
            try {
              bitmap.close();
            } catch {
              // ignore
            }
          },
        };
      }
      bitmap.close();
    } catch {
      // Fall back to HTMLImageElement below
    }
  }

  let objectUrl: string | null = null;
  const imgSrc =
    source instanceof Blob ? ((objectUrl = URL.createObjectURL(source)), objectUrl) : source;

  try {
    const img = await loadHtmlImage(imgSrc);
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (w <= 0 || h <= 0) {
      throw new Error('ابعاد تصویر قابل تشخیص نیست؛ ممکن است فایل خراب یا فرمت آن پشتیبانی‌نشده باشد.');
    }
    return {
      drawable: img,
      width: w,
      height: h,
      cleanup: () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      },
    };
  } catch (err) {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    throw err;
  }
}

async function verifyDecodedDataUrl(dataUrl: string): Promise<boolean> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return false;
  try {
    const img = await loadHtmlImage(dataUrl);
    return (img.naturalWidth || img.width) > 0 && (img.naturalHeight || img.height) > 0;
  } catch {
    return false;
  }
}

export async function optimizeDataUrlToWebP(
  sourceDataUrl: string,
  originalSizeBytes: number,
  settings: OptimizationSettings
): Promise<OptimizedImageResult> {
  const trimmed = (sourceDataUrl || '').trim();
  if (!trimmed.startsWith('data:image/')) {
    throw new Error('داده ورودی یک تصویر معتبر نیست.');
  }

  const sourceMime = parseDataUrlMime(trimmed);
  const measuredOriginalBytes =
    originalSizeBytes > 0 ? originalSizeBytes : estimateDataUrlByteSize(trimmed);

  // Keep SVG and GIF intact (canvas rasterization breaks vector SVGs and animated GIFs)
  if (sourceMime === 'image/svg+xml' || sourceMime === 'image/gif') {
    let w = 900;
    let h = 900;
    try {
      const img = await loadHtmlImage(trimmed);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        w = img.naturalWidth;
        h = img.naturalHeight;
      }
    } catch {
      // keep default dimensions for viewBox-only SVGs
    }
    return {
      originalDataUrl: trimmed,
      optimizedDataUrl: trimmed,
      originalSizeBytes: measuredOriginalBytes,
      optimizedSizeBytes: measuredOriginalBytes,
      originalWidth: w,
      originalHeight: h,
      width: w,
      height: h,
    };
  }

  const decoded = await decodeDrawableSource(trimmed);
  try {
    const { width: targetWidth, height: targetHeight } = computeTargetDimensions(
      decoded.width,
      decoded.height,
      settings.maxDimension
    );

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('زمینه رسم Canvas در دسترس نیست');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(decoded.drawable, 0, 0, targetWidth, targetHeight);

    const clampedQuality = Math.min(0.95, Math.max(0.35, settings.quality || 0.82));
    const hasPotentialAlpha = sourceMime === 'image/png' || sourceMime === 'image/webp';

    const encodedBlob = await encodeCanvasSafely(canvas, clampedQuality, hasPotentialAlpha);
    const optimizedDataUrl = await readBlobAsDataUrl(encodedBlob);

    const validOutput = await verifyDecodedDataUrl(optimizedDataUrl);
    if (!validOutput) {
      // Safe fallback to original verified image instead of returning a broken image
      return {
        originalDataUrl: trimmed,
        optimizedDataUrl: trimmed,
        originalSizeBytes: measuredOriginalBytes,
        optimizedSizeBytes: measuredOriginalBytes,
        originalWidth: decoded.width,
        originalHeight: decoded.height,
        width: decoded.width,
        height: decoded.height,
      };
    }

    // If source was already a small WebP/JPEG within target dimensions and re-encoding made it larger, keep original
    const withinMaxDim =
      decoded.width <= targetWidth && decoded.height <= targetHeight;
    if (
      withinMaxDim &&
      (sourceMime === 'image/webp' || sourceMime === 'image/jpeg') &&
      encodedBlob.size > measuredOriginalBytes * 1.15 &&
      measuredOriginalBytes <= 600_000
    ) {
      return {
        originalDataUrl: trimmed,
        optimizedDataUrl: trimmed,
        originalSizeBytes: measuredOriginalBytes,
        optimizedSizeBytes: measuredOriginalBytes,
        originalWidth: decoded.width,
        originalHeight: decoded.height,
        width: decoded.width,
        height: decoded.height,
      };
    }

    return {
      originalDataUrl: trimmed,
      optimizedDataUrl,
      originalSizeBytes: measuredOriginalBytes,
      optimizedSizeBytes: encodedBlob.size,
      originalWidth: decoded.width,
      originalHeight: decoded.height,
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    decoded.cleanup();
  }
}

export async function optimizeFileToWebP(
  file: File,
  settings: OptimizationSettings
): Promise<OptimizedImageResult> {
  if (!isSupportedImageFile(file)) {
    throw new Error(`فایل «${file.name}» یک تصویر معتبر نیست.`);
  }
  if (file.size <= 0) {
    throw new Error(`فایل «${file.name}» خالی است.`);
  }

  const lowerType = (file.type || '').toLowerCase();
  const lowerName = (file.name || '').toLowerCase();
  const isSvgOrGif =
    lowerType === 'image/svg+xml' ||
    lowerType === 'image/gif' ||
    lowerName.endsWith('.svg') ||
    lowerName.endsWith('.gif');

  if (isSvgOrGif) {
    const dataUrl = await readBlobAsDataUrl(file);
    return optimizeDataUrlToWebP(dataUrl, file.size, settings);
  }

  // Decode directly from Blob/ObjectURL to avoid holding huge raw base64 strings in RAM
  const decoded = await decodeDrawableSource(file);
  try {
    const { width: targetWidth, height: targetHeight } = computeTargetDimensions(
      decoded.width,
      decoded.height,
      settings.maxDimension
    );

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('زمینه رسم Canvas در دسترس نیست');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(decoded.drawable, 0, 0, targetWidth, targetHeight);

    const clampedQuality = Math.min(0.95, Math.max(0.35, settings.quality || 0.82));
    const hasPotentialAlpha =
      lowerType.includes('png') ||
      lowerType.includes('webp') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp');

    const encodedBlob = await encodeCanvasSafely(canvas, clampedQuality, hasPotentialAlpha);
    const optimizedDataUrl = await readBlobAsDataUrl(encodedBlob);

    const validOutput = await verifyDecodedDataUrl(optimizedDataUrl);
    if (!validOutput) {
      // Fallback safely to original file bytes
      const fallbackDataUrl = await readBlobAsDataUrl(file);
      return {
        originalDataUrl: fallbackDataUrl,
        optimizedDataUrl: fallbackDataUrl,
        originalSizeBytes: file.size,
        optimizedSizeBytes: file.size,
        originalWidth: decoded.width,
        originalHeight: decoded.height,
        width: decoded.width,
        height: decoded.height,
      };
    }

    // If original is already a compact WebP/JPEG within target dimensions and re-encoding grew it, keep original
    const isAlreadyWebpOrJpeg =
      lowerType === 'image/webp' ||
      lowerType === 'image/jpeg' ||
      lowerName.endsWith('.webp') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg');
    const withinMaxDim = decoded.width <= targetWidth && decoded.height <= targetHeight;
    if (
      isAlreadyWebpOrJpeg &&
      withinMaxDim &&
      encodedBlob.size > file.size * 1.15 &&
      file.size <= 600_000
    ) {
      const originalDataUrl = await readBlobAsDataUrl(file);
      return {
        originalDataUrl,
        optimizedDataUrl: originalDataUrl,
        originalSizeBytes: file.size,
        optimizedSizeBytes: file.size,
        originalWidth: decoded.width,
        originalHeight: decoded.height,
        width: decoded.width,
        height: decoded.height,
      };
    }

    return {
      originalDataUrl: optimizedDataUrl,
      optimizedDataUrl,
      originalSizeBytes: file.size,
      optimizedSizeBytes: encodedBlob.size,
      originalWidth: decoded.width,
      originalHeight: decoded.height,
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    decoded.cleanup();
  }
}

async function fetchValidImageBlob(url: string): Promise<Blob> {
  const candidates = getUploadFallbackCandidates(url);
  let lastError = 'دریافت تصویر از سرور با خطا مواجه شد';

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        lastError = `دریافت تصویر با کد ${response.status} ناموفق بود`;
        continue;
      }
      const ct = (response.headers.get('content-type') || '').toLowerCase();
      if (ct && !ct.startsWith('image/') && !ct.includes('octet-stream')) {
        lastError = 'پاسخ سرور تصویر معتبر نبود (احتمالاً فایل تصویر در سرور یافت نشد)';
        continue;
      }
      const blob = await response.blob();
      if (blob.size < 24) {
        lastError = 'فایل تصویر دریافتی خالی است';
        continue;
      }
      if (blob.type && !blob.type.toLowerCase().startsWith('image/') && !blob.type.includes('octet-stream')) {
        lastError = 'فرمت پاسخ دریافتی تصویر معتبر نیست';
        continue;
      }
      return blob;
    } catch {
      lastError = 'ارتباط با سرور برای دریافت تصویر برقرار نشد';
    }
  }

  throw new Error(lastError);
}

export async function optimizeImageUrlToWebP(
  url: string,
  settings: OptimizationSettings
): Promise<OptimizedImageResult> {
  if (url.startsWith('data:image/')) {
    return optimizeDataUrlToWebP(url, 0, settings);
  }
  const blob = await fetchValidImageBlob(url);
  const dataUrl = await readBlobAsDataUrl(blob);
  return optimizeDataUrlToWebP(dataUrl, blob.size, settings);
}

export function formatBytesFa(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '۰ بایت';
  if (bytes < 1024) return `${bytes.toLocaleString('fa-IR')} بایت`;
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} کیلوبایت`;
  }
  const mb = kb / 1024;
  return `${mb.toLocaleString('fa-IR', { maximumFractionDigits: 2 })} مگابایت`;
}

export function calculateSavingsPercent(beforeBytes: number, afterBytes: number): number {
  if (!beforeBytes || beforeBytes <= 0) return 0;
  const diff = ((beforeBytes - afterBytes) / beforeBytes) * 100;
  return Math.max(0, Math.round(diff));
}
