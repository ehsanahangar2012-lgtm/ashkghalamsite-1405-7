import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { catalogService, CatalogItem } from '../../services/catalogService';
import { resolveCatalogCoverImage } from '../../utils/catalogAssets';
import { saveInquiryPrefill } from '../../utils/inquiryPrefill';
import { CatalogSpreadModal, getCatalogDossier } from './CatalogSpreadModal';
import { BookOpen, Search, Download, Eye, ArrowUpRight, Box, BookMarked } from 'lucide-react';
import { SmartHelpButton } from '../SmartHelpModal';

const CatalogCoverThumb: React.FC<{
  catalog: CatalogItem;
  className?: string;
}> = ({ catalog, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const src = resolveCatalogCoverImage(catalog.coverImage, catalog.id);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={catalog.title}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${className}`}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 text-slate-500 dark:text-slate-400 text-center">
      <BookOpen className="w-10 h-10 mb-2 text-amber-500 opacity-75" />
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-2">{catalog.title}</span>
    </div>
  );
};

export const CatalogSection: React.FC = () => {
  const navigate = useNavigate();
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeSpreadCatalog, setActiveSpreadCatalog] = useState<CatalogItem | null>(null);

  useEffect(() => {
    catalogService.fetchCatalogs(true).then((data) => {
      setCatalogs(data);
      setLoading(false);
    });
  }, []);

  const categories = ['ALL', ...Array.from(new Set(catalogs.map((c) => c.category).filter(Boolean)))];

  const filtered = catalogs.filter((c) => {
    const matchCat = selectedCategory === 'ALL' || c.category === selectedCategory;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const handleInquiryFromCatalog = (cat: CatalogItem) => {
    saveInquiryPrefill({
      sourceLabel: `کاتالوگ: ${cat.title}`,
      boxType: cat.title.includes('هاردباکس')
        ? 'هاردباکس مگنتی و لوکس'
        : cat.title.includes('۰۴۲۷')
        ? 'جعبه کیبوردی قفل‌دار (FEFCO 0427)'
        : 'کارتن چهار درب (FEFCO 0201)',
      notes: `درخواست استعلام بر اساس کاتالوگ «${cat.title}» (${cat.category})`,
    });
    setActiveSpreadCatalog(null);
    navigate('/inquiry');
  };

  const showFeaturedSplit = selectedCategory === 'ALL' && !search.trim() && filtered.length > 1;
  const featuredCatalog = showFeaturedSplit ? filtered[0] : null;
  const archiveList = showFeaturedSplit ? filtered.slice(1) : filtered;

  return (
    <section
      aria-label="آرشیو ژورنال‌ها و کاتالوگ‌های بسته‌بندی"
      className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-14 font-sans text-right"
      dir="rtl"
    >
      {/* Editorial Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 md:pb-8 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5">
            <span>آرشیو فنی و ژورنال‌های بسته‌بندی</span>
            <span aria-hidden="true">·</span>
            <span>اشک قلم</span>
            <span className="hidden sm:inline-flex">
              <SmartHelpButton
                sectionTitle="راهنمای آرشیو کاتالوگ‌های اشک قلم"
                description="تمامی کاتالوگ‌های فنی شامل مشخصات استاندارد FEFCO/ECMA، مقادیر تلورانس خط تا و نقشه‌های شماتیک برش هستند و به‌طور مستقیم از پنل مدیریت کاتالوگ‌ها به‌روزرسانی می‌شوند."
                tips={[
                  'با دکمه «ورق‌زن سریع» می‌توانید شماتیک خطوط برش و جدول تلورانس هر کاتالوگ را بی‌درنگ بررسی کنید.',
                  'برای سفارش ساخت قالب یا استعلام تیراژ، مستقیماً از داخل هر کاتالوگ اقدام کنید.',
                ]}
              />
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-slate-900 dark:text-slate-100 leading-tight [text-wrap:balance]">
            کاتالوگ‌های مهندسی ساختار جعبه و چاپ
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            مرجع استانداردهای FEFCO و ECMA، مشخصات فلوت مقوا، جلوه‌های طلاکوب و راهنمای اجرایی خط تولید.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی کد FEFCO، هاردباکس، دارویی..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#0d1320] border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 pr-4 pl-10 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
        </div>
      </div>

      {/* Category Segmented Filter Bar */}
      <div className="flex items-center justify-between gap-3 py-3.5 md:py-5 border-b border-slate-200 dark:border-slate-800/80 mb-6 md:mb-8">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 flex-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 md:px-3.5 md:py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'همه کاتالوگ‌ها' : cat}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
          <span>تعداد نسخه‌های منتشرشده:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
            {String(filtered.length).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Loading / Empty / Content States */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-96 rounded-2xl bg-slate-200/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#0d1320] border border-slate-200 dark:border-slate-800 rounded-2xl text-center py-16 px-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-1.5">
            کاتالوگی مطابق جستجوی شما یافت نشد
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-5">
            عبارت جستجو را تغییر دهید یا فیلتر دسته‌بندی را روی «همه کاتالوگ‌ها» تنظیم کنید.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
            }}
            className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
          >
            نمایش همه کاتالوگ‌ها
          </button>
        </div>
      ) : (
        <div className="space-y-8 md:space-y-12">
          {/* Featured Monograph Split Showcase */}
          {featuredCatalog && (
            <article className="group bg-white dark:bg-[#0d1320] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shadow-sm hover:shadow-xl dark:hover:shadow-black/50 transition-shadow duration-200">
              <div className="lg:col-span-6 aspect-[16/10] lg:aspect-auto lg:min-h-[380px] bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
                <CatalogCoverThumb catalog={featuredCatalog} />
                <div className="hidden lg:block absolute inset-0 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />
              </div>

              <div className="lg:col-span-6 p-4 sm:p-6 md:p-10 flex flex-col justify-between gap-4 md:gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums mb-2">
                    <span className="font-bold text-amber-600 dark:text-amber-400">نسخه شاخص · ۰۱</span>
                    <span aria-hidden="true">·</span>
                    <span>{featuredCatalog.category}</span>
                    {featuredCatalog.pageCount && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{featuredCatalog.pageCount} صفحه</span>
                      </>
                    )}
                  </div>

                  <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 leading-snug mb-2 md:mb-3 [text-wrap:balance]">
                    {featuredCatalog.title}
                  </h2>

                  {featuredCatalog.description && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 md:line-clamp-none mb-4 md:mb-6">
                      {featuredCatalog.description}
                    </p>
                  )}

                  {/* Unboxed Hairline Spec Strip */}
                  {(() => {
                    const dossier = getCatalogDossier(featuredCatalog);
                    return (
                      <div className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800 text-xs">
                        <div className="py-2 flex items-center justify-between gap-4">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">کد استاندارد مرجع</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate">
                            {dossier.code}
                          </span>
                        </div>
                        <div className="py-2 flex items-center justify-between gap-4">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">گرماژ و ورق مبنا</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {dossier.boardOptions}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveSpreadCatalog(featuredCatalog)}
                    className="py-2.5 px-4 sm:px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <BookMarked className="w-4 h-4" />
                    <span>ورق‌زدن سریع</span>
                  </button>

                  <Link
                    to={`/catalog/${featuredCatalog.slug || featuredCatalog.id}`}
                    className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-amber-500 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>جزئیات</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>

                  {featuredCatalog.pdfUrl && (
                    <a
                      href={featuredCatalog.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-amber-500 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      title="دانلود نسخه PDF"
                    >
                      <Download className="w-4 h-4" />
                      <span>PDF</span>
                    </a>
                  )}
                </div>
              </div>
            </article>
          )}

          {/* Monograph Archive Grid (Horizontal swipe carousel on phones, full grid on md+) */}
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 md:pb-0 no-scrollbar">
            {archiveList.map((cat, idx) => {
              const displayIndex = showFeaturedSplit ? idx + 2 : idx + 1;
              const dossier = getCatalogDossier(cat);
              return (
                <article
                  key={cat.id}
                  className="group w-[78vw] sm:w-[56vw] md:w-auto shrink-0 snap-start bg-white dark:bg-[#0d1320] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-xl dark:hover:shadow-black/50 transition-all duration-200"
                >
                  <div>
                    {/* Media-First 4:3 Studio Frame */}
                    <Link
                      to={`/catalog/${cat.slug || cat.id}`}
                      className="block aspect-[4/3] bg-slate-100 dark:bg-slate-900 overflow-hidden border-b border-slate-200 dark:border-slate-800"
                    >
                      <CatalogCoverThumb catalog={cat} />
                    </Link>

                    <div className="p-5 md:p-6">
                      {/* Clean Unboxed Metadata */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums mb-2">
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {String(displayIndex).padStart(2, '0')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{cat.category || 'بسته‌بندی مهندسی'}</span>
                        {cat.pageCount && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="shrink-0">{cat.pageCount} صفحه</span>
                          </>
                        )}
                      </div>

                      <Link to={`/catalog/${cat.slug || cat.id}`}>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-snug mb-2 line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {cat.title}
                        </h3>
                      </Link>

                      {cat.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3">
                          {cat.description}
                        </p>
                      )}

                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                        {dossier.code}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action Row */}
                  <div className="px-5 md:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSpreadCatalog(cat)}
                        className="py-1.5 px-3 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-amber-500 dark:hover:bg-amber-500 text-white hover:text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <BookMarked className="w-3.5 h-3.5" />
                        <span>ورق‌زدن</span>
                      </button>

                      <Link
                        to={`/catalog/${cat.slug || cat.id}`}
                        className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 font-bold text-xs flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>جزئیات</span>
                      </Link>
                    </div>

                    {cat.pdfUrl ? (
                      <a
                        href={cat.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="دانلود PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInquiryFromCatalog(cat)}
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>استعلام</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Direct Engineering Studio Callout Strip */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                ابعاد سفارشی یا خط برش اختصاصی نیاز دارید؟
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                کد ساختار مورد نظر را در جعبه‌ساز سه‌بعدی باز کنید یا برای تولید تیراژ با کارشناسان چاپ استعلام ثبت کنید.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/tools/dieline"
                className="py-2.5 px-5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Box className="w-4 h-4 text-amber-400" />
                <span>ورود به جعبه‌ساز ۳D</span>
              </Link>
              <Link
                to="/inquiry"
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <span>درخواست پیش‌فاکتور</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Multi-Page Journal & Blueprint Lightbox */}
      {activeSpreadCatalog && (
        <CatalogSpreadModal
          catalog={activeSpreadCatalog}
          onClose={() => setActiveSpreadCatalog(null)}
          onRequestInquiry={handleInquiryFromCatalog}
          onOpenDielineStudio={() => {
            setActiveSpreadCatalog(null);
            navigate('/tools/dieline');
          }}
        />
      )}
    </section>
  );
};
