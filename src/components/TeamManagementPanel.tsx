import React from 'react';
import { Card, Button } from './UIComponents';
import { Users, UserPlus, Shield, CheckCircle } from 'lucide-react';

export const TeamManagementPanel: React.FC<{ isDarkMode?: boolean }> = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">مدیریت تیم و دسترسی‌ها</h3>
            <p className="text-xs text-slate-400">تنظیم سطوح دسترسی اپراتور لیتوگرافی، حسابداری و مدیران</p>
          </div>
        </div>

        <Button variant="primary" size="sm">
          <UserPlus className="w-3.5 h-3.5 ml-1.5" />
          افزودن کاربر
        </Button>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-200">مدیر سیستم (Admin)</span>
          </div>
          <span className="text-emerald-400 font-bold">دسترسی کامل</span>
        </div>
      </div>
    </Card>
  );
};
