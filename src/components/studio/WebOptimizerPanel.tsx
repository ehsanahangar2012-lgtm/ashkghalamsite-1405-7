import React, { useState } from 'react';
import { Sliders, RefreshCw, Loader2, Check, AlertCircle } from 'lucide-react';
import { CatalogPage, OptimizationSettings } from '../../types/flipbook';
import {
  optimizeDataUrlToWebP,
  optimizeImageUrlToWebP,
  formatBytesFa,
  calculateSavingsPercent,
} from '../../utils/imageOptimizer';
import { uploadImageAssetToServer } from '../../services/projectStorageService';

interface WebOptimizerPanelProps {
  optimization: OptimizationSettings;
  pages: CatalogPage[];
  onChangeOptimization: (next: OptimizationSettings) => void;
  onReplaceAllOptimizedPages: (nextPages: CatalogPage[]) => void;
}

const DIMENSION_OPTIONS = [800, 1200, 1600, 2000];

export const WebOptimizerPanel: React.FC<WebOptimizerPanelProps> = ({
  optimization,
  pages,
  onChangeOptimization,
  onReplaceAllOptimizedPages,
}) => {
  const [reoptimizing, setReoptimizing] = useState(false);
  const [justApplied, setJustApplied] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);

  const totalOriginalBytes = pages.reduce((sum, p) => sum + (p.originalSizeBytes || 0), 0);
  const totalOptimizedBytes = pages.reduce((sum, p) => sum + (p.optimizedSizeBytes || 0), 0);
  const totalSavingsPercent = calculateSavingsPercent(totalOriginalBytes, totalOptimizedBytes);

  const handleReoptimizeAll = async () => {
    if (pages.length === 0 || reoptimizing) return;
    setReoptimizing(true);
    setJustApplied(false);
    setOptError(null);

    try {
      const updated: CatalogPage[] = [];
      let failedCount = 0;
      let uploadedAny = false;

      for (const page of pages) {
        try {
          const source = page.optimizedDataUrl || page.originalDataUrl;
          if (!source) {
            updated.push(page);
            continue;
          }
          const result = source.startsWith('data:')
            ? await optimizeDataUrlToWebP(source, page.originalSizeBytes, optimization)
            : await optimizeImageUrlToWebP(source, optimization);

          const storedUrl = await uploadImageAssetToServer(result.optimizedDataUrl);
          if (!storedUrl.startsWith('data:')) {
            uploadedAny = true;
          }

          updated.push({
            ...page,
            originalDataUrl: storedUrl,
            optimizedDataUrl: storedUrl,
            originalSizeBytes: page.originalSizeBytes || result.originalSizeBytes,
            optimizedSizeBytes: result.optimizedSizeBytes,
            originalWidth: page.originalWidth || result.originalWidth,
            originalHeight: page.originalHeight || result.originalHeight,
            width: result.width,
            height: result.height,
          });
        } catch {
          failedCount += 1;
          updated.push(page);
        }
      }

      if (uploadedAny && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('ashk-media-synced'));
      }

      onReplaceAllOptimizedPages(updated);
      if (failedCount > 0) {
        setOptError(
          `تبدیل مجدد ${failedCount.toLocaleString('fa-IR')} صفحه با خطا مواجه شد و نسخه قبلی آن‌ها حفظ گردید.`
        );
      } else {
        setJustApplied(true);
        setTimeout(() => setJustApplied(false), 2500);
      }
    } finally {
      setReoptimizing(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Optimization Settings Card */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-5">
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-extrabold text-stone-900">تنظیمات فشرده‌سازی WebP</h3>
          </div>
          <span className="text-[11px] text-stone-500">پردازش سمت کلاینت</span>
        </div>

        {/* Quality Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="webp-quality" className="font-bold text-stone-700">
              کیفیت خروجی WebP
            </label>
            <span className="font-mono font-bold text-amber-700 tabular-nums">
              {Math.round(optimization.quality * 100)}٪
            </span>
          </div>
          <input
            id="webp-quality"
            type="range"
            min={0.4}
            max={0.95}
            step={0.05}
            value={optimization.quality}
            onChange={(e) =>
              onChangeOptimization({
                ...optimization,
                quality: parseFloat(e.target.value),
              })
            }
            className="w-full accent-amber-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-stone-400">
            <span>حجم کمتر (۴۰٪)</span>
            <span>تعادل وب (۸۰٪)</span>
            <span>کیفیت بالا (۹۵٪)</span>
          </div>
        </div>

        {/* Max Dimension */}
        <div className="space-y-2">
          <span className="block text-xs font-bold text-stone-700">حداکثر ابعاد (عرض یا ارتفاع)</span>
          <div className="grid grid-cols-4 gap-2">
            {DIMENSION_OPTIONS.map((dim) => {
              const active = optimization.maxDimension === dim;
              return (
                <button
                  key={dim}
                  type="button"
                  onClick={() => onChangeOptimization({ ...optimization, maxDimension: dim })}
                  className={`py-2 px-2 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer tabular-nums ${
                    active
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {dim}px
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleReoptimizeAll}
          disabled={reoptimizing || pages.length === 0}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-45 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {reoptimizing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : justApplied ? (
            <Check className="w-4 h-4" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>
            {reoptimizing
              ? 'در حال بهینه‌سازی مجدد صفحات...'
              : justApplied
              ? 'تمام صفحات با تنظیمات جدید بهینه شدند'
              : 'اعمال تنظیمات و تبدیل مجدد صفحات به WebP'}
          </span>
        </button>

        {optError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>{optError}</span>
          </div>
        )}
      </div>

      {/* Total Size Metrics */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-stone-900">گزارش کاهش حجم کل کاتالوگ</h4>
          <span className="text-xs font-bold text-emerald-700 tabular-nums">
            {totalSavingsPercent.toLocaleString('fa-IR')}٪ صرفه‌جویی
          </span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-stone-100 text-center py-4">
          <div className="px-2">
            <div className="text-[11px] text-stone-500">حجم اولیه</div>
            <div className="text-xs sm:text-sm font-extrabold text-stone-800 mt-1 tabular-nums">
              {formatBytesFa(totalOriginalBytes)}
            </div>
          </div>
          <div className="px-2">
            <div className="text-[11px] text-stone-500">حجم خروجی WebP</div>
            <div className="text-xs sm:text-sm font-extrabold text-emerald-700 mt-1 tabular-nums">
              {formatBytesFa(totalOptimizedBytes)}
            </div>
          </div>
          <div className="px-2">
            <div className="text-[11px] text-stone-500">بارگذاری تنبل</div>
            <div className="text-xs sm:text-sm font-extrabold text-amber-700 mt-1">فعال (Lazy)</div>
          </div>
        </div>

        {/* Per-Page Size Breakdown Table */}
        {pages.length > 0 && (
          <div className="border-t border-stone-100 overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 text-[11px] text-stone-500 border-b border-stone-100">
                <tr>
                  <th className="py-2.5 px-4 font-bold">صفحه</th>
                  <th className="py-2.5 px-3 font-bold">ابعاد</th>
                  <th className="py-2.5 px-3 font-bold">قبل</th>
                  <th className="py-2.5 px-3 font-bold">بعد (WebP)</th>
                  <th className="py-2.5 px-4 font-bold">کاهش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 tabular-nums">
                {pages.map((p, idx) => {
                  const pct = calculateSavingsPercent(p.originalSizeBytes, p.optimizedSizeBytes);
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/60">
                      <td className="py-2.5 px-4 font-semibold text-stone-800 max-w-[140px] truncate">
                        {(idx + 1).toLocaleString('fa-IR')}. {p.title || p.fileName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">
                        {p.width}×{p.height}
                      </td>
                      <td className="py-2.5 px-3 text-stone-500">{formatBytesFa(p.originalSizeBytes)}</td>
                      <td className="py-2.5 px-3 font-bold text-stone-900">
                        {formatBytesFa(p.optimizedSizeBytes)}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">{pct.toLocaleString('fa-IR')}٪</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
