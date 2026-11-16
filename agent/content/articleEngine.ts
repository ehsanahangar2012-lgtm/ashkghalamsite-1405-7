import fs from 'fs';
import { AGENT_CONFIG } from '../config';
import { AgentBlogPost } from '../types';
import { generateJsonWithFreeRouter, GeminiSchemaType } from '../llm/freeRouter';
import { findMaxSimilarityWithPosts } from './persianSimilarity';
import { logger } from '../utils/logger';

export interface RawArticleDraft {
  topic: string;
  focusKeyword: string;
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  tags: string[];
}

export function loadPosts(): AgentBlogPost[] {
  if (!fs.existsSync(AGENT_CONFIG.paths.postsFile)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(AGENT_CONFIG.paths.postsFile, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePosts(posts: AgentBlogPost[]): void {
  fs.writeFileSync(AGENT_CONFIG.paths.postsFile, JSON.stringify(posts, null, 2), 'utf-8');
}

function loadCatalogSummaries(): string[] {
  if (!fs.existsSync(AGENT_CONFIG.paths.catalogsFile)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(AGENT_CONFIG.paths.catalogsFile, 'utf-8'));
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 15).map((c: any) => `${c.title} (${c.category || 'بسته‌بندی'})`);
  } catch {
    return [];
  }
}

export function buildManualPromptPack(customTopic?: string): {
  prompt: string;
  existingTitlesCount: number;
  catalogsCount: number;
} {
  const posts = loadPosts();
  const catalogNames = loadCatalogSummaries();
  const existingTitles = posts.slice(0, 30).map((p) => p.title);

  const prompt = `تو مهندس ارشد صنایع چاپ، کارتن‌سازی، طراحی قالب دایکات و سئوکار فنی مجموعه «اشک قلم» هستی.
${customTopic ? `موضوع درخواستی: «${customTopic}»` : 'بر اساس شکاف محتوایی، یک موضوع تازه و تخصصی B2B انتخاب کن.'}

محصولات و کاتالوگ‌های سایت:
${JSON.stringify(catalogNames, null, 2)}

مقالات قبلی سایت (موضوع تکراری ننویس):
${JSON.stringify(existingTitles, null, 2)}

قوانین نگارش (مطابق اصول E-E-A-T گوگل):
1. زبان فارسی تخصصی و شفاف با توضیح دقیق اصطلاحات فنی (FEFCO، BCT، ECT، GSM، چاپ افست و فلوتینگ).
2. ساختار Markdown با حداقل ۴ هدینگ ## و زیرعنوان‌های ###، چک‌لیست کاربردی و بولت‌پوینت.
3. طول مقاله بین ۸۰۰ تا ۱۲۰۰ کلمه محتوای مفید بدون حاشیه و آمار جعلی.
4. لینک‌سازی داخلی طبیعی به مسیرهای واقعی سایت: [طراحی آنلاین دایلاین](/tools/dieline)، [مشاهده کاتالوگ محصولات](/catalog) و [ثبت استعلام قیمت](/inquiry).

خروجی را دقیقاً و فقط به صورت یک آبجکت JSON معتبر برگردان:
{
  "topic": "موضوع انتخاب‌شده",
  "focusKeyword": "کلمه کلیدی اصلی",
  "title": "عنوان جذاب ۵۰ تا ۶۵ کاراکتری",
  "slug": "english-or-persian-kebab-case-slug",
  "excerpt": "چکیده دو جمله‌ای",
  "metaTitle": "عنوان متا تا ۶۰ کاراکتر | اشک قلم",
  "metaDescription": "توضیحات متا ۱۲۰ تا ۱۵۵ کاراکتر",
  "content": "متن کامل Markdown مقاله",
  "tags": ["تگ۱", "تگ۲", "تگ۳"]
}`;

  return {
    prompt,
    existingTitlesCount: existingTitles.length,
    catalogsCount: catalogNames.length,
  };
}

function buildDeterministicFallbackDraft(customTopic?: string): RawArticleDraft {
  const catalogs = loadCatalogSummaries();
  const topic =
    customTopic?.trim() ||
    'اصول مهندسی انتخاب گرماژ مقوا، نوع فلوت و چیدمان بهینه فرم چاپی در تیراژ صنعتی';
  const slug = `packaging-engineering-guide-${Date.now().toString(36)}`;

  return {
    topic,
    focusKeyword: 'مهندسی کارتن و چیدمان شیت',
    title: `${topic} | راهنمای فنی اشک قلم`,
    slug,
    excerpt:
      'بررسی دقیق پارامترهای انتخاب گرماژ ایندربرد و کرافت، فلوتینگ استاندارد و کاهش پرت شیت در خطوط چاپ افست و دایکات صنعتی.',
    metaTitle: 'اصول انتخاب گرماژ مقوا و فلوتینگ کارتن | اشک قلم',
    metaDescription:
      'راهنمای تخصصی انتخاب گرماژ کاغذ، استاندارد FEFCO و کاهش ضایعات شیت در تولید جعبه و کارتن صادراتی در سامانه مهندسی اشک قلم.',
    content: `## مقدمه و اهمیت محاسبات مهندسی در سفارش کارتن
انتخاب صحیح متریال، گرماژ (GSM) و چیدمان قالب روی شیت چاپ، دو عامل تعیین‌کننده در قیمت تمام‌شده و استحکام نهایی بسته‌بندی هستند. در خطوط تولید مدرن، استفاده از داده‌های واقعی ماشین چاپ و [طراحی آنلاین دایلاین](/tools/dieline) از بروز خطای برش و تیغ‌زنی جلوگیری می‌کند.

## معیارهای انتخاب مقوا و کارتن (ایندربرد، کرافت و پشت‌طوسی)
- **مقوای ایندربرد بهداشتی (SBS):** مناسب بسته‌بندی دارویی، آرایشی و غذایی با گرماژ متداول ۲۵۰ تا ۳۵۰ گرم بر مترمربع.
- **کرافت قهوه‌ای وارداتی:** مقاومت کششی بالا برای کارتن‌های صادراتی و جعبه‌های پستی خودبست.
- **پشت‌طوسی (Duplex):** گزینه اقتصادی برای بسته‌بندی‌های عمومی و کارتن‌های چندلایه لمینت‌شده.

## کنترل پرت شیت و لبه پنجه (Gripper Margin)
در محاسبه فرم‌بندی روی شیت‌های استاندارد ۷۰×۱۰۰ یا ۶۰×۹۰ سانتی‌متر، در نظر گرفتن لبه پنجه ماشین چاپ و فاصله ایمن بین تیغ‌های دایکات ضروری است. جهت بررسی نمونه‌های استاندارد می‌توانید به بخش [مشاهده کاتالوگ محصولات](/catalog) مراجعه کنید.

## چک‌لیست کنترل کیفیت پیش از ارسال به تولید
- تطابق ابعاد داخلی و خارجی جعبه با ضخامت فلوت (B، C یا E-Flute)
- بررسی مقاومت فشاری ستونی (BCT) متناسب با رطوبت انبار
- انتخاب روکش سلفون مات، براق یا یووی موضعی متناسب با کاربری محصول
- استعلام دقیق تیراژ و هزینه زینک از طریق [ثبت استعلام قیمت](/inquiry)

${catalogs.length ? `### دسته‌بندی‌های مرتبط در کاتالوگ\n${catalogs.slice(0, 4).map((c) => `- ${c}`).join('\n')}` : ''}`,
    tags: ['مهندسی کارتن', 'دایکات', 'FEFCO', 'چاپ افست'],
  };
}

export function validateAndPackageDraft(
  draft: RawArticleDraft,
  options: { source: 'ai-auto' | 'manual-web-llm'; providerUsed: string }
): { post: AgentBlogPost; rejectedReason?: string } {
  const existingPosts = loadPosts();
  const sim = findMaxSimilarityWithPosts(draft.title || '', draft.content || '', existingPosts);
  const words = String(draft.content || '').split(/\s+/).filter(Boolean).length;
  const notes: string[] = [];

  if (words < AGENT_CONFIG.quality.minWordCount) {
    notes.push(`تعداد کلمات (${words}) کمتر از حد استاندارد (${AGENT_CONFIG.quality.minWordCount}) است.`);
  }
  if (!String(draft.content || '').includes('## ')) {
    notes.push('ساختار هدینگ ## در مقاله وجود ندارد.');
  }
  if (sim.maxContentSimilarity >= AGENT_CONFIG.quality.maxContentSimilarity) {
    notes.push(`تشابه محتوایی بالا (${Math.round(sim.maxContentSimilarity * 100)}%) با «${sim.matchedTitle}».`);
  }
  if (sim.maxTitleSimilarity >= AGENT_CONFIG.quality.maxTitleSimilarity) {
    notes.push('عنوان مقاله بیش از حد شبیه یکی از مقالات موجود است.');
  }

  let score = 92;
  if (words < AGENT_CONFIG.quality.minWordCount) score -= 28;
  if (!String(draft.content || '').includes('## ')) score -= 18;
  if (!String(draft.content || '').includes('](')) score -= 8;
  if ((draft.metaDescription || '').length < 80) score -= 8;
  score -= Math.round(sim.maxContentSimilarity * 45);
  score = Math.max(0, Math.min(100, score));

  const isDuplicate =
    sim.maxContentSimilarity >= AGENT_CONFIG.quality.maxContentSimilarity ||
    sim.maxTitleSimilarity >= AGENT_CONFIG.quality.maxTitleSimilarity;

  const passed = !isDuplicate && score >= AGENT_CONFIG.quality.minDraftScore;
  const shouldAutoPublish =
    passed &&
    options.source === 'ai-auto' &&
    AGENT_CONFIG.quality.autoPublish &&
    score >= AGENT_CONFIG.quality.minPublishScore &&
    notes.length === 0;

  const cleanSlug =
    (draft.slug || draft.title || `post-${Date.now()}`)
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\p{L}\p{N}-]+/gu, '')
      .replace(/^-+|-+$/g, '') || `post-${Date.now()}`;

  const nowIso = new Date().toISOString();
  const canonicalPath = `/blog/${cleanSlug}`;

  const post: AgentBlogPost = {
    id: `ai-post-${Date.now()}`,
    slug: cleanSlug,
    title: draft.title,
    excerpt: draft.excerpt,
    content: draft.content,
    author: AGENT_CONFIG.site.defaultAuthor,
    date: new Date().toLocaleDateString('fa-IR'),
    createdAtIso: nowIso,
    tags: Array.isArray(draft.tags) && draft.tags.length > 0 ? draft.tags.slice(0, 5) : ['مهندسی کارتن'],
    readTime: Math.max(4, Math.ceil(words / 180)),
    status: !passed ? 'rejected' : shouldAutoPublish ? 'published' : 'draft',
    language: 'fa',
    source: options.source,
    seo: {
      metaTitle: draft.metaTitle || `${draft.title} | ${AGENT_CONFIG.site.brandName}`,
      metaDescription: draft.metaDescription || draft.excerpt,
      focusKeyword: draft.focusKeyword || draft.tags?.[0] || 'کارتن و بسته‌بندی',
      canonicalPath,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: draft.title,
        description: draft.metaDescription || draft.excerpt,
        author: { '@type': 'Organization', name: AGENT_CONFIG.site.brandName },
        publisher: { '@type': 'Organization', name: AGENT_CONFIG.site.brandName },
        datePublished: nowIso,
        mainEntityOfPage: `${AGENT_CONFIG.site.baseUrl}${canonicalPath}`,
        inLanguage: 'fa-IR',
      },
    },
    qualityReport: {
      score,
      wordCount: words,
      maxContentSimilarity: sim.maxContentSimilarity,
      maxTitleSimilarity: sim.maxTitleSimilarity,
      passed,
      notes,
      providerUsed: options.providerUsed,
    },
  };

  return {
    post,
    rejectedReason: passed ? undefined : notes.join(' | ') || 'امتیاز کیفیت کافی نبود.',
  };
}

export async function generateArticleViaWorker(customTopic?: string): Promise<AgentBlogPost> {
  const { prompt } = buildManualPromptPack(customTopic);

  let draft: RawArticleDraft;
  let providerUsed = 'offline-engineering-fallback';

  try {
    const schema = {
      type: GeminiSchemaType.OBJECT,
      properties: {
        topic: { type: GeminiSchemaType.STRING },
        focusKeyword: { type: GeminiSchemaType.STRING },
        title: { type: GeminiSchemaType.STRING },
        slug: { type: GeminiSchemaType.STRING },
        excerpt: { type: GeminiSchemaType.STRING },
        metaTitle: { type: GeminiSchemaType.STRING },
        metaDescription: { type: GeminiSchemaType.STRING },
        content: { type: GeminiSchemaType.STRING },
        tags: { type: GeminiSchemaType.ARRAY, items: { type: GeminiSchemaType.STRING } },
      },
      required: ['topic', 'focusKeyword', 'title', 'slug', 'excerpt', 'metaTitle', 'metaDescription', 'content', 'tags'],
    };

    const res = await generateJsonWithFreeRouter<RawArticleDraft>(
      [
        {
          role: 'system',
          content: 'You are an expert Persian industrial packaging engineer and technical SEO writer.',
        },
        { role: 'user', content: prompt },
      ],
      schema
    );
    draft = res.data;
    providerUsed = res.provider;
  } catch (err) {
    logger.warn('ArticleEngine', 'External free LLM unavailable, using deterministic engineering template', {
      reason: err instanceof Error ? err.message : String(err),
    });
    draft = buildDeterministicFallbackDraft(customTopic);
  }

  const { post, rejectedReason } = validateAndPackageDraft(draft, {
    source: 'ai-auto',
    providerUsed,
  });

  if (rejectedReason) {
    logger.warn('ArticleEngine', `Generated article marked rejected: ${rejectedReason}`);
  } else {
    const existing = loadPosts();
    savePosts([post, ...existing]);
    logger.info('ArticleEngine', `Article saved as [${post.status}] (${post.title}) via ${providerUsed}`);
  }

  return post;
}
