import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Eye, Download, Sparkles, ChevronLeft, ArrowLeft, 
  Layers, FileText, Calendar, Tag, ShieldCheck, X, HelpCircle, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CatalogItem } from '../../types/catalog';
import { catalogService } from '../../services/catalogService';
import { CatalogViewerModal } from './CatalogViewerModal';
import { NotFound } from '../../../components/NotFound';
import { SeoHead } from '../../../components/SeoHead';
import { AppView } from '../../../types';

export const CatalogItemPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const PAPER_FINISH_LABELS: Record<string, string> = {
    glossy: 'گلاسه براق',
    matte: 'سلفون مات',
    silk: 'ابریشمی / مخملی',
    embossed: 'امباس و بافت‌دار',
    gold_foil: 'طلاکوب و ورنی'
  };

  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const found = await catalogService.getCatalogBySlugOrId(slug || '', true);
        if (isMounted) {
          setCatalog(found && found.isPublished === true ? found : null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setCatalog(null);
          setLoading(false);
        }
      }
    };
    fetchCatalog();
    return () => { isMounted = false; };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans dir-rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400">در حال بارگذاری اطلاعات کاتالوگ...</span>
        </div>
      </div>
    );
  }

  if (!catalog || catalog.isPublished !== true) {
    return <NotFound />;
  }

  const catalogImage = catalog.coverImage && typeof catalog.coverImage === 'string' && !catalog.coverImage.startsWith('data:')
    ? (catalog.coverImage.startsWith('http') ? catalog.coverImage : `https://ashkghalam.ir${catalog.coverImage.startsWith('/') ? '' : '/'}${catalog.coverImage}`)
    : undefined;

  const catalogSchema = {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    "@id": `https://ashkghalam.ir/catalog/${catalog.slug || catalog.id}#document`,
    "name": catalog.title,
    "description": catalog.description || catalog.seoDescription || `کاتالوگ رسمی ${catalog.title} صنایع چاپ و بسته‌بندی اشک قلم`,
    "publisher": {
      "@type": "Organization",
      "name": catalog.publisher || "صنایع چاپ و بسته‌بندی اشک قلم",
      "url": "https://ashkghalam.ir"
    },
    "inLanguage": "fa-IR",
    ...(catalogImage ? { "image": catalogImage } : {})
  };

  const finishLabel = catalog.paperFinish ? PAPER_FINISH_LABELS[catalog.paperFinish] : null;

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 md:px-8 font-sans dir-rtl text-right">
      <SeoHead 
        view={AppView.CATALOG}
        canonicalPath={`/catalog/${catalog.slug || catalog.id}`}
        customTitle={`${catalog.title} | کاتالوگ اشک قلم`}
        customDescription={catalog.description || catalog.seoDescription || `کاتالوگ رسمی ${catalog.title} صنایع چاپ و بسته‌بندی اشک قلم`}
        structuredData={catalogSchema}
        noIndex={false}
      />

      {/* Semantic Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
        <span className="hover:text-primary-600 cursor-pointer" onClick={() => navigate('/')}>خانه</span>
        <span>/</span>
        <span className="hover:text-primary-600 cursor-pointer" onClick={() => navigate('/catalog')}>ژورنال و کاتالوگ‌های تخصصی</span>
        <span>/</span>
        <span className="text-gray-900 dark:text-white font-bold">{catalog.title}</span>
      </nav>

      {/* Main Catalog Detail View */}
      <article className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Cover Image Container */}
          <div className="w-full lg:w-2/5 flex flex-col items-center">
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-slate-950 p-3 shadow-2xl border border-slate-800">
              <img 
                src={catalog.coverImage} 
                alt={`تصویر جلد کاتالوگ ${catalog.title}`}
                className="w-full h-auto max-h-96 object-contain rounded-xl"
                loading="eager"
              />
              {catalog.pageCount && catalog.pageCount > 0 ? (
                <div className="absolute top-5 right-5 px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-full text-[11px] font-bold text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{catalog.pageCount} صفحه</span>
                </div>
              ) : null}
            </div>

            {/* Quick Action Button below Cover */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 w-full max-w-sm py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>مشاهده آنلاین در نمایشگر سه‌بعدی ۳D</span>
            </button>
          </div>

          {/* Details & Specs */}
          <div className="w-full lg:w-3/5 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              {catalog.category && (
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 block mb-2">
                  دسته‌بندی: {catalog.category}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white leading-tight">
                {catalog.title}
              </h1>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {catalog.description || catalog.seoDescription || `کاتالوگ رسمی ${catalog.title} صنایع چاپ و بسته‌بندی اشک قلم.`}
            </p>

            {/* Catalog Verified Metadata Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {catalog.pageCount && catalog.pageCount > 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block mb-0.5">تعداد صفحات:</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{catalog.pageCount} صفحه</span>
                </div>
              ) : null}
              {catalog.publisher ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block mb-0.5">ناشر رسمی:</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{catalog.publisher}</span>
                </div>
              ) : null}
              {finishLabel ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block mb-0.5">پوشش و پرداخت:</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{finishLabel}</span>
                </div>
              ) : null}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => navigate(`/inquiry?category=box&service=packaging&catalog=${catalog.slug || catalog.id}`)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
              >
                <span>استعلام قیمت بر اساس این کاتالوگ</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              {catalog.pdfUrl && (
                <a
                  href={catalog.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-500" />
                  <span>دانلود فایل PDF کاتالوگ</span>
                </a>
              )}

              <button
                onClick={() => navigate('/catalog')}
                className="px-4 py-3 text-xs text-slate-500 hover:text-amber-500 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>فهرست همه کاتالوگ‌ها</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Page Thumbnails Preview */}
        {catalog.pages && catalog.pages.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <span>پیش‌نمایش صفحات ژورنال:</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {catalog.pages.slice(0, 12).map((pg, idx) => (
                <div 
                  key={idx}
                  onClick={() => setIsModalOpen(true)}
                  className="group relative rounded-xl overflow-hidden bg-slate-950 aspect-[3/4] p-1 border border-slate-800 hover:border-amber-500 transition-all cursor-pointer shadow-sm"
                >
                  <img 
                    src={pg.thumbnailUrl || pg.imageUrl} 
                    alt={`صفحه ${pg.pageNumber}`} 
                    className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-slate-950/80 rounded text-[9px] font-mono text-amber-400">
                    ص {pg.pageNumber}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Floating Smart Guide Button '؟' */}
      <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/30 rounded-full animate-ping pointer-events-none"></div>
          <button 
            onClick={() => setShowHelp(true)}
            className="relative w-12 h-12 bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-xl rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="راهنمای کاتالوگ"
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
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">راهنمای ژورنال و کاتالوگ</h3>
                </div>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                این صفحه نمایش اختصاصی کاتالوگ منتشرشده است. برای ورق زدن سه‌بعدی و مشاهده افکت‌های برجسته و نقاط داغ (Hotspots) روی دکمه نمایشگر سه‌بعدی کلیک فرمایید.
              </p>
              <div className="bg-amber-50/50 dark:bg-slate-850 p-3.5 rounded-2xl border border-amber-100/30 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-400 space-y-1.5 mb-4">
                <div>• برای محاسبه هزینه تولید اقلام کاتالوگ از دکمه استعلام قیمت استفاده کنید.</div>
                <div>• فایل PDF کاتالوگ (در صورت وجود) با دکمه دانلود قابل دریافت است.</div>
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

      {/* 3D Catalog Viewer Modal */}
      <CatalogViewerModal
        catalog={catalog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
