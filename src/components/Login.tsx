import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from './UIComponents';
import { Lock, User as UserIcon, LogIn, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { User, UserRole } from '../types';
import { normalizePersianNumbers } from '../utils/numberUtils';

interface LoginProps {
  onSuccess?: () => void;
  onBack?: () => void;
  onLoginSuccess?: (user: User) => void;
  targetRole?: UserRole;
  onNavigateView?: (view: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onBack, onLoginSuccess, targetRole }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('ashk1403');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = normalizePersianNumbers(password.trim()).toLowerCase();

    if (!cleanUser) {
      setError('لطفاً نام کاربری را وارد فرمایید.');
      return;
    }

    // Support admin / ashk1403 (with English or Persian digits)
    const isPassValid = cleanPass === 'ashk1403' || cleanPass === 'admin' || cleanPass === 'ashk';
    const isUserValid = cleanUser === 'admin' || cleanUser === 'ashk';

    if (!isUserValid || !isPassValid) {
      setError('اطلاعات ورود نادرست است. نام کاربری: admin و رمز عبور: ashk1403 می‌باشد.');
      return;
    }

    const role = targetRole || UserRole.ADMIN;
    const loggedInUser: User = {
      id: 'admin-1',
      name: 'مدیر ارشد اشک قلم',
      username: cleanUser,
      role,
      tokens: 1000,
      walletBalance: 5000000,
      companyName: 'صنایع کارتن و چاپ اشک قلم',
      joinDate: '۱۴۰۳/۰۱/۰۱',
    };

    login(loggedInUser, role);
    setIsSuccess(true);

    setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess(loggedInUser);
      }
      if (onSuccess) {
        onSuccess();
      }
    }, 200);
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-8 font-sans dir-rtl text-right" dir="rtl">
      <Card className="border-slate-800 bg-[#080d19]/95 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت</span>
            </button>
          ) : <div />}

          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-mono">
            PORTAL SECURITY v3.13.0
          </span>
        </div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/10">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-100">ورود به پنل مدیریت اشک قلم</h2>
          <p className="text-xs text-slate-400 mt-1">دسترسی به تنظیمات کاتالوگ، استودیو CAD و کنترل سرور</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {isSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs mb-4">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>ورود با موفقیت انجام شد. در حال انتقال به پنل مدیریت...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">نام کاربری</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 pl-10 focus:outline-none focus:border-amber-500 font-sans"
              />
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">رمز عبور</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ashk1403"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 pl-10 focus:outline-none focus:border-amber-500 font-sans"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>اطلاعات پیش‌فرض سیستم:</span>
            <span className="font-mono text-amber-400 font-bold">admin / ashk1403</span>
          </div>

          <Button type="submit" variant="primary" className="w-full py-2.5 mt-2 text-slate-950 font-black">
            <LogIn className="w-4 h-4 ml-2" />
            ورود به پنل مدیریت
          </Button>
        </form>
      </Card>
    </div>
  );
};
