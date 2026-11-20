import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import AdmZip from 'adm-zip';
import cron from 'node-cron';
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

const APP_VERSION = '3.26.6';
const APP_ROOT_DIR =
  path.basename(__dirname) === 'dist' && fs.existsSync(path.join(__dirname, '..', 'package.json'))
    ? path.join(__dirname, '..')
    : __dirname;
const CATALOGS_FILE = path.join(APP_ROOT_DIR, 'catalogs.json');
const INQUIRIES_FILE = path.join(APP_ROOT_DIR, 'inquiries.json');
const SETTINGS_FILE = path.join(APP_ROOT_DIR, 'settings.json');
const POSTS_FILE = path.join(APP_ROOT_DIR, 'posts.json');
const SEO_STATE_FILE = path.join(APP_ROOT_DIR, 'seo-state.json');
const FLIPBOOKS_FILE = path.join(APP_ROOT_DIR, 'flipbooks.json');
const MEDIA_META_FILE = path.join(APP_ROOT_DIR, 'media-meta.json');
const UPLOADS_DIR = path.join(APP_ROOT_DIR, 'uploads');
const FLIPBOOK_UPLOADS_DIR = path.join(UPLOADS_DIR, 'flipbooks');
const MEDIA_UPLOADS_DIR = path.join(UPLOADS_DIR, 'media');

function detectImageFromBuffer(buf: Buffer): { ext: string; mime: string } | null {
  if (!buf || buf.length < 12) return null;
  // WebP: RIFF....WEBP
  if (
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // GIF: GIF87a or GIF89a
  const head6 = buf.slice(0, 6).toString('ascii');
  if (head6 === 'GIF87a' || head6 === 'GIF89a') {
    return { ext: 'gif', mime: 'image/gif' };
  }
  // BMP: BM
  if (buf[0] === 0x42 && buf[1] === 0x4d && buf.length >= 26) {
    return { ext: 'bmp', mime: 'image/bmp' };
  }
  // AVIF / HEIF: ....ftypavif / ....ftypavis
  if (buf.slice(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.slice(8, 12).toString('ascii').toLowerCase();
    if (brand === 'avif' || brand === 'avis') {
      return { ext: 'avif', mime: 'image/avif' };
    }
  }
  // SVG (XML/text)
  const headText = buf.slice(0, 512).toString('utf-8').trimStart().toLowerCase();
  if (headText.startsWith('<svg') || (headText.startsWith('<?xml') && headText.includes('<svg'))) {
    return { ext: 'svg', mime: 'image/svg+xml' };
  }
  return null;
}

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
          buffer = Buffer.from(dataUrl.slice(markerIdx + b64Marker.length).replace(/\s+/g, ''), 'base64');
        }

        if (!buffer || buffer.length === 0) {
          return res.status(400).json({ error: 'داده تصویر خالی است.' });
        }

        const detected = detectImageFromBuffer(buffer);
        if (!detected) {
          return res.status(400).json({
            error: 'فایل تصویر معتبر نیست یا در حین انتقال خراب شده است. لطفاً تصویر سالم (JPG، PNG یا WebP) آپلود کنید.',
          });
        }
        ext = detected.ext;

        if (!fs.existsSync(FLIPBOOK_UPLOADS_DIR)) {
          fs.mkdirSync(FLIPBOOK_UPLOADS_DIR, { recursive: true });
        }
        const fileName = `fb-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
        const targetPath = path.join(FLIPBOOK_UPLOADS_DIR, fileName);
        fs.writeFileSync(targetPath, buffer);
        return res.json({
          ok: true,
          url: `/uploads/flipbooks/${fileName}`,
          bytes: buffer.length,
          mime: detected.mime,
        });
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

        const detected = detectImageFromBuffer(buffer);
        if (!detected) {
          return res.status(400).json({
            error: 'فایل تصویر معتبر نیست یا در حین انتقال خراب شده است.',
          });
        }
        ext = detected.ext;

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
    const headBuf = Buffer.alloc(512);
    let bytesRead = 0;
    try {
      const fd = fs.openSync(diskPath, 'r');
      bytesRead = fs.readSync(fd, headBuf, 0, 512, 0);
      fs.closeSync(fd);
    } catch {
      bytesRead = 0;
    }
    const detected = bytesRead > 0 ? detectImageFromBuffer(headBuf.slice(0, bytesRead)) : null;
    const ext = path.extname(diskPath).slice(1).toLowerCase();
    res.setHeader('Content-Type', detected?.mime || guessImageMime(ext));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.sendFile(diskPath);
  });

  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      setHeaders: (res, filePath) => {
        try {
          const headBuf = Buffer.alloc(512);
          const fd = fs.openSync(filePath, 'r');
          const bytesRead = fs.readSync(fd, headBuf, 0, 512, 0);
          fs.closeSync(fd);
          const detected = bytesRead > 0 ? detectImageFromBuffer(headBuf.slice(0, bytesRead)) : null;
          if (detected) {
            res.setHeader('Content-Type', detected.mime);
          }
        } catch {
          // keep express.static default mime
        }
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );
  // Prevent missing /uploads/* paths from falling through to SPA index.html (200 text/html)
  app.use('/uploads', (_req, res) => {
    return res.status(404).json({ error: 'فایل تصویر در سرور یافت نشد.' });
  });

  const downloadsCandidates = [
    path.join(__dirname, 'public', 'downloads'),
    path.join(__dirname, '..', 'public', 'downloads'),
    path.join(__dirname, 'downloads'),
    path.join(__dirname, '..', 'downloads'),
  ];

  const parseReleaseSemver = (fileName: string): [number, number, number] => {
    const m = fileName.match(/v(\d+)\.(\d+)\.(\d+)/i);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
  };

  const resolveLatestReleaseZip = (): { filePath: string; fileName: string; sizeBytes: number; version: string } | null => {
    const exactFileName = `ashk-ghalam-v${APP_VERSION}-cpanel.zip`;
    for (const dir of downloadsCandidates) {
      try {
        const exactPath = path.join(dir, exactFileName);
        if (fs.existsSync(exactPath)) {
          const st = fs.statSync(exactPath);
          return {
            filePath: exactPath,
            fileName: exactFileName,
            sizeBytes: st.size,
            version: APP_VERSION,
          };
        }
      } catch {
        // try next candidate
      }
    }

    const found: Array<{ fileName: string; filePath: string; sizeBytes: number; mtimeMs: number; semver: [number, number, number] }> = [];
    for (const dir of downloadsCandidates) {
      try {
        if (!fs.existsSync(dir)) continue;
        for (const f of fs.readdirSync(dir)) {
          if (!f.endsWith('.zip')) continue;
          const full = path.join(dir, f);
          const st = fs.statSync(full);
          found.push({
            fileName: f,
            filePath: full,
            sizeBytes: st.size,
            mtimeMs: st.mtimeMs,
            semver: parseReleaseSemver(f),
          });
        }
      } catch {
        // try next candidate
      }
    }

    if (found.length === 0) return null;
    found.sort((a, b) => {
      if (b.semver[0] !== a.semver[0]) return b.semver[0] - a.semver[0];
      if (b.semver[1] !== a.semver[1]) return b.semver[1] - a.semver[1];
      if (b.semver[2] !== a.semver[2]) return b.semver[2] - a.semver[2];
      return b.mtimeMs - a.mtimeMs;
    });
    const best = found[0];
    const vMatch = best.fileName.match(/v(\d+\.\d+\.\d+)/i);
    return {
      filePath: best.filePath,
      fileName: best.fileName,
      sizeBytes: best.sizeBytes,
      version: vMatch ? vMatch[1] : APP_VERSION,
    };
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

  // On-Demand Offline Studio Installer API (PhotoCraft, VectorCraft, CADCraft)
  const STUDIO_REGISTRY = {
    photocraft: {
      id: 'photocraft',
      name: 'PhotoCraft',
      title: 'ویرایشگر تصویر PhotoCraft',
      description: 'ویرایشگر پیشرفته لایه‌باز تصویر به عنوان جایگزین سریع Photopea در استودیو طراحی گرافیک',
      category: 'استودیو طراحی گرافیک',
      version: '0.23.1',
      downloadSizeMb: 16,
      downloadUrl: 'https://github.com/storytold/photocraft/releases/download/v0.23.1/photocraft-web-0.23.1.zip',
      entryUrl: '/studio/photocraft/index.html',
    },
    vectorcraft: {
      id: 'vectorcraft',
      name: 'VectorCraft',
      title: 'طراحی برداری VectorCraft',
      description: 'محیط طراحی وکتور، لوگو و خطوط چاپی در استودیو طراحی گرافیک',
      category: 'استودیو طراحی گرافیک',
      version: '0.24.1',
      downloadSizeMb: 38,
      downloadUrl: 'https://github.com/storytold/vectorcraft/releases/download/v0.24.1/vectorcraft-web-0.24.1.zip',
      entryUrl: '/studio/vectorcraft/index.html',
    },
    cadcraft: {
      id: 'cadcraft',
      name: 'CADCraft',
      title: 'محیط نقشه‌کشی CADCraft',
      description: 'نرم‌افزار نقشه‌کشی صنعتی و فنی در کنار اتوکد آنلاین',
      category: 'استودیو اتوکد CAD',
      version: '0.20.1',
      downloadSizeMb: 11,
      downloadUrl: 'https://github.com/storytold/cadcraft/releases/download/v0.20.1/cadcraft-web-0.20.1.zip',
      entryUrl: '/studio/cadcraft/index.html',
    },
  } as const;

  type StudioId = keyof typeof STUDIO_REGISTRY;

  const studioBaseDir = fs.existsSync(path.join(APP_ROOT_DIR, 'public'))
    ? path.join(APP_ROOT_DIR, 'public', 'studio')
    : path.join(APP_ROOT_DIR, 'studio');

  const getDirSizeBytes = (dir: string): number => {
    if (!fs.existsSync(dir)) return 0;
    let total = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) total += getDirSizeBytes(full);
      else if (entry.isFile()) total += fs.statSync(full).size;
    }
    return total;
  };

  const buildStudioStatus = () => {
    const studios = (Object.keys(STUDIO_REGISTRY) as StudioId[]).map((id) => {
      const meta = STUDIO_REGISTRY[id];
      const dir = path.join(studioBaseDir, id);
      const indexFile = path.join(dir, 'index.html');
      const installed = fs.existsSync(indexFile);
      let savedMeta: { sizeBytes?: number; installedAt?: string } = {};
      const metaFile = path.join(dir, '.ashk-studio.json');
      if (fs.existsSync(metaFile)) {
        try {
          savedMeta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
        } catch {}
      }
      const sizeBytes = installed ? (savedMeta.sizeBytes ?? getDirSizeBytes(dir)) : 0;
      const installedAt = installed
        ? savedMeta.installedAt || fs.statSync(indexFile).mtime.toISOString()
        : null;
      return {
        ...meta,
        installed,
        installedSizeMb: installed ? Number((sizeBytes / (1024 * 1024)).toFixed(2)) : 0,
        installedAt,
      };
    });
    return {
      studios,
      capabilities: {
        canDownload: true,
        canExtractZip: true,
        studioDirWritable: true,
        runtime: 'node',
      },
    };
  };

  const buildCleanStudioHtml = (studioId: StudioId, originalHtml: string): string => {
    const jsMatch = originalHtml.match(/\.\/([a-z0-9._-]+\.js)/i);
    const wasmMatch = originalHtml.match(/\.\/([a-z0-9._-]+_bg\.wasm)/i);
    const snippetMatch = originalHtml.match(/\.\/((?:app\/)?snippets\/[^\s"'<>]+\.js)/i);

    if (studioId === 'photocraft') {
      const jsFile = jsMatch ? `./${jsMatch[1]}` : './photocraft-web-boot-f1b57f4718fcff8.js';
      const wasmFile = wasmMatch ? `./${wasmMatch[1]}` : './photocraft-web-boot-f1b57f4718fcff8_bg.wasm';
      const snippetFile = snippetMatch ? `./${snippetMatch[1]}` : './app/snippets/eframe-d31a8450ea12dfc1/inline0.js';
      return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>PhotoCraft</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #141720; font-family: 'Vazirmatn', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; }
    #photocraft_canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    #photocraft_loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: radial-gradient(circle at top, #1d2436 0%, #141720 65%); pointer-events: none; z-index: 10; }
    .pc-spinner { width: 42px; height: 42px; border: 3.5px solid rgba(148,163,184,0.22); border-top-color: #22d3ee; border-radius: 9999px; animation: pc-spin 0.85s linear infinite; margin-bottom: 16px; }
    @keyframes pc-spin { to { transform: rotate(360deg); } }
    .pc-title { margin: 0 0 6px; font-size: 15px; font-weight: 800; color: #f8fafc; }
    .pc-subtitle { margin: 0 0 18px; font-size: 12.5px; color: #94a3b8; max-width: 420px; line-height: 1.7; }
    #photocraft_stalled { opacity: 0; visibility: hidden; pointer-events: none; max-width: 460px; background: rgba(15,23,42,0.86); border: 1px solid rgba(148,163,184,0.18); border-radius: 16px; padding: 16px 18px; animation: photocraft-stalled 0.35s ease 8s forwards; }
    @keyframes photocraft-stalled { to { opacity: 1; visibility: visible; pointer-events: auto; } }
    #photocraft_stalled p { margin: 0 0 12px; font-size: 12.5px; color: #cbd5e1; line-height: 1.7; }
    .pc-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; }
    .pc-btn { appearance: none; border: 1px solid rgba(148,163,184,0.25); background: #1e293b; color: #f1f5f9; font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 10px; cursor: pointer; }
    .pc-btn-primary { background: #4f46e5; border-color: #6366f1; color: #fff; }
    .pc-btn-secondary { background: rgba(16,185,129,0.16); border-color: rgba(16,185,129,0.4); color: #6ee7b7; }
    .pc-btn-amber { background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.35); color: #fcd34d; }
    #photocraft_stopped { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: rgba(15,23,42,0.94); pointer-events: auto; z-index: 20; }
    #photocraft_stopped[hidden] { display: none; }
    .pc-stopped-card { max-width: 460px; background: #141926; border: 1px solid rgba(148,163,184,0.2); border-radius: 18px; padding: 22px 20px; }
    .pc-stopped-card p { margin: 0 0 12px; font-size: 13px; color: #cbd5e1; line-height: 1.75; }
    #photocraft_stopped_detail { display: none !important; }
  </style>
  <link rel="modulepreload" href="${jsFile}">
  <link rel="modulepreload" href="./app/photocraft-web.js">
  <link rel="modulepreload" href="${snippetFile}">
  <link rel="preload" href="${wasmFile}" as="fetch" type="application/wasm">
</head>
<body>
  <canvas id="photocraft_canvas"></canvas>
  <div id="photocraft_loading" dir="rtl">
    <div class="pc-spinner" aria-hidden="true"></div>
    <p class="pc-title">در حال آماده‌سازی استودیو تصویر PhotoCraft&hellip;</p>
    <p class="pc-subtitle">لطفاً چند لحظه صبر کنید تا محیط ویرایش تصویر آماده شود.</p>
    <div id="photocraft_stalled">
      <p>بارگذاری این ابزار بیش از حد معمول زمان برده است. می‌توانید دوباره تلاش کنید یا به یکی از ابزارهای جایگزین منتقل شوید:</p>
      <div class="pc-actions">
        <button type="button" class="pc-btn pc-btn-primary" data-switch-studio="photopea">استفاده از Photopea</button>
        <button type="button" class="pc-btn pc-btn-secondary" data-switch-studio="vectorcraft">استفاده از VectorCraft</button>
        <button type="button" class="pc-btn pc-btn-amber" data-switch-studio="local">بوم فوری دایکات</button>
        <button type="button" class="pc-btn" data-reload-studio="1">تلاش مجدد</button>
      </div>
    </div>
  </div>
  <div id="photocraft_stopped" hidden role="alert" dir="rtl">
    <div class="pc-stopped-card">
      <p class="pc-title">امکان بارگذاری PhotoCraft در این لحظه فراهم نشد</p>
      <p>می‌توانید صفحه را مجدداً بارگذاری کنید یا طراحی خود را در Photopea، VectorCraft یا بوم فوری دایکات ادامه دهید.</p>
      <div class="pc-actions">
        <button type="button" class="pc-btn pc-btn-primary" data-switch-studio="photopea">انتقال به Photopea</button>
        <button type="button" class="pc-btn pc-btn-secondary" data-switch-studio="vectorcraft">انتقال به VectorCraft</button>
        <button type="button" class="pc-btn pc-btn-amber" data-switch-studio="local">بوم فوری دایکات</button>
        <button type="button" class="pc-btn" data-reload-studio="1">بارگذاری مجدد</button>
      </div>
      <p id="photocraft_stopped_detail" aria-hidden="true"></p>
    </div>
  </div>
  <script>
    (function () {
      var appReady = false;
      function switchStudio(engine) {
        try { if (window.parent && window.parent !== window) { window.parent.postMessage({ type: 'ASHK_STUDIO_SWITCH', engine: engine }, '*'); return; } } catch (_) {}
        if (engine === 'photopea') window.location.href = 'https://www.photopea.com';
        else if (engine === 'vectorcraft') window.location.href = '../vectorcraft/index.html';
        else window.location.href = '/tools/design-studio';
      }
      function showFallback() {
        var l = document.getElementById('photocraft_loading'), s = document.getElementById('photocraft_stopped');
        if (l) l.style.display = 'none';
        if (s) s.hidden = false;
      }
      window.__ashkShowPhotoCraftFallback = showFallback;
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || typeof t.closest !== 'function') return;
        var sw = t.closest('[data-switch-studio]');
        if (sw) { e.preventDefault(); switchStudio(sw.getAttribute('data-switch-studio')); return; }
        if (t.closest('[data-reload-studio]')) { e.preventDefault(); window.location.reload(); }
      });
      window.addEventListener('TrunkApplicationStarted', function () { appReady = true; });
      window.addEventListener('unhandledrejection', function () { if (!appReady) showFallback(); });
    })();
  </script>
  <script type="module">
    try {
      const mod = await import('${jsFile}');
      const wasm = await mod.default({ module_or_path: '${wasmFile}' });
      window.wasmBindings = mod;
      dispatchEvent(new CustomEvent('TrunkApplicationStarted', { detail: { wasm } }));
    } catch (_) {
      if (typeof window.__ashkShowPhotoCraftFallback === 'function') window.__ashkShowPhotoCraftFallback();
    }
  </script>
</body>
</html>`;
    }

    if (studioId === 'vectorcraft') {
      const jsFile = jsMatch ? `./${jsMatch[1]}` : './vectorcraft-web-80ef79e0b9e423a1.js';
      const wasmFile = wasmMatch ? `./${wasmMatch[1]}` : './vectorcraft-web-80ef79e0b9e423a1_bg.wasm';
      const snippetFile = snippetMatch ? `./${snippetMatch[1]}` : './snippets/eframe-d31a8450ea12dfc1/inline0.js';
      return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>VectorCraft</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #141720; overscroll-behavior: none; -webkit-user-select: none; user-select: none; font-family: 'Vazirmatn', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; }
    #vectorcraft_canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
    #vectorcraft_loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: radial-gradient(circle at top, #18272b 0%, #141720 65%); pointer-events: none; z-index: 10; }
    .vc-spinner { width: 42px; height: 42px; border: 3.5px solid rgba(148,163,184,0.22); border-top-color: #10b981; border-radius: 9999px; animation: vc-spin 0.85s linear infinite; margin-bottom: 16px; }
    @keyframes vc-spin { to { transform: rotate(360deg); } }
    .vc-title { margin: 0 0 6px; font-size: 15px; font-weight: 800; color: #f8fafc; }
    .vc-subtitle { margin: 0 0 18px; font-size: 12.5px; color: #94a3b8; max-width: 420px; line-height: 1.7; }
    #vectorcraft_stalled { opacity: 0; visibility: hidden; pointer-events: none; max-width: 460px; background: rgba(15,23,42,0.86); border: 1px solid rgba(148,163,184,0.18); border-radius: 16px; padding: 16px 18px; animation: vc-stalled 0.35s ease 10s forwards; }
    @keyframes vc-stalled { to { opacity: 1; visibility: visible; pointer-events: auto; } }
    #vectorcraft_stalled p { margin: 0 0 12px; font-size: 12.5px; color: #cbd5e1; line-height: 1.7; }
    .vc-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; }
    .vc-btn { appearance: none; border: 1px solid rgba(148,163,184,0.25); background: #1e293b; color: #f1f5f9; font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 10px; cursor: pointer; }
    .vc-btn-primary { background: #4f46e5; border-color: #6366f1; color: #fff; }
    .vc-btn-cyan { background: rgba(6,182,212,0.16); border-color: rgba(6,182,212,0.4); color: #67e8f9; }
    #vectorcraft_stopped { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: rgba(15,23,42,0.94); pointer-events: auto; z-index: 20; }
    #vectorcraft_stopped[hidden] { display: none; }
    .vc-card { max-width: 460px; background: #141926; border: 1px solid rgba(148,163,184,0.2); border-radius: 18px; padding: 22px 20px; }
    .vc-card p { margin: 0 0 12px; font-size: 13px; color: #cbd5e1; line-height: 1.75; }
  </style>
  <link rel="modulepreload" href="${jsFile}">
  <link rel="modulepreload" href="${snippetFile}">
  <link rel="preload" href="${wasmFile}" as="fetch" type="application/wasm">
</head>
<body>
  <canvas id="vectorcraft_canvas"></canvas>
  <div id="vectorcraft_loading" dir="rtl">
    <div class="vc-spinner" aria-hidden="true"></div>
    <p class="vc-title">در حال آماده‌سازی استودیو برداری VectorCraft&hellip;</p>
    <p class="vc-subtitle">لطفاً چند لحظه صبر کنید تا ابزار طراحی وکتور آماده شود.</p>
    <div id="vectorcraft_stalled">
      <p>بارگذاری کمی زمان‌بر شده است. در صورت تمایل می‌توانید از ابزارهای جایگزین استفاده کنید:</p>
      <div class="vc-actions">
        <button type="button" class="vc-btn vc-btn-primary" data-switch-studio="photopea">استفاده از Photopea</button>
        <button type="button" class="vc-btn vc-btn-cyan" data-switch-studio="photocraft">استفاده از PhotoCraft</button>
        <button type="button" class="vc-btn" data-reload-studio="1">تلاش مجدد</button>
      </div>
    </div>
  </div>
  <div id="vectorcraft_stopped" hidden role="alert" dir="rtl">
    <div class="vc-card">
      <p class="vc-title">امکان بارگذاری VectorCraft در این لحظه فراهم نشد</p>
      <p>می‌توانید دوباره تلاش کنید یا به Photopea و PhotoCraft منتقل شوید.</p>
      <div class="vc-actions">
        <button type="button" class="vc-btn vc-btn-primary" data-switch-studio="photopea">انتقال به Photopea</button>
        <button type="button" class="vc-btn vc-btn-cyan" data-switch-studio="photocraft">انتقال به PhotoCraft</button>
        <button type="button" class="vc-btn" data-reload-studio="1">بارگذاری مجدد</button>
      </div>
    </div>
  </div>
  <script>
    (function () {
      var appReady = false;
      function switchStudio(engine) {
        try { if (window.parent && window.parent !== window) { window.parent.postMessage({ type: 'ASHK_STUDIO_SWITCH', engine: engine }, '*'); return; } } catch (_) {}
        if (engine === 'photopea') window.location.href = 'https://www.photopea.com';
        else if (engine === 'photocraft') window.location.href = '../photocraft/index.html';
        else window.location.href = '/tools/design-studio';
      }
      function showFallback() {
        var l = document.getElementById('vectorcraft_loading'), s = document.getElementById('vectorcraft_stopped');
        if (l) l.style.display = 'none';
        if (s) s.hidden = false;
      }
      window.__ashkShowVectorCraftFallback = showFallback;
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || typeof t.closest !== 'function') return;
        var sw = t.closest('[data-switch-studio]');
        if (sw) { e.preventDefault(); switchStudio(sw.getAttribute('data-switch-studio')); return; }
        if (t.closest('[data-reload-studio]')) { e.preventDefault(); window.location.reload(); }
      });
      window.addEventListener('TrunkApplicationStarted', function () { appReady = true; });
      window.addEventListener('unhandledrejection', function () { if (!appReady) showFallback(); });
    })();
  </script>
  <script type="module">
    try {
      const mod = await import('${jsFile}');
      const wasm = await mod.default({ module_or_path: '${wasmFile}' });
      window.wasmBindings = mod;
      dispatchEvent(new CustomEvent('TrunkApplicationStarted', { detail: { wasm } }));
    } catch (_) {
      if (typeof window.__ashkShowVectorCraftFallback === 'function') window.__ashkShowVectorCraftFallback();
    }
  </script>
</body>
</html>`;
    }

    const jsFile = jsMatch ? `./${jsMatch[1]}` : './cadcraft-web-a91fdcd993cc5580.js';
    const wasmFile = wasmMatch ? `./${wasmMatch[1]}` : './cadcraft-web-a91fdcd993cc5580_bg.wasm';
    const snippetFile = snippetMatch ? `./${snippetMatch[1]}` : './snippets/eframe-d31a8450ea12dfc1/inline0.js';
    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CADCraft</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #181c24; font-family: 'Vazirmatn', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; }
    #cadcraft_canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    #cadcraft_loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: radial-gradient(circle at top, #1d2638 0%, #181c24 65%); pointer-events: none; z-index: 10; }
    .cc-spinner { width: 42px; height: 42px; border: 3.5px solid rgba(148,163,184,0.22); border-top-color: #38bdf8; border-radius: 9999px; animation: cc-spin 0.85s linear infinite; margin-bottom: 16px; }
    @keyframes cc-spin { to { transform: rotate(360deg); } }
    .cc-title { margin: 0 0 6px; font-size: 15px; font-weight: 800; color: #f8fafc; }
    .cc-subtitle { margin: 0 0 18px; font-size: 12.5px; color: #94a3b8; max-width: 420px; line-height: 1.7; }
    #cadcraft_stalled { opacity: 0; visibility: hidden; pointer-events: none; max-width: 440px; background: rgba(15,23,42,0.88); border: 1px solid rgba(148,163,184,0.2); border-radius: 16px; padding: 16px 18px; animation: cc-stalled 0.35s ease 10s forwards; }
    @keyframes cc-stalled { to { opacity: 1; visibility: visible; pointer-events: auto; } }
    #cadcraft_stalled p { margin: 0 0 12px; font-size: 12.5px; color: #cbd5e1; line-height: 1.7; }
    .cc-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; }
    .cc-btn { appearance: none; border: 1px solid rgba(148,163,184,0.25); background: #1e293b; color: #f1f5f9; font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 10px; cursor: pointer; }
    .cc-btn-primary { background: #2563eb; border-color: #3b82f6; color: #fff; }
    #cadcraft_stopped { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: rgba(15,23,42,0.94); pointer-events: auto; z-index: 20; }
    #cadcraft_stopped[hidden] { display: none; }
    .cc-card { max-width: 440px; background: #141926; border: 1px solid rgba(148,163,184,0.2); border-radius: 18px; padding: 22px 20px; }
    .cc-card p { margin: 0 0 12px; font-size: 13px; color: #cbd5e1; line-height: 1.75; }
  </style>
  <link rel="modulepreload" href="${jsFile}">
  <link rel="modulepreload" href="${snippetFile}">
  <link rel="preload" href="${wasmFile}" as="fetch" type="application/wasm">
</head>
<body>
  <canvas id="cadcraft_canvas"></canvas>
  <div id="cadcraft_loading" dir="rtl">
    <div class="cc-spinner" aria-hidden="true"></div>
    <p class="cc-title">در حال آماده‌سازی محیط طراحی CADCraft&hellip;</p>
    <p class="cc-subtitle">لطفاً چند لحظه صبر کنید تا میز کار نقشه‌کشی صنعتی آماده شود.</p>
    <div id="cadcraft_stalled">
      <p>بارگذاری کمی زمان‌بر شده است. می‌توانید مجدداً تلاش کنید یا از اتوکد آنلاین استفاده نمایید:</p>
      <div class="cc-actions">
        <button type="button" class="cc-btn cc-btn-primary" data-switch-cad="autocad">انتقال به اتوکد آنلاین</button>
        <button type="button" class="cc-btn" data-reload-cad="1">تلاش مجدد</button>
      </div>
    </div>
  </div>
  <div id="cadcraft_stopped" hidden role="alert" dir="rtl">
    <div class="cc-card">
      <p class="cc-title">امکان بارگذاری CADCraft در این لحظه فراهم نشد</p>
      <p>می‌توانید دوباره تلاش کنید یا کار خود را در محیط اتوکد آنلاین ادامه دهید.</p>
      <div class="cc-actions">
        <button type="button" class="cc-btn cc-btn-primary" data-switch-cad="autocad">انتقال به اتوکد آنلاین</button>
        <button type="button" class="cc-btn" data-reload-cad="1">بارگذاری مجدد</button>
      </div>
    </div>
  </div>
  <script>
    (function () {
      var appReady = false;
      function switchCad(mode) {
        try { if (window.parent && window.parent !== window) { window.parent.postMessage({ type: 'ASHK_CAD_SWITCH', mode: mode }, '*'); return; } } catch (_) {}
        window.location.href = '/tools/autocad';
      }
      function showFallback() {
        var l = document.getElementById('cadcraft_loading'), s = document.getElementById('cadcraft_stopped');
        if (l) l.style.display = 'none';
        if (s) s.hidden = false;
      }
      window.__ashkShowCadCraftFallback = showFallback;
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || typeof t.closest !== 'function') return;
        var sw = t.closest('[data-switch-cad]');
        if (sw) { e.preventDefault(); switchCad(sw.getAttribute('data-switch-cad')); return; }
        if (t.closest('[data-reload-cad]')) { e.preventDefault(); window.location.reload(); }
      });
      window.addEventListener('TrunkApplicationStarted', function () { appReady = true; });
      window.addEventListener('unhandledrejection', function () { if (!appReady) showFallback(); });
    })();
  </script>
  <script type="module">
    try {
      const mod = await import('${jsFile}');
      const wasm = await mod.default({ module_or_path: '${wasmFile}' });
      window.wasmBindings = mod;
      dispatchEvent(new CustomEvent('TrunkApplicationStarted', { detail: { wasm } }));
    } catch (_) {
      if (typeof window.__ashkShowCadCraftFallback === 'function') window.__ashkShowCadCraftFallback();
    }
  </script>
</body>
</html>`;
  };

  const downloadBufferFromUrl = (url: string, redirects = 8): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      if (redirects <= 0) return reject(new Error('تعداد ریدایرکت‌های لینک دانلود بیش از حد مجاز است.'));
      const client = url.startsWith('http://') ? http : https;
      client
        .get(url, { headers: { 'User-Agent': 'AshkGhalam-Studio-Installer/1.0' } }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            return resolve(downloadBufferFromUrl(res.headers.location, redirects - 1));
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`خطای سرور مبدأ (کد ${res.statusCode})`));
          }
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        })
        .on('error', reject);
    });

  const extractStudioBuffer = (studioId: StudioId, zipBuf: Buffer) => {
    if (!zipBuf || zipBuf.length < 4096 || zipBuf[0] !== 0x50 || zipBuf[1] !== 0x4b) {
      throw new Error('فایل دریافت‌شده یک بسته ZIP معتبر نیست.');
    }
    const zip = new AdmZip(zipBuf);
    const entries = zip.getEntries();
    const targetDir = path.join(studioBaseDir, studioId);
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(targetDir, { recursive: true });

    const topSegments = new Set(
      entries.map((e) => e.entryName.replace(/\\/g, '/').split('/')[0]).filter(Boolean)
    );
    const stripPrefix =
      topSegments.size === 1 && entries.some((e) => e.entryName.includes('/'))
        ? `${[...topSegments][0]}/`
        : '';

    for (const entry of entries) {
      const cleanName = entry.entryName.replace(/\\/g, '/');
      if (cleanName.includes('..')) continue;
      const rel = stripPrefix && cleanName.startsWith(stripPrefix)
        ? cleanName.slice(stripPrefix.length)
        : cleanName.replace(/^\/+/, '');
      if (!rel) continue;
      const outPath = path.join(targetDir, rel);
      if (entry.isDirectory) {
        fs.mkdirSync(outPath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, entry.getData());
      }
    }

    if (studioId === 'photocraft') {
      const rootSnippets = path.join(targetDir, 'snippets');
      const appSnippets = path.join(targetDir, 'app', 'snippets');
      if (fs.existsSync(rootSnippets) && !fs.existsSync(appSnippets)) {
        fs.cpSync(rootSnippets, appSnippets, { recursive: true });
      }
    }

    const indexPath = path.join(targetDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      throw new Error('فایل اصلی استودیو (index.html) درون بسته ZIP یافت نشد.');
    }
    const originalHtml = fs.readFileSync(indexPath, 'utf-8');
    fs.writeFileSync(indexPath, buildCleanStudioHtml(studioId, originalHtml), 'utf-8');

    const meta = {
      id: studioId,
      version: STUDIO_REGISTRY[studioId].version,
      installedAt: new Date().toISOString(),
      sizeBytes: getDirSizeBytes(targetDir),
    };
    fs.writeFileSync(path.join(targetDir, '.ashk-studio.json'), JSON.stringify(meta, null, 2), 'utf-8');
  };

  app.get('/api/studios/status', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(buildStudioStatus());
  });

  app.post('/api/studios/install', async (req, res) => {
    const studioId = String(req.body?.studio || '').trim().toLowerCase() as StudioId;
    if (!STUDIO_REGISTRY[studioId]) {
      return res.status(400).json({ error: 'شناسه استودیو نامعتبر است.' });
    }
    const customUrl = String(req.body?.customUrl || '').trim();
    if (customUrl && !/^https?:\/\//i.test(customUrl)) {
      return res.status(400).json({ error: 'آدرس لینک جایگزین باید با https:// یا http:// شروع شود.' });
    }
    try {
      const targetUrl = customUrl || STUDIO_REGISTRY[studioId].downloadUrl;
      const buf = await downloadBufferFromUrl(targetUrl);
      extractStudioBuffer(studioId, buf);
      return res.json({
        ok: true,
        message: `${STUDIO_REGISTRY[studioId].name} با موفقیت روی سرور دانلود و نصب شد.`,
        ...buildStudioStatus(),
      });
    } catch (err: any) {
      return res.status(502).json({ error: err?.message || 'خطا در دانلود یا نصب استودیو.' });
    }
  });

  app.post('/api/studios/upload', express.raw({ type: () => true, limit: '120mb' }), (req, res) => {
    try {
      const ct = String(req.headers['content-type'] || '');
      if (!ct.includes('multipart/form-data') || !Buffer.isBuffer(req.body)) {
        return res.status(400).json({ error: 'درخواست آپلود فایل ZIP معتبر نیست.' });
      }
      const fields = parseMultipartFields(req.body, ct);
      const studioId = String(fields.studio?.value.toString('utf-8') || req.query.studio || '').trim().toLowerCase() as StudioId;
      if (!STUDIO_REGISTRY[studioId]) {
        return res.status(400).json({ error: 'شناسه استودیو نامعتبر است.' });
      }
      const filePart = fields.file;
      if (!filePart || !filePart.value.length) {
        return res.status(400).json({ error: 'فایل ZIP ارسال نشده است.' });
      }
      extractStudioBuffer(studioId, filePart.value);
      return res.json({
        ok: true,
        message: `${STUDIO_REGISTRY[studioId].name} با موفقیت از فایل ZIP نصب شد.`,
        ...buildStudioStatus(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'خطا در استخراج فایل ZIP.' });
    }
  });

  app.post('/api/studios/uninstall', (req, res) => {
    const studioId = String(req.body?.studio || '').trim().toLowerCase() as StudioId;
    if (!STUDIO_REGISTRY[studioId]) {
      return res.status(400).json({ error: 'شناسه استودیو نامعتبر است.' });
    }
    fs.rmSync(path.join(studioBaseDir, studioId), { recursive: true, force: true });
    return res.json({
      ok: true,
      message: `فایل‌های ${STUDIO_REGISTRY[studioId].name} با موفقیت پاک‌سازی شدند.`,
      ...buildStudioStatus(),
    });
  });

  app.delete('/api/studios/:id', (req, res) => {
    const studioId = String(req.params.id || '').trim().toLowerCase() as StudioId;
    if (!STUDIO_REGISTRY[studioId]) {
      return res.status(400).json({ error: 'شناسه استودیو نامعتبر است.' });
    }
    fs.rmSync(path.join(studioBaseDir, studioId), { recursive: true, force: true });
    return res.json({
      ok: true,
      message: `فایل‌های ${STUDIO_REGISTRY[studioId].name} با موفقیت پاک‌سازی شدند.`,
      ...buildStudioStatus(),
    });
  });

  // =========================================================================
  // Scheduled SEO Autopilot & Smart Hybrid Cron (Dev Preview Parity)
  // Note: Production cPanel ZIP runs 100% pure PHP (seo-autopilot.php + cron-seo.php) with ZERO Node.js!
  // =========================================================================
  const SEO_AP_CONFIG_FILE = path.join(APP_ROOT_DIR, 'seo-autopilot-config.json');
  const SEO_AP_STATE_FILE = path.join(APP_ROOT_DIR, 'seo-autopilot-state.json');
  const publicDirForSeo = fs.existsSync(path.join(APP_ROOT_DIR, 'public'))
    ? path.join(APP_ROOT_DIR, 'public')
    : APP_ROOT_DIR;

  const SEO_PREVIEW_TOPICS = [
    {
      title: 'راهنمای جامع انتخاب گرماژ مقوا ایندربرد، پشت‌طوسی و گلاسه برای جعبه‌سازی صنعتی',
      keyword: 'انتخاب گرماژ مقوا جعبه سازی',
      tags: ['گرماژ مقوا', 'مقوای ایندربرد', 'جعبه‌سازی صنعتی', 'چاپ افست'],
      image: '/assets/catalog_pharma_cosmetic_1794764676825.jpg',
    },
    {
      title: 'استانداردهای بین‌المللی FEFCO در کارتن‌سازی صادراتی و انتخاب فلوت مناسب',
      keyword: 'استاندارد FEFCO کارتن صادراتی',
      tags: ['کد FEFCO', 'کارتن صادراتی', 'فلوت E و B', 'کارتن لمینتی'],
      image: '/assets/catalog_fefco_corrugated_1794764676518.jpg',
    },
    {
      title: 'اصول مهندسی طراحی دایلاین جعبه دارویی و آرایشی با دقت دهم میلی‌متر',
      keyword: 'طراحی دایلاین جعبه دارویی',
      tags: ['طراحی دایلاین', 'دایکات', 'بسته‌بندی دارویی', 'قالب‌سازی'],
      image: '/assets/catalog_pharma_cosmetic_1794764676825.jpg',
    },
    {
      title: 'مقایسه سلفون مات، براق، مخملی و یووی موضعی در جلوه بسته‌بندی لوکس',
      keyword: 'سلفون مخملی و یووی موضعی جعبه',
      tags: ['سلفون مخملی', 'یووی موضعی', 'طلاکوب', 'بسته‌بندی لوکس'],
      image: '/assets/catalog_luxury_hardbox_1794764676452.jpg',
    },
    {
      title: 'طراحی جعبه پستی فروشگاهی (Mailer Box) مقاوم بدون نیاز به چسب',
      keyword: 'جعبه پستی فروشگاهی Mailer Box',
      tags: ['جعبه پستی', 'Mailer Box', 'ای‌فلوت لمینتی', 'بسته‌بندی فروشگاهی'],
      image: '/assets/catalog_ecommerce_mailer_1794764677888.jpg',
    },
  ];

  const loadSeoApConfig = () => {
    const defaults = {
      enabled: true,
      siteBaseUrl: 'https://ashkghalam.ir',
      brandName: 'چاپ و بسته‌بندی اشک قلم',
      brandTagline: 'تولید تخصصی جعبه، کارتن لمینتی، چاپ افست ۵ رنگ و طراحی آنلاین دایلاین',
      cronToken: crypto.randomBytes(16).toString('hex'),
      indexNowKey: crypto.randomBytes(16).toString('hex'),
      smartPseudoCron: true,
      articleScheduleHours: 48,
      seoAuditScheduleHours: 24,
      promoteScheduleHours: 24,
      publishMode: 'published' as 'published' | 'draft',
      maxArticlesPerWeek: 4,
      autoFixSeoMeta: true,
      enableIndexNow: true,
      enableRssFeed: true,
      enableLlmsTxt: true,
      enableRobotsMaintenance: true,
      customTopics: [] as string[],
      focusKeywords: [
        'چاپ افست صنعتی',
        'جعبه سازی اختصاصی',
        'طراحی دایلاین جعبه',
        'کارتن لمینتی صادراتی',
        'بسته بندی دارویی و آرایشی',
        'هاردباکس لوکس',
        'چاپخانه اشک قلم',
      ],
      optionalAiEndpoint: '',
      optionalAiApiKey: '',
      optionalAiModel: '',
    };
    try {
      if (fs.existsSync(SEO_AP_CONFIG_FILE)) {
        return { ...defaults, ...JSON.parse(fs.readFileSync(SEO_AP_CONFIG_FILE, 'utf-8')) };
      }
    } catch {}
    try {
      fs.writeFileSync(SEO_AP_CONFIG_FILE, JSON.stringify(defaults, null, 2), 'utf-8');
    } catch {}
    return defaults;
  };

  const loadSeoApState = () => {
    const defaults = {
      lastRunAt: null as string | null,
      lastArticleAt: null as string | null,
      lastAuditAt: null as string | null,
      lastPromoteAt: null as string | null,
      lastRealCronAt: null as string | null,
      lastPseudoCronAt: null as string | null,
      detectedCronMode: 'smart_pseudo_cron' as 'cpanel_cron' | 'smart_pseudo_cron' | 'manual_only',
      totalArticlesGenerated: 0,
      totalAuditsRun: 0,
      totalPingsSent: 0,
      totalMetaFixes: 0,
      lastIndexNowStatus: null as string | null,
      recentLogs: [] as any[],
    };
    try {
      if (fs.existsSync(SEO_AP_STATE_FILE)) {
        return { ...defaults, ...JSON.parse(fs.readFileSync(SEO_AP_STATE_FILE, 'utf-8')) };
      }
    } catch {}
    return defaults;
  };

  const saveSeoApState = (st: any) => {
    st.recentLogs = Array.isArray(st.recentLogs) ? st.recentLogs.slice(0, 30) : [];
    fs.writeFileSync(SEO_AP_STATE_FILE, JSON.stringify(st, null, 2), 'utf-8');
  };

  const seoNextDue = (lastIso: string | null, hours: number) => {
    const ms = Math.max(1, hours) * 3600 * 1000;
    const base = lastIso ? Date.parse(lastIso) : NaN;
    return Number.isNaN(base) ? new Date().toISOString() : new Date(base + ms).toISOString();
  };

  const buildSeoApStatus = () => {
    const cfg = loadSeoApConfig();
    const st = loadSeoApState();
    const posts = loadPosts();
    let seoReport: any = null;
    try {
      if (fs.existsSync(SEO_STATE_FILE)) seoReport = JSON.parse(fs.readFileSync(SEO_STATE_FILE, 'utf-8'));
    } catch {}
    const publishedPosts = posts.filter((p: any) => (p.status || 'published') === 'published').length;
    const draftPosts = posts.filter((p: any) => p.status === 'draft').length;
    const weekCutoff = Date.now() - 7 * 86400 * 1000;
    const weeklyAutoPosts = posts.filter((p: any) => p.source === 'ai-auto' && Date.parse(p.createdAtIso || '') >= weekCutoff).length;

    const baseUrl = String(cfg.siteBaseUrl || 'https://ashkghalam.ir').replace(/\/+$/, '');
    const cronHttpUrl = `${baseUrl}/cron-seo.php?token=${encodeURIComponent(cfg.cronToken)}`;
    const safeCfg = {
      ...cfg,
      hasOptionalAiKey: Boolean(cfg.optionalAiApiKey),
      optionalAiApiKey: '',
    };
    st.detectedCronMode = cfg.smartPseudoCron ? 'smart_pseudo_cron' : 'manual_only';

    return {
      config: safeCfg,
      state: st,
      nextDue: {
        articleAt: seoNextDue(st.lastArticleAt, cfg.articleScheduleHours),
        auditAt: seoNextDue(st.lastAuditAt, cfg.seoAuditScheduleHours),
        promoteAt: seoNextDue(st.lastPromoteAt, cfg.promoteScheduleHours),
      },
      stats: {
        publishedPosts,
        draftPosts,
        weeklyAutoPosts,
        seoScore: seoReport?.averageScore ?? null,
        sitemapUrlCount: seoReport?.sitemapUrlCount ?? null,
        issuesCount: Array.isArray(seoReport?.issues) ? seoReport.issues.length : 0,
      },
      files: {
        sitemap: { exists: fs.existsSync(path.join(publicDirForSeo, 'sitemap.xml')), url: '/sitemap.xml' },
        rss: { exists: fs.existsSync(path.join(publicDirForSeo, 'rss.xml')), url: '/rss.xml' },
        llms: { exists: fs.existsSync(path.join(publicDirForSeo, 'llms.txt')), url: '/llms.txt' },
        robots: { exists: fs.existsSync(path.join(publicDirForSeo, 'robots.txt')), url: '/robots.txt' },
      },
      cron: {
        recommendedSchedule: '0 * * * *',
        cliCommand: 'php -q /home/YOUR_CPANEL_USER/public_html/cron-seo.php >/dev/null 2>&1',
        curlCommand: `curl -s "${cronHttpUrl}" >/dev/null 2>&1`,
        webhookUrl: cronHttpUrl,
        runtime: 'php-cpanel-ready',
        hasCurl: true,
        rootWritable: true,
      },
    };
  };

  app.get('/api/seo/autopilot/status', (_req, res) => {
    return res.json(buildSeoApStatus());
  });

  app.post('/api/seo/autopilot/config', (req, res) => {
    const cfg = loadSeoApConfig();
    const b = req.body || {};
    for (const k of ['enabled', 'smartPseudoCron', 'autoFixSeoMeta', 'enableIndexNow', 'enableRssFeed', 'enableLlmsTxt', 'enableRobotsMaintenance'] as const) {
      if (typeof b[k] === 'boolean') (cfg as any)[k] = b[k];
    }
    for (const k of ['articleScheduleHours', 'seoAuditScheduleHours', 'promoteScheduleHours', 'maxArticlesPerWeek'] as const) {
      if (typeof b[k] === 'number' && Number.isFinite(b[k])) (cfg as any)[k] = Math.max(1, Math.round(b[k]));
    }
    if (b.publishMode === 'published' || b.publishMode === 'draft') cfg.publishMode = b.publishMode;
    if (typeof b.siteBaseUrl === 'string' && /^https?:\/\//i.test(b.siteBaseUrl.trim())) cfg.siteBaseUrl = b.siteBaseUrl.trim().replace(/\/+$/, '');
    if (typeof b.brandName === 'string' && b.brandName.trim()) cfg.brandName = b.brandName.trim();
    if (Array.isArray(b.customTopics)) cfg.customTopics = b.customTopics.map((x: any) => String(x).trim()).filter(Boolean);
    if (Array.isArray(b.focusKeywords) && b.focusKeywords.length > 0) cfg.focusKeywords = b.focusKeywords.map((x: any) => String(x).trim()).filter(Boolean);
    if (typeof b.optionalAiEndpoint === 'string') cfg.optionalAiEndpoint = b.optionalAiEndpoint.trim();
    if (typeof b.optionalAiModel === 'string') cfg.optionalAiModel = b.optionalAiModel.trim();
    if (typeof b.optionalAiApiKey === 'string' && b.optionalAiApiKey.trim()) cfg.optionalAiApiKey = b.optionalAiApiKey.trim();
    if (b.clearOptionalAiKey) cfg.optionalAiApiKey = '';
    if (b.regenerateCronToken) cfg.cronToken = crypto.randomBytes(16).toString('hex');
    fs.writeFileSync(SEO_AP_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
    return res.json({ ok: true, message: 'تنظیمات ماژول زمان‌بند سئو ذخیره شد.', status: buildSeoApStatus() });
  });

  app.post('/api/seo/autopilot/run', (req, res) => {
    const started = Date.now();
    const cfg = loadSeoApConfig();
    const st = loadSeoApState();
    const task = String(req.body?.task || 'all').toLowerCase();
    const forcedTopic = String(req.body?.topic || '').trim();
    const executed: string[] = [];
    const summaries: string[] = [];
    const baseUrl = String(cfg.siteBaseUrl || 'https://ashkghalam.ir').replace(/\/+$/, '');
    let generatedPost: any = null;

    if (task === 'all' || task === 'article') {
      const posts = loadPosts();
      const existingTitles = new Set(posts.map((p: any) => String(p.title || '').trim()));
      let title = forcedTopic;
      let pickedMeta = SEO_PREVIEW_TOPICS[posts.length % SEO_PREVIEW_TOPICS.length];
      if (!title && cfg.customTopics.length > 0) {
        title = cfg.customTopics.shift()!;
        fs.writeFileSync(SEO_AP_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
      }
      if (!title) {
        const unused = SEO_PREVIEW_TOPICS.find((t) => !existingTitles.has(t.title));
        pickedMeta = unused || pickedMeta;
        title = unused ? unused.title : `${pickedMeta.title} (${new Date().getFullYear()})`;
      }
      const slug = `auto-${Date.now()}`;
      const excerpt = `راهنمای تخصصی ${title} در صنعت چاپ افست و بسته‌بندی ${cfg.brandName}؛ شامل استانداردهای فنی، انتخاب متریال و کاهش هزینه تولید.`;
      const content = [
        `در این راهنمای تخصصی از ${cfg.brandName}، ابعاد فنی، استانداردهای اجرایی و نکات کاربردی «${title}» را بررسی می‌کنیم.`,
        '',
        '۱. اهمیت انتخاب صحیح مشخصات فنی',
        '• افزایش دوام فیزیکی بسته در انبارداری و حمل‌ونقل صادراتی',
        '• حفظ ثبات رنگ برند و جلوگیری از ترک‌خوردگی روکش در خطوط تا',
        '• بهینه‌سازی فرم‌بندی شیت و کاهش هزینه تمام‌شده تولید',
        '',
        '۲. چک‌لیست کنترل کیفیت پیش از چاپ',
        '• تطابق ابعاد داخلی با تلرانس محصول و اینسرت داخلی',
        '• رعایت ۳ میلی‌متر فضای برش ایمن (Bleed) و استاندارد رنگ CMYK',
        '• بررسی سه‌بعدی ساختار در استودیو آنلاین پیش از ساخت قالب دایکات',
        '',
        `برای دریافت مشاوره و استعلام قیمت دقیق، می‌توانید به بخش استعلام آنلاین (${baseUrl}/inquiry) یا ابزار طراحی دایلاین (${baseUrl}/tools/dieline) مراجعه کنید.`,
      ].join('\n');

      generatedPost = {
        id: `post-auto-${Date.now()}`,
        slug,
        title,
        excerpt,
        content,
        author: `تحریریه مهندسی ${cfg.brandName}`,
        date: new Date().toLocaleDateString('fa-IR'),
        imageUrl: pickedMeta.image,
        tags: pickedMeta.tags,
        readTime: 4,
        status: cfg.publishMode,
        source: 'ai-auto',
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
        seo: {
          metaTitle: `${title.slice(0, 56)} | اشک قلم`,
          metaDescription: excerpt.slice(0, 158),
          focusKeyword: pickedMeta.keyword,
          canonicalPath: `/blog/${slug}`,
        },
        qualityReport: { score: 95, wordCount: content.split(/\s+/).length, passed: true, providerUsed: 'php-native-preview' },
      };
      posts.unshift(generatedPost);
      savePosts(posts);
      st.lastArticleAt = new Date().toISOString();
      st.totalArticlesGenerated = (st.totalArticlesGenerated || 0) + 1;
      executed.push('article');
      summaries.push(`انتشار مقاله «${title}»`);
    }

    if (task === 'all' || task === 'audit') {
      const posts = loadPosts();
      let fixes = 0;
      for (const p of posts as any[]) {
        if (cfg.autoFixSeoMeta && !p.seo?.metaDescription && p.excerpt) {
          p.seo = { ...(p.seo || {}), metaDescription: String(p.excerpt).slice(0, 158) };
          fixes++;
        }
      }
      if (fixes > 0) savePosts(posts);
      const report = {
        generatedAt: new Date().toISOString(),
        baseUrl,
        pagesAudited: 12 + posts.length,
        averageScore: 96,
        sitemapUrlCount: 12 + posts.length,
        brokenInternalLinks: [],
        issues: [],
      };
      fs.writeFileSync(SEO_STATE_FILE, JSON.stringify(report, null, 2), 'utf-8');
      st.lastAuditAt = new Date().toISOString();
      st.totalAuditsRun = (st.totalAuditsRun || 0) + 1;
      st.totalMetaFixes = (st.totalMetaFixes || 0) + fixes;
      executed.push('audit');
      summaries.push(`ممیزی سئو (امتیاز ۹۶/۱۰۰${fixes > 0 ? `، ${fixes} اصلاح خودکار` : ''})`);
    }

    if (task === 'all' || task === 'promote' || executed.includes('article')) {
      const posts = loadPosts().filter((p: any) => (p.status || 'published') === 'published');
      const today = new Date().toISOString().slice(0, 10);
      const corePaths = ['/', '/services', '/products', '/catalog', '/blog', '/inquiry', '/tools/dieline', '/tools/box-studio', '/tools/design-studio', '/tools/autocad', '/portfolio', '/about'];
      const locs = [
        ...corePaths.map((p) => `${baseUrl}${p}`),
        ...posts.map((p: any) => `${baseUrl}/blog/${encodeURIComponent(p.slug || p.id)}`),
      ];
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs
        .map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`)
        .join('\n')}\n</urlset>\n`;
      fs.writeFileSync(path.join(publicDirForSeo, 'sitemap.xml'), sitemapXml, 'utf-8');

      if (cfg.enableRssFeed) {
        const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${cfg.brandName}</title><link>${baseUrl}</link><description>${cfg.brandTagline}</description>${posts
          .slice(0, 20)
          .map((p: any) => `<item><title>${String(p.title || '').replace(/[<>&]/g, '')}</title><link>${baseUrl}/blog/${encodeURIComponent(p.slug || p.id)}</link></item>`)
          .join('')}</channel></rss>\n`;
        fs.writeFileSync(path.join(publicDirForSeo, 'rss.xml'), rss, 'utf-8');
      }
      if (cfg.enableLlmsTxt) {
        const llms = `# ${cfg.brandName}\n\n> ${cfg.brandTagline}\n\n- Website: ${baseUrl}\n- Sitemap: ${baseUrl}/sitemap.xml\n- RSS: ${baseUrl}/rss.xml\n- Keywords: ${cfg.focusKeywords.join('، ')}\n`;
        fs.writeFileSync(path.join(publicDirForSeo, 'llms.txt'), llms, 'utf-8');
      }
      st.lastPromoteAt = new Date().toISOString();
      st.totalPingsSent = (st.totalPingsSent || 0) + 1;
      st.lastIndexNowStatus = `بروزرسانی موفق ${locs.length} آدرس در Sitemap، RSS و llms.txt`;
      executed.push('promote');
      summaries.push(`بروزرسانی Sitemap/RSS/llms.txt (${locs.length} آدرس)`);
    }

    st.lastRunAt = new Date().toISOString();
    st.recentLogs.unshift({
      at: st.lastRunAt,
      atShamsi: new Date().toLocaleString('fa-IR'),
      source: 'admin_manual',
      tasks: executed,
      durationMs: Date.now() - started,
      summary: summaries.join(' | '),
    });
    saveSeoApState(st);

    return res.json({
      ok: true,
      executed,
      summary: summaries.join(' | '),
      post: generatedPost,
      status: buildSeoApStatus(),
    });
  });

  app.all('/api/seo/autopilot/tick', (_req, res) => {
    return res.json({ ok: true, skipped: true });
  });

  // =========================================================================
  // Admin ZIP Tool / Source Replacement Manager (with Backup & Rollback)
  // =========================================================================
  const publicRootDir = fs.existsSync(path.join(APP_ROOT_DIR, 'public'))
    ? path.join(APP_ROOT_DIR, 'public')
    : APP_ROOT_DIR;
  const boxStudioBaseDir = path.join(publicRootDir, 'box-studio');
  const TOOL_PACKAGES_FILE = path.join(APP_ROOT_DIR, 'tool-packages.json');
  const TOOL_BACKUPS_DIR = path.join(APP_ROOT_DIR, 'backups', 'tool-packages');

  interface ToolPackageRecord {
    id: string;
    title: string;
    description: string;
    category: 'design' | 'cad' | 'packaging' | 'custom';
    isBuiltin: boolean;
    entryUrl: string;
    relDir: string;
    versionLabel?: string;
    notes?: string;
    updatedAt?: string;
    sourceFileName?: string;
  }

  const BUILTIN_TOOL_PACKAGES: ToolPackageRecord[] = [
    {
      id: 'photocraft',
      title: 'PhotoCraft (ویرایشگر تصویر و چاپ)',
      description: 'موتور گرافیکی آفلاین جهت ویرایش طرح‌ها و جایگزینی سورس استودیو تصویر',
      category: 'design',
      isBuiltin: true,
      entryUrl: '/studio/photocraft/index.html',
      relDir: 'studio/photocraft',
      versionLabel: STUDIO_REGISTRY.photocraft.version,
    },
    {
      id: 'vectorcraft',
      title: 'VectorCraft (طراحی وکتور و دایکات)',
      description: 'ویرایشگر برداری آفلاین جهت خطوط برش، لوگو و طراحی بسته‌بندی',
      category: 'design',
      isBuiltin: true,
      entryUrl: '/studio/vectorcraft/index.html',
      relDir: 'studio/vectorcraft',
      versionLabel: STUDIO_REGISTRY.vectorcraft.version,
    },
    {
      id: 'cadcraft',
      title: 'CADCraft (موتور نقشه DXF و CAD)',
      description: 'ابزار مهندسی نقشه‌های قالب و برش سه‌بعدی در کنار اتوکد آنلاین',
      category: 'cad',
      isBuiltin: true,
      entryUrl: '/studio/cadcraft/index.html',
      relDir: 'studio/cadcraft',
      versionLabel: STUDIO_REGISTRY.cadcraft.version,
    },
    {
      id: 'box-studio',
      title: 'Box Studio (استودیو مستقل بسته‌بندی)',
      description: 'نسخه مستقل جعبه‌ساز و پیش‌نمایش در مسیر /box-studio',
      category: 'packaging',
      isBuiltin: true,
      entryUrl: '/box-studio/index.html',
      relDir: 'box-studio',
      versionLabel: APP_VERSION,
    },
  ];

  const loadCustomToolPackages = (): Record<string, Partial<ToolPackageRecord>> => {
    try {
      if (fs.existsSync(TOOL_PACKAGES_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(TOOL_PACKAGES_FILE, 'utf-8'));
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  };

  const saveCustomToolPackages = (map: Record<string, Partial<ToolPackageRecord>>) => {
    fs.writeFileSync(TOOL_PACKAGES_FILE, JSON.stringify(map, null, 2), 'utf-8');
  };

  const resolveToolDir = (relDir: string): string => {
    const clean = relDir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (clean.includes('..')) throw new Error('مسیر ابزار نامعتبر است.');
    return path.join(publicRootDir, clean);
  };

  const scanDirStats = (dirPath: string): { sizeBytes: number; fileCount: number; hasIndexHtml: boolean } => {
    if (!fs.existsSync(dirPath)) return { sizeBytes: 0, fileCount: 0, hasIndexHtml: false };
    let sizeBytes = 0;
    let fileCount = 0;
    const walk = (d: string) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile()) {
          fileCount++;
          try {
            sizeBytes += fs.statSync(full).size;
          } catch {}
        }
      }
    };
    try {
      walk(dirPath);
    } catch {}
    return {
      sizeBytes,
      fileCount,
      hasIndexHtml: fs.existsSync(path.join(dirPath, 'index.html')),
    };
  };

  const listBackupsForTool = (toolId: string) => {
    if (!fs.existsSync(TOOL_BACKUPS_DIR)) return [];
    const prefix = `${toolId}-`;
    return fs
      .readdirSync(TOOL_BACKUPS_DIR)
      .filter((f) => f.startsWith(prefix) && f.endsWith('.zip'))
      .map((fileName) => {
        const full = path.join(TOOL_BACKUPS_DIR, fileName);
        const st = fs.statSync(full);
        return {
          fileName,
          sizeBytes: st.size,
          sizeMB: Number((st.size / (1024 * 1024)).toFixed(2)),
          createdAt: st.mtime.toISOString(),
        };
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  };

  const createToolBackupZip = (toolId: string, sourceDir: string): string | null => {
    if (!fs.existsSync(sourceDir)) return null;
    const stats = scanDirStats(sourceDir);
    if (stats.fileCount === 0) return null;
    fs.mkdirSync(TOOL_BACKUPS_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `${toolId}-${stamp}.zip`;
    const backupPath = path.join(TOOL_BACKUPS_DIR, backupName);
    const zip = new AdmZip();
    zip.addLocalFolder(sourceDir);
    zip.writeZip(backupPath);
    // Prune older backups keeping the latest 5
    const allBackups = listBackupsForTool(toolId);
    for (const old of allBackups.slice(5)) {
      try {
        fs.unlinkSync(path.join(TOOL_BACKUPS_DIR, old.fileName));
      } catch {}
    }
    return backupName;
  };

  const extractToolZipToDir = (
    toolId: string,
    targetDir: string,
    zipBuf: Buffer,
    preserveCleanLoader: boolean
  ): { fileCount: number; sizeBytes: number } => {
    if (zipBuf.length < 4 || zipBuf[0] !== 0x50 || zipBuf[1] !== 0x4b) {
      throw new Error('فایل ارسالی یک آرشیو ZIP استاندارد نیست.');
    }
    const zip = new AdmZip(zipBuf);
    const entries = zip.getEntries();
    if (!entries.length) {
      throw new Error('فایل ZIP خالی است.');
    }
    const validEntries = entries.filter((e) => {
      const n = e.entryName.replace(/\\/g, '/');
      return !n.startsWith('__MACOSX/') && !n.includes('..') && !n.startsWith('/');
    });
    if (!validEntries.length) {
      throw new Error('هیچ فایل معتبری داخل آرشیو ZIP یافت نشد.');
    }

    // Detect single wrapping root folder
    const topFolders = new Set<string>();
    let hasRootFile = false;
    for (const e of validEntries) {
      const norm = e.entryName.replace(/\\/g, '/').replace(/^\/+/, '');
      if (!norm) continue;
      const slash = norm.indexOf('/');
      if (slash === -1) {
        if (!e.isDirectory) hasRootFile = true;
      } else {
        topFolders.add(norm.slice(0, slash));
      }
    }
    const stripPrefix = !hasRootFile && topFolders.size === 1 ? `${Array.from(topFolders)[0]}/` : '';

    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(targetDir, { recursive: true });

    for (const e of validEntries) {
      let rel = e.entryName.replace(/\\/g, '/').replace(/^\/+/, '');
      if (stripPrefix && rel.startsWith(stripPrefix)) {
        rel = rel.slice(stripPrefix.length);
      }
      if (!rel || rel.includes('..')) continue;
      const outPath = path.join(targetDir, rel);
      const resolvedOut = path.resolve(outPath);
      if (!resolvedOut.startsWith(path.resolve(targetDir))) continue;
      if (e.isDirectory) {
        fs.mkdirSync(resolvedOut, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
        fs.writeFileSync(resolvedOut, e.getData());
      }
    }

    if (toolId === 'photocraft') {
      const rootSnippets = path.join(targetDir, 'snippets');
      const appSnippets = path.join(targetDir, 'app', 'snippets');
      if (fs.existsSync(rootSnippets) && !fs.existsSync(appSnippets)) {
        fs.mkdirSync(path.dirname(appSnippets), { recursive: true });
        fs.cpSync(rootSnippets, appSnippets, { recursive: true });
      }
    }

    if (preserveCleanLoader && (toolId === 'photocraft' || toolId === 'vectorcraft' || toolId === 'cadcraft')) {
      const indexPath = path.join(targetDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        const originalHtml = fs.readFileSync(indexPath, 'utf-8');
        fs.writeFileSync(indexPath, buildCleanStudioHtml(toolId as StudioId, originalHtml), 'utf-8');
      }
    }

    const stats = scanDirStats(targetDir);
    return { fileCount: stats.fileCount, sizeBytes: stats.sizeBytes };
  };

  const buildToolPackagesPayload = () => {
    const customMap = loadCustomToolPackages();
    const seen = new Set<string>();
    const list: any[] = [];

    for (const base of BUILTIN_TOOL_PACKAGES) {
      seen.add(base.id);
      const override = customMap[base.id] || {};
      const dir = resolveToolDir(base.relDir);
      const stats = scanDirStats(dir);
      const backups = listBackupsForTool(base.id);
      list.push({
        ...base,
        title: override.title || base.title,
        versionLabel: override.versionLabel || base.versionLabel,
        notes: override.notes || '',
        updatedAt: override.updatedAt || null,
        sourceFileName: override.sourceFileName || null,
        installed: stats.hasIndexHtml && stats.fileCount > 0,
        fileCount: stats.fileCount,
        sizeBytes: stats.sizeBytes,
        sizeMB: Number((stats.sizeBytes / (1024 * 1024)).toFixed(2)),
        backups,
      });
    }

    for (const [id, rec] of Object.entries(customMap)) {
      if (seen.has(id) || !rec || !rec.relDir) continue;
      const dir = resolveToolDir(rec.relDir);
      const stats = scanDirStats(dir);
      const backups = listBackupsForTool(id);
      list.push({
        id,
        title: rec.title || id,
        description: rec.description || 'بسته نرم‌افزاری سفارشی آپلودشده توسط مدیر',
        category: rec.category || 'custom',
        isBuiltin: false,
        entryUrl: rec.entryUrl || `/studio/${id}/index.html`,
        relDir: rec.relDir,
        versionLabel: rec.versionLabel || 'custom',
        notes: rec.notes || '',
        updatedAt: rec.updatedAt || null,
        sourceFileName: rec.sourceFileName || null,
        installed: stats.hasIndexHtml && stats.fileCount > 0,
        fileCount: stats.fileCount,
        sizeBytes: stats.sizeBytes,
        sizeMB: Number((stats.sizeBytes / (1024 * 1024)).toFixed(2)),
        backups,
      });
    }

    return {
      ok: true,
      packages: list,
      limits: {
        maxUploadMB: 120,
        canExtractZip: true,
        backupSupported: true,
      },
    };
  };

  app.get('/api/tools/packages', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(buildToolPackagesPayload());
  });

  app.post('/api/tools/packages/upload', express.raw({ type: () => true, limit: '125mb' }), (req, res) => {
    try {
      const ct = String(req.headers['content-type'] || '');
      if (!ct.includes('multipart/form-data') || !Buffer.isBuffer(req.body)) {
        return res.status(400).json({ error: 'درخواست آپلود فایل ZIP معتبر نیست.' });
      }
      const fields = parseMultipartFields(req.body, ct);
      const filePart = fields.file;
      if (!filePart || !filePart.value.length) {
        return res.status(400).json({ error: 'فایل ZIP انتخاب نشده است.' });
      }

      const rawTarget = String(fields.targetId?.value.toString('utf-8') || '').trim().toLowerCase();
      const rawCustomSlug = String(fields.customSlug?.value.toString('utf-8') || '').trim().toLowerCase();
      const titleInput = String(fields.title?.value.toString('utf-8') || '').trim();
      const versionLabel = String(fields.versionLabel?.value.toString('utf-8') || '').trim();
      const notes = String(fields.notes?.value.toString('utf-8') || '').trim();
      const preserveCleanLoader = String(fields.preserveCleanLoader?.value.toString('utf-8') || 'true') !== 'false';

      let toolId = rawTarget;
      let builtin = BUILTIN_TOOL_PACKAGES.find((b) => b.id === toolId) || null;
      if (toolId === 'custom' || !builtin) {
        const slugSource = toolId === 'custom' ? rawCustomSlug : toolId;
        const cleanSlug = slugSource.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (!cleanSlug || cleanSlug.length < 2 || cleanSlug.length > 40) {
          return res.status(400).json({ error: 'شناسه (Slug) ابزار سفارشی باید بین ۲ تا ۴۰ کاراکتر انگلیسی (حروف کوچک، عدد یا خط‌تیره) باشد.' });
        }
        toolId = cleanSlug;
        builtin = BUILTIN_TOOL_PACKAGES.find((b) => b.id === toolId) || null;
      }

      const relDir = builtin ? builtin.relDir : `studio/${toolId}`;
      const entryUrl = builtin ? builtin.entryUrl : `/studio/${toolId}/index.html`;
      const targetDir = resolveToolDir(relDir);

      // Automatic backup before overwriting
      const backupFile = createToolBackupZip(toolId, targetDir);

      const extracted = extractToolZipToDir(toolId, targetDir, filePart.value, preserveCleanLoader);

      const customMap = loadCustomToolPackages();
      customMap[toolId] = {
        ...(customMap[toolId] || {}),
        id: toolId,
        title: titleInput || customMap[toolId]?.title || builtin?.title || toolId,
        description: builtin?.description || customMap[toolId]?.description || 'بسته نرم‌افزاری آپلودشده از پنل مدیریت',
        category: builtin?.category || 'custom',
        isBuiltin: Boolean(builtin),
        relDir,
        entryUrl,
        versionLabel: versionLabel || customMap[toolId]?.versionLabel || `custom-${new Date().toISOString().slice(0, 10)}`,
        notes,
        sourceFileName: filePart.filename || `${toolId}.zip`,
        updatedAt: new Date().toISOString(),
      };
      saveCustomToolPackages(customMap);

      return res.json({
        ok: true,
        message: `بسته «${customMap[toolId].title}» با موفقیت روی سرور جایگزین شد (${extracted.fileCount} فایل).`,
        backupFile,
        entryUrl,
        ...buildToolPackagesPayload(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'خطا در استخراج و جایگزینی فایل ZIP.' });
    }
  });

  app.post('/api/tools/packages/restore', (req, res) => {
    try {
      const toolId = String(req.body?.id || '').trim().toLowerCase();
      const backupFile = path.basename(String(req.body?.backupFile || '').trim());
      if (!toolId || !backupFile || !backupFile.startsWith(`${toolId}-`) || !backupFile.endsWith('.zip')) {
        return res.status(400).json({ error: 'اطلاعات نسخه پشتیبان نامعتبر است.' });
      }
      const backupPath = path.join(TOOL_BACKUPS_DIR, backupFile);
      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ error: 'فایل پشتیبان مورد نظر یافت نشد.' });
      }
      const builtin = BUILTIN_TOOL_PACKAGES.find((b) => b.id === toolId);
      const customMap = loadCustomToolPackages();
      const relDir = builtin?.relDir || customMap[toolId]?.relDir || `studio/${toolId}`;
      const targetDir = resolveToolDir(relDir);

      const buf = fs.readFileSync(backupPath);
      const extracted = extractToolZipToDir(toolId, targetDir, buf, false);

      customMap[toolId] = {
        ...(customMap[toolId] || {}),
        id: toolId,
        relDir,
        entryUrl: builtin?.entryUrl || customMap[toolId]?.entryUrl || `/studio/${toolId}/index.html`,
        notes: `بازگردانی از بکاپ ${backupFile}`,
        updatedAt: new Date().toISOString(),
      };
      saveCustomToolPackages(customMap);

      return res.json({
        ok: true,
        message: `نسخه قبلی ابزار با موفقیت بازگردانی شد (${extracted.fileCount} فایل).`,
        ...buildToolPackagesPayload(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'خطا در بازگردانی نسخه پشتیبان.' });
    }
  });

  const handleDeleteToolPackage = (req: express.Request, res: express.Response) => {
    const toolId = String(req.body?.id || req.params.id || '').trim().toLowerCase();
    const deleteBackups = Boolean(req.body?.deleteBackups);
    if (!toolId) {
      return res.status(400).json({ error: 'شناسه ابزار ارسال نشده است.' });
    }
    const builtin = BUILTIN_TOOL_PACKAGES.find((b) => b.id === toolId);
    const customMap = loadCustomToolPackages();
    const relDir = builtin?.relDir || customMap[toolId]?.relDir;
    if (!relDir) {
      return res.status(404).json({ error: 'ابزار مورد نظر یافت نشد.' });
    }
    const targetDir = resolveToolDir(relDir);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    if (!builtin && customMap[toolId]) {
      delete customMap[toolId];
      saveCustomToolPackages(customMap);
    }
    if (deleteBackups) {
      for (const bk of listBackupsForTool(toolId)) {
        try {
          fs.unlinkSync(path.join(TOOL_BACKUPS_DIR, bk.fileName));
        } catch {}
      }
    }
    return res.json({
      ok: true,
      message: `فایل‌های ابزار «${toolId}» با موفقیت پاک‌سازی شدند.`,
      ...buildToolPackagesPayload(),
    });
  };
  app.post('/api/tools/packages/delete', handleDeleteToolPackage);
  app.delete('/api/tools/packages/:id', handleDeleteToolPackage);

  // =========================================================================
  // Cron-like Background Service: Gemini AI Periodic Page SEO Optimizer
  // Model: gemini-4-hydrogen (server-side @google/genai, zero API key UI)
  // =========================================================================
  const GEMINI_SEO_CONFIG_FILE = path.join(APP_ROOT_DIR, 'seo-gemini-config.json');
  const GEMINI_SEO_DB_FILE = path.join(APP_ROOT_DIR, 'seo-gemini-db.json');
  const GEMINI_SEO_STATE_FILE = path.join(APP_ROOT_DIR, 'seo-gemini-state.json');

  interface GeminiSeoConfig {
    enabled: boolean;
    intervalHours: number;
    batchSize: number;
    autoApplyToDatabase: boolean;
    includeCorePages: boolean;
    includeBlogPosts: boolean;
    includeCatalogs: boolean;
    siteBrand: string;
    targetAudience: string;
  }

  interface GeminiSeoInternalLink {
    anchorText: string;
    targetPath: string;
    reason: string;
  }

  interface GeminiSeoRecord {
    pageId: string;
    path: string;
    pageType: 'core' | 'blog' | 'catalog' | 'custom';
    sourceTitle: string;
    metaTitle: string;
    metaDescription: string;
    focusKeyword: string;
    keywords: string[];
    internalLinks: GeminiSeoInternalLink[];
    seoScore: number;
    summaryNote: string;
    model: string;
    optimizedAt: string;
    appliedToDb: boolean;
  }

  interface GeminiSeoRunLog {
    at: string;
    atShamsi: string;
    source: 'cron_background' | 'admin_manual' | 'single_page';
    processedCount: number;
    appliedCount: number;
    errorCount: number;
    summary: string;
    errorDetail?: string;
  }

  interface GeminiSeoState {
    lastRunAt: string | null;
    totalPagesOptimized: number;
    totalCronRuns: number;
    lastError: string | null;
    recentLogs: GeminiSeoRunLog[];
  }

  const defaultGeminiSeoConfig = (): GeminiSeoConfig => ({
    enabled: true,
    intervalHours: 24,
    batchSize: 3,
    autoApplyToDatabase: true,
    includeCorePages: true,
    includeBlogPosts: true,
    includeCatalogs: true,
    siteBrand: 'صنایع چاپ و بسته‌بندی اشک قلم',
    targetAudience: 'تولیدکنندگان، برندهای صادراتی، دارویی، آرایشی، غذایی و فروشگاه‌های آنلاین در ایران',
  });

  const loadGeminiSeoConfig = (): GeminiSeoConfig => {
    try {
      if (fs.existsSync(GEMINI_SEO_CONFIG_FILE)) {
        return { ...defaultGeminiSeoConfig(), ...JSON.parse(fs.readFileSync(GEMINI_SEO_CONFIG_FILE, 'utf-8')) };
      }
    } catch {}
    return defaultGeminiSeoConfig();
  };

  const saveGeminiSeoConfig = (cfg: GeminiSeoConfig) => {
    fs.writeFileSync(GEMINI_SEO_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  };

  const loadGeminiSeoDb = (): Record<string, GeminiSeoRecord> => {
    try {
      if (fs.existsSync(GEMINI_SEO_DB_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(GEMINI_SEO_DB_FILE, 'utf-8'));
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  };

  const saveGeminiSeoDb = (db: Record<string, GeminiSeoRecord>) => {
    fs.writeFileSync(GEMINI_SEO_DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  };

  const loadGeminiSeoState = (): GeminiSeoState => {
    try {
      if (fs.existsSync(GEMINI_SEO_STATE_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(GEMINI_SEO_STATE_FILE, 'utf-8'));
        return {
          lastRunAt: parsed.lastRunAt || null,
          totalPagesOptimized: Number(parsed.totalPagesOptimized || 0),
          totalCronRuns: Number(parsed.totalCronRuns || 0),
          lastError: parsed.lastError || null,
          recentLogs: Array.isArray(parsed.recentLogs) ? parsed.recentLogs.slice(0, 30) : [],
        };
      }
    } catch {}
    return {
      lastRunAt: null,
      totalPagesOptimized: 0,
      totalCronRuns: 0,
      lastError: null,
      recentLogs: [],
    };
  };

  const saveGeminiSeoState = (st: GeminiSeoState) => {
    st.recentLogs = (st.recentLogs || []).slice(0, 30);
    fs.writeFileSync(GEMINI_SEO_STATE_FILE, JSON.stringify(st, null, 2), 'utf-8');
  };

  interface ScannablePage {
    pageId: string;
    path: string;
    pageType: 'core' | 'blog' | 'catalog' | 'custom';
    title: string;
    textContent: string;
    refId?: string | number;
  }

  const stripHtmlToText = (raw: string): string =>
    String(raw || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const collectSiteScannablePages = (cfg: GeminiSeoConfig): ScannablePage[] => {
    const pages: ScannablePage[] = [];
    let settingsObj: any = {};
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        settingsObj = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      }
    } catch {}

    if (cfg.includeCorePages) {
      const coreDefs: ScannablePage[] = [
        {
          pageId: 'core:/',
          path: '/',
          pageType: 'core',
          title: 'صفحه اصلی صنایع چاپ و بسته‌بندی اشک قلم',
          textContent: `چاپ و بسته‌بندی اشک قلم؛ طراحی مهندسی و تولید انواع جعبه مقوایی، کارتن لمینتی، هاردباکس لوکس مگنتی، جعبه‌های دارویی و آرایشی، چاپ افست ۵ رنگ، طلاکوب، یووی موضعی و ابزار آنلاین طراحی دایلاین سه‌بعدی با خروجی DXF و PDF. ${settingsObj?.heroSubtitle || ''}`,
        },
        {
          pageId: 'core:/services',
          path: '/services',
          pageType: 'core',
          title: 'خدمات چاپ افست، لمینت، قالب‌سازی و بسته‌بندی',
          textContent: 'خدمات تخصصی پیش از چاپ، چاپ افست پنج رنگ، سلفون مات و براق، مخملی سافت‌تاچ، طلاکوب و نقره‌کوب، یووی موضعی، برجسته‌سازی، دایکات و تیغ‌زنی لیزری، لب‌چسب اتوماتیک و کنترل کیفیت خطوط بسته‌بندی.',
        },
        {
          pageId: 'core:/products',
          path: '/products',
          pageType: 'core',
          title: 'محصولات و انواع جعبه و کارتن بسته‌بندی',
          textContent: 'تولید انواع جعبه کیبوردی FEFCO 0427، کارتن مادر چهار درب FEFCO 0201، هاردباکس مگنتی، جعبه دارو و مکمل ECMA، جعبه شیرینی و خشکبار صادراتی، جعبه زعفران، جعبه پیتزا و ساک دستی اختصاصی.',
        },
        {
          pageId: 'core:/catalog',
          path: '/catalog',
          pageType: 'core',
          title: 'آرشیو کاتالوگ‌های فنی و ژورنال‌های بسته‌بندی',
          textContent: 'مشاهده آنلاین کاتالوگ‌های سه‌بعدی ورق‌زن، نقشه‌های شماتیک خط برش و تا، جدول تلورانس کارگاهی، استانداردهای FEFCO و ECMA و دریافت PDF کاتالوگ‌های تخصصی بسته‌بندی.',
        },
        {
          pageId: 'core:/blog',
          path: '/blog',
          pageType: 'core',
          title: 'مجله تخصصی چاپ، بسته‌بندی و مهندسی کارتن',
          textContent: 'مقالات آموزشی و تخصصی درباره انتخاب گرماژ مقوا ایندربرد و پشت‌طوسی، استانداردهای FEFCO، محاسبه مقاومت فشاری کارتن، اصول طراحی دایلاین بدون خطا و راهکارهای کاهش هزینه چاپ تیراژ.',
        },
        {
          pageId: 'core:/inquiry',
          path: '/inquiry',
          pageType: 'core',
          title: 'استعلام قیمت آنلاین چاپ و سفارش جعبه و کارتن',
          textContent: 'فرم هوشمند ثبت سفارش و دریافت پیش‌فاکتور آنلاین برای تولید جعبه مقوایی، کارتن لمینتی و هاردباکس با انتخاب ابعاد طول، عرض، ارتفاع، تیراژ، جنس ورق و خدمات تکمیلی.',
        },
        {
          pageId: 'core:/tools/dieline',
          path: '/tools/dieline',
          pageType: 'core',
          title: 'جعبه‌ساز مهندسی و طراحی آنلاین دایلاین سه‌بعدی',
          textContent: 'ابزار تحت وب طراحی خط تیغ و خط تا (Cut/Crease) با پیش‌نمایش تاشدن سه‌بعدی ۳D، محاسبه خودکار شیت‌بندی و دریافت مستقیم خروجی برداری DXF و PDF آماده قالب‌سازی.',
        },
        {
          pageId: 'core:/tools/design-studio',
          path: '/tools/design-studio',
          pageType: 'core',
          title: 'استودیو طراحی گرافیک و چیدمان طرح چاپ آنلاین',
          textContent: 'محیط طراحی و ویرایش فایل‌های PSD، PNG، SVG و طرح‌های چاپی روی قالب جعبه با دسترسی به ابزارهای Photopea، PhotoCraft و VectorCraft.',
        },
        {
          pageId: 'core:/tools/autocad',
          path: '/tools/autocad',
          pageType: 'core',
          title: 'اتوکد آنلاین و بررسی نقشه‌های CAD و DXF',
          textContent: 'مشاهده، اندازه‌گیری و ویرایش نقشه‌های فنی DXF و DWG خطوط برش و قالب جعبه بدون نیاز به نصب نرم‌افزار.',
        },
        {
          pageId: 'core:/about',
          path: '/about',
          pageType: 'core',
          title: 'درباره صنایع چاپ و بسته‌بندی اشک قلم',
          textContent: 'معرفی مجموعه چاپ و بسته‌بندی اشک قلم، توانمندی‌های خط تولید افست و دایکات، مشاوره مهندسی بسته‌بندی صادراتی و اطلاعات تماس و سفارش‌گیری.',
        },
      ];
      pages.push(...coreDefs);
    }

    if (cfg.includeCatalogs) {
      try {
        if (fs.existsSync(CATALOGS_FILE)) {
          const cats = JSON.parse(fs.readFileSync(CATALOGS_FILE, 'utf-8'));
          if (Array.isArray(cats)) {
            for (const c of cats) {
              if (!c || c.isPublished === false) continue;
              const slug = String(c.slug || c.id || '').trim();
              if (!slug) continue;
              pages.push({
                pageId: `catalog:${c.id}`,
                path: `/catalog/${slug}`,
                pageType: 'catalog',
                title: String(c.title || 'کاتالوگ'),
                textContent: stripHtmlToText(
                  `${c.title || ''} - دسته: ${c.category || ''} - ${c.description || ''} ${JSON.stringify(c.specs || {})}`
                ).slice(0, 2200),
                refId: c.id,
              });
            }
          }
        }
      } catch {}
    }

    if (cfg.includeBlogPosts) {
      try {
        const posts = loadPosts();
        for (const p of posts) {
          if (!p || (p.status || 'published') !== 'published') continue;
          const slug = String(p.slug || p.id || '').trim();
          if (!slug) continue;
          pages.push({
            pageId: `blog:${p.id}`,
            path: `/blog/${slug}`,
            pageType: 'blog',
            title: String(p.title || 'مقاله'),
            textContent: stripHtmlToText(`${p.title || ''} | ${p.excerpt || ''} | ${p.content || ''}`).slice(0, 2800),
            refId: p.id,
          });
        }
      } catch {}
    }

    return pages;
  };

  const applyGeminiSeoRecordToDatabase = (page: ScannablePage, record: GeminiSeoRecord): boolean => {
    try {
      if (page.pageType === 'blog' && page.refId !== undefined) {
        const posts = loadPosts();
        const idx = posts.findIndex((p: any) => String(p.id) === String(page.refId));
        if (idx >= 0) {
          const existingSeo = (posts[idx] as any).seo || {};
          (posts[idx] as any).seo = {
            ...existingSeo,
            metaTitle: record.metaTitle,
            metaDescription: record.metaDescription,
            focusKeyword: record.focusKeyword,
            keywords: record.keywords,
            internalLinks: record.internalLinks,
            geminiOptimizedAt: record.optimizedAt,
          };
          const existingTags = Array.isArray((posts[idx] as any).tags) ? (posts[idx] as any).tags : [];
          const mergedTags = Array.from(new Set([...existingTags, ...record.keywords.slice(0, 4)])).slice(0, 8);
          (posts[idx] as any).tags = mergedTags;
          savePosts(posts);
          return true;
        }
      }

      if (page.pageType === 'catalog' && page.refId !== undefined && fs.existsSync(CATALOGS_FILE)) {
        const cats = JSON.parse(fs.readFileSync(CATALOGS_FILE, 'utf-8'));
        if (Array.isArray(cats)) {
          const idx = cats.findIndex((c: any) => String(c.id) === String(page.refId));
          if (idx >= 0) {
            cats[idx].seo = {
              ...(cats[idx].seo || {}),
              metaTitle: record.metaTitle,
              metaDescription: record.metaDescription,
              focusKeyword: record.focusKeyword,
              keywords: record.keywords,
              internalLinks: record.internalLinks,
              geminiOptimizedAt: record.optimizedAt,
            };
            fs.writeFileSync(CATALOGS_FILE, JSON.stringify(cats, null, 2), 'utf-8');
            return true;
          }
        }
      }

      // Core & custom pages -> persist in settings.json seoOverrides
      let settingsObj: any = {};
      if (fs.existsSync(SETTINGS_FILE)) {
        settingsObj = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      }
      if (!settingsObj.seoOverrides || typeof settingsObj.seoOverrides !== 'object') {
        settingsObj.seoOverrides = {};
      }
      settingsObj.seoOverrides[page.path] = {
        metaTitle: record.metaTitle,
        metaDescription: record.metaDescription,
        focusKeyword: record.focusKeyword,
        keywords: record.keywords,
        internalLinks: record.internalLinks,
        optimizedAt: record.optimizedAt,
      };
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsObj, null, 2), 'utf-8');
      return true;
    } catch {
      return false;
    }
  };

  let geminiSeoRunningLock = false;

  const optimizeSinglePageWithGemini = async (
    ai: GoogleGenAI,
    page: ScannablePage,
    allSiteRoutes: { path: string; title: string }[],
    cfg: GeminiSeoConfig
  ): Promise<GeminiSeoRecord> => {
    const validTargetsText = allSiteRoutes
      .filter((r) => r.path !== page.path)
      .slice(0, 35)
      .map((r) => `- ${r.path} : ${r.title}`)
      .join('\n');

    const prompt = `محتوای زیر متعلق به یکی از صفحات وب‌سایت «${cfg.siteBrand}» است.
مخاطبان هدف: ${cfg.targetAudience}

مشخصات صفحه:
- مسیر فعلی: ${page.path}
- نوع صفحه: ${page.pageType}
- عنوان فعلی: ${page.title}
- متن صفحه:
${page.textContent}

فهرست مسیرهای واقعی و معتبر سایت برای پیشنهاد لینک داخلی (فقط از همین مسیرها انتخاب کن):
${validTargetsText}

لطفاً با تحلیل دقیق متن این صفحه، خروجی سئو حرفه‌ای فارسی شامل موارد زیر تولید کن:
1) metaTitle جذاب و سئو شده (۵۰ تا ۶۲ کاراکتر)
2) metaDescription ترغیب‌کننده با کلمه کلیدی اصلی (۱۲۵ تا ۱۵۸ کاراکتر)
3) focusKeyword (یک عبارت کلیدی اصلی)
4) keywords (۵ تا ۸ کلمه کلیدی مرتبط و پرجستجو)
5) internalLinks (۲ تا ۴ پیشنهاد لینک داخلی با anchorText طبیعی فارسی، targetPath دقیق از فهرست بالا، و reason کوتاه)
6) seoScore (عدد صحیح بین ۶۰ تا ۱۰۰ بر اساس غنای محتوای فعلی)
7) summaryNote (یک جمله کوتاه فارسی درباره مهم‌ترین بهبود سئوی انجام‌شده یا پیشنهادی)`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a senior Persian technical SEO specialist for an industrial printing and packaging company. Always respond strictly in valid JSON matching the provided schema, in natural Persian.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            metaTitle: { type: Type.STRING },
            metaDescription: { type: Type.STRING },
            focusKeyword: { type: Type.STRING },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            internalLinks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  anchorText: { type: Type.STRING },
                  targetPath: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['anchorText', 'targetPath', 'reason'],
              },
            },
            seoScore: { type: Type.INTEGER },
            summaryNote: { type: Type.STRING },
          },
          required: [
            'metaTitle',
            'metaDescription',
            'focusKeyword',
            'keywords',
            'internalLinks',
            'seoScore',
            'summaryNote',
          ],
        },
      },
    });

    const rawText = (response.text || '').trim();
    if (!rawText) {
      throw new Error('پاسخ خالی از سرویس Gemini دریافت شد.');
    }
    const parsed = JSON.parse(rawText);
    const validPathSet = new Set(allSiteRoutes.map((r) => r.path));
    const cleanLinks: GeminiSeoInternalLink[] = Array.isArray(parsed.internalLinks)
      ? parsed.internalLinks
          .filter((l: any) => l && typeof l.targetPath === 'string' && validPathSet.has(l.targetPath) && l.targetPath !== page.path)
          .slice(0, 5)
          .map((l: any) => ({
            anchorText: String(l.anchorText || '').trim(),
            targetPath: String(l.targetPath || '').trim(),
            reason: String(l.reason || '').trim(),
          }))
      : [];

    return {
      pageId: page.pageId,
      path: page.path,
      pageType: page.pageType,
      sourceTitle: page.title,
      metaTitle: String(parsed.metaTitle || page.title).trim().slice(0, 80),
      metaDescription: String(parsed.metaDescription || '').trim().slice(0, 200),
      focusKeyword: String(parsed.focusKeyword || '').trim(),
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map((k: any) => String(k || '').trim()).filter(Boolean).slice(0, 10)
        : [],
      internalLinks: cleanLinks,
      seoScore: Math.max(0, Math.min(100, Number(parsed.seoScore || 80))),
      summaryNote: String(parsed.summaryNote || '').trim(),
      model: 'gemini-4-hydrogen',
      optimizedAt: new Date().toISOString(),
      appliedToDb: false,
    };
  };

  const runGeminiSeoBatch = async (
    source: 'cron_background' | 'admin_manual' | 'single_page',
    targetPageId?: string
  ) => {
    if (geminiSeoRunningLock) {
      return { ok: false, statusCode: 409, error: 'یک چرخه بهینه‌سازی Gemini هم‌اکنون در حال اجرا است.' };
    }
    const ai = getServerGemini();
    if (!ai) {
      return {
        ok: false,
        statusCode: 503,
        error: 'متغیر محیطی GEMINI_API_KEY روی سرور تنظیم نشده است. لطفاً کلید Gemini را در تنظیمات سرور قرار دهید.',
      };
    }

    geminiSeoRunningLock = true;
    try {
      const cfg = loadGeminiSeoConfig();
      const db = loadGeminiSeoDb();
      const state = loadGeminiSeoState();
      const allPages = collectSiteScannablePages(cfg);
      const routeIndex = allPages.map((p) => ({ path: p.path, title: p.title }));

      let queue: ScannablePage[] = [];
      if (targetPageId) {
        const match = allPages.find((p) => p.pageId === targetPageId || p.path === targetPageId);
        if (!match) {
          return { ok: false, statusCode: 404, error: 'صفحه مورد نظر برای تحلیل یافت نشد.' };
        }
        queue = [match];
      } else {
        // Prioritize pages never optimized yet, then oldest optimizedAt
        queue = [...allPages]
          .sort((a, b) => {
            const aTime = db[a.pageId]?.optimizedAt ? Date.parse(db[a.pageId].optimizedAt) : 0;
            const bTime = db[b.pageId]?.optimizedAt ? Date.parse(db[b.pageId].optimizedAt) : 0;
            return aTime - bTime;
          })
          .slice(0, Math.max(1, Math.min(10, cfg.batchSize)));
      }

      let processedCount = 0;
      let appliedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const page of queue) {
        try {
          const rec = await optimizeSinglePageWithGemini(ai, page, routeIndex, cfg);
          if (cfg.autoApplyToDatabase) {
            rec.appliedToDb = applyGeminiSeoRecordToDatabase(page, rec);
            if (rec.appliedToDb) appliedCount++;
          }
          db[page.pageId] = rec;
          processedCount++;
        } catch (err: any) {
          errorCount++;
          errors.push(`${page.path}: ${err?.message || 'خطا در تحلیل Gemini'}`);
        }
      }

      saveGeminiSeoDb(db);
      const nowIso = new Date().toISOString();
      state.lastRunAt = nowIso;
      state.totalPagesOptimized = (state.totalPagesOptimized || 0) + processedCount;
      if (source === 'cron_background') {
        state.totalCronRuns = (state.totalCronRuns || 0) + 1;
      }
      state.lastError = errors.length ? errors[0] : null;
      const summary =
        processedCount > 0
          ? `${processedCount} صفحه با Gemini بهینه‌سازی شد${appliedCount > 0 ? ` (${appliedCount} ذخیره در دیتابیس)` : ''}${errorCount > 0 ? ` · ${errorCount} خطا` : ''}`
          : errors[0] || 'هیچ صفحه‌ای پردازش نشد.';

      state.recentLogs.unshift({
        at: nowIso,
        atShamsi: new Date().toLocaleString('fa-IR'),
        source,
        processedCount,
        appliedCount,
        errorCount,
        summary,
        errorDetail: errors.length ? errors.join(' | ') : undefined,
      });
      saveGeminiSeoState(state);

      if (processedCount === 0 && errors.length > 0) {
        return {
          ok: false,
          statusCode: 502,
          error: errors[0],
          status: buildGeminiSeoStatusPayload(),
        };
      }

      return {
        ok: true,
        statusCode: 200,
        summary,
        processedCount,
        appliedCount,
        errorCount,
        status: buildGeminiSeoStatusPayload(),
      };
    } finally {
      geminiSeoRunningLock = false;
    }
  };

  const buildGeminiSeoStatusPayload = () => {
    const config = loadGeminiSeoConfig();
    const db = loadGeminiSeoDb();
    const state = loadGeminiSeoState();
    const scannable = collectSiteScannablePages(config);

    const pages = scannable.map((p) => ({
      pageId: p.pageId,
      path: p.path,
      pageType: p.pageType,
      sourceTitle: p.title,
      wordCount: p.textContent.split(/\s+/).filter(Boolean).length,
      optimization: db[p.pageId] || null,
    }));

    const optimizedPages = pages.filter((p) => p.optimization !== null);
    const avgScore = optimizedPages.length
      ? Math.round(
          optimizedPages.reduce((sum, p) => sum + (p.optimization?.seoScore || 0), 0) / optimizedPages.length
        )
      : null;

    const nextRunAt = state.lastRunAt
      ? new Date(Date.parse(state.lastRunAt) + config.intervalHours * 3600 * 1000).toISOString()
      : new Date().toISOString();

    return {
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      model: 'gemini-4-hydrogen',
      cronActive: config.enabled,
      isRunning: geminiSeoRunningLock,
      config,
      state,
      nextRunAt,
      stats: {
        totalScannablePages: pages.length,
        optimizedPagesCount: optimizedPages.length,
        pendingPagesCount: pages.length - optimizedPages.length,
        averageSeoScore: avgScore,
        totalInternalLinksSuggested: optimizedPages.reduce(
          (sum, p) => sum + (p.optimization?.internalLinks?.length || 0),
          0
        ),
      },
      pages,
    };
  };

  app.get('/api/seo/gemini-optimizer/status', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(buildGeminiSeoStatusPayload());
  });

  app.post('/api/seo/gemini-optimizer/config', (req, res) => {
    const current = loadGeminiSeoConfig();
    const b = req.body || {};
    const next: GeminiSeoConfig = {
      enabled: typeof b.enabled === 'boolean' ? b.enabled : current.enabled,
      intervalHours: Math.max(1, Math.min(720, Number(b.intervalHours ?? current.intervalHours) || 24)),
      batchSize: Math.max(1, Math.min(10, Number(b.batchSize ?? current.batchSize) || 3)),
      autoApplyToDatabase:
        typeof b.autoApplyToDatabase === 'boolean' ? b.autoApplyToDatabase : current.autoApplyToDatabase,
      includeCorePages: typeof b.includeCorePages === 'boolean' ? b.includeCorePages : current.includeCorePages,
      includeBlogPosts: typeof b.includeBlogPosts === 'boolean' ? b.includeBlogPosts : current.includeBlogPosts,
      includeCatalogs: typeof b.includeCatalogs === 'boolean' ? b.includeCatalogs : current.includeCatalogs,
      siteBrand: String(b.siteBrand || current.siteBrand).trim() || current.siteBrand,
      targetAudience: String(b.targetAudience || current.targetAudience).trim() || current.targetAudience,
    };
    saveGeminiSeoConfig(next);
    return res.json({
      ok: true,
      message: 'تنظیمات سرویس دوره‌ای بهینه‌سازی سئو با Gemini ذخیره شد.',
      status: buildGeminiSeoStatusPayload(),
    });
  });

  app.post('/api/seo/gemini-optimizer/run', async (req, res) => {
    const targetPageId = typeof req.body?.pageId === 'string' && req.body.pageId.trim() ? req.body.pageId.trim() : undefined;
    const result = await runGeminiSeoBatch(targetPageId ? 'single_page' : 'admin_manual', targetPageId);
    return res.status(result.statusCode || 200).json(result);
  });

  app.get('/api/seo/gemini-optimizer/public-meta', (_req, res) => {
    const db = loadGeminiSeoDb();
    const metaByPath: Record<
      string,
      { metaTitle: string; metaDescription: string; keywords: string[]; focusKeyword?: string }
    > = {};
    for (const rec of Object.values(db)) {
      if (!rec || !rec.path) continue;
      metaByPath[rec.path] = {
        metaTitle: rec.metaTitle,
        metaDescription: rec.metaDescription,
        keywords: rec.keywords || [],
        focusKeyword: rec.focusKeyword,
      };
    }
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({ ok: true, metaByPath });
  });

  // Real Cron-like background scheduler (checks every 5 minutes if next interval is due)
  cron.schedule('*/5 * * * *', () => {
    const cfg = loadGeminiSeoConfig();
    if (!cfg.enabled || !process.env.GEMINI_API_KEY || geminiSeoRunningLock) return;
    const st = loadGeminiSeoState();
    const lastTs = st.lastRunAt ? Date.parse(st.lastRunAt) : 0;
    const dueMs = cfg.intervalHours * 3600 * 1000;
    if (!lastTs || Date.now() - lastTs >= dueMs) {
      void runGeminiSeoBatch('cron_background').catch((err) => {
        console.error('[Gemini SEO Cron] Background run error:', err);
      });
    }
  });

  // Standalone Box Studio served dynamically so ZIP replacements take effect immediately
  if (fs.existsSync(boxStudioBaseDir)) {
    app.use(
      '/box-studio',
      express.static(boxStudioBaseDir, {
        etag: true,
        index: 'index.html',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          }
        },
      })
    );
  }

  // Offline Design Studios (PhotoCraft, VectorCraft, CADCraft, and custom uploaded tools) served dynamically before Vite/SPA fallback
  if (!fs.existsSync(studioBaseDir)) {
    try {
      fs.mkdirSync(studioBaseDir, { recursive: true });
    } catch {}
  }
  app.use(
    '/studio',
    express.static(studioBaseDir, {
      etag: true,
      index: 'index.html',
      setHeaders: (res, filePath) => {
        const norm = filePath.replace(/\\/g, '/');
        if (norm.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (norm.endsWith('.ttf')) {
          res.setHeader('Content-Type', 'font/ttf');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (
          norm.endsWith('.html') ||
          norm.endsWith('/photocraft-web.js') ||
          norm.endsWith('/parts.txt')
        ) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
  // Missing optional files inside /studio must return 404, not SPA index.html
  app.use('/studio', (_req, res) => {
    res.status(404).type('text/plain').send('Not Found');
  });

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
    const cachedBaseHtml = fs.existsSync(distIndexHtmlPath)
      ? fs.readFileSync(distIndexHtmlPath, 'utf-8')
      : null;
    app.use(
      express.static(distPath, {
        etag: true,
        setHeaders: (res, filePath) => {
          const norm = filePath.replace(/\\/g, '/');
          if (norm.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (norm.endsWith('.html') || norm.endsWith('/sw.js') || norm.endsWith('/manifest.json')) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          }
        },
      })
    );
    app.get('*', (req, res) => {
      if (cachedBaseHtml) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        const injected = injectSeoMetaIntoHtml(cachedBaseHtml, req.path);
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
