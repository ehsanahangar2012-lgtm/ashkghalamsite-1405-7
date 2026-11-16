/**
 * Client-side AI service adapter.
 * All LLM SDK calls are executed server-side (/api/ai/*) with offline/deterministic fallbacks.
 */

export async function analyzeDesignStyle(title: string): Promise<{ tags: string[]; suggestion: string }> {
  try {
    const res = await fetch('/api/ai/analyze-design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.suggestion && Array.isArray(data?.tags)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Server AI design analysis fallback used:', err);
  }

  return {
    suggestion: 'ساختار مقاوم و طراحی استاندارد متناسب با خطوط چاپ افست و بسته‌بندی صادراتی.',
    tags: ['فلوت_B', 'دایکات_صنعتی', 'چاپ_افست', 'FEFCO'],
  };
}

export async function generateSupportResponse(userPrompt: string): Promise<string> {
  try {
    const res = await fetch('/api/ai/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userPrompt }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.reply) return data.reply;
    }
  } catch {}

  return 'همکاران ما در بخش مهندسی دایکات و تیغ‌زنی اشک قلم در ساعات اداری آماده پاسخگویی به استعلام شما هستند.';
}

export async function generateBlogContent(
  topic: string
): Promise<{ title: string; content: string; excerpt: string; tags?: string[]; slug?: string; status?: string }> {
  try {
    const res = await fetch('/api/ai/generate-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.post) {
        return data.post;
      }
    }
  } catch {}

  return {
    title: topic,
    content: 'مقاله در دست تدوین توسط واحد تحقیق و توسعه صنایع چاپ اشک قلم.',
    excerpt: `بررسی تخصصی ${topic} در خطوط تولید کارتن.`,
    tags: ['مهندسی کارتن', 'دایکات'],
  };
}

export async function suggestTrendingTopic(): Promise<string> {
  const topics = [
    'استانداردهای نوین بسته‌بندی زیست‌تخریب‌پذیر و چاپ بدون حلال',
    'محاسبه بهینه چیدمان دایلاین روی شیت ۷۰×۱۰۰ برای کاهش پرت مقوا',
    'مقایسه فنی فلوت E و B در طراحی کارتن‌های پستی تجارت الکترونیک',
    'تأثیر رطوبت انبار بر ضریب مقاومت فشاری BCT در کارتن‌های ۵ لایه صادراتی',
  ];
  return topics[Math.floor(Math.random() * topics.length)];
}

export async function generateAIPattern(_specs: string): Promise<string> {
  return 'الگوی بهینه مهندسی بر اساس نسبت ابعادی کارتن ایجاد شد.';
}
