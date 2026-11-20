import { OptimizationSettings } from '../types/flipbook';
import { isSupportedImageFile } from './catalogAssets';

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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('خطا در خواندن فایل تصویر'));
      }
    };
    reader.onerror = () => reject(new Error('خواندن فایل تصویر با خطا مواجه شد'));
    reader.readAsDataURL(file);
  });
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('تصویر معتبر نیست یا قابل بارگذاری نمی‌باشد'));
    img.src = src;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('تبدیل خروجی WebP با خطا مواجه شد'));
      }
    };
    reader.onerror = () => reject(new Error('خطا در خواندن داده WebP'));
    reader.readAsDataURL(blob);
  });
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback to JPEG if WebP encoding is unsupported in an unusual environment
          canvas.toBlob(
            (fallbackBlob) => {
              if (fallbackBlob) resolve(fallbackBlob);
              else reject(new Error('فشرده‌سازی تصویر در مرورگر انجام نشد'));
            },
            'image/jpeg',
            quality
          );
        }
      },
      'image/webp',
      quality
    );
  });
}

export async function optimizeDataUrlToWebP(
  sourceDataUrl: string,
  originalSizeBytes: number,
  settings: OptimizationSettings
): Promise<OptimizedImageResult> {
  const img = await loadHtmlImage(sourceDataUrl);
  const originalWidth = img.naturalWidth || img.width || 800;
  const originalHeight = img.naturalHeight || img.height || 1000;

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;
  const maxDim = Math.max(320, settings.maxDimension);

  if (originalWidth > maxDim || originalHeight > maxDim) {
    const ratio = Math.min(maxDim / originalWidth, maxDim / originalHeight);
    targetWidth = Math.max(1, Math.round(originalWidth * ratio));
    targetHeight = Math.max(1, Math.round(originalHeight * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('زمینه رسم Canvas در دسترس نیست');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const clampedQuality = Math.min(0.98, Math.max(0.25, settings.quality));
  const webpBlob = await canvasToWebpBlob(canvas, clampedQuality);
  const optimizedDataUrl = await blobToDataUrl(webpBlob);

  return {
    originalDataUrl: sourceDataUrl,
    optimizedDataUrl,
    originalSizeBytes: originalSizeBytes > 0 ? originalSizeBytes : Math.round(sourceDataUrl.length * 0.75),
    optimizedSizeBytes: webpBlob.size,
    originalWidth,
    originalHeight,
    width: targetWidth,
    height: targetHeight,
  };
}

export async function optimizeFileToWebP(
  file: File,
  settings: OptimizationSettings
): Promise<OptimizedImageResult> {
  if (!isSupportedImageFile(file)) {
    throw new Error(`فایل «${file.name}» یک تصویر معتبر نیست.`);
  }
  const sourceDataUrl = await readFileAsDataUrl(file);
  return optimizeDataUrlToWebP(sourceDataUrl, file.size, settings);
}

export async function optimizeImageUrlToWebP(
  url: string,
  settings: OptimizationSettings
): Promise<OptimizedImageResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('دریافت تصویر نمونه با خطا مواجه شد');
  }
  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
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
