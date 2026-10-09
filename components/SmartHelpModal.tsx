import React, { useState } from 'react';
import { HelpCircle, X, Search, BookOpen, Lightbulb, CheckCircle, Smartphone, Calculator, Coins, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SmartHelpProps {
  sectionTitle: string;
  sectionKey: string;
  description?: string;
  tips?: string[];
  faq?: { q: string; a: string }[];
  className?: string;
}

export const SmartHelpButton: React.FC<SmartHelpProps> = ({
  sectionTitle,
  sectionKey,
  description,
  tips = [],
  faq = [],
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Built-in intelligent offline guides
  const defaultGuides: Record<string, { desc: string; tips: string[]; faq: { q: string; a: string }[] }> = {
    software_store: {
      desc: "مرکز فروش و عرضه نرم‌افزارهای تخصصی حسابداری، سامانه‌های ارزی و حواله و اپلیکیشن‌های کاربردی اندروید اشک قلم. تمامی نرم‌افزارها دارای موتورهای آفلاین، تضمین پایداری و بدون وابستگی به اینترنت خارجی طراحی شده‌اند.",
      tips: [
        "برای نرم‌افزارهای رایگان پایه، تنها با عضویت یا ثبت‌نام در سامانه لینک دانلود مستقیم فعال می‌گردد.",
        "برای نرم‌افزارهای نیازمند لایسنس، پس از ثبت درخواست، کد فعال‌سازی آنی دریافت می‌کنید.",
        "تمامی نسخه‌های اندروید به فرمت مستقیم APK و بدون نیاز به استورهای مسدودشده عرضه می‌شوند.",
        "جهت مشاهده کاتالوگ تصویری و ویژگی‌های فنی، روی دکمه 'کاتالوگ و مشخصات' هر محصول کلیک فرمایید."
      ],
      faq: [
        {
          q: "آیا نرم‌افزارها بدون اینترنت در ایران کار می‌کنند؟",
          a: "بله، ۱۰۰٪ ساختار پایگاه داده و موتور پردازش به صورت آفلاین روی ویندوز یا حافظه دستگاه اندروید نصب و اجرا می‌شود."
        },
        {
          q: "نحوه دریافت لایسنس و فعال‌سازی چگونه است؟",
          a: "از طریق دکمه 'دریافت لایسنس آنلاین' اطلاعات خود را وارد کنید؛ سیستم یک کلید لایسنس اختصاصی صادر می‌کند که در نرم‌افزار وارد می‌شود."
        },
        {
          q: "آیا امکان اتصال اپلیکیشن اندروید به کامپیوتر وجود دارد؟",
          a: "بله، اپلیکیشن‌های اندروید اشک از طریق شبکه Wi-Fi محلی بدون نیاز به اینترنت با نسخه ویندوز سینک می‌شوند."
        }
      ]
    },
    floating_welcome: {
      desc: "سامانه اطلاع‌رسانی و دسترسی سریع به آخرین دستاوردهای IT اشک قلم، شامل سامانه‌های مالی، حواله‌جات ارزی و برنامه‌های اندرویدی.",
      tips: [
        "با کلیک روی دکمه 'فروشگاه نرم‌افزار' مستقیماً به محیط ویترین محصولات هدایت می‌شوید.",
        "این پنجره بر اساس وضعیت ذخیره‌سازی محلی پس از بسته شدن تا ورود مجدد پنهان می‌ماند."
      ],
      faq: [
        {
          q: "چگونه به بخش دانلودها دسترسی پیدا کنم؟",
          a: "با کلیک روی دکمه کاتالوگ نرم‌افزارها در همین پنجره یا منوی بالای سایت به مخزن دانلود منتقل می‌شوید."
        }
      ]
    },
    admin_software: {
      desc: "پنل مدیریت بک‌اند جهت تعریف، ویرایش و انتشار نرم‌افزارهای جدید، بارگذاری کاتالوگ‌های تصویری و متنی و صدور لایسنس.",
      tips: [
        "شرط دانلود را می‌توانید بین رایگان، نیاز به ثبت‌نام یا نیاز به خرید لایسنس تعیین فرمایید.",
        "صفحات کاتالوگ متنی و تصویری به همراه آمار بازخورد برای خریداران به نمایش درمی‌آید."
      ],
      faq: [
        {
          q: "لایسنس‌ها چگونه اعتبارسنجی می‌شوند؟",
          a: "توسط الگوریتم هش رمزنگاری‌شده در سرور محلی بررسی و با شماره تلفن و کد محصول تطبیق داده می‌شود."
        }
      ]
    }
  };

  const currentGuide = defaultGuides[sectionKey] || {
    desc: description || "راهنمای جامع این بخش سامانه اشک قلم به صورت هوشمند و آفلاین پاسخگوی نیازهای شماست.",
    tips: tips.length > 0 ? tips : ["از ابزارهای تعاملی صفحه جهت سرعت بخشیدن به فرآیندها استفاده نمایید."],
    faq: faq.length > 0 ? faq : [{ q: "نحوه استفاده از این بخش چگونه است؟", a: "تمامی بخش‌ها به صورت راست‌چین، فارسی و همراه با راهنما طراحی شده‌اند." }]
  };

  const activeTips = tips.length > 0 ? tips : currentGuide.tips;
  const activeFaq = faq.length > 0 ? faq : currentGuide.faq;
  const activeDesc = description || currentGuide.desc;

  const filteredFaq = activeFaq.filter(item => 
    item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600/10 hover:bg-primary-600/20 text-primary-600 dark:text-primary-400 border border-primary-500/20 hover:border-primary-500/40 shadow-sm transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer group ${className}`}
        title={`راهنمای هوشمند: ${sectionTitle}`}
        aria-label="راهنمای هوشمند"
      >
        <HelpCircle className="w-4 h-4 transition-transform group-hover:rotate-12" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-right font-sans"
            >
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-700 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-white/80 block uppercase tracking-wider">راهنمای هوشمند اشک قلم (آفلاین)</span>
                    <h3 className="font-extrabold text-base text-white">{sectionTitle}</h3>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-5 text-sm">
                {/* Description */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 leading-relaxed text-slate-700 dark:text-slate-300">
                  <p className="font-medium text-xs sm:text-sm leading-6">{activeDesc}</p>
                </div>

                {/* Key Tips */}
                {activeTips.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2.5 text-xs font-black text-slate-800 dark:text-slate-200">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span>نکات کلیدی و راهنمای سریع:</span>
                    </div>
                    <ul className="space-y-2">
                      {activeTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-500/15">
                          <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <span className="leading-5">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* FAQ Section */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                      <BookOpen className="w-4 h-4 text-primary-500" />
                      <span>پرسش‌های پرتکرار:</span>
                    </div>
                    {activeFaq.length > 2 && (
                      <div className="relative w-40">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="جستجو در سوالات..."
                          className="w-full bg-slate-100 dark:bg-slate-800 text-[11px] px-2.5 py-1 rounded-lg outline-none border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {filteredFaq.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50">
                        <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0"></span>
                          {item.q}
                        </h5>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pr-3">
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  موتور راهنمای کاملاً مستقل و آفلاین اشک قلم
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all text-xs cursor-pointer"
                >
                  متوجه شدم
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
