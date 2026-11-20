import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCode2,
  FileText,
  Globe,
  KeyRound,
  Play,
  Plus,
  RefreshCw,
  Rss,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Wand2,
  Zap,
} from 'lucide-react';
import { apiPostJson, apiRequestJson } from '../utils/apiClient';
import { useContent } from '../contexts/ContentContext';
import { AdminGeminiSeoOptimizer } from './AdminGeminiSeoOptimizer';

interface AutopilotConfig {
  enabled: boolean;
  siteBaseUrl: string;
  brandName: string;
  brandTagline: string;
  cronToken: string;
  indexNowKey: string;
  smartPseudoCron: boolean;
  articleScheduleHours: number;
  seoAuditScheduleHours: number;
  promoteScheduleHours: number;
  publishMode: 'published' | 'draft';
  maxArticlesPerWeek: number;
  autoFixSeoMeta: boolean;
  enableIndexNow: boolean;
  enableRssFeed: boolean;
  enableLlmsTxt: boolean;
  enableRobotsMaintenance: boolean;
  customTopics: string[];
  focusKeywords: string[];
  optionalAiEndpoint?: string;
  optionalAiModel?: string;
  hasOptionalAiKey?: boolean;
}

interface LogEntry {
  at: string;
  atShamsi?: string;
  source: 'cron_cli' | 'cron_http' | 'smart_tick' | 'admin_manual' | string;
  tasks: string[];
  durationMs: number;
  summary: string;
}

interface AutopilotStatus {
  config: AutopilotConfig;
  state: {
    lastRunAt: string | null;
    lastArticleAt: string | null;
    lastAuditAt: string | null;
    lastPromoteAt: string | null;
    lastRealCronAt: string | null;
    lastPseudoCronAt: string | null;
    detectedCronMode: 'cpanel_cron' | 'smart_pseudo_cron' | 'manual_only';
    totalArticlesGenerated: number;
    totalAuditsRun: number;
    totalPingsSent: number;
    totalMetaFixes: number;
    lastIndexNowStatus: string | null;
    recentLogs: LogEntry[];
  };
  nextDue: {
    articleAt: string;
    auditAt: string;
    promoteAt: string;
  };
  stats: {
    publishedPosts: number;
    draftPosts: number;
    weeklyAutoPosts: number;
    seoScore: number | null;
    sitemapUrlCount: number | null;
    issuesCount: number;
  };
  files: {
    sitemap: { exists: boolean; url: string };
    rss: { exists: boolean; url: string };
    llms: { exists: boolean; url: string };
    robots: { exists: boolean; url: string };
  };
  cron: {
    recommendedSchedule: string;
    cliCommand: string;
    curlCommand: string;
    webhookUrl: string;
    runtime: string;
    phpVersion?: string;
    hasCurl?: boolean;
    rootWritable?: boolean;
  };
}

const SCHEDULE_OPTIONS = [
  { value: 6, label: 'هر ۶ ساعت' },
  { value: 12, label: 'هر ۱۲ ساعت' },
  { value: 24, label: 'روزانه (هر ۲۴ ساعت)' },
  { value: 48, label: 'هر ۲ روز یک‌بار (پیشنهادی)' },
  { value: 72, label: 'هر ۳ روز یک‌بار' },
  { value: 168, label: 'هفتگی (هر ۷ روز)' },
];

const formatRelativeTime = (iso: string | null | undefined): string => {
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

const sourceLabel = (src: string): { text: string; cls: string } => {
  switch (src) {
    case 'cron_cli':
      return { text: 'کرون cPanel (CLI)', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
    case 'cron_http':
      return { text: 'کرون cPanel (Webhook)', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
    case 'smart_tick':
      return { text: 'کرون هوشمند خودکار', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
    default:
      return { text: 'اجرای دستی مدیر', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
  }
};

export const AdminSeoAutopilot: React.FC = () => {
  const { refreshPosts } = useContent();
  const [activeSubTab, setActiveSubTab] = useState<'gemini_cron' | 'php_autopilot'>('gemini_cron');
  const [data, setData] = useState<AutopilotStatus | null>(null);
  const [form, setForm] = useState<AutopilotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [instantTopic, setInstantTopic] = useState('');
  const [newQueueTopic, setNewQueueTopic] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { res, data: payload } = await apiRequestJson<AutopilotStatus & { error?: string }>('seo/autopilot/status', { method: 'GET' }, 15000);
      if (res.ok && payload) {
        setData(payload);
        setForm(payload.config);
      } else {
        setNotice({ type: 'err', text: payload?.error || 'خطا در دریافت وضعیت ماژول زمان‌بند سئو.' });
      }
    } catch {
      setNotice({ type: 'err', text: 'ارتباط با سرور برای دریافت وضعیت ماژول برقرار نشد.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2200);
    } catch {}
  };

  const handleSaveConfig = async (extra?: Record<string, unknown>) => {
    if (!form) return;
    setSaving(true);
    setNotice(null);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        ...(extra || {}),
      };
      const { res, data: resp } = await apiPostJson<{ ok?: boolean; message?: string; status?: AutopilotStatus; error?: string }>(
        'seo/autopilot/config',
        payload,
        20000
      );
      if (res.ok && resp?.status) {
        setData(resp.status);
        setForm(resp.status.config);
        setNotice({ type: 'ok', text: resp.message || 'تنظیمات با موفقیت ذخیره شد.' });
      } else {
        setNotice({ type: 'err', text: resp?.error || 'ذخیره تنظیمات با خطا مواجه شد.' });
      }
    } catch {
      setNotice({ type: 'err', text: 'خطا در ارسال تنظیمات به سرور.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRunTask = async (task: 'all' | 'article' | 'audit' | 'promote') => {
    setRunningTask(task);
    setNotice(null);
    try {
      const { res, data: resp } = await apiPostJson<{
        ok?: boolean;
        summary?: string;
        error?: string;
        post?: { title?: string; status?: string };
        status?: AutopilotStatus;
      }>(
        'seo/autopilot/run',
        {
          task,
          topic: task === 'article' || task === 'all' ? instantTopic.trim() || undefined : undefined,
        },
        90000
      );
      if (res.ok && resp?.ok) {
        if (resp.status) {
          setData(resp.status);
          setForm(resp.status.config);
        } else {
          await fetchStatus();
        }
        if (task === 'article' || task === 'all' || task === 'audit') {
          await refreshPosts();
        }
        if (task === 'article' || task === 'all') {
          setInstantTopic('');
        }
        setNotice({
          type: 'ok',
          text: resp.summary || 'عملیات با موفقیت انجام شد.',
        });
      } else {
        setNotice({
          type: 'err',
          text: resp?.error || 'اجرای عملیات با خطا مواجه شد.',
        });
      }
    } catch {
      setNotice({ type: 'err', text: 'خطا در ارتباط با سرور هنگام اجرا.' });
    } finally {
      setRunningTask(null);
    }
  };

  const addCustomTopic = () => {
    const t = newQueueTopic.trim();
    if (!t || !form) return;
    if (!form.customTopics.includes(t)) {
      setForm({ ...form, customTopics: [...form.customTopics, t] });
    }
    setNewQueueTopic('');
  };

  const removeCustomTopic = (topic: string) => {
    if (!form) return;
    setForm({ ...form, customTopics: form.customTopics.filter((x) => x !== topic) });
  };

  const addKeyword = () => {
    const k = newKeyword.trim();
    if (!k || !form) return;
    if (!form.focusKeywords.includes(k)) {
      setForm({ ...form, focusKeywords: [...form.focusKeywords, k] });
    }
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) => {
    if (!form || form.focusKeywords.length <= 1) return;
    setForm({ ...form, focusKeywords: form.focusKeywords.filter((x) => x !== kw) });
  };

  if (loading && !data) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-300">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-emerald-400" />
        <p className="text-sm font-bold">در حال بارگذاری ماژول زمان‌بند سئو و انتشار مقاله...</p>
      </div>
    );
  }

  if (!data || !form) {
    return (
      <div className="p-6 rounded-2xl bg-red-950/30 border border-red-500/30 text-red-200 text-sm">
        امکان بارگذاری اطلاعات ماژول وجود ندارد.
        <button
          type="button"
          onClick={fetchStatus}
          className="mr-3 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  const cronBadge =
    data.state.detectedCronMode === 'cpanel_cron'
      ? {
          label: 'کرون واقعی cPanel فعال',
          cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          desc: 'وظایف دقیقاً سر ساعت توسط Cron Job هاست PHP اجرا می‌شوند.',
        }
      : data.state.detectedCronMode === 'smart_pseudo_cron'
        ? {
            label: 'کرون هوشمند خودکار فعال',
            cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
            desc: 'بدون نیاز به تنظیم دستی کرون، وظایف سررسیدشده در پس‌زمینه سایت اجرا می‌شوند (و در صورت نصب Cron cPanel، خودکار سوئیچ می‌کند).',
          }
        : {
            label: 'حالت دستی',
            cls: 'bg-slate-700/50 text-slate-300 border-slate-600',
            desc: 'فقط با کلیک مدیر یا فراخوانی کرون cPanel اجرا می‌شود.',
          };

  const modeSwitcher = (
    <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 w-fit">
      <button
        type="button"
        onClick={() => setActiveSubTab('gemini_cron')}
        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-colors cursor-pointer ${
          activeSubTab === 'gemini_cron'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>بهینه‌ساز دوره‌ای سئو صفحات با Gemini AI (Cron)</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveSubTab('php_autopilot')}
        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-colors cursor-pointer ${
          activeSubTab === 'php_autopilot'
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Bot className="w-4 h-4" />
        <span>تولید خودکار مقاله و کرون PHP cPanel</span>
      </button>
    </div>
  );

  if (activeSubTab === 'gemini_cron') {
    return (
      <div className="space-y-5 dir-rtl text-right">
        {modeSwitcher}
        <AdminGeminiSeoOptimizer />
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl text-right">
      {modeSwitcher}
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-l from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg font-black text-white">ماژول زمان‌بند خودکار سئو، معرفی سایت و انتشار مقاله</h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  ۱۰۰٪ PHP خالص (بدون Node.js)
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cronBadge.cls}`}>
                  {cronBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                {cronBadge.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchStatus}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              بروزرسانی وضعیت
            </button>
            <button
              type="button"
              onClick={() => handleRunTask('all')}
              disabled={runningTask !== null}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              {runningTask === 'all' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              اجرای کامل چرخه اکنون
            </button>
          </div>
        </div>

        {/* Live KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>امتیاز سلامت سئو</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {data.stats.seoScore !== null ? `${data.stats.seoScore}/100` : 'آماده ممیزی'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {data.state.totalMetaFixes} اصلاح خودکار متاتگ و اسکیما
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>مقالات سایت</span>
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {data.stats.publishedPosts} <span className="text-xs font-medium text-slate-400">منتشرشده</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {data.stats.draftPosts} پیش‌نویس | {data.stats.weeklyAutoPosts}/{form.maxArticlesPerWeek} سهمیه این هفته
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>معرفی و ایندکس</span>
              <Globe className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-300">
              {data.stats.sitemapUrlCount ?? '—'} <span className="text-xs font-medium text-slate-400">آدرس</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate" title={data.state.lastIndexNowStatus || ''}>
              {data.state.lastIndexNowStatus || `${data.state.totalPingsSent} بار بروزرسانی خزنده‌ها`}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>مقاله خودکار بعدی</span>
              <CalendarClock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-base font-black text-indigo-300 mt-1">
              {form.enabled ? formatRelativeTime(data.nextDue.articleAt) : 'متوقف شده'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              آخرین اجرا: {formatRelativeTime(data.state.lastRunAt)}
            </div>
          </div>
        </div>

        {notice && (
          <div
            className={`mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
              notice.type === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {notice.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{notice.text}</span>
          </div>
        )}
      </div>

      {/* Quick Actions & Discovery Files */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Zap className="w-4 h-4 text-amber-400" />
            اجرای فوری وظایف پس‌زمینه (بدون انتظار برای زمان‌بندی)
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={instantTopic}
              onChange={(e) => setInstantTopic(e.target.value)}
              placeholder="موضوع دلخواه مقاله (خالی بگذارید تا هوشمندانه از صف یا بانک تخصصی چاپ و بسته‌بندی انتخاب شود)..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleRunTask('article')}
              disabled={runningTask !== null}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-black flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              {runningTask === 'article' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              تولید و انتشار ۱ مقاله جدید
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleRunTask('audit')}
              disabled={runningTask !== null}
              className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 text-right flex items-center justify-between gap-3 transition-colors cursor-pointer disabled:opacity-60"
            >
              <div>
                <div className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-emerald-400" />
                  ممیزی و بهسازی خودکار سئو
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  تکمیل خودکار متاتگ‌ها، نامک (Slug)، اسکیما JSON-LD و امتیازدهی صفحات
                </div>
              </div>
              {runningTask === 'audit' && <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleRunTask('promote')}
              disabled={runningTask !== null}
              className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 text-right flex items-center justify-between gap-3 transition-colors cursor-pointer disabled:opacity-60"
            >
              <div>
                <div className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-amber-400" />
                  معرفی سایت و پینگ موتورهای جستجو
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  بازسازی sitemap.xml، rss.xml، llms.txt، robots.txt و ارسال IndexNow
                </div>
              </div>
              {runningTask === 'promote' && <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Live Discovery Files */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <FileCode2 className="w-4 h-4 text-cyan-400" />
            فایل‌های معرفی سایت در روت هاست
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            این فایل‌ها به صورت خودکار توسط PHP در روت سایت تولید و با انتشار هر مقاله به‌روزرسانی می‌شوند:
          </p>
          <div className="space-y-2">
            {[
              { key: 'sitemap', label: 'Sitemap.xml (نقشه سایت گوگل)', icon: Globe, info: data.files.sitemap },
              { key: 'rss', label: 'RSS.xml (خوراک مقالات)', icon: Rss, info: data.files.rss },
              { key: 'llms', label: 'llms.txt (معرفی به موتورهای AI)', icon: Bot, info: data.files.llms },
              { key: 'robots', label: 'robots.txt (راهنمای خزنده‌ها)', icon: ShieldCheck, info: data.files.robots },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${item.info.exists ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-bold text-slate-200 truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.info.exists
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {item.info.exists ? 'فعال' : 'ساخته نشده'}
                    </span>
                    {item.info.exists && (
                      <a
                        href={item.info.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white"
                        title="مشاهده فایل"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Configuration & Scheduling Panel */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black text-white">تنظیمات زمان‌بندی، سئو خودکار و صف موضوعات</h3>
          </div>
          <button
            type="button"
            onClick={() => handleSaveConfig()}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره تنظیمات
          </button>
        </div>

        {/* Core Switches */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              key: 'enabled' as const,
              title: 'فعال‌سازی زمان‌بند خودکار',
              desc: 'اجرای دوره‌ای تولید مقاله، بهسازی سئو و معرفی سایت',
            },
            {
              key: 'smartPseudoCron' as const,
              title: 'کرون هوشمند خودکار (بدون نیاز به cPanel Cron)',
              desc: 'اگر کرون cPanel تنظیم نشده باشد، با ترافیک سایت بدون کندی اجرا می‌شود',
            },
            {
              key: 'autoFixSeoMeta' as const,
              title: 'اصلاح خودکار متاتگ و اسکیما مقالات',
              desc: 'تکمیل خودکار Slug، Meta Title، توضیحات متا و JSON-LD مقالات ناقص',
            },
            {
              key: 'enableIndexNow' as const,
              title: 'ارسال خودکار IndexNow',
              desc: 'اطلاع‌رسانی آنی صفحات و مقالات جدید به Bing و Yandex',
            },
            {
              key: 'enableRssFeed' as const,
              title: 'تولید و بروزرسانی فید RSS.xml',
              desc: 'خوراک استاندارد مقالات برای موتورهای جستجو و خبرخوان‌ها',
            },
            {
              key: 'enableLlmsTxt' as const,
              title: 'معرفی ساختاریافته سایت (llms.txt)',
              desc: 'دایرکتوری متنی معرفی خدمات، ابزارها و مقالات برای موتورهای جستجو و هوش مصنوعی',
            },
          ].map((sw) => (
            <label
              key={sw.key}
              className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700"
            >
              <div>
                <div className="text-xs font-bold text-slate-100">{sw.title}</div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{sw.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(form[sw.key])}
                onChange={(e) => setForm({ ...form, [sw.key]: e.target.checked })}
                className="mt-1 w-4 h-4 accent-emerald-500 shrink-0"
              />
            </label>
          ))}
        </div>

        {/* Schedule & Site Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">بازه تولید مقاله جدید</label>
            <select
              value={form.articleScheduleHours}
              onChange={(e) => setForm({ ...form, articleScheduleHours: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            >
              {SCHEDULE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">بازه ممیزی سئو و معرفی سایت</label>
            <select
              value={form.seoAuditScheduleHours}
              onChange={(e) => {
                const v = Number(e.target.value);
                setForm({ ...form, seoAuditScheduleHours: v, promoteScheduleHours: v });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            >
              {SCHEDULE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">وضعیت انتشار مقالات خودکار</label>
            <select
              value={form.publishMode}
              onChange={(e) => setForm({ ...form, publishMode: e.target.value as 'published' | 'draft' })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            >
              <option value="published">انتشار خودکار مستقیم در وبلاگ</option>
              <option value="draft">ذخیره به عنوان پیش‌نویس برای تایید مدیر</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">سقف انتشار هفتگی (ضداسپم)</label>
            <input
              type="number"
              min={1}
              max={21}
              value={form.maxArticlesPerWeek}
              onChange={(e) => setForm({ ...form, maxArticlesPerWeek: Math.max(1, Math.min(21, Number(e.target.value) || 1)) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">آدرس اصلی دامنه سایت (برای Sitemap و IndexNow)</label>
            <input
              type="url"
              dir="ltr"
              value={form.siteBaseUrl}
              onChange={(e) => setForm({ ...form, siteBaseUrl: e.target.value })}
              placeholder="https://ashkghalam.ir"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 text-left"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">نام برند جهت معرفی در مقالات و اسکیما</label>
            <input
              type="text"
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
          </div>
        </div>

        {/* Custom Topics Queue + Focus Keywords */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
            <div className="text-xs font-black text-slate-200">صف موضوعات اختصاصی مقالات (اولویت اول تولید)</div>
            <p className="text-[11px] text-slate-400">
              هر موضوعی اینجا اضافه کنید، در نوبت بعدی ابتدا از این لیست تولید می‌شود و پس از خالی شدن لیست، از بانک ۲۴ موضوعی تخصصی چاپ و بسته‌بندی استفاده می‌گردد.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newQueueTopic}
                onChange={(e) => setNewQueueTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTopic())}
                placeholder="مثلاً: راهنمای سفارش جعبه زعفران صادراتی..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
              />
              <button
                type="button"
                onClick={addCustomTopic}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                افزودن
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {form.customTopics.length === 0 ? (
                <div className="text-[11px] text-slate-500 py-2">صف اختصاصی خالی است (انتخاب خودکار از بانک تخصصی داخلی فعال است).</div>
              ) : (
                form.customTopics.map((topic, i) => (
                  <div key={topic} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200">
                    <span className="truncate">{i + 1}. {topic}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomTopic(topic)}
                      className="text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
            <div className="text-xs font-black text-slate-200">کلمات کلیدی هدف سئو سایت</div>
            <p className="text-[11px] text-slate-400">
              این عبارات در فایل معرفی سایت (llms.txt)، برچسب‌ها و ساختار مقالات تولیدشده لحاظ می‌شوند.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="افزودن کلمه کلیدی..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                افزودن
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.focusKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                >
                  {kw}
                  {form.focusKeywords.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="text-slate-400 hover:text-red-400 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Smart Hybrid cPanel Cron Job Setup Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-black text-white">تنظیم کرون جاب هوشمند cPanel (اختیاری ولی پیشنهادی)</h3>
              <p className="text-[11px] text-slate-400">
                بدون تنظیم کرون هم سیستم با ترافیک سایت کار می‌کند؛ اما اگر این دستور ساعتی را یک‌بار در بخش Cron Jobs سی‌پنل ثبت کنید، اجراها دقیق، منظم و مستقل از بازدیدکننده خواهند بود.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSaveConfig({ regenerateCronToken: true })}
            disabled={saving}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            بازتولید توکن امنیتی
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300">روش ۱ (بهترین): دستور PHP در Cron Jobs سی‌پنل</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                زمان: {data.cron.recommendedSchedule} (ساعتی)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code
                dir="ltr"
                className="flex-1 text-[11px] font-mono bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-emerald-300 overflow-x-auto whitespace-nowrap text-left"
              >
                {data.cron.cliCommand}
              </code>
              <button
                type="button"
                onClick={() => handleCopy('cli', data.cron.cliCommand)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer shrink-0"
                title="کپی دستور"
              >
                {copiedKey === 'cli' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300">روش ۲ (جایگزین): فراخوانی cURL / Webhook امن</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                بدون نیاز به مسیر فایل
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code
                dir="ltr"
                className="flex-1 text-[11px] font-mono bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-cyan-300 overflow-x-auto whitespace-nowrap text-left"
              >
                {data.cron.curlCommand}
              </code>
              <button
                type="button"
                onClick={() => handleCopy('curl', data.cron.curlCommand)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer shrink-0"
                title="کپی دستور"
              >
                {copiedKey === 'curl' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 leading-relaxed">
          <strong className="text-slate-200">عملکرد هوشمند کرون:</strong> حتی اگر کرون cPanel هر ساعت اجرا شود، اسکریپت <code dir="ltr" className="text-emerald-300">cron-seo.php</code> فقط زمانی مقاله یا ممیزی جدید اجرا می‌کند که بازه زمانی انتخاب‌شده شما (مثلاً هر ۴۸ ساعت) سپری شده باشد؛ بنابراین هیچ فشار اضافه‌ای به CPU یا منابع هاست اشتراکی وارد نمی‌شود.
        </div>
      </div>

      {/* Recent Execution Logs */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Activity className="w-4 h-4 text-emerald-400" />
            گزارش اجراهای اخیر ماژول
          </div>
          <span className="text-[11px] text-slate-400">
            مجموع: {data.state.totalArticlesGenerated} مقاله | {data.state.totalAuditsRun} ممیزی | {data.state.totalPingsSent} بروزرسانی معرفی سایت
          </span>
        </div>

        {data.state.recentLogs.length === 0 ? (
          <div className="text-xs text-slate-500 bg-slate-950/60 border border-slate-800 rounded-2xl p-5 text-center">
            هنوز چرخه‌ای اجرا نشده است. برای اولین تست، دکمه «اجرای کامل چرخه اکنون» را در بالای صفحه بزنید.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {data.state.recentLogs.map((log, i) => {
              const badge = sourceLabel(log.source);
              return (
                <div
                  key={`${log.at}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                      {badge.text}
                    </span>
                    <span className="text-slate-200 font-medium">{log.summary}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
                    <span>{log.durationMs}ms</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {log.atShamsi || formatRelativeTime(log.at)}
                    </span>
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
