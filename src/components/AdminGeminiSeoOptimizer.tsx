import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  Play,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Link2,
  Tag,
  Search,
  Database,
  Activity,
  FileText,
  Layers,
  BookOpen,
  ArrowUpLeft,
  CalendarClock,
  ShieldCheck,
} from 'lucide-react';
import { apiPostJson, apiRequestJson } from '../utils/apiClient';
import { invalidateGeminiPublicMetaCache } from './SeoHead';
import { useContent } from '../contexts/ContentContext';

interface GeminiSeoConfig {
  enabled: boolean;
  intervalHours: number;
  batchSize: number;
  autoApplyToDatabase: boolean;
  includeCorePages: boolean;
  includeBlogPosts: boolean;
  includeCatalogs: boolean;
  siteBrand: string;
  targetAudience: string;
}

interface GeminiSeoInternalLink {
  anchorText: string;
  targetPath: string;
  reason: string;
}

interface GeminiSeoRecord {
  pageId: string;
  path: string;
  pageType: 'core' | 'blog' | 'catalog' | 'custom';
  sourceTitle: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  keywords: string[];
  internalLinks: GeminiSeoInternalLink[];
  seoScore: number;
  summaryNote: string;
  model: string;
  optimizedAt: string;
  appliedToDb: boolean;
}

interface GeminiSeoPageItem {
  pageId: string;
  path: string;
  pageType: 'core' | 'blog' | 'catalog' | 'custom';
  sourceTitle: string;
  wordCount: number;
  optimization: GeminiSeoRecord | null;
}

interface GeminiSeoRunLog {
  at: string;
  atShamsi?: string;
  source: string;
  processedCount: number;
  appliedCount: number;
  errorCount: number;
  summary: string;
  errorDetail?: string;
}

interface GeminiSeoStatusPayload {
  ok?: boolean;
  geminiConfigured: boolean;
  model: string;
  cronActive: boolean;
  isRunning: boolean;
  config: GeminiSeoConfig;
  state: {
    lastRunAt: string | null;
    totalPagesOptimized: number;
    totalCronRuns: number;
    lastError: string | null;
    recentLogs: GeminiSeoRunLog[];
  };
  nextRunAt: string;
  stats: {
    totalScannablePages: number;
    optimizedPagesCount: number;
    pendingPagesCount: number;
    averageSeoScore: number | null;
    totalInternalLinksSuggested: number;
  };
  pages: GeminiSeoPageItem[];
  error?: string;
}

const INTERVAL_OPTIONS = [
  { value: 1, label: 'هر ۱ ساعت' },
  { value: 6, label: 'هر ۶ ساعت' },
  { value: 12, label: 'هر ۱۲ ساعت' },
  { value: 24, label: 'روزانه (هر ۲۴ ساعت)' },
  { value: 72, label: 'هر ۳ روز یک‌بار' },
  { value: 168, label: 'هفتگی (هر ۷ روز)' },
];

const formatRelative = (iso?: string | null): string => {
  if (!iso) return 'هنوز اجرا نشده';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return 'نامشخص';
  const diffMin = Math.round((ts - Date.now()) / 60000);
  if (Math.abs(diffMin) < 2) return 'اکنون / آماده اجرا';
  if (diffMin > 0) {
    if (diffMin < 60) return `تا ${diffMin} دقیقه دیگر`;
    const hrs = Math.round(diffMin / 60);
    if (hrs < 48) return `تا ${hrs} ساعت دیگر`;
    return `تا ${Math.round(hrs / 24)} روز دیگر`;
  }
  const agoMin = Math.abs(diffMin);
  if (agoMin < 60) return `${agoMin} دقیقه پیش`;
  const agoHrs = Math.round(agoMin / 60);
  if (agoHrs < 48) return `${agoHrs} ساعت پیش`;
  return `${Math.round(agoHrs / 24)} روز پیش`;
};

const pageTypeBadge = (type: string) => {
  switch (type) {
    case 'blog':
      return { label: 'مقاله وبلاگ', cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', icon: FileText };
    case 'catalog':
      return { label: 'کاتالوگ', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: BookOpen };
    default:
      return { label: 'صفحه اصلی سایت', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', icon: Layers };
  }
};

export const AdminGeminiSeoOptimizer: React.FC = () => {
  const { refreshPosts } = useContent();
  const [status, setStatus] = useState<GeminiSeoStatusPayload | null>(null);
  const [form, setForm] = useState<GeminiSeoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningBatch, setRunningBatch] = useState(false);
  const [runningPageId, setRunningPageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'core' | 'blog' | 'catalog' | 'optimized' | 'pending'>('all');
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { res, data } = await apiRequestJson<GeminiSeoStatusPayload>(
        'seo/gemini-optimizer/status',
        { method: 'GET' },
        15000
      );
      if (res.ok && data) {
        setStatus(data);
        setForm(data.config);
      } else {
        setNotice({ type: 'err', text: data?.error || 'خطا در دریافت وضعیت سرویس سئو Gemini.' });
      }
    } catch {
      setNotice({ type: 'err', text: 'ارتباط با سرور برای دریافت وضعیت بهینه‌ساز سئو برقرار نشد.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSaveConfig = async () => {
    if (!form) return;
    setSaving(true);
    setNotice(null);
    try {
      const { res, data } = await apiPostJson<{
        ok?: boolean;
        message?: string;
        error?: string;
        status?: GeminiSeoStatusPayload;
      }>('seo/gemini-optimizer/config', form, 20000);
      if (res.ok && data?.status) {
        setStatus(data.status);
        setForm(data.status.config);
        setNotice({ type: 'ok', text: data.message || 'تنظیمات زمان‌بندی ذخیره شد.' });
      } else {
        setNotice({ type: 'err', text: data?.error || 'ذخیره تنظیمات ناموفق بود.' });
      }
    } catch {
      setNotice({ type: 'err', text: 'خطا در ارسال تنظیمات به سرور.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRunOptimizer = async (pageId?: string) => {
    if (pageId) setRunningPageId(pageId);
    else setRunningBatch(true);
    setNotice(null);
    try {
      const { res, data } = await apiPostJson<{
        ok?: boolean;
        summary?: string;
        error?: string;
        status?: GeminiSeoStatusPayload;
      }>('seo/gemini-optimizer/run', pageId ? { pageId } : {}, 120000);

      if (data?.status) {
        setStatus(data.status);
        setForm(data.status.config);
      }
      if (res.ok && data?.ok) {
        invalidateGeminiPublicMetaCache();
        await refreshPosts();
        setNotice({ type: 'ok', text: data.summary || 'بهینه‌سازی سئو با Gemini انجام شد و در دیتابیس ذخیره گردید.' });
      } else {
        setNotice({ type: 'err', text: data?.error || 'اجرای بهینه‌سازی سئو با خطا مواجه شد.' });
      }
    } catch {
      setNotice({ type: 'err', text: 'خطا در ارتباط با سرور هنگام اجرای تحلیل Gemini.' });
    } finally {
      setRunningBatch(false);
      setRunningPageId(null);
    }
  };

  const filteredPages = useMemo(() => {
    if (!status) return [];
    const q = searchQuery.trim().toLowerCase();
    return status.pages.filter((p) => {
      if (typeFilter === 'core' && p.pageType !== 'core') return false;
      if (typeFilter === 'blog' && p.pageType !== 'blog') return false;
      if (typeFilter === 'catalog' && p.pageType !== 'catalog') return false;
      if (typeFilter === 'optimized' && !p.optimization) return false;
      if (typeFilter === 'pending' && p.optimization) return false;
      if (!q) return true;
      return (
        p.sourceTitle.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) ||
        (p.optimization?.metaTitle || '').toLowerCase().includes(q) ||
        (p.optimization?.keywords || []).some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [status, searchQuery, typeFilter]);

  if (loading && !status) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-300">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-amber-400" />
        <p className="text-sm font-bold">در حال بارگذاری سرویس پس‌زمینه بهینه‌سازی سئو با Gemini...</p>
      </div>
    );
  }

  if (!status || !form) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-sm">
        امکان بارگذاری اطلاعات سرویس بهینه‌ساز سئو Gemini فراهم نشد.
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl text-right">
      {/* Header & KPI Banner */}
      <div className="rounded-3xl bg-gradient-to-l from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-base sm:text-lg font-black text-white">
                  سرویس پس‌زمینه دوره‌ای بهینه‌سازی سئو با هوش مصنوعی Gemini
                </h2>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    form.enabled
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {form.enabled ? 'کرون پس‌زمینه فعال' : 'زمان‌بند متوقف'}
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {status.model}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                این سرویس به‌صورت دوره‌ای محتوای متنی صفحات اصلی، کاتالوگ‌ها و مقالات وبلاگ را بررسی کرده و با استفاده از Gemini، عنوان سئو، متادیسکریپشن، کلمات کلیدی هدف و لینک‌های داخلی پیشنهادی را تولید و مستقیماً در دیتابیس سایت بهینه می‌کند.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchStatus}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              بروزرسانی
            </button>
            <button
              type="button"
              onClick={() => handleRunOptimizer()}
              disabled={runningBatch || runningPageId !== null}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 cursor-pointer"
            >
              {runningBatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {runningBatch
                ? `در حال تحلیل ${form.batchSize} صفحه با Gemini...`
                : `اجرای فوری اسکن (${form.batchSize} صفحه)`}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="rounded-2xl bg-slate-950/75 border border-slate-800 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>صفحات بهینه‌سازی‌شده</span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white tabular-nums">
              {status.stats.optimizedPagesCount}{' '}
              <span className="text-xs font-medium text-slate-400">از {status.stats.totalScannablePages}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {status.stats.pendingPagesCount} صفحه در صف تحلیل بعدی
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/75 border border-slate-800 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>میانگین امتیاز سئو</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-300 tabular-nums">
              {status.stats.averageSeoScore !== null ? `${status.stats.averageSeoScore}/100` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">ارزیابی کیفیت متادیتا و ساختار محتوا</div>
          </div>

          <div className="rounded-2xl bg-slate-950/75 border border-slate-800 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>لینک‌های داخلی پیشنهادی</span>
              <Link2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-300 tabular-nums">
              {status.stats.totalInternalLinksSuggested}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">متصل به مسیرهای واقعی سایت</div>
          </div>

          <div className="rounded-2xl bg-slate-950/75 border border-slate-800 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>چرخه دوره‌ای بعدی (Cron)</span>
              <CalendarClock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-base font-black text-indigo-300 mt-1">
              {form.enabled ? formatRelative(status.nextRunAt) : 'متوقف شده'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              آخرین اجرا: {formatRelative(status.state.lastRunAt)}
            </div>
          </div>
        </div>

        {!status.geminiConfigured && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              سرویس سمت سرور به متغیر محیطی <code dir="ltr" className="font-mono">GEMINI_API_KEY</code> نیاز دارد تا اسکن‌های دوره‌ای هوش مصنوعی اجرا شوند.
            </span>
          </div>
        )}

        {notice && (
          <div
            className={`mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
              notice.type === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {notice.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}
      </div>

      {/* Cron Schedule & Scope Configuration */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-black text-white">تنظیمات زمان‌بندی Cron و محدوده اسکن صفحات</h3>
          </div>
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            ذخیره تنظیمات کرون
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="flex items-start justify-between gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-slate-100">فعال‌سازی سرویس دوره‌ای</div>
              <div className="text-[11px] text-slate-400 mt-0.5">اجرای خودکار در پس‌زمینه</div>
            </div>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="mt-1 w-4 h-4 accent-indigo-500"
            />
          </label>

          <label className="flex items-start justify-between gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-slate-100">اعمال مستقیم در دیتابیس</div>
              <div className="text-[11px] text-slate-400 mt-0.5">ذخیره متاتگ‌ها و تگ‌های مقالات و صفحات</div>
            </div>
            <input
              type="checkbox"
              checked={form.autoApplyToDatabase}
              onChange={(e) => setForm({ ...form, autoApplyToDatabase: e.target.checked })}
              className="mt-1 w-4 h-4 accent-emerald-500"
            />
          </label>

          <label className="flex items-start justify-between gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-slate-100">صفحات اصلی سایت</div>
              <div className="text-[11px] text-slate-400 mt-0.5">خانه، خدمات، محصولات و ابزارها</div>
            </div>
            <input
              type="checkbox"
              checked={form.includeCorePages}
              onChange={(e) => setForm({ ...form, includeCorePages: e.target.checked })}
              className="mt-1 w-4 h-4 accent-cyan-500"
            />
          </label>

          <label className="flex items-start justify-between gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-slate-100">مقالات وبلاگ</div>
              <div className="text-[11px] text-slate-400 mt-0.5">تمامی مقالات منتشرشده</div>
            </div>
            <input
              type="checkbox"
              checked={form.includeBlogPosts}
              onChange={(e) => setForm({ ...form, includeBlogPosts: e.target.checked })}
              className="mt-1 w-4 h-4 accent-indigo-500"
            />
          </label>

          <label className="flex items-start justify-between gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-slate-100">صفحات کاتالوگ</div>
              <div className="text-[11px] text-slate-400 mt-0.5">کاتالوگ‌های فنی منتشرشده</div>
            </div>
            <input
              type="checkbox"
              checked={form.includeCatalogs}
              onChange={(e) => setForm({ ...form, includeCatalogs: e.target.checked })}
              className="mt-1 w-4 h-4 accent-amber-500"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">بازه اجرای دوره‌ای (Cron)</label>
            <select
              value={form.intervalHours}
              onChange={(e) => setForm({ ...form, intervalHours: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            >
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">تعداد صفحه در هر نوبت</label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.batchSize}
              onChange={(e) =>
                setForm({ ...form, batchSize: Math.max(1, Math.min(10, Number(e.target.value) || 3)) })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">مخاطب هدف سئو (راهنمای تحلیل Gemini)</label>
            <input
              type="text"
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Pages SEO Database Results & Internal Links Inspector */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-white">
              خروجی بهینه‌سازی صفحات، کلمات کلیدی، متادیسکریپشن و لینک‌های داخلی پیشنهادی
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              هر صفحه را می‌توانید به‌صورت تکی هم فوراً با Gemini تحلیل و در دیتابیس به‌روزرسانی کنید.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی مسیر، عنوان یا کلیدواژه..."
                className="bg-slate-950 border border-slate-700 rounded-xl pr-3 pl-8 py-1.5 text-xs text-slate-100 w-56 focus:outline-none focus:border-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">همه صفحات ({status.pages.length})</option>
              <option value="optimized">بهینه‌سازی‌شده ({status.stats.optimizedPagesCount})</option>
              <option value="pending">در انتظار تحلیل ({status.stats.pendingPagesCount})</option>
              <option value="core">صفحات اصلی</option>
              <option value="blog">مقالات وبلاگ</option>
              <option value="catalog">کاتالوگ‌ها</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredPages.map((page) => {
            const badge = pageTypeBadge(page.pageType);
            const BadgeIcon = badge.icon;
            const opt = page.optimization;
            const isPageRunning = runningPageId === page.pageId;

            return (
              <div
                key={page.pageId}
                className="rounded-2xl bg-slate-950/75 border border-slate-800 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${badge.cls}`}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                      <code dir="ltr" className="text-[11px] font-mono text-amber-300 bg-slate-900 px-2 py-0.5 rounded">
                        {page.path}
                      </code>
                      {opt ? (
                        <>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            امتیاز سئو: {opt.seoScore}/100
                          </span>
                          {opt.appliedToDb && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              ذخیره‌شده در دیتابیس
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          در انتظار تحلیل Gemini
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-black text-white">{page.sourceTitle}</h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRunOptimizer(page.pageId)}
                    disabled={runningBatch || runningPageId !== null}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isPageRunning ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{opt ? 'بازتحلیل با Gemini' : 'بهینه‌سازی با Gemini'}</span>
                  </button>
                </div>

                {opt && (
                  <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                    {/* Meta Title, Description & Keywords */}
                    <div className="lg:col-span-7 space-y-2.5">
                      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400">Meta Title پیشنهادی (نتیجه گوگل):</div>
                        <div className="text-sm font-extrabold text-sky-300">{opt.metaTitle}</div>
                        <div className="text-[10px] font-bold text-slate-400 pt-1">Meta Description بهینه‌شده:</div>
                        <p className="text-xs text-slate-300 leading-relaxed">{opt.metaDescription}</p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                          <Tag className="w-3.5 h-3.5 text-amber-400" />
                          <span>کلمات کلیدی استخراج‌شده:</span>
                          {opt.focusKeyword && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black">
                              کلیدواژه اصلی: {opt.focusKeyword}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {opt.keywords.map((kw) => (
                            <span
                              key={kw}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {opt.summaryNote && (
                        <div className="text-[11px] text-emerald-300/90 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2">
                          نکته بهینه‌سازی: {opt.summaryNote}
                        </div>
                      )}
                    </div>

                    {/* Suggested Internal Links */}
                    <div className="lg:col-span-5 rounded-xl bg-slate-900/80 border border-slate-800 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black text-cyan-300">
                        <span className="flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5" />
                          لینک‌های داخلی پیشنهادی ({opt.internalLinks.length})
                        </span>
                        <span className="text-[10px] font-normal text-slate-500">
                          {formatRelative(opt.optimizedAt)}
                        </span>
                      </div>

                      {opt.internalLinks.length === 0 ? (
                        <div className="text-[11px] text-slate-500 py-2">
                          لینک داخلی جدیدی برای این صفحه ثبت نشده است.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {opt.internalLinks.map((lnk, idx) => (
                            <div
                              key={`${lnk.targetPath}-${idx}`}
                              className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-100 text-[11px]">«{lnk.anchorText}»</span>
                                <a
                                  href={lnk.targetPath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  dir="ltr"
                                  className="text-[10px] font-mono text-cyan-300 hover:underline flex items-center gap-0.5 shrink-0"
                                >
                                  <span>{lnk.targetPath}</span>
                                  <ArrowUpLeft className="w-3 h-3" />
                                </a>
                              </div>
                              {lnk.reason && <p className="text-[10.5px] text-slate-400 leading-relaxed">{lnk.reason}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cron Execution Logs */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Activity className="w-4 h-4 text-indigo-400" />
            گزارش اجراهای پس‌زمینه (Cron Log)
          </div>
          <span className="text-[11px] text-slate-400">
            کل صفحات تحلیل‌شده: {status.state.totalPagesOptimized} | اجراهای خودکار Cron: {status.state.totalCronRuns}
          </span>
        </div>

        {status.state.recentLogs.length === 0 ? (
          <div className="text-xs text-slate-500 bg-slate-950/60 border border-slate-800 rounded-2xl p-5 text-center">
            هنوز چرخه‌ای اجرا نشده است. روی «اجرای فوری اسکن» یا دکمه «بهینه‌سازی با Gemini» کنار هر صفحه کلیک کنید.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {status.state.recentLogs.map((log, i) => (
              <div
                key={`${log.at}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      log.source === 'cron_background'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {log.source === 'cron_background'
                      ? 'اجرای خودکار Cron'
                      : log.source === 'single_page'
                        ? 'تحلیل تکی صفحه'
                        : 'اجرای دستی مدیر'}
                  </span>
                  <span className="text-slate-200 font-medium">{log.summary}</span>
                </div>
                <span className="text-[11px] text-slate-500 shrink-0">{log.atShamsi || formatRelative(log.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
