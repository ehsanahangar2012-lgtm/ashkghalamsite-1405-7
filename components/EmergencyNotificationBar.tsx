import React, { useState, useEffect } from 'react';
import { AppView, EmergencyBannerConfig } from '../types';
import { AlertOctagon, Megaphone, X, ExternalLink, Cpu, ShieldCheck } from 'lucide-react';

interface EmergencyNotificationBarProps {
  currentView: AppView;
  config?: EmergencyBannerConfig;
  onNavigate?: (view: AppView) => void;
}

export const EmergencyNotificationBar: React.FC<EmergencyNotificationBarProps> = ({
  currentView,
  config = {
    enabled: true,
    message: 'واحد فناوری اطلاعات اشک قلم: کلیه موتورهای طراحی جعبه، کاتالوگ و ابزارهای تحلیلی بدون قطعی و کاملاً آفلاین دردسترس می‌باشند.',
    targetView: 'ALL',
    linkText: 'کاتالوگ نرم‌افزارها',
    linkUrl: '',
    urgency: 'critical',
    dismissible: true
  },
  onNavigate
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      const savedDismissed = localStorage.getItem('ashk_emergency_dismissed_msg');
      return savedDismissed === config.message;
    } catch (_) {
      return false;
    }
  });

  if (!config || !config.enabled || isDismissed) {
    return null;
  }

  // Check target view filter
  const shouldDisplay = config.targetView === 'ALL' || config.targetView === currentView;
  if (!shouldDisplay) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('ashk_emergency_dismissed_msg', config.message);
    } catch (_) {}
  };

  const handleAction = () => {
    if (config.linkUrl && config.linkUrl.startsWith('http')) {
      window.open(config.linkUrl, '_blank');
    } else if (onNavigate) {
      onNavigate(AppView.SOFTWARE_STORE);
    }
  };

  const isItMessage = config.message?.includes('IT') || config.message?.includes('فناوری') || config.message?.includes('نرم‌افزار');

  return (
    <div className={`${isItMessage ? 'bg-slate-900/95 border-b border-indigo-500/30 text-indigo-100' : 'bg-red-900/95 text-white border-b border-red-500/30'} py-1.5 px-2.5 sm:px-4 text-[11px] sm:text-xs font-medium shadow-md relative z-50 animate-in slide-in-from-top duration-300 font-sans dir-rtl backdrop-blur-md`}>
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
          <span className={`flex-shrink-0 ${isItMessage ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' : 'bg-white/20 text-white'} p-1 rounded-lg`}>
            {isItMessage ? <Cpu className="w-3.5 h-3.5 animate-pulse" /> : <AlertOctagon className="w-3.5 h-3.5" />}
          </span>
          {isItMessage && (
            <span className="bg-indigo-500/30 text-indigo-200 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md border border-indigo-400/30 shrink-0 hidden xs:inline-block">
              واحد IT
            </span>
          )}
          <span className="font-extrabold tracking-tight leading-tight truncate sm:whitespace-normal">
            {config.message}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {config.linkText && (
            <button
              onClick={handleAction}
              className={`${isItMessage ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/40' : 'bg-white text-red-700 hover:bg-red-50 border-white/50'} px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg font-black text-[10px] sm:text-xs transition-all active:scale-95 flex items-center gap-1 border cursor-pointer whitespace-nowrap`}
            >
              <span>{config.linkText}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          {config.dismissible !== false && (
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-md transition-colors cursor-pointer shrink-0"
              title="بستن اعلان"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

