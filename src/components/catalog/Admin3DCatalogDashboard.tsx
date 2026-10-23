import React, { useState, useEffect } from 'react';
import { catalogService, CatalogItem } from '../../services/catalogService';
import { Card, Button } from '../UIComponents';
import { BookOpen, Plus, Trash2, Eye, EyeOff, Save, CheckCircle } from 'lucide-react';

export const Admin3DCatalogDashboard: React.FC = () => {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catalogService.fetchCatalogs(false).then((data) => {
      setCatalogs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">داشبورد مدیریت کاتالوگ‌های سه‌بعدی و دیجیتال</h2>
          <p className="text-xs text-slate-400 mt-1">مدیریت انتشار، آپلود PDF و تنظیم وضعیت نمایش عمومی</p>
        </div>
      </div>

      {catalogs.length === 0 ? (
        <Card className="text-center py-12">
          <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-sm text-slate-400">کاتالوگی در سرور ثبت نشده است.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {catalogs.map((c) => (
            <Card key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200 text-sm">{c.title}</h4>
                <span className="text-xs text-slate-400">{c.category}</span>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${c.isPublished ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                {c.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
