import React from 'react';
import { Card, Button } from './UIComponents';
import { Archive, Download, Upload, CheckCircle2, RefreshCw } from 'lucide-react';

export const ZipUpdateManager: React.FC<{ isDarkMode?: boolean }> = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Archive className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">مدیریت بسته‌های آپدیت و پکیج Release</h3>
          <p className="text-xs text-slate-400">بسته‌بندی فایل‌های استودیو CAD و کاتالوگ جهت آرشیو آفلاین</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
        <Button variant="primary" size="sm">
          <Download className="w-3.5 h-3.5 ml-1.5" />
          تهیه پکیج ZIP نسخه ۳.۹.۱
        </Button>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-3.5 h-3.5 ml-1.5" />
          بررسی سلامت بسته‌ها
        </Button>
      </div>
    </Card>
  );
};
