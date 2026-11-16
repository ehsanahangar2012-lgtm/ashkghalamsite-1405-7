import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Box, Phone, Mail, MapPin, Sparkles, Clock, Cpu, FileText } from 'lucide-react';
import { useContent } from '../contexts/ContentContext';
import { AppView } from '../types';

export const AboutUs: React.FC<{ onNavigate?: (view: AppView) => void }> = ({ onNavigate }) => {
  const { siteContent } = useContent();
  const navigate = useNavigate();

  const handleGo = (view: AppView, path: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else {
      navigate(path);
    }
  };

  const machines = [
    { name: 'ماشین چاپ افست Heidelberg Speedmaster CD 102', detail: '۵ رنگ همزمان با برج ورنی و خشک‌کن UV', code: 'افست ۵ رنگ' },
    { name: 'ماشین دایکات اتوماتیک Bobst ExpertCut', detail: 'قالب‌گیری و تیغ‌زنی دقیق با سرعت ۸,۲۰۰ شیت در ساعت', code: 'دایکات صنعتی' },
    { name: 'خط سلفون‌کشی و لمینت حرارتی فول‌اتوماتیک', detail: 'روکش مات، براق و مخملی با چسبندگی بالا', code: 'پوشش‌دهی' },
    { name: 'سیستم پلیت‌ستر CTP پیشرفته لیتوگرافی', detail: 'خروجی زینک حرارتی مستقیم با رزولوشن ۴۰۰۰ dpi', code: 'پیش از چاپ' }
  ];

  const stats = [
    { label: 'سال تجربه در صنعت چاپ', value: '۲۲+' },
    { label: 'پروژه و تیراژ موفق سالانه', value: '۱۵,۰۰۰+' },
    { label: 'مشتری و برند مطرح صنعتی', value: '۱,۲۰۰+' },
    { label: 'تنوع قالب‌های دایلاین آماده', value: '۵۰۰+' }
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-12 font-sans dir-rtl text-right">
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 overflow-hidden shadow-2xl border border-indigo-900/40">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/30 text-primary-300 px-3.5 py-1.5 rounded-full text-xs font-bold mb-6">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span>گروه صنعتی چاپ و بسته‌بندی اشک قلم و بادیکاران توس</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white mb-6 leading-tight">
            {siteContent.heroTitle || 'تلفیق هنر چاپ ایرانی و مهندسی بسته‌بندی سه‌بعدی'}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
            {siteContent.heroDescription || siteContent.footerAbout ||
              'گروه صنعتی اشک قلم و مجتمع چاپ بادیکاران توس با بیش از دو دهه سابقه درخشان در صنعت چاپ، بسته‌بندی و تولید کارتن‌های لمینتی، مجهز به مدرن‌ترین ماشین‌آلات افست، لیتوگرافی و جعبه‌سازی در کشور می‌باشد. ما با استفاده از دانش روز مهندسی بسته‌بندی و ابزارهای آنلاین طراحی دایلاین، ایده‌های شما را با بالاترین کیفیت به واقعیت تبدیل می‌کنیم.'}
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => handleGo(AppView.INQUIRY, '/inquiry')}
              className="bg-primary-600 hover:bg-primary-500 text-white font-black px-6 py-3 rounded-xl text-sm shadow-xl shadow-primary-600/30 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>درخواست مشاوره و استعلام سریع</span>
            </button>
            <button
              type="button"
              onClick={() => handleGo(AppView.LIBRARY, '/library')}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl text-sm border border-white/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>دانلود کتاب‌ها و کاتالوگ‌های صنعتی</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-2xl sm:text-4xl font-black text-primary-600 dark:text-primary-400 font-mono mb-1">
              {s.value}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* About Company Profiles (Ashk Ghalam + Badikaran) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-2xl flex items-center justify-center font-bold">
            <Box className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">واحد فناوری و طراحی اشک قلم</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            واحد اشک قلم به عنوان بازوی نوآوری و فناوری گروه، مسئولیت توسعه ابزارهای نرم‌افزاری پیشرفته از جمله مولد آنلاین قالب جعبه (Dieline)، استودیوی ویرایش تصویر لایه باز و سامانه محاسبات قیمت تمام شده را بر عهده دارد. هدف ما ساده‌سازی فرایند طراحی تا ساخت جعبه برای برندها و تولیدکنندگان است.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
            <Printer className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">مجتمع چاپ صنعتی بادیکاران توس</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            مجتمع بادیکاران توس با تکیه بر سال‌ها تجربه عملیات چاپ سنگین، مجهز به ناوگان کامل چاپ افست ۵ رنگ Heidelberg، خطوط لیمینت حرارتی، دایکات اتوماتیک و پوشش‌های تخصصی UV می‌باشد. این مرکز توانایی تولید روزانه ده‌ها هزار جعبه و کارتن با عالی‌ترین استانداردهای بین‌المللی را دارد.
          </p>
        </div>
      </div>

      {/* Industrial Machine Fleet */}
      <div className="bg-slate-100 dark:bg-slate-900/70 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">ناوگان ماشین‌آلات و تجهیزات چاپ</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            دستگاه‌های مدرن خط تولید ما جهت تضمین بالاترین کیفیت و سرعت تحویل
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {machines.map((m, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex-shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md mb-1 inline-block">
                  {m.code}
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{m.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">{m.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact & Location Details (Synced with Admin CMS) */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-right">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">تلفن‌های ارتباطی</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 dir-ltr font-mono text-right">
              {siteContent.contactPhone || '۰۵۱-۳۳۸۸۰۰۰۰'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">پست الکترونیک</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              {siteContent.contactEmail || 'info@ashkghalam.com'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">دفتر مرکزی و کارخانه</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {siteContent.contactAddress || 'تهران / مشهد - شهرک صنعتی چاپ و بسته‌بندی'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">ساعات کاری پاسخگویی</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {siteContent.workingHours || 'شنبه تا چهارشنبه ۸:۳۰ الی ۱۷:۳۰'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
