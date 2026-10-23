import React from 'react';
import { Card, Button } from './UIComponents';
import { BookOpen, FileText, Download, Box, Layers, ExternalLink } from 'lucide-react';

const standards = [
  {
    code: 'FEFCO 0201',
    title: 'کارتن چهار درب متداول (RSC)',
    description: 'تحلیل مقاومت لبه‌ای ECT و فشاری BCT، الگوهای برش استاندارد و فرمول‌های محاسباتی ضخامت فلوت.',
    pages: '۱۲ صفحه',
  },
  {
    code: 'FEFCO 0427',
    title: 'جعبه کیبوردی خودبست (Roll End Tuck Top)',
    description: 'نقشه‌های اجرایی دایکات با زوایای قفل بهینه، بدون نیاز به چسب‌کاری یا منگنه.',
    pages: '۱۸ صفحه',
  },
  {
    code: 'FEFCO 0301',
    title: 'جعبه تلسکوپی درب و زیره مجزا',
    description: 'استاندارد جعبه‌های دوتکه مقاوم برای محصولات سنگین، کفش و شیت‌های چاپی.',
    pages: '۱۴ صفحه',
  },
  {
    code: 'DIN 55468',
    title: 'استاندارد کیفیت و آزمون مقوای کنگره‌ای',
    description: 'معیارهای رطوبت، مقاومت به ترکیدن Mullen و استقامت فلوت‌های B، C، E و ترکیبی BC.',
    pages: '۲۴ صفحه',
  },
];

export const Library: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 font-sans">
      <div className="mb-8">
        <span className="text-xs font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          کتابخانه فنی و مراجع مهندسی
        </span>
        <h1 className="text-3xl font-black text-slate-100 mt-2">مرجع تخصصی استانداردهای بسته‌بندی و FEFCO</h1>
        <p className="text-slate-400 text-sm mt-1">
          دسترسی به مستندات فنی، نقشه‌های اجرایی دایکات و راهنماهای کالیبراسیون خطوط تولید کارتن اشک قلم.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {standards.map((std) => (
          <Card key={std.code} className="flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                  {std.code}
                </span>
                <span className="text-xs text-slate-500">{std.pages}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">{std.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{std.description}</p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                آماده دانلود
              </span>
              <Button variant="outline" size="sm">
                <Download className="w-3.5 h-3.5 ml-1.5" />
                دریافت PDF راهنما
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
