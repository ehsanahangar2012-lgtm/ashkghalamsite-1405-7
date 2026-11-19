import React, { useState, useEffect, lazy, Suspense } from 'react';
import { CatalogItem } from '../../services/catalogService';
import { resolveCatalogCoverImage } from '../../utils/catalogAssets';
import { useCatalog } from '../../contexts/CatalogContext';
import { CatalogProject } from '../../types/flipbook';
import { BookOpen, ChevronLeft, ChevronRight, Download, Box, ArrowUpRight, Layers, Printer, Ruler, Loader2, AlertCircle } from 'lucide-react';
import { BackButton } from '../UIComponents';

const FlipbookViewer = lazy(() =>
  import('../studio/FlipbookViewer').then((m) => ({ default: m.FlipbookViewer }))
);

export interface CatalogTechnicalDossier {
  code: string;
  boardOptions: string;
  finishOptions: string;
  applications: string;
  sheetHint: string;
  diagramType: 'fefco0201' | 'hardbox' | 'mailer0427' | 'pharma';
  tableRows: { spec: string; standard: string; tolerance: string }[];
}

export function getCatalogDossier(catalog: CatalogItem): CatalogTechnicalDossier {
  const slugOrTitle = `${catalog.slug} ${catalog.title}`.toLowerCase();
  const specs = catalog.specs || {};

  if (slugOrTitle.includes('hardbox') || slugOrTitle.includes('هاردباکس')) {
    return {
      code: specs.standardCode || 'Rigid Book-Style / Shoulder',
      boardOptions: specs.boardOptions || 'مقوای کرجی ۲ تا ۳mm + روکش گلاسه ۱۵۰g یا کتان فانتزی',
      finishOptions: specs.finishOptions || 'سافت‌تاچ مخملی، طلاکوب ۲۴ عیار، UV موضعی، برجسته‌سازی، اینسرت فوم EVA',
      applications: specs.applications || 'بسته‌بندی صادراتی زعفران، عطر و ادکلن، جواهرات، ست هدایای مدیریتی',
      sheetHint: specs.sheetHint || 'چاپ روکش در ابعاد شیت ۱۰۰×۷۰ + برش لیزری و خط V-Groove دقیق',
      diagramType: 'hardbox',
      tableRows: [
        { spec: 'ضخامت مقوای کرجی مغزی', standard: '۲.۰ تا ۳.۰ میلی‌متر', tolerance: '±0.10 mm' },
        { spec: 'زاویه شیار V-Groove گوشه‌ها', standard: '۹۰ درجه دقیق (تیغ V)', tolerance: '±0.5°' },
        { spec: 'گرماژ کاغذ روکش لمینتی', standard: '۱۳۵ تا ۱۷۰ گرم گلاسه', tolerance: '±5 gsm' },
        { spec: 'قدرت مگنت درب (کتاب‌دار)', standard: 'N35 نئودیمیوم (۲ تا ۳ عدد)', tolerance: 'Flush Fit' },
      ],
    };
  }

  if (slugOrTitle.includes('0427') || slugOrTitle.includes('mailer') || slugOrTitle.includes('کیبوردی')) {
    return {
      code: specs.standardCode || 'FEFCO 0427 / 0426',
      boardOptions: specs.boardOptions || 'میکروویو E-Flute (۱.۶mm) کرافت طبیعی یا لمینتی سفید',
      finishOptions: specs.finishOptions || 'چاپ دوطرفه داخلی و بیرونی، خط پرفراژ بازشوی سریع، سلفون مات',
      applications: 'ارسال مرسولات فروشگاهی، لوازم دیجیتال، کتاب، پوشاک و پک‌های اشتراک',
      sheetHint: specs.sheetHint || 'چیدمان قفل‌شونده متداخل روی شیت ۷۰×۱۰۰ برای بهینه‌سازی مصرف ورق',
      diagramType: 'mailer0427',
      tableRows: [
        { spec: 'نوع فلوت استاندارد', standard: 'E-Flute (مایکروویو)', tolerance: '1.5 - 1.7 mm' },
        { spec: 'ساختار دیواره‌های جانبی', standard: 'دوبل تاشو قفل‌شونده', tolerance: 'بدون نیاز به چسب' },
        { spec: 'حاشیه بلید و لب‌پرداخت', standard: '۳.۰ تا ۵.۰ میلی‌متر', tolerance: '±0.20 mm' },
        { spec: 'مقاومت لهیدگی لبه (ECT)', standard: '۴.۵ تا ۵.۸ kN/m', tolerance: 'استاندارد پستی' },
      ],
    };
  }

  if (slugOrTitle.includes('ecma') || slugOrTitle.includes('pharma') || slugOrTitle.includes('دارو')) {
    return {
      code: specs.standardCode || 'ECMA A20.20 / A21.10',
      boardOptions: specs.boardOptions || 'ایندربرد سفید بهداشتی FBB و سولفات ۲۵۰ تا ۴۰۰ گرم',
      finishOptions: specs.finishOptions || 'نقطه بریل برجسته (Braille)، یووی موضعی، هولوگرام امنیتی، طلاکوب ظریف',
      applications: specs.applications || 'جعبه دارو و مکمل، سرم و کرم آرایشی، تیوب و ویال پزشکی',
      sheetHint: specs.sheetHint || 'تلورانس برش تیغ دایکات ±0.15mm جهت کارکرد بی‌نقص در ماشین پرکن',
      diagramType: 'pharma',
      tableRows: [
        { spec: 'مقوای مجاز بهداشتی/دارویی', standard: 'FBB ایندربرد ۳۰۰–۳۵۰g', tolerance: 'تاییدیه غذایی' },
        { spec: 'پهنای استاندارد لب‌چسب', standard: '۱۲ تا ۱۵ میلی‌متر', tolerance: '±0.15 mm' },
        { spec: 'زاویه پخ زبانه قفل (Tuck)', standard: '۱۵° با قوس ضدگیرکردگی', tolerance: 'Auto-Pack' },
        { spec: 'ارتفاع نقطه بریل استاندارد', standard: '۰.۱۸ تا ۰.۲۵ میلی‌متر', tolerance: 'Marburg Medium' },
      ],
    };
  }

  return {
    code: specs.standardCode || 'FEFCO 0201 / 0203 / 0301',
    boardOptions: specs.boardOptions || 'ورق ۳ لایه (B/C/E-Flute) و ۵ لایه سنگین صادراتی',
    finishOptions: specs.finishOptions || 'چاپ فلکسو ۴ رنگ یا لمینت افست گلاسه با سلفون محافظ رطوبت',
    applications: specs.applications || 'کارتن مادر صادراتی، بسته بندی لوازم خانگی، محصولات غذایی و قطعات صنعتی',
    sheetHint: specs.sheetHint || 'تولید در ابعاد آزاد خط کارتن‌سازی یا شیت لمینتی ۱۰۰×۷۰',
    diagramType: 'fefco0201',
    tableRows: [
      { spec: 'ضخامت ورق ۳ لایه / ۵ لایه', standard: '۳.۲mm (B) تا ۶.۸mm (BC)', tolerance: '±0.35 mm' },
      { spec: 'تخمین مقاومت فشاری (BCT)', standard: '۱۲۰ تا ۴۸۰ کیلوگرم‌نیرو', tolerance: 'تست آزمایشگاهی' },
      { spec: 'کسری جبران تاخوردگی (Fold Loss)', standard: '۱.۱۰ تا ۲.۱۰ میلی‌متر', tolerance: 'McKee Corrected' },
      { spec: 'اتصال درز بغل (Joint)', standard: 'لب‌چسب ۳۵mm یا منگنه مس', tolerance: '±1.0 mm' },
    ],
  };
}

export const TechnicalSchematicSvg: React.FC<{ diagramType: CatalogTechnicalDossier['diagramType'] }> = ({
  diagramType,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#0b111c] text-slate-200 p-5 md:p-6 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800 pb-3">
        <span>CAD BLUEPRINT · CUT / CREASE SCHEMATIC</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-sky-400 inline-block" />
            برش (Cut)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-emerald-400 inline-block" />
            خط تا (Crease)
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-4">
        {diagramType === 'fefco0201' && (
          <svg viewBox="0 0 420 230" className="w-full max-w-[400px] h-auto">
            <g stroke="#38bdf8" strokeWidth="1.5" fill="rgba(56,189,248,0.04)">
              <rect x="45" y="75" width="95" height="80" />
              <rect x="140" y="75" width="65" height="80" />
              <rect x="205" y="75" width="95" height="80" />
              <rect x="300" y="75" width="65" height="80" />
              <polygon points="45,75 25,83 25,147 45,155" fill="rgba(245,158,11,0.08)" />
              {/* Top Flaps */}
              <rect x="45" y="38" width="93" height="37" />
              <rect x="142" y="38" width="61" height="37" />
              <rect x="207" y="38" width="93" height="37" />
              <rect x="302" y="38" width="61" height="37" />
              {/* Bottom Flaps */}
              <rect x="45" y="155" width="93" height="37" />
              <rect x="142" y="155" width="61" height="37" />
              <rect x="207" y="155" width="93" height="37" />
              <rect x="302" y="155" width="61" height="37" />
            </g>
            <g stroke="#10b981" strokeWidth="1.4" strokeDasharray="4 3">
              <line x1="45" y1="75" x2="365" y2="75" />
              <line x1="45" y1="155" x2="365" y2="155" />
              <line x1="140" y1="75" x2="140" y2="155" />
              <line x1="205" y1="75" x2="205" y2="155" />
              <line x1="300" y1="75" x2="300" y2="155" />
              <line x1="45" y1="75" x2="45" y2="155" />
            </g>
            <g fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
              <text x="92" y="118">L</text>
              <text x="172" y="118">W</text>
              <text x="252" y="118">L</text>
              <text x="332" y="118">W</text>
              <text x="385" y="118" fill="#fbbf24">H</text>
              <text x="92" y="210" fill="#64748b">FEFCO 0201 · STANDARD RSC</text>
            </g>
          </svg>
        )}

        {diagramType === 'mailer0427' && (
          <svg viewBox="0 0 420 230" className="w-full max-w-[400px] h-auto">
            <g stroke="#38bdf8" strokeWidth="1.5" fill="rgba(56,189,248,0.04)">
              {/* Base */}
              <rect x="145" y="95" width="130" height="80" />
              {/* Top lid */}
              <rect x="145" y="15" width="130" height="80" />
              <path d="M 145 15 Q 210 2 275 15" fill="rgba(245,158,11,0.08)" />
              {/* Double side wings */}
              <rect x="85" y="95" width="60" height="80" />
              <rect x="275" y="95" width="60" height="80" />
              <polygon points="85,105 65,112 65,158 85,165" />
              <polygon points="335,105 355,112 355,158 335,165" />
              {/* Front lock roll */}
              <rect x="145" y="175" width="130" height="32" />
              <rect x="180" y="207" width="60" height="10" rx="3" fill="rgba(245,158,11,0.08)" />
            </g>
            <g stroke="#10b981" strokeWidth="1.4" strokeDasharray="4 3">
              <line x1="145" y1="95" x2="275" y2="95" />
              <line x1="145" y1="175" x2="275" y2="175" />
              <line x1="145" y1="95" x2="145" y2="175" />
              <line x1="275" y1="95" x2="275" y2="175" />
              <line x1="115" y1="95" x2="115" y2="175" />
              <line x1="305" y1="95" x2="305" y2="175" />
            </g>
            <g fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
              <text x="210" y="138">BASE (L × W)</text>
              <text x="210" y="58">TOP LID</text>
              <text x="115" y="138">2x WALL</text>
              <text x="305" y="138">2x WALL</text>
            </g>
          </svg>
        )}

        {diagramType === 'pharma' && (
          <svg viewBox="0 0 420 230" className="w-full max-w-[400px] h-auto">
            <g stroke="#38bdf8" strokeWidth="1.5" fill="rgba(56,189,248,0.04)">
              <rect x="75" y="65" width="70" height="100" />
              <rect x="145" y="65" width="55" height="100" />
              <rect x="200" y="65" width="70" height="100" />
              <rect x="270" y="65" width="55" height="100" />
              <polygon points="75,65 57,72 57,158 75,165" fill="rgba(245,158,11,0.08)" />
              {/* Top Tuck */}
              <rect x="75" y="32" width="70" height="33" />
              <path d="M 75 32 Q 110 12 145 32" fill="rgba(245,158,11,0.08)" />
              {/* Dust flaps */}
              <polygon points="145,65 152,40 193,40 200,65" />
              <polygon points="270,65 277,40 318,40 325,65" />
              {/* Bottom Tuck */}
              <rect x="200" y="165" width="70" height="33" />
              <path d="M 200 198 Q 235 218 270 198" fill="rgba(245,158,11,0.08)" />
              <polygon points="145,165 152,190 193,190 200,165" />
              <polygon points="270,165 277,190 318,190 325,165" />
            </g>
            <g stroke="#10b981" strokeWidth="1.4" strokeDasharray="4 3">
              <line x1="75" y1="65" x2="325" y2="65" />
              <line x1="75" y1="165" x2="325" y2="165" />
              <line x1="145" y1="65" x2="145" y2="165" />
              <line x1="200" y1="65" x2="200" y2="165" />
              <line x1="270" y1="65" x2="270" y2="165" />
            </g>
            <g fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
              <text x="110" y="118">FRONT</text>
              <text x="172" y="118">SIDE</text>
              <text x="235" y="118">BACK</text>
              <text x="297" y="118">SIDE</text>
            </g>
          </svg>
        )}

        {diagramType === 'hardbox' && (
          <svg viewBox="0 0 420 230" className="w-full max-w-[400px] h-auto">
            <g stroke="#fbbf24" strokeWidth="1.5" fill="rgba(251,191,36,0.05)">
              {/* Rigid Outer Magnetic Wrap */}
              <rect x="45" y="38" width="110" height="154" rx="2" />
              <rect x="155" y="38" width="38" height="154" />
              <rect x="193" y="38" width="110" height="154" rx="2" />
              <rect x="303" y="38" width="38" height="154" />
              <rect x="341" y="52" width="44" height="126" rx="2" fill="rgba(251,191,36,0.12)" />
            </g>
            <g stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3 3">
              <line x1="155" y1="38" x2="155" y2="192" />
              <line x1="193" y1="38" x2="193" y2="192" />
              <line x1="303" y1="38" x2="303" y2="192" />
              <line x1="341" y1="38" x2="341" y2="192" />
            </g>
            {/* Magnets */}
            <g fill="#38bdf8">
              <circle cx="363" cy="82" r="4" />
              <circle cx="363" cy="148" r="4" />
            </g>
            <g fill="#cbd5e1" fontSize="9" fontFamily="monospace" textAnchor="middle">
              <text x="100" y="118">BASE COVER</text>
              <text x="174" y="118">SPINE</text>
              <text x="248" y="118">TOP LID</text>
              <text x="363" y="120" fill="#fbbf24">MAGNET FLAP</text>
            </g>
          </svg>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-3">
        <span>پشتیبانی مستقیم خروجی وکتور DXF و PDF در جعبه‌ساز اشک قلم</span>
        <span className="font-mono text-amber-400 tabular-nums">{diagramType.toUpperCase()}</span>
      </div>
    </div>
  );
};

interface CatalogSpreadModalProps {
  catalog: CatalogItem;
  onClose: () => void;
  onRequestInquiry: (catalog: CatalogItem) => void;
  onOpenDielineStudio: () => void;
}

export const CatalogSpreadModal: React.FC<CatalogSpreadModalProps> = ({
  catalog,
  onClose,
  onRequestInquiry,
  onOpenDielineStudio,
}) => {
  const { getFlipbookProject } = useCatalog();
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const [flipbookProject, setFlipbookProject] = useState<CatalogProject | null>(null);
  const [loadingFlipbook, setLoadingFlipbook] = useState(Boolean(catalog.flipbookId));
  const [flipbookError, setFlipbookError] = useState<string | null>(null);

  const dossier = getCatalogDossier(catalog);
  const coverSrc = resolveCatalogCoverImage(catalog.coverImage, catalog.id);

  useEffect(() => {
    if (!catalog.flipbookId) {
      setLoadingFlipbook(false);
      setFlipbookProject(null);
      return;
    }
    let cancelled = false;
    setLoadingFlipbook(true);
    setFlipbookError(null);
    getFlipbookProject(catalog.flipbookId)
      .then((proj) => {
        if (!cancelled) setFlipbookProject(proj);
      })
      .catch((err) => {
        if (!cancelled) {
          setFlipbookError(err instanceof Error ? err.message : 'خطا در بارگذاری فلیپ‌بوک سه‌بعدی');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFlipbook(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalog.flipbookId, getFlipbookProject]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (!catalog.flipbookId) {
        if (e.key === 'ArrowLeft') setSpreadIndex((i) => Math.min(2, i + 1));
        if (e.key === 'ArrowRight') setSpreadIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, catalog.flipbookId]);

  const spreads = [
    { id: 0, title: 'نمای استودیویی و معرفی' },
    { id: 1, title: 'شماتیک خط برش و تا' },
    { id: 2, title: 'جدول استاندارد و تلورانس' },
  ];

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center p-2 sm:p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className={`w-full ${
          catalog.flipbookId
            ? 'max-w-[96vw] xl:max-w-[1440px] h-[94vh]'
            : 'max-w-5xl max-h-[90vh]'
        } bg-white dark:bg-[#0c111d] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Spread Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{catalog.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{dossier.code}</span>
              {catalog.pageCount && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{catalog.pageCount} صفحه</span>
                </>
              )}
            </div>
            <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-slate-100 truncate mt-0.5">
              {catalog.title}
            </h3>
          </div>

          <BackButton label="بستن و بازگشت" onClick={onClose} variant="auto" />
        </div>

        {/* Interactive Spread Tabs (for legacy non-flipbook technical catalogs) */}
        {!catalog.flipbookId && (
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5">
              {spreads.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setSpreadIndex(sp.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    spreadIndex === sp.id
                      ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sp.title}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={spreadIndex === 0}
                onClick={() => setSpreadIndex((i) => Math.max(0, i - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-35 cursor-pointer"
                aria-label="صفحه قبلی"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums px-1">
                0{spreadIndex + 1} / 03
              </span>
              <button
                type="button"
                disabled={spreadIndex === 2}
                onClick={() => setSpreadIndex((i) => Math.min(2, i + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-35 cursor-pointer"
                aria-label="صفحه بعدی"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Spread Canvas Content */}
        {catalog.flipbookId ? (
          <div className="flex-1 min-h-0 p-2 sm:p-3 bg-[#0d1017] flex flex-col">
            {loadingFlipbook ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3 text-sm">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span>در حال آماده‌سازی کاتالوگ سه‌بعدی...</span>
              </div>
            ) : flipbookError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-rose-300 gap-2 text-xs text-center p-6">
                <AlertCircle className="w-8 h-8 text-rose-400" />
                <span>{flipbookError}</span>
              </div>
            ) : flipbookProject ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <Suspense
                  fallback={
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3 text-sm">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                      <span>در حال بارگذاری نمایشگر سه‌بعدی...</span>
                    </div>
                  }
                >
                  <FlipbookViewer project={flipbookProject} compact />
                </Suspense>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 md:p-8">
          {spreadIndex === 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                {coverSrc && !imgFailed ? (
                  <img
                    src={coverSrc}
                    alt={catalog.title}
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-slate-500">
                    <BookOpen className="w-12 h-12 mb-3 text-amber-500 opacity-70" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{catalog.title}</span>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 flex flex-col justify-between gap-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">شرح مهندسی و کاربردها</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                    {catalog.description}
                  </p>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800 text-xs">
                    <div className="py-3 flex items-start justify-between gap-4">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        متریال پیشنهادی
                      </span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold text-left">
                        {dossier.boardOptions}
                      </span>
                    </div>
                    <div className="py-3 flex items-start justify-between gap-4">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5">
                        <Printer className="w-3.5 h-3.5 text-amber-500" />
                        چاپ و تکمیلی
                      </span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold text-left">
                        {dossier.finishOptions}
                      </span>
                    </div>
                    <div className="py-3 flex items-start justify-between gap-4">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-amber-500" />
                        شیت و برش
                      </span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold text-left">
                        {dossier.sheetHint}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {spreadIndex === 1 && (
            <div className="min-h-[340px]">
              <TechnicalSchematicSvg diagramType={dossier.diagramType} />
            </div>
          )}

          {spreadIndex === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                  جدول استانداردهای تولید و تلورانس کارگاهی
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  مشخصات فنی مبنا در خط چاپ، دایکات و جعبه‌چسبانی اشک قلم برای این سری کاتالوگ
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-bold">پارامتر مهندسی</th>
                      <th className="py-3 px-4 font-bold">استاندارد پیشنهادی</th>
                      <th className="py-3 px-4 font-bold">تلورانس مجاز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {dossier.tableRows.map((row) => (
                      <tr key={row.spec} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
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

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                کاربردهای متداول: <span className="font-semibold text-slate-900 dark:text-slate-200">{dossier.applications}</span>
              </p>
            </div>
          )}
          </div>
        )}

        {/* Sticky Bottom Action Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#090d17] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onRequestInquiry(catalog)}
              className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>استعلام قیمت بر اساس این کاتالوگ</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenDielineStudio}
              className="py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-amber-500 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Box className="w-4 h-4 text-amber-500" />
              <span>بازکردن جعبه‌ساز ۳D</span>
            </button>
          </div>

          {catalog.pdfUrl && (
            <a
              href={catalog.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="py-2 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>دانلود نسخه PDF</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
