import React from 'react';
import { Card, Button, Badge } from './UIComponents';
import { BookOpen, CheckCircle2, Server, Cpu, Globe, Terminal, Shield, Workflow, ExternalLink } from 'lucide-react';

export const CPanelSeoGuideModal: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  return (
    <div className="space-y-6 dir-rtl text-right font-sans">
      <Card className="p-6 md:p-8 bg-slate-900/90 border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white">راهنمای جامع راه‌اندازی و استفاده از ایجنت سئو و محتوا روی هاست cPanel ایران</h2>
              <p className="text-xs text-slate-400 mt-1">معماری ۱۰۰٪ بهینه برای هاست‌های اشتراکی ۳ گیگابایت رم با پایدارترین روش دور زدن تحریم‌ها</p>
            </div>
          </div>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
              ✕ بستن راهنما
            </Button>
          )}
        </div>

        <div className="space-y-8 text-xs md:text-sm text-slate-300 leading-relaxed">
          {/* Section 1: Architecture Summary */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <Server className="w-4 h-4" />
              ۱. معماری سیستم بر روی هاست cPanel ۳ گیگابایتی
            </h3>
            <p className="text-slate-400">
              با توجه به اینکه مدل‌های سنگین هوش مصنوعی محلی (مثل Ollama) روی هاست‌های اشتراکی سی‌پنل باعث خطای کمبود رم (OOM) می‌شوند، این سیستم از یک معماری <strong>Hybrid Worker & Free-Tier API Router</strong> استفاده می‌کند:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pr-2">
              <li><strong>ممیزی سئو، ساخت نقشه سایت و robots.txt:</strong> کاملاً آفلاین و سریع در کمتر از ۲ مگابایت رم با کتابخانه Cheerio.</li>
              <li><strong>تشخیص محتوای تکراری و کانیبالیزیشن:</strong> الگوریتم Jaccard/Shingle فارسی (بدون نیاز به مدل‌های Embedding سنگین).</li>
              <li><strong>تولید مقالات E-E-A-T:</strong> استفاده از روتر رایگان سرور‌ساید (Gemini 4 Hydrogen، OpenRouter DeepSeek V3 رایگان، و Groq Llama 3.3).</li>
            </ul>
          </div>

          {/* Section 2: GitHub Actions Workflow */}
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <h3 className="text-base font-bold text-sky-400 flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              ۲. دور زدن تحریم‌ها با GitHub Actions (بدون فشار به هاست ایران)
            </h3>
            <p className="text-slate-400">
              از آنجا که بسیاری از سرویس‌های هوش مصنوعی و ایندکس‌سازی ممکن است آی‌پی‌های دیتاسنترهای ایران را محدود کنند، ما یک ربات رایگان در <strong>GitHub Actions</strong> (`.github/workflows/seo-agent.yml`) قرار داده‌ایم که وظایف سنگین را در سرورهای خارج انجام داده و خروجی تاییدشده را از طریق یک وب‌هوک امن به هاست cPanel شما ارسال می‌کند.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 font-mono text-[11px] text-sky-300" dir="ltr">
              <p># GitHub Repository Secrets مورد نیاز:</p>
              <p>SITE_BASE_URL = https://ashkghalam.ir</p>
              <p>REMOTE_INGEST_URL = https://ashkghalam.ir/api/agent/ingest</p>
              <p>AGENT_INGEST_SECRET = (یک رمز تصادفی طولانی)</p>
              <p>GEMINI_API_KEY / OPENROUTER_API_KEY / GROQ_API_KEY</p>
            </div>
          </div>

          {/* Section 3: cPanel Setup Steps */}
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              ۳. مراحل مستقر کردن برنامه روی هاست معمولی cPanel (بدون نیاز به Node.js)
            </h3>
            <ol className="list-decimal list-inside space-y-2 pr-2 text-slate-300">
              <li>
                بسته زیپ خروجی را از پنل مدیریت دانلود کرده و مستقیماً در پوشه <code className="text-amber-300" dir="ltr">public_html</code> در File Manager هاست cPanel استخراج (Extract) کنید.
              </li>
              <li>
                فایل‌های <code className="text-amber-300" dir="ltr">index.html</code>، <code className="text-amber-300" dir="ltr">api.php</code>، <code className="text-amber-300" dir="ltr">.htaccess</code> و فایل‌های JSON اطلاعات در ریشه دامنه قرار می‌گیرند.
              </li>
              <li>
                اطمینان حاصل کنید پوشه <code className="text-amber-300" dir="ltr">uploads/flipbooks</code> و فایل‌های <code className="text-amber-300" dir="ltr">.json</code> مجوز نوشتن استاندارد (<code dir="ltr">0755</code> برای پوشه و <code dir="ltr">0644</code> برای فایل‌ها) داشته باشند تا کاتالوگ‌ها و تصاویر بدون خطا ذخیره شوند.
              </li>
              <li>
                نیازی به اجرای هیچ دستور ترمینال یا سرویس جانبی نیست؛ تمام مسیرهای <code dir="ltr">/api/*</code> به صورت خودکار توسط <code dir="ltr">.htaccess</code> به <code dir="ltr">api.php</code> هدایت می‌شوند.
              </li>
            </ol>
          </div>

          {/* Section 4: Manual Web AI Import */}
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <h3 className="text-base font-bold text-purple-400 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              ۴. استفاده از وب ChatGPT / DeepSeek شخصی (بدون نیاز به API Key)
            </h3>
            <p className="text-slate-400">
              اگر ترجیح می‌دهید مقالات با اکانت وب شخصی خودتان تولید شوند:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pr-2">
              <li>در تب <strong>استودیوی سئو و ورکر محتوا</strong>، روی دکمه «کپی پرامپت» کلیک کنید.</li>
              <li>آن را در چت ChatGPT یا DeepSeek وب پیست کنید.</li>
              <li>خروجی JSON تولیدشده را در کادر پایین صفحه پیست کرده و دکمه «بررسی کیفیت و ذخیره» را بزنید.</li>
              <li>سیستم به صورت اتوماتیک از فیلتر تشابه فارسی و ساختار E-E-A-T عبور کرده و مقاله را در **صف تایید پیش‌نویس‌ها** قرار می‌دهد.</li>
            </ul>
          </div>

          {/* Section 5: IndexNow & Sitemap */}
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <h3 className="text-base font-bold text-indigo-400 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              ۵. ایندکس آنی در موتورهای جستجو (IndexNow)
            </h3>
            <p className="text-slate-400">
              با هر بار انتشار مقاله جدید یا تایید پیش‌نویس، سیستم به صورت خودکار از طریق پروتکل <strong>IndexNow</strong> به موتورهای جستجوی Bing، Yandex و دیگر موتورهای حامی پینگ می‌زند تا صفحات جدید در چند ثانیه ایندکس شوند. نقشه سایت زنده شما نیز همیشه در آدرس <code className="text-indigo-300">/sitemap.xml</code> در دسترس خزنده‌هاست.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
