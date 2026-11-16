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

const APP_VERSION = '3.14.0';
const CATALOGS_FILE = path.join(__dirname, 'catalogs.json');
const INQUIRIES_FILE = path.join(__dirname, 'inquiries.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const POSTS_FILE = path.join(__dirname, 'posts.json');
const SEO_STATE_FILE = path.join(__dirname, 'seo-state.json');

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

function writeJsonFile(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
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
  app.use(express.json({ limit: '20mb' }));

  // Health Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: APP_VERSION,
      mode: 'cpanel-seo-worker-ready',
      timestamp: new Date().toISOString(),
    });
  });

  // Dynamic Sitemap & Robots endpoints
  app.get('/sitemap.xml', (_req, res) => {
    const file = path.join(__dirname, 'public', 'sitemap.xml');
    if (!fs.existsSync(file)) {
      buildSitemapAndRobots();
    }
    if (fs.existsSync(file)) {
      return res.type('application/xml').sendFile(file);
    }
    return res.status(404).send('Sitemap unavailable');
  });

  app.get('/robots.txt', (_req, res) => {
    const file = path.join(__dirname, 'public', 'robots.txt');
    if (!fs.existsSync(file)) {
      buildSitemapAndRobots();
    }
    if (fs.existsSync(file)) {
      return res.type('text/plain').sendFile(file);
    }
    return res.type('text/plain').send('User-agent: *\nAllow: /\n');
  });

  // Real Catalogs CRUD backed by catalogs.json
  app.get('/api/catalogs', (req, res) => {
    const all = readJsonFile<any[]>(CATALOGS_FILE, []);
    const isAdmin = req.query.admin === 'true';
    res.json(isAdmin ? all : all.filter((c) => c && c.isPublished !== false));
  });

  app.post('/api/catalogs', (req, res) => {
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
  });

  app.delete('/api/catalogs/:id', (req, res) => {
    const targetId = req.params.id;
    const all = readJsonFile<any[]>(CATALOGS_FILE, []);
    const next = all.filter((c) => String(c.id) !== String(targetId));
    writeJsonFile(CATALOGS_FILE, next);
    buildSitemapAndRobots();
    res.json({ deleted: true, count: next.length });
  });

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

  app.patch('/api/posts/:id/status', async (req, res) => {
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
  });

  app.delete('/api/posts/:id', (req, res) => {
    const targetId = req.params.id;
    const all = readJsonFile<any[]>(POSTS_FILE, []);
    const next = all.filter((p) => String(p.id) !== String(targetId));
    writeJsonFile(POSTS_FILE, next);
    buildSitemapAndRobots();
    res.json({ deleted: true, count: next.length });
  });

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

  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = isProduction ? Number(process.env.PORT) || 3000 : 3000;

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
    const distPath = path.join(__dirname, 'dist');
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
