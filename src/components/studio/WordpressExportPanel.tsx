import React, { useState, useRef } from 'react';
import {
  Copy,
  Check,
  Download,
  Upload,
  Save,
  Globe,
  Code2,
  FileCode2,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { CatalogProject, SavedProjectSummary } from '../../types/flipbook';
import {
  generateIframeEmbedCode,
  generateStandaloneHtml,
  generateWordpressShortcodePhp,
} from '../../utils/wordpressExport';
import {
  downloadProjectAsJson,
  parseProjectFromJsonFile,
  publishProjectToServer,
} from '../../services/projectStorageService';

interface WordpressExportPanelProps {
  project: CatalogProject;
  savedProjects: SavedProjectSummary[];
  onRenameProject: (name: string) => void;
  onSaveProjectToBrowser: () => { ok: boolean; error?: string };
  onLoadProjectFromBrowser: (id: string) => void;
  onDeleteProjectFromBrowser: (id: string) => void;
  onImportProject: (proj: CatalogProject) => void;
  onProjectPublished: (publishedId: string, updatedProject?: CatalogProject) => void;
  onPublishToSite?: (publishedId: string, updatedProject?: CatalogProject) => Promise<void>;
}

export const WordpressExportPanel: React.FC<WordpressExportPanelProps> = ({
  project,
  savedProjects,
  onRenameProject,
  onSaveProjectToBrowser,
  onLoadProjectFromBrowser,
  onDeleteProjectFromBrowser,
  onImportProject,
  onProjectPublished,
  onPublishToSite,
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [exportTab, setExportTab] = useState<'iframe' | 'standalone' | 'shortcode'>('iframe');
  const [iframeHeight, setIframeHeight] = useState('680px');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [storageMsg, setStorageMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const activeEmbedId = project.publishedId || project.id;
  const liveEmbedUrl = `${origin}/embed/${encodeURIComponent(activeEmbedId)}`;

  const iframeCode = generateIframeEmbedCode(liveEmbedUrl, {
    height: iframeHeight,
    title: project.cover.title,
  });

  const shortcodeCode = generateWordpressShortcodePhp(liveEmbedUrl, project);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore clipboard permission issues
    }
  };

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await publishProjectToServer(project);
      onProjectPublished(res.id, res.project);
      if (onPublishToSite) {
        await onPublishToSite(res.id, res.project);
      }
      setStorageMsg({
        type: 'ok',
        text: 'کاتالوگ با موفقیت روی سرور و کاتالوگ سایت منتشر شد و لینک iFrame وردپرس فعال است.',
      });
    } catch (err: any) {
      setPublishError(err instanceof Error ? err.message : 'انتشار ناموفق بود.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadStandaloneHtml = () => {
    const html = generateStandaloneHtml(project);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalog-${project.id || 'flipbook'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleJsonImport = async (file: File) => {
    try {
      const imported = await parseProjectFromJsonFile(file);
      onImportProject(imported);
      setStorageMsg({ type: 'ok', text: `پروژه «${imported.name}» با موفقیت بارگذاری شد.` });
    } catch (err: any) {
      setStorageMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'خطا در خواندن فایل JSON',
      });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Project Save / JSON Export / Load */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="text-sm font-extrabold text-stone-900">ذخیره و مدیریت پروژه</h3>
          <span className="text-[11px] text-stone-500">ذخیره‌سازی محلی + فایل JSON</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={project.name}
            onChange={(e) => onRenameProject(e.target.value)}
            placeholder="نام پروژه کاتالوگ..."
            className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={() => {
              const res = onSaveProjectToBrowser();
              setStorageMsg(
                res.ok
                  ? { type: 'ok', text: 'پروژه در حافظه مرورگر ذخیره شد.' }
                  : { type: 'err', text: res.error || 'خطا در ذخیره‌سازی' }
              );
            }}
            className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>ذخیره در مرورگر</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadProjectAsJson(project)}
            className="px-3.5 py-2 rounded-lg border border-stone-200 hover:border-amber-500 bg-white text-stone-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>دانلود فایل پروژه (.json)</span>
          </button>

          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleJsonImport(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="px-3.5 py-2 rounded-lg border border-stone-200 hover:border-amber-500 bg-white text-stone-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-stone-600" />
            <span>بارگذاری از فایل JSON</span>
          </button>
        </div>

        {storageMsg && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              storageMsg.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {storageMsg.text}
          </div>
        )}

        {savedProjects.length > 0 && (
          <div className="pt-2 border-t border-stone-100 space-y-2">
            <div className="text-[11px] font-bold text-stone-500 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>پروژه‌های ذخیره‌شده در مرورگر</span>
            </div>
            <div className="divide-y divide-stone-100 border border-stone-200 rounded-lg overflow-hidden">
              {savedProjects.map((sp) => (
                <div key={sp.id} className="px-3 py-2 bg-stone-50/50 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-stone-800 truncate">{sp.name}</div>
                    <div className="text-[11px] text-stone-500 tabular-nums">
                      {sp.pageCount.toLocaleString('fa-IR')} صفحه
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadProjectFromBrowser(sp.id)}
                      className="px-2.5 py-1 rounded-md bg-white border border-stone-200 hover:border-amber-500 text-stone-700 font-semibold text-[11px] cursor-pointer"
                    >
                      بازکردن
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProjectFromBrowser(sp.id)}
                      aria-label="حذف پروژه"
                      className="p-1 text-stone-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* WordPress Embed Generator */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900">خروجی قابل‌جاسازی در وردپرس</h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              در قالب iFrame زنده، HTML مستقل یا شورتکد اختصاصی وردپرس
            </p>
          </div>
        </div>

        {/* Mode Segmented Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 rounded-lg">
          <button
            type="button"
            onClick={() => setExportTab('iframe')}
            className={`py-2 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              exportTab === 'iframe' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-600" />
            <span>کد iFrame زنده</span>
          </button>
          <button
            type="button"
            onClick={() => setExportTab('standalone')}
            className={`py-2 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              exportTab === 'standalone' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-amber-600" />
            <span>HTML مستقل</span>
          </button>
          <button
            type="button"
            onClick={() => setExportTab('shortcode')}
            className={`py-2 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              exportTab === 'shortcode' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-amber-600" />
            <span>شورتکد PHP</span>
          </button>
        </div>

        {exportTab === 'iframe' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-stone-700 leading-relaxed">
                برای فعال‌شدن لینک زنده <span className="font-mono font-bold">iFrame</span>، ابتدا آخرین تغییرات را روی سرور منتشر کنید.
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {publishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{project.publishedId ? 'به‌روزرسانی لینک زنده' : 'انتشار و دریافت لینک زنده'}</span>
                </button>
                {project.publishedId && (
                  <a
                    href={liveEmbedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                    title="باز کردن صفحه Embed در تب جدید"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {publishError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{publishError}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-bold text-stone-700">ارتفاع باکس در وردپرس:</label>
              <select
                value={iframeHeight}
                onChange={(e) => setIframeHeight(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-mono text-stone-800"
              >
                <option value="560px">560px (جمع‌وجور)</option>
                <option value="680px">680px (استاندارد)</option>
                <option value="780px">780px (بزرگ)</option>
              </select>
            </div>

            <div className="relative">
              <pre
                dir="ltr"
                className="p-3.5 rounded-xl bg-stone-900 text-stone-100 text-[11px] font-mono overflow-x-auto leading-relaxed"
              >
                {iframeCode}
              </pre>
              <button
                type="button"
                onClick={() => copyText('iframe', iframeCode)}
                className="mt-2 px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'iframe' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'iframe' ? 'کپی شد' : 'کپی کد iFrame'}</span>
              </button>
            </div>
          </div>
        )}

        {exportTab === 'standalone' && (
          <div className="space-y-3">
            <p className="text-xs text-stone-600 leading-relaxed">
              این خروجی یک فایل <strong>HTML کاملاً مستقل</strong> شامل تمام تصاویر بهینه‌شده WebP، جلد و موتور ورق‌زدن است و بدون نیاز به هیچ هاست یا پلاگین جانبی روی هر برگه وردپرس اجرا می‌شود.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyText('standalone', generateStandaloneHtml(project))}
                className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'standalone' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey === 'standalone' ? 'کد HTML کپی شد' : 'کپی کد کامل HTML'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadStandaloneHtml}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود فایل catalog.html</span>
              </button>
            </div>
          </div>
        )}

        {exportTab === 'shortcode' && (
          <div className="space-y-3">
            <p className="text-xs text-stone-600 leading-relaxed">
              کد زیر را در فایل <span className="font-mono font-bold">functions.php</span> قالب فرزند وردپرس یا افزونه Code Snippets قرار دهید و سپس در هر نوشته یا برگه از شورتکد{' '}
              <span className="font-mono font-bold text-amber-700">[digital_catalog]</span> استفاده کنید:
            </p>
            <pre
              dir="ltr"
              className="p-3.5 rounded-xl bg-stone-900 text-stone-100 text-[11px] font-mono overflow-x-auto leading-relaxed"
            >
              {shortcodeCode}
            </pre>
            <button
              type="button"
              onClick={() => copyText('shortcode', shortcodeCode)}
              className="px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'shortcode' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === 'shortcode' ? 'کپی شد' : 'کپی کد PHP شورتکد'}</span>
            </button>
          </div>
        )}

        {/* Short Step-by-Step WordPress Placement Guide */}
        <div className="pt-4 border-t border-stone-200 space-y-2">
          <h4 className="text-xs font-extrabold text-stone-900">مراحل قرار دادن در سایت وردپرسی:</h4>
          <ol className="text-xs text-stone-600 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>در پیشخوان وردپرس وارد ویرایش برگه یا نوشته مورد نظر شوید.</li>
            <li>
              در ویرایشگر گوتنبرگ یک بلوک <strong>«HTML سفارشی» (Custom HTML)</strong> اضافه کنید (در المنتور از ویجت <strong>HTML</strong> استفاده کنید).
            </li>
            <li>کد کپی‌شده را داخل بلوک جای‌گذاری (Paste) کرده و برگه را منتشر یا به‌روزرسانی کنید.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
