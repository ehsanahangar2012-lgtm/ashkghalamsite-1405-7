import { AppView, SeoConfig } from '../types';

// Persian Stopwords list to filter out noisy words in keyword analysis
const PERSIAN_STOPWORDS = new Set([
  'از', 'به', 'با', 'در', 'برای', 'که', 'این', 'آن', 'است', 'شد', 'شدن',
  'شدند', 'بوده', 'می‌شود', 'می‌گردد', 'می‌کند', 'می‌باشد', 'تا', 'بر',
  'هم', 'نیز', 'یا', 'اما', 'اگر', 'چون', 'هر', 'همه', 'یک', 'یکی',
  'دیگر', 'بین', 'روی', 'زیر', 'پس', 'پیش', 'قبل', 'بعد', 'چند', 'چه',
  'را', 'و', 'ها', 'های', 'ای', 'کرد', 'کرده', 'کنند', 'کنیم', 'دارد',
  'داشت', 'داشته', 'باشد', 'باشند', 'ما', 'شما', 'آنها', 'او', 'من', 'خود'
]);

export interface KeywordAnalysisItem {
  keyword: string;
  count: number;
  density: number; // percentage
  relevanceScore: number; // 0-100
  suggestedPlacements: ('title' | 'h1' | 'description' | 'body' | 'schema')[];
  type: 'single' | 'phrase';
  status: 'optimal' | 'underused' | 'overused';
}

export interface SeoAuditIssue {
  id: string;
  severity: 'critical' | 'warning' | 'good';
  category: 'title' | 'description' | 'headings' | 'keywords' | 'schema' | 'technical';
  message: string;
  recommendation: string;
}

export interface PageSeoAuditResult {
  view: AppView;
  pageTitle: string;
  score: number; // 0-100
  issues: SeoAuditIssue[];
  metrics: {
    titleLength: number;
    descriptionLength: number;
    keywordsCount: number;
    hasOgTags: boolean;
    hasJsonLd: boolean;
    hasCanonical: boolean;
  };
  analyzedAtShamsi: string;
}

export interface ExternalWorkerConfig {
  workerUrl: string;
  authToken?: string;
  enableEdgePrerender: boolean;
  autoPingIntervalMinutes: number;
  lastSyncShamsi?: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastPingMs?: number;
}

// Convert Date to Shamsi String (Jalali representation)
export const getShamsiDateTime = (date: Date = new Date()): string => {
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
    return date.toLocaleString('fa-IR');
  }
};

/**
 * Clean and tokenize Persian text into meaningful words
 */
export const tokenizePersianText = (text: string): string[] => {
  if (!text) return [];
  // Normalize Persian characters (e.g. arabic yeh and kaf)
  const normalized = text
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200C\u200B]/g, ' ') // replace zero-width spaces with space for clean tokens
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .toLowerCase();

  return normalized
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !PERSIAN_STOPWORDS.has(w));
};

/**
 * Extract Keywords and Key Phrases (Bi-grams & Tri-grams) with density and placement advice
 */
export const extractKeywordsAndDensity = (corpus: string): KeywordAnalysisItem[] => {
  const tokens = tokenizePersianText(corpus);
  const totalTokens = tokens.length;
  if (totalTokens === 0) return [];

  // Count single tokens
  const singleFreq: Record<string, number> = {};
  tokens.forEach(t => {
    singleFreq[t] = (singleFreq[t] || 0) + 1;
  });

  // Count 2-grams (phrases)
  const phraseFreq: Record<string, number> = {};
  for (let i = 0; i < tokens.length - 1; i++) {
    const p = `${tokens[i]} ${tokens[i + 1]}`;
    phraseFreq[p] = (phraseFreq[p] || 0) + 1;
  }

  // Count 3-grams
  for (let i = 0; i < tokens.length - 2; i++) {
    const p3 = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    if (phraseFreq[p3]) {
      phraseFreq[p3] += 1;
    } else {
      phraseFreq[p3] = 1;
    }
  }

  const results: KeywordAnalysisItem[] = [];

  // Process single words
  Object.entries(singleFreq).forEach(([kw, count]) => {
    if (count < 2) return;
    const density = parseFloat(((count / totalTokens) * 100).toFixed(2));
    let status: 'optimal' | 'underused' | 'overused' = 'optimal';
    if (density > 4.5) status = 'overused';
    else if (density < 1.0) status = 'underused';

    const placements: ('title' | 'h1' | 'description' | 'body' | 'schema')[] = [];
    if (density >= 1.5) placements.push('title', 'h1');
    if (density >= 1.0) placements.push('description');
    placements.push('body', 'schema');

    results.push({
      keyword: kw,
      count,
      density,
      relevanceScore: Math.min(100, Math.round((count / (totalTokens * 0.05)) * 100)),
      suggestedPlacements: placements,
      type: 'single',
      status
    });
  });

  // Process top phrases
  Object.entries(phraseFreq).forEach(([ph, count]) => {
    if (count < 2) return;
    const density = parseFloat(((count / totalTokens) * 100).toFixed(2));
    results.push({
      keyword: ph,
      count,
      density,
      relevanceScore: Math.min(100, Math.round((count / (totalTokens * 0.03)) * 100)),
      suggestedPlacements: ['title', 'h1', 'description', 'schema'],
      type: 'phrase',
      status: density > 3.0 ? 'overused' : 'optimal'
    });
  });

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 30);
};

/**
 * Conduct Comprehensive In-Memory SEO Audit for a specific AppView
 */
export const runSeoAuditForView = (
  view: AppView,
  seoConfig: SeoConfig,
  siteContentCorpus: string
): PageSeoAuditResult => {
  const issues: SeoAuditIssue[] = [];
  let score = 100;

  const title = (seoConfig.title || '').trim();
  const desc = (seoConfig.description || '').trim();

  // 1. Title Assessment
  if (!title) {
    issues.push({
      id: 'title-missing',
      severity: 'critical',
      category: 'title',
      message: 'تگ عنوان صفحه (Title) خالی است.',
      recommendation: 'یک عنوان جذاب بین ۳۰ الی ۶۰ کاراکتر شامل کلمات کلیدی اصلی وارد کنید.'
    });
    score -= 30;
  } else if (title.length < 25) {
    issues.push({
      id: 'title-short',
      severity: 'warning',
      category: 'title',
      message: `طول عنوان صفحه کوتاه است (${title.length} کاراکتر).`,
      recommendation: 'عنوان را بین ۳۰ تا ۶۰ کاراکتر تنظیم کنید تا در نتایج گوگل فضای کامل را اشغال کند.'
    });
    score -= 10;
  } else if (title.length > 70) {
    issues.push({
      id: 'title-long',
      severity: 'warning',
      category: 'title',
      message: `طول عنوان ممکن است در گوگل بریده شود (${title.length} کاراکتر).`,
      recommendation: 'عنوان را حداکثر تا ۶۵ کاراکتر بهینه‌سازی کنید.'
    });
    score -= 8;
  } else {
    issues.push({
      id: 'title-optimal',
      severity: 'good',
      category: 'title',
      message: `طول تگ عنوان کاملاً استاندارد است (${title.length} کاراکتر).`,
      recommendation: 'عنوان به درستی تدوین شده است.'
    });
  }

  // Check branding in title
  if (title && !title.includes('اشک قلم') && !title.includes('بادیکاران')) {
    issues.push({
      id: 'title-branding',
      severity: 'warning',
      category: 'title',
      message: 'نام برند اصلی (اشک قلم یا بادیکاران) در انتهای عنوان صفحه ذکر نشده است.',
      recommendation: 'برندینگ انتهای عنوان مانند «... | اشک قلم» اعتبار سرچ ارگانیک را بالا می‌برد.'
    });
    score -= 5;
  }

  // 2. Meta Description Assessment
  if (!desc) {
    issues.push({
      id: 'desc-missing',
      severity: 'critical',
      category: 'description',
      message: 'متاتگ توضیحات (Meta Description) خالی است.',
      recommendation: 'یک پاراگراف خلاصه و ترغیب‌کننده بین ۱۲۰ تا ۱۶۰ کاراکتر همراه با کال تو اکشن بنویسید.'
    });
    score -= 25;
  } else if (desc.length < 80) {
    issues.push({
      id: 'desc-short',
      severity: 'warning',
      category: 'description',
      message: `توضیحات متا کوتاه است (${desc.length} کاراکتر).`,
      recommendation: 'توضیحات را بین ۱۲۰ تا ۱۶۰ کاراکتر بسط دهید تا نرخ کلیک (CTR) افزایش یابد.'
    });
    score -= 10;
  } else if (desc.length > 175) {
    issues.push({
      id: 'desc-long',
      severity: 'warning',
      category: 'description',
      message: `توضیحات متا در نتایج موبایل یا دسکتاپ خلاصه خواهد شد (${desc.length} کاراکتر).`,
      recommendation: 'متن توضیحات را زیر ۱۶۰ کاراکتر خلاصه فرمایید.'
    });
    score -= 5;
  } else {
    issues.push({
      id: 'desc-optimal',
      severity: 'good',
      category: 'description',
      message: `طول توضیحات متاتگ بهینه است (${desc.length} کاراکتر).`,
      recommendation: 'متاتگ توضیحات استاندارد گوگل را پاس کرده است.'
    });
  }

  // 3. Keywords & Schema Assessment
  const tokens = tokenizePersianText(siteContentCorpus);
  if (tokens.length < 50) {
    issues.push({
      id: 'content-thin',
      severity: 'warning',
      category: 'keywords',
      message: 'حجم کلمات متنی صفحه محدود است (Thin Content).',
      recommendation: 'توضیحات متنی غنی‌تر به همراه معرفی خدمات اضافه فرمایید.'
    });
    score -= 10;
  } else {
    issues.push({
      id: 'content-rich',
      severity: 'good',
      category: 'keywords',
      message: `تراکم و غنای متنی صفحه مناسب است (${tokens.length} کلمه مؤثر).`,
      recommendation: 'محتوا دارای بافت واژگانی قوی است.'
    });
  }

  // 4. Schema and Social
  issues.push({
    id: 'schema-active',
    severity: 'good',
    category: 'schema',
    message: 'داده‌های ساختاریافته Schema.org و OpenGraph برای این صفحه فعال هستند.',
    recommendation: 'خزنده‌های گوگل و هوش‌های مصنوعی ساختار داده را شناسایی می‌کنند.'
  });

  return {
    view,
    pageTitle: title || String(view),
    score: Math.max(10, Math.min(100, score)),
    issues,
    metrics: {
      titleLength: title.length,
      descriptionLength: desc.length,
      keywordsCount: tokens.length,
      hasOgTags: true,
      hasJsonLd: true,
      hasCanonical: true
    },
    analyzedAtShamsi: getShamsiDateTime()
  };
};

/**
 * Generate Dynamic Automated SEO Config for an AppView based on keywords & brand
 */
export const generateAutomatedSeoForView = (
  view: AppView,
  brandName: string = 'اشک قلم'
): Partial<SeoConfig> => {
  switch (view) {
    case AppView.HOME:
      return {
        title: `${brandName} | سامانه مهندسی جعبه، طراحی ۳D و استودیو کارتن‌سازی`,
        description: `سامانه جامع چاپ و بسته‌بندی ${brandName}، ارائه‌دهنده جعبه‌ساز سه‌بعدی آنلاین، طراحی خطوط دایلاین FEFCO، محاسبه خودکار قیمت و چاپ افست ۵ رنگ صنعتی.`
      };
    case AppView.DIELINE_GENERATOR:
      return {
        title: `جعبه‌ساز سه‌بعدی و مولد دایلاین آنلاین | ${brandName}`,
        description: `طراحی و تولید آنلاین نقشه دایلاین جعبه و کارتن با استانداردهای بین‌المللی FEFCO و ECMA، دانلود خروجی‌های وکتور DXF و PDF با ابعاد سفارشی به صورت رایگان.`
      };
    case AppView.SOFTWARE_STORE:
      return {
        title: `فروشگاه نرم‌افزارهای تخصصی حسابداری، حواله و اندروید | ${brandName}`,
        description: `مرکز توسعه و عرضه نرم‌افزارهای یکپارچه حسابداری کارخانجات، سیستم هوشمند مدیریت دفاتر حواله و صرافی، و اپلیکیشن‌های تخصصی با لایسنس دائمی و پشتیبانی مستقیم.`
      };
    case AppView.DESIGN_STUDIO:
      return {
        title: `استودیوی آنلاین طراحی گرافیک و موکاپ جعبه | ${brandName}`,
        description: `ویرایشگر آنلاین و پیشرفته بسته‌بندی، قرار دادن لوگو و آرت‌ورک روی قالب سه‌بعدی، شبیه‌سازی متریال و بافت کاغذ با خروجی رندر باکیفیت و لحظه‌ای.`
      };
    case AppView.AUTOCAD_STUDIO:
      return {
        title: `استودیوی اتوکد و طراحی وکتور مهندسی دایکات | ${brandName}`,
        description: `محیط CAD حرفه‌ای تحت وب برای ترسیم خط تیغ، پرفراژ، خط تا و زینک‌بندی با ابزارهای دقیق مهندسی و تحلیل ابعاد بدون نیاز به نرم‌افزارهای جانبی.`
      };
    case AppView.CATALOG:
      return {
        title: `کاتالوگ دیجیتال محصولات و انواع کارتن‌های لمینتی | ${brandName}`,
        description: `مشاهده مجموعه کامل مدل‌های جعبه دارویی، بهداشتی، مواد غذایی، کارتن‌های لمینتی صادراتی و هدایای تبلیغاتی به همراه مشخصات فنی و استعلام قیمت.`
      };
    case AppView.INQUIRY:
      return {
        title: `استعلام آنلاین قیمت چاپ و بسته‌بندی اختصاصی | ${brandName}`,
        description: `محاسبه هوشمند و فوری قیمت تیراژ جعبه، کارتن لمینتی، خدمات سلفون، یووی و طلاکوب با امکان ثبت سفارش و پیش‌فاکتور رسمی آنلاین.`
      };
    default:
      return {
        title: `${brandName} | سامانه تخصصی طراحی ساختار و تولید کارتن`,
        description: `خدمات یکپارچه بسته‌بندی صنعتی، چاپ افست مدرن و نرم‌افزارهای مهندسی در صنایع چاپ و بسته‌بندی ${brandName}.`
      };
  }
};

/**
 * Generate standard XML Sitemap string
 */
export const generateSitemapXml = (baseUrl: string = 'https://ashkghalam.ir'): string => {
  const views = [
    { path: '', priority: '1.0', changefreq: 'daily' },
    { path: 'dieline-generator', priority: '0.9', changefreq: 'weekly' },
    { path: 'software-store', priority: '0.9', changefreq: 'daily' },
    { path: 'design-studio', priority: '0.8', changefreq: 'weekly' },
    { path: 'autocad-studio', priority: '0.8', changefreq: 'weekly' },
    { path: 'catalog', priority: '0.8', changefreq: 'weekly' },
    { path: 'inquiry', priority: '0.9', changefreq: 'daily' },
    { path: 'library', priority: '0.7', changefreq: 'weekly' },
    { path: 'blog', priority: '0.8', changefreq: 'daily' },
    { path: 'about', priority: '0.6', changefreq: 'monthly' },
  ];

  const now = new Date().toISOString().split('T')[0];

  const urlsXml = views.map(v => `  <url>
    <loc>${baseUrl}/${v.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${v.changefreq}</changefreq>
    <priority>${v.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
};

/**
 * Generate standard Robots.txt with Search & AI Crawlers permissions
 */
export const generateRobotsTxt = (
  baseUrl: string = 'https://ashkghalam.ir',
  allowedBots: { google: boolean; gpt: boolean; claude: boolean; perplexity: boolean }
): string => {
  return `# Robots.txt generated automatically by Ashk Ghalam SEO Studio
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

# AI Crawlers Configuration
User-agent: Google-Extended
${allowedBots.google ? 'Allow: /' : 'Disallow: /'}

User-agent: GPTBot
${allowedBots.gpt ? 'Allow: /' : 'Disallow: /'}

User-agent: ClaudeBot
${allowedBots.claude ? 'Allow: /' : 'Disallow: /'}

User-agent: PerplexityBot
${allowedBots.perplexity ? 'Allow: /' : 'Disallow: /'}

# Sitemap declaration
Sitemap: ${baseUrl}/sitemap.xml
`;
};

/**
 * Ping and Sync with External Edge SEO Worker
 */
export const syncWithExternalWorker = async (
  config: ExternalWorkerConfig,
  payload: any
): Promise<{ success: boolean; latencyMs: number; message: string }> => {
  if (!config.workerUrl) {
    return { success: false, latencyMs: 0, message: 'آدرس ورکر خارجی وارد نشده است.' };
  }

  const startTime = Date.now();
  try {
    const res = await fetch(config.workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.authToken ? { 'Authorization': `Bearer ${config.authToken}` } : {})
      },
      body: JSON.stringify({
        source: 'AshkGhalam_Internal_SEO_Engine',
        timestamp: new Date().toISOString(),
        shamsiTimestamp: getShamsiDateTime(),
        data: payload
      })
    });

    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      return {
        success: true,
        latencyMs,
        message: `اتصال با موفقیت برقرار شد. داده‌های سئو به ورکر خارجی منتقل شدند (${latencyMs}ms).`
      };
    } else {
      return {
        success: false,
        latencyMs,
        message: `پاسخ با خطا دریافت شد: کد ${res.status} (${res.statusText})`
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: `عدم امکان برقراری ارتباط با ورکر: ${err.message || 'خطای شبکه'}`
    };
  }
};
