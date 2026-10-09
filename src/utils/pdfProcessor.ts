import * as pdfjsLib from 'pdfjs-dist/build/pdf.js';
import { CatalogPage, PDFProcessingProgress } from '../types/catalog';
import { convertCanvasToWebP } from './webpConverter';

// Initialize PDF.js worker using unpkg CDN fallback
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ProcessedPDFResult {
  title: string;
  pageCount: number;
  coverImage: string;
  pages: CatalogPage[];
  extractedFullText: string;
}

export async function processPDFFile(
  file: File,
  onProgress?: (progress: PDFProcessingProgress) => void
): Promise<ProcessedPDFResult> {
  try {
    if (onProgress) {
      onProgress({
        status: 'reading',
        currentPage: 0,
        totalPages: 0,
        percentage: 5,
        message: 'در حال خواندن فایل PDF...'
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    if (onProgress) {
      onProgress({
        status: 'rendering',
        currentPage: 0,
        totalPages: totalPages,
        percentage: 15,
        message: `شناسایی ${totalPages} صفحه در سند PDF...`
      });
    }

    const pages: CatalogPage[] = [];
    let extractedFullText = '';
    let coverImage = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Calculate optimal rendering scale capped at 1280px max dimension
      const baseViewport = page.getViewport({ scale: 1.0 });
      const maxDim = Math.max(baseViewport.width, baseViewport.height);
      const targetScale = Math.min(1.5, Math.max(0.8, 1280 / maxDim));
      const viewport = page.getViewport({ scale: targetScale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas as any
        } as any).promise;
      }

      // High quality compressed WebP data URL (~60-90KB per page)
      const pageImageUrl = convertCanvasToWebP(canvas, 0.78);
      
      // Generate WebP thumbnail
      const thumbCanvas = document.createElement('canvas');
      const thumbScale = Math.min(0.25, 300 / viewport.width);
      thumbCanvas.width = Math.round(viewport.width * thumbScale);
      thumbCanvas.height = Math.round(viewport.height * thumbScale);
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        thumbCtx.imageSmoothingEnabled = true;
        thumbCtx.imageSmoothingQuality = 'medium';
        thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      }
      const thumbnailUrl = convertCanvasToWebP(thumbCanvas, 0.65);

      if (pageNum === 1) {
        coverImage = pageImageUrl;
      }

      // Extract text content for search indexing
      let textContentString = '';
      try {
        const textContent = await page.getTextContent();
        textContentString = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ');
        extractedFullText += ` [Page ${pageNum}]: ${textContentString}`;
      } catch (e) {
        console.warn(`Could not extract text for page ${pageNum}`, e);
      }

      pages.push({
        pageNumber: pageNum,
        imageUrl: pageImageUrl,
        webpUrl: pageImageUrl,
        thumbnailUrl: thumbnailUrl,
        extractedText: textContentString,
        width: viewport.width,
        height: viewport.height,
        hotspots: []
      });

      const progressPct = Math.round(15 + (pageNum / totalPages) * 80);
      if (onProgress) {
        onProgress({
          status: 'rendering',
          currentPage: pageNum,
          totalPages: totalPages,
          percentage: progressPct,
          message: `در حال رندر صفحه ${pageNum} از ${totalPages}...`
        });
      }
    }

    // Default title from file name without extension
    const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    if (onProgress) {
      onProgress({
        status: 'complete',
        currentPage: totalPages,
        totalPages: totalPages,
        percentage: 100,
        message: 'پردازش PDF با موفقیت تکمیل شد.'
      });
    }

    return {
      title,
      pageCount: totalPages,
      coverImage,
      pages,
      extractedFullText
    };

  } catch (error: any) {
    console.error("PDF Processing error:", error);
    if (onProgress) {
      onProgress({
        status: 'error',
        currentPage: 0,
        totalPages: 0,
        percentage: 0,
        message: `خطا در پردازش فایل PDF: ${error.message || 'فایل نامعتبر است'}`
      });
    }
    throw error;
  }
}
