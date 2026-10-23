import React from 'react';
import { Link } from 'react-router-dom';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';
import { Button } from './UIComponents';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <SeoHead
        view={AppView.NOT_FOUND}
        customTitle="صفحه مورد نظر پیدا نشد | ۴۰۴ اشک قلم"
        customDescription="صفحه‌ای که به دنبال آن بودید یافت نشد یا منتقل شده است."
        noIndex={true}
      />
      <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6">
        <AlertCircle className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-black text-slate-100 mb-3">۴۰۴ - صفحه یافت نشد</h1>
      <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
        صفحه یا کاتالوگی که به دنبال آن هستید ممکن است حذف شده، تغییر نام یافته یا موقتاً از دسترس خارج شده باشد.
      </p>
      <div className="flex gap-4">
        <Link to="/">
          <Button variant="primary">
            <Home className="w-4 h-4 ml-2" />
            بازگشت به صفحه اصلی
          </Button>
        </Link>
        <Link to="/catalog">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 ml-2" />
            مشاهده کاتالوگ
          </Button>
        </Link>
      </div>
    </div>
  );
};
