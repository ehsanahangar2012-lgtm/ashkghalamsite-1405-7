import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from './UIComponents';
import { Lock, User as UserIcon, LogIn, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';

export const Login: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('ashk1403');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('نام کاربری را وارد کنید');
      return;
    }
    const success = login(username, UserRole.ADMIN);
    if (success) {
      if (onSuccess) onSuccess();
    } else {
      setError('اطلاعات ورود نادرست است');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-8">
      <Card>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">ورود به پنل مدیریت اشک قلم</h2>
          <p className="text-xs text-slate-400 mt-1">دسترسی به تنظیمات کاتالوگ، استودیو CAD و مدیریت سیستم</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 pl-10 focus:outline-none focus:border-amber-500"
              />
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">رمز عبور</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 pl-10 focus:outline-none focus:border-amber-500"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full py-2.5 mt-2">
            <LogIn className="w-4 h-4 ml-2" />
            ورود به سیستم
          </Button>
        </form>
      </Card>
    </div>
  );
};
