import React from 'react';
import { Card, Button } from './UIComponents';
import { Cpu, Download, ArrowRight, CheckCircle, Sparkles, Terminal, Code } from 'lucide-react';

interface SoftwareMarketplaceProps {
  onBackToHome?: () => void;
  onNavigateToDieline?: () => void;
}

const softwares = [
  {
    id: 'ashk-cad-plugin',
    title: 'پلاگین اتوکد اشک قلم (Ashk AutoLISP & ARX)',
    version: 'v3.9.1',
    description: 'ابزار تخصصی ترسیم خودکار خطوط تا و برش در AutoCAD، محاسبه اضافه شیت و خروجی مستقیم به دایکات روتاری.',
    features: ['ترسیم خودکار خطوط Crease و Cut', 'محاسبه ضخامت فلوت‌های B و E', 'سازگار با AutoCAD 2020-2025'],
  },
  {
    id: 'dieline-calc-cli',
    title: 'موتور محاسباتی CLI فرمول‌های جعبه',
    version: 'v2.4.0',
    description: 'اسکریپت خط فرمان Node.js و پایتون جهت شیت‌بندی اتوماتیک و بهینه‌سازی مصرف مقوا در چاپخانه‌های افست.',
    features: ['ورودی پارامترهای ابعاد L×W×D', 'خروجی فایل برداری DXF و SVG', 'کاهش پرت کاغذ تا ۱۵٪'],
  },
];

export const SoftwareMarketplace: React.FC<SoftwareMarketplaceProps> = ({
  onBackToHome,
  onNavigateToDieline,
}) => {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            فروشگاه ابزارها و نرم‌افزارهای فنی
          </span>
          <h1 className="text-3xl font-black text-slate-100 mt-2">ماژول‌ها و نرم‌افزارهای مهندسی اشک قلم</h1>
          <p className="text-slate-400 text-sm mt-1">افزونه‌ها و اسکریپت‌های تخصصی جهت اتوماسیون طراحی کارتن و جعبه در محیط CAD.</p>
        </div>

        {onNavigateToDieline && (
          <Button variant="primary" onClick={onNavigateToDieline}>
            ورود به ژنراتور آنلاین دایکات
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {softwares.map((sw) => (
          <Card key={sw.id} className="flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                  {sw.version}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-100 mb-2">{sw.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{sw.description}</p>

              <div className="space-y-1.5 mb-6">
                {sw.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-bold">نسخه فعال رایگان برای همکاران</span>
              <Button variant="outline" size="sm">
                <Download className="w-3.5 h-3.5 ml-1.5" />
                دریافت پکیج
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
