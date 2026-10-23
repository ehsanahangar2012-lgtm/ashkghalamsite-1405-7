import React from 'react';
import { Card, Button } from './UIComponents';
import { Globe, Plus, CheckCircle, ExternalLink } from 'lucide-react';

export const PortalManagementAdmin: React.FC = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">مدیریت پرتال‌ها و دامنه‌های متصل</h3>
            <p className="text-xs text-slate-400">پیکربندی پرتال‌های اقماری اشک قلم و بادی‌کاران</p>
          </div>
        </div>

        <Button variant="primary" size="sm">
          <Plus className="w-3.5 h-3.5 ml-1.5" />
          افزودن پرتال
        </Button>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
          <div>
            <span className="font-bold text-slate-200">صنایع کارتن و چاپ اشک قلم (ashkghalam.ir)</span>
            <p className="text-[11px] text-slate-400 mt-0.5">پرتال اصلی - فعال روی سرور اختصاصی</p>
          </div>
          <span className="text-emerald-400 font-bold">متصل</span>
        </div>
      </div>
    </Card>
  );
};
