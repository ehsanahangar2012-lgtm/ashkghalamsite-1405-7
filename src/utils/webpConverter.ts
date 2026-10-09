/**
 * Client-Side WebP Image Conversion Engine
 * Converts images (File, Blob, base64 string, HTMLImageElement) into compressed WebP format
 * optimized for restricted networks in Iran.
 */

export interface WebPConversionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default: 0.8)
}

/**
 * Converts a File or Blob object to a WebP Data URL string.
 */
export async function convertFileToWebP(
  file: File | Blob,
  options: WebPConversionOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خطا در خواندن فایل تصویر'));
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error('محتوای تصویر خالی است'));
        return;
      }
      convertBase64ToWebP(result, options).then(resolve).catch(reject);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Base64 image string (PNG, JPEG, GIF, BMP) into WebP format.
 */
export async function convertBase64ToWebP(
  base64Src: string,
  options: WebPConversionOptions = {}
): Promise<string> {
  // If already WebP and no resize needed, check quality
  if (base64Src.startsWith('data:image/webp;') && !options.maxWidth && !options.maxHeight) {
    return base64Src;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('خطا در بارگذاری تصویر برای تبدیل به WebP'));
    img.onload = () => {
      try {
        const webpUrl = convertImageElementToWebP(img, options);
        resolve(webpUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.src = base64Src;
  });
}

/**
 * Converts an HTMLImageElement into a WebP Data URL string with optional resizing.
 */
export function convertImageElementToWebP(
  img: HTMLImageElement,
  options: WebPConversionOptions = {}
): string {
  const quality = options.quality ?? 0.80;
  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  // Calculate scaled dimensions if max width/height specified
  if (options.maxWidth && targetWidth > options.maxWidth) {
    const ratio = options.maxWidth / targetWidth;
    targetWidth = options.maxWidth;
    targetHeight = Math.round(targetHeight * ratio);
  }

  if (options.maxHeight && targetHeight > options.maxHeight) {
    const ratio = options.maxHeight / targetHeight;
    targetHeight = options.maxHeight;
    targetWidth = Math.round(targetWidth * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('سیستم مرورگر امکان پردازش گرافیکی دو بعدی را ندارد');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Convert canvas to WebP
  let webpDataUrl = canvas.toDataURL('image/webp', quality);

  // Fallback to JPEG if browser doesn't support WebP export
  if (!webpDataUrl.startsWith('data:image/webp')) {
    webpDataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  return webpDataUrl;
}

/**
 * Converts a Canvas directly to a WebP Data URL.
 */
export function convertCanvasToWebP(
  canvas: HTMLCanvasElement,
  quality: number = 0.80
): string {
  let webpDataUrl = canvas.toDataURL('image/webp', quality);
  if (!webpDataUrl.startsWith('data:image/webp')) {
    webpDataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return webpDataUrl;
}
