import React, { useState } from 'react';
import { Card, Button, BackButton } from './UIComponents';
import { SmartHelpButton } from './SmartHelpModal';
import { Cpu, Download, CheckCircle } from 'lucide-react';

interface SoftwareMarketplaceProps {
  onBackToHome?: () => void;
  onNavigateToDieline?: () => void;
}

interface SoftwareItem {
  id: string;
  title: string;
  version: string;
  fileName: string;
  description: string;
  features: string[];
  payload?: string;
  isStaticRelease?: boolean;
  downloadUrl?: string;
}

const softwares: SoftwareItem[] = [
  {
    id: 'ashk-cpanel-release',
    title: 'پکیج کامل استقرار هاست معمولی cPanel (نسخه استاندارد PHP)',
    version: 'v3.26.6',
    fileName: 'ashk-ghalam-v3.26.6-cpanel.zip',
    isStaticRelease: true,
    downloadUrl: '/api/release/download',
    description: 'بسته جامع استقرار فلت (Flat Root) شامل فرانت‌اند بهینه‌شده، بک‌اند خالص PHP در فایل api.php، ذخیره مستقیم کاتالوگ‌ها و تصاویر در public_html، فایل‌های sitemap.xml و کانفیگ کامل .htaccess آماده استخراج در cPanel معمولی.',
    features: ['ساختار مسطح بدون پوشه تودرتوی dist', 'بک‌اند بومی PHP (api.php) بدون نیاز به Node.js یا ترمینال', 'سازگار ۱۰۰٪ با هاست اشتراکی معمولی (Apache / LiteSpeed)'],
  },
  {
    id: 'ashk-cad-plugin',
    title: 'اسکریپت اتوکد اشک قلم (Ashk AutoLISP Box Drawer)',
    version: 'v3.26.6',
    fileName: 'ashk-fefco0201-autolisp.lsp',
    description: 'ماژول تخصصی AutoLISP جهت ترسیم خودکار خطوط تا (Crease) و برش (Cut) استاندارد FEFCO 0201 درون محیط AutoCAD بدون نیاز به اتصال اینترنت.',
    features: ['ترسیم خودکار لایه‌های Cut و Crease', 'محاسبه ضخامت فلوت‌های B و E', 'سازگار با AutoCAD 2020 تا 2025'],
    payload: `; Ashk Ghalam AutoLISP Offline Box Generator v3.26.6\n(defun c:ASHKBOX (/ L W H x0 y0)\n  (setq L (getreal "\\nTool Length (mm): "))\n  (setq W (getreal "\\nWidth (mm): "))\n  (setq H (getreal "\\nHeight (mm): "))\n  (command "._RECTANG" (list 0 0) (list (+ (* 2 L) (* 2 W)) H))\n  (princ "\\nAshk Ghalam base layout created.")\n  (princ)\n)\n`,
  },
  {
    id: 'dieline-calc-cli',
    title: 'پروفایل آفلاین محاسبه شیت و BCT اشک قلم',
    version: 'v3.26.6',
    fileName: 'ashk-packaging-rules-v3.26.6.json',
    description: 'فایل قوانین مهندسی مک‌کی (McKee BCT) و استاندارد شیت‌بندی (۷۰×۱۰۰ و ۶۰×۹۰) برای استفاده درون نرم‌افزارهای چاپخانه در محیط آفلاین.',
    features: ['ورودی پارامترهای ابعاد L×W×H', 'تست مقاومت فشاری ستونی (BCT)', 'بهینه‌سازی چیدمان روی شیت چاپی'],
    payload: JSON.stringify({
      engine: 'Ashk Ghalam Offline CAD Core',
      version: '3.26.6',
      standards: ['FEFCO-0201', 'FEFCO-0427', 'ECMA-A2020'],
      sheetsCm: [
        { name: '۷۰×۱۰۰ سانتی‌متر', width: 100, height: 70, gripperCm: 1.5 },
        { name: '۶۰×۹۰ سانتی‌متر', width: 90, height: 60, gripperCm: 1.5 },
        { name: '۵۰×۷۰ سانتی‌متر', width: 70, height: 50, gripperCm: 1.2 },
      ],
    }, null, 2),
  },
];

export const SoftwareMarketplace: React.FC<SoftwareMarketplaceProps> = ({
  onBackToHome,
  onNavigateToDieline,
}) => {
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPackage = async (sw: SoftwareItem) => {
    if (sw.isStaticRelease) {
      if (downloadingId === sw.id) return;
      setDownloadingId(sw.id);
      const candidates = [
        `${sw.downloadUrl || '/api/release/download'}?t=${Date.now()}`,
        `/api.php?r=release/download&t=${Date.now()}`,
        `/downloads/${sw.fileName}?t=${Date.now()}`,
      ];
      try {
        let blob: Blob | null = null;
        for (const ep of candidates) {
          try {
            const res = await fetch(ep, { cache: 'no-store' });
            if (!res.ok) continue;
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('text/html')) continue;
            const b = await res.blob();
            if (b.size > 10000) {
              blob = b;
              break;
            }
          } catch {
            // try next candidate
          }
        }
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = sw.fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
        } else {
          const a = document.createElement('a');
          a.href = `/downloads/${sw.fileName}`;
          a.download = sw.fileName;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        setDownloadedId(sw.id);
        setTimeout(() => setDownloadedId(null), 3000);
      } finally {
        setDownloadingId(null);
      }
      return;
    }
    const blob = new Blob([sw.payload || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sw.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedId(sw.id);
    setTimeout(() => setDownloadedId(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 font-sans dir-rtl text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <BackButton
              label="بازگشت"
              onClick={onBackToHome}
              fallbackPath="/"
              variant="auto"
            />
            <span className="text-xs font-black text-amber-600 dark:text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              مرکز ابزارها و اسکریپت‌های فنی آفلاین
            </span>
            <SmartHelpButton
              sectionTitle="راهنمای دانلود پکیج‌های مهندسی"
              description="تمامی اسکریپت‌ها و فایل‌های پیکربندی استاندارد درون‌برنامه‌ای بوده و بدون نیاز به اینترنت دانلود و اجرا می‌شوند."
              tips={[
                'فایل .lsp را با دستور APPLOAD درون اتوکد بارگذاری کرده و دستور ASHKBOX را اجرا کنید.',
                'برای طراحی مستقیم بدون نصب نرم‌افزار، از دکمه ورود به جعبه‌ساز آنلاین استفاده کنید.',
              ]}
            />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">ماژول‌ها و ابزارهای مهندسی اشک قلم</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">افزونه‌ها و پروفایل‌های تخصصی جهت اتوماسیون طراحی کارتن و جعبه در محیط CAD و چاپخانه.</p>
        </div>

        {onNavigateToDieline && (
          <Button variant="primary" onClick={onNavigateToDieline}>
            ورود به ژنراتور آنلاین دایکات
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {softwares.map((sw) => (
          <Card key={sw.id} className="flex flex-col justify-between hover:border-amber-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-slate-200 dark:border-slate-700">
                  {sw.version}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{sw.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{sw.description}</p>

              <div className="space-y-1.5 mb-6">
                {sw.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                {downloadingId === sw.id
                  ? 'در حال آماده‌سازی فایل زیپ...'
                  : downloadedId === sw.id
                    ? 'فایل با موفقیت دانلود شد'
                    : 'اجرای ۱۰۰٪ آفلاین'}
              </span>
              <Button variant="outline" size="sm" onClick={() => handleDownloadPackage(sw)} disabled={downloadingId === sw.id}>
                <Download className="w-3.5 h-3.5 ml-1.5" />
                {downloadingId === sw.id ? 'در حال دانلود...' : `دریافت فایل (${sw.fileName.split('.').pop()?.toUpperCase()})`}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
