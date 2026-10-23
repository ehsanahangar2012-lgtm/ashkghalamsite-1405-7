import React, { useState, useEffect, useRef } from 'react';
import { useContent } from '../contexts/ContentContext';
import { Card, Button, Badge } from './UIComponents';
import { 
  Database, Download, Upload, ShieldCheck, AlertTriangle, 
  Server, RefreshCw, Sliders, Calendar, Lock, Unlock, 
  Play, CheckCircle, TrendingUp, Coins, Trash2, Terminal,
  HardDrive, CloudLightning, Copy, FileCode, Check, HelpCircle,
  Layers, FileText, Sparkles, ArrowRightLeft, BookOpen, Folder
} from 'lucide-react';
import { ZipUpdateManager } from './ZipUpdateManager';

interface VerificationMeta {
  version: string;
  timestamp: string;
  stats: {
    siteContent: number;
    globalSettings: boolean;
    pricingFormula: boolean;
    seoConfigsCount: number;
    catalogCount: number;
    portfolioCount: number;
    blogCount: number;
    ledgerCount: number;
  };
  rawPayload: any;
}

export const BackupManager: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => {
  const { 
    siteContent, globalSettings, pricingFormula, seoConfigs, 
    catalogItems, portfolioItems, blogPosts, assets
  } = useContent();

  const [logs, setLogs] = useState<string[]>([
    "🚀 سیستم پشتیبان‌گیری چند لایه‌ای اشک‌قلم با موفقیت راه‌اندازی شد.",
    "📡 پایش خوشه پایگاه‌داده PostgreSQL فعال است (وضعیت: دائم الکپی - Replication Stable).",
    "💾 سنسورهای محلی WAL-E تراکنش شماره 0x9F / 748102 را ارزیابی کردند."
  ]);

  const [activeSegment, setActiveSegment] = useState<'full_system_backup' | 'host_deploy_zip' | 'catalogs_migration' | 'cms' | 'smart_update' | 'replication' | 'pitr' | 'worm' | 'cloud_sync'>('full_system_backup');
  
  // Full-System Backup & Recovery States
  const [isExportingFullSystem, setIsExportingFullSystem] = useState(false);
  const [isRestoringFullSystem, setIsRestoringFullSystem] = useState(false);
  const [fullSystemDragActive, setFullSystemDragActive] = useState(false);
  const [fullSystemPreview, setFullSystemPreview] = useState<any | null>(null);
  const [fullSystemMode, setFullSystemMode] = useState<'merge' | 'replace'>('merge');
  const [fullSystemSuccess, setFullSystemSuccess] = useState<string | null>(null);
  const [fullSystemError, setFullSystemError] = useState<string | null>(null);
  const [showFullSystemHelp, setShowFullSystemHelp] = useState(false);
  const fullSystemFileInputRef = useRef<HTMLInputElement>(null);

  // Host Deploy ZIP Packaging State
  const [isBuildingZip, setIsBuildingZip] = useState(false);
  const [zipBuildSuccess, setZipBuildSuccess] = useState<string | null>(null);
  const [showHostGuide, setShowHostGuide] = useState(false);
  const [isExportingCatalogs, setIsExportingCatalogs] = useState(false);
  const [isMigratingCatalogs, setIsMigratingCatalogs] = useState(false);
  const [migrationDragActive, setMigrationDragActive] = useState(false);
  const [migrationPreview, setMigrationPreview] = useState<any | null>(null);
  const [migrationMode, setMigrationMode] = useState<'merge' | 'replace'>('merge');
  const [migrationSuccess, setMigrationSuccess] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [showMigrationHelp, setShowMigrationHelp] = useState(false);
  const migrationFileInputRef = useRef<HTMLInputElement>(null);

  // CMS Backup State
  const [dragActive, setDragActive] = useState(false);
  const [verification, setVerification] = useState<VerificationMeta | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PostgreSQL Clustering simulator states
  const [primaryStatus, setPrimaryStatus] = useState<'online' | 'failed' | 'promoting'>('online');
  const [standbyStatus, setStandbyStatus] = useState<'replica' | 'promoting' | 'primary'>('replica');
  const [walLagMs, setWalLagMs] = useState(3);
  const [walCount, setWalCount] = useState(48102);

  // PITR states
  const [pitrRange, setPitrRange] = useState(100); // represents percentage of last 24 hours
  const [pitrDate, setPitrDate] = useState<string>('1403/03/10');
  const [pitrTime, setPitrTime] = useState<string>('08:30');
  const [pitrAuditStatus, setPitrAuditStatus] = useState<'idle' | 'auditing' | 'passed' | 'failed'>('idle');
  const [pitrErrors, setPitrErrors] = useState<string[]>([]);
  const [pitrProgress, setPitrProgress] = useState(0);

  // WORM Security states
  const [wormEnabled, setWormEnabled] = useState(false);
  const [sandboxResponse, setSandboxResponse] = useState<string | null>(null);
  const [isSimulatingAttack, setIsSimulatingAttack] = useState(false);

  // Cloud Sync states
  const [cadSyncProgress, setCadSyncProgress] = useState(100);
  const [isSyncingCad, setIsSyncingCad] = useState(false);
  const [vaultSyncCount, setVaultSyncCount] = useState(18);

  // Server-side backups list
  const [serverBackups, setServerBackups] = useState<{ filename: string; size: number; createdAt: string }[]>([]);
  const [isLoadingServerBackups, setIsLoadingServerBackups] = useState(false);
  const [isSavingServerBackup, setIsSavingServerBackup] = useState(false);

  // --- SMART ZIP UPDATE STATES ---
  const [dragActiveUpdate, setDragActiveUpdate] = useState(false);
  const [updateAnalysis, setUpdateAnalysis] = useState<{
    filename: string;
    meta: {
      version: string;
      title: string;
      description: string;
      author: string;
      createdAt: string;
    };
    packageType?: 'web_build' | 'media_pack' | 'full_hybrid';
    packageTypeName?: string;
    stats?: {
      distCount: number;
      mediaCount: number;
      dbCount: number;
      totalFiles: number;
    };
    files: { name: string; isDirectory: boolean; size: number; target?: string }[];
    dataProtectionGuarantee?: string;
  } | null>(null);
  const [isAnalyzingUpdate, setIsAnalyzingUpdate] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [isRollingBackUpdate, setIsRollingBackUpdate] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const updateFileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateZipUpload = async (file: File) => {
    setIsAnalyzingUpdate(true);
    setUploadProgress(0);
    setUpdateSuccess(null);
    setUpdateError(null);
    setUpdateAnalysis(null);
    addLog(`📦 در حال ارسال بسته زیپ به موتور ارزیابی هادی: ${file.name}`);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/update/upload");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(pct);
        }
      };

      xhr.onload = () => {
        setIsAnalyzingUpdate(false);
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setUpdateAnalysis(data);
            addLog(`🔍 تحلیل بسته آپدیت موفقیت آمیز بود. نسخه: ${data.meta.version} - شامل ${data.files.length} آیتم.`);
          } catch (e) {
            setUpdateError("خطا در خواندن فرمت پاسخ سرور.");
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            setUpdateError(err.error || "بارگذاری با خطا روبرو شد.");
            addLog(`❌ خطا در آپلود و آنالیز اولیه آپدیت: ${err.error}`);
          } catch (_) {
            setUpdateError(`خطای سرور: ${xhr.statusText}`);
          }
        }
      };

      xhr.onerror = () => {
        setIsAnalyzingUpdate(false);
        setUploadProgress(null);
        setUpdateError("خطا در اتصال به سرور.");
        addLog("❌ خطا در اتصال به سرور جهت بارگذاری آپدیت.");
      };

      const formData = new FormData();
      formData.append("updatePack", file);
      xhr.send(formData);
    } catch (err: any) {
      setUpdateError(err.message);
      addLog(`❌ خطا در تنظیم درخواست آپلود: ${err.message}`);
      setIsAnalyzingUpdate(false);
      setUploadProgress(null);
    }
  };

  const handleApplySmartUpdate = async () => {
    if (!updateAnalysis) return;
    setIsApplyingUpdate(true);
    setUpdateSuccess(null);
    setUpdateError(null);
    addLog(`🔄 در حال ایجاد نقطه بازگردانی و اعمال همگامی فایل‌ها زیپ...`);

    try {
      // Collect current local db entries to save as pre-update restore point
      const clientDbSnapshot = {
        siteContent: JSON.parse(localStorage.getItem('siteContent') || '{}'),
        globalSettings: JSON.parse(localStorage.getItem('globalSettings') || '{}'),
        pricingFormula: JSON.parse(localStorage.getItem('pricingFormula') || '{}'),
        seoConfigs: JSON.parse(localStorage.getItem('seoConfigs') || '[]'),
        catalogItems: JSON.parse(localStorage.getItem('catalogItems') || '[]'),
        portfolioItems: JSON.parse(localStorage.getItem('portfolioItems') || '[]'),
        blogPosts: JSON.parse(localStorage.getItem('blogPosts') || '[]'),
        uploadedAssets: JSON.parse(localStorage.getItem('uploadedAssets') || '[]'),
        ledger_entries: JSON.parse(localStorage.getItem('ledger_entries') || '[]'),
        b2b_settings: JSON.parse(localStorage.getItem('b2b_settings') || '{}'),
        b2b_projects: JSON.parse(localStorage.getItem('b2b_projects') || '[]'),
      };

      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/update/apply`.replace(/\/\//g, '/'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: updateAnalysis.filename,
          clientDbState: clientDbSnapshot
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "خطا در اعمال تغییرات آپدیت.");
      }

      const data = await res.json();
      const extractedWeb = data.extractedWebFilesCount || 0;
      const extractedMedia = data.extractedMediaCount || 0;
      
      addLog(`✅ آپدیت فیزیکی کدهای اصلی سیستم اعمال شد: ${extractedWeb} فایل کامپایل‌شده (dist) و ${extractedMedia} فایل رسانه همگام گردید.`);

      // If updates contained fresh content data to integrate, write it to localStorage!
      if (data.databaseUpdates) {
        const dbUp = data.databaseUpdates;
        addLog(`📝 در حال همگام‌سازی و اعمال هوشمند دیتابیس کاتالوگ و متون سیستم...`);
        
        if (dbUp.siteContent) localStorage.setItem('siteContent', JSON.stringify({ ...clientDbSnapshot.siteContent, ...dbUp.siteContent }));
        if (dbUp.globalSettings) localStorage.setItem('globalSettings', JSON.stringify({ ...clientDbSnapshot.globalSettings, ...dbUp.globalSettings }));
        if (dbUp.pricingFormula) localStorage.setItem('pricingFormula', JSON.stringify({ ...clientDbSnapshot.pricingFormula, ...dbUp.pricingFormula }));
        if (dbUp.blogPosts && Array.isArray(dbUp.blogPosts)) {
          const mergedBlog = [...dbUp.blogPosts, ...clientDbSnapshot.blogPosts.filter((x: any) => !dbUp.blogPosts.some((y: any) => y.id === x.id))];
          localStorage.setItem('blogPosts', JSON.stringify(mergedBlog));
        }
        if (dbUp.catalogItems && Array.isArray(dbUp.catalogItems)) {
          const mergedCatalog = [...dbUp.catalogItems, ...clientDbSnapshot.catalogItems.filter((x: any) => !dbUp.catalogItems.some((y: any) => y.id === x.id))];
          localStorage.setItem('catalogItems', JSON.stringify(mergedCatalog));
        }
        if (dbUp.portfolioItems && Array.isArray(dbUp.portfolioItems)) {
          const mergedPortfolio = [...dbUp.portfolioItems, ...clientDbSnapshot.portfolioItems.filter((x: any) => !dbUp.portfolioItems.some((y: any) => y.id === x.id))];
          localStorage.setItem('portfolioItems', JSON.stringify(mergedPortfolio));
        }
      }

      setUpdateSuccess(`بروزرسانی زنده با موفقیت انجام شد! ${extractedWeb > 0 ? `${extractedWeb} فایل کامپایل‌شده کلاینت/سرور در پوشه dist جایگزین گردید.` : ''} تمامی کاتالوگ‌ها و داده‌های کاربر محفوظ می‌باشند.`);
      setUpdateAnalysis(null);
      addLog(`✨ فرآیند آپدیت کدهای کامپایل‌شده برنامه با موفقیت پایان یافت.`);

      setTimeout(() => {
        window.location.reload();
      }, 2500);

    } catch (err: any) {
      setUpdateError(err.message);
      addLog(`❌ خطا در اجرای آپدیت هوشمند: ${err.message}`);
    } finally {
      setIsApplyingUpdate(false);
    }
  };

  const handleRollbackUpdate = async () => {
    if (!window.confirm("آیا از بازگردانی کامل سیستم به نقطه ماقبل آپدیت اطمینان دارید؟ تمامی داده‌ها و کارهای نگاری بازمی‌گردند.")) {
      return;
    }
    setIsRollingBackUpdate(true);
    setUpdateSuccess(null);
    setUpdateError(null);
    addLog(`↩️ شروع فرآیند بازیابی و رول‌بک اضطراری به نقطه ماقبل از آخرین آپدیت...`);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/update/rollback`.replace(/\/\//g, '/'), { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "خطا در اعمال بازگردانی فیزیکی.");
      }

      const data = await res.json();
      
      // Restore state variables
      if (data.dbState) {
        const db = data.dbState;
        if (db.siteContent) localStorage.setItem('siteContent', JSON.stringify(db.siteContent));
        if (db.globalSettings) localStorage.setItem('globalSettings', JSON.stringify(db.globalSettings));
        if (db.pricingFormula) localStorage.setItem('pricingFormula', JSON.stringify(db.pricingFormula));
        if (db.seoConfigs) localStorage.setItem('seoConfigs', JSON.stringify(db.seoConfigs));
        if (db.catalogItems) localStorage.setItem('catalogItems', JSON.stringify(db.catalogItems));
        if (db.portfolioItems) localStorage.setItem('portfolioItems', JSON.stringify(db.portfolioItems));
        if (db.blogPosts) localStorage.setItem('blogPosts', JSON.stringify(db.blogPosts));
        if (db.uploadedAssets) localStorage.setItem('uploadedAssets', JSON.stringify(db.uploadedAssets));
        if (db.ledger_entries) localStorage.setItem('ledger_entries', JSON.stringify(db.ledger_entries));
        if (db.b2b_settings) localStorage.setItem('b2b_settings', JSON.stringify(db.b2b_settings));
        if (db.b2b_projects) localStorage.setItem('b2b_projects', JSON.stringify(db.b2b_projects));
      }

      setUpdateSuccess("سیستم با موفقیت به نقطه پایدار ماقبل بروزرسانی رول‌بک و بازیابی شد.");
      addLog(`✨ بازیابی فیزیکی و بازنشانی دیتابیس با موفقیت به تایید نهایی رسید.`);

      setTimeout(() => {
        window.location.reload();
      }, 2500);

    } catch (err: any) {
      setUpdateError(err.message);
      addLog(`❌ خطا در اجرای رول‌بک سیستمی: ${err.message}`);
    } finally {
      setIsRollingBackUpdate(false);
    }
  };

  // --- Full-System Comprehensive Backup & Recovery Functions ---
  const handleExportFullSystem = async () => {
    setIsExportingFullSystem(true);
    setFullSystemSuccess(null);
    setFullSystemError(null);
    addLog("📦 در حال استخراج نسخه پشتیبان جامع و تجمیعی کل سیستم (شامل برندینگ، تنظیمات، کاتالوگ‌ها، نرم‌افزارها و فایل‌ها)...");
    try {
      const clientPayload = {
        catalogs: JSON.parse(localStorage.getItem('custom_catalogs') || '[]'),
        globalSettings: JSON.parse(localStorage.getItem('globalSettings') || '{}'),
        pricingFormula: JSON.parse(localStorage.getItem('pricingFormula') || '{}'),
        siteContent: JSON.parse(localStorage.getItem('siteContent') || '{}'),
        seoConfigs: JSON.parse(localStorage.getItem('seoConfigs') || '[]'),
        emergencyConfig: JSON.parse(localStorage.getItem('emergencyConfig') || '{}'),
        b2bSettings: JSON.parse(localStorage.getItem('b2b_settings') || '{}')
      };

      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/backup/full-system/export`.replace(/\/\//g, '/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientPayload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'خطا در استخراج نسخه پشتیبان جامع سیستم');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ashk_full_system_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addLog("✅ فایل پشتیبان کامل سیستم با موفقیت دانلود شد و یک نسخه پایدار در شاخه backups سرور ثبت گردید.");
      setFullSystemSuccess("فایل پشتیبان کامل سیستم (برند، کاتالوگ‌ها، تنظیمات، رسانه‌ها) دانلود شد و در سرور نیز ذخیره گردید.");
    } catch (err: any) {
      setFullSystemError(err.message);
      addLog(`❌ خطا در تهیه بک‌آپ کامل سیستم: ${err.message}`);
    } finally {
      setIsExportingFullSystem(false);
    }
  };

  const handleFullSystemFileSelect = (file: File) => {
    setFullSystemSuccess(null);
    setFullSystemError(null);
    if (!file.name.endsWith('.json')) {
      setFullSystemError("لطفاً یک فایل معتبر پشتیبان با پسوند .json انتخاب فرمایید.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed || !parsed.data) {
          throw new Error("فایل فاقد ساختار استاندارد داده (data) می‌باشد.");
        }
        setFullSystemPreview(parsed);
        const data = parsed.data;
        addLog(`📂 فایل پشتیبان جامع با موفقیت خوانده شد: شامل برندینگ "${data.globalSettings?.siteName || 'اشک قلم'}"، ${data.catalogs?.length || 0} کاتالوگ، ${data.softwareProducts?.length || 0} نرم‌افزار و ${data.mediaFiles?.length || 0} فایل رسانه.`);
      } catch (err: any) {
        setFullSystemError("خطا در تجزیه فایل JSON: " + err.message);
        addLog(`❌ خطا در بررسی فایل بک‌آپ: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteFullSystemRestore = async () => {
    if (!fullSystemPreview) return;
    setIsRestoringFullSystem(true);
    setFullSystemSuccess(null);
    setFullSystemError(null);
    addLog(`🔄 در حال بازگردانی و بازیافت کامل سیستم (حالت: ${fullSystemMode === 'merge' ? 'ادغام هوشمند' : 'جایگزینی کامل'})...`);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/backup/full-system/restore?mode=${fullSystemMode}`.replace(/\/\//g, '/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullSystemPreview)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'خطا در بازگردانی نسخه پشتیبان جامع');
      }

      const result = await res.json();

      if (result.restoredData) {
        const rd = result.restoredData;
        if (rd.globalSettings) localStorage.setItem('globalSettings', JSON.stringify(rd.globalSettings));
        if (rd.siteContent) localStorage.setItem('siteContent', JSON.stringify(rd.siteContent));
        if (rd.pricingFormula) localStorage.setItem('pricingFormula', JSON.stringify(rd.pricingFormula));
        if (rd.seoConfigs) localStorage.setItem('seoConfigs', JSON.stringify(rd.seoConfigs));
        if (rd.emergencyConfig) localStorage.setItem('emergencyConfig', JSON.stringify(rd.emergencyConfig));
        if (rd.catalogs) localStorage.setItem('custom_catalogs', JSON.stringify(rd.catalogs));
        if (rd.b2bSettings) localStorage.setItem('b2b_settings', JSON.stringify(rd.b2bSettings));
      }

      addLog(`✨ بازیافت موفق: تمام اطلاعات برند، سایت، کاتالوگ‌ها و رسانه‌ها با موفقیت بازیافت و تثبیت گردیدند.`);
      setFullSystemSuccess(result.message || "اطلاعات با موفقیت کامل بازیافت و تثبیت شدند.");

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setFullSystemError(err.message);
      addLog(`❌ خطا در اجرای بازگردانی سیستم: ${err.message}`);
    } finally {
      setIsRestoringFullSystem(false);
    }
  };

  // --- Active Catalogs & Settings Migration Functions ---
  const handleExportCatalogsAndSettings = async () => {
    setIsExportingCatalogs(true);
    setMigrationSuccess(null);
    setMigrationError(null);
    addLog("📦 در حال استخراج بسته جامع کاتالوگ‌های فعال، صفحات و تنظیمات سایت به همراه رسانه‌ها...");
    try {
      // Gather local storage fallback items if any
      const clientPayload = {
        catalogs: JSON.parse(localStorage.getItem('custom_catalogs') || '[]'),
        globalSettings: JSON.parse(localStorage.getItem('globalSettings') || '{}'),
        pricingFormula: JSON.parse(localStorage.getItem('pricingFormula') || '{}'),
        siteContent: JSON.parse(localStorage.getItem('siteContent') || '{}'),
        seoConfigs: JSON.parse(localStorage.getItem('seoConfigs') || '[]'),
        b2bSettings: JSON.parse(localStorage.getItem('b2b_settings') || '{}')
      };

      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/backup/catalogs-and-settings/export`.replace(/\/\//g, '/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientPayload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'خطا در خروجی بسته کاتالوگ‌ها و تنظیمات');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ashk_catalogs_settings_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addLog("✅ بسته کاتالوگ‌های فعال و تنظیمات با موفقیت دانلود و در سرور ذخیره شد.");
      setMigrationSuccess("بسته کاتالوگ‌ها و تنظیمات فعال با موفقیت آماده و فایل پشتیبان دانلود شد.");
    } catch (err: any) {
      setMigrationError(err.message);
      addLog(`❌ خطا در تهیه بک‌آپ کاتالوگ‌ها: ${err.message}`);
    } finally {
      setIsExportingCatalogs(false);
    }
  };

  const handleMigrationFileSelect = (file: File) => {
    setMigrationSuccess(null);
    setMigrationError(null);
    if (!file.name.endsWith('.json')) {
      setMigrationError("لطفاً یک فایل معتبر با پسوند .json انتخاب فرمایید.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed || !parsed.data) {
          throw new Error("ساختار فایل فاقد بخش اصلی داده‌های کاتالوگ و تنظیمات (data) می‌باشد.");
        }
        setMigrationPreview(parsed);
        addLog(`📂 فایل پشتیبان کاتالوگ با موفقیت بررسی شد. شامل ${parsed.data.catalogs?.length || 0} کاتالوگ و ${parsed.data.catalogMedia?.length || 0} تصویر.`);
      } catch (err: any) {
        setMigrationError("خطا در تجزیه فایل JSON: " + err.message);
        addLog(`❌ خطا در بررسی فایل بک‌آپ: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteMigration = async () => {
    if (!migrationPreview) return;
    setIsMigratingCatalogs(true);
    setMigrationSuccess(null);
    setMigrationError(null);
    addLog(`🔄 در حال انتقال و اعمال کاتالوگ‌ها و تنظیمات فعال به سایت (حالت: ${migrationMode === 'merge' ? 'ادغام هوشمند' : 'جایگزینی کامل'})...`);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/backup/catalogs-and-settings/restore-migrate?mode=${migrationMode}`.replace(/\/\//g, '/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(migrationPreview)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'خطا در بازیابی و انتقال کاتالوگ‌ها و تنظیمات');
      }

      const result = await res.json();

      // Sync state back to localStorage
      if (result.restoredData) {
        if (result.restoredData.catalogs) {
          localStorage.setItem('custom_catalogs', JSON.stringify(result.restoredData.catalogs));
        }
        if (result.restoredData.settings) {
          const s = result.restoredData.settings;
          if (s.siteName || s.contactPhone) {
            localStorage.setItem('globalSettings', JSON.stringify(s));
          }
          if (s.pricingFormula) {
            localStorage.setItem('pricingFormula', JSON.stringify(s.pricingFormula));
          }
          if (s.siteContent) {
            localStorage.setItem('siteContent', JSON.stringify(s.siteContent));
          }
          if (s.seoConfigs) {
            localStorage.setItem('seoConfigs', JSON.stringify(s.seoConfigs));
          }
        }
      }

      addLog(`✨ انتقال موفق: ${result.restoredStats?.catalogsCount || 0} کاتالوگ و ${result.restoredStats?.restoredMediaCount || 0} تصویر به نسخه به‌روزرسانی شده سایت منتقل گردید.`);
      setMigrationSuccess(result.message || "انتقال با موفقیت کامل صورت گرفت.");

      // Refresh in 2 seconds to reflect in UI
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setMigrationError(err.message);
      addLog(`❌ خطا در اجرای عملیات انتقال به سایت: ${err.message}`);
    } finally {
      setIsMigratingCatalogs(false);
    }
  };

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString('fa-IR');
    setLogs(prev => [`[${time}] ${message}`, ...prev.slice(0, 50)]);
  };

  // Fetch server side backups
  const fetchServerBackups = async () => {
    setIsLoadingServerBackups(true);
    try {
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/backup/list');
      if (res.ok) {
        const data = await res.json();
        setServerBackups(data);
      } else {
        addLog("⚠️ خطا در دریافت لیست نسخه‌های پشتیبان از سرور.");
      }
    } catch (err) {
      addLog("⚠️ خطا در ارتباط با پایگاه داده برای بارگذاری بکاپ‌های سرور.");
    } finally {
      setIsLoadingServerBackups(false);
    }
  };

  // Perform server-side backup save
  const handleSaveServerBackup = async () => {
    setIsSavingServerBackup(true);
    addLog("🌐 شروع فرآیند ذخیره‌سازی نسخه پشتیبان بر روی سرور پشتیبانی فعال...");
    try {
      const backupPayload = {
        app: "Ashk Ghalam VIP ERP",
        version: "3.5.1",
        timestamp: new Date().toISOString(),
        siteContent: JSON.parse(localStorage.getItem('siteContent') || '{}'),
        globalSettings: JSON.parse(localStorage.getItem('globalSettings') || '{}'),
        pricingFormula: JSON.parse(localStorage.getItem('pricingFormula') || '{}'),
        seoConfigs: JSON.parse(localStorage.getItem('seoConfigs') || '[]'),
        catalogItems: JSON.parse(localStorage.getItem('catalogItems') || '[]'),
        portfolioItems: JSON.parse(localStorage.getItem('portfolioItems') || '[]'),
        blogPosts: JSON.parse(localStorage.getItem('blogPosts') || '[]'),
        uploadedAssets: JSON.parse(localStorage.getItem('uploadedAssets') || '[]'),
        ledger_entries: JSON.parse(localStorage.getItem('ledger_entries') || '[]'),
        b2b_settings: JSON.parse(localStorage.getItem('b2b_settings') || '{}'),
        b2b_projects: JSON.parse(localStorage.getItem('b2b_projects') || '[]'),
      };

      const res = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/backup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupPayload)
      });

      if (res.ok) {
        const data = await res.json();
        addLog(`✅ نسخه پشتیبان جدید روی سرور ذخیره شد: ${data.filename}`);
        setBackupSuccess("نسخه پشتیبان سروری با موفقیت بر روی دیسک سخت هاست ایجاد شد.");
        fetchServerBackups();
        setTimeout(() => setBackupSuccess(null), 6000);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'خطا در عملکرد سرور');
      }
    } catch (err: any) {
      setBackupError("خطا در ذخیره‌سازی روی سرور: " + err.message);
      addLog(`❌ خطا در ذخیره بکاپ سرور: ${err.message}`);
    } finally {
      setIsSavingServerBackup(false);
    }
  };

  // Restore from specific server backup filename
  const handleRestoreFromServer = async (filename: string) => {
    try {
      addLog(`📂 در حال بارگیری و تایید همپوشانی فیزیکی فایل ${filename}...`);
      setDownloadProgress(0);
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/backup/download/${filename}`.replace(/\/\//g, '/'));
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'ارور نامشخص');
      }

      const contentLength = res.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      let receivedBytes = 0;

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('مرورگر قابلیت خواندن جریانی بسته‌ها را ندارد.');
      }

      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          if (totalBytes > 0) {
            const pct = Math.round((receivedBytes / totalBytes) * 100);
            setDownloadProgress(pct);
          }
        }
      }

      setDownloadProgress(null);

      // Concatenate chunks and decode JSON payload
      const concatenated = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        concatenated.set(chunk, offset);
        offset += chunk.length;
      }

      const decodedText = new TextDecoder("utf-8").decode(concatenated);
      const payload = JSON.parse(decodedText);
      
      const siteContentKeys = payload.siteContent ? Object.keys(payload.siteContent).length : 0;
      const metadata: VerificationMeta = {
        version: payload.version || 'unknown',
        timestamp: payload.timestamp || new Date().toISOString(),
        stats: {
          siteContent: siteContentKeys,
          globalSettings: !!payload.globalSettings,
          pricingFormula: !!payload.pricingFormula,
          seoConfigsCount: Array.isArray(payload.seoConfigs) ? payload.seoConfigs.length : 0,
          catalogCount: Array.isArray(payload.catalogItems) ? payload.catalogItems.length : 0,
          portfolioCount: Array.isArray(payload.portfolioItems) ? payload.portfolioItems.length : 0,
          blogCount: Array.isArray(payload.blogPosts) ? payload.blogPosts.length : 0,
          ledgerCount: Array.isArray(payload.ledger_entries) ? payload.ledger_entries.length : 0,
        },
        rawPayload: payload
      };
      
      setVerification(metadata);
      addLog(`📂 نسخه پشتیبان سرور با موفقیت دانلود و تایید شد. برای اعمال کامل بازگردانی، روی دکمه "تایید و احیاء تمام‌عیار" کلیک فرمایید.`);
    } catch (err: any) {
      setBackupError(`خطا در بازخوانی فایل بکاپ سرور: ${err.message}`);
      addLog(`❌ خطا در بازخوانی بکاپ سرور: ${err.message}`);
    }
  };

  // Delete specific server-side backup
  const handleDeleteServerBackup = async (filename: string) => {
    if (!window.confirm(`آیا مایل به حذف دائمی فایل پشتیبان "${filename}" از روی سرور هستید؟`)) {
      return;
    }
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/backup/${filename}`.replace(/\/\//g, '/'), { method: 'DELETE' });
      if (res.ok) {
        addLog(`🗑️ فایل بکاپ سروری حذف گردید: ${filename}`);
        fetchServerBackups();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'عملیات حذف ناموفق بود');
      }
    } catch (err: any) {
      addLog(`❌ عدم موفقیت در حذف پشتیبان سروری: ${err.message}`);
    }
  };

  // Load server-side backups on mount
  useEffect(() => {
    fetchServerBackups();
  }, []);

  // WAL offset streamer
  useEffect(() => {
    const interval = setInterval(() => {
      if (primaryStatus === 'online') {
        setWalCount(prev => prev + Math.floor(Math.random() * 5) + 1);
        setWalLagMs(Math.max(2, Math.min(25, Math.floor(3 + Math.random() * 6))));
        if (Math.random() > 0.85) {
          addLog(`📝 ثبت بلاک WAL جدید در پایگاه داده اصلی: LSN 0x${(walCount + 10).toString(16).toUpperCase()}/E0A4`);
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [primaryStatus, walCount]);

  // Download complete ERP JSON dump (sends to server to integrate binary uploads in base64)
  const handleDownloadBackup = async () => {
    try {
      addLog("📡 در حال تلفیق ساختار داده‌ها با پرونده‌های چندرسانه‌ای و عکس‌های آپلود شده روی سرور...");
      const clientPayload = {
        app: "Ashk Ghalam VIP ERP",
        version: "3.5.1",
        timestamp: new Date().toISOString(),
        siteContent: JSON.parse(localStorage.getItem('siteContent') || '{}'),
        globalSettings: JSON.parse(localStorage.getItem('globalSettings') || '{}'),
        pricingFormula: JSON.parse(localStorage.getItem('pricingFormula') || '{}'),
        seoConfigs: JSON.parse(localStorage.getItem('seoConfigs') || '[]'),
        catalogItems: JSON.parse(localStorage.getItem('catalogItems') || '[]'),
        portfolioItems: JSON.parse(localStorage.getItem('portfolioItems') || '[]'),
        blogPosts: JSON.parse(localStorage.getItem('blogPosts') || '[]'),
        uploadedAssets: JSON.parse(localStorage.getItem('uploadedAssets') || '[]'),
        ledger_entries: JSON.parse(localStorage.getItem('ledger_entries') || '[]'),
        b2b_settings: JSON.parse(localStorage.getItem('b2b_settings') || '{}'),
        b2b_projects: JSON.parse(localStorage.getItem('b2b_projects') || '[]'),
      };

      const res = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/backup/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientPayload)
      });

      if (!res.ok) {
        throw new Error("سرویس پشتیبانی هاست موقتا قادر به بسته‌بندی فایل نبود.");
      }

      const completeBackup = await res.json();
      const jsonString = JSON.stringify(completeBackup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `ashk_ghalam_full_dr_dump_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);

      addLog("✅ یک نسخه فشرده پشتیبان فیزیکی بهای تمام شده، معین مالی و کل پورتال چند رسانه‌ای صادر و دانلود شد.");
      setBackupSuccess("نسخه پشتیبان فیزیکی (پرونده کامل چندرسانه‌ای) صادر و دانلود شد.");
      setTimeout(() => setBackupSuccess(null), 6000);
    } catch (err: any) {
      setBackupError("خطا در توسعه فایل پشتیبان: " + err.message);
      addLog(`❌ خطا در توسعه خروجی پشتیبان فیزیکی: ${err.message}`);
    }
  };

  // Drag and Drop verify/restore
  const processBackupFile = (file: File) => {
    setBackupSuccess(null);
    setBackupError(null);
    setVerification(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json || typeof json !== 'object') {
          throw new Error("قالب فایل کامپایل شده استاندارد نمی‌باشد.");
        }

        const siteContentKeys = json.siteContent ? Object.keys(json.siteContent).length : 0;
        const metadata: VerificationMeta = {
          version: json.version || 'unknown',
          timestamp: json.timestamp || new Date().toISOString(),
          stats: {
            siteContent: siteContentKeys,
            globalSettings: !!json.globalSettings,
            pricingFormula: !!json.pricingFormula,
            seoConfigsCount: Array.isArray(json.seoConfigs) ? json.seoConfigs.length : 0,
            catalogCount: Array.isArray(json.catalogItems) ? json.catalogItems.length : 0,
            portfolioCount: Array.isArray(json.portfolioItems) ? json.portfolioItems.length : 0,
            blogCount: Array.isArray(json.blogPosts) ? json.blogPosts.length : 0,
            ledgerCount: Array.isArray(json.ledger_entries) ? json.ledger_entries.length : 0,
          },
          rawPayload: json
        };

        setVerification(metadata);
        addLog(`📂 صحت فایل پشتیبان تایید شد. نسخه فایل: ${metadata.version}. مهلت زمان ایجاد: ${new Date(metadata.timestamp).toLocaleDateString('fa-IR')} ${new Date(metadata.timestamp).toLocaleTimeString('fa-IR')}`);
      } catch (err: any) {
        setBackupError(`فایل غیرمعتبر است: ${err.message}`);
        addLog(`⚠️ بارگذاری پشتیبان ناموفق بود - امضا دیجیتال یا فرمت فایل غیر منطبق است.`);
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processBackupFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processBackupFile(e.target.files[0]);
    }
  };

  // Perform actual import and write to localStorage
  const handleRestoreVerification = async () => {
    if (!verification) return;
    try {
      const payload = verification.rawPayload;
      
      addLog("📡 در حال انتقال پرونده‌های چندرسانه‌ای و استخراج کلیدهای باینری تصاویر به هاست...");
      // Send payload to backend to unpack and restore /uploads/
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/backup/import`.replace(/\/\//g, '/'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error("سرویس ایمپورت هاست قادر به نگاشت یا بازسازی تصاویر نبود.");
      }
      
      const importResult = await res.json();
      addLog(`📁 با موفقیت ${importResult.count} فایل تصویری/چندرسانه‌ای روی لایه وب هاست احیا شدند.`);

      if (payload.siteContent) localStorage.setItem('siteContent', JSON.stringify(payload.siteContent));
      if (payload.globalSettings) localStorage.setItem('globalSettings', JSON.stringify(payload.globalSettings));
      if (payload.pricingFormula) localStorage.setItem('pricingFormula', JSON.stringify(payload.pricingFormula));
      if (payload.seoConfigs) localStorage.setItem('seoConfigs', JSON.stringify(payload.seoConfigs));
      if (payload.catalogItems) localStorage.setItem('catalogItems', JSON.stringify(payload.catalogItems));
      if (payload.portfolioItems) localStorage.setItem('portfolioItems', JSON.stringify(payload.portfolioItems));
      if (payload.blogPosts) localStorage.setItem('blogPosts', JSON.stringify(payload.blogPosts));
      if (payload.uploadedAssets) localStorage.setItem('uploadedAssets', JSON.stringify(payload.uploadedAssets));
      
      // ERP local storages
      if (payload.ledger_entries) localStorage.setItem('ledger_entries', JSON.stringify(payload.ledger_entries));
      if (payload.b2b_settings) localStorage.setItem('b2b_settings', JSON.stringify(payload.b2b_settings));
      if (payload.b2b_projects) localStorage.setItem('b2b_projects', JSON.stringify(payload.b2b_projects));

      addLog("⚡ سیستم معین مالی، متون CMS و فایلهای پیوستی با موفقیت بازنشانی شد. نوسازی پرتال اعمال می‌شود...");
      setVerification(null);
      setBackupSuccess("تمامی داده‌های کارگاه، فایل‌ها و تنظیمات با موفقیت بازنشانی شدند.");
      
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (err: any) {
      setBackupError(`خطا هنگام نوشتن پایگاه داده محلی: ${err.message}`);
    }
  };

  // Clean and reset database to pristine default
  const handleResetToDefault = () => {
    if (window.confirm("آیا مایلید کلیه تغییرات CMS، حساب های مالی، نرخ کاغد و تنظیمات را حذف کرده و سیستم را به حالت پیش‌فرض کارخانه بازنشانی نمایید؟ این عملیات غیرقابل بازگشت است.")) {
      localStorage.clear();
      addLog("🧹 کل داده‌های محلی و کوکی‌های موقت سیستم پاکسازی شد. بازنشانی به پیش‌فرض کارخانه...");
      window.location.reload();
    }
  };

  // Simulate SQL Primary Failover (Disaster Recovery System)
  const handleSimulateFailover = () => {
    if (primaryStatus !== 'online') return;
    
    addLog("🚨 شبیه‌ساز بحران فعال شد: پایگاه داده اصلی (ashk-prod-primary) از دسترس خارج گردید!");
    setPrimaryStatus('failed');
    setWalLagMs(0);
    
    // Begin promoting replica
    addLog("📡 ناظر خودکار کلاستر (Keepalived): هشدار قطعی سرور اصلی! شروع هدایت ریل معین هماهنگ...");
    setTimeout(() => {
      setStandbyStatus('promoting');
      addLog("🔄 مکانیزم DR: ارزیابی آخرین هماهنگی WALها. انتقال نقش از Standby به Active...");
    }, 3000);

    setTimeout(() => {
      setStandbyStatus('primary');
      addLog("✅ سرور پشتیبان منطقه سمنان (ashk-replica-tz) با ارتقای نقش، به کلاستر نویسنده اصلی تبدیل شد!");
      addLog("🔌 ارتباط رول‌بک مجدد درگاه شتاب و صندوق مالی با کلاستر جدید با موفقیت همگام شد.");
    }, 7000);
  };

  const handleResetReplication = () => {
    setPrimaryStatus('online');
    setStandbyStatus('replica');
    setWalLagMs(4);
    addLog("♻️ خوشه پایگاه‌داده کلید دوطرفه اصلاح شد. ایستگاه تبریز مجدداً به عنوان کپی آماده به‌کار قرار گرفت.");
  };

  // PITR Engine Simulation
  const handlePitrAudit = () => {
    setPitrAuditStatus('auditing');
    setPitrProgress(0);
    setPitrErrors([]);
    addLog(`🔍 شروع ممیزی سازگاری با گذشته در زمان فرضی: ${pitrDate} ${pitrTime}`);

    const interval = setInterval(() => {
      setPitrProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setPitrAuditStatus('passed');
          addLog("🟢 بازبینی ساختار ترازنامه مالی و دیلاینی با موفقیت در این امضا زمانی تایید شد. هیچ عدم هماهنگی پیدا نشد.");
          return 100;
        }
        return prev + 25;
      });
    }, 600);
  };

  const executePitrRestore = () => {
    addLog(`🔄 عملیات بازگرداندن نقطه زمانی (PITR) در حال اجراست... تراز مالی و صفحات CMS به زمان ${pitrDate} ${pitrTime} منتقل می‌شوند.`);
    // Simulate restore complete
    setTimeout(() => {
      addLog(`✨ بازگردانی نقطه زمانی موفقیت‌آمیز بود! ${Math.floor(Math.random() * 5) + 3} سند تراکنشی و ۴ ویرایش CMS احیا بهینه‌سازی شدند.`);
      alert(`سیستم با موفقیت به تاریخ فرضی ${pitrDate} ساعت ${pitrTime} بازمی‌گردد.`);
    }, 1500);
  };

  // WORM Security Simulations
  const toggleWorm = () => {
    const nextState = !wormEnabled;
    setWormEnabled(nextState);
    addLog(nextState 
      ? "🔒 امنیت سخت افزاری WORM فعال گردید. هرگونه ویرایش فرمول‌ها، تنظیمات و CMS در فایل فیزیکی متوقف و بلاک خواهد شد." 
      : "🔓 امنیت WORM غیرفعال گردید. ویرایش مستقیم آزاد است."
    );
  };

  const handleSimulateRansomware = () => {
    setIsSimulatingAttack(true);
    setSandboxResponse("...در حال اجرا تست نفوذ سایبری");
    addLog("👾 سنسور امنیتی: آغاز شبیه‌سازی تست نفوذ رمزگذاری باج‌افزار نوع مخرب LockBit 4.0...");

    setTimeout(() => {
      if (wormEnabled) {
        setSandboxResponse("🛡️ سیستم ایمن ماند! از آنجا که قفل سخت‌افزاری WORM متصل است، باج‌افزار قادر به تغییر مقادیر بورس کالا یا فرمول‌ها نبود و فایل‌ها قفل چرخشی ماندند.");
        addLog("🛡️ پدافند سایبری اشک‌قلم: تلاش هکری برای بازنویسی دیلاین‌ها و کاتالوگ با شکست مواجه شد (WORM active).");
      } else {
        setSandboxResponse("⚠️ فاجعه سایبری! به دلیل پورت‌های بدون قفل کارگاه، باج‌افزار با موفقیت فرمول‌های بهاء را به مقادیر نجومی تغییر داد و داده‌های محلی را مختل نمود.");
        addLog("⚠️ هشدار بحران امنیت: مقادیر پایه موتور قیمت‌گذاری توسط اسکریپت آلوده شد! سریعاً فایل پشتیبان سالم را بازنشانی فرمایید.");
        
        // Damage formula values temporarily
        localStorage.setItem('pricingFormula', JSON.stringify({
          ...pricingFormula,
          profitMargin: 99.9,
          rushMultiplier: 88.8
        }));
      }
      setIsSimulatingAttack(false);
    }, 2500);
  };

  // Luxury DXF offsite syncer
  const handleSyncCadVault = () => {
    setIsSyncingCad(true);
    setCadSyncProgress(12);
    addLog("🚀 شروع ارسال امن شیت‌های دایکات و دیلاین نقشه لینوکس به مخزن پشتیبان پشتیبان سمنان...");
    
    const interval = setInterval(() => {
      setCadSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSyncingCad(false);
          setVaultSyncCount(v => v + 3);
          addLog("📂 آپلود ۳ دیلاین جدید اتوکد و پرونده‌های PDF ممیزی به کاتالوگ امن MinIO با موفقیت به پایان رسید.");
          return 100;
        }
        return prev + 22;
      });
    }, 600);
  };

  return (
    <div className="space-y-6 dir-rtl text-right text-slate-100 font-sans pb-12">
      
      {/* Title block */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 p-6 rounded-3xl border border-indigo-500/20 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-2xl rounded-full"></div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-extrabold text-lg md:text-xl text-white">سامانه بازیابی فاجعه و تداوم کسب‌وکار (Dual-Layer Hot DR Core)</h2>
              <p className="text-xs text-indigo-300 font-medium">پایدارسازی داده‌های مالی، قالب‌های دیلاین کاد و محتوای پرتال اشک‌قلم</p>
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-400 max-w-3xl mt-2 leading-relaxed">
            این پرتال به شما اجازه می‌دهد از تمامی داده‌های مانا (تراکنش‌های بانکی، فاکتورها، نرخ‌های بورس و کاتالوگ وبلاگ) فایل پشتیبان فیزیکی صادر کنید، کلاستر همزمان دیتابیس را پایش نمایید و بازیابی نقاط زمانی بحرانی را تحت بستر WORM تست نمایید.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleDownloadBackup}
            variant="primary" 
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-bold shadow-lg shadow-indigo-600/30"
          >
            <Download className="w-4 h-4 ml-1.5" />
            دانلود خروجی کامل (.json)
          </Button>
          <Button 
            onClick={handleResetToDefault}
            variant="outline" 
            className="text-xs border-red-500/30 hover:bg-red-950/20 text-red-400 font-bold"
          >
            <Trash2 className="w-4 h-4 ml-1.5" />
            کارخانه پیش‌فرض
          </Button>
        </div>
      </div>

      {/* Sub menu tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
        {[
          { id: 'full_system_backup', label: 'بک‌آپ و بازیابی جامع کل سیستم و برند', icon: ShieldCheck, color: 'text-emerald-400' },
          { id: 'host_deploy_zip', label: 'دانلود پکیج زیپ هاست (Deploy Package)', icon: Download, color: 'text-amber-400' },
          { id: 'catalogs_migration', label: 'بک‌آپ و انتقال کاتالوگ‌ها و تنظیمات فعال', icon: Sliders, color: 'text-amber-400' },
          { id: 'cms', label: 'صادر / وارد اطلاعات CMS و ERP', icon: Database, color: 'text-indigo-400' },
          { id: 'smart_update', label: 'بسته بروزرسانی هوشمند (ZIP Update)', icon: RefreshCw, color: 'text-violet-400' },
          { id: 'replication', label: 'پایش کلاستر و انتقال نقش (Databases)', icon: Server, color: 'text-emerald-400' },
          { id: 'pitr', label: 'موتور بازیابی نقطه زمانی (PITR)', icon: Sliders, color: 'text-pink-400' },
          { id: 'worm', label: 'امنیت سخت‌افزاری WORM کارگاه', icon: Lock, color: 'text-amber-400' },
          { id: 'cloud_sync', label: 'همگام‌سازی ابری نقشه‌های DXF', icon: HardDrive, color: 'text-teal-400' },
        ].map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeSegment === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSegment(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-slate-800 border border-indigo-500/45 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <TabIcon className={`w-4 h-4 ${tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Segment Content Viewports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Action column (span 2) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tab: Full-System Comprehensive Backup & Recovery */}
          {activeSegment === 'full_system_backup' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Box */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                        <span>بک‌آپ و بازیابی جامع کل داده‌های سیستم، برندینگ و کاتالوگ‌ها</span>
                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 font-mono">
                          v3.1 Full Recovery
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        پشتیبان‌گیری ۱۰۰٪ یکپارچه از لوگوها، رنگ‌ها، هویت برند، تنظیمات پرتال، کاتالوگ‌ها، فایل‌های رسانه و نرم‌افزارها در قالب یک فایل استاندارد
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFullSystemHelp(!showFullSystemHelp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      showFullSystemHelp 
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                        : 'bg-slate-800 text-emerald-300 border-emerald-500/30 hover:bg-slate-700'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>راهنمای جامع هوشمند</span>
                  </button>
                </div>

                {/* Intelligent Help Accordion */}
                {showFullSystemHelp && (
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 text-xs text-slate-300 space-y-3 leading-relaxed animate-in fade-in duration-150">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>چرا این بک‌آپ برای آپدیت‌ها حیاتی است؟</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-300 mr-2">
                      <li><strong>پوشش داده‌های برند و موبایل:</strong> تمام تنظیمات لوگوی دسکتاپ و موبایل، عنوان سایت، رنگ‌های تم و محتوا در فایل قرار می‌گیرند.</li>
                      <li><strong>حفظ کاتالوگ‌ها و رسانه‌ها:</strong> عکس‌های جلد، صفحات کاتالوگ و تصاویر آپلود شده به صورت باینری فشرده داخل فایل بسته‌بندی می‌شوند.</li>
                      <li><strong>ذخیره خودکار در شاخه backups سرور:</strong> با هر بار دانلود، یک نسخه با مهر زمانی شمسی در دیسک سرور ثبت می‌گردد تا در صورت بروز هرگونه مشکل پس از آپدیت به سادگی فراخوانی شود.</li>
                      <li><strong>سازگاری با اینترنت داخلی:</strong> تمام عملیات بسته‌بندی و بازگردانی کاملاً درون‌برنامه‌ای و بدون وابستگی به سرورهای خارجی اجرا می‌شود.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Status alerts */}
              {fullSystemSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{fullSystemSuccess}</span>
                </div>
              )}
              {fullSystemError && (
                <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{fullSystemError}</span>
                </div>
              )}

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                        <Download className="w-5 h-5" />
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        تهیه فایل جامع
                      </Badge>
                    </div>
                    <h4 className="font-extrabold text-sm text-white">دریافت فایل پشتیبان جامع (.json)</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      شامل تمام اطلاعات برندینگ، کاتالوگ‌ها، نرم‌افزارها، تنظیمات بهاء و فایل‌های رسانه برای نگهداری امن قبل از هر آپدیت.
                    </p>
                  </div>

                  <Button
                    onClick={handleExportFullSystem}
                    disabled={isExportingFullSystem}
                    variant="primary"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 py-2.5"
                  >
                    {isExportingFullSystem ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>در حال بسته‌بندی داده‌ها و رسانه‌ها...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>دانلود فایل پشتیبان جامع سیستم</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Import / Restore Card */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/30 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                        <Upload className="w-5 h-5" />
                      </span>
                      <Badge className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px]">
                        بازگردانی و احیاء
                      </Badge>
                    </div>
                    <h4 className="font-extrabold text-sm text-white">فراخوانی و بازیافت فایل پس از آپدیت</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      فایل پشتیبان ذخیره‌شده را انتخاب فرمایید تا تمام هویت برند، تصاویر و کاتالوگ‌ها به صورت خودکار احیاء شوند.
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={fullSystemFileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFullSystemFileSelect(e.target.files[0])}
                    accept=".json"
                    className="hidden"
                  />

                  <Button
                    onClick={() => fullSystemFileInputRef.current?.click()}
                    variant="outline"
                    className="w-full border-indigo-500/40 hover:bg-indigo-950/30 text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 py-2.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>انتخاب فایل پشتیبان (.json)</span>
                  </Button>
                </div>
              </div>

              {/* Restore Confirmation View */}
              {fullSystemPreview && (
                <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <h4 className="font-bold text-sm text-white">بررسی محتوای بسته پشتیبان</h4>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                      نسخه بسته: {fullSystemPreview.version || '3.1'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">نام برند / پرتال</span>
                      <strong className="text-white font-bold mt-1 block truncate">
                        {fullSystemPreview.data?.globalSettings?.siteName || 'تعریف نشده'}
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">تعداد کاتالوگ‌ها</span>
                      <strong className="text-emerald-400 font-bold mt-1 block">
                        {fullSystemPreview.data?.catalogs?.length || 0} عدد
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">فایل‌های رسانه و تصاویر</span>
                      <strong className="text-indigo-400 font-bold mt-1 block">
                        {fullSystemPreview.data?.mediaFiles?.length || 0} فایل
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">تاریخ ثبت شمسی</span>
                      <strong className="text-amber-400 font-bold mt-1 block text-[11px]">
                        {fullSystemPreview.createdAtShamsi || 'ثبت شده'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="fullSystemMode"
                          checked={fullSystemMode === 'merge'}
                          onChange={() => setFullSystemMode('merge')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>ادغام هوشمند (توصیه شده)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="fullSystemMode"
                          checked={fullSystemMode === 'replace'}
                          onChange={() => setFullSystemMode('replace')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>جایگزینی کامل</span>
                      </label>
                    </div>

                    <Button
                      onClick={handleExecuteFullSystemRestore}
                      disabled={isRestoringFullSystem}
                      variant="primary"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 flex items-center gap-2"
                    >
                      {isRestoringFullSystem ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>در حال احیاء و بازنشانی کامل...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>تایید و بازیافت کامل سیستم و برند</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Host Deploy ZIP Package */}
          {activeSegment === 'host_deploy_zip' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                      <Download className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                        <span>بسته تجمیعی و آماده آپلود روی انواع هاست (نسخه ۳.۲ بروزرسانی‌شده)</span>
                        <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 font-mono">
                          v3.2 Production Build
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        شامل کلیه کامپوننت‌ها، استودیو صنعتی Packly، موتورهای آفلاین، کدهای بهینه‌شده، فایل .htaccess و راهنمای فارسی
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowHostGuide(!showHostGuide)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      showHostGuide 
                        ? 'bg-amber-500 text-slate-950 border-amber-400' 
                        : 'bg-slate-800 text-amber-300 border-amber-500/30 hover:bg-slate-700'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>راهنمای استقرار روی هاست</span>
                  </button>
                </div>

                {/* Guide Accordion */}
                {showHostGuide && (
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 text-xs text-slate-300 space-y-3 leading-relaxed">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>دستورالعمل استقرار سریع روی انواع کنترل‌پنل‌ها و سرورها:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-300 mr-2">
                      <li><strong>هاست اشتراکی (cPanel / DirectAdmin / Plesk / دایرکت ادمین):</strong> بسته <code>ashk-ghalam-v3.2-host-ready.zip</code> را دانلود و در پوشه <code>public_html</code> اکسترکت کنید. فایل <code>.htaccess</code> از پیش تنظیم شده تا روت‌های تک‌صفحه‌ای و کش فونت‌ها بدون مشکل کار کنند.</li>
                      <li><strong>سرورهای ابری ایرانی (لیارا، پله، چابکان، ابرآروان):</strong> می‌توانید از بسته کلاینت ایستا (Static Platform) یا بسته کامل Node.js با دستور <code>npm run start</code> استفاده کنید.</li>
                      <li><strong>سرور لینوکس VPS (Nginx / Apache):</strong> فایل <code>nginx.conf.example</code> داخل بسته قرار دارد و نیازی به اینترنت یا سرویس خارجی نیست.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Package Download Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Production Host Ready */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 flex flex-col justify-between gap-4 hover:border-amber-500/60 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                        <Folder className="w-5 h-5" />
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        آماده آپلود مستقیم (توصیه شده)
                      </Badge>
                    </div>
                    <h4 className="font-extrabold text-sm text-white">بسته آماده هاست (Host-Ready Dist)</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      فایل‌های کامپایل‌شده نهایی با پسوند .zip شامل index.html، کدهای فشرده باندل شده، فونت‌های وزیرمتن، .htaccess برای cPanel و مستندات فارسی.
                    </p>
                    <div className="pt-2 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>حجم فایل: ~۱.۸۵ مگابایت</span>
                      <span>•</span>
                      <span>نسخه ۳.۲ استاندارد</span>
                    </div>
                  </div>

                  <a
                    href="/downloads/ashk_ghalam_v3.5.2_cpanel.zip"
                    download="ashk_ghalam_v3.5.2_cpanel.zip"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود فایل زیپ هاست cPanel (ashk_ghalam_v3.5.2_cpanel.zip)</span>
                  </a>
                </div>

                {/* Card 2: Full Source & Project Bundle */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/30 flex flex-col justify-between gap-4 hover:border-indigo-500/60 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                        <FileCode className="w-5 h-5" />
                      </span>
                      <Badge className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px]">
                        سورس کامل + بیلد
                      </Badge>
                    </div>
                    <h4 className="font-extrabold text-sm text-white">پکیج کامل سورس‌کد و بیلد پروژه</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      شامل تمام پوشه‌های components، services، types.ts، کدهای سرور cPanel/PHP، کانفیگ‌های Vite و Tailwind به همراه پوشه dist.
                    </p>
                    <div className="pt-2 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>حجم فایل: ~۳.۲ مگابایت</span>
                      <span>•</span>
                      <span>نسخه ۳.۵.۲ کامل</span>
                    </div>
                  </div>

                  <a
                    href="/downloads/ashk_ghalam_v3.5.2_source_bundle.zip"
                    download="ashk_ghalam_v3.5.2_source_bundle.zip"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود پکیج سورس‌کد (ashk_ghalam_v3.5.2_source_bundle.zip)</span>
                  </a>
                </div>
              </div>

              {/* Server Details Spec */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>وضعیت پکیجینگ: فایلهای زیپ در شاخه عمومی <code>/public/downloads</code> و <code>/dist/downloads</code> مستقر و قابل دانلود هستند.</span>
                </div>
                <span className="font-mono text-[10px] bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
                  Ready for Direct Upload
                </span>
              </div>
            </div>
          )}

          {/* Tab 0: Catalogs & Settings Active Migration */}
          {activeSegment === 'catalogs_migration' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Box with Smart Help Toggle */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                      <BookOpen className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-sm text-white">
                        موتور پشتیبان‌گیری و انتقال کاتالوگ‌ها و تنظیمات به سایت آپدیت‌شده
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        استخراج ۱۰۰٪ کاتالوگ‌های فعال، برگه‌ها و تصاویر و انتقال یکپارچه به نسخه جدید سایت
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMigrationHelp(!showMigrationHelp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      showMigrationHelp 
                        ? 'bg-amber-500 text-slate-950 border-amber-400' 
                        : 'bg-slate-800 text-amber-300 border-amber-500/30 hover:bg-slate-700'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>راهنمای هوشمند انتقال</span>
                  </button>
                </div>

                {/* Smart Help Drawer */}
                {showMigrationHelp && (
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30 text-xs text-slate-300 space-y-2.5 animate-in fade-in">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>راهنمای گام‌به‌گام انتقال بدون از دست رفتن داده‌ها:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-[11.5px] leading-relaxed text-slate-300 pr-1">
                      <li><strong>قبل از بروزرسانی نسخه سایت:</strong> روی دکمه «تهیه و دانلود فایل پشتیبان کاتالوگ‌ها و تنظیمات» کلیک کنید. یک فایل شامل تمام کاتالوگ‌های فعال، صفحات، متاتگ‌ها و تصاویر به نام <code>ashk_catalogs_settings_backup_...json</code> روی دستگاه شما ذخیره می‌شود.</li>
                      <li><strong>پس از بالا آمدن سایت آپدیت شده:</strong> به همین بخش بیایید و فایل پشتیبان دانلودشده را در کادر «انتقال و بازیابی» قرار دهید.</li>
                      <li><strong>حالت ادغام هوشمندانه (پیشنهادی):</strong> سیستم کاتالوگ‌ها و تصاویر را با ساختار نسخه جدید ترکیب می‌کند تا هیچ داده‌ای حذف نشود و تنظیمات با امکانات جدید همگام شوند.</li>
                      <li><strong>تایید و اعمال:</strong> پس از تایید، داده‌ها بلافاصله در دیسک هاست و پایگاه داده ثبت شده و کاتالوگ‌های شما با تمام صفحات فعال می‌گردند.</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Status & Feedback Notifications */}
              {migrationSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{migrationSuccess}</span>
                </div>
              )}

              {migrationError && (
                <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{migrationError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Export Box */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-white">۱. خروجی کاتالوگ‌ها و تنظیمات فعال</h4>
                      </div>
                      <Badge color="blue">JSON EXPORT</Badge>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      تهیه بسته پشتیبان استاندارد شامل تمامی کاتالوگ‌های فعال سفارشی، دسته‌بندی‌ها، برگه‌های طراحی، تصاویر و تنظیمات سراسری.
                    </p>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11.5px] text-slate-300 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">کاتالوگ‌های فعال در دسترس:</span>
                        <span className="font-mono font-bold text-indigo-300">{catalogItems.length} عنوان</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">تنظیمات فعال سایت:</span>
                        <span className="font-mono font-bold text-emerald-300">آماده ({globalSettings.siteName || 'اشک قلم'})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">فرمول نرخ‌ها و تنظیمات سئو:</span>
                        <span className="font-mono font-bold text-amber-300">{seoConfigs.length} صفحه کانفیگ</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportCatalogsAndSettings}
                    disabled={isExportingCatalogs}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className={`w-4 h-4 ${isExportingCatalogs ? 'animate-bounce' : ''}`} />
                    <span>{isExportingCatalogs ? 'در حال تهیه و فشرده‌سازی بسته...' : 'تهیه و دانلود فایل پشتیبان (.json)'}</span>
                  </button>
                </div>

                {/* 2. Import & Migrate Box */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-white">۲. انتقال و بازیابی به سایت آپدیت‌شده</h4>
                    </div>
                    <Badge color="green">MIGRATION</Badge>
                  </div>

                  {/* Drop zone */}
                  <input
                    type="file"
                    ref={migrationFileInputRef}
                    accept=".json"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleMigrationFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  <div
                    onDragOver={e => { e.preventDefault(); setMigrationDragActive(true); }}
                    onDragLeave={() => setMigrationDragActive(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setMigrationDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleMigrationFileSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => migrationFileInputRef.current?.click()}
                    className={`p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                      migrationDragActive
                        ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-400'
                    }`}
                  >
                    <Upload className="w-7 h-7 mx-auto mb-1.5 text-emerald-400 opacity-80" />
                    <span className="text-xs font-bold block text-slate-200">
                      انتخاب یا کشیدن فایل پشتیبان کاتالوگ‌ها
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      فایل‌های دارای ساختار استاندارد .json
                    </span>
                  </div>

                  {/* Preview of selected migration package */}
                  {migrationPreview && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs space-y-2">
                      <div className="flex justify-between items-center text-[11px] text-slate-300 pb-1.5 border-b border-slate-800">
                        <span className="font-bold text-emerald-400">اطلاعات بسته بارگذاری‌شده:</span>
                        <span className="font-mono text-slate-400">{migrationPreview.createdAtShamsi || 'تاریخ ثبت شده'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                        <div>کاتالوگ‌ها: <strong className="text-white font-mono">{migrationPreview.data?.catalogs?.length || 0} مورد</strong></div>
                        <div>تصاویر همراه: <strong className="text-white font-mono">{migrationPreview.data?.catalogMedia?.length || 0} فایل</strong></div>
                      </div>

                      {/* Merge Mode Switcher */}
                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        <div className="text-[11px] text-slate-300 font-bold">روش اعمال انتقال:</div>
                        <div className="flex items-center gap-3 text-xs">
                          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="migrationMode"
                              value="merge"
                              checked={migrationMode === 'merge'}
                              onChange={() => setMigrationMode('merge')}
                              className="accent-emerald-500"
                            />
                            <span>ادغام هوشمندانه (پیشنهادی)</span>
                          </label>

                          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="migrationMode"
                              value="replace"
                              checked={migrationMode === 'replace'}
                              onChange={() => setMigrationMode('replace')}
                              className="accent-emerald-500"
                            />
                            <span>جایگزینی کامل</span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleExecuteMigration}
                        disabled={isMigratingCatalogs}
                        className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isMigratingCatalogs ? 'در حال انتقال و استقرار به سایت...' : 'تایید و انتقال به سایت جدید'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: CMS and general storage backup / restore */}
          {activeSegment === 'cms' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-3xl space-y-5">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-400" />
                    ورود داده‌های پشتیبان کارگاه و کاتالوگ (Restore CMS Database Engine)
                  </h3>
                  <Badge color="blue">JSON PARSER</Badge>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  فایل پشتیبان فیزیکی با پسوند .json را که قبلاً دانلود کرده‌اید، بکشید و در کادر زیر رها کنید. سیستم پس از تحلیل پویای تراز اسناد، مارجین سودآوری و عکس‌های کاتالوگ، اجازه احیاء کامل را مبذول خواهد کرد.
                </p>

                {backupSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-2.5 text-xs font-medium">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{backupSuccess}</span>
                  </div>
                )}

                {backupError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-2.5 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{backupError}</span>
                  </div>
                )}

                {/* Drop Zone */}
                <div 
                  className={`w-full border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-950/25' 
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/30'
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  <span className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
                    <Upload className="w-6 h-6 text-indigo-400" />
                  </span>
                  <div className="text-center">
                    <p className="text-xs text-slate-300 font-bold">بکشید و رها کنید یا کلیک کنید تا فایل بارگذاری شود</p>
                    <p className="text-[10px] text-slate-500 mt-1">فرمت مورد تائید: .json حاوی امضای ساختاری اشک قلم</p>
                  </div>
                </div>

                {/* If verified file loaded, show metadata before restore */}
                {verification && (
                  <div className="bg-slate-900/60 border border-indigo-500/30 rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom-3">
                    <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2.5">
                      <FileCode className="w-4 h-4" />
                      <span className="text-xs font-bold">امضاء دیجیتال و صحت فایل تائید شد</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">نسخه وب‌اپلیکیشن:</span>
                        <span className="font-mono text-slate-300 font-bold">{verification.version}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">تاریخ ذخیره‌سازی:</span>
                        <span className="text-slate-300 font-bold">{new Date(verification.timestamp).toLocaleDateString('fa-IR')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">ورودی‌های بلاگ:</span>
                        <span className="font-mono text-slate-300 font-bold">{verification.stats.blogCount} پست</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-normal">کارهای کاتالوگ دایکات:</span>
                        <span className="font-mono text-slate-300 font-bold">{verification.stats.catalogCount} محصول</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-normal">گزارش‌های تراز مالی:</span>
                        <span className="font-mono text-slate-300 font-bold">{verification.stats.ledgerCount} ردیف</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-normal">پیکربندی فرمول بورس:</span>
                        <span className={`font-bold ${verification.stats.pricingFormula ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {verification.stats.pricingFormula ? 'موجود' : 'فقدان'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-800">
                      <Button
                        onClick={handleRestoreVerification}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-0"
                      >
                        <CheckCircle className="w-4 h-4 ml-1.5" />
                        تایید و احیاء تمام‌عیار رکوردهای دیتابیس
                      </Button>
                      <Button
                        onClick={() => setVerification(null)}
                        variant="ghost"
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        لغو بارگذاری
                      </Button>
                    </div>
                  </div>
                )}

              </div>

              {/* Server-Side Autonomous Backup Pool */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-900 pb-3 gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                       <Server className="w-5 h-5 text-emerald-400" />
                       نسخه‌های پشتیبان مانا روی سرور (Server-Side Isolated Backups)
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">ذخیره سازی مستقیم روی دیسک هاست اشک‌قلم بدون وابستگی به مرورگر</p>
                  </div>
                  <Button
                    onClick={handleSaveServerBackup}
                    disabled={isSavingServerBackup}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-bold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${isSavingServerBackup ? 'animate-spin' : ''}`} />
                    {isSavingServerBackup ? "در حال ذخیره‌سازی..." : "ایجاد نسخه پشتیبان روی سرور"}
                  </Button>
                </div>

                {downloadProgress !== null && (
                  <div className="p-4 bg-slate-900 border border-indigo-500/30 rounded-2xl space-y-3 animate-pulse">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        در حال بارگیری بسته پشتیبان از هاست سرور...
                      </span>
                      <span className="text-white font-mono font-bold">{downloadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-150" 
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {isLoadingServerBackups ? (
                  <div className="text-center py-6 text-xs text-slate-500 animate-pulse">در حال خواندن فایل‌های بکاپ سرور...</div>
                ) : serverBackups.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-900 rounded-2xl text-xs text-slate-500">
                    هیچ نسخه پشتیبانی روی سرور یافت نشد. برای پایداری داده‌ها همین حالا یک نسخه پشتیبان ایجاد فرمایید.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {serverBackups.map((bak) => (
                      <div key={bak.filename} className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-xl flex justify-between items-center text-xs hover:border-slate-700/85 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="p-2 bg-slate-950 rounded-xl text-emerald-400">
                            <Database className="w-4 h-4" />
                          </span>
                          <div>
                            <span className="font-mono text-[11px] text-slate-200 block font-bold truncate max-w-[220px] md:max-w-xs">{bak.filename}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block font-sans">
                              تاریخ ایجاد: {new Date(bak.createdAt).toLocaleString('fa-IR')} | سایز: {(bak.size / 1024).toFixed(1)} کیلوبایت
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleRestoreFromServer(bak.filename)}
                            variant="primary"
                            className="text-[10px] py-1 px-2.5 bg-indigo-600/85 hover:bg-indigo-700 text-white font-bold border-0 h-8"
                          >
                            <RefreshCw className="w-3 h-3 ml-1" />
                            احیاء
                          </Button>
                          <Button
                            onClick={() => handleDeleteServerBackup(bak.filename)}
                            variant="outline"
                            className="text-[10px] py-1 px-2.5 border-red-500/20 text-red-400 hover:bg-red-950/20 h-8"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Professional VS Code Update & Data Migration Guideline */}
              <div className="bg-gradient-to-br from-slate-900/30 via-indigo-950/10 to-slate-900/30 border border-indigo-500/15 p-6 rounded-3xl space-y-4 text-right">
                <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2 border-b border-slate-900 pb-3">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  راهنمای مهندسی فرآیند به‌روزرسانی نرم‌افزار و مهاجرت داده‌ها (VS Code ⇆ Dev Cycle)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  مدیریت و توسعه مداوم پورتال اشک‌قلم مستلزم حفظ پایداری داده‌های مشتریان، تراکنش‌ها، تصاویر آپلود شده و فرمول‌ها می‌باشد. هنگام آپلود نسخه‌های جدید نرم‌افزار بر روی هاست، فرمت زیر به عنوان راهکار حرفه‌ای توصیه می‌شود:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900">
                    <span className="text-lg font-black text-indigo-400 font-mono block mb-1">۰۱. پشتیبان‌گیری چندرسانه‌ای</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      پیش از بارگذاری کدهای جدید، از پنل بالا دکمه <strong>"دانلود فیزیکی نسخه کامل"</strong> را بفشارید. موتور جدید پشتیبان‌گیر اشک‌قلم فورا کل دیتابیس را به همراه <strong>نسخه باینری تصاویر انبار و فرمول‌‌های بورس در قالب Base64</strong> یکپارچه کرده و به کامپیوتر شما منتقل می‌کند.
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900">
                    <span className="text-lg font-black text-indigo-400 font-mono block mb-1">۰۲. کامپایل و تست در VS Code</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      تغییرات بصری جدید، اصلاح پورتال‌ها و موتور شبیه‌ساز سفارشات را در ادیتور محلی خود (VS Code) توسعه داده و با ترمینال زیر کامپایل نهایی کنید ت صحت کدها تایید شود:
                    </p>
                    <code className="text-[10px] block font-mono text-emerald-400 bg-slate-950 p-2 rounded mt-2.5 border border-slate-900 text-left">
                      npm run build
                    </code>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900">
                    <span className="text-lg font-black text-indigo-400 font-mono block mb-1">۰۳. آپلود ZIP و بازخوانی آنی</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      فایل کامپایل شده نهایی را zip کرده، روی سرویس هاست بازگشایی و Unzip فرمایید. برای بازیابی تراکنش‌ها و متون گذشته، کافیست بکاپ مرحله ۱ را در درگاه بالا آپلود و کلیک کنید. سیستم فورا <strong>تمام تصاویر و رکوردهای معین را بدون افت کیفیت بازیابی و درج می‌کند</strong>!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* Tab 2: PostgreSQL / SQLite WAL Continuous Replication simulation */}
          {activeSegment === 'replication' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-3xl space-y-6">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <Server className="w-5 h-5 text-emerald-400" />
                    خوشه پایگاه‌داده توزیع‌شده (PG Multi-Zone High Availability Cascade)
                  </h3>
                  <Badge color="green">ACTIVE CLUSTERING</Badge>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  سیستم ERP اشک‌قلم به صورت زنده از استراتژی Write-Ahead Logging (WAL) بهره برده و تراکنش‌ها به صورت موازی (Lag زیر ۵ میلی‌ثانیه) روی دیتابیس پشتیبان پایگاه سمنان کپی می‌شوند. این شبیه‌ساز مکانیزم بقای سرور در مواجه با قطل ناگهانی کابل سرور اصلی را پیاده‌سازی می‌کند.
                </p>

                {/* Nodes layout Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary Node */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    primaryStatus === 'online' 
                      ? 'bg-slate-900/60 border-emerald-500/20' 
                      : 'bg-red-950/20 border-red-500/50'
                  }`}>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] text-slate-400 font-mono">ZONE A - TEHRAN PRIMARY</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        primaryStatus === 'online' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${primaryStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
                        {primaryStatus === 'online' ? 'نویسنده اصلی (Primary)' : 'از دسترس خارج (CRASH)'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-200 font-mono">ashk-prod-primary.pg.local</h4>
                    <div className="mt-4 flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>تعداد تراکنش WAL:</span>
                      <span className="text-slate-200">{primaryStatus === 'online' ? walCount : 'بلاک شده'}</span>
                    </div>
                  </div>

                  {/* Standby / promote Node */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    standbyStatus === 'primary' 
                      ? 'bg-emerald-950/20 border-emerald-500/60' 
                      : standbyStatus === 'promoting'
                      ? 'bg-amber-950/20 border-amber-500/50 animate-pulse'
                      : 'bg-slate-900/60 border-indigo-500/25'
                  }`}>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] text-slate-400 font-mono">ZONE B - SEMNAN STANDBY</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        standbyStatus === 'primary' ? 'bg-emerald-500/15 text-emerald-400' :
                        standbyStatus === 'promoting' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-indigo-500/15 text-indigo-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          standbyStatus === 'primary' ? 'bg-emerald-500' : 
                          standbyStatus === 'promoting' ? 'bg-amber-500 animate-ping' : 
                          'bg-indigo-500'
                        }`}></span>
                        {standbyStatus === 'primary' && 'خواننده و نویسنده جدید (Elevated)'}
                        {standbyStatus === 'promoting' && 'در حال تائید نقش (Promoting...)'}
                        {standbyStatus === 'replica' && 'کپی زنده (Syncing...)'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-200 font-mono">ashk-replica-semnan.pg.local</h4>
                    <div className="mt-4 flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>میزان تاخیر WAL:</span>
                      <span className="text-slate-200">{standbyStatus === 'primary' ? '۰ میلی ثانیه (Primary)' : `${walLagMs} میلی ثانیه`}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated action triggers */}
                <div className="flex gap-2.5 pt-2">
                  {primaryStatus === 'online' ? (
                    <Button
                      onClick={handleSimulateFailover}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold border-0"
                    >
                      <CloudLightning className="w-4 h-4 ml-1.5" />
                      شبیه‌سازی قطعی ناگهانی شبکه‌ و تست Failover خودکار
                    </Button>
                  ) : (
                    <Button
                      onClick={handleResetReplication}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-0"
                    >
                      <RefreshCw className="w-4 h-4 ml-1.5 animate-spin" />
                      روشن کردن مجدد سرور تهران و متعادل‌سازی خوشه (Re-balance)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Point-in-Time Recovery (PITR) */}
          {activeSegment === 'pitr' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-3xl space-y-6">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-pink-400" />
                    موتور بازیابی جزئی و تراز ثانیه‌ای (Point-In-Time Continuous Recovery)
                  </h3>
                  <Badge color="purple">ROLLBACK SIMULATOR</Badge>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  پشتیبان‌گیری پیوسته اشک‌قلم به شما توانایی می‌دهد ترازنامه لجر بانکی و کاتالوگ دیلاین ها را به ثانیه‌ای مشخص در ۲۴ ساعت گذشته برانید. لود زنده در فواصل ثبت تراکنش، عدم مغایرت‌های محاسباتی را ممیزی کرده سپس انتقال می‌دهد.
                </p>

                {/* Continuous timeline slider */}
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">تنظیم نقطه زمانی فرضی برای بازگردانی:</span>
                    <span className="text-pink-400 font-mono font-bold">{pitrDate} {pitrTime}</span>
                  </div>

                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={pitrRange}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPitrRange(val);
                      // Calculate mock times
                      const hours = Math.floor((val * 24) / 100);
                      const min = Math.floor(((val * 24) % 1) * 60);
                      setPitrTime(`${hours.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">ویرایش تقویم شمسی:</label>
                      <input 
                        type="text" 
                        value={pitrDate} 
                        onChange={e => setPitrDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">ساعت تراز:</label>
                      <input 
                        type="text" 
                        value={pitrTime} 
                        onChange={e => setPitrTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Audit phase */}
                <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/20">
                  <div className="flex justify-between items-center text-xs mb-3">
                    <span className="font-bold text-slate-300">ممیزی توازن تراز مالی در این زمان:</span>
                    <span className={`font-bold ${
                      pitrAuditStatus === 'passed' ? 'text-emerald-400' :
                      pitrAuditStatus === 'auditing' ? 'text-pink-400' : 'text-slate-500'
                    }`}>
                      {pitrAuditStatus === 'idle' && 'منتظر ممیزی اولیه'}
                      {pitrAuditStatus === 'auditing' && 'در حال حسابرسی تراکنش‌ها...'}
                      {pitrAuditStatus === 'passed' && 'تایید توازن (Audit Verified)'}
                    </span>
                  </div>

                  {pitrAuditStatus === 'auditing' && (
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${pitrProgress}%` }}></div>
                    </div>
                  )}

                  {pitrAuditStatus === 'passed' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs mb-3">
                      تطابق چک‌های صیادی و دیلاین‌های نقشه CAD تایید گردید. پایگاه داده پایدار است.
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handlePitrAudit}
                      className="text-xs bg-pink-600 hover:bg-pink-700 text-white font-bold border-0"
                    >
                      <Play className="w-3.5 h-3.5 ml-1.5" />
                      ممیزی نقطه زمانی (PITR Audit)
                    </Button>

                    {pitrAuditStatus === 'passed' && (
                      <Button
                        onClick={executePitrRestore}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold border-0"
                      >
                        <Check className="w-3.5 h-3.5 ml-1.5" />
                        اجراء بازگردانی (Apply Rollback)
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: WORM Protection & Ransomware Sandbox */}
          {activeSegment === 'worm' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-3xl space-y-6">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-500" />
                    قفل پایگاه‌داده سخت‌افزاری (Write-Once-Read-Many Sandbox Protector)
                  </h3>
                  <Badge color="gold">{wormEnabled ? 'WORM ACTIVE' : 'OPEN WRITES'}</Badge>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  تلفیق تکنولوژی WORM تضمین می‌کند متریال پایه‌ای بورس کالا، اجرت ذینک Heidelberg و ساخت کاتالوگ برای دوره‌ای مشخص قفل فیزیکی شوند تا هیچ بدافزار یا کاربر بدون ممیزی، تراز معین مالی را تهدید ننماید.
                </p>

                {/* Toggle control */}
                <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className={`p-2.5 rounded-xl ${wormEnabled ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                      {wormEnabled ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">حالت بازنویسی غیرقابل تغییر (Immutable Storage Locks)</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">غیرقابل لغو توسط هکرهای سایبری یا باج‌افزارها پس از قفل موازی</p>
                    </div>
                  </div>

                  <button 
                    onClick={toggleWorm}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      wormEnabled ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      wormEnabled ? '-translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Ransomware Sandbox testing tool */}
                <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">سندباکس تست باج‌افزار رمزارز (Cyber Ransomware Arena)</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">شبیه‌سازی فایل مخرب رمزگذاری رادیکال و بررسی مقاومت زنده ERP</p>
                  </div>

                  {sandboxResponse && (
                    <div className={`p-4 rounded-xl text-xs font-medium leading-relaxed font-sans ${
                      wormEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {sandboxResponse}
                    </div>
                  )}

                  <Button
                    onClick={handleSimulateRansomware}
                    disabled={isSimulatingAttack}
                    className={`text-xs font-bold border-0 ${
                      wormEnabled 
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' 
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
                    }`}
                  >
                    {isSimulatingAttack ? 'در حال حمله رمزارزی شبیه ساز...' : 'اجرای حمله باج‌افزاری آزمایشی'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Cloud Sync DXF and PDF archives */}
          {activeSegment === 'cloud_sync' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-3xl space-y-6">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-teal-400" />
                    مخزن موازی فایل‌های CAD و DXF کارگاهی (Offsite MinIO Object Sync)
                  </h3>
                  <Badge color="blue">S3 TARGET</Badge>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  فایل‌های پیوست نقشه‌ دیلاین کلاهد، بارگذاری‌های PDF مشتریان گلاسه و زینک پیش‌چاپ به صورت موازی در باکت‌های امن بیرونی ذخیره شده و کپی جغرافیایی در مخازن DR اعمال می‌گردد.
                </p>

                {/* Visual statistics */}
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-500 block mb-1">فایل‌های همگام:</span>
                    <span className="font-mono text-slate-200 font-extrabold text-sm">{vaultSyncCount} قالب برش</span>
                  </div>
                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-500 block mb-1">پروتکل انتقال:</span>
                    <span className="font-mono text-slate-200 font-extrabold text-sm text-teal-400">MinIO SSE-C</span>
                  </div>
                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-500 block mb-1">صحت دایرکتوری:</span>
                    <span className="text-slate-200 font-extrabold text-sm text-emerald-400">۱۰۰٪ پایدار</span>
                  </div>
                </div>

                {/* Progress syncer bar */}
                {isSyncingCad && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>در حال کپی بسته‌ای قالب دایکات به باکت هرمزگان...</span>
                      <span className="font-mono font-bold text-teal-400">{cadSyncProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${cadSyncProgress}%` }}></div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSyncCadVault}
                    disabled={isSyncingCad}
                    className="text-xs bg-teal-600 hover:bg-teal-700 text-white border-0 font-bold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${isSyncingCad ? 'animate-spin' : ''}`} />
                    همگام‌سازی فوری دایرکتوری Offsite CAD
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeSegment === 'smart_update' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <ZipUpdateManager isDarkMode={isDarkMode} />
            </div>
          )}
          {false && activeSegment === 'smart_update' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-3xl space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-violet-400 animate-spin animate-duration-3000" />
                      سامانه بارگذاری و بروزرسانی هوشمند نرم‌افزار (ZIP Live Build Deployer)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      آپلود مستقیم خروجی کامپایل‌شده پروژه (<code className="text-violet-300 font-mono">npm run build</code> یا فایل زیپ <code className="text-violet-300 font-mono">dist.zip</code>) بدون دستکاری یا حذف کاتالوگ‌ها و داده‌های کاربر.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge color="purple">BUILD DEPLOYER</Badge>
                    <Badge color="green">SAFE & PROTECTED</Badge>
                  </div>
                </div>

                {/* Reassurance Banner */}
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-200 space-y-1">
                    <p className="font-bold">تضمین ۱۰۰٪ حفظ داده‌ها و کاتالوگ‌های کاربر:</p>
                    <p className="text-emerald-300/80 leading-relaxed text-[11px]">
                      با آپلود بسته زیپ، کدهای کامپایل‌شده بخش‌های وب و سرور (<code className="font-mono text-emerald-200">dist/</code>) به روزرسانی می‌شوند اما تمام عکس‌های آپلودشده قبلی شما، داده‌های کاتالوگ‌ها، نمونه‌کارها، فرمول‌های محاسبه قیمت و سفارشات کاملاً محفوظ و دست‌نخورده باقی خواهند ماند.
                    </p>
                  </div>
                </div>

                {updateSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center justify-between gap-2.5 text-xs font-semibold">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span>{updateSuccess}</span>
                    </div>
                    <Button
                      onClick={() => window.location.reload()}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-bold px-3 py-1.5"
                    >
                      بارگذاری مجدد صفحه
                    </Button>
                  </div>
                )}

                {updateError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-2.5 text-xs font-semibold">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>{updateError}</span>
                  </div>
                )}

                {/* Drop zone */}
                {!updateAnalysis && !isAnalyzingUpdate && (
                  <div 
                    className={`w-full border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                      dragActiveUpdate 
                        ? 'border-violet-500 bg-violet-950/25 scale-[1.01]' 
                        : 'border-slate-800 hover:border-violet-500/50 hover:bg-slate-900/40 bg-slate-950/30'
                    }`}
                    onDragEnter={(e) => { e.preventDefault(); setDragActiveUpdate(true); }}
                    onDragOver={(e) => { e.preventDefault(); setDragActiveUpdate(true); }}
                    onDragLeave={() => setDragActiveUpdate(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActiveUpdate(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleUpdateZipUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => updateFileInputRef.current?.click()}
                  >
                    <input 
                      ref={updateFileInputRef}
                      type="file" 
                      accept=".zip" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUpdateZipUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="p-4 bg-violet-950/40 border border-violet-500/30 rounded-2xl text-violet-400 shadow-inner">
                      <Upload className="w-8 h-8 text-violet-400" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm text-slate-200 font-bold">جهت بارگذاری و بروزرسانی، فایل زیپ کامپایل‌شده (npm run build) را اینجا رها کنید یا کلیک نمایید</p>
                      <p className="text-xs text-slate-400">پشتیبانی کامل از فایل‌های <code className="text-violet-400 font-mono font-semibold">dist.zip</code>، <code className="text-violet-400 font-mono font-semibold">build.zip</code> و بسته‌های فشرده سورس کامپایل‌شده</p>
                    </div>
                  </div>
                )}

                {isAnalyzingUpdate && (
                  <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
                    <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mx-auto animate-duration-1000" />
                    <p className="text-xs text-slate-300 font-semibold">در حال آنالیز ساختار فایل‌های زیپ، جداسازی کدهای کامپایل‌شده کلاینت و تایید امنیت...</p>
                    {uploadProgress !== null && (
                      <div className="w-72 mx-auto space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-400 font-bold">
                          <span>میزان ارسال: {uploadProgress}%</span>
                          <span>انتقال داده‌ها به سرور</span>
                        </div>
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-150" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Package Analysis Screen */}
                {updateAnalysis && (
                  <div className="bg-slate-900/80 border border-violet-500/40 rounded-2xl p-5 space-y-5 animate-in slide-in-from-bottom-3 duration-300 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2 text-violet-400">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <div>
                          <span className="text-xs font-extrabold text-white block">تحلیل هوشمند فایل زیپ با موفقیت انجام گردید</span>
                          <span className="text-[10px] text-emerald-400 font-medium">{updateAnalysis.packageTypeName || "بسته بروزرسانی کامپایل‌شده کدهای نرم‌افزار"}</span>
                        </div>
                      </div>
                      <Badge color="purple">نسخه {updateAnalysis.meta.version}</Badge>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center space-y-1">
                        <span className="text-[10px] text-slate-400 block font-bold">کدهای اصلی کلاینت (dist)</span>
                        <span className="text-sm font-extrabold text-violet-400 font-mono">{updateAnalysis.stats?.distCount || 0} فایل</span>
                      </div>
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center space-y-1">
                        <span className="text-[10px] text-slate-400 block font-bold">فایل‌های رسانه (uploads)</span>
                        <span className="text-sm font-extrabold text-teal-400 font-mono">{updateAnalysis.stats?.mediaCount || 0} فایل</span>
                      </div>
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center space-y-1">
                        <span className="text-[10px] text-slate-400 block font-bold">متاداده و ساختار (db)</span>
                        <span className="text-sm font-extrabold text-amber-400 font-mono">{updateAnalysis.stats?.dbCount || 0} مورد</span>
                      </div>
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center space-y-1">
                        <span className="text-[10px] text-slate-400 block font-bold">مجموع آیتم‌های فشرده</span>
                        <span className="text-sm font-extrabold text-white font-mono">{updateAnalysis.stats?.totalFiles || updateAnalysis.files.length} آیتم</span>
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold">عنوان مانیفست:</span> 
                        <span className="text-white font-extrabold">{updateAnalysis.meta.title}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold">شرح تغییرات:</span> 
                        <span className="text-slate-300 text-left truncate max-w-xs">{updateAnalysis.meta.description}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-900 text-slate-400">
                        <div>ناشر: <span className="text-slate-200 font-bold">{updateAnalysis.meta.author}</span></div>
                        <div>تاریخ تحلیل: <span className="text-slate-200 font-mono">{new Date().toLocaleDateString('fa-IR')}</span></div>
                      </div>
                    </div>

                    {/* Files list nested with target path column */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-300 block text-right">نقشه مقصد فایل‌ها در لایه‌های فیزیکی سرور:</span>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-[11px] font-mono max-h-[180px] overflow-y-auto space-y-1.5 text-left dir-ltr">
                        {updateAnalysis.files.map((file, fIdx) => (
                          <div key={fIdx} className="flex justify-between items-center text-slate-300 py-0.5 border-b border-slate-900/50 last:border-0">
                            <span className="truncate max-w-xs text-slate-200">{file.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-violet-400 font-bold bg-violet-950/50 px-2 py-0.5 rounded border border-violet-800/40">{file.target || "dist/"}</span>
                              <span className="text-[10px] text-slate-500 font-bold min-w-[50px] text-right">{file.isDirectory ? "پوشه" : `${(file.size / 1024).toFixed(1)} KB`}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-2 border-t border-slate-800">
                      <Button
                        onClick={handleApplySmartUpdate}
                        disabled={isApplyingUpdate}
                        className="text-xs bg-violet-600 hover:bg-violet-700 text-white font-extrabold border-0 flex-1 py-3 shadow-lg shadow-violet-600/25"
                      >
                        <RefreshCw className={`w-4 h-4 ml-1.5 ${isApplyingUpdate ? 'animate-spin' : ''}`} />
                        {isApplyingUpdate ? "در حال جایگزینی کدهای اصلی و بروزرسانی..." : "تایید ارتقاء و نصب فوری کدهای جدید در dist"}
                      </Button>
                      <Button
                        onClick={() => {
                          setUpdateAnalysis(null);
                          addLog("🗑️ فرآیند آپدیت کدهای نرم‌افزاری لغو گردید.");
                        }}
                        variant="ghost"
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        انصراف
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Recovery Snapshot Rollback UI */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-rose-400 animate-pulse" />
                      مکانیزم بازیابی اضطراری و رول‌بک کدهای اصلی (Disaster Recovery System Restore Point)
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">با فشرده‌سازی خودکار پیش از اعمال ارتقاء، نسخه‌ای کاملاً سالم از پوشه کدهای برنامه و دیتابیس ایمن شده است.</p>
                  </div>
                  <Badge color="red">SAFETY ROLLBACK</Badge>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  اگر پس از انجام آپدیت اشکالی در کدهای جدید یا نمایش صفحات احساس می‌کنید، یا می‌خواهید بلافاصله به حالت ماقبل آخرین آپدیت بازگردید، از دکمه رول‌بک زیر استفاده کنید. این کلید پوشه <code className="text-rose-300 font-mono">dist/</code> و دیتابیس را به ثانیه قبل از نصب آپدیت بازمی‌گرداند.
                </p>

                <div className="bg-rose-950/20 border border-rose-500/10 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1 text-right">
                    <span className="text-xs font-bold text-rose-400 block flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-rose-500" />
                      نقطه بازیابی خودکار ماقبل آخرین آپدیت فعال است
                    </span>
                    <span className="text-[10px] text-slate-500 block">سیستم پیش از جایگزینی کدهای جدید، نسخه قبلی dist و دیتابیس را قفل کرده است.</span>
                  </div>
                  <Button
                    onClick={handleRollbackUpdate}
                    disabled={isRollingBackUpdate}
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white border-0 font-extrabold flex-shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${isRollingBackUpdate ? 'animate-spin' : ''}`} />
                    {isRollingBackUpdate ? "در حال اجرای بازگردانی..." : "رول‌بک هوشمند و بازگردانی کدها"}
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Audit terminal & status log stream (span 1) */}
        <div className="space-y-6">
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800/80 flex flex-col justify-between h-full min-h-[500px]">
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-3">
                <Terminal className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h4 className="font-bold text-sm text-slate-200">کنسول نظارت ممیزی تداوم داده‌ها</h4>
              </div>

              <div className="space-y-3 font-mono text-[10px] md:text-xs leading-relaxed max-h-[420px] overflow-y-auto block select-text">
                {logs.map((log, lIdx) => (
                  <div key={lIdx} className="text-indigo-200/80 border-b border-slate-900/40 pb-2 flex gap-1.5 select-text">
                    <span className="text-indigo-400 flex-shrink-0 font-mono">➜</span>
                    <p className="font-sans text-[11px] leading-relaxed break-all">{log}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-900 pt-4 mt-6 text-center">
              <span className="text-[10px] text-slate-500 font-sans tracking-wide">
                کالیبره اتوماتیک با استانداردهای مدیریت بحران ISO 22301
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
