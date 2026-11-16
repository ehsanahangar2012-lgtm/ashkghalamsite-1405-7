import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from './UIComponents';
import { useContent } from '../contexts/ContentContext';
import { CPanelSeoGuideModal } from './CPanelSeoGuideModal';
import {
  Globe,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  FileText,
  Send,
  Trash2,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

interface AuditIssue {
  path: string;
  severity: 'critical' | 'warning' | 'info';
  code: string;
  message: string;
  suggestedFix?: string;
}

interface SeoReport {
  generatedAt: string | null;
  baseUrl: string;
  pagesAudited: number;
  averageScore: number;
  sitemapUrlCount: number;
  issues: AuditIssue[];
}

export const ProfessionalSeoStudio: React.FC = () => {
  const { blogPosts, updateBlogPostStatus, removeBlogPost, refreshPosts } = useContent();
  const [report, setReport] = useState<SeoReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [manualPrompt, setManualPrompt] = useState('');
  const [manualJsonInput, setManualJsonInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadReport = async () => {
    try {
      const res = await fetch('/api/seo/report');
      if (res.ok) setReport(await res.json());
    } catch {}
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleRunAudit = async () => {
    setIsAuditing(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/seo/audit', { method: 'POST' });
      const data = await res.json();
      if (data?.report) {
        setReport(data.report);
        setStatusBanner({
          type: 'ok',
          text: `ممیزی تکنیکال انجام شد (امتیاز: ${data.report.averageScore}/100 | آدرس‌های Sitemap: ${data.report.sitemapUrlCount})`,
        });
      }
    } catch {
      setStatusBanner({ type: 'err', text: 'خطا در اجرای ممیزی سئو.' });
    } finally {
      setIsAuditing(false);
    }
  };

  const handlePingEngines = async () => {
    setIsPinging(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/seo/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      setStatusBanner({
        type: 'ok',
        text: `Sitemap به‌روزرسانی شد (${data.urlCount || 0} URL). وضعیت IndexNow: ${data?.notify?.indexNow?.message || 'ثبت شد'}`,
      });
    } catch {
      setStatusBanner({ type: 'err', text: 'خطا در ارسال پینگ به موتورهای جستجو.' });
    } finally {
      setIsPinging(false);
    }
  };

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicInput.trim() || undefined }),
      });
      const data = await res.json();
      await refreshPosts();
      if (data?.ok) {
        setTopicInput('');
        setStatusBanner({
          type: 'ok',
          text: `مقاله «${data.post.title}» با وضعیت [${data.post.status}] و امتیاز کیفیت ${data.post.qualityReport?.score ?? '-'}/100 ذخیره شد.`,
        });
      } else {
        setStatusBanner({
          type: 'err',
          text: `مقاله توسط فیلتر کیفیت رد شد: ${data?.post?.qualityReport?.notes?.join(' | ') || data?.error}`,
        });
      }
    } catch {
      setStatusBanner({ type: 'err', text: 'خطا در اجرای ورکر تولید محتوا.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPromptForWebAi = async () => {
    try {
      const url = topicInput.trim()
        ? `/api/seo/manual-prompt?topic=${encodeURIComponent(topicInput.trim())}`
        : '/api/seo/manual-prompt';
      const res = await fetch(url);
      const data = await res.json();
      if (data?.prompt) {
        setManualPrompt(data.prompt);
        await navigator.clipboard?.writeText(data.prompt);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2500);
      }
    } catch {}
  };

  const handleImportManualJson = async () => {
    if (!manualJsonInput.trim()) return;
    setStatusBanner(null);
    try {
      const res = await fetch('/api/seo/import-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonText: manualJsonInput }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setManualJsonInput('');
        await refreshPosts();
        setStatusBanner({
          type: 'ok',
          text: `خروجی واردشده از فیلتر کیفیت عبور کرد (امتیاز ${data.post.qualityReport?.score}/100) و به عنوان پیش‌نویس ثبت شد.`,
        });
      } else {
        setStatusBanner({
          type: 'err',
          text: data?.rejectedReason || data?.error || 'مقاله توسط فیلتر کیفیت تایید نشد.',
        });
      }
    } catch {
      setStatusBanner({ type: 'err', text: 'خطا در پردازش JSON واردشده.' });
    }
  };

  const draftPosts = blogPosts.filter((p) => p.status === 'draft');

  return (
    <div className="space-y-6 dir-rtl text-right">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">استودیوی سئو و ورکر خودکار محتوا (نسخه بهینه cPanel)</h3>
              <p className="text-xs text-slate-400">
                ممیزی آفلاین متا و ساختار، کنترل تکرار فارسی، تولید نقشه سایت داینامیک و صف بررسی پیش‌نویس‌ها
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowGuide(!showGuide)} className="text-amber-400 border-amber-500/40">
              <BookOpen className="w-3.5 h-3.5 ml-1.5" />
              {showGuide ? 'بستن راهنما' : '📖 راهنمای تمام فارسی cPanel'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRunAudit} disabled={isAuditing}>
              <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${isAuditing ? 'animate-spin' : ''}`} />
              {isAuditing ? 'در حال ممیزی...' : 'ممیزی سئو و Sitemap'}
            </Button>
            <Button size="sm" onClick={handlePingEngines} disabled={isPinging} className="bg-amber-600 hover:bg-amber-500 text-white">
              <Send className="w-3.5 h-3.5 ml-1.5" />
              {isPinging ? 'در حال ارسال...' : 'ارسال IndexNow'}
            </Button>
          </div>
        </div>

        {showGuide && (
          <div className="mb-6 animate-in fade-in duration-300">
            <CPanelSeoGuideModal onClose={() => setShowGuide(false)} />
          </div>
        )}

        {statusBanner && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs border ${
              statusBanner.type === 'ok'
                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-700/50 text-rose-300'
            }`}
          >
            {statusBanner.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/40 flex items-center justify-between">
            <span className="text-slate-400">امتیاز سئو تکنیکال:</span>
            <span className="text-emerald-400 font-bold text-sm">{report ? `${report.averageScore}/100` : '---'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 flex items-center justify-between">
            <span className="text-slate-400">لینک‌های داخل Sitemap:</span>
            <span className="text-sky-400 font-bold text-sm">{report?.sitemapUrlCount ?? '---'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 flex items-center justify-between">
            <span className="text-slate-400">پیش‌نویس در انتظار تأیید:</span>
            <span className="text-amber-400 font-bold text-sm">{draftPosts.length}</span>
          </div>
        </div>

        {report?.issues && report.issues.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              یافته‌های ممیزی آفلاین ({report.issues.length} مورد)
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {report.issues.map((issue, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] text-sky-400 ml-2">{issue.path}</span>
                    <span className="text-slate-200">{issue.message}</span>
                  </div>
                  <Badge color={issue.severity === 'critical' ? 'red' : issue.severity === 'warning' ? 'yellow' : 'blue'}>
                    {issue.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Sparkles className="w-4 h-4 text-purple-400" />
            تولید مقاله جدید (روتر رایگان / قالب مهندسی)
          </div>
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="موضوع دلخواه (خالی بگذارید تا بر اساس شکاف محتوا انتخاب شود)..."
            className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleAutoGenerate} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-500 text-white">
              {isGenerating ? 'در حال تولید و کنترل کیفیت...' : 'اجرای خودکار ورکر مقاله'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopyPromptForWebAi}>
              {copiedPrompt ? <Check className="w-3.5 h-3.5 ml-1" /> : <Copy className="w-3.5 h-3.5 ml-1" />}
              {copiedPrompt ? 'پرامپت کپی شد!' : 'کپی پرامپت برای ChatGPT / DeepSeek وب'}
            </Button>
          </div>

          {manualPrompt && (
            <textarea
              readOnly
              value={manualPrompt}
              className="w-full h-24 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono"
            />
          )}

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              ثبت خروجی JSON از ChatGPT / DeepSeek وب (با عبور از فیلتر ضدتکرار آفلاین):
            </label>
            <textarea
              value={manualJsonInput}
              onChange={(e) => setManualJsonInput(e.target.value)}
              placeholder='{"title": "...", "slug": "...", "excerpt": "...", "content": "## ...", "tags": ["FEFCO"]}'
              className="w-full h-24 p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono"
              dir="ltr"
            />
            <Button size="sm" variant="outline" onClick={handleImportManualJson} disabled={!manualJsonInput.trim()}>
              <ShieldCheck className="w-3.5 h-3.5 ml-1.5 text-emerald-400" />
              بررسی کیفیت و ذخیره به عنوان پیش‌نویس
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <FileText className="w-4 h-4 text-amber-400" />
              صف تایید و انتشار مقالات ({draftPosts.length} پیش‌نویس)
            </div>
            <Button size="sm" variant="ghost" onClick={refreshPosts}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {draftPosts.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
              در حال حاضر پیش‌نویس در انتظار تأیید وجود ندارد.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {draftPosts.map((post) => (
                <div key={post.id} className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">{post.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{post.excerpt}</p>
                    </div>
                    <Badge color="yellow">پیش‌نویس</Badge>
                  </div>

                  {post.qualityReport && (
                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-300">
                      <span>امتیاز کیفیت: {post.qualityReport.score}/100</span>
                      <span>• {post.qualityReport.wordCount} کلمه</span>
                      {post.qualityReport.maxContentSimilarity !== undefined && (
                        <span>• تشابه: {Math.round(post.qualityReport.maxContentSimilarity * 100)}%</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                      onClick={() => updateBlogPostStatus(post.id, 'published')}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                      تایید و انتشار
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-400 border-rose-800/50 text-xs"
                      onClick={() => removeBlogPost(post.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 ml-1" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
