import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  HardDrive,
  Package,
  Loader2,
  Link as LinkIcon,
  ShieldCheck,
  Palette,
  PenTool,
  Box,
} from 'lucide-react';
import { apiFetch, apiPostJson, apiRequestJson } from '../utils/apiClient';

export interface StudioItemStatus {
  id: 'photocraft' | 'vectorcraft' | 'cadcraft';
  name: string;
  title: string;
  description: string;
  category: string;
  version: string;
  downloadSizeMb: number;
  downloadUrl: string;
  entryUrl: string;
  installed: boolean;
  installedSizeMb: number;
  installedAt: string | null;
}

interface StudioCapabilities {
  canDownload: boolean;
  canExtractZip: boolean;
  studioDirWritable: boolean;
  runtime: string;
}

interface StudioStatusResponse {
  studios: StudioItemStatus[];
  capabilities?: StudioCapabilities;
}

const STUDIO_ACCENT: Record<
  StudioItemStatus['id'],
  { icon: React.ComponentType<{ className?: string }>; badge: string; ring: string; btn: string }
> = {
  photocraft: {
    icon: Palette,
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35',
    ring: 'border-cyan-500/30',
    btn: 'bg-cyan-600 hover:bg-cyan-500 text-white',
  },
  vectorcraft: {
    icon: PenTool,
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    ring: 'border-emerald-500/30',
    btn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
  cadcraft: {
    icon: Box,
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
    ring: 'border-sky-500/30',
    btn: 'bg-sky-600 hover:bg-sky-500 text-white',
  },
};

export const AdminStudioInstaller: React.FC = () => {
  const [studios, setStudios] = useState<StudioItemStatus[]>([]);
  const [capabilities, setCapabilities] = useState<StudioCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [installingAll, setInstallingAll] = useState(false);
  const [customUrls, setCustomUrls] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { res, data } = await apiRequestJson<StudioStatusResponse>('studios/status', {
        cache: 'no-store',
      });
      if (res.ok && data && Array.isArray(data.studios)) {
        setStudios(data.studios);
        if (data.capabilities) setCapabilities(data.capabilities);
      } else {
        setNotice({ type: 'error', text: 'دریافت وضعیت ابزارهای استودیو از سرور ناموفق بود.' });
      }
    } catch {
      setNotice({ type: 'error', text: 'ارتباط با سرور جهت بررسی وضعیت استودیوها برقرار نشد.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleInstallStudio = async (studio: StudioItemStatus): Promise<boolean> => {
    setBusyId(studio.id);
    setConfirmDeleteId(null);
    setNotice({
      type: 'info',
      text: `در حال دانلود و استخراج ${studio.name} روی هاست... بسته به سرعت اتصال سرور ممکن است ۳۰ تا ۱۲۰ ثانیه زمان ببرد.`,
    });

    try {
      const customUrl = (customUrls[studio.id] || '').trim();
      const { res, data } = await apiPostJson<StudioStatusResponse & { ok?: boolean; message?: string; error?: string }>(
        'studios/install',
        {
          studio: studio.id,
          ...(customUrl ? { customUrl } : {}),
        },
        600000
      );

      if (res.ok && data?.ok) {
        if (Array.isArray(data.studios)) setStudios(data.studios);
        if (data.capabilities) setCapabilities(data.capabilities);
        setNotice({
          type: 'success',
          text: data.message || `${studio.name} با موفقیت روی هاست دانلود و آماده بهره‌برداری شد.`,
        });
        return true;
      }

      setNotice({
        type: 'error',
        text: data?.error || `دانلود مستقیم ${studio.name} ناموفق بود. می‌توانید بسته ZIP آن را به صورت دستی آپلود کنید.`,
      });
      return false;
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err?.message || `خطا در نصب ${studio.name}. در صورت محدودیت شبکه هاست، از گزینه آپلود دستی ZIP استفاده کنید.`,
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleInstallAllMissing = async () => {
    const missing = studios.filter((s) => !s.installed);
    if (missing.length === 0) {
      setNotice({ type: 'info', text: 'همه ابزارهای استودیو هم‌اکنون روی هاست نصب و آماده هستند.' });
      return;
    }
    setInstallingAll(true);
    let successCount = 0;
    for (const studio of missing) {
      const ok = await handleInstallStudio(studio);
      if (ok) successCount += 1;
    }
    setInstallingAll(false);
    if (successCount === missing.length) {
      setNotice({
        type: 'success',
        text: `تمامی ${successCount} ابزار استودیو با موفقیت روی هاست نصب و تکمیل شدند.`,
      });
    }
  };

  const handleManualZipUpload = async (studio: StudioItemStatus, file: File | undefined) => {
    if (!file) return;
    setBusyId(studio.id);
    setConfirmDeleteId(null);
    setNotice({
      type: 'info',
      text: `در حال آپلود و استخراج بسته ${studio.name} (${(file.size / (1024 * 1024)).toFixed(1)} مگابایت)...`,
    });

    try {
      const fd = new FormData();
      fd.append('studio', studio.id);
      fd.append('file', file, file.name);
      const res = await apiFetch(`studios/upload?studio=${encodeURIComponent(studio.id)}`, {
        method: 'POST',
        body: fd,
      }, 600000);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        if (Array.isArray(data.studios)) setStudios(data.studios);
        if (data.capabilities) setCapabilities(data.capabilities);
        setNotice({
          type: 'success',
          text: data.message || `${studio.name} با موفقیت از فایل ZIP روی هاست نصب شد.`,
        });
      } else {
        setNotice({
          type: 'error',
          text: data?.error || `خطا در استخراج فایل ZIP برای ${studio.name}.`,
        });
      }
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err?.message || 'آپلود فایل ZIP با خطا مواجه شد.',
      });
    } finally {
      setBusyId(null);
      const input = fileInputRefs.current[studio.id];
      if (input) input.value = '';
    }
  };

  const handleUninstall = async (studio: StudioItemStatus) => {
    if (confirmDeleteId !== studio.id) {
      setConfirmDeleteId(studio.id);
      return;
    }
    setConfirmDeleteId(null);
    setBusyId(studio.id);
    try {
      const { res, data } = await apiPostJson<StudioStatusResponse & { ok?: boolean; message?: string; error?: string }>(
        'studios/uninstall',
        { studio: studio.id }
      );
      if (res.ok && data?.ok) {
        if (Array.isArray(data.studios)) setStudios(data.studios);
        setNotice({
          type: 'success',
          text: data.message || `فایل‌های ${studio.name} با موفقیت از هاست حذف شدند.`,
        });
      } else {
        setNotice({ type: 'error', text: data?.error || 'حذف فایل‌های استودیو با خطا مواجه شد.' });
      }
    } catch {
      setNotice({ type: 'error', text: 'خطا در ارتباط با سرور هنگام حذف فایل‌ها.' });
    } finally {
      setBusyId(null);
    }
  };

  const installedCount = studios.filter((s) => s.installed).length;
  const totalInstalledMb = studios.reduce((acc, s) => acc + (s.installed ? s.installedSizeMb : 0), 0);

  return (
    <div className="space-y-6 pb-10 dir-rtl text-right font-sans">
      {/* Header Summary Card */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <Package className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-white">
                نصب و تکمیل ابزارهای استودیو روی هاست
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                بسته اصلی cPanel سبک (~۲ مگابایت)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              برای آنکه فایل زیپ نصب اولیه سایت سبک (حدود ۱ تا ۲ مگابایت) بماند، فایل‌های حجیم{' '}
              <strong className="text-white">PhotoCraft</strong>،{' '}
              <strong className="text-white">VectorCraft</strong> و{' '}
              <strong className="text-white">CADCraft</strong> پس از استقرار سایت، مستقیماً از همین بخش روی سرور دانلود و استخراج می‌شوند.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallAllMissing}
              disabled={loading || installingAll || busyId !== null || installedCount === studios.length}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition cursor-pointer"
            >
              {installingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {installedCount === studios.length && studios.length > 0
                  ? 'همه ابزارها نصب شده‌اند'
                  : 'دانلود و نصب همه ابزارهای نصب‌نشده'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void fetchStatus()}
              disabled={loading || busyId !== null}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>به‌روزرسانی وضعیت</span>
            </button>
          </div>
        </div>

        {/* Metrics & Host Capability Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10.5px] text-slate-400 block mb-1">وضعیت تکمیل ابزارها</span>
            <strong className="text-white text-sm font-black">
              {installedCount} از {studios.length || 3} ابزار آماده
            </strong>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10.5px] text-slate-400 block mb-1">فضای اشغال‌شده روی هاست</span>
            <strong className="text-cyan-300 text-sm font-black">
              {totalInstalledMb.toFixed(1)} مگابایت
            </strong>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10.5px] text-slate-400 block mb-1">دانلود مستقیم سرور</span>
            <strong className={`text-sm font-black flex items-center gap-1 ${capabilities?.canDownload !== false ? 'text-emerald-400' : 'text-amber-400'}`}>
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{capabilities?.canDownload !== false ? 'فعال و آماده' : 'آپلود دستی ZIP'}</span>
            </strong>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10.5px] text-slate-400 block mb-1">استخراج خودکار ZIP</span>
            <strong className={`text-sm font-black flex items-center gap-1 ${capabilities?.canExtractZip !== false && capabilities?.studioDirWritable !== false ? 'text-emerald-400' : 'text-rose-400'}`}>
              <HardDrive className="w-4 h-4 shrink-0" />
              <span>
                {capabilities?.canExtractZip !== false && capabilities?.studioDirWritable !== false
                  ? 'آماده نصب'
                  : 'نیاز به بررسی دسترسی'}
              </span>
            </strong>
          </div>
        </div>
      </div>

      {/* Inline Notice */}
      {notice && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
            notice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : notice.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2.5 leading-relaxed">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : notice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 text-indigo-400 shrink-0 animate-spin" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-[10.5px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 shrink-0 cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {/* Studio Cards Grid */}
      {loading && studios.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center gap-3 text-slate-300 text-xs">
          <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
          <span>در حال بررسی وضعیت فایل‌های استودیو روی سرور...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {studios.map((studio) => {
            const accent = STUDIO_ACCENT[studio.id];
            const Icon = accent.icon;
            const isBusy = busyId === studio.id;
            const isAdvancedOpen = !!showAdvanced[studio.id];

            return (
              <div
                key={studio.id}
                className={`bg-slate-950/70 border rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-lg transition ${
                  studio.installed ? 'border-emerald-500/35' : 'border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${accent.badge}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">{studio.name}</h3>
                        <span className="text-[10.5px] text-slate-400 block">{studio.category}</span>
                      </div>
                    </div>

                    {studio.installed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-black">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>نصب‌شده</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10px] font-black">
                        <AlertTriangle className="w-3 h-3" />
                        <span>نصب‌نشده</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{studio.description}</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3">
                    <div>
                      <span className="text-slate-400 block text-[10px]">نسخه بسته</span>
                      <strong className="text-slate-100 font-mono" dir="ltr">
                        v{studio.version}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        {studio.installed ? 'حجم روی هاست' : 'حجم دانلود'}
                      </span>
                      <strong className="text-cyan-300">
                        {studio.installed
                          ? `${studio.installedSizeMb} مگابایت`
                          : `حدود ${studio.downloadSizeMb} مگابایت`}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => void handleInstallStudio(studio)}
                    disabled={isBusy || installingAll || busyId !== null}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow transition cursor-pointer disabled:opacity-50 ${accent.btn}`}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>در حال دانلود و نصب روی سرور...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>
                          {studio.installed
                            ? `به‌روزرسانی / نصب مجدد ${studio.name}`
                            : `دانلود و نصب خودکار ${studio.name}`}
                        </span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setShowAdvanced((prev) => ({ ...prev, [studio.id]: !prev[studio.id] }))
                      }
                      className="text-[11px] text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>آپلود دستی ZIP / لینک جایگزین</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {studio.installed && (
                        <>
                          <a
                            href={studio.entryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                          >
                            <span>اجرا</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleUninstall(studio)}
                            disabled={isBusy || busyId !== null}
                            className={`text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg transition cursor-pointer ${
                              confirmDeleteId === studio.id
                                ? 'bg-rose-600 text-white'
                                : 'text-rose-400 hover:bg-rose-950/60'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{confirmDeleteId === studio.id ? 'تأیید حذف' : 'حذف'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Manual ZIP Upload + Custom Mirror URL Fallback */}
                  {isAdvancedOpen && (
                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-[11px]">
                      <div className="space-y-1.5">
                        <label className="text-slate-300 font-bold flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-indigo-400" />
                          <span>لینک دانلود جایگزین (اختیاری - در صورت استفاده از آینه داخلی):</span>
                        </label>
                        <input
                          type="url"
                          dir="ltr"
                          value={customUrls[studio.id] || ''}
                          onChange={(e) =>
                            setCustomUrls((prev) => ({ ...prev, [studio.id]: e.target.value }))
                          }
                          placeholder={studio.downloadUrl}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono text-[10.5px] outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
                        <input
                          ref={(el) => {
                            fileInputRefs.current[studio.id] = el;
                          }}
                          type="file"
                          accept=".zip"
                          className="hidden"
                          onChange={(e) => void handleManualZipUpload(studio, e.target.files?.[0])}
                        />
                        <button
                          type="button"
                          disabled={isBusy || busyId !== null}
                          onClick={() => fileInputRefs.current[studio.id]?.click()}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>آپلود دستی فایل ZIP</span>
                        </button>

                        <a
                          href={studio.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                        >
                          <span>لینک رسمی بسته</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
