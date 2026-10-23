import React from 'react';
import { Card, Button } from './UIComponents';
import { Sliders, Save, Check } from 'lucide-react';

export const SliderSettingsPanel: React.FC = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Sliders className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">تنظیمات اسلایدر سه‌بعدی صفحه اصلی</h3>
          <p className="text-xs text-slate-400">کنترل سرعت چرخش، نمایش مدل‌های FEFCO و برچسب‌های متریال</p>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-800 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">چرخش خودکار مدل سه‌بعدی:</span>
          <input type="checkbox" defaultChecked className="accent-amber-500 w-4 h-4" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-300">سرعت انیمیشن تاخوردن جعبه:</span>
          <span className="text-amber-400 font-mono font-bold">1.5x</span>
        </div>
      </div>
    </Card>
  );
};
