import { AGENT_CONFIG } from '../config';
import { logger } from '../utils/logger';
import { RateLimiter, withRetry } from '../utils/retry';

const limiter = new RateLimiter(AGENT_CONFIG.online.requestDelayMs);

export interface SearchNotifyResult {
  indexNow: { attempted: boolean; ok: boolean; status?: number; message: string };
  googleSearchConsole: { attempted: boolean; ok: boolean; status?: number; message: string };
}

/**
 * Notifies Bing, Yandex, Naver, Seznam and Yep simultaneously via IndexNow protocol.
 */
export async function submitToIndexNow(changedUrls: string[]): Promise<SearchNotifyResult['indexNow']> {
  const key = AGENT_CONFIG.online.indexNowKey;
  if (!key) {
    return {
      attempted: false,
      ok: false,
      message: 'کلید INDEXNOW_KEY تنظیم نشده است (برای فعال‌سازی در .env یا GitHub Secrets مقداردهی کنید).',
    };
  }
  if (!changedUrls.length) {
    return { attempted: false, ok: false, message: 'لینکی برای ارسال وجود ندارد.' };
  }

  const host = new URL(AGENT_CONFIG.site.baseUrl).host;
  await limiter.waitTurn();

  try {
    const status = await withRetry(
      async () => {
        const res = await fetch('https://api.indexnow.org/indexnow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          signal: AbortSignal.timeout(15_000),
          body: JSON.stringify({
            host,
            key,
            keyLocation: `${AGENT_CONFIG.site.baseUrl}/${key}.txt`,
            urlList: changedUrls.slice(0, 100),
          }),
        });
        if (!res.ok && res.status !== 202) {
          throw new Error(`IndexNow HTTP ${res.status}: ${await res.text()}`);
        }
        return res.status;
      },
      { retries: 2, baseDelayMs: 2000, label: 'IndexNow' }
    );

    logger.info('SearchNotifier', `IndexNow notified for ${changedUrls.length} URLs (HTTP ${status})`);
    return {
      attempted: true,
      ok: true,
      status,
      message: `${changedUrls.length} آدرس با موفقیت به شبکه IndexNow (Bing / Yandex) ارسال شد.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('SearchNotifier', 'IndexNow notification failed', { message });
    return { attempted: true, ok: false, message };
  }
}

/**
 * Submits sitemap.xml to Google Search Console API when an OAuth access token is supplied.
 */
export async function submitSitemapToGsc(): Promise<SearchNotifyResult['googleSearchConsole']> {
  const token = AGENT_CONFIG.online.gscAccessToken;
  if (!token) {
    return {
      attempted: false,
      ok: false,
      message: 'توکن GSC_ACCESS_TOKEN تنظیم نشده است (گوگل از طریق دستور Sitemap در robots.txt نیز نقشه سایت را می‌خواند).',
    };
  }

  const siteUrl = encodeURIComponent(AGENT_CONFIG.online.gscSiteUrl);
  const feedpath = encodeURIComponent(`${AGENT_CONFIG.site.baseUrl}/sitemap.xml`);
  await limiter.waitTurn();

  try {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/sitemaps/${feedpath}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!res.ok) {
      throw new Error(`GSC HTTP ${res.status}: ${await res.text()}`);
    }
    return {
      attempted: true,
      ok: true,
      status: res.status,
      message: 'نقشه سایت با موفقیت در Google Search Console ثبت شد.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { attempted: true, ok: false, message };
  }
}

export async function notifySearchEngines(urls: string[]): Promise<SearchNotifyResult> {
  const indexNow = await submitToIndexNow(urls);
  const googleSearchConsole = await submitSitemapToGsc();
  return { indexNow, googleSearchConsole };
}
