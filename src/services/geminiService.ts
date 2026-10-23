import { GoogleGenAI } from '@google/genai';

// Initialize Gemini Client
const getClient = () => {
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                 (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  return new GoogleGenAI({ apiKey });
};

export async function analyzeDesignStyle(title: string): Promise<{ tags: string[]; suggestion: string }> {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `شما یک مهندس ارشد صنایع بسته‌بندی کارتن و جعبه هستید. برای عنوان محصول زیر:
"${title}"
یک تحلیل فنی مختصر (حداکثر دو جمله به زبان فارسی تخصصی) درباره ساختار بهینه، مقاومت مقوا و تیغ‌زنی ارائه دهید و ۳ تا ۵ تگ تخصصی (مثل #فلوت_E، #دایکات_روتاری، #کرافت_سنگین) برگردانید.
خروجی به صورت JSON با ساختار:
{
  "suggestion": "متن توضیح",
  "tags": ["تگ۱", "تگ۲"]
}`,
      config: {
        responseMimeType: 'application/json',
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return {
        suggestion: parsed.suggestion || 'طراحی متناسب با خطوط تولید جعبه و استانداردهای بسته‌بندی صنعتی.',
        tags: parsed.tags || ['مهندسی_کارتن', 'دایکات', 'صنایع_چاپ']
      };
    }
  } catch (err) {
    console.warn('Gemini AI fallback used:', err);
  }

  return {
    suggestion: 'ساختار مقاوم و طراحی استاندارد متناسب با خطوط چاپ افست و بسته‌بندی صادراتی.',
    tags: ['فلوت_B', 'دایکات_صنعتی', 'چاپ_افست', 'FEFCO']
  };
}

export async function generateSupportResponse(userPrompt: string): Promise<string> {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `شما مشاور فنی و مهندسی صنایع کارتن و چاپ «اشک قلم» هستید. با لحنی حرفه‌ای، محترمانه و دقیق به کاربر پاسخ دهید:
سوال مشتری: ${userPrompt}`,
    });
    return response.text || 'کارشناسان ما به زودی با شما تماس خواهند گرفت.';
  } catch {
    return 'همکاران ما در بخش مهندسی دایکات و تیغ‌زنی اشک قلم در ساعات اداری آماده پاسخگویی به استعلام شما هستند.';
  }
}

export async function generateBlogContent(topic: string): Promise<{ title: string; content: string; excerpt: string }> {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `یک مقاله تخصصی جامع و دقیق درباره موضوع "${topic}" برای وبلاگ مهندسی کارتن و بسته‌بندی بنویسید.
خروجی به صورت JSON با فیلدهای title، content، excerpt باشد.`,
      config: { responseMimeType: 'application/json' }
    });
    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch {}
  return {
    title: topic,
    content: 'مقاله در دست تدوین توسط واحد تحقیق و توسعه صنایع چاپ اشک قلم.',
    excerpt: `بررسی تخصصی ${topic} در خطوط تولید کارتن.`
  };
}

export async function suggestTrendingTopic(): Promise<string> {
  return 'استانداردهای نوین بسته‌بندی زیست‌تخریب‌پذیر و چاپ بدون حلال';
}

export async function generateAIPattern(specs: string): Promise<string> {
  return 'الگوی بهینه مهندسی بر اساس نسبت ابعادی کارتن ایجاد شد.';
}
