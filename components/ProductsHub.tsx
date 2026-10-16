import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, Package, Sparkles, CheckCircle2, ArrowLeft, 
  HelpCircle, ShieldCheck, Image as ImageIcon, X, 
  ChevronDown, FileText, Layers, Wrench, ExternalLink, BookOpen 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotFound } from './NotFound';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';

import { ProductDetail, PRODUCTS_CATEGORIES } from '../src/data/productsData';
export { type ProductDetail, PRODUCTS_CATEGORIES };

export const ProductsHub: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [showHelp, setShowHelp] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const activeProduct = slug ? PRODUCTS_CATEGORIES.find(p => p.slug === slug) : null;

  // If an unknown slug is entered, render 404 instead of falling back to the whole list
  if (slug && !activeProduct) {
    return <NotFound />;
  }

  // Generate verified Schema.org Product + FAQPage
  const productSchema = activeProduct ? {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `https://ashkghalam.ir/products/${activeProduct.slug}#product`,
        "name": activeProduct.title,
        "description": activeProduct.metaDescription,
        "category": activeProduct.category,
        "brand": {
          "@type": "Brand",
          "name": "صنایع چاپ و بسته‌بندی اشک قلم"
        }
      },
      ...(activeProduct.faq && activeProduct.faq.length > 0 ? [{
        "@type": "FAQPage",
        "@id": `https://ashkghalam.ir/products/${activeProduct.slug}#faq`,
        "mainEntity": activeProduct.faq.map(f => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": f.answer
          }
        }))
      }] : [])
    ]
  } : undefined;

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 md:px-8 font-sans dir-rtl text-right">
      {activeProduct ? (
        <SeoHead 
          view={AppView.PRODUCTS}
          canonicalPath={`/products/${activeProduct.slug}`}
          customTitle={`${activeProduct.title} | محصولات بسته‌بندی اشک قلم`}
          customDescription={activeProduct.metaDescription}
          structuredData={productSchema}
          noIndex={false}
        />
      ) : (
        <SeoHead 
          view={AppView.PRODUCTS}
          canonicalPath="/products"
          customTitle="محصولات و رده‌های بسته‌بندی صنعتی | اشک قلم"
          customDescription="انواع کارتن‌های لمینتی صادراتی، جعبه‌های دارویی بهداشتی، هاردباکس‌های لوکس و بسته‌بندی‌های پستی و آنلاین‌شاپ‌ها."
          noIndex={false}
        />
      )}

      {/* Semantic Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
        <span className="hover:text-primary-600 cursor-pointer" onClick={() => navigate('/')}>خانه</span>
        <span>/</span>
        <span 
          className={slug ? "hover:text-primary-600 cursor-pointer" : "text-gray-900 dark:text-white font-bold"} 
          onClick={() => navigate('/products')}
        >
          محصولات و رده‌های بسته‌بندی
        </span>
        {activeProduct && (
          <>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-bold">{activeProduct.title}</span>
          </>
        )}
      </nav>

      {/* Detail or List */}
      {activeProduct ? (
        <article className="space-y-10">
          {/* Main Product Header Card with Dedicated Single H1 */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 border border-gray-150 dark:border-gray-700 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-6 mb-6">
              <div>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 block mb-2">
                  {activeProduct.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-950 dark:text-white leading-tight">
                  {activeProduct.h1}
                </h1>
              </div>
              <button 
                onClick={() => navigate('/products')}
                className="self-start sm:self-auto text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
                <span>بازگشت به همه محصولات</span>
              </button>
            </div>

            {/* Intro Paragraph */}
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium leading-relaxed mb-6 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-900/30">
              {activeProduct.intro}
            </p>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
              {activeProduct.description}
            </p>

            {/* Structure and Material Options */}
            <div className="mb-8">
              <h2 className="font-black text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                <span>ساختار و گزینه‌های متریال:</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeProduct.structureAndMaterials.map((mat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{mat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="mb-8">
              <h2 className="font-black text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>مشخصات فنی و استانداردهای تولید:</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeProduct.specifications.map((spec, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{spec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customization Options */}
            <div className="mb-8">
              <h2 className="font-black text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span>قابلیت‌های سفارشی‌سازی اختصاصی:</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeProduct.customizationOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{opt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Industrial Applications */}
            <div className="mb-8">
              <h2 className="font-black text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-500" />
                <span>کاربردها و صنایع مرتبط:</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeProduct.applications.map((app, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{app}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Guide & Required Info Checklist */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-50/70 to-orange-50/40 dark:from-gray-750 dark:to-gray-800 border border-amber-200/60 dark:border-gray-700 mb-8">
              <h2 className="font-black text-base text-amber-950 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>راهنمای سفارش و اطلاعات مورد نیاز استعلام:</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <h3 className="text-xs font-black text-amber-900 dark:text-amber-300 mb-2">مراحل انجام سفارش:</h3>
                  <ol className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                    {activeProduct.orderGuide.steps.map((st, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="text-xs font-black text-amber-900 dark:text-amber-300 mb-2">اطلاعات لازم برای استعلام دقیق:</h3>
                  <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                    {activeProduct.orderGuide.requiredInfo.map((inf, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 font-black">•</span>
                        <span>{inf}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons & Internal Links */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => navigate(activeProduct.actionRoute)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
              >
                <span>{activeProduct.actionText}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/catalog')}
                className="px-5 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span>مشاهده در ژورنال و کاتالوگ ۳D</span>
              </button>
            </div>
          </div>

          {/* Related Services & Products Internal Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Services Link */}
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-150 dark:border-gray-700 shadow-md">
              <h2 className="text-base font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary-600" />
                <span>خدمات صنعتی مرتبط:</span>
              </h2>
              <div className="space-y-3">
                {activeProduct.relatedServices.map((srv) => (
                  <div 
                    key={srv.slug}
                    onClick={() => navigate(`/services/${srv.slug}`)}
                    className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-primary-50/40 dark:hover:bg-primary-950/20 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <h3 className="font-bold text-xs text-gray-900 dark:text-white">{srv.title}</h3>
                    <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                ))}
              </div>
            </section>

            {/* Other Products Link */}
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-150 dark:border-gray-700 shadow-md">
              <h2 className="text-base font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                <span>سایر رده‌های محصولات:</span>
              </h2>
              <div className="space-y-3">
                {activeProduct.relatedProducts.map((p) => (
                  <div 
                    key={p.slug}
                    onClick={() => navigate(`/products/${p.slug}`)}
                    className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 block mb-0.5">{p.category}</span>
                      <h3 className="font-bold text-xs text-gray-900 dark:text-white">{p.title}</h3>
                    </div>
                    <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Genuine FAQ Section */}
          {activeProduct.faq && activeProduct.faq.length > 0 && (
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-150 dark:border-gray-700 shadow-md">
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <span>پرسش‌های متداول فنی درباره {activeProduct.title}:</span>
              </h2>
              <div className="space-y-3">
                {activeProduct.faq.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div 
                      key={idx} 
                      className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full text-right p-4 flex items-center justify-between bg-gray-50/70 dark:bg-gray-750 cursor-pointer font-bold text-xs sm:text-sm text-gray-900 dark:text-white hover:text-amber-600 transition-colors"
                      >
                        <span>{item.question}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="p-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700"
                          >
                            {item.answer}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </article>
      ) : (
        /* Overview Hub Page (/products) with single H1 */
        <div>
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
                    {prod.intro}
                  </p>

                  <div className="space-y-2 mb-6">
                    {prod.structureAndMaterials.slice(0, 3).map((s, i) => (
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
                    مشخصات کامل ساختار
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">راهنمای سبد محصولات اشک قلم</h3>
                </div>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                در این بخش ۴ رده اصلی محصولات کارتن و جعبه معرفی شده‌اند. برای هر محصول می‌توانید مشخصات فنی، ساختار متریال، پرسش‌های متداول را بررسی کرده و مستقیماً استعلام قیمت فرمایید.
              </p>
              <div className="bg-amber-50/50 dark:bg-slate-850 p-3.5 rounded-2xl border border-amber-100/30 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-400 space-y-1.5 mb-4">
                <span className="font-black text-amber-600 dark:text-amber-400 block text-[11px]">نکات کلیدی:</span>
                <div>• برای محاسبه هزینه هر محصول روی دکمه استعلام اختصاصی کلیک کنید.</div>
                <div>• جهت آزمایش ابعاد در فضای سه‌بعدی به بخش دایلاین ۳D مراجعه فرمایید.</div>
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
