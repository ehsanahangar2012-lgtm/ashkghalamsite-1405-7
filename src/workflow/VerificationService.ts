/**
 * Unified Ad Verification Service
 * Shared by Backend (Express Server) and Local Agent / Extension
 * Validates real published ads against actual platform URLs, title match, and ID match.
 */

import { VerificationRequest, VerificationResult } from './types';

export class WorkflowVerificationService {
  private static instance: WorkflowVerificationService;

  public static getInstance(): WorkflowVerificationService {
    if (!WorkflowVerificationService.instance) {
      WorkflowVerificationService.instance = new WorkflowVerificationService();
    }
    return WorkflowVerificationService.instance;
  }

  /**
   * Helper to format Shamsi date
   */
  public getShamsiTimestamp(date: Date = new Date()): string {
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
    } catch {
      return date.toISOString();
    }
  }

  /**
   * Clean and normalize Persian text for title matching
   */
  public normalizePersian(text: string): string {
    if (!text) return '';
    return text
      .replace(/[\u200C\u200B]/g, ' ') // zero-width non-joiner
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[\u064B-\u065F]/g, '') // remove arabic diacritics
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Calculate string similarity based on shared meaningful tokens
   */
  public calculateTitleSimilarity(sourceTitle: string, targetTitle: string): number {
    const tokensA = this.normalizePersian(sourceTitle).split(/\s+/).filter(w => w.length > 2);
    const tokensB = this.normalizePersian(targetTitle).split(/\s+/).filter(w => w.length > 2);

    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    const setB = new Set(tokensB);
    let matchedCount = 0;
    for (const token of tokensA) {
      if (setB.has(token)) {
        matchedCount++;
      }
    }

    return (matchedCount / Math.max(tokensA.length, tokensB.length)) * 100;
  }

  /**
   * Extract real ad link from raw response payload or redirect URL
   */
  public extractAdLinkFromResponse(payload: any): { url: string; adId?: string } | null {
    if (!payload) return null;

    if (typeof payload === 'string') {
      // Look for standard platform URL patterns (e.g. /v/, /posts/, /ad/, /manage/)
      const urlMatch = payload.match(/https?:\/\/[^\s"']+(?:\/v\/|\/posts\/|\/ad\/|\/manage\/)[^\s"']+/i);
      if (urlMatch) {
        const url = urlMatch[0];
        const idMatch = url.match(/(?:\/v\/|\/posts\/|\/ad\/)([a-zA-Z0-9_-]+)/);
        return { url, adId: idMatch ? idMatch[1] : undefined };
      }
    }

    if (typeof payload === 'object') {
      const candidateUrl = payload.url || payload.adUrl || payload.link || payload.postUrl || payload.web_url;
      const candidateId = payload.id || payload.adId || payload.postId || payload.token;

      if (candidateUrl && typeof candidateUrl === 'string') {
        return {
          url: candidateUrl,
          adId: candidateId ? String(candidateId) : undefined
        };
      }
    }

    return null;
  }

  /**
   * Strict Verification: Matches URL, Title, and ID.
   * If evidence is insufficient, returns UNKNOWN. Never assumes PUBLISHED on HTTP 200 alone.
   */
  public async verifyAd(req: VerificationRequest): Promise<VerificationResult> {
    const verifiedAt = new Date().toISOString();
    const verifiedAtShamsi = this.getShamsiTimestamp();
    const reasons: string[] = [];

    // 1. Check for URL existence
    if (!req.adUrl || !req.adUrl.startsWith('http')) {
      reasons.push('لینک معتبر و ساختاریافته از نتیجه سامانه استخراج نشد.');
      return {
        status: 'UNKNOWN',
        adUrl: req.adUrl || '',
        adId: req.adId,
        titleMatch: false,
        adIdMatch: false,
        verificationScore: 0,
        evidenceReasons: reasons,
        verifiedAt,
        verifiedAtShamsi
      };
    }

    // 2. Check if page was unreachable or returned network error
    if (req.pageStatus && req.pageStatus >= 400) {
      reasons.push(`خطای دسترسی HTTP ${req.pageStatus} به صفحه آگهی گزارش شد.`);
      return {
        status: 'REJECTED',
        adUrl: req.adUrl,
        adId: req.adId,
        titleMatch: false,
        adIdMatch: false,
        verificationScore: 0,
        evidenceReasons: reasons,
        verifiedAt,
        verifiedAtShamsi
      };
    }

    let titleMatch = false;
    let adIdMatch = false;
    let score = 0;

    // 3. Match Ad ID if available
    if (req.adId) {
      if (req.adUrl.includes(req.adId) || (req.htmlContent && req.htmlContent.includes(req.adId))) {
        adIdMatch = true;
        score += 40;
        reasons.push(`شناسه آگهی (${req.adId}) با ساختار صفحه عمومی تطبیق دارد.`);
      } else {
        reasons.push(`شناسه آگهی (${req.adId}) در صفحه یا آدرس URL یافت نشد.`);
      }
    }

    // 4. Match Page Content / Title
    if (req.htmlContent && req.expectedTitle) {
      // Extract title from HTML or meta tags
      const titleTagMatch = req.htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
      const h1TagMatch = req.htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const extractedTitle = (h1TagMatch ? h1TagMatch[1] : (titleTagMatch ? titleTagMatch[1] : '')).trim();

      const similarity = this.calculateTitleSimilarity(req.expectedTitle, extractedTitle || req.htmlContent);

      if (similarity >= 60) {
        titleMatch = true;
        score += 60;
        reasons.push(`تطبیق معنایی عنوان (${Math.round(similarity)}%) با عنوان واقعی کمپین تأیید شد.`);
      } else {
        reasons.push(`تطبیق عنوان ناکافی است (${Math.round(similarity)}% شباهت با «${req.expectedTitle}»).`);
      }
    } else {
      reasons.push('محتوای DOM صفحه عمومی جهت بررسی دقیق عنوان ارائه نشده است.');
    }

    // Strict acceptance criteria: Must have both high score and either titleMatch or adIdMatch
    if (score >= 80 && (titleMatch && adIdMatch)) {
      reasons.push('تأییدیه کامل با احراز همزمان شناسه، عنوان و لینک عمومی صادر گردید.');
      return {
        status: 'PUBLISHED',
        adUrl: req.adUrl,
        adId: req.adId,
        titleMatch,
        adIdMatch,
        verificationScore: score,
        evidenceReasons: reasons,
        verifiedAt,
        verifiedAtShamsi
      };
    }

    // If HTTP returned 200 or generic word found but not strict match: Mark as UNKNOWN
    reasons.push('شواهد برای ثبت قطعی وضعیت PUBLISHED کافی نیست؛ وضعیت روی UNKNOWN تثبیت شد.');
    return {
      status: 'UNKNOWN',
      adUrl: req.adUrl,
      adId: req.adId,
      titleMatch,
      adIdMatch,
      verificationScore: score,
      evidenceReasons: reasons,
      verifiedAt,
      verifiedAtShamsi
    };
  }
}
