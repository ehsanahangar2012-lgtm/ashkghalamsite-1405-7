import React from 'react';
import { Globe, Box, Cpu, Building2, Check, ArrowLeft } from 'lucide-react';
import { BackButton } from './UIComponents';
import { useContent } from '../contexts/ContentContext';
import { AppView } from '../types';

interface SiteSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePortal: string;
  onSelectPortal: (id: string, targetView?: string) => void;
}

export const SiteSwitcherModal: React.FC<SiteSwitcherModalProps> = ({
  isOpen,
  onClose,
  activePortal,
  onSelectPortal,
}) => {
  const { globalSettings } = useContent();

  if (!isOpen) return null;

  const portals = [
    {
      id: 'ashk',
      title: globalSettings.ashkPortalTitle || 'صنایع کارتن و چاپ اشک قلم',
      description:
        globalSettings.ashkPortalDesc ||
        'سامانه اصلی مهندسی کارتن، استودیو CAD، جعبه‌ساز سه‌بعدی و تولید جعبه دایکاتی',
      icon: Box,
      badge: 'پرتال اصلی',
      color: 'from-amber-500 to-amber-600',
      externalUrl: globalSettings.ashkPortalUrl?.trim() || 'https://ashkghalam.ir',
      targetView: AppView.HOME,
    },
    {
      id: 'badikaran',
      title: globalSettings.badikaranPortalTitle || 'مجتمع چاپ و بسته‌بندی بادیکاران توس',
      description:
        globalSettings.badikaranPortalDesc ||
        'مرکز صنعتی چاپ افست ۵ رنگ، کارتن‌سازی لمینتی، پوشش‌های UV و بسته‌بندی صادراتی',
      icon: Globe,
      badge: 'ورود به سایت بادیکاران',
      color: 'from-emerald-500 to-teal-600',
      externalUrl: globalSettings.badikaranPortalUrl?.trim() || 'https://ashkghalam.ir',
      targetView: AppView.PRODUCTS,
    },
    {
      id: 'software',
      title: 'مرکز نرم‌افزارها و ابزارهای CAD/CAM',
      description: 'فروشگاه افزونه‌ها، اسکریپت‌های اتوکد، سیستم حسابداری و اپلیکیشن‌های آفلاین',
      icon: Cpu,
      badge: 'فروشگاه نرم‌افزار',
      color: 'from-purple-500 to-indigo-600',
      externalUrl: '',
      targetView: AppView.SOFTWARE_STORE,
    },
    {
      id: 'b2b',
      title: 'پرتال همکاران تجاری و خدمات B2B',
      description: 'ثبت استعلام تیراژ صنعتی، خدمات خط تولید چاپ افست و همکاری با کارخانجات',
      icon: Building2,
      badge: 'خدمات B2B',
      color: 'from-sky-500 to-blue-600',
      externalUrl: '',
      targetView: AppView.SERVICES,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-sans dir-rtl text-right">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-100">
                {globalSettings.siteSwitcherTitle || 'ورود به پرتال‌های گروه صنعتی اشک قلم و بادیکاران'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {globalSettings.siteSwitcherSubtitle || 'پرتال مورد نظر خود را برای ورود و دسترسی به خدمات انتخاب کنید'}
              </p>
            </div>
          </div>
          <BackButton label="بستن و بازگشت" onClick={onClose} variant="dark" />
        </div>

        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-0.5">
          {portals.map((portal) => {
            const Icon = portal.icon;
            const isSelected = activePortal === portal.id;
            return (
              <button
                key={portal.id}
                onClick={() => {
                  if (portal.externalUrl) {
                    window.location.href = portal.externalUrl;
                    return;
                  }
                  onSelectPortal(portal.id, portal.targetView);
                  onClose();
                }}
                className={`w-full text-right p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${portal.color} text-white shadow-md shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{portal.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                        {portal.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{portal.description}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {isSelected ? (
                    <div className="p-1.5 rounded-full bg-amber-500 text-slate-950">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20">
                      <span>ورود</span>
                      <ArrowLeft className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
