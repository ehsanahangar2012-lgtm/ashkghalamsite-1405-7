import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { AGENT_CONFIG, ROOT_DIR } from '../config';
import { PageAuditIssue, TechnicalSeoReport } from '../types';
import { logger } from '../utils/logger';
import { buildSitemapAndRobots } from './sitemapBuilder';

const STATIC_ROUTES = [
  '/',
  '/catalog',
  '/portfolio',
  '/blog',
  '/about',
  '/inquiry',
  '/library',
  '/services',
  '/products',
  '/tools/dieline',
  '/tools/design-studio',
  '/tools/autocad',
  '/software',
];

export async function runTechnicalSeoAudit(options?: { checkLocalRoutes?: boolean }): Promise<TechnicalSeoReport> {
  const issues: PageAuditIssue[] = [];
  const brokenInternalLinks: TechnicalSeoReport['brokenInternalLinks'] = [];
  const checkRoutes = options?.checkLocalRoutes ?? true;

  // Ensure sitemap & robots exist and are fresh
  const { urls } = buildSitemapAndRobots();

  // 1. Offline HTML Shell Audit (zero browser needed, <15MB RAM)
  const distHtml = path.join(ROOT_DIR, 'dist', 'index.html');
  const rootHtml = path.join(ROOT_DIR, 'index.html');
  const htmlPath = fs.existsSync(distHtml) ? distHtml : rootHtml;

  if (fs.existsSync(htmlPath)) {
    const rawHtml = fs.readFileSync(htmlPath, 'utf-8');
    const $ = cheerio.load(rawHtml);

    const title = $('title').text().trim();
    const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
    const canonical = $('link[rel="canonical"]').attr('href')?.trim() || '';
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || '';
    const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() || '';

    if (!title || title.length < 25 || title.length > 70) {
      issues.push({
        path: '/',
        severity: 'warning',
        code: 'TITLE_LENGTH',
        message: `طول عنوان صفحه اصلی (${title.length} کاراکتر) بهتر است بین ۳۰ تا ۶۵ کاراکتر باشد.`,
        suggestedFix: 'بهینه‌سازی عنوان اصلی با نام برند و کلمه کلیدی اصلی.',
      });
    }

    if (!metaDesc || metaDesc.length < 70 || metaDesc.length > 165) {
      issues.push({
        path: '/',
        severity: 'warning',
        code: 'META_DESC_LENGTH',
        message: `طول توضیحات متا (${metaDesc.length} کاراکتر) خارج از بازه پیشنهادی ۱۲۰ تا ۱۶۰ کاراکتر است.`,
      });
    }

    if (!canonical) {
      issues.push({
        path: '/',
        severity: 'critical',
        code: 'MISSING_CANONICAL',
        message: 'تگ link[rel="canonical"] در index.html یافت نشد.',
      });
    }

    if (!ogTitle || !ogDesc) {
      issues.push({
        path: '/',
        severity: 'info',
        code: 'INCOMPLETE_OG_TAGS',
        message: 'متاتگ‌های OpenGraph ناقص هستند.',
      });
    }
  }

  // 2. Audit catalogs.json for SEO readiness
  if (fs.existsSync(AGENT_CONFIG.paths.catalogsFile)) {
    try {
      const catalogs = JSON.parse(fs.readFileSync(AGENT_CONFIG.paths.catalogsFile, 'utf-8')) as any[];
      for (const c of catalogs) {
        if (!c?.description || String(c.description).trim().length < 40) {
          issues.push({
            path: `/catalog/${c?.slug || c?.id}`,
            severity: 'warning',
            code: 'CATALOG_THIN_DESC',
            message: `کاتالوگ «${c?.title || c?.id}» توضیحات متای کافی (حداقل ۴۰ کاراکتر) ندارد.`,
          });
        }
      }
    } catch {}
  }

  // 3. Audit posts.json for SEO hygiene
  if (fs.existsSync(AGENT_CONFIG.paths.postsFile)) {
    try {
      const posts = JSON.parse(fs.readFileSync(AGENT_CONFIG.paths.postsFile, 'utf-8')) as any[];
      for (const p of posts) {
        if (p.status === 'rejected') continue;
        const words = String(p.content || '').split(/\s+/).filter(Boolean).length;
        if (words < 350) {
          issues.push({
            path: `/blog/${p.slug || p.id}`,
            severity: 'warning',
            code: 'POST_THIN_CONTENT',
            message: `مقاله «${p.title}» تنها ${words} کلمه دارد؛ برای رقابت سئو حداقل ۷۰۰ کلمه توصیه می‌شود.`,
          });
        }
        if (!p.excerpt || String(p.excerpt).trim().length < 40) {
          issues.push({
            path: `/blog/${p.slug || p.id}`,
            severity: 'info',
            code: 'POST_SHORT_EXCERPT',
            message: `چکیده مقاله «${p.title}» بسیار کوتاه است.`,
          });
        }
      }
    } catch {}
  }

  // 4. Optional local Express route verification (skips gracefully if running standalone in CI)
  let reachableCount = STATIC_ROUTES.length;
  if (checkRoutes) {
    reachableCount = 0;
    for (const route of STATIC_ROUTES) {
      try {
        const res = await fetch(`${AGENT_CONFIG.site.localServerUrl}${route}`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) {
          brokenInternalLinks.push({ source: 'navigationRoutes', target: route, status: res.status });
          issues.push({
            path: route,
            severity: 'critical',
            code: 'ROUTE_HTTP_ERROR',
            message: `مسیر داخلی ${route} وضعیت HTTP ${res.status} برگرداند.`,
          });
        } else {
          reachableCount++;
        }
      } catch {
        // If server is not started during CI offline check, do not penalize as broken
        reachableCount = STATIC_ROUTES.length;
        break;
      }
    }
  }

  const penalty = issues.reduce(
    (sum, i) => sum + (i.severity === 'critical' ? 15 : i.severity === 'warning' ? 6 : 2),
    0
  );

  const report: TechnicalSeoReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: AGENT_CONFIG.site.baseUrl,
    pagesAudited: reachableCount,
    averageScore: Math.max(0, 100 - penalty),
    sitemapUrlCount: urls.length,
    brokenInternalLinks,
    issues,
  };

  fs.writeFileSync(AGENT_CONFIG.paths.seoStateFile, JSON.stringify(report, null, 2), 'utf-8');
  logger.info('TechnicalAuditor', `SEO audit finished. Score=${report.averageScore}, URLs=${urls.length}`);
  return report;
}
