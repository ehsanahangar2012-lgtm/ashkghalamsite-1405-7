import React from 'react';
import { X, Globe, Box, Printer, Cpu, ExternalLink, Check } from 'lucide-react';

interface SiteSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePortal: string;
  onSelectPortal: (id: string) => void;
}

const portals = [
  {
    id: 'ashk',
    title: 'صنایع کارتن و چاپ اشک قلم',
    description: 'سامانه اصلی مهندسی کارتن، استودیو CAD و تولید جعبه دایکاتی',
    icon: Box,
    badge: 'فعال',
    color: 'from-amber-500 to-amber-600',
  },
  {
    id: 'badikaran',
    title: 'پرتال بادی‌کاران',
    description: 'تولید ظروف و بسته‌بندی بادی پلیمری و پلاستیک صنعتی',
    icon: Globe,
    badge: 'همکار تجاری',
    color: 'from-sky-500 to-blue-600',
  },
  {
    id: 'software',
    title: 'نرم‌افزارها و ابزارهای CAD/CAM',
    description: 'فروشگاه افزونه‌ها، اسکریپت‌های اتوکد و ماژول‌های بسته‌بندی',
    icon: Cpu,
    badge: 'استودیو نرم‌افزار',
    color: 'from-purple-500 to-indigo-600',
  },
];

export const SiteSwitcherModal: React.FC<SiteSwitcherModalProps> = ({
  isOpen,
  onClose,
  activePortal,
  onSelectPortal,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-black text-slate-100">پرتال‌های گروه صنعتی اشک قلم</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {portals.map((portal) => {
            const Icon = portal.icon;
            const isSelected = activePortal === portal.id;
            return (
              <button
                key={portal.id}
                onClick={() => {
                  onSelectPortal(portal.id);
                  onClose();
                }}
                className={`w-full text-right p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${portal.color} text-white shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{portal.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                        {portal.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{portal.description}</p>
                  </div>
                </div>

                {isSelected && (
                  <div className="p-1 rounded-full bg-amber-500 text-slate-950">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
