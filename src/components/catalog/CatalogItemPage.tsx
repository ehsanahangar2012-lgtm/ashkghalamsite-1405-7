import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CatalogItem } from '../../services/catalogService';
import { useCatalog } from '../../contexts/CatalogContext';
import { CatalogProject } from '../../types/flipbook';
import { resolveCatalogCoverImage, getUploadFallbackCandidates } from '../../utils/catalogAssets';

const FlipbookViewer = lazy(() =>
  import('../studio/FlipbookViewer').then((m) => ({ default: m.FlipbookViewer }))
);
import { getCatalogDossier, TechnicalSchematicSvg } from './CatalogSpreadModal';
import { SeoHead } from '../SeoHead';
import { NotFound } from '../NotFound';
import { BookOpen, Download, HelpCircle, Box, ArrowUpRight, Layers, Printer, Ruler, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { BackButton } from '../UIComponents';
import { saveInquiryPrefill } from '../../utils/inquiryPrefill';

export const CatalogItemPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { publicCatalogs, hasLoadedPublic, ensureLoaded, getFlipbookProject } = useCatalog();
  const [catalog, setCatalog] = useState<CatalogItem | null>(null);
  const [flipbookProject, setFlipbookProject] = useState<CatalogProject | null>(null);
  const [loadingFlipbook, setLoadingFlipbook] = useState(false);
  const [flipbookError, setFlipbookError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [activeSheet, setActiveSheet] = useState<'flipbook' | 'cover' | 'cad' | 'specs'>('cover');
  const [coverIdx, setCoverIdx] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setCoverIdx(0);
    setImgFailed(false);
    setFlipbookProject(null);
    setFlipbookError(null);

    const resolveItem = async () => {
      await ensureLoaded(false);
    };

    resolveItem().then(() => {
      if (cancelled) return;
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [slug, ensureLoaded]);

  useEffect(() => {
    if (!slug || !hasLoadedPublic) return;
    let cancelled = false;
    const matched =
      publicCatalogs.find((c) => c.slug === slug || String(c.id) === slug || c.uuid === slug) || null;
    setCatalog(matched);

    if (matched?.flipbookId) {
      setActiveSheet('flipbook');
      setLoadingFlipbook(true);
      getFlipbookProject(matched.flipbookId)
        .then((proj) => {
          if (!cancelled) setFlipbookProject(proj);
        })
        .catch((err) => {
          if (!cancelled) {
            setFlipbookError(err instanceof Error ? err.message : 'خطا در بارگذاری فلیپ‌بوک');
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingFlipbook(false);
        });
    } else {
      setActiveSheet('cover');
    }

    return () => {
      cancelled = true;
    };
  }, [slug, hasLoadedPublic, publicCatalogs, getFlipbookProject]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center" dir="rtl">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-600 dark:text-slate-400">در حال بارگذاری کاتالوگ فنی...</p>
      </div>
    );
  }

  if (!catalog) {
    return <NotFound />;
  }

  const dossier = getCatalogDossier(catalog);
  const coverCandidates = getUploadFallbackCandidates(
    resolveCatalogCoverImage(catalog.coverImage, catalog.id)
  );
  const coverSrc = coverCandidates[coverIdx];

  const handleGoToInquiry = () => {
    saveInquiryPrefill({
      sourceLabel: `کاتالوگ: ${catalog.title}`,
      boxType: catalog.title.includes('هاردباکس')
        ? 'هاردباکس مگنتی و لوکس'
        : catalog.title.includes('۰۴۲۷')
        ? 'جعبه کیبوردی قفل‌دار (FEFCO 0427)'
        : 'کارتن چهار درب (FEFCO 0201)',
      notes: `درخواست استعلام بر اساس کاتالوگ «${catalog.title}» (${catalog.category}) · ${dossier.code}`,
    });
    navigate('/inquiry');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 font-sans text-right" dir="rtl">
      <SeoHead
        customTitle={`${catalog.title} | کاتالوگ رسمی اشک قلم`}
        customDescription={catalog.description || `مشاهده و دریافت کاتالوگ ${catalog.title} در صنایع بسته‌بندی اشک قلم.`}
        canonicalPath={`/catalog/${catalog.slug || catalog.id}`}
        noIndex={false}
      />

      {/* Breadcrumb Row */}
      <div className="flex items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
        <BackButton label="بازگشت به آرشیو کاتالوگ‌ها" to="/catalog" variant="auto" />

        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <span>راهنمای فنی کاتالوگ</span>
        </button>
      </div>

      {showHelp && (
        <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
          <p className="font-bold mb-1">راهنمای مطالعه و ثبت سفارش تولید:</p>
          <p>
            با استفاده از زبانه‌های بالای تصویر می‌توانید بین کاتالوگ سه‌بعدی، عکس استودیویی، نقشه شماتیک برش و خط تا (Cut/Crease) و جدول تلورانس جابه‌جا شوید. روی تصاویر سه‌بعدی دوبار کلیک کنید تا تصویر و مشخصات آن بزرگ‌نمایی شود.
          </p>
        </div>
      )}

      {/* Main Split Editorial Presentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Visual Stage (8 columns when flipbook active so 3D book has spacious horizontal room) */}
        <div className={`${activeSheet === 'flipbook' && catalog.flipbookId ? 'lg:col-span-8' : 'lg:col-span-7'} space-y-4`}>
          {/* Interactive Spread Mode Switcher */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-w-full">
            {[
              ...(catalog.flipbookId
                ? [{ id: 'flipbook' as const, label: 'کاتالوگ سه‌بعدی (ورق‌زدن)' }]
                : []),
              { id: 'cover' as const, label: catalog.flipbookId ? 'تصویر جلد' : 'نمای استودیویی' },
              { id: 'cad' as const, label: 'شماتیک برش و خط تا' },
              { id: 'specs' as const, label: 'جدول تلورانس تولید' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSheet(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeSheet === tab.id
                    ? 'bg-white dark:bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Interactive Stage Frame */}
          {activeSheet === 'flipbook' && catalog.flipbookId && (
            <div className="h-[580px] sm:h-[660px] lg:h-[700px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#12141a]">
              {loadingFlipbook ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-3 text-sm">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  <span>در حال بارگذاری کاتالوگ سه‌بعدی...</span>
                </div>
              ) : flipbookError ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-rose-300 gap-2 text-xs p-6 text-center">
                  <AlertCircle className="w-7 h-7 text-rose-400" />
                  <span>{flipbookError}</span>
                </div>
              ) : flipbookProject ? (
                <Suspense
                  fallback={
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-3 text-sm">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                      <span>در حال بارگذاری نمایشگر سه‌بعدی...</span>
                    </div>
                  }
                >
                  <FlipbookViewer project={flipbookProject} compact />
                </Suspense>
              ) : null}
            </div>
          )}

          {activeSheet === 'cover' && (
            <div className="aspect-[4/3] rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              {coverSrc && !imgFailed ? (
                <img
                  src={coverSrc}
                  alt={catalog.title}
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (coverIdx + 1 < coverCandidates.length) {
                      setCoverIdx((prev) => prev + 1);
                    } else {
                      setImgFailed(true);
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-slate-500 text-center">
                  <BookOpen className="w-14 h-14 mb-3 opacity-50 text-amber-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{catalog.title}</span>
                </div>
              )}
            </div>
          )}

          {activeSheet === 'cad' && (
            <div className="aspect-[4/3]">
              <TechnicalSchematicSvg diagramType={dossier.diagramType} />
            </div>
          )}

          {activeSheet === 'specs' && (
            <div className="bg-white dark:bg-[#0d1320] border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                استانداردهای کارگاهی و تلورانس ساخت قالب
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                مقادیر مبنای تولید در خطوط دایکات، چسب‌زنی و لمینت اشک قلم
              </p>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-right text-xs md:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-bold">پارامتر فنی</th>
                      <th className="py-3 px-4 font-bold">مقدار استاندارد</th>
                      <th className="py-3 px-4 font-bold">تلورانس مجاز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {dossier.tableRows.map((row) => (
                      <tr key={row.spec}>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{row.spec}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{row.standard}</td>
                        <td className="py-3 px-4 font-mono tabular-nums text-amber-600 dark:text-amber-400">
                          {row.tolerance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right / Contiguous Engineering Spec & Order Module */}
        <div
          className={`${
            activeSheet === 'flipbook' && catalog.flipbookId ? 'lg:col-span-4' : 'lg:col-span-5'
          } bg-white dark:bg-[#0d1320] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-6`}
        >
          <div>
            {/* Clean Unboxed Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums mb-3">
              <span className="font-bold text-amber-600 dark:text-amber-400">{catalog.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{dossier.code}</span>
              {catalog.pageCount && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{catalog.pageCount} صفحه</span>
                </>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 leading-snug mb-4 [text-wrap:balance]">
              {catalog.title}
            </h1>

            {catalog.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {catalog.description}
              </p>
            )}

            {/* Engineering Attributes */}
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800 text-xs">
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  جنس و گرماژ مقوا
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200 text-left">
                  {dossier.boardOptions}
                </span>
              </div>
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-amber-500" />
                  خدمات چاپ و روکش
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200 text-left">
                  {dossier.finishOptions}
                </span>
              </div>
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-amber-500" />
                  شیت‌بندی تولید
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200 text-left">
                  {dossier.sheetHint}
                </span>
              </div>
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">وضعیت استاندارد</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تاییدشده برای خط تولید
                </span>
              </div>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleGoToInquiry}
              className="w-full py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>ثبت استعلام قیمت با مشخصات این کاتالوگ</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Link
                to="/tools/dieline"
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Box className="w-4 h-4 text-amber-400" />
                <span>طراحی ابعاد در جعبه‌ساز ۳D</span>
              </Link>

              {catalog.pdfUrl && (
                <a
                  href={catalog.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-amber-500 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>دریافت PDF</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
