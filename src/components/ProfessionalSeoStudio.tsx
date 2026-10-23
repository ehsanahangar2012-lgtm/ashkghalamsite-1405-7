import React from 'react';
import { Card, Button } from './UIComponents';
import { Search, Globe, CheckCircle2, RefreshCw } from 'lucide-react';

export const ProfessionalSeoStudio: React.FC = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">استودیوی تخصصی سئو و ایندکس کاتالوگ</h3>
          <p className="text-xs text-slate-400">تولید خودکار سایت‌مپ داینامیک و مدیریت متاتگ‌های صفحات محصول</p>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
          <span>وضعیت نقشه سایت داینامیک (/sitemap.xml):</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            فعال و متصل به سرور
          </span>
        </div>
      </div>
    </Card>
  );
};
