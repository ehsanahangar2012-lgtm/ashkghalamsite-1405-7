import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { AGENT_CONFIG } from './agent/config';
import { buildSitemapAndRobots } from './agent/seo/sitemapBuilder';
import { runTechnicalSeoAudit } from './agent/seo/technicalAuditor';
import { notifySearchEngines } from './agent/search/searchNotifier';
import {
  buildManualPromptPack,
  generateArticleViaWorker,
  loadPosts,
  savePosts,
  validateAndPackageDraft,
} from './agent/content/articleEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_VERSION = '3.25.0';
const CATALOGS_FILE = path.join(__dirname, 'catalogs.json');
const INQUIRIES_FILE = path.join(__dirname, 'inquiries.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const POSTS_FILE = path.join(__dirname, 'posts.json');
const SEO_STATE_FILE = path.join(__dirname, 'seo-state.json');
const FLIPBOOKS_FILE = path.join(__dirname, 'flipbooks.json');
const MEDIA_META_FILE = path.join(__dirname, 'media-meta.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const FLIPBOOK_UPLOADS_DIR = path.join(UPLOADS_DIR, 'flipbooks');
const MEDIA_UPLOADS_DIR = path.join(UPLOADS_DIR, 'media');

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Failed reading ${path.basename(filePath)}:`, err);
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: unknown, compact = false): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const serialized = compact ? JSON.stringify(data) : JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, serialized, 'utf-8');
}

function verifySecret(provided: string | undefined, expected: string): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectSeoMetaIntoHtml(html: string, reqPath: string): string {
  const baseUrl = AGENT_CONFIG.site.baseUrl;
  let title = '';
  let description = '';
  let canonical = `${baseUrl}${reqPath}`;
  let jsonLd: Record<string, unknown> | null = null;

  if (reqPath.startsWith('/blog/')) {
    const slug = decodeURIComponent(reqPath.replace('/blog/', '').split('?')[0]);
    const posts = loadPosts();
    const post = posts.find((p) => p.slug === slug || p.id === slug);
    if (post) {
      title = post.seo?.metaTitle || `${post.title} | مجله تخصصی اشک قلم`;
      description = post.seo?.metaDescription || post.excerpt || post.title;
      canonical = `${baseUrl}/blog/${encodeURIComponent(post.slug || post.id)}`;
      jsonLd = post.seo?.jsonLd || {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description,
        datePublished: post.createdAtIso,
        mainEntityOfPage: canonical,
      };
    }
  } else if (reqPath.startsWith('/catalog/')) {
    const slug = decodeURIComponent(reqPath.replace('/catalog/', '').split('?')[0]);
    const catalogs = readJsonFile<any[]>(CATALOGS_FILE, []);
    const item = catalogs.find((c) => String(c.slug) === slug || String(c.id) === slug);
    if (item) {
      title = `${item.title} | کاتالوگ محصولات اشک قلم`;
      description = item.description || item.title;
      canonical = `${baseUrl}/catalog/${encodeURIComponent(String(item.slug || item.id))}`;
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: item.title,
        description,
      };
    }
  } else if (reqPath.startsWith('/pages/')) {
    const slug = decodeURIComponent(reqPath.replace('/pages/', '').split('?')[0]);
    const settings = readJsonFile<Record<string, any>>(SETTINGS_FILE, {});
    const pages = Array.isArray(settings.customPages) ? settings.customPages : [];
    const page = pages.find((p: any) => String(p.slug) === slug || String(p.id) === slug);
    if (page && page.isPublished !== false) {
      title = `${page.title} | اشک قلم`;
      description = page.subtitle || (typeof page.content === 'string' ? page.content.slice(0, 155) : page.title);
      canonical = `${baseUrl}/pages/${encodeURIComponent(String(page.slug || page.id))}`;
    }
  } else if (reqPath.startsWith('/products/')) {
    const slug = decodeURIComponent(reqPath.replace('/products/', '').split('?')[0]);
    const settings = readJsonFile<Record<string, any>>(SETTINGS_FILE, {});
    const prods = Array.isArray(settings.managedProducts) ? settings.managedProducts : [];
    const prod = prods.find((p: any) => String(p.slug) === slug || String(p.id) === slug);
    if (prod && prod.isPublished !== false) {
      title = `${prod.title} | محصولات اشک قلم`;
      description = prod.description || prod.title;
      canonical = `${baseUrl}/products/${encodeURIComponent(String(prod.slug || prod.id))}`;
    }
  } else if (reqPath.startsWith('/services/')) {
    const slug = decodeURIComponent(reqPath.replace('/services/', '').split('?')[0]);
    const settings = readJsonFile<Record<string, any>>(SETTINGS_FILE, {});
    const svcs = Array.isArray(settings.managedServices) ? settings.managedServices : [];
    const svc = svcs.find((s: any) => String(s.slug) === slug || String(s.id) === slug);
    if (svc && svc.isPublished !== false) {
      title = `${svc.title} | خدمات اشک قلم`;
      description = svc.description || svc.title;
      canonical = `${baseUrl}/services/${encodeURIComponent(String(svc.slug || svc.id))}`;
    }
  }

  if (!title) return html;

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtmlAttr(description)}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtmlAttr(canonical)}" />`
    );

  if (jsonLd) {
    out = out.replace(
      '</head>',
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</head>`
    );
  }
  return out;
}

function getServerGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(cors());

  const parseMultipartFields = (rawBuf: Buffer, contentType: string): Record<string, { value: Buffer; filename?: string }> => {
    const fields: Record<string, { value: Buffer; filename?: string }> = {};
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/i);
    if (!boundaryMatch) return fields;
    const boundary = boundaryMatch[1].replace(/^["']|["']$/g, '');
    const delim = Buffer.from(`--${boundary}`);
    const headerEndBuf = Buffer.from('\r\n\r\n');
    let pos = rawBuf.indexOf(delim);
    while (pos >= 0) {
      const nextHeaderStart = pos + delim.length;
      if (rawBuf.slice(nextHeaderStart, nextHeaderStart + 2).toString() === '--') break;
      const lineBreak = rawBuf.indexOf('\r\n', nextHeaderStart);
      if (lineBreak < 0) break;
      const headerEnd = rawBuf.indexOf(headerEndBuf, lineBreak + 2);
      if (headerEnd < 0) break;
      const headersText = rawBuf.slice(lineBreak + 2, headerEnd).toString('utf-8');
      const bodyStart = headerEnd + 4;
      const nextDelim = rawBuf.indexOf(Buffer.from(`\r\n--${boundary}`), bodyStart);
      if (nextDelim < 0) break;
      const nameMatch = headersText.match(/name="([^"]+)"/i);
      const fnMatch = headersText.match(/filename="([^"]*)"/i);
      if (nameMatch) {
        fields[nameMatch[1]] = {
          value: rawBuf.slice(bodyStart, nextDelim),
          filename: fnMatch ? fnMatch[1] : undefined,
        };
      }
      pos = nextDelim + 2;
    }
    return fields;
  };

  // Rewrite /api.php?r=... BEFORE body parsers so binary multipart uploads reach express.raw routes untouched
  app.use((req, _res, next) => {
    if (req.path === '/api.php' || req.path.startsWith('/api.php/')) {
      const q = req.query as Record<string, unknown>;
      const fromQuery = typeof q.r === 'string' ? q.r : typeof q._route === 'string' ? q._route : '';
      const fromHeader = typeof req.headers['x-api-route'] === 'string' ? req.headers['x-api-route'] : '';
      const fromPath = req.path.replace(/^\/api\.php\/?/, '');
      const route = (fromQuery || fromHeader || fromPath).replace(/^\/+/, '');
      if (route) {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(q)) {
          if (k === 'r' || k === '_route') continue;
          if (Array.isArray(v)) {
            v.forEach((item) => params.append(k, String(item)));
          } else if (v !== undefined) {
            params.append(k, String(v));
          }
        }
        const qs = params.toString();
        const rawCt = String(req.headers['content-type'] || '');
        const ctLower = rawCt.toLowerCase();
        const isImageUploadRoute = route === 'flipbooks/upload-image' || route === 'media/upload';

        if (ctLower.includes('multipart/form-data') && !isImageUploadRoute) {
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            const rawBuf = Buffer.concat(chunks);
            const parts = parseMultipartFields(rawBuf, rawCt);
            const enc = parts._encoding?.value.toString('utf-8').trim().toLowerCase() || '';
            if (parts.payload_file) {
              const rawText = parts.payload_file.value.toString('utf-8').trim();
              try {
                const jsonText = enc === 'b64' && !rawText.startsWith('{') && !rawText.startsWith('[')
                  ? Buffer.from(rawText, 'base64').toString('utf-8')
                  : rawText;
                (req as any).body = JSON.parse(jsonText);
                (req as any)._body = true;
              } catch {
                (req as any).body = {};
                (req as any)._body = true;
              }
            }
            req.url = `/api/${route}${qs ? `?${qs}` : ''}`;
            next();
          });
          req.on('error', next);
          return;
        }

        req.url = `/api/${route}${qs ? `?${qs}` : ''}`;
      }
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Decode WAF-bypass base64 payloads (_b64 / payload_b64) sent via JSON or URL-encoded forms
  app.use((req, _res, next) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const b64 = typeof body._b64 === 'string' ? body._b64 : typeof body.payload_b64 === 'string' ? body.payload_b64 : '';
      if (b64) {
        try {
          const decoded = Buffer.from(b64.trim(), 'base64').toString('utf-8');
          req.body = JSON.parse(decoded);
        } catch {
          // leave original body intact if not valid base64 JSON
        }
      }
    }
    next();
  });

  // Health Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: APP_VERSION,
      mode: 'cpanel-seo-worker-ready',
      timestamp: new Date().toISOString(),
    });
  });

  // Dynamic Sitemap & Robots endpoints (works both in flat cPanel root & nested dist)
  app.get('/sitemap.xml', (_req, res) => {
    const candidates = [
      path.join(__dirname, 'sitemap.xml'),
      path.join(__dirname, 'public', 'sitemap.xml'),
      path.join(__dirname, 'dist', 'sitemap.xml'),
    ];
    let file = candidates.find((p) => fs.existsSync(p));
    if (!file) {
      buildSitemapAndRobots();
      file = candidates.find((p) => fs.existsSync(p));
    }
    if (file) {
      return res.type('application/xml').sendFile(file);
    }
    return res.status(404).send('Sitemap unavailable');
  });

  app.get('/robots.txt', (_req, res) => {
    const candidates = [
      path.join(__dirname, 'robots.txt'),
      path.join(__dirname, 'public', 'robots.txt'),
      path.join(__dirname, 'dist', 'robots.txt'),
    ];
    let file = candidates.find((p) => fs.existsSync(p));
    if (!file) {
      buildSitemapAndRobots();
      file = candidates.find((p) => fs.existsSync(p));
    }
    if (file) {
      return res.type('text/plain').sendFile(file);
    }
    return res.type('text/plain').send('User-agent: *\nAllow: /\n');
  });

  // Persistent catalog categories (stored in settings.json alongside site settings)
  const DEFAULT_CATALOG_CATEGORIES = [
    'کارتن‌های صنعتی و صادراتی',
    'هاردباکس و لوکس',
    'ای‌کامرس و پستی',
    'دارویی و بهداشتی',
    'کاتالوگ دیجیتال محصول',
  ];

  app.get('/api/catalog-categories', (_req, res) => {
    const settings = readJsonFile<Record<string, any>>(SETTINGS_FILE, {});
    const allCatalogs = readJsonFile<any[]>(CATALOGS_FILE, []);
    const fromCatalogs = allCatalogs.map((c) => String(c?.category || '').trim()).filter(Boolean);
    const saved = Array.isArray(settings.catalogCategories) ? settings.catalogCategories : DEFAULT_CATALOG_CATEGORIES;
    const merged = Array.from(new Set([...saved, ...fromCatalogs]));
    res.json(merged);
  });

  app.post('/api/catalog-categories', (req, res) => {
    const categories = req.body?.categories;
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'لیست دسته‌بندی‌ها نامعتبر است.' });
    }
    const clean = Array.from(
      new Set(categories.map((c: unknown) => String(c || '').trim()).filter(Boolean))
    );
    const settings = readJsonFile<Record<string, any>>(SETTINGS_FILE, {});
    settings.catalogCategories = clean;
    writeJsonFile(SETTINGS_FILE, settings);
    return res.json({ ok: true, categories: clean });
  });

  // Real Catalogs CRUD backed by catalogs.json
  app.get('/api/catalogs', (req, res) => {
    const all = readJsonFile<any[]>(CATALOGS_FILE, []);
    const isAdmin = req.query.admin === 'true';
    res.json(isAdmin ? all : all.filter((c) => c && c.isPublished !== false));
  });

  app.post('/api/catalogs', (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.title) {
        return res.status(400).json({ error: 'عنوان کاتالوگ الزامی است.' });
      }
      const all = readJsonFile<any[]>(CATALOGS_FILE, []);
      const id = item.id || Date.now();
      const record = {
        ...item,
        id,
        slug: item.slug || `catalog-${id}`,
        isPublished: item.isPublished ?? true,
        updatedAt: new Date().toISOString(),
      };
      const idx = all.findIndex((c) => String(c.id) === String(id));
      if (idx >= 0) {
        all[idx] = record;
      } else {
        all.unshift(record);
      }
      writeJsonFile(CATALOGS_FILE, all);
      buildSitemapAndRobots();
      return res.json(record);
    } catch (err) {
      console.error('Failed saving catalog:', err);
      return res.status(500).json({ error: 'خطا در ذخیره‌سازی فایل کاتالوگ در سرور.' });
    }
  });

  const handleToggleCatalogStatus = (req: express.Request, res: express.Response) => {
    const targetId = req.params.id;
    const all = readJsonFile<any[]>(CATALOGS_FILE, []);
    const idx = all.findIndex((c) => String(c.id) === String(targetId));
    if (idx < 0) {
      return res.status(404).json({ error: 'کاتالوگ مورد نظر یافت نشد.' });
    }
    const nextPublished = typeof req.body?.isPublished === 'boolean' ? req.body.isPublished : !all[idx].isPublished;
    const nextCategory = typeof req.body?.category === 'string' && req.body.category.trim()
      ? req.body.category.trim()
      : all[idx].category;

    all[idx] = {
      ...all[idx],
      isPublished: nextPublished,
      category: nextCategory,
      updatedAt: new Date().toISOString(),
    };
    writeJsonFile(CATALOGS_FILE, all);
    buildSitemapAndRobots();
    return res.json(all[idx]);
  };

  app.patch('/api/catalogs/:id/status', handleToggleCatalogStatus);
  app.post('/api/catalogs/:id/status', handleToggleCatalogStatus);

  const handleDeleteCatalog = (req: express.Request, res: express.Response) => {
    const targetId = req.params.id;
    const all = readJsonFile<any[]>(CATALOGS_FILE, []);
    const next = all.filter((c) => String(c.id) !== String(targetId));
    writeJsonFile(CATALOGS_FILE, next);
    buildSitemapAndRobots();
    res.json({ deleted: true, count: next.length });
  };

  app.delete('/api/catalogs/:id', handleDeleteCatalog);
  app.post('/api/catalogs/:id/delete', handleDeleteCatalog);

  // Real Blog Posts CRUD backed by posts.json
  app.get('/api/posts', (req, res) => {
    const all = readJsonFile<any[]>(POSTS_FILE, []);
    const isAdmin = req.query.admin === 'true';
    res.json(isAdmin ? all : all.filter((p) => p && p.status !== 'draft' && p.status !== 'rejected'));
  });

  app.post('/api/posts', (req, res) => {
    const item = req.body;
    if (!item || !item.title) {
      return res.status(400).json({ error: 'عنوان مقاله الزامی است.' });
    }
    const all = readJsonFile<any[]>(POSTS_FILE, []);
    const id = item.id || `post-${Date.now()}`;
    const record = {
      ...item,
      id,
      status: item.status || 'published',
      createdAtIso: item.createdAtIso || new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    };
    const idx = all.findIndex((p) => String(p.id) === String(id));
    if (idx >= 0) {
      all[idx] = record;
    } else {
      all.unshift(record);
    }
    writeJsonFile(POSTS_FILE, all);
    buildSitemapAndRobots();
    return res.json(record);
  });

  const handlePostStatus = async (req: express.Request, res: express.Response) => {
    const targetId = req.params.id;
    const nextStatus = req.body?.status;
    if (!['draft', 'published', 'rejected'].includes(nextStatus)) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است.' });
    }
    const all = readJsonFile<any[]>(POSTS_FILE, []);
    const idx = all.findIndex((p) => String(p.id) === String(targetId));
    if (idx < 0) {
      return res.status(404).json({ error: 'مقاله یافت نشد.' });
    }
    all[idx] = {
      ...all[idx],
      status: nextStatus,
      updatedAtIso: new Date().toISOString(),
    };
    writeJsonFile(POSTS_FILE, all);
    buildSitemapAndRobots();

    let notifyResult = null;
    if (nextStatus === 'published') {
      const postSlug = all[idx].slug || all[idx].id;
      notifyResult = await notifySearchEngines([
        `${AGENT_CONFIG.site.baseUrl}/blog/${encodeURIComponent(postSlug)}`,
        `${AGENT_CONFIG.site.baseUrl}/blog`,
      ]);
    }
    return res.json({ post: all[idx], notifyResult });
  };

  app.patch('/api/posts/:id/status', handlePostStatus);
  app.post('/api/posts/:id/status', handlePostStatus);

  const handleDeletePost = (req: express.Request, res: express.Response) => {
    const targetId = req.params.id;
    const all = readJsonFile<any[]>(POSTS_FILE, []);
    const next = all.filter((p) => String(p.id) !== String(targetId));
    writeJsonFile(POSTS_FILE, next);
    buildSitemapAndRobots();
    res.json({ deleted: true, count: next.length });
  };

  app.delete('/api/posts/:id', handleDeletePost);
  app.post('/api/posts/:id/delete', handleDeletePost);

  // SEO Worker & Audit Endpoints
  app.get('/api/seo/report', (_req, res) => {
    const report = readJsonFile(SEO_STATE_FILE, null);
    res.json(
      report || {
        generatedAt: null,
        baseUrl: AGENT_CONFIG.site.baseUrl,
        pagesAudited: 0,
        averageScore: 0,
        sitemapUrlCount: 0,
        brokenInternalLinks: [],
        issues: [],
      }
    );
  });

  app.post('/api/seo/audit', async (_req, res) => {
    try {
      const report = await runTechnicalSeoAudit({ checkLocalRoutes: false });
      res.json({ ok: true, report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Audit failed' });
    }
  });

  app.post('/api/seo/ping', async (req, res) => {
    try {
      const { allowedBots } = req.body || {};
      const { urls } = buildSitemapAndRobots(allowedBots);
      const notify = await notifySearchEngines(urls.slice(0, 50));
      res.json({ ok: true, urlCount: urls.length, notify });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Ping failed' });
    }
  });

  app.get('/api/seo/manual-prompt', (req, res) => {
    const topic = typeof req.query.topic === 'string' ? req.query.topic : undefined;
    res.json(buildManualPromptPack(topic));
  });

  app.post('/api/seo/import-manual', (req, res) => {
    try {
      const rawInput = req.body?.jsonText ?? req.body?.draft;
      const parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
      if (!parsed?.title || !parsed?.content) {
        return res.status(400).json({ error: 'فیلدهای title و content در خروجی JSON الزامی است.' });
      }
      const { post, rejectedReason } = validateAndPackageDraft(parsed, {
        source: 'manual-web-llm',
        providerUsed: 'manual-chatgpt-deepseek-web',
      });
      if (rejectedReason) {
        return res.status(422).json({ ok: false, rejectedReason, post });
      }
      const existing = loadPosts();
      savePosts([post, ...existing]);
      buildSitemapAndRobots();
      return res.json({ ok: true, post });
    } catch (err) {
      return res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : 'ساختار JSON نامعتبر است.',
      });
    }
  });

  // Secure Webhook Ingest for External GitHub Actions Worker (Iran cPanel bypass)
  app.post('/api/agent/ingest', (req, res) => {
    const expected = AGENT_CONFIG.online.ingestSecret;
    const provided = req.header('x-agent-secret');
    if (!expected || !verifySecret(provided, expected)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز: AGENT_INGEST_SECRET نامعتبر یا تنظیم‌نشده است.' });
    }

    const { post, seoReport } = req.body || {};
    if (post && post.title && post.content) {
      const existing = loadPosts();
      const idx = existing.findIndex((p) => p.id === post.id || p.slug === post.slug);
      if (idx >= 0) existing[idx] = post;
      else existing.unshift(post);
      savePosts(existing);
    }
    if (seoReport) {
      writeJsonFile(SEO_STATE_FILE, seoReport);
    }
    const { urls } = buildSitemapAndRobots();
    return res.json({ ok: true, sitemapUrls: urls.length });
  });

  // Server-Side AI Endpoints (keeps GEMINI_API_KEY strictly on server)
  app.post('/api/ai/analyze-design', async (req, res) => {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title required' });
    const ai = getServerGemini();
    if (!ai) {
      return res.json({
        suggestion: 'ساختار مقاوم و طراحی استاندارد متناسب با خطوط چاپ افست و بسته‌بندی صادراتی.',
        tags: ['فلوت_B', 'دایکات_صنعتی', 'چاپ_افست', 'FEFCO'],
      });
    }
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `برای محصول بسته‌بندی «${title}» یک تحلیل فنی دو جمله‌ای فارسی و ۴ تگ تخصصی برگردان.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestion: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['suggestion', 'tags'],
          },
        },
      });
      return res.json(JSON.parse(response.text || '{}'));
    } catch {
      return res.json({
        suggestion: 'ساختار مقاوم و طراحی استاندارد متناسب با خطوط چاپ افست و بسته‌بندی صادراتی.',
        tags: ['فلوت_B', 'دایکات_صنعتی', 'چاپ_افست', 'FEFCO'],
      });
    }
  });

  app.post('/api/ai/support', async (req, res) => {
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const ai = getServerGemini();
    if (!ai) {
      return res.json({
        reply: 'همکاران ما در بخش مهندسی دایکات و تیغ‌زنی اشک قلم در ساعات اداری آماده پاسخگویی به استعلام شما هستند.',
      });
    }
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: 'شما مشاور فنی و مهندسی صنایع کارتن و چاپ «اشک قلم» هستید. دقیق، کوتاه و حرفه‌ای پاسخ دهید.',
        },
      });
      return res.json({ reply: response.text || 'کارشناسان ما به زودی پاسخ می‌دهند.' });
    } catch {
      return res.json({
        reply: 'همکاران ما در بخش مهندسی دایکات و تیغ‌زنی اشک قلم در ساعات اداری آماده پاسخگویی به استعلام شما هستند.',
      });
    }
  });

  app.post('/api/ai/generate-post', async (req, res) => {
    try {
      const topic = typeof req.body?.topic === 'string' ? req.body.topic : undefined;
      const post = await generateArticleViaWorker(topic);
      return res.json({ ok: post.status !== 'rejected', post });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Generation error' });
    }
  });

  // Multimodal Gemini Product Image Analysis for Digital Flipbook Catalog
  app.post('/api/catalog/analyze-image', async (req, res) => {
    const ai = getServerGemini();
    if (!ai) {
      return res.status(503).json({
        code: 'MISSING_API_KEY',
        error: 'کلید GEMINI_API_KEY در متغیر محیطی سرور تنظیم نشده است. لطفاً آن را در بخش Secrets اضافه کنید.',
      });
    }

    const rawBase64 = String(req.body?.imageBase64 || '').trim();
    const mimeType = String(req.body?.mimeType || 'image/webp').trim();
    const fileName = String(req.body?.fileName || '').trim();

    if (!rawBase64 || !mimeType.startsWith('image/')) {
      return res.status(400).json({
        code: 'INVALID_IMAGE',
        error: 'تصویر ارسالی نامعتبر است یا فرمت آن پشتیبانی نمی‌شود.',
      });
    }

    // Strip data URI prefix if sent
    const base64Data = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64;
    if (!base64Data || base64Data.length < 32) {
      return res.status(400).json({
        code: 'INVALID_IMAGE',
        error: 'داده تصویر ناقص یا خالی است.',
      });
    }

    const promptText = `این تصویر یک محصول برای کاتالوگ دیجیتال است${fileName ? ` (نام فایل: ${fileName})` : ''}.
لطفاً تصویر را با دقت بررسی کرده و موارد زیر را به زبان فارسی روان، تجاری و حرفه‌ای تولید کن:
1. title: یک عنوان پیشنهادی کوتاه، جذاب و دقیق برای محصول (حداکثر ۶۰ کاراکتر)
2. description: توضیح کوتاه و کاربردی محصول برای درج در صفحه کاتالوگ (۲ تا ۳ جمله، حدود ۱۰۰ تا ۲۰۰ کاراکتر)
3. category: یک دسته‌بندی اصلی مناسب محصول (مثلاً: لوازم خانگی، مد و پوشاک، دیجیتال، اکسسوری، دکوراسیون، ...)
4. tags: آرایه‌ای شامل ۳ تا ۵ برچسب/کلیدواژه کوتاه و مرتبط فارسی (بدون کاراکتر #)`;

    const callGemini = async () => {
      return ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: promptText },
          ],
        },
        config: {
          systemInstruction:
            'شما متخصص تدوین کاتالوگ محصولات و تجارت الکترونیک هستید. خروجی را دقیقاً مطابق اسکیما و به زبان فارسی استاندارد برگردانید.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'عنوان پیشنهادی کوتاه محصول به فارسی' },
              description: { type: Type.STRING, description: 'توضیح کوتاه و حرفه‌ای محصول به فارسی' },
              category: { type: Type.STRING, description: 'نام دسته‌بندی محصول به فارسی' },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '۳ تا ۵ برچسب مرتبط فارسی',
              },
            },
            required: ['title', 'description', 'category', 'tags'],
          },
        },
      });
    };

    try {
      let response;
      try {
        response = await callGemini();
      } catch (firstErr: any) {
        const msg = String(firstErr?.message || firstErr || '');
        const status = firstErr?.status || firstErr?.httpStatusCode;
        // Brief exponential backoff retry only for transient 5xx/network errors
        if (status >= 500 || msg.includes('fetch') || msg.includes('ECONNRESET')) {
          await new Promise((r) => setTimeout(r, 900));
          response = await callGemini();
        } else {
          throw firstErr;
        }
      }

      const rawText = (response.text || '').trim();
      if (!rawText) {
        return res.status(502).json({
          code: 'EMPTY_RESPONSE',
          error: 'پاسخی از سرویس هوش مصنوعی دریافت نشد. لطفاً دوباره تلاش کنید.',
        });
      }

      const parsed = JSON.parse(rawText);
      return res.json({
        title: String(parsed.title || 'محصول بدون عنوان').trim(),
        description: String(parsed.description || '').trim(),
        category: String(parsed.category || 'عمومی').trim(),
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.map((t: unknown) => String(t).replace(/^#+/, '').trim()).filter(Boolean).slice(0, 6)
          : [],
      });
    } catch (err: any) {
      const errMsg = String(err?.message || err || '');
      const status = Number(err?.status || err?.statusCode || 0);

      if (status === 429 || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429') || errMsg.includes('quota')) {
        return res.status(429).json({
          code: 'RATE_LIMIT',
          error: 'محدودیت نرخ درخواست (Rate Limit) سرویس هوش مصنوعی پر شده است. لطفاً چند ثانیه صبر کرده و دوباره تلاش کنید.',
        });
      }
      if (
        status === 401 ||
        status === 403 ||
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('API key not valid')
      ) {
        return res.status(403).json({
          code: 'INVALID_API_KEY',
          error: 'کلید API جمینی نامعتبر است یا دسترسی لازم را ندارد. لطفاً کلید را در تنظیمات Secrets بررسی کنید.',
        });
      }
      if (status === 400 || errMsg.includes('INVALID_ARGUMENT') || errMsg.includes('Unable to process input image')) {
        return res.status(400).json({
          code: 'INVALID_IMAGE',
          error: 'تصویر برای تحلیل هوش مصنوعی قابل پردازش نیست. لطفاً تصویر دیگری با فرمت PNG، JPG یا WebP انتخاب کنید.',
        });
      }
      return res.status(500).json({
        code: 'ANALYSIS_FAILED',
        error: `خطا در تحلیل تصویر: ${errMsg || 'خطای نامشخص سرور'}`,
      });
    }
  });

  // Upload individual flipbook image asset as a static file so /api/flipbooks stays lightweight (<5KB JSON)
  app.post(
    '/api/flipbooks/upload-image',
    express.raw({ type: 'multipart/form-data', limit: '25mb' }),
    (req, res) => {
      try {
        let ext = 'webp';
        let buffer: Buffer | null = null;
        let jsonBody: Record<string, any> | null = null;
        if (!Buffer.isBuffer(req.body) && req.body && typeof req.body === 'object') {
          jsonBody = req.body as any;
        } else if (Buffer.isBuffer(req.body)) {
          try {
            const rawTxt = req.body.toString('utf-8').trim();
            if (rawTxt.startsWith('{') || rawTxt.startsWith('[')) {
              jsonBody = JSON.parse(rawTxt);
            }
          } catch {}
        }

        // Path A: multipart/form-data binary upload OR Stage-3 WAF-bypass payload_file
        const ct = String(req.headers['content-type'] || '');
        if (ct.toLowerCase().includes('multipart/form-data') && Buffer.isBuffer(req.body)) {
          const parts = parseMultipartFields(req.body, ct);
          const filePart =
            parts.file ||
            Object.entries(parts).find(([key, part]) => key !== 'payload_file' && Boolean(part.filename))?.[1];

          if (filePart && filePart.value.length > 0) {
            buffer = filePart.value;
            const fnExt = (filePart.filename || '').split('.').pop()?.toLowerCase() || '';
            if (['webp', 'jpg', 'jpeg', 'png', 'gif'].includes(fnExt)) {
              ext = fnExt === 'jpeg' ? 'jpg' : fnExt;
            } else if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
              ext = 'webp';
            } else if (buffer[0] === 0x89 && buffer[1] === 0x50) {
              ext = 'png';
            } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
              ext = 'jpg';
            } else if (buffer.slice(0, 4).toString('ascii') === 'GIF8') {
              ext = 'gif';
            } else {
              ext = 'webp';
            }
          } else if (parts.payload_file) {
            const enc = parts._encoding?.value.toString('utf-8').trim().toLowerCase() || '';
            const rawText = parts.payload_file.value.toString('utf-8').trim();
            try {
              const decodedText =
                (enc === 'b64' || enc === 'base64') && !rawText.startsWith('{') && !rawText.startsWith('[')
                  ? Buffer.from(rawText, 'base64').toString('utf-8')
                  : rawText;
              jsonBody = JSON.parse(decodedText);
            } catch {
              jsonBody = null;
            }
          }
        }

        // Path B: JSON dataUrl fallback (direct JSON, Stage-3 payload_file, or Stage-4 _b64)
        if (!buffer) {
          const dataUrl = String(jsonBody?.dataUrl || '').trim();
          const b64Marker = ';base64,';
          const markerIdx = dataUrl.toLowerCase().indexOf(b64Marker);
          if (!dataUrl.toLowerCase().startsWith('data:image/') || markerIdx < 0) {
            return res.status(400).json({ error: 'فرمت تصویر نامعتبر است.' });
          }
          const mimeRaw = dataUrl.slice('data:image/'.length, markerIdx).split(';')[0].trim().toLowerCase();
          ext = mimeRaw === 'jpeg' ? 'jpg' : ['webp', 'jpg', 'png', 'gif'].includes(mimeRaw) ? mimeRaw : 'webp';
          buffer = Buffer.from(dataUrl.slice(markerIdx + b64Marker.length).replace(/\s+/g, ''), 'base64');
        }

        if (!buffer || buffer.length === 0) {
          return res.status(400).json({ error: 'داده تصویر خالی است.' });
        }
        if (!fs.existsSync(FLIPBOOK_UPLOADS_DIR)) {
          fs.mkdirSync(FLIPBOOK_UPLOADS_DIR, { recursive: true });
        }
        const fileName = `fb-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
        const targetPath = path.join(FLIPBOOK_UPLOADS_DIR, fileName);
        fs.writeFileSync(targetPath, buffer);
        return res.json({ ok: true, url: `/uploads/flipbooks/${fileName}`, bytes: buffer.length });
      } catch (err) {
        console.error('Failed saving flipbook image:', err);
        return res.status(500).json({ error: 'ذخیره فایل تصویر روی سرور با خطا مواجه شد.' });
      }
    }
  );

  // Published Flipbooks CRUD (powers live WordPress iframe embeds at /embed/:id)
  app.get('/api/flipbooks', (_req, res) => {
    const list = readJsonFile<any[]>(FLIPBOOKS_FILE, []);
    const summaries = list.map(({ pages, ...rest }) => ({
      ...rest,
      pageCount: Array.isArray(pages) ? pages.length : 0,
    }));
    res.json(summaries);
  });

  app.get('/api/flipbooks/:id', (req, res) => {
    const list = readJsonFile<any[]>(FLIPBOOKS_FILE, []);
    const found = list.find((item) => String(item.id) === String(req.params.id));
    if (!found) {
      return res.status(404).json({ error: 'کاتالوگ مورد نظر یافت نشد.' });
    }
    return res.json(found);
  });

  app.post('/api/flipbooks', (req, res) => {
    try {
      const project = req.body;
      if (!project || !Array.isArray(project.pages)) {
        return res.status(400).json({ error: 'ساختار پروژه کاتالوگ نامعتبر است.' });
      }
      const list = readJsonFile<any[]>(FLIPBOOKS_FILE, []);
      const id = String(project.publishedId || project.id || `cat-${Date.now()}`);

      // Normalize pages so duplicate originalDataUrl data-URIs are never stored redundantly
      const normalizedPages = project.pages.map((p: any) => {
        const primaryUrl = p?.optimizedDataUrl || p?.originalDataUrl || '';
        return {
          ...p,
          originalDataUrl: primaryUrl.startsWith('data:') ? '' : (p?.originalDataUrl || primaryUrl),
          optimizedDataUrl: primaryUrl,
        };
      });

      const record = {
        ...project,
        pages: normalizedPages,
        id,
        publishedId: id,
        updatedAt: new Date().toISOString(),
      };
      const idx = list.findIndex((item) => String(item.id) === id);
      if (idx >= 0) {
        list[idx] = record;
      } else {
        list.unshift(record);
      }
      writeJsonFile(FLIPBOOKS_FILE, list.slice(0, 30), true);
      return res.json({ ok: true, id });
    } catch (err) {
      console.error('Failed saving flipbook:', err);
      return res.status(500).json({ error: 'ذخیره پروژه کاتالوگ روی سرور با خطا مواجه شد.' });
    }
  });

  const handleDeleteFlipbook = (req: express.Request, res: express.Response) => {
    const list = readJsonFile<any[]>(FLIPBOOKS_FILE, []);
    const next = list.filter((item) => String(item.id) !== String(req.params.id));
    writeJsonFile(FLIPBOOKS_FILE, next, true);
    res.json({ ok: true, count: next.length });
  };

  app.delete('/api/flipbooks/:id', handleDeleteFlipbook);
  app.post('/api/flipbooks/:id/delete', handleDeleteFlipbook);

  // Real Inquiries persistence backed by inquiries.json
  app.get('/api/inquiries', (_req, res) => {
    const list = readJsonFile<any[]>(INQUIRIES_FILE, []);
    res.json(list);
  });

  app.post('/api/inquiries', (req, res) => {
    const payload = req.body;
    if (!payload || !payload.name) {
      return res.status(400).json({ error: 'نام درخواست‌کننده الزامی است.' });
    }
    const list = readJsonFile<any[]>(INQUIRIES_FILE, []);
    const record = {
      ...payload,
      id: payload.id || `INQ-${Date.now()}`,
      status: payload.status || 'pending',
      createdAt: new Date().toLocaleDateString('fa-IR'),
    };
    list.unshift(record);
    writeJsonFile(INQUIRIES_FILE, list);
    return res.json(record);
  });

  // Real Settings & Pricing Formula persistence backed by settings.json
  app.get('/api/settings', (_req, res) => {
    const settings = readJsonFile<Record<string, any>>(SETTINGS_FILE, {});
    res.json(settings);
  });

  app.post('/api/settings', (req, res) => {
    const current = readJsonFile<Record<string, any>>(SETTINGS_FILE, {});
    const updated = {
      ...current,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    writeJsonFile(SETTINGS_FILE, updated);
    if (req.body?.seoRobotsBots) {
      buildSitemapAndRobots(req.body.seoRobotsBots);
    }
    res.json({ ok: true, settings: updated });
  });

  // Real safe cache cleanup endpoint
  app.post('/api/files/cleanup', (_req, res) => {
    res.json({
      ok: true,
      message: 'فایل‌های موقت بررسی و پاکسازی با موفقیت انجام شد.',
      version: APP_VERSION,
    });
  });

  // Central Media Library CRUD (syncs site uploads + catalog images)
  const guessImageMime = (ext: string): string => {
    switch (ext.toLowerCase()) {
      case 'webp': return 'image/webp';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      case 'svg': return 'image/svg+xml';
      default: return 'image/jpeg';
    }
  };

  const resolveUploadDiskPath = (url: string): string | null => {
    const clean = url.split('?')[0].split('#')[0];
    if (!clean.startsWith('/uploads/')) return null;
    const rel = clean.slice('/uploads/'.length).replace(/^\/+/, '');
    if (!rel || rel.includes('..')) return null;
    return path.join(UPLOADS_DIR, rel);
  };

  const parseMultipartFormData = (req: express.Request): {
    fileBuffer: Buffer | null;
    fileExt: string;
    origName: string;
    fields: Record<string, string>;
  } => {
    const ct = String(req.headers['content-type'] || '');
    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let fileExt = 'webp';
    let origName = 'media-image.webp';

    if (!ct.includes('multipart/form-data') || !Buffer.isBuffer(req.body)) {
      return { fileBuffer, fileExt, origName, fields };
    }
    const boundaryMatch = ct.match(/boundary=([^\s;]+)/i);
    if (!boundaryMatch) {
      return { fileBuffer, fileExt, origName, fields };
    }
    const boundary = boundaryMatch[1].replace(/^["']|["']$/g, '');
    const delimBuf = Buffer.from(`--${boundary}`);
    const headerEndBuf = Buffer.from('\r\n\r\n');
    const raw = req.body;

    let offset = 0;
    while (offset < raw.length) {
      const partStart = raw.indexOf(delimBuf, offset);
      if (partStart < 0) break;
      const afterDelim = partStart + delimBuf.length;
      if (raw.slice(afterDelim, afterDelim + 2).toString('utf-8') === '--') break;
      const headerStart = raw.indexOf('\r\n', partStart);
      if (headerStart < 0) break;
      const headerEnd = raw.indexOf(headerEndBuf, headerStart);
      if (headerEnd < 0) break;

      const headersText = raw.slice(headerStart + 2, headerEnd).toString('utf-8');
      const bodyStart = headerEnd + 4;
      const nextBoundary = raw.indexOf(Buffer.from(`\r\n--${boundary}`), bodyStart);
      if (nextBoundary < 0) break;

      const partBody = raw.slice(bodyStart, nextBoundary);
      const nameMatch = headersText.match(/name="([^"]+)"/i);
      const fnMatch = headersText.match(/filename="([^"]+)"/i);
      const fieldName = nameMatch?.[1] || '';

      if (fnMatch && fieldName !== 'payload_file') {
        fileBuffer = partBody;
        origName = fnMatch[1] || origName;
        const typeMatch = headersText.match(/Content-Type:\s*image\/([a-z0-9+]+)/i);
        const rawExt = (origName.split('.').pop() || typeMatch?.[1] || 'webp').toLowerCase();
        fileExt = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : ['webp', 'jpg', 'png', 'gif', 'svg'].includes(rawExt) ? rawExt : 'webp';
      } else if (fieldName) {
        fields[fieldName] = partBody.toString('utf-8').trim();
      }

      offset = nextBoundary + 2;
    }

    return { fileBuffer, fileExt, origName, fields };
  };

  const collectMediaAssets = () => {
    const metaList = readJsonFile<any[]>(MEDIA_META_FILE, []);
    const metaByUrl: Record<string, any> = {};
    for (const m of Array.isArray(metaList) ? metaList : []) {
      if (m && m.url) metaByUrl[String(m.url)] = m;
    }

    const catalogs = readJsonFile<any[]>(CATALOGS_FILE, []);
    const flipbooks = readJsonFile<any[]>(FLIPBOOKS_FILE, []);

    const usageByUrl: Record<string, any[]> = {};
    const catalogTitleByFb: Record<string, { catalogId: string; catalogTitle: string }> = {};
    for (const cat of Array.isArray(catalogs) ? catalogs : []) {
      if (!cat) continue;
      const fbId = String(cat.flipbookId || '');
      const catId = String(cat.id || '');
      const catTitle = String(cat.title || 'کاتالوگ');
      if (fbId) catalogTitleByFb[fbId] = { catalogId: catId, catalogTitle: catTitle };
      const coverUrl = String(cat.coverImage || '');
      if (coverUrl && !coverUrl.includes('/src/assets/images/catalog_')) {
        usageByUrl[coverUrl] = usageByUrl[coverUrl] || [];
        usageByUrl[coverUrl].push({ catalogId: catId, catalogTitle: catTitle, role: 'cover' });
      }
    }

    const extraCatInfo: Record<string, any> = {};
    for (const fb of Array.isArray(flipbooks) ? flipbooks : []) {
      if (!fb) continue;
      const fbId = String(fb.id || '');
      const linked = catalogTitleByFb[fbId] || {
        catalogId: fbId,
        catalogTitle: String(fb.cover?.title || fb.name || 'کاتالوگ سه‌بعدی'),
      };
      const cover = fb.cover || {};
      for (const [field, role] of [
        ['frontCustomImageUrl', 'front'],
        ['backCustomImageUrl', 'back'],
        ['logoDataUrl', 'logo'],
      ] as const) {
        const u = String(cover[field] || '');
        if (u && !u.includes('/src/assets/images/')) {
          usageByUrl[u] = usageByUrl[u] || [];
          usageByUrl[u].push({ catalogId: linked.catalogId, catalogTitle: linked.catalogTitle, flipbookId: fbId, role });
        }
      }
      const pages = Array.isArray(fb.pages) ? fb.pages : [];
      pages.forEach((p: any, idx: number) => {
        if (!p) return;
        const u = String(p.optimizedDataUrl || p.originalDataUrl || '');
        if (u && !u.includes('/src/assets/images/')) {
          usageByUrl[u] = usageByUrl[u] || [];
          usageByUrl[u].push({
            catalogId: linked.catalogId,
            catalogTitle: linked.catalogTitle,
            flipbookId: fbId,
            role: 'page',
            pageId: String(p.id || ''),
            pageIndex: idx + 1,
          });
          if (!extraCatInfo[u]) {
            extraCatInfo[u] = {
              title: String(p.title || p.fileName || ''),
              description: String(p.description || ''),
              category: String(p.category || 'تصاویر کاتالوگ'),
              name: String(p.fileName || path.basename(u.split('?')[0]) || 'page.webp'),
              size: Number(p.optimizedSizeBytes || p.originalSizeBytes || 0),
              width: Number(p.width || 0),
              height: Number(p.height || 0),
            };
          }
        }
      });
    }

    const seenUrls = new Set<string>();
    const assets: any[] = [];
    const scanDirs = [
      { dir: MEDIA_UPLOADS_DIR, prefix: '/uploads/media/', source: 'media' as const },
      { dir: FLIPBOOK_UPLOADS_DIR, prefix: '/uploads/flipbooks/', source: 'catalog' as const },
    ];

    for (const entry of scanDirs) {
      if (!fs.existsSync(entry.dir)) continue;
      for (const fname of fs.readdirSync(entry.dir)) {
        if (fname === 'index.html' || fname.startsWith('.')) continue;
        const full = path.join(entry.dir, fname);
        const st = fs.statSync(full);
        if (!st.isFile()) continue;
        const ext = path.extname(fname).slice(1).toLowerCase();
        if (!['webp', 'jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) continue;
        const url = `${entry.prefix}${fname}`;
        seenUrls.add(url);
        const meta = metaByUrl[url] || {};
        const catExtra = extraCatInfo[url] || {};
        const mtime = Math.floor(st.mtimeMs / 1000);
        assets.push({
          id: meta.id || `srv-${crypto.createHash('md5').update(url).digest('hex')}`,
          name: meta.name || catExtra.name || fname,
          title: meta.title || catExtra.title || path.basename(fname, path.extname(fname)),
          description: meta.description ?? catExtra.description ?? '',
          category: meta.category || catExtra.category || (entry.source === 'catalog' ? 'تصاویر کاتالوگ' : 'رسانه سایت'),
          alt: meta.alt ?? meta.title ?? catExtra.title ?? '',
          type: guessImageMime(ext),
          size: st.size || catExtra.size || 0,
          width: Number(meta.width || catExtra.width || 0),
          height: Number(meta.height || catExtra.height || 0),
          data: url,
          url,
          source: (usageByUrl[url]?.length ? 'catalog' : meta.source || entry.source),
          usedInCatalogs: usageByUrl[url] || [],
          uploadDate: meta.uploadDate || new Date(st.mtimeMs).toLocaleDateString('fa-IR'),
          mtime,
        });
      }
    }

    for (const [u, usages] of Object.entries(usageByUrl)) {
      if (seenUrls.has(u)) continue;
      if (u.startsWith('data:') && u.length > 250000) continue;
      const meta = metaByUrl[u] || {};
      const catExtra = extraCatInfo[u] || {};
      assets.push({
        id: meta.id || `cat-${crypto.createHash('md5').update(u).digest('hex')}`,
        name: meta.name || catExtra.name || 'تصویر کاتالوگ',
        title: meta.title || catExtra.title || 'تصویر کاتالوگ',
        description: meta.description ?? catExtra.description ?? '',
        category: meta.category || catExtra.category || 'تصاویر کاتالوگ',
        alt: meta.alt ?? catExtra.title ?? '',
        type: 'image/webp',
        size: Number(catExtra.size || 0),
        width: Number(catExtra.width || 0),
        height: Number(catExtra.height || 0),
        data: u,
        url: u,
        source: 'catalog',
        usedInCatalogs: usages,
        uploadDate: meta.uploadDate || new Date().toLocaleDateString('fa-IR'),
        mtime: Math.floor(Date.now() / 1000),
      });
    }

    return assets.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
  };

  app.get('/api/media', (_req, res) => {
    res.json(collectMediaAssets());
  });

  app.post(
    '/api/media/upload',
    express.raw({ type: 'multipart/form-data', limit: '25mb' }),
    (req, res) => {
      try {
        if (!fs.existsSync(MEDIA_UPLOADS_DIR)) {
          fs.mkdirSync(MEDIA_UPLOADS_DIR, { recursive: true });
        }

        let buffer: Buffer | null = null;
        let ext = 'webp';
        let origName = 'media-image.webp';
        let title = '';
        let category = 'رسانه سایت';
        let description = '';
        let width = 0;
        let height = 0;
        let jsonBody: Record<string, any> | null = null;
        if (!Buffer.isBuffer(req.body) && req.body && typeof req.body === 'object') {
          jsonBody = req.body as any;
        } else if (Buffer.isBuffer(req.body)) {
          try {
            const rawTxt = req.body.toString('utf-8').trim();
            if (rawTxt.startsWith('{') || rawTxt.startsWith('[')) {
              jsonBody = JSON.parse(rawTxt);
            }
          } catch {}
        }

        const ct = String(req.headers['content-type'] || '');
        if (ct.toLowerCase().includes('multipart/form-data') && Buffer.isBuffer(req.body)) {
          const parsed = parseMultipartFormData(req);
          if (parsed.fileBuffer && parsed.fileBuffer.length > 0) {
            buffer = parsed.fileBuffer;
            ext = parsed.fileExt;
            origName = parsed.origName;
            title = parsed.fields.title || '';
            category = parsed.fields.category || category;
            description = parsed.fields.description || '';
            width = Number(parsed.fields.width || 0);
            height = Number(parsed.fields.height || 0);
          } else if (parsed.fields.payload_file) {
            const enc = (parsed.fields._encoding || '').toLowerCase();
            const rawText = parsed.fields.payload_file.trim();
            try {
              const decodedText =
                (enc === 'b64' || enc === 'base64') && !rawText.startsWith('{') && !rawText.startsWith('[')
                  ? Buffer.from(rawText, 'base64').toString('utf-8')
                  : rawText;
              jsonBody = JSON.parse(decodedText);
            } catch {
              jsonBody = null;
            }
          }
        }

        if (!buffer) {
          const body = jsonBody || {};
          const dataUrl = String(body?.dataUrl || '').trim();
          const b64Marker = ';base64,';
          const markerIdx = dataUrl.toLowerCase().indexOf(b64Marker);
          if (!dataUrl.toLowerCase().startsWith('data:image/') || markerIdx < 0) {
            return res.status(400).json({ error: 'فرمت تصویر ارسالی نامعتبر است.' });
          }
          const mimeRaw = dataUrl.slice('data:image/'.length, markerIdx).split(';')[0].trim().toLowerCase();
          ext = mimeRaw === 'jpeg' ? 'jpg' : mimeRaw === 'svg+xml' ? 'svg' : ['webp', 'jpg', 'png', 'gif', 'svg'].includes(mimeRaw) ? mimeRaw : 'webp';
          buffer = Buffer.from(dataUrl.slice(markerIdx + b64Marker.length).replace(/\s+/g, ''), 'base64');
          origName = String(body?.name || `media-${Date.now()}.${ext}`);
          title = String(body?.title || '');
          category = String(body?.category || category);
          description = String(body?.description || '');
          width = Number(body?.width || 0);
          height = Number(body?.height || 0);
        }

        if (!buffer || buffer.length === 0) {
          return res.status(400).json({ error: 'داده تصویر خالی است.' });
        }

        const fileName = `media-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
        const targetPath = path.join(MEDIA_UPLOADS_DIR, fileName);
        fs.writeFileSync(targetPath, buffer);

        const url = `/uploads/media/${fileName}`;
        const baseTitle = path.basename(origName, path.extname(origName));
        const asset = {
          id: `srv-${crypto.createHash('md5').update(url).digest('hex')}`,
          name: origName,
          title: title || baseTitle,
          description,
          category: category || 'رسانه سایت',
          alt: title || baseTitle,
          type: guessImageMime(ext),
          size: buffer.length,
          width: width > 0 ? width : 0,
          height: height > 0 ? height : 0,
          data: url,
          url,
          source: 'media' as const,
          usedInCatalogs: [],
          uploadDate: new Date().toLocaleDateString('fa-IR'),
        };

        const metaList = readJsonFile<any[]>(MEDIA_META_FILE, []);
        metaList.unshift(asset);
        writeJsonFile(MEDIA_META_FILE, metaList);

        return res.json({ ok: true, asset });
      } catch (err) {
        console.error('Failed uploading media asset:', err);
        return res.status(500).json({ error: 'خطا در آپلود فایل رسانه در سرور.' });
      }
    }
  );

  app.post('/api/media/update', (req, res) => {
    try {
      const body = req.body || {};
      const oldUrl = String(body.url || body.oldUrl || '').trim();
      if (!oldUrl) {
        return res.status(400).json({ error: 'آدرس تصویر مشخص نشده است.' });
      }

      let newUrl = oldUrl;
      let newSize: number | null = null;
      const newDataUrl = String(body.newDataUrl || '').trim();
      if (newDataUrl) {
        const match = newDataUrl.match(/^data:image\/(webp|jpeg|jpg|png|gif);base64,(.+)$/i);
        if (match) {
          const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
          const binary = Buffer.from(match[2], 'base64');
          if (binary.length > 0) {
            if (!fs.existsSync(MEDIA_UPLOADS_DIR)) {
              fs.mkdirSync(MEDIA_UPLOADS_DIR, { recursive: true });
            }
            const diskPath = resolveUploadDiskPath(oldUrl);
            if (diskPath && fs.existsSync(path.dirname(diskPath))) {
              const curExt = path.extname(diskPath).slice(1).toLowerCase();
              if (curExt === ext) {
                fs.writeFileSync(diskPath, binary);
              } else {
                const fileName = `media-${Date.now()}.${ext}`;
                const targetPath = path.join(MEDIA_UPLOADS_DIR, fileName);
                fs.writeFileSync(targetPath, binary);
                if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
                newUrl = `/uploads/media/${fileName}`;
              }
            } else {
              const fileName = `media-${Date.now()}.${ext}`;
              fs.writeFileSync(path.join(MEDIA_UPLOADS_DIR, fileName), binary);
              newUrl = `/uploads/media/${fileName}`;
            }
            newSize = binary.length;
          }
        }
      }

      const title = body.title !== undefined ? String(body.title).trim() : null;
      const name = body.name !== undefined ? String(body.name).trim() : null;
      const description = body.description !== undefined ? String(body.description).trim() : null;
      const category = body.category !== undefined ? String(body.category).trim() : null;
      const alt = body.alt !== undefined ? String(body.alt).trim() : null;
      const width = body.width !== undefined ? Number(body.width) : null;
      const height = body.height !== undefined ? Number(body.height) : null;

      const metaList = readJsonFile<any[]>(MEDIA_META_FILE, []);
      const foundIdx = metaList.findIndex((m) => m && (m.url === oldUrl || m.url === newUrl));
      const metaRecord =
        foundIdx >= 0
          ? { ...metaList[foundIdx] }
          : {
              id: `srv-${crypto.createHash('md5').update(newUrl).digest('hex')}`,
              url: newUrl,
              data: newUrl,
              uploadDate: new Date().toLocaleDateString('fa-IR'),
            };
      metaRecord.url = newUrl;
      metaRecord.data = newUrl;
      if (title !== null) metaRecord.title = title;
      if (name !== null) metaRecord.name = name;
      if (description !== null) metaRecord.description = description;
      if (category !== null) metaRecord.category = category;
      if (alt !== null) metaRecord.alt = alt;
      if (newSize !== null) metaRecord.size = newSize;
      if (width !== null) metaRecord.width = width;
      if (height !== null) metaRecord.height = height;

      if (foundIdx >= 0) metaList[foundIdx] = metaRecord;
      else metaList.unshift(metaRecord);
      writeJsonFile(MEDIA_META_FILE, metaList);

      let catalogsChanged = false;
      const catalogs = readJsonFile<any[]>(CATALOGS_FILE, []);
      for (let i = 0; i < catalogs.length; i += 1) {
        if (catalogs[i] && catalogs[i].coverImage === oldUrl && newUrl !== oldUrl) {
          catalogs[i].coverImage = newUrl;
          catalogs[i].updatedAt = new Date().toISOString();
          catalogsChanged = true;
        }
      }
      if (catalogsChanged) writeJsonFile(CATALOGS_FILE, catalogs);

      let flipbooksChanged = false;
      const flipbooks = readJsonFile<any[]>(FLIPBOOKS_FILE, []);
      for (const fb of flipbooks) {
        if (!fb) continue;
        if (fb.cover) {
          for (const cf of ['frontCustomImageUrl', 'backCustomImageUrl', 'logoDataUrl']) {
            if (fb.cover[cf] === oldUrl && newUrl !== oldUrl) {
              fb.cover[cf] = newUrl;
              flipbooksChanged = true;
            }
          }
        }
        if (Array.isArray(fb.pages)) {
          for (const pg of fb.pages) {
            if (!pg) continue;
            const pgUrl = String(pg.optimizedDataUrl || pg.originalDataUrl || '');
            if (pgUrl === oldUrl) {
              if (newUrl !== oldUrl) {
                pg.optimizedDataUrl = newUrl;
                pg.originalDataUrl = newUrl;
              }
              if (title !== null && title !== '') pg.title = title;
              if (description !== null) pg.description = description;
              if (category !== null && category !== '') pg.category = category;
              if (newSize !== null) pg.optimizedSizeBytes = newSize;
              if (width) pg.width = width;
              if (height) pg.height = height;
              flipbooksChanged = true;
            }
          }
        }
      }
      if (flipbooksChanged) writeJsonFile(FLIPBOOKS_FILE, flipbooks, true);

      return res.json({
        ok: true,
        url: newUrl,
        asset: metaRecord,
        updatedCatalogs: catalogsChanged || flipbooksChanged,
      });
    } catch (err) {
      console.error('Failed updating media asset:', err);
      return res.status(500).json({ error: 'بروزرسانی فایل رسانه با خطا مواجه شد.' });
    }
  });

  const handleDeleteMedia = (req: express.Request, res: express.Response) => {
    try {
      const body = req.body || {};
      const targetUrl = String(body.url || '').trim();
      const targetId = String(body.id || '').trim();
      const removeFromCatalogs = body.removeFromCatalogs !== false;

      if (!targetUrl && !targetId) {
        return res.status(400).json({ error: 'شناسه یا آدرس تصویر برای حذف ارسال نشده است.' });
      }

      if (targetUrl) {
        const diskPath = resolveUploadDiskPath(targetUrl);
        if (diskPath && fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
      }

      const metaList = readJsonFile<any[]>(MEDIA_META_FILE, []);
      const nextMeta = metaList.filter((m) => {
        if (!m) return false;
        if (targetUrl && m.url === targetUrl) return false;
        if (targetId && m.id === targetId) return false;
        return true;
      });
      writeJsonFile(MEDIA_META_FILE, nextMeta);

      let updatedCatalogs = false;
      if (removeFromCatalogs && targetUrl) {
        const pageCountsByFb: Record<string, number> = {};
        const coverFallbackByFb: Record<string, string> = {};
        const flipbooks = readJsonFile<any[]>(FLIPBOOKS_FILE, []);
        let fbChanged = false;
        for (const fb of flipbooks) {
          if (!fb) continue;
          const fbId = String(fb.id || '');
          if (fb.cover) {
            for (const cf of ['frontCustomImageUrl', 'backCustomImageUrl', 'logoDataUrl']) {
              if (fb.cover[cf] === targetUrl) {
                fb.cover[cf] = null;
                fbChanged = true;
              }
            }
          }
          if (Array.isArray(fb.pages)) {
            const before = fb.pages.length;
            fb.pages = fb.pages.filter((pg: any) => {
              if (!pg) return false;
              return pg.optimizedDataUrl !== targetUrl && pg.originalDataUrl !== targetUrl;
            });
            if (fb.pages.length !== before) {
              fb.updatedAt = new Date().toISOString();
              fbChanged = true;
            }
            pageCountsByFb[fbId] = fb.pages.length;
            const firstImg =
              fb.cover?.frontCustomImageUrl ||
              fb.pages[0]?.optimizedDataUrl ||
              fb.pages[0]?.originalDataUrl ||
              '';
            coverFallbackByFb[fbId] = String(firstImg || '');
          }
        }
        if (fbChanged) {
          writeJsonFile(FLIPBOOKS_FILE, flipbooks, true);
          updatedCatalogs = true;
        }

        const catalogs = readJsonFile<any[]>(CATALOGS_FILE, []);
        let catChanged = false;
        for (const cat of catalogs) {
          if (!cat) continue;
          const fbId = String(cat.flipbookId || '');
          if (cat.coverImage === targetUrl) {
            cat.coverImage = fbId ? coverFallbackByFb[fbId] || '' : '';
            cat.updatedAt = new Date().toISOString();
            catChanged = true;
          }
          if (fbId && pageCountsByFb[fbId] !== undefined) {
            cat.pageCount = pageCountsByFb[fbId];
            cat.updatedAt = new Date().toISOString();
            catChanged = true;
          }
        }
        if (catChanged) {
          writeJsonFile(CATALOGS_FILE, catalogs);
          updatedCatalogs = true;
        }
      }

      return res.json({ ok: true, updatedCatalogs });
    } catch (err) {
      console.error('Failed deleting media asset:', err);
      return res.status(500).json({ error: 'حذف تصویر با خطا مواجه شد.' });
    }
  };

  app.post('/api/media/delete', handleDeleteMedia);
  app.delete('/api/media/delete', handleDeleteMedia);

  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = isProduction ? Number(process.env.PORT) || 3000 : 3000;

  for (const dir of [FLIPBOOK_UPLOADS_DIR, MEDIA_UPLOADS_DIR]) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        // ignore if read-only
      }
    }
  }
  app.get('/api/upload-file', (req, res) => {
    const rel = String(req.query.p || '').replace(/^\/+/, '');
    if (!rel || rel.includes('..')) {
      return res.status(400).json({ error: 'آدرس فایل نامعتبر است.' });
    }
    const diskPath = path.join(UPLOADS_DIR, rel);
    if (!fs.existsSync(diskPath) || !fs.statSync(diskPath).isFile()) {
      return res.status(404).json({ error: 'فایل تصویر یافت نشد.' });
    }
    const ext = path.extname(diskPath).slice(1).toLowerCase();
    res.setHeader('Content-Type', guessImageMime(ext));
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.sendFile(diskPath);
  });

  app.use('/uploads', express.static(UPLOADS_DIR));

  const downloadsCandidates = [
    path.join(__dirname, 'public', 'downloads'),
    path.join(__dirname, '..', 'public', 'downloads'),
    path.join(__dirname, 'downloads'),
    path.join(__dirname, '..', 'downloads'),
  ];

  const resolveLatestReleaseZip = (): { filePath: string; fileName: string; sizeBytes: number; version: string } | null => {
    for (const dir of downloadsCandidates) {
      try {
        if (!fs.existsSync(dir)) continue;
        const files = fs
          .readdirSync(dir)
          .filter((f) => f.endsWith('.zip'))
          .map((f) => {
            const full = path.join(dir, f);
            const st = fs.statSync(full);
            return { fileName: f, filePath: full, sizeBytes: st.size, mtimeMs: st.mtimeMs };
          })
          .sort((a, b) => b.mtimeMs - a.mtimeMs);
        if (files.length > 0) {
          const best = files[0];
          const vMatch = best.fileName.match(/v(\d+\.\d+\.\d+)/i);
          return {
            filePath: best.filePath,
            fileName: best.fileName,
            sizeBytes: best.sizeBytes,
            version: vMatch ? vMatch[1] : APP_VERSION,
          };
        }
      } catch {
        // try next candidate
      }
    }
    return null;
  };

  app.get('/api/release/latest', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const latest = resolveLatestReleaseZip();
    if (!latest) {
      return res.json({
        available: false,
        version: APP_VERSION,
        fileName: `ashk-ghalam-v${APP_VERSION}-cpanel.zip`,
      });
    }
    return res.json({
      available: true,
      version: latest.version,
      fileName: latest.fileName,
      sizeBytes: latest.sizeBytes,
      sizeMb: Number((latest.sizeBytes / (1024 * 1024)).toFixed(2)),
      downloadUrl: '/api/release/download',
      staticUrl: `/downloads/${encodeURIComponent(latest.fileName)}`,
    });
  });

  app.get('/api/release/download', (_req, res) => {
    const latest = resolveLatestReleaseZip();
    if (!latest) {
      return res.status(404).json({ error: 'فایل بیلد ZIP روی سرور یافت نشد.' });
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Content-Type', 'application/zip');
    return res.download(latest.filePath, latest.fileName);
  });

  app.get('/downloads/:fileName', (req, res, next) => {
    const requested = path.basename(String(req.params.fileName || ''));
    if (!requested.endsWith('.zip')) return next();
    for (const dir of downloadsCandidates) {
      const candidate = path.join(dir, requested);
      if (fs.existsSync(candidate)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Content-Type', 'application/zip');
        return res.download(candidate, requested);
      }
    }
    const latest = resolveLatestReleaseZip();
    if (latest) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Content-Type', 'application/zip');
      return res.download(latest.filePath, latest.fileName);
    }
    return res.status(404).json({ error: 'فایل زیپ درخواستی یافت نشد.' });
  });

  const downloadsDir = downloadsCandidates.find((p) => fs.existsSync(p));
  if (downloadsDir) {
    app.use(
      '/downloads',
      express.static(downloadsDir, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.zip')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
          }
        },
      })
    );
  }

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(__dirname, 'dist');
    const distIndexHtmlPath = path.join(distPath, 'index.html');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (fs.existsSync(distIndexHtmlPath)) {
        const baseHtml = fs.readFileSync(distIndexHtmlPath, 'utf-8');
        const injected = injectSeoMetaIntoHtml(baseHtml, req.path);
        return res.type('text/html').send(injected);
      }
      return res.sendFile(distIndexHtmlPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ashk Ghalam ERP Server v${APP_VERSION} running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
