import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Printer, Layers, Box, Sparkles, CheckCircle2, ArrowLeft, 
  HelpCircle, ShieldCheck, PenTool, Calculator, Cpu, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SERVICES_DATA = [
  {
    id: 'offset-printing',
    slug: 'offset-printing',
    title: 'چاپ افست صنعتی ۵ رنگ همزمان',
    category: 'خدمات چاپ صنعتی',
    description: 'خطوط پیشرفته چاپ افست هایدلبرگ با قابلیت چاپ ۵ رنگ همزمان و ورنی آنلاین، مناسب برای تولید انبوه جعبه‌های مقوایی، کاتالوگ و بسته‌بندی لوکس.',
    features: [
      'چاپ با رزولوشن میکرونی و تطابق رنگ استاندارد',
      'پوشش‌های ورنی مات و براق حین چاپ',
      'امکان چاپ روی مقواهای ایندربرد، پشت‌طوسی و فانتزی',
      'نظارت آنلاین و کنترل کیفیت رنگ (Color Management)'
    ],
    actionText: 'استعلام آنلاین هزینه چاپ',
    actionRoute: '/inquiry'
  },
  {
    id: 'laminated-carton',
    slug: 'laminated-carton',
    title: 'تولید کارتن‌های لمینتی و کنگره‌ای',
    category: 'کارتن‌سازی و بسته‌بندی سنگین',
    description: 'خط اتوماتیک لمینت فلوت‌های E ،B ،C و سه‌لایه/پنج‌لایه با پوستر چاپ‌شده افست با چسب‌های بهداشتی سیلیکاتی و نشاسته جهت بیشترین استحکام کششی.',
    features: [
      'تولید کارتن‌های صادراتی با استحکام فشاری بالا (BCT/ECT)',
      'لمینت سرد و گرم تمام‌اتوماتیک بدون حباب یا تابیدگی',
      'برش دقیق دایکات فکی و بوبست با تلرانس ۰.۱ میلی‌متر',
      'مناسب برای بسته‌بندی قطعات صنعتی، مواد غذایی و کشاورزی'
    ],
    actionText: 'طراحی قالب در جعبه‌ساز 3D',
    actionRoute: '/tools/dieline'
  },
  {
    id: 'diecut-tooling',
    slug: 'diecut-tooling',
    title: 'قالب‌سازی لیزری و تیغ دایکات',
    category: 'قالب و تیغ‌سازی صنعتی',
    description: 'ترسیم وکتور استاندارد دایلاین با فرمول‌های FEFCO و ECMA، برش لیزری پلی‌وود و کشیدن تیغ‌های استاندارد خط تا و پرفراژ ساخت آلمان.',
    features: [
      'برش لیزری تخته قالب با دقت ۰.۰۵ میلی‌متر',
      'استفاده از تیغ‌های فولادی Böhler و رابر محافظ',
      'ساخت سنبه و ماتریس برجسته‌سازی و کلیشه طلاکوب',
      'پشتیبانی کامل از فایل‌های CAD و نقشه‌های وکتور DXF'
    ],
    actionText: 'مشاهده استودیو اتوکد CAD',
    actionRoute: '/tools/autocad'
  },
  {
    id: 'surface-finishing',
    slug: 'surface-finishing',
    title: 'پوشش‌های محافظتی و تکمیلی (UV و سلفون)',
    category: 'خدمات تکمیلی چاپ',
    description: 'اجرای سلفون‌کشی حرارتی مات، براق و مخملی (Soft Touch)، یووی موضعی سیلندری، یووی شنی، اکلیلی و برجسته به همراه طلاکوب گرم.',
    features: [
      'سلفون حرارتی مقاوم در برابر خط و خش و رطوبت',
      'یووی موضعی شابلونی و افست با براقیت فوق‌العاده',
      'طلاکوب و نقره‌کوب حرارتی روی انواع جعبه و لیبل',
      'امکان ایجاد بافت امباس (Embossing) اختصاصی'
    ],
    actionText: 'مشاهده کاتالوگ نمونه‌ها',
    actionRoute: '/catalog'
  }
];

export const ServicesHub: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [showHelp, setShowHelp] = useState(false);

  // If a slug is provided, find specific service
  const activeService = slug ? SERVICES_DATA.find(s => s.slug === slug) : null;

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 md:px-8 font-sans dir-rtl text-right">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
        <span className="hover:text-primary-600 cursor-pointer" onClick={() => navigate('/')}>خانه</span>
        <span>/</span>
        <span className={slug ? "hover:text-primary-600 cursor-pointer" : "text-gray-900 dark:text-white font-bold"} onClick={() => navigate('/services')}>خدمات صنعتی اشک قلم</span>
        {activeService && (
          <>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-bold">{activeService.title}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-full text-xs font-black border border-primary-100 dark:border-primary-900/50 mb-3">
          <ShieldCheck className="w-4 h-4" />
          <span>پرتال مهندسی و خدمات تخصصی چاپ و بسته‌بندی</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white mb-4">
          خدمات صنعتی و مهندسی اشک قلم
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          ارائه زنجیره کامل فرآیندهای تولید از مشاوره سازه کارتن و مدل‌سازی سه‌بعدی تا چاپ افست ۵ رنگ، لمینت، ساخت تیغ لیزری و پوشش‌های UV.
        </p>
      </div>

      {/* Detail or List View */}
      {activeService ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 border border-gray-150 dark:border-gray-700 shadow-xl max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-6 mb-6">
            <div>
              <span className="text-xs font-black text-primary-600 dark:text-primary-400 block mb-1">
                {activeService.category}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {activeService.title}
              </h2>
            </div>
            <button 
              onClick={() => navigate('/services')}
              className="self-start sm:self-auto text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              <span>بازگشت به فهرست خدمات</span>
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
            {activeService.description}
          </p>

          <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4">ویژگی‌ها و قابلیت‌های فنی:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {activeService.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs text-gray-700 dark:text-gray-200 font-medium">{feat}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => navigate(activeService.actionRoute)}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-600/30 flex items-center gap-2 cursor-pointer"
            >
              <span>{activeService.actionText}</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/inquiry')}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              استعلام آنلاین قیمت
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SERVICES_DATA.map((srv) => (
            <div 
              key={srv.id}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700/80 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-1 rounded-lg border border-primary-200/50 dark:border-primary-800/40">
                    {srv.category}
                  </span>
                  <button 
                    onClick={() => navigate(`/services/${srv.slug}`)}
                    className="text-xs font-bold text-gray-400 group-hover:text-primary-500 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>مشاهده جزییات</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                  {srv.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                  {srv.description}
                </p>

                <div className="space-y-2 mb-6">
                  {srv.features.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => navigate(srv.actionRoute)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{srv.actionText}</span>
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() => navigate(`/services/${srv.slug}`)}
                  className="px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors cursor-pointer"
                >
                  مشخصات کامل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Smart Guide Button '؟' */}
      <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/30 rounded-full animate-ping pointer-events-none"></div>
          <button 
            onClick={() => setShowHelp(true)}
            className="relative w-12 h-12 bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-xl rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="راهنمای هوشمند خدمات"
          >
            ؟
          </button>
        </div>
      </div>

      {/* Smart Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800 text-right dir-rtl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center font-black text-lg">؟</div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">راهنمای خدمات صنعتی اشک قلم</h3>
                </div>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                در این بخش مشخصات زنجیره کامل خطوط تولید و خدمات مهندسی کارتن و جعبه معرفی شده است. هر خدمت مستقیماً به ابزارهای متصل از جمله استعلام قیمت و جعبه‌ساز سه‌بعدی پیوند دارد.
              </p>
              <div className="bg-amber-50/50 dark:bg-slate-850 p-3.5 rounded-2xl border border-amber-100/30 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-400 space-y-1.5 mb-4">
                <span className="font-black text-amber-600 dark:text-amber-400 block text-[11px]">نکات کلیدی:</span>
                <div>• برای محاسبه هزینه هر خدمت روی دکمه استعلام آنلاین قیمت کلیک فرمایید.</div>
                <div>• جهت آزمایش مدل و فایل تیغ دایکات به جعبه‌ساز 3D مراجعه کنید.</div>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                متوجه شدم
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
