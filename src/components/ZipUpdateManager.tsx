import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Archive,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Trash2,
  ExternalLink,
  FolderArchive,
  ShieldCheck,
  HardDrive,
  FileCode2,
  PlusCircle,
  History,
  X,
} from 'lucide-react';
import { apiRequestJson, apiPostJson } from '../utils/apiClient';

interface ToolBackupItem {
  fileName: string;
  sizeBytes: number;
  sizeMB: number;
  createdAt: string;
}

interface ToolPackageItem {
  id: string;
  title: string;
  description: string;
  category: 'design' | 'cad' | 'packaging' | 'custom' | string;
  isBuiltin: boolean;
  entryUrl: string;
  relDir: string;
  versionLabel?: string;
  notes?: string;
  updatedAt?: string | null;
  sourceFileName?: string | null;
  installed: boolean;
  fileCount: number;
  sizeBytes: number;
  sizeMB: number;
  backups: ToolBackupItem[];
}

interface ToolPackagesPayload {
  ok?: boolean;
  packages: ToolPackageItem[];
  limits?: {
    maxUploadMB: number;
    canExtractZip: boolean;
    backupSupported: boolean;
  };
  message?: string;
  error?: string;
}

const formatFaDateTime = (iso?: string | null): string => {
  if (!iso) return 'نسخه پیش‌فرض';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  try {
    return new Date(ts).toLocaleString('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
};

const uploadZipWithProgress = (
  url: string,
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<{ ok: boolean; status: number; data: ToolPackagesPayload | null }> =>
  new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        onProgress(Math.min(99, Math.round((ev.loaded / ev.total) * 100)));
      }
    };
    xhr.onload = () => {
      let parsed: ToolPackagesPayload | null = null;
      try {
        parsed = JSON.parse(xhr.responseText);
      } catch {}
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data: parsed,
      });
    };
    xhr.onerror = () => resolve({ ok: false, status: 0, data: null });
    xhr.send(formData);
  });

export const ZipUpdateManager: React.FC<{ isDarkMode?: boolean }> = () => {
  const [packages, setPackages] = useState<ToolPackageItem[]>([]);
  const [limits, setLimits] = useState<{ maxUploadMB: number; canExtractZip: boolean; backupSupported: boolean } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState<string>('photocraft');
  const [customSlug, setCustomSlug] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [preserveCleanLoader, setPreserveCleanLoader] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedBackupByTool, setSelectedBackupByTool] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const { res, data } = await apiRequestJson<ToolPackagesPayload>('tools/packages', { method: 'GET' }, 15000);
      if (res.ok && data?.packages) {
        setPackages(data.packages);
        setLimits(data.limits || null);
      } else {
        setNotice({ type: 'err', text: data?.error || 'دریافت فهرست بسته‌های نرم‌افزاری با خطا مواجه شد.' });
      }
    } catch {
      setNotice({ type: 'err', text: 'ارتباط با سرور برای دریافت لیست بسته‌ها برقرار نشد.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleFilePick = (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setNotice({ type: 'err', text: 'لطفاً فقط فایل فشرده با پسوند .zip انتخاب کنید.' });
      return;
    }
    setNotice(null);
    setSelectedFile(file);
  };

  const handleUploadReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setNotice({ type: 'err', text: 'ابتدا یک فایل .zip حاوی سورس ابزار انتخاب کنید.' });
      return;
    }
    if (selectedTarget === 'custom' && customSlug.trim().length < 2) {
      setNotice({ type: 'err', text: 'برای ابزار سفارشی، شناسه انگلیسی (Slug) حداقل ۲ کاراکتری وارد کنید.' });
      return;
    }

    setUploading(true);
    setUploadPercent(4);
    setNotice(null);

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('targetId', selectedTarget);
      if (selectedTarget === 'custom') {
        fd.append('customSlug', customSlug.trim().toLowerCase());
      }
      if (titleInput.trim()) fd.append('title', titleInput.trim());
      if (versionLabel.trim()) fd.append('versionLabel', versionLabel.trim());
      if (notes.trim()) fd.append('notes', notes.trim());
      fd.append('preserveCleanLoader', preserveCleanLoader ? 'true' : 'false');

      let resp = await uploadZipWithProgress('/api/tools/packages/upload', fd, setUploadPercent);
      if (!resp.ok && (resp.status === 404 || resp.status === 0 || resp.data === null)) {
        // Fallback to Pure-PHP cPanel endpoint
        resp = await uploadZipWithProgress('/api.php?r=tools/packages/upload', fd, setUploadPercent);
      }

      setUploadPercent(100);
      if (resp.ok && resp.data?.ok) {
        setPackages(resp.data.packages || []);
        setLimits(resp.data.limits || limits);
        setSelectedFile(null);
        setVersionLabel('');
        setNotes('');
        if (selectedTarget === 'custom') {
          setCustomSlug('');
          setTitleInput('');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        setNotice({
          type: 'ok',
          text: resp.data.message || 'فایل ZIP با موفقیت روی سرور استخراج و جایگزین شد.',
        });
      } else {
        setNotice({
          type: 'err',
          text: resp.data?.error || 'آپلود یا استخراج فایل ZIP روی سرور ناموفق بود.',
        });
      }
    } catch {
      setNotice({ type: 'err', text: 'خطا در ارسال فایل ZIP به سرور.' });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadPercent(0), 600);
    }
  };

  const handleRestoreBackup = async (pkg: ToolPackageItem) => {
    const chosen = selectedBackupByTool[pkg.id] || pkg.backups[0]?.fileName;
    if (!chosen) return;
    setBusyId(`restore:${pkg.id}`);
    setNotice(null);
    try {
      const { res, data } = await apiPostJson<ToolPackagesPayload>(
        'tools/packages/restore',
        { id: pkg.id, backupFile: chosen },
        60000
      );
      if (res.ok && data?.ok) {
        setPackages(data.packages || []);
        setNotice({ type: 'ok', text: data.message || 'نسخه پشتیبان با موفقیت بازگردانی شد.' });
      } else {
        setNotice({ type: 'err', text: data?.error || 'بازگردانی نسخه قبلی با خطا مواجه شد.' });
      }
    } catch {
      setNotice({ type: 'err', text: 'خطا در ارتباط با سرور هنگام بازگردانی نسخه قبلی.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeletePackage = async (pkg: ToolPackageItem) => {
    setBusyId(`delete:${pkg.id}`);
    setNotice(null);
    try {
      const { res, data } = await apiPostJson<ToolPackagesPayload>(
        'tools/packages/delete',
        { id: pkg.id, deleteBackups: false },
        30000
      );
      if (res.ok && data?.ok) {
        setPackages(data.packages || []);
        setNotice({ type: 'ok', text: data.message || 'فایل‌های ابزار پاک‌سازی شدند.' });
      } else {
        setNotice({ type: 'err', text: data?.error || 'پاک‌سازی فایل‌های ابزار ناموفق بود.' });
      }
    } catch {
      setNotice({ type: 'err', text: 'خطا در ارسال درخواست پاک‌سازی.' });
    } finally {
      setBusyId(null);
    }
  };

  const activeTargetPkg = packages.find((p) => p.id === selectedTarget) || null;

  return (
    <div className="space-y-6 dir-rtl text-right">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-l from-slate-900 via-slate-900 to-amber-950/35 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-base sm:text-lg font-black text-white">
                  مدیریت آپلود ZIP و جایگزینی سورس ابزارهای جانبی
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  بکاپ خودکار + بازگردانی یک‌کلیکی
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                فایل فشرده <code dir="ltr" className="text-amber-300">.zip</code> حاوی سورس یا نسخه اختصاصی ابزارهای جانبی (مانند PhotoCraft، VectorCraft، CADCraft، Box Studio یا ابزارهای جدید سفارشی) را آپلود کنید تا روی سرور استخراج و جایگزین نسخه پیش‌فرض شود. قبل از هر جایگزینی، نسخه قبلی به‌صورت خودکار بکاپ گرفته می‌شود.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchPackages}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            بروزرسانی لیست
          </button>
        </div>

        {notice && (
          <div
            className={`mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 border ${
              notice.type === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{notice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Upload & Replace Form */}
      <form
        onSubmit={handleUploadReplace}
        className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-white">آپلود و جایگزینی فایل ZIP روی سرور</h3>
          </div>
          {limits && (
            <span className="text-[11px] text-slate-400">
              حداکثر حجم آپلود: <strong className="text-slate-200">{limits.maxUploadMB} MB</strong>
            </span>
          )}
        </div>

        {/* Target Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300">۱. انتخاب ابزار مقصد جهت جایگزینی</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {packages
              .filter((p) => p.isBuiltin)
              .map((pkg) => {
                const active = selectedTarget === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      setSelectedTarget(pkg.id);
                      setTitleInput('');
                    }}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      active
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-black truncate">{pkg.id}</span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          pkg.installed ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{pkg.title.split('(')[0].trim()}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      {pkg.installed ? `${pkg.sizeMB} MB · ${pkg.fileCount} فایل` : 'نصب نشده'}
                    </div>
                  </button>
                );
              })}

            <button
              type="button"
              onClick={() => setSelectedTarget('custom')}
              className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                selectedTarget === 'custom'
                  ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                  : 'bg-slate-950/70 border-dashed border-slate-700 text-slate-300 hover:border-cyan-500/60'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-black text-cyan-300 mb-1">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>ابزار سفارشی جدید</span>
              </div>
              <div className="text-[11px] text-slate-400">نصب نرم‌افزار جدید در مسیر دلخواه</div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">/studio/&lt;slug&gt;/</div>
            </button>
          </div>
        </div>

        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {selectedTarget === 'custom' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                شناسه مسیر انگلیسی (Slug) *
              </label>
              <input
                type="text"
                dir="ltr"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value)}
                placeholder="e.g. dieline-pro"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 text-left focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              عنوان نمایشی ابزار (اختیاری)
            </label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder={activeTargetPkg ? activeTargetPkg.title : 'مثلاً: نسخه اختصاصی ویرایشگر'}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">برچسب نسخه (اختیاری)</label>
            <input
              type="text"
              dir="ltr"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="e.g. 0.25.0-custom"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 text-left focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className={selectedTarget === 'custom' ? 'md:col-span-3' : ''}>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">یادداشت تغییرات (اختیاری)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلاً: نسخه فارسی‌سازی شده با فونت جدید"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Drag & Drop ZIP Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0] || null;
            handleFilePick(f);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-amber-400 bg-amber-500/10'
              : selectedFile
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-700 bg-slate-950/60 hover:border-amber-500/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
          />
          <Archive
            className={`w-8 h-8 mx-auto mb-2 ${selectedFile ? 'text-emerald-400' : 'text-amber-400'}`}
          />
          {selectedFile ? (
            <div className="space-y-1">
              <div className="text-sm font-black text-emerald-300">{selectedFile.name}</div>
              <div className="text-xs text-slate-400 font-mono">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB — آماده آپلود و جایگزینی
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-bold text-slate-200">
                فایل <code dir="ltr" className="text-amber-300">.zip</code> را اینجا بکشید و رها کنید یا برای انتخاب کلیک کنید
              </div>
              <div className="text-[11px] text-slate-500">
                پوشه ریشه اضافی داخل ZIP به‌صورت هوشمند حذف شده و فایل <code dir="ltr">index.html</code> مستقیم در مسیر ابزار مستقر می‌شود.
              </div>
            </div>
          )}
        </div>

        {/* Options & Submit Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {(selectedTarget === 'photocraft' || selectedTarget === 'vectorcraft' || selectedTarget === 'cadcraft') ? (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={preserveCleanLoader}
                onChange={(e) => setPreserveCleanLoader(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <span>اعمال صفحه بارگذاری فارسی تمیز و دکمه‌های سوئیچ جایگزین پس از استخراج</span>
            </label>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>بررسی امنیت مسیرها (ضد Path Traversal) و بکاپ خودکار نسخه فعلی فعال است.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? `در حال آپلود و استخراج (${uploadPercent}%)` : 'آپلود و جایگزینی روی سرور'}</span>
          </button>
        </div>

        {uploading && (
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-amber-400 to-emerald-400 transition-all duration-200"
              style={{ width: `${uploadPercent}%` }}
            />
          </div>
        )}
      </form>

      {/* Installed Tools & Backup Rollback Inventory */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black text-white">وضعیت ابزارهای مستقر روی سرور و نسخه‌های پشتیبان</h3>
          </div>
          <span className="text-[11px] text-slate-400">{packages.length} بسته ثبت‌شده</span>
        </div>

        {loading && packages.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
            در حال بررسی فایل‌های سرور...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {packages.map((pkg) => {
              const chosenBackup = selectedBackupByTool[pkg.id] || pkg.backups[0]?.fileName || '';
              return (
                <div
                  key={pkg.id}
                  className="rounded-2xl bg-slate-950/75 border border-slate-800 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-white truncate">{pkg.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              pkg.installed
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {pkg.installed ? 'نصب‌شده' : 'خالی / نصب‌نشده'}
                          </span>
                          {!pkg.isBuiltin && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              سفارشی
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{pkg.description}</p>
                      </div>

                      {pkg.installed && (
                        <a
                          href={pkg.entryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold flex items-center gap-1 shrink-0"
                        >
                          <span>باز کردن</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 bg-slate-900/70 rounded-xl px-3 py-2 border border-slate-800/80">
                      <span className="flex items-center gap-1 font-mono text-slate-300">
                        <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
                        {pkg.relDir}
                      </span>
                      <span>
                        نسخه: <strong className="text-slate-200 font-mono">{pkg.versionLabel || '—'}</strong>
                      </span>
                      <span>
                        حجم: <strong className="text-slate-200 font-mono">{pkg.sizeMB} MB</strong> ({pkg.fileCount} فایل)
                      </span>
                      <span>آخرین تغییر: {formatFaDateTime(pkg.updatedAt)}</span>
                    </div>

                    {pkg.notes && (
                      <div className="text-[11px] text-slate-400 px-1">یادداشت: {pkg.notes}</div>
                    )}
                  </div>

                  {/* Rollback & Actions Footer */}
                  <div className="pt-2.5 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
                    {pkg.backups.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                        <History className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <select
                          value={chosenBackup}
                          onChange={(e) =>
                            setSelectedBackupByTool((prev) => ({ ...prev, [pkg.id]: e.target.value }))
                          }
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 font-mono truncate"
                        >
                          {pkg.backups.map((b) => (
                            <option key={b.fileName} value={b.fileName}>
                              {b.fileName} ({b.sizeMB} MB)
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRestoreBackup(pkg)}
                          disabled={busyId !== null}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3 h-3 ${busyId === `restore:${pkg.id}` ? 'animate-spin' : ''}`} />
                          <span>بازگردانی</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500">هنوز بکاپ جایگزینی ثبت نشده است.</span>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTarget(pkg.isBuiltin ? pkg.id : 'custom');
                          if (!pkg.isBuiltin) setCustomSlug(pkg.id);
                          setTitleInput(pkg.title);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold cursor-pointer"
                      >
                        جایگزینی ZIP
                      </button>

                      {pkg.installed && (
                        <button
                          type="button"
                          onClick={() => handleDeletePackage(pkg)}
                          disabled={busyId !== null}
                          title="پاک‌سازی فایل‌های این ابزار"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
