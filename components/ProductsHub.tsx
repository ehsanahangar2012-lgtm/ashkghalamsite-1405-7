import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, Package, Sparkles, CheckCircle2, ArrowLeft, 
  HelpCircle, ShieldCheck, Image as ImageIcon, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRODUCTS_CATEGORIES = [
  {
    id: 'laminated-boxes',
    slug: 'laminated-boxes',
    title: 'کارتن‌های لمینتی صنایع غذایی و کشاورزی',
    category: 'کارتن‌های صادراتی سنگین',
    description: 'تولید کارتن‌های میوه، خرما، خشکبار و قطعات صنعتی با فلوت‌های مستحکم B و C و E، چاپ افست براق و مقاومت فشاری ویژه صادرات.',
    specifications: [
      'جنس لایه بیرونی: کاغذ گلاسه یا ایندربرد با چاپ افست ۵ رنگ',
      'فلوتینگ داخلی: کاغذ فلوتینگ کرافت با دانسیته ۱۲۰ تا ۱۵۰ گرم',
      'پوشش: سلفون مات/براق و ورنی ضد رطوبت',
      'مدل‌ها: ۴ درب آمریکایی (FEFCO 0201)، سبدی، تلسکوپی و قفل‌دار'
    ],
    actionText: 'مشاهده در کاتالوگ ۳D',
    actionRoute: '/catalog'
  },
  {
    id: 'pharma-cosmetics',
    slug: 'pharma-cosmetics',
    title: 'جعبه‌های دارویی، آرایشی و بهداشتی',
    category: 'جعبه‌های مقوایی بهداشتی',
    description: 'جعبه‌های مقوایی با مقوای ایندربرد و بهداشتی استاندارد غذا و دارو، مجهز به پوشش‌های ضد تقلب، طلاکوب و خط بریل استاندارد داروخانه‌ای.',
    specifications: [
      'مقوا: ایندربرد بهداشتی ۲۵۰ تا ۳۵۰ گرم با گرید بهداشت',
      'چاپ: افست با مرکب‌های بهداشتی Low Migration',
      'خدمات تکمیلی: خط بریل برجسته، امباس، یووی موضعی و پنجره طلق‌دار',
      'تیپ قالب: زبانه معکوس (Tuck-in)، قفل خودکار کف (Auto-lock)'
    ],
    actionText: 'طراحی تیغ در جعبه‌ساز 3D',
    actionRoute: '/tools/dieline'
  },
  {
    id: 'rigid-hardbox',
    slug: 'rigid-hardbox',
    title: 'جعبه‌های سخت (هاردباکس) لوکس و کادویی',
    category: 'بسته‌بندی هاردباکس لوکس',
    description: 'تولید جعبه‌های ضخیم و صلب مقوایی مغزی کرجی با روکش‌های فانتزی چرمی، متالایز، گلاسه طلاکوب برای زعفران، عطر، ادکلن و کالاهای لوکس.',
    specifications: [
      'مغزی: مقوای کرجی فشرده ۱.۵ تا ۳ میلی‌متر با استحکام فوق‌العاده',
      'روکش: کاغذ فانتزی بافت‌دار، پارچه جیر، روکش متالایز یا گلاسه سلفون‌دار',
      'اتصالات: لولایی، مگنتی، کشویی (کبریت) و دو تکه کف و درب',
      'نگهدارنده داخلی: فوم EVA لیزری یا اینسرت مقوایی قالب‌خورده'
    ],
    actionText: 'استعلام آنلاین هزینه تولید',
    actionRoute: '/inquiry'
  },
  {
    id: 'ecommerce-mailer',
    slug: 'ecommerce-mailer',
    title: 'کارتن‌های پستی و کیبوردی آنلاین‌شاپ‌ها',
    category: 'بسته‌بندی تجارت الکترونیک',
    description: 'جعبه‌های بازشونده سریع پستی و کیبوردی استاندارد شرکت پست و ارسال مرسولات با امکان چاپ نام و لوگوی برند درون و بیرون کارتن.',
    specifications: [
      'فلوتینگ: ای فلوت (E-Flute) ظریف و سبک جهت کاهش هزینه پستی',
      'مدل: کیبوردی استاندارد با قفل محکم بدون نیاز به منگنه',
      'چاپ: چاپ تک‌رنگ یا دورنگ فلکسو یا افست لمینت اختصاصی',
      'ابعاد: سایزهای استاندارد اداره پست از سایز ۱ تا سایز ۶'
    ],
    actionText: 'مشاهده استودیو طراحی آنلاین',
    actionRoute: '/tools/design-studio'
  }
];

export const ProductsHub: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [showHelp, setShowHelp] = useState(false);

  const activeProduct = slug ? PRODUCTS_CATEGORIES.find(p => p.slug === slug) : null;

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 md:px-8 font-sans dir-rtl text-right">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
        <span className="hover:text-primary-600 cursor-pointer" onClick={() => navigate('/')}>خانه</span>
        <span>/</span>
        <span className={slug ? "hover:text-primary-600 cursor-pointer" : "text-gray-900 dark:text-white font-bold"} onClick={() => navigate('/products')}>محصولات و رده‌های بسته‌بندی</span>
        {activeProduct && (
          <>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-bold">{activeProduct.title}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full text-xs font-black border border-amber-200/60 dark:border-amber-900/50 mb-3">
          <Package className="w-4 h-4" />
          <span>سبد محصولات کارتن، جعبه و هاردباکس اشک قلم</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white mb-4">
          محصولات و تولیدات صنعتی اشک قلم
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          انواع ساختارهای استاندارد کارتن لمینتی، جعبه‌های مقوایی دارویی، هاردباکس لوکس و کارتن‌های کیبوردی صادراتی با بالاترین کیفیت مهندسی.
        </p>
      </div>

      {/* Detail or List */}
      {activeProduct ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 border border-gray-150 dark:border-gray-700 shadow-xl max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-6 mb-6">
            <div>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 block mb-1">
                {activeProduct.category}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {activeProduct.title}
              </h2>
            </div>
            <button 
              onClick={() => navigate('/products')}
              className="self-start sm:self-auto text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              <span>بازگشت به فهرست محصولات</span>
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
            {activeProduct.description}
          </p>

          <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4">مشخصات ساختاری و متریال:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {activeProduct.specifications.map((spec, idx) => (
              <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs text-gray-700 dark:text-gray-200 font-medium">{spec}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => navigate(activeProduct.actionRoute)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
            >
              <span>{activeProduct.actionText}</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/inquiry')}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              استعلام قیمت برای این محصول
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PRODUCTS_CATEGORIES.map((prod) => (
            <div 
              key={prod.id}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700/80 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-800/40">
                    {prod.category}
                  </span>
                  <button 
                    onClick={() => navigate(`/products/${prod.slug}`)}
                    className="text-xs font-bold text-gray-400 group-hover:text-amber-500 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>مشاهده جزییات</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                  {prod.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                  {prod.description}
                </p>

                <div className="space-y-2 mb-6">
                  {prod.specifications.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => navigate(prod.actionRoute)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{prod.actionText}</span>
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() => navigate(`/products/${prod.slug}`)}
                  className="px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-amber-600 transition-colors cursor-pointer"
                >
                  جزییات ساختار
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
            title="راهنمای هوشمند محصولات"
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
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">راهنمای محصولات بسته‌بندی اشک قلم</h3>
                </div>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                در این بخش دسته‌بندی انواع جعبه‌ها و کارتن‌های تولیدی اشک قلم درج گردیده است. شما می‌توانید با ورود به هر بخش، کاتالوگ سه‌بعدی و مدل هندسی دایلاین آن را بررسی فرمایید.
              </p>
              <div className="bg-amber-50/50 dark:bg-slate-850 p-3.5 rounded-2xl border border-amber-100/30 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-400 space-y-1.5 mb-4">
                <span className="font-black text-amber-600 dark:text-amber-400 block text-[11px]">راهنمایی و اقدام:</span>
                <div>• برای مشاهده تصاویر و نمونه‌های واقعی ورق‌زن به کاتالوگ مراجعه کنید.</div>
                <div>• ابعاد دقیق دلخواه خود را در فرم استعلام قیمت وارد فرمایید.</div>
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
