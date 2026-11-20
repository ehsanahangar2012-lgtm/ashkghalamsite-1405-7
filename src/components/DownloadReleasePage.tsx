import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, Copy, Check, HardDrive, RefreshCw, AlertTriangle, ArrowRight, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequestJson } from '../utils/apiClient';

interface ReleaseData {
  available: boolean;
  version: string;
  fileName: string;
  sizeBytes?: number;
  sizeMb?: number;
  downloadUrl?: string;
  staticUrl?: string;
}

interface DownloadReleasePageProps {
  onBack?: () => void;
  hideBreadcrumb?: boolean;
}

export const DownloadReleasePage: React.FC<DownloadReleasePageProps> = ({ onBack, hideBreadcrumb = false }) => {
  const [release, setRelease] = useState<ReleaseData>({
    available: true,
    version: '3.22.0',
    fileName: 'ashk-ghalam-v3.22.0-cpanel.zip',
    sizeMb: 6.95,
    downloadUrl: '/api/release/download',
    staticUrl: '/downloads/ashk-ghalam-v3.22.0-cpanel.zip',
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiRequestJson<ReleaseData>('release/latest', { cache: 'no-store' })
      .then(({ res, data }) => {
        if (isMounted && res.ok && data && data.fileName) {
          setRelease(data);
        }
      })
      .catch(() => {
        // Fallback to initial state
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const fullDownloadUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${release.downloadUrl || '/api/release/download'}`
    : '/api/release/download';

  const fullStaticUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${release.staticUrl || `/downloads/${release.fileName}`}`
    : `/downloads/${release.fileName}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullDownloadUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  const handleTriggerDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const targetName = release.fileName || 'ashk-ghalam-v3.22.0-cpanel.zip';
    const endpoints = [
      `${release.downloadUrl || '/api/release/download'}?t=${Date.now()}`,
      `/api.php?r=release/download&t=${Date.now()}`,
      `${release.staticUrl || `/downloads/${targetName}`}?t=${Date.now()}`,
    ];

    try {
      let downloadedBlob: Blob | null = null;
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { cache: 'no-store' });
          if (!res.ok) continue;
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          if (ct.includes('text/html')) continue;
          const blob = await res.blob();
          if (blob.size > 10000) {
            downloadedBlob = blob;
            break;
          }
        } catch {
          // try next
        }
      }

      if (!downloadedBlob) {
        // Fallback: direct browser anchor navigation
        const fallbackA = document.createElement('a');
        fallbackA.href = release.downloadUrl || '/api/release/download';
        fallbackA.download = targetName;
        fallbackA.target = '_blank';
        fallbackA.rel = 'noopener noreferrer';
        document.body.appendChild(fallbackA);
        fallbackA.click();
        document.body.removeChild(fallbackA);
        setStatusMessage('درخواست دانلود به مرورگر ارسال شد.');
        return;
      }

      const blobUrl = URL.createObjectURL(downloadedBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = targetName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);

      const mb = (downloadedBlob.size / (1024 * 1024)).toFixed(2);
      setStatusMessage(`فایل ${targetName} (${mb} مگابایت) با موفقیت دریافت و آماده دانلود شد.`);
    } catch (err: any) {
      setErrorMessage(
        'دانلود درون پیش‌نمایش به دلیل محدودیت iframe با خطا مواجه شد. لطفاً از دکمه «کپی لینک مستقیم» استفاده کرده و لینک را در یک تب جدید مرورگر باز کنید.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-4 px-2 sm:px-6 max-w-4xl mx-auto font-sans dir-rtl text-right">
      {/* Breadcrumb & Back */}
      {!hideBreadcrumb && (
        <div className="flex items-center justify-between mb-6">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت</span>
            </button>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت به صفحه اصلی</span>
            </Link>
          )}
          <span className="text-[11px] font-mono bg-amber-500/10 text-amber-500 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 font-bold">
            RELEASE v{release.version}
          </span>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-slate-150 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
            <Download className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                دریافت بسته نهایی استقرار cPanel اشک قلم
              </h1>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                نسخه {release.version}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              فایل زیپ کامل و استاندارد هاست اشتراکی cPanel (مجهز به بک‌اند خالص PHP در <code dir="ltr">api.php</code> بدون هیچ نیازی به Node.js) آماده استخراج مستقیم در <code dir="ltr">public_html</code>.
            </p>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div className="mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Spec Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">نام فایل بسته</span>
            <strong className="text-slate-900 dark:text-white font-mono text-[11px] block truncate" dir="ltr">
              {release.fileName}
            </strong>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">حجم پکیج</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold block">
              {release.sizeMb ? `${release.sizeMb} مگابایت` : 'حدود ۷ مگابایت'}
            </strong>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">ساختار فایل‌ها</span>
            <strong className="text-amber-600 dark:text-amber-400 font-bold block">
              Flat Root (بدون پوشه تودرتو)
            </strong>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">وضعیت سرور</span>
            <strong className="text-indigo-600 dark:text-indigo-400 font-bold block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>تایید شده و آماده</span>
            </strong>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleTriggerDownload}
            disabled={isDownloading}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-60"
          >
            {isDownloading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>در حال دریافت فایل از سرور و ذخیره...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>دانلود مستقیم فایل زیپ ({release.fileName})</span>
              </>
            )}
          </button>

          {/* Direct Link Options for iframe bypass */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>در صورت عدم شروع دانلود در پیش‌نمایش (محدودیت iframe مرورگر):</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 px-3 py-2 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 truncate" dir="ltr">
                {fullDownloadUrl}
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'کپی شد!' : 'کپی لینک دانلود'}</span>
              </button>

              <a
                href={release.downloadUrl || '/api/release/download'}
                target="_blank"
                rel="noopener noreferrer"
                download={release.fileName}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                <span>باز کردن در تب جدید</span>
              </a>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>لینک استاتیک جایگزین: <a href={fullStaticUrl} target="_blank" rel="noopener noreferrer" download={release.fileName} className="text-amber-500 underline font-mono" dir="ltr">{release.staticUrl}</a></span>
            </div>
          </div>
        </div>

        {/* cPanel Deployment Guide */}
        <div className="mt-8 pt-6 border-t border-slate-150 dark:border-slate-800">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3">
            راهنمای استقرار در هاست معمولی cPanel (بدون نیاز به Node.js یا ترمینال):
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed mr-1">
            <li>
              فایل <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400" dir="ltr">{release.fileName}</code> را در File Manager هاست وارد پوشه <code dir="ltr">public_html</code> کرده و Extract کنید.
            </li>
            <li>
              فایل‌های <code dir="ltr">index.html</code>، <code dir="ltr">api.php</code>، <code dir="ltr">.htaccess</code> و فایل‌های JSON داده‌ها مستقیماً در روت <code dir="ltr">public_html</code> قرار می‌گیرند و نیازی به هیچ تنظیم اضافه نیست.
            </li>
            <li>
              بک‌اند PHP به صورت خودکار تمام درخواست‌های ذخیره کاتالوگ سه‌بعدی، آپلود تصاویر (<code dir="ltr">uploads/flipbooks/</code>)، مقالات و تنظیمات را پردازش می‌کند.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
