import React, { useState, useRef, useEffect } from 'react';
import { getApiBase } from '../utils/apiBase';
import { 
  Upload, CheckCircle, AlertTriangle, RefreshCw, ShieldCheck, 
  FileText, FolderArchive, ArrowRight, Download, Eye, Layers, 
  Database, Info, Sparkles, Check, X, ShieldAlert, Cpu, HardDrive,
  Globe, Server, Search, FileCode
} from 'lucide-react';

export interface UpdateManifest {
  version: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  appId?: string;
  buildTarget?: string;
  protectedDirectories?: string[];
  changelog?: string[];
}

export interface ZipAnalysisResult {
  filename: string;
  meta: UpdateManifest;
  packageType: 'web_build' | 'media_pack' | 'full_hybrid';
  packageTypeName: string;
  stats: {
    distCount: number;
    mediaCount: number;
    dbCount: number;
    totalFiles: number;
  };
  files: { name: string; isDirectory: boolean; size: number; target?: string }[];
  dataProtectionGuarantee: string;
}

interface ZipUpdateManagerProps {
  isDarkMode?: boolean;
  onUpdateCompleted?: () => void;
}

export const ZipUpdateManager: React.FC<ZipUpdateManagerProps> = ({ 
  isDarkMode = false,
  onUpdateCompleted
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  const [analysis, setAnalysis] = useState<ZipAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deploy' | 'guide' | 'export_host' | 'history'>('deploy');
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    'آماده به کار: سیستم آماده دریافت فایل ZIP کامپایل‌شده (npm run build) می‌باشد.'
  ]);

  // States for physical files inside dist directory
  const [distFiles, setDistFiles] = useState<{ relativePath: string; size: number; category: 'frontend' | 'server' | 'other'; updatedAt: string }[]>([]);
  const [isLoadingDist, setIsLoadingDist] = useState(false);
  const [distError, setDistError] = useState<string | null>(null);
  const [distSearchQuery, setDistSearchQuery] = useState('');
  const [distCategoryFilter, setDistCategoryFilter] = useState<'all' | 'frontend' | 'server'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString('fa-IR')}] ${msg}`, ...prev.slice(0, 30)]);
  };

  const fetchDistFiles = async () => {
    setIsLoadingDist(true);
    setDistError(null);
    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/build/files`.replace(/\/\//g, '/'));
      if (!response.ok) {
        throw new Error('خطا در دریافت لیست فایل‌ها از سرور.');
      }
      const data = await response.json();
      if (data.success) {
        setDistFiles(data.files || []);
      } else {
        throw new Error(data.error || 'خطا در دریافت لیست فایل‌ها.');
      }
    } catch (err: any) {
      setDistError(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsLoadingDist(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'export_host') {
      fetchDistFiles();
    }
  }, [activeTab]);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMsg('لطفاً فقط فایل با فرمت فشرده .ZIP بارگذاری نمایید.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsAnalyzing(true);
    setUploadProgress(0);
    addLog(`در حال دریافت و واکاوی فایل ZIP: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`);

    try {
      const formData = new FormData();
      formData.append('updatePack', file);

      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<ZipAnalysisResult>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              resolve(res);
            } catch (err) {
              reject(new Error('پاسخ سرور فرمت معتبر JSON ندارد.'));
            }
          } else {
            try {
              const errRes = JSON.parse(xhr.responseText);
              reject(new Error(errRes.error || `خطای سرور: ${xhr.status}`));
            } catch {
              reject(new Error(`خطای دریافت فایل در سرور (کد ${xhr.status})`));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('ارتباط با سرور در حین آپلود قطع شد.')));
        const apiBase = getApiBase();
        xhr.open('POST', `${apiBase}/api/update/upload`.replace(/\/\//g, '/'));
        xhr.send(formData);
      });

      const result = await uploadPromise;
      setAnalysis(result);
      setIsAnalyzing(false);
      setUploadProgress(null);
      addLog(`✅ تحلیل ساختار فایل زیپ با موفقیت انجام شد. نسخه مانیفست: ${result.meta.version}`);
      addLog(`📊 تعداد ${result.stats.distCount} فایل کامپایل‌شده (dist) و ${result.stats.mediaCount} فایل رسانه ایزوله گردیدند.`);
    } catch (err: any) {
      setIsAnalyzing(false);
      setUploadProgress(null);
      setErrorMsg(err.message || 'خطا در بارگذاری فایل زیپ');
      addLog(`❌ خطا در تحلیل بسته: ${err.message}`);
    }
  };

  const handleApplyUpdate = async () => {
    if (!analysis) return;

    setIsApplying(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    addLog('🚀 در حال ایجاد نقطه بازیابی خودکار (Pre-Update Restore Point) در سرور...');

    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/update/apply`.replace(/\/\//g, '/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: analysis.filename })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'خطا در استخراج کدهای جدید در پوشه dist');
      }

      const data = await res.json();
      const webExtracted = data.extractedWebFilesCount || 0;
      const mediaExtracted = data.extractedMediaCount || 0;

      addLog(`✅ فایل‌های کلاینت در پوشه dist جایگزین شدند: ${webExtracted} فایل کد و ${mediaExtracted} فایل رسانه.`);
      setSuccessMsg(`بروزرسانی با موفقیت اعمال شد! ${webExtracted} فایل کامپایل‌شده جایگزین گردید و کلیه داده‌های کاتالوگ شما محفوظ ماندند.`);
      setAnalysis(null);
      setIsApplying(false);

      if (onUpdateCompleted) {
        onUpdateCompleted();
      }

      setTimeout(() => {
        window.location.reload();
      }, 2500);

    } catch (err: any) {
      setIsApplying(false);
      setErrorMsg(err.message || 'خطا در اعمال تغییرات آپدیت');
      addLog(`❌ خطا در اجرای آپدیت: ${err.message}`);
    }
  };

  const handleRollback = async () => {
    if (!confirm('آیا از بازگردانی کدهای سرور به نسخه ماقبل آخرین آپدیت اطمینان دارید؟')) return;

    setIsRollingBack(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    addLog('🔄 در حال بازیابی کدهای ذخیره شده در نقطه رول‌بک...');

    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/update/rollback`.replace(/\/\//g, '/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'خطا در اجرای رول‌بک');
      }

      const data = await res.json();
      addLog('✅ کدهای سرور و دیتابیس به حالت ماقبل آخرین آپدیت بازگشت.');
      setSuccessMsg(data.message || 'بازیابی اضطراری با موفقیت به پایان رسید.');
      setIsRollingBack(false);

      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err: any) {
      setIsRollingBack(false);
      setErrorMsg(err.message || 'خطا در اجرای بازیابی اضطراری');
      addLog(`❌ خطا در رول‌بک: ${err.message}`);
    }
  };

  const sampleManifestJson = JSON.stringify({
    "version": "3.2.0",
    "title": "بروزرسانی کدهای فرانت‌اند و قالب‌های دیلاین",
    "description": "شامل آخرین تغییرات رابط کاربری، موتور محاسباتی BCT و رفع ایرادات گالری کاتالوگ‌ها.",
    "author": "دپارتمان توسعه نرم‌افزار اشک‌قلم",
    "createdAt": new Date().toISOString(),
    "buildTarget": "dist",
    "protectedDirectories": [
      "/public/uploads",
      "/catalogs",
      "/user_data"
    ],
    "fileHashes": {
      "index.html": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "assets/index.js": "9a0a4c2847fb1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b821"
    }
  }, null, 2);

  const downloadManifestTemplate = () => {
    const blob = new Blob([sampleManifestJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 dir-rtl text-right">
      {/* Header card */}
      <div className="bg-gradient-to-r from-slate-900 via-violet-950/60 to-slate-900 border border-violet-500/30 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-violet-500/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2.5 bg-violet-600/20 border border-violet-500/40 rounded-2xl text-violet-400">
                <FolderArchive className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  مدیریت هوشمند آپدیت و جایگزینی فایل‌های ZIP
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                    حفاظت از کاتالوگ‌ها ٪۱۰۰
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  اعتبارسنجی ساختار فایل‌ها با <code className="text-violet-300 font-mono font-bold">manifest.json</code> و تزریق مستقیم خروجی <code className="text-violet-300 font-mono font-bold">npm run build</code> به سیستم
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => setActiveTab('deploy')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'deploy' 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              آپلود و نصب آپدیت
            </button>

            <button
              onClick={() => setActiveTab('export_host')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'export_host' 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              دریافت خروجی فیزیکی (هاست)
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'guide' 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              راهنمای ساخت Manifest
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab: Deploy */}
      {activeTab === 'deploy' && (
        <div className="space-y-6">
          {/* Data Protection Guarantee Callout */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-100 space-y-1">
              <p className="font-extrabold text-sm text-emerald-300">تضمین ایزوله‌سازی کاتالوگ‌ها و داده‌های کاربر:</p>
              <p className="text-emerald-200/90 leading-relaxed">
                این کامپوننت با خواندن مانیفست <code className="font-mono text-emerald-300 font-bold">manifest.json</code> خروجی build پروژه را تفکیک می‌کند. فقط کدهای کامپایل‌شده اجرایی کلاینت (فایل‌های HTML, JS, CSS داخل پوشه <code className="font-mono text-emerald-300">dist/</code>) به‌روز می‌شوند و هیچ‌کدام از کاتالوگ‌ها، تصاویر آپلودشده، سفارشات و تنظیمات شما تحت هیچ شرایطی پاک یا دستکاری نمی‌شوند.
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl transition"
              >
                بارگذاری مجدد برنامه
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag and Drop Zone */}
          {!analysis && !isAnalyzing && (
            <div
              className={`w-full border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer relative ${
                dragActive 
                  ? 'border-violet-500 bg-violet-950/30 scale-[1.01]' 
                  : 'border-slate-800 hover:border-violet-500/50 hover:bg-slate-900/40 bg-slate-950/40'
              }`}
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              <div className="p-5 bg-violet-600/20 border border-violet-500/40 rounded-3xl text-violet-400 shadow-xl">
                <Upload className="w-10 h-10 text-violet-400" />
              </div>

              <div className="text-center space-y-1.5">
                <p className="text-base text-slate-100 font-extrabold">
                  برای آپلود و بررسی فایل آپدیت، فایل زیپ پروژه (<code className="text-violet-400 font-mono">dist.zip</code> یا build output) را اینجا رها کنید یا کلیک کنید
                </p>
                <p className="text-xs text-slate-400">
                  سازگار با فایل‌های <code className="text-violet-300 font-mono">dist.zip</code>، خروجی‌های استاندارد <code className="text-violet-300 font-mono">npm run build</code> و فایل حاوی <code className="text-violet-300 font-mono">manifest.json</code>
                </p>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-900">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> بررسی خودکار ساختار</span>
                <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 text-violet-400" /> پشتیبان‌گیری پیش از جایگزینی</span>
                <span className="flex items-center gap-1"><Database className="w-3.5 h-3.5 text-amber-400" /> حفظ کامل دیتابیس کاتالوگ‌ها</span>
              </div>
            </div>
          )}

          {/* Analyzing Progress Spinner */}
          {isAnalyzing && (
            <div className="p-10 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
              <RefreshCw className="w-10 h-10 text-violet-400 animate-spin mx-auto animate-duration-1000" />
              <div className="space-y-1">
                <p className="text-sm text-slate-200 font-extrabold">در حال دریافت و اعتبارسنجی مانیفست فایل زیپ...</p>
                <p className="text-xs text-slate-400">سیستم در حال جداسازی کدهای فرانت‌اند از فایل‌های رسانه‌ای و بررسی لایه‌های امنیتی است.</p>
              </div>

              {uploadProgress !== null && (
                <div className="w-80 mx-auto space-y-2 pt-2">
                  <div className="flex justify-between text-xs text-slate-300 font-bold">
                    <span>پیشرفت آپلود: {uploadProgress}%</span>
                    <span>بارگذاری روی سرور</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-400 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analysis & Manifest Review */}
          {analysis && (
            <div className="bg-slate-900/90 border border-violet-500/40 rounded-3xl p-6 space-y-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400">
                    <ShieldCheck className="w-6 h-6" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-base text-white">تایید اعتبار مانیفست و اعتبارسنجی فایل زیپ</h3>
                    <p className="text-xs text-slate-400 font-medium">{analysis.packageTypeName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-violet-950 border border-violet-500/40 text-violet-300 px-3 py-1 rounded-full text-xs font-mono font-bold">
                    نسخه {analysis.meta.version}
                  </span>
                </div>
              </div>

              {/* Stats overview cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-center">
                  <span className="text-[11px] text-slate-400 font-bold block">کدهای فرانت‌اند (dist)</span>
                  <span className="text-lg font-extrabold text-violet-400 font-mono">{analysis.stats.distCount} فایل</span>
                </div>
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-center">
                  <span className="text-[11px] text-slate-400 font-bold block">فایل‌های رسانه‌ای (uploads)</span>
                  <span className="text-lg font-extrabold text-teal-400 font-mono">{analysis.stats.mediaCount} فایل</span>
                </div>
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-center">
                  <span className="text-[11px] text-slate-400 font-bold block">متاداده‌های ساختاری</span>
                  <span className="text-lg font-extrabold text-amber-400 font-mono">{analysis.stats.dbCount} مورد</span>
                </div>
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-center">
                  <span className="text-[11px] text-slate-400 font-bold block">مجموع کل آیتم‌ها</span>
                  <span className="text-lg font-extrabold text-white font-mono">{analysis.stats.totalFiles} آیتم</span>
                </div>
              </div>

              {/* Manifest Meta details */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <span className="text-slate-400 font-bold">عنوان بسته:</span>
                  <span className="text-white font-extrabold">{analysis.meta.title}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <span className="text-slate-400 font-bold">توضیحات و تغییرات:</span>
                  <span className="text-slate-300 truncate max-w-md">{analysis.meta.description}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-400 pt-1">
                  <div>نویسنده/ناشر: <span className="text-slate-200 font-bold">{analysis.meta.author}</span></div>
                  <div>تاریخ تحلیل: <span className="text-slate-200 font-mono">{new Date().toLocaleDateString('fa-IR')}</span></div>
                </div>
              </div>

              {/* Files Mapping Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200">نقشه جایگزینی فایل‌های زیپ در دایرکتوری‌های سرور:</span>
                  <button 
                    onClick={() => setShowManifestModal(true)}
                    className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 font-bold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    مشاهده ساختار خام manifest.json
                  </button>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-900 text-xs font-mono max-h-48 overflow-y-auto space-y-1.5 dir-ltr">
                  {analysis.files.map((file, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-900/60 last:border-0">
                      <span className="truncate max-w-sm text-slate-200">{file.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-violet-300 font-bold bg-violet-950/60 px-2 py-0.5 rounded border border-violet-800/40">
                          {file.target || 'dist/'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold min-w-[60px] text-right">
                          {file.isDirectory ? 'پوشه' : `${(file.size / 1024).toFixed(1)} KB`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm / Cancel Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleApplyUpdate}
                  disabled={isApplying}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs py-3.5 px-6 rounded-2xl transition shadow-xl shadow-violet-600/30 flex items-center justify-center gap-2 border-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isApplying ? 'animate-spin' : ''}`} />
                  {isApplying ? 'در حال ایجاد بکاپ و جایگزینی فایل‌ها...' : 'تایید و نصب فوری آپدیت روی سرور (تضمین حفظ دیتابیس)'}
                </button>

                <button
                  onClick={() => {
                    setAnalysis(null);
                    addLog('فرآیند نصب زیپ لغو شد.');
                  }}
                  disabled={isApplying}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-3.5 px-5 rounded-2xl transition"
                >
                  لغو انصراف
                </button>
              </div>
            </div>
          )}

          {/* Rollback section */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h4 className="font-bold text-sm text-white">بازیابی اضطراری و رول‌بک هوشمند (Emergency Rollback)</h4>
              </div>
              <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                SAFE POINT ACTIVE
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              پیش از هر ارتقاء، سیستم به‌طور خودکار یک ایمیج کامل از فایل‌های کلاینت ماقبل آپدیت ایزوله می‌کند. در صورت مواجهه با هرگونه ناهماهنگی پس از آپدیت، می‌توانید با دکمه زیر کدهای سرور را به نقطه امن قبلی بازگردانید.
            </p>

            <div className="flex justify-between items-center bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-200 block">نقطه بازیابی خودکار سرور آماده است</span>
                <span className="text-[10px] text-slate-500">تمامی داده‌های کاتالوگ و فرمول‌ها در نقطه رول‌بک حفظ شده‌اند.</span>
              </div>

              <button
                onClick={handleRollback}
                disabled={isRollingBack}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRollingBack ? 'animate-spin' : ''}`} />
                {isRollingBack ? 'در حال اجرا...' : 'بازگردانی به کد قبلی (Rollback)'}
              </button>
            </div>
          </div>

          {/* System Logs */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span className="text-xs font-extrabold text-slate-300 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-violet-400" />
                گزارش زنده فعالیت‌های موتور آپدیت
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{logs.length} رویداد</span>
            </div>

            <div className="bg-black/80 p-3.5 rounded-2xl font-mono text-[11px] text-slate-400 max-h-40 overflow-y-auto space-y-1.5 dir-ltr">
              {logs.map((log, lIdx) => (
                <div key={lIdx} className="border-b border-slate-900/60 pb-1 last:border-0">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Export & Host physical files */}
      {activeTab === 'export_host' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Main Info Callout */}
          <div className="bg-violet-950/20 border border-violet-500/30 rounded-3xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-violet-400" />
              <h4 className="font-extrabold text-sm text-white">خروجی بیلد فیزیکی جهت آپلود در هاست‌های اشتراکی</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              شما می‌توانید به راحتی پکیج‌های فشرده حاوی فایل‌های کامپایل شده نهایی را دانلود نموده و مستقیماً در هاست شخصی خود (مانند سی‌پنل یا دایرکت‌ادمین) قرار دهید. 
              نسخه <strong className="text-violet-300">«خروجی فرانت‌اند و کلاینت»</strong> دقیقاً شامل فایل‌های بهینه شده قالب، کدهای استاتیک فرانت‌اند و فایل امنیتی <code className="text-violet-300 font-mono bg-slate-900 px-1 py-0.5 rounded">save_catalog.php</code> می‌باشد که بدون نیاز به Node.js کار می‌کند.
            </p>
          </div>

          {/* Download Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Frontend Client Zip */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <Globe className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                    پیشنهادی هاست اشتراکی
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-white">خروجی فرانت‌اند و کلاینت (استاتیک)</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  بسیار سبک و حاوی تمامی استایل‌ها، فایل‌های HTML و کدهای جاوااسکریپت به همراه اسکریپت ذخیره‌ساز کاتالوگ‌ها (<code className="font-mono text-xs text-emerald-300">save_catalog.php</code>). مخصوص آپلود در پوشه <code className="font-mono text-emerald-300">public_html</code>.
                </p>
              </div>
              <a
                href="/api/build/download-zip?type=frontend"
                download
                className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10"
              >
                <Download className="w-4 h-4" />
                دانلود ZIP کلاینت و PHP
              </a>
            </div>

            {/* Card 2: Server Backend Zip */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
                    <Server className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full font-bold">
                    Node.js & Cloud
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-white">کدهای بک‌اند سرور (Node.js)</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  شامل فایل باینری کامپایل شده بک‌اند پروژه با فرمت CommonJS به نام <code className="font-mono text-xs text-violet-300">server.cjs</code> و فایل‌های نقشه منبع نقشه (source-map). مناسب برای هاست‌های سرور مجازی (VPS) یا Cloud Run.
                </p>
              </div>
              <a
                href="/api/build/download-zip?type=server"
                download
                className="w-full text-center bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/10"
              >
                <Download className="w-4 h-4" />
                دانلود ZIP بک‌اند سرور
              </a>
            </div>

            {/* Card 3: Complete Bundle */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 bg-slate-500/10 border border-slate-500/20 text-slate-300 rounded-xl">
                    <Layers className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                    Full Package
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-white">پکیج بیلد کامل (Complete)</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  حاوی تلفیق کامل تمامی پوشه‌ها و فایل‌های تولید شده در شاخه خروجی (<code className="font-mono text-xs text-slate-300">dist/</code>) شامل کدهای فرانت‌اند استاتیک، اسکریپت‌های PHP و کدهای نهایی سرور Node.js به صورت یکجا.
                </p>
              </div>
              <a
                href="/api/build/download-zip?type=complete"
                download
                className="w-full text-center bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                دانلود کل محتوای dist
              </a>
            </div>
          </div>

          {/* Directory list and Search view */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-violet-400" />
                  ساختار مسیرهای خروجی کامپایل شده (dist/)
                </h4>
                <p className="text-[11px] text-slate-400">
                  برای انتقال دستی فایل‌ها می‌توانید مسیر فیزیکی، حجم و وضعیت دسته‌بندی آن‌ها را در جدول زیر مشاهده نمایید.
                </p>
              </div>

              {/* Quick Reload Button */}
              <button
                onClick={fetchDistFiles}
                disabled={isLoadingDist}
                className="self-end md:self-auto bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDist ? 'animate-spin' : ''}`} />
                بروزرسانی لیست
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                <input
                  type="text"
                  placeholder="جستجو در مسیر فیزیکی یا نام فایل..."
                  value={distSearchQuery}
                  onChange={(e) => setDistSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl py-2.5 pr-9 pl-4 text-white focus:outline-none focus:border-violet-500/50 transition dir-rtl text-right"
                />
              </div>

              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  onClick={() => setDistCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                    distCategoryFilter === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  همه ({distFiles.length})
                </button>
                <button
                  onClick={() => setDistCategoryFilter('frontend')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                    distCategoryFilter === 'frontend' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  فرانت‌اند ({distFiles.filter(f => f.category === 'frontend').length})
                </button>
                <button
                  onClick={() => setDistCategoryFilter('server')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                    distCategoryFilter === 'server' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  سرور ({distFiles.filter(f => f.category === 'server').length})
                </button>
              </div>
            </div>

            {/* Files List Table */}
            {isLoadingDist ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                <span className="text-xs text-slate-400 font-bold">در حال خواندن لیست فایل‌ها از روی دیسک سرور...</span>
              </div>
            ) : distError ? (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-2.5 text-xs font-bold text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <span>{distError}</span>
              </div>
            ) : distFiles.length === 0 ? (
              <div className="py-12 border border-slate-800/60 border-dashed rounded-2xl text-center space-y-2">
                <Info className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">پوشه خروجی فاقد فایل کامپایل شده است.</p>
                <p className="text-[10px] text-slate-500">لطفاً ابتدا از نوار بالا بیلد پروژه را بررسی فرمایید.</p>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
                      <tr>
                        <th className="p-3 font-bold text-[11px]">ردیف</th>
                        <th className="p-3 font-bold text-[11px]">مسیر فیزیکی فایل (نسبت به پوشه dist/)</th>
                        <th className="p-3 font-bold text-[11px]">اندازه فایل (حجم)</th>
                        <th className="p-3 font-bold text-[11px]">دسته‌بندی ارجاعی</th>
                        <th className="p-3 font-bold text-[11px]">آخرین بروزرسانی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {distFiles
                        .filter(f => {
                          const matchesSearch = f.relativePath.toLowerCase().includes(distSearchQuery.toLowerCase());
                          const matchesCat = distCategoryFilter === 'all' || f.category === distCategoryFilter;
                          return matchesSearch && matchesCat;
                        })
                        .map((file, fIdx) => {
                          const sizeStr = file.size > 1024 * 1024 
                            ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
                            : `${(file.size / 1024).toFixed(1)} KB`;
                          
                          return (
                            <tr key={file.relativePath} className="hover:bg-slate-900/30 transition text-slate-300">
                              <td className="p-3 text-slate-500 text-[11px] font-mono">{fIdx + 1}</td>
                              <td className="p-3 font-mono text-[11px] select-all tracking-wider text-slate-200 text-left dir-ltr">
                                {file.relativePath}
                              </td>
                              <td className="p-3 font-semibold text-[11px] text-slate-300 font-mono">{sizeStr}</td>
                              <td className="p-3">
                                {file.category === 'frontend' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                                    <Globe className="w-3 h-3" />
                                    فرانت‌اند
                                  </span>
                                ) : file.category === 'server' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full font-bold">
                                    <Server className="w-3 h-3" />
                                    سرور Node
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                                    دیگر موارد
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-[10px] text-slate-500 font-mono">
                                {new Date(file.updatedAt).toLocaleTimeString('fa-IR')}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Manifest & Package Creation Guide */}
      {activeTab === 'guide' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6 animate-in fade-in">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              راهنمای گام‌به‌گام ساخت فایل زیپ آپدیت (ZIP Deployment Guide)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              جهت ارسال بروزرسانی بدون آسیب به کاتالوگ‌های در حال استفاده کاربران، مراحل زیر را دنبال فرمایید:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="w-8 h-8 bg-violet-600/20 text-violet-400 font-extrabold rounded-xl flex items-center justify-center text-sm border border-violet-500/30">
                ۱
              </div>
              <h4 className="text-xs font-bold text-white">اجرای دستور کامپایل (Build)</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                در ترمینال پروژه دستور <code className="text-violet-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded">npm run build</code> را اجرا نمایید تا کدهای متمرکز پروژه داخل پوشه <code className="text-violet-300 font-mono">dist/</code> تولید گردند.
              </p>
            </div>

            <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="w-8 h-8 bg-violet-600/20 text-violet-400 font-extrabold rounded-xl flex items-center justify-center text-sm border border-violet-500/30">
                ۲
              </div>
              <h4 className="text-xs font-bold text-white">افزودن manifest.json (اختیاری)</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                فایل <code className="text-violet-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded">manifest.json</code> حاوی عنوان و نسخه بروزرسانی را کنار فایل‌های خروجی داخل پوشه dist قرار دهید.
              </p>
            </div>

            <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="w-8 h-8 bg-violet-600/20 text-violet-400 font-extrabold rounded-xl flex items-center justify-center text-sm border border-violet-500/30">
                ۳
              </div>
              <h4 className="text-xs font-bold text-white">فشرده‌سازی و بارگذاری</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                محتوای پوشه dist را فشرده کرده و فایل زیپ تولیدشده (مثلاً <code className="text-violet-300 font-mono">dist.zip</code>) را در کادر آپلود همین صفحه رها نمایید.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-200">نمونه ساختار استاندارد فایل manifest.json:</span>
              <button
                onClick={downloadManifestTemplate}
                className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                دانلود نمونه manifest.json
              </button>
            </div>

            <pre className="bg-black/90 p-4 rounded-xl text-emerald-400 font-mono text-xs overflow-x-auto dir-ltr">
              {sampleManifestJson}
            </pre>
          </div>
        </div>
      )}

      {/* Manifest Raw View Modal */}
      {showManifestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-400" />
                محتوای مانیفست استخراج شده
              </h3>
              <button 
                onClick={() => setShowManifestModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="bg-black p-4 rounded-2xl text-emerald-400 font-mono text-xs overflow-auto max-h-96 dir-ltr">
              {JSON.stringify(analysis?.meta || {}, null, 2)}
            </pre>

            <div className="text-left dir-rtl">
              <button
                onClick={() => setShowManifestModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
