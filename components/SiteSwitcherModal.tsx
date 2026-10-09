import React, { useState } from 'react';
import { SitePortalId, PortalItemConfig } from '../types';
import { 
  Building2, Box, Printer, Laptop, Cpu, Layers, Sparkles, Globe, 
  ShieldCheck, ArrowLeft, X, Check, HelpCircle, CheckCircle2, ChevronLeft,
  Settings, ExternalLink, Flame, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContent } from '../contexts/ContentContext';

interface SiteSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePortal: SitePortalId;
  onSelectPortal: (portal: SitePortalId, targetView?: string) => void;
}

// Icon mapper helper
export const renderPortalIcon = (iconName: string, className = "w-6 h-6") => {
  switch (iconName) {
    case 'Box':
      return <Box className={className} />;
    case 'Printer':
      return <Printer className={className} />;
    case 'Laptop':
      return <Laptop className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Globe':
      return <Globe className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    default:
      return <Box className={className} />;
  }
};

// Color theme classes mapping
export const getPortalColorTheme = (theme: string) => {
  switch (theme) {
    case 'emerald':
      return {
        bgLight: 'bg-emerald-500/10 dark:bg-emerald-950/20',
        border: 'border-emerald-500',
        borderSubtle: 'border-emerald-500/30 hover:border-emerald-500/60',
        text: 'text-emerald-500 dark:text-emerald-400',
        textLight: 'text-emerald-600 dark:text-emerald-300',
        badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        btn: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30',
        glow: 'from-emerald-500/10 via-transparent to-transparent',
        dot: 'bg-emerald-500',
        chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      };
    case 'indigo':
      return {
        bgLight: 'bg-indigo-500/10 dark:bg-indigo-950/20',
        border: 'border-indigo-500',
        borderSubtle: 'border-indigo-500/30 hover:border-indigo-500/60',
        text: 'text-indigo-500 dark:text-indigo-400',
        textLight: 'text-indigo-600 dark:text-indigo-300',
        badge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        btn: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/30',
        glow: 'from-indigo-500/10 via-transparent to-transparent',
        dot: 'bg-indigo-500',
        chip: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      };
    case 'amber':
      return {
        bgLight: 'bg-amber-500/10 dark:bg-amber-950/20',
        border: 'border-amber-500',
        borderSubtle: 'border-amber-500/30 hover:border-amber-500/60',
        text: 'text-amber-500 dark:text-amber-400',
        textLight: 'text-amber-600 dark:text-amber-300',
        badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        btn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/30',
        glow: 'from-amber-500/10 via-transparent to-transparent',
        dot: 'bg-amber-500',
        chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      };
    case 'rose':
      return {
        bgLight: 'bg-rose-500/10 dark:bg-rose-950/20',
        border: 'border-rose-500',
        borderSubtle: 'border-rose-500/30 hover:border-rose-500/60',
        text: 'text-rose-500 dark:text-rose-400',
        textLight: 'text-rose-600 dark:text-rose-300',
        badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        btn: 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-900/30',
        glow: 'from-rose-500/10 via-transparent to-transparent',
        dot: 'bg-rose-500',
        chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      };
    case 'purple':
      return {
        bgLight: 'bg-purple-500/10 dark:bg-purple-950/20',
        border: 'border-purple-500',
        borderSubtle: 'border-purple-500/30 hover:border-purple-500/60',
        text: 'text-purple-500 dark:text-purple-400',
        textLight: 'text-purple-600 dark:text-purple-300',
        badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
        btn: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/30',
        glow: 'from-purple-500/10 via-transparent to-transparent',
        dot: 'bg-purple-500',
        chip: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      };
    case 'cyan':
      return {
        bgLight: 'bg-cyan-500/10 dark:bg-cyan-950/20',
        border: 'border-cyan-500',
        borderSubtle: 'border-cyan-500/30 hover:border-cyan-500/60',
        text: 'text-cyan-500 dark:text-cyan-400',
        textLight: 'text-cyan-600 dark:text-cyan-300',
        badge: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
        btn: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/30',
        glow: 'from-cyan-500/10 via-transparent to-transparent',
        dot: 'bg-cyan-500',
        chip: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
      };
    case 'sky':
    default:
      return {
        bgLight: 'bg-sky-500/10 dark:bg-sky-950/20',
        border: 'border-sky-500',
        borderSubtle: 'border-sky-500/30 hover:border-sky-500/60',
        text: 'text-sky-500 dark:text-sky-400',
        textLight: 'text-sky-600 dark:text-sky-300',
        badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
        btn: 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sky-900/30',
        glow: 'from-sky-500/10 via-transparent to-transparent',
        dot: 'bg-sky-500',
        chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
      };
  }
};

export const SiteSwitcherModal: React.FC<SiteSwitcherModalProps> = ({
  isOpen,
  onClose,
  activePortal,
  onSelectPortal
}) => {
  const { globalSettings } = useContent();
  const [showSmartHelp, setShowSmartHelp] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hide_site_switcher') === 'true';
    } catch {
      return false;
    }
  });

  if (!isOpen) return null;

  // Resolve portals list from globalSettings or default fallback
  const rawList: PortalItemConfig[] = (globalSettings.portalsList && globalSettings.portalsList.length > 0)
    ? globalSettings.portalsList
    : [
        {
          id: 'ashk',
          title: globalSettings.ashkPortalTitle || 'صنایع چاپ و بسته‌بندی اشک قلم',
          englishTitle: 'Ashk Ghalam Packaging & CAD',
          tagline: 'مرکز مهندسی ساختار کارتن، طراحی سه‌بعدی و استودیو دایلاین',
          badge: 'پرتال تخصصی ۳D & CAD',
          description: globalSettings.ashkPortalDesc || 'مرکز تخصصی طراحی ساختاری جعبه و کارتن، مجهز به موتورهای محاسباتی دایلاین FEFCO و ECMA، استودیوی آنلاین گرافیک و کاتالوگ دیجیتال.',
          iconName: 'Box',
          colorTheme: 'sky',
          services: globalSettings.ashkServices || [
            'طراحی تعاملی جعبه و تیغ‌سازی دایکات ۳D',
            'استودیوی آنلاین ویرایش و جایگذاری گرافیک',
            'محاسبه لحظه‌ای فرمول ابعاد و بهینه‌سازی شیت',
            'خروجی مهندسی وکتور DXF، کاتالوگ و سه‌بعدی'
          ],
          metrics: [
            { label: 'استانداردها', value: 'FEFCO / ECMA' },
            { label: 'دقت شبیه‌سازی', value: '۰.۱ میلی‌متر' },
            { label: 'موتور محاسباتی', value: '۱۰۰٪ آفلاین' }
          ],
          targetUrl: globalSettings.ashkPortalUrl || '',
          internalView: 'HOME',
          buttonText: 'ورود به استودیو اشک قلم',
          enabled: true,
          order: 1
        },
        {
          id: 'badikaran',
          title: globalSettings.badikaranPortalTitle || 'مجتمع چاپ و بسته‌بندی بادیکاران توس',
          englishTitle: 'Badikaran Toos Industrial Printing',
          tagline: 'مجتمع چاپ صنعتی افست ۵ رنگ، کارتن لمینتی و خدمات دایکات سنگین',
          badge: 'تولید صنعتی و انبوه',
          description: globalSettings.badikaranPortalDesc || 'مرکز مجهز چاپ افست ۵ رنگ همزمان Heidelberg، خطوط تمام اتوماتیک کارتن‌سازی لمینتی، پوشش‌های UV موضعی و سلفون‌کشی حرارتی.',
          iconName: 'Printer',
          colorTheme: 'emerald',
          services: globalSettings.badikaranServices || [
            'ماشین‌آلات افست Heidelberg ۵ رنگ همزمان',
            'خط لمینت اتوماتیک و دایکات سنگین Bobst',
            'پوشش‌های ورنی، سلفون مات/براق و UV موضعی',
            'تولید انبوه جعبه‌های بهداشتی، غذایی و صنعتی'
          ],
          metrics: [
            { label: 'تکنولوژی چاپ', value: 'افست ۵ رنگ' },
            { label: 'ظرفیت روزانه', value: '۵۰،۰۰۰ جعبه' },
            { label: 'کنترل کیفیت', value: 'استاندارد ملی' }
          ],
          targetUrl: globalSettings.badikaranPortalUrl || '',
          internalView: 'ABOUT',
          buttonText: 'ورود به مجتمع بادیکاران توس',
          enabled: true,
          order: 2
        }
      ];

  // Active enabled portals sorted by order
  const activePortals = rawList
    .filter(p => p.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleSelect = (portal: PortalItemConfig) => {
    try {
      localStorage.setItem('hasChosenPortal', 'true');
      localStorage.setItem('activePortal', portal.id);
      if (dontShowAgain) {
        localStorage.setItem('hide_site_switcher', 'true');
      } else {
        localStorage.removeItem('hide_site_switcher');
      }
    } catch (_) {}

    // Check if external url is defined and belongs to a DIFFERENT domain
    const targetUrl = portal.targetUrl?.trim() || (portal.id === 'ashk' ? globalSettings.ashkPortalUrl?.trim() : portal.id === 'badikaran' ? globalSettings.badikaranPortalUrl?.trim() : '');

    if (targetUrl && targetUrl.length > 0) {
      const currentHost = typeof window !== 'undefined' ? window.location.host.toLowerCase() : '';
      const isInternalDomain = currentHost && (targetUrl.toLowerCase().includes(currentHost) || (currentHost.includes('ashkghalam') && targetUrl.toLowerCase().includes('ashkghalam')));

      if (!isInternalDomain && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
        window.location.href = targetUrl;
        return;
      }
    }

    onSelectPortal(portal.id, portal.internalView);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-xl overflow-y-auto"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.92, y: 25, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 25, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-slate-900 text-slate-100 rounded-2xl sm:rounded-3xl max-w-4xl w-full p-3.5 sm:p-7 shadow-2xl relative overflow-hidden border border-slate-800 font-sans my-auto max-h-[88vh] flex flex-col justify-between"
          id="site-switcher-modal-card"
        >
          {/* Subtle Ambient Decorative Glows */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-sky-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 sm:pb-5 border-b border-slate-800/80 mb-3 sm:mb-6 gap-2 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 p-0.5 shadow-md shadow-sky-500/20 shrink-0">
                <div className="w-full h-full bg-slate-900 rounded-[10px] sm:rounded-[14px] flex items-center justify-center text-white">
                  <Building2 className="w-4 h-4 sm:w-6 sm:h-6 text-sky-400" />
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h3 className="text-sm sm:text-xl font-black text-white">
                    {globalSettings.siteSwitcherTitle || 'انتخاب پرتال / برند درگاه'}
                  </h3>
                  <span className="text-[9px] sm:text-[10px] bg-slate-800 text-sky-400 font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-slate-700">
                    شبکه یکپارچه
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-normal line-clamp-1 sm:line-clamp-none">
                  {globalSettings.siteSwitcherSubtitle || 'لطفاً درگاه تخصصی یا واحد صنعتی مورد نظر خود را انتخاب فرمایید:'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Smart Help Toggle Button */}
              <button
                onClick={() => setShowSmartHelp(!showSmartHelp)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-xs font-black transition-all cursor-pointer border ${
                  showSmartHelp
                    ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                    : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700'
                }`}
                title="راهنمای هوشمند انتخاب پرتال"
              >
                ?
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-800/90 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 flex items-center justify-center transition-all cursor-pointer"
                title="بستن پنجره"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Container for Body Cards */}
          <div className="overflow-y-auto pr-1 flex-1 no-scrollbar space-y-3">
            {/* Smart Help Drawer Box */}
            <AnimatePresence>
              {showSmartHelp && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-sky-950/50 via-slate-900 to-indigo-950/50 border border-sky-500/30 text-xs text-slate-200 leading-relaxed shadow-inner">
                    <div className="flex items-center gap-1.5 text-sky-400 font-black mb-1.5 sm:mb-2 text-xs">
                      <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>راهنمای هوشمند درگاه‌های گروه صنعتی:</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 text-[10.5px] sm:text-[11.5px] text-slate-300">
                      <div className="bg-slate-900/60 p-2 sm:p-2.5 rounded-lg border border-slate-800/80">
                        <strong className="text-sky-300 block mb-0.5">📦 ۱. استودیو اشک قلم:</strong>
                        <span>مناسب طراحان بسته‌بندی، مهندسان دیلاین و جعبه‌سازی آنلاین ۳D.</span>
                      </div>
                      <div className="bg-slate-900/60 p-2 sm:p-2.5 rounded-lg border border-slate-800/80">
                        <strong className="text-emerald-300 block mb-0.5">🖨️ ۲. مجتمع بادیکاران توس:</strong>
                        <span>مناسب صنایع نیازمند چاپ افست ۵ رنگ، کارتن‌های لمینتی و خدمات UV.</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dynamic Portals Cards Grid */}
            <div className={`grid grid-cols-1 ${activePortals.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-3 sm:gap-5 mb-2`}>
              {activePortals.map((portal) => {
                const theme = getPortalColorTheme(portal.colorTheme);
                const isSelected = activePortal === portal.id;

                return (
                  <div
                    key={portal.id}
                    onClick={() => handleSelect(portal)}
                    className={`relative p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between group text-right ${
                      isSelected
                        ? `${theme.border} ${theme.bgLight} shadow-lg shadow-${portal.colorTheme}-950/40`
                        : `border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:${theme.borderSubtle}`
                    }`}
                  >
                    {/* Top Status Indicators & Icon Header */}
                    <div className="flex items-center justify-between mb-2 sm:mb-3.5 gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl ${theme.bgLight} border border-slate-700/60 flex items-center justify-center ${theme.text} shadow-inner shrink-0`}>
                          {renderPortalIcon(portal.iconName, "w-4 h-4 sm:w-5 sm:h-5")}
                        </div>
                        <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full border ${theme.badge}`}>
                          {portal.badge || 'درگاه فعال'}
                        </span>
                      </div>

                      {/* Active Selected Tag */}
                      {isSelected ? (
                        <div className="bg-emerald-500 text-slate-950 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-slate-950" />
                          <span>پرتال فعال</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-500 group-hover:text-slate-400 transition-colors shrink-0">
                          انتخاب ↵
                        </span>
                      )}
                    </div>

                    {/* Title & English Subtitle */}
                    <div className="space-y-0.5 mb-1.5 sm:mb-2.5">
                      <h4 className="text-sm sm:text-lg font-black text-white group-hover:text-sky-300 transition-colors leading-snug">
                        {portal.title}
                      </h4>
                      {portal.englishTitle && (
                        <span className="text-[9.5px] sm:text-[11px] text-slate-400 font-mono tracking-tight block" dir="ltr">
                          {portal.englishTitle}
                        </span>
                      )}
                    </div>

                    {/* Info & Content Body */}
                    <div className="space-y-2 flex-1">
                      {/* Description */}
                      <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-normal line-clamp-2 sm:line-clamp-none">
                        {portal.description}
                      </p>

                      {/* Key Metrics / Highlights - Hidden on small mobile to save space */}
                      {portal.metrics && portal.metrics.length > 0 && (
                        <div className="hidden sm:grid grid-cols-2 gap-1.5 py-1">
                          {portal.metrics.map((m, idx) => (
                            <div key={idx} className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/80 text-[10px]">
                              <span className="text-slate-400 block">{m.label}</span>
                              <span className={`font-black ${theme.textLight} block font-mono text-[10.5px]`}>
                                {m.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Services Checklist - Hidden on small mobile */}
                      {portal.services && portal.services.length > 0 && (
                        <div className="hidden sm:block pt-2 border-t border-slate-800/60">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">امکانات کلیدی:</span>
                          <ul className="space-y-1 text-[11px] text-slate-300">
                            {portal.services.slice(0, 3).map((service, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} mt-1.5 shrink-0`}></span>
                                <span className="leading-snug">{service}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action CTA Button */}
                    <div className="pt-3 sm:pt-4 mt-2 sm:mt-3 border-t border-slate-800/60">
                      <button
                        className={`w-full py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                          isSelected
                            ? `${theme.btn} ring-1 ring-white/20`
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                        }`}
                      >
                        <span>{portal.buttonText || `ورود به ${portal.title}`}</span>
                        {portal.targetUrl ? (
                          <ExternalLink className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-slate-800/80 text-[10px] sm:text-xs text-slate-400 shrink-0">
            {/* Toggle "Don't show again" */}
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200 transition-colors select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => {
                  setDontShowAgain(e.target.checked);
                  if (e.target.checked) {
                    try { localStorage.setItem('hide_site_switcher', 'true'); } catch (_) {}
                  } else {
                    try { localStorage.removeItem('hide_site_switcher'); } catch (_) {}
                  }
                }}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-slate-700 bg-slate-850 text-sky-600 focus:ring-sky-500 accent-sky-500 cursor-pointer"
              />
              <span>عدم نمایش خودکار این پنجره در ورودهای بعدی</span>
            </label>

            {/* Security and Network Warranty */}
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>محاسبات ۱۰۰٪ آفلاین صنعتی</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
