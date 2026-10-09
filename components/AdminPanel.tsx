import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { Card, Button, Badge } from './UIComponents';
import { BusinessProcessManager } from './BusinessProcessManager';
import { SeoStudio, ContentManager, MediaManager, IntegrationHub, ProductionSimulator, MarketSimulatorButton, BlogManager, MediaSelector } from './AdminTools';
import { 
  LayoutDashboard, Settings, Users, FileText, Database, 
  LogOut, Save, Image as ImageIcon, Calculator, Monitor, 
  Link, Trello, Printer, Trash2, Plus, Upload, BookOpen,
  Activity, Cpu, Sparkles, TrendingUp, ShieldCheck, AlertCircle, Coins, AlertTriangle,
  Clock, CheckCircle, RefreshCw, Layers, ArrowUpRight, UserCheck, Sliders,
  Bell, AlertOctagon, Edit3, Search, Megaphone, X, ChevronDown, ChevronUp, ExternalLink, Menu, Globe, FolderArchive
} from 'lucide-react';
import { Project } from '../types';
import { B2BSuite } from './B2BSuite';
import { BackupManager } from './BackupManager';
import { ZipUpdateManager } from './ZipUpdateManager';
import { parsePersianFloat, cleanPersianNumberString } from '../services/numberUtils';
import { NumericFormatInput } from './NumericFormatInput';
import { TeamManagementPanel } from './TeamManagementPanel';
import { AdminCatalogManager } from './AdminCatalogManager';
import { SliderSettingsPanel } from './SliderSettingsPanel';
import { AdminDielineAnalyzer } from './AdminDielineAnalyzer';
import { AdminSoftwareManager } from './AdminSoftwareManager';
import { PortalManagementAdmin } from './PortalManagementAdmin';


export const AdminPanel: React.FC<{ onBackToHome?: () => void; isDarkMode?: boolean }> = ({ onBackToHome, isDarkMode = false }) => {
  const { logout, user, hasPermission } = useAuth();
  const { 
    globalSettings, updateGlobalSettings, saveSettingsToHost,
    siteContent, updateSiteContent,
    pricingFormula, updatePricingFormula,
    uploadAsset,
    emergencyConfig, updateEmergencyConfig
  } = useContent();

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    const success = await saveSettingsToHost();
    setIsSavingSettings(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert('خطا در ذخیره تنظیمات');
    }
  };
  
  // Categorized tabs logic for coherent and simple admin experience
  const tabCategories = [
    {
      title: '۱. مدیریت کارگاه و تولید (CAD & Production)',
      tabs: [
        { id: 'dashboard', label: 'داشبورد کنترل کارگاه', icon: LayoutDashboard, color: 'text-indigo-400', perm: 'crmDashboard' },
        { id: 'orders', label: 'گردش کار و سفارشات (Kanban)', icon: Trello, color: 'text-amber-400', perm: 'crmDashboard' },
        { id: 'dieline_analyzer', label: 'تحلیلگر هوشمند دیلاین (CAD AI)', icon: Sliders, color: 'text-emerald-400', badge: 'جدید', perm: 'crmDashboard' },
        { id: 'templates_reset', label: 'مدیریت الگوها و ریست دیتابیس', icon: RefreshCw, color: 'text-rose-400', badge: 'یکپارچه', perm: 'crmDashboard' },
        { id: 'simulator', label: 'شبیه‌ساز چیدمان زینک و لیتوگرافی', icon: Printer, color: 'text-pink-400', perm: 'crmDashboard' }
      ]
    },
    {
      title: '۲. امور مالی و خزانه‌داری (Finance & ERP)',
      tabs: [
        { id: 'b2b_suite', label: 'پیشخوان ERP و خزانه‌داری', icon: Users, color: 'text-indigo-400', badge: 'زنده', perm: 'treasuryAndLedger' },
        { id: 'formula', label: 'الگوریتم و موتور قیمت‌گذاری', icon: Database, color: 'text-sky-400', perm: 'inquiryRateSettings' }
      ]
    },
    {
      title: '۳. محتوا، سئو و کاتالوگ (CMS & Catalog Settings)',
      tabs: [
        { id: 'software_hub', label: 'مدیریت و انتشار نرم‌افزارها', icon: Monitor, color: 'text-sky-400', badge: 'بک‌اند', perm: 'cmsContentEditing' },
        { id: 'catalogs', label: 'کاتالوگ‌ها و بروشورها (K-Book)', icon: BookOpen, color: 'text-amber-400', badge: 'جدید', perm: 'cmsContentEditing' },
        { id: 'media_library', label: 'کتابخانه رسانه‌ها (گالری)', icon: ImageIcon, color: 'text-purple-400', perm: 'cmsContentEditing' },
        { id: 'slider_settings', label: 'تنظیمات اسلایدر استودیو', icon: Monitor, color: 'text-amber-500', perm: 'cmsContentEditing' },
        { id: 'seo_manager', label: 'سئو و معرفی به موتورهای جستجو و هوش مصنوعی', icon: Globe, color: 'text-emerald-400', badge: 'جدید', perm: 'cmsContentEditing' }
      ]
    },
    {
      title: '۴. پیکربندی و امنیت سیستم (System & Settings)',
      tabs: [
        { id: 'team_accounts', label: 'کاربران و سطوح دسترسی', icon: UserCheck, color: 'text-violet-400', badge: 'دسترسی', requiresAdminRole: true },
        { id: 'emergency_banner', label: 'نوتیفیکیشن وضعیت اضطراری', icon: Bell, color: 'text-rose-400', badge: 'جدید', perm: 'cmsContentEditing' },
        { id: 'integrations', label: 'اتصال به پایانه‌ها و API', icon: Link, color: 'text-orange-400', perm: 'backupSystem' },
        { id: 'backup', label: 'پشتیبان‌گیری و ایمن‌سازی', icon: ShieldCheck, color: 'text-emerald-400', badge: 'امنیتی', perm: 'backupSystem' },
        { id: 'zip_update', label: 'مدیریت آپدیت و جایگزینی فایل زیپ', icon: FolderArchive, color: 'text-violet-400', badge: 'جدید', perm: 'backupSystem' },
        { id: 'settings', label: 'تنظیمات برندینگ و سیستم', icon: Settings, color: 'text-slate-400', perm: 'cmsContentEditing' }
      ]
    }
  ];

  // Filter categories and tabs based on permissions
  const filteredCategories = tabCategories.map(cat => ({
    ...cat,
    tabs: cat.tabs.filter(tab => {
      if (tab.requiresAdminRole) {
        return user?.role === 'ADMIN';
      }
      if (tab.perm) {
        return hasPermission(tab.perm);
      }
      return true;
    })
  })).filter(cat => cat.tabs.length > 0);

  const [activeTab, setActiveTab] = useState<'dxp' | 'dashboard' | 'orders' | 'b2b_suite' | 'team_accounts' | 'formula' | 'simulator' | 'integrations' | 'backup' | 'zip_update' | 'settings' | 'software_hub' | 'catalogs' | 'media_library' | 'slider_settings' | 'dieline_analyzer' | 'templates_reset' | 'emergency_banner' | 'seo_manager'>(() => {
    return 'dashboard';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  const toggleMobileMenu = () => {
    triggerHaptic();
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId as any);
    if (isMobileMenuOpen) {
      triggerHaptic();
      setIsMobileMenuOpen(false);
    }
  };

  // Interactive metrics state & alerts
  const [simulationAlert, setSimulationAlert] = useState<string | null>(null);

  // Admin Alert Ribbon Bar State (ریبون هشدار اختصاصی مدیریت و استعلام‌ها)
  const [showAdminRibbon, setShowAdminRibbon] = useState(true);
  const [ribbonUrgency, setRibbonUrgency] = useState<'critical' | 'warning' | 'info'>('critical');
  const [ribbonMessage, setRibbonMessage] = useState(
    '🚨 هشدار ویژه استعلام‌ها: ۱۴ استعلام جدید بدون پاسخ در صف بررسی قرار دارد! | 📈 نوسان بازار: نرخ کاغذ گلاسه و مقوای ایندربرد امروز ۵٪ افزایش یافت.'
  );
  const [isEditingRibbon, setIsEditingRibbon] = useState(false);
  const [tempRibbonMessage, setTempRibbonMessage] = useState(ribbonMessage);

  // Raw state vs simulated state toggle for production clean baseline (persisted in localStorage)
  const [isRawState, setIsRawState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ashk_is_raw_state');
      return saved !== null ? saved === 'true' : true; // Default to true (clean/raw state!)
    } catch (_) {
      return true;
    }
  });

  const toggleRawState = (val?: boolean) => {
    const nextVal = val !== undefined ? val : !isRawState;
    setIsRawState(nextVal);
    try {
      localStorage.setItem('ashk_is_raw_state', String(nextVal));
    } catch (_) {}
    if (nextVal) {
      setSimulationAlert("حالت خام (داده‌های صفر) فعال شد. تمامی آمار و داده‌های شبیه‌سازی صفر شدند.");
    } else {
      setSimulationAlert("حالت شبیه‌سازی کارگاه فعال شد (نمایش آمار آزمایشی).");
    }
    setTimeout(() => setSimulationAlert(null), 5000);
  };

  const handleResetData = () => {
    toggleRawState(true);
  };

  // Projects / Kanban orders state (cleared for production readiness)
  const [projects, setProjects] = useState<Project[]>([]);

  const handleProjectStatusChange = (id: string, newStatus: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus as any } : p));
  };

  const handleMarketSimulation = () => {
    const newPapers = [...pricingFormula.papers];
    
    // Fluctuate prices randomly to simulate operational changes
    newPapers.forEach(paper => {
      paper.weights.forEach(weight => {
        const fluctuation = 1 + (Math.random() * 0.15 - 0.03); // -3% to +12%
        weight.pricePerKg = Math.round(weight.pricePerKg * fluctuation / 100) * 100;
      });
    });

    updatePricingFormula({ papers: newPapers });
    setSimulationAlert("⚠️ جفت ارز ریال/یورو نوسان کرد! نرخ کاغذ مصرفی کارخانه بر اساس قیمت روز بورس کالا کالیبره و اعمال گردید.");
    setTimeout(() => setSimulationAlert(null), 8000);
  };

  // Modern industrial machine logs / statuses mockup
  const printingPresses = [
    { name: "ماشین افست Heidelberg Speedmaster CD 102", code: "HEI-Offset-01", status: "printing", speed: "14,500 imp/h", health: 98, operator: "مهندس علوی", color: "from-emerald-500 to-teal-600" },
    { name: "قالب‌گیر و دایکات تمام اتوماتیک Bobst ExpertCut", code: "BOB-DieCut-04", status: "setup", speed: "8,200 sheets/h", health: 94, operator: "کاشانی و رضایی", color: "from-amber-500 to-orange-600" },
    { name: "خط لیمینت حرارتی و سلفون‌کشی فول‌اتوماتیک صبا", code: "SAB-Lam-02", status: "ready", speed: "95 m/min", health: 100, operator: "نظری", color: "from-blue-500 to-indigo-600" },
    { name: "سیستم کلیشه‌سازی و خروجی زینک پیشرفته پلیت‌ستر", code: "CTP-Plate-01", status: "idle", speed: "32 plates/h", health: 89, operator: "بخش پیش از چاپ", color: "from-purple-500 to-pink-600" }
  ];

  // PricingEngine and GlobalSettingsPanel have been extracted to top-level components at the bottom of this file.

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* MOBILE HEADER (Visible only on small screens) */}
      <div className="md:hidden flex items-center justify-between p-3.5 bg-slate-950 border-b border-slate-800/80 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="font-extrabold text-white text-xs sm:text-sm">بزرگ‌راه مدیریت</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 border border-indigo-500/40 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
              title="بازگشت به سایت اصلی"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>بازگشت به سایت</span>
            </button>
          )}
          <button 
            onClick={toggleMobileMenu}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 active:scale-90 transition-all duration-200 cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE BLUR OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-md md:hidden transition-opacity duration-300 opacity-100"
          onClick={toggleMobileMenu}
        />
      )}

      {/* GLOWING AMBIENT BACKGROUND ELEMENTS FOR MODERN LOOKS */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] pointer-events-none rounded-full z-0"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/5 blur-[100px] pointer-events-none rounded-full z-0"></div>

      {/* RETHINKED DESIGNER SIDEBAR (منوی نوبل و چشم‌نواز پرتال مدیریت) */}
      <aside className={`fixed md:sticky top-0 right-0 h-screen w-72 md:w-80 bg-slate-950 border-l border-slate-800/80 p-5 flex flex-col justify-between z-50 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-y-auto ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div>
          {/* Brand/Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 rounded-2xl flex flex-col gap-3 mb-5 relative shadow-inner">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <h2 className="font-extrabold text-white text-base">بزرگ‌راه مدیریت ارشد</h2>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wider">ASHK GHALAM CORE ERP</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <span className="p-1 px-2.5 rounded-full text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold tracking-tight animate-pulse">v3.5.2 (cPanel)</span>
                <button 
                  onClick={toggleMobileMenu}
                  className="md:hidden p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* High-visibility Prominent Return to Site Button in Admin Drawer Top */}
            {onBackToHome && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onBackToHome();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer border border-indigo-400/40 active:scale-95 mt-1"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>بازگشت به سایت اصلی</span>
              </button>
            )}
          </div>

          {/* Nav Items Grouped Categorically */}
          <nav className="space-y-4 pr-1 pb-10">
            {filteredCategories.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 text-[10px] uppercase tracking-wider font-extrabold text-indigo-400/80 mb-1.5 border-r border-indigo-500/25 pr-2">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.tabs.map(tab => {
                    const IconComp = tab.icon;
                    const isSelected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-300 group active:scale-95 ${
                          isSelected 
                            ? 'bg-gradient-to-l from-indigo-600/30 via-indigo-600/15 to-indigo-950 border-r-4 border-indigo-500 text-white font-bold shadow-md shadow-indigo-500/10' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <IconComp className={`h-4.5 w-4.5 transition-transform group-hover:scale-110 ${isSelected ? tab.color : 'text-slate-505'}`} />
                          <span className="text-[12.5px] font-medium">{tab.label}</span>
                        </div>
                        {tab.badge && (
                          <span className="text-[8px] bg-indigo-500/10 text-indigo-300 border border-indigo-505/20 px-1.5 py-0.5 rounded-full font-bold">
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User context & exit handles */}
        <div className="border-t border-slate-800/80 pt-4 mt-4 bg-slate-950/80 backdrop-blur">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-900/40 mb-3 border border-slate-800/50">
            <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden ring-2 ring-indigo-500/30 flex-shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover" alt="User" />
              ) : (
                <div className="w-full h-full bg-indigo-800 flex items-center justify-center text-white font-bold text-sm">
                  {user?.name?.slice(0, 2) || 'AD'}
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-300 font-extrabold block">{user?.name || 'مدیر ارشد صنعتی'}</span>
              <span className="text-[9px] text-indigo-400 block font-mono">Ecosystem Administrator</span>
            </div>
          </div>

          <div className="space-y-1">
            {onBackToHome && (
              <button 
                onClick={onBackToHome} 
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-900 transition rounded-lg"
              >
                <ArrowUpRight className="h-4 w-4" /> بازگشت به آتلیه سایت
              </button>
            )}
            <button 
              onClick={() => { logout(); onBackToHome?.(); }} 
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 transition rounded-lg"
            >
              <LogOut className="h-4 w-4" /> خروج ایمن از حساب کاربری
            </button>
          </div>
        </div>
      </aside>

      {/* RETHINKED MAIN VIEWPORT AREA (ویترین جذاب و درخشان داشبورد جدید) */}
      <main className={`flex-1 relative z-10 dir-rtl ${activeTab === 'dxp' ? 'p-0' : 'p-6 md:p-8'}`}>
        
        {/* TOP ALERT RIBBON (ریبون هشدار سیستم و استعلام‌های فوری) */}
        {activeTab !== 'dxp' && showAdminRibbon && (
          <div className={`mb-6 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 relative overflow-hidden dir-rtl ${
            ribbonUrgency === 'critical'
              ? 'bg-gradient-to-r from-rose-950/95 via-red-900/90 to-amber-950/95 border-rose-500/60 text-white shadow-rose-950/50'
              : ribbonUrgency === 'warning'
              ? 'bg-gradient-to-r from-amber-950/95 via-orange-900/90 to-yellow-950/95 border-amber-500/60 text-amber-100 shadow-amber-950/50'
              : 'bg-gradient-to-r from-indigo-950/95 via-slate-900/90 to-blue-950/95 border-indigo-500/60 text-indigo-100 shadow-indigo-950/50'
          }`}>
            <div className="absolute top-0 right-0 w-80 h-full bg-white/5 blur-2xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 flex-1">
                <span className={`p-2.5 rounded-xl border flex-shrink-0 animate-pulse ${
                  ribbonUrgency === 'critical' 
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300' 
                    : ribbonUrgency === 'warning'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                }`}>
                  {ribbonUrgency === 'critical' && <AlertOctagon className="w-5 h-5" />}
                  {ribbonUrgency === 'warning' && <AlertTriangle className="w-5 h-5" />}
                  {ribbonUrgency === 'info' && <Bell className="w-5 h-5" />}
                </span>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs md:text-sm tracking-wide leading-relaxed">
                      {ribbonMessage}
                    </span>
                    <Badge color={ribbonUrgency === 'critical' ? 'red' : ribbonUrgency === 'warning' ? 'yellow' : 'blue'}>
                      {ribbonUrgency === 'critical' ? 'فوری / استعلام‌های معوق' : ribbonUrgency === 'warning' ? 'هشدار نوسان نرخ' : 'اطلاعیه عمومی'}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-300/80 block font-mono">
                    سامانه پایش هوشمند اشک قلم • بروزرسانی زنده صف استعلام‌ها و هزینه‌های چاپ
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => setActiveTab('orders')}
                  className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md"
                >
                  <Search className="w-3.5 h-3.5 text-amber-300" />
                  <span>مشاهده و بررسی استعلام‌ها</span>
                </button>

                <button
                  onClick={() => {
                    setTempRibbonMessage(ribbonMessage);
                    setIsEditingRibbon(!isEditingRibbon);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-slate-200 hover:text-white transition text-xs flex items-center gap-1 border border-white/10"
                  title="ویرایش متن هشدار"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تنظیم هشدار</span>
                </button>

                <button
                  onClick={() => setShowAdminRibbon(false)}
                  className="p-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-slate-300 hover:text-white transition border border-white/10"
                  title="بستن موقت ریبون"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inline Ribbon Editor Drawer */}
            {isEditingRibbon && (
              <div className="mt-4 pt-4 border-t border-white/20 space-y-3 animate-in fade-in text-xs">
                <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                  <input
                    type="text"
                    value={tempRibbonMessage}
                    onChange={(e) => setTempRibbonMessage(e.target.value)}
                    className="flex-1 w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-400 font-sans"
                    placeholder="متن پیام هشدار بالای پنل مدیریت را وارد کنید..."
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={ribbonUrgency}
                      onChange={(e) => setRibbonUrgency(e.target.value as any)}
                      className="px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-none"
                    >
                      <option value="critical">سطح بحرانی (قرمز)</option>
                      <option value="warning">سطح هشدار (نارنجی)</option>
                      <option value="info">اطلاعیه عمومی (آبی)</option>
                    </select>
                    <Button
                      size="sm"
                      onClick={() => {
                        setRibbonMessage(tempRibbonMessage);
                        setIsEditingRibbon(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      ذخیره متن ریبون
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic header with real time status indicators */}
        {activeTab !== 'dxp' && (
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/30 border border-slate-800/40 backdrop-blur-md p-5 rounded-2xl mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wide font-sans">اتصال زنده برقرار است • سرورهای محلی اشک‌قلم</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white font-sans">
              {activeTab === 'dashboard' && 'خلاصه وضعیت کارگاه'}
              {activeTab === 'orders' && 'تابلو کانبان و جریان کارگاهی'}
              {activeTab === 'catalogs' && 'آلبوم کاتالوگ‌ و بروشورهای k-BOOK'}
              {activeTab === 'media_library' && 'کتابخانه رسانه‌ها (گالری تصاویر)'}
              {activeTab === 'b2b_suite' && 'پیکربندی ماژول حسابداری مالی'}
              {activeTab === 'team_accounts' && 'مدیریت کاربران و دسترسی‌ها'}
              {activeTab === 'simulator' && 'چسباندن و بهینه‌سازی شیت لیتوگرافی'}
              {activeTab === 'integrations' && 'اتصال پایانه‌های صنعتی'}
              {activeTab === 'formula' && 'موتور قیمت‌گذاری و هزینه‌های چاپ'}
              {activeTab === 'backup' && 'پشتیبان‌گیری امن داده‌ها'}
              {activeTab === 'zip_update' && 'سامانه مدیریت آپدیت و جایگزینی فایل‌های ZIP پروژه'}
              {activeTab === 'settings' && 'طرح زنده و رنگ سیستم'}
              {activeTab === 'slider_settings' && 'پنل تنظیمات استودیو نمایش محصول'}
              {activeTab === 'emergency_banner' && 'تنظیمات نوتیفیکیشن وضعیت اضطراری بالای سایت'}
              {activeTab === 'seo_manager' && 'سئو و معرفی سایت به موتورهای جستجو و هوش مصنوعی (Google & AI Indexing)'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!showAdminRibbon && (
              <button
                onClick={() => setShowAdminRibbon(true)}
                className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Bell className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                <span>نمایش ریبون هشدار</span>
              </button>
            )}
            <button
              onClick={() => toggleRawState()}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                isRawState
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
              title={isRawState ? 'کلیک کنید تا به حالت شبیه‌سازی بازگردید' : 'صفر کردن تمام داده‌های آزمایشی'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRawState ? 'text-amber-400 animate-spin-slow' : 'text-slate-400'}`} />
              {isRawState ? 'حالت خام (داده‌های صفر فعال)' : 'ریست به حالت خام / صفر'}
            </button>
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>{new Date().toLocaleDateString('fa-IR')}</span>
            </div>
          </div>
        </header>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Visual KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'فروش روزانه و پیش‌فاکتورها', value: isRawState ? '۰ تومان' : '۱۴,۵۰۰,۰۰۰ تومان', change: isRawState ? 'آماده ثبت فاکتور جدید' : '+۱۲.۵٪ رشد امروز', bg: 'from-amber-500/10 via-amber-600/5 to-transparent', border: 'border-amber-500/20 shadow-amber-950/20', icon: Coins, iconColor: 'text-amber-400' },
                { label: 'سفارشات آماده چاپ', value: isRawState ? '۰ سفارش' : '۱۲ سفارش فعال', change: isRawState ? 'بدون سفارش صف' : '۵ فرم در صف لیتوگرافی', bg: 'from-emerald-500/10 via-emerald-600/5 to-transparent', border: 'border-emerald-500/20 shadow-emerald-950/20', icon: Printer, iconColor: 'text-emerald-400' },
                { label: 'موجودی انبار کاغذ چاپخانه', value: isRawState ? '۰ تن' : '۸۷.۵ تن کاغذ خام', change: isRawState ? 'نیازمند ثبت موجودی' : 'سطح ذخیره ایمن و مناسب', bg: 'from-blue-500/10 via-blue-600/5 to-transparent', border: 'border-blue-500/20 shadow-blue-950/20', icon: Layers, iconColor: 'text-blue-400' },
                { label: 'چک‌های صیادی دریافتی', value: isRawState ? '۰ فقره' : '۸ فقره چک برگ سبز', change: isRawState ? 'بدون چک ثبت‌شده' : 'بدون برگشتی، وضعیت پایدار', bg: 'from-purple-500/10 via-purple-600/5 to-transparent', border: 'border-purple-500/20 shadow-purple-950/20', icon: ShieldCheck, iconColor: 'text-purple-400' }
              ].map((card, idx) => {
                const CardIcon = card.icon;
                return (
                  <Card key={idx} className={`p-5 bg-gradient-to-bl ${card.bg} ${card.border} border rounded-xl relative overflow-hidden transition-all duration-300 hover:scale-[1.01]`}>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs text-slate-400 font-medium">{card.label}</span>
                      <span className={`p-1.5 bg-slate-900/60 rounded-lg ${card.iconColor}`}>
                        <CardIcon className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-lg font-bold text-white tracking-tight">{card.value}</div>
                    <div className="mt-1.5 text-[10px] text-slate-400 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {card.change}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* AI Assistant Decision Brain & Visual Activities Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* AI strategic insights */}
              <div className="lg:col-span-2 bg-gradient-to-b from-indigo-950/20 via-slate-900/40 to-slate-950 border border-indigo-500/10 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full"></div>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100 font-sans">پیشنهاد‌های هوشمند قیمت‌گذاری و تولید</h4>
                    <p className="text-[10px] text-slate-400">تحلیل نوسانات نرخ بازار کاغذ و هزینه خدمات چاپ</p>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                  {isRawState ? (
                    <div className="flex gap-2 text-xs text-slate-300 leading-relaxed font-sans p-2">
                      <span className="text-amber-400 flex-shrink-0">⚡</span>
                      <p>
                        <strong>حالت خام (داده‌های صفر) فعال است:</strong> هیچ داده شبیه‌سازی‌شده‌ای روی سیستم بارگذاری نشده است. با ثبت اولین استعلام قیمت یا سفارش مشتری، تحلیل‌ها و پیشنهادات هوشمند قیمت‌گذاری و چیدمان زینک به‌صورت زنده محاسبه خواهند شد.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 text-xs text-slate-300 leading-relaxed font-sans">
                        <span className="text-indigo-400">💡</span>
                        <p>
                          <strong>قیمت‌گذاری بهینه مقوا:</strong> با توجه به افزایش جزئی قیمت گلاسه در بازار آزاد، پیشنهاد می‌شود ضریب سودآوری را روی فرمول‌ها تنظیم کنید تا از سودآوری مطمئن شوید.
                        </p>
                      </div>
                      <div className="flex gap-2 text-xs text-slate-300 leading-relaxed font-sans border-t border-slate-900/50 pt-2.5">
                        <span className="text-amber-400">⚡</span>
                        <p>
                          <strong>بهینه‌سازی چیدمان زینک:</strong> تراکم سفارشات جعبه مقوایی بالاست. ادغام و چیدمان همزمان کارت‌ها در شبیه‌ساز لیتوگرافی، هزینه‌های ساخت زینک شما را تا ۳۰٪ کاهش می‌دهد.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Event logging stream - everyday words */}
              <div className="bg-slate-950/20 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-100 mb-3.5 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    آخرین فعالیت‌های کارگاه چاپ
                  </h4>
                  {isRawState ? (
                    <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800/80 rounded-xl my-auto">
                      هیچ فعالیتی هنوز ثبت نشده است (سیستم در حالت خام قرار دارد).
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { title: 'چک صیادی صدف زعفران ثبت شد', label: 'بخش حسابداری', time: '۱۰ دقیقه قبل', tag: 'مالی', tagColor: 'bg-indigo-500/10 text-indigo-400' },
                        { title: 'پیش‌فاکتور ملکه صدف نهایی گردید', label: 'سیستم استعلام', time: '۴۵ دقیقه قبل', tag: 'فروش', tagColor: 'bg-amber-500/10 text-amber-400' },
                        { title: 'بروزرسانی فایل قالب دیلاین مشتری', label: 'طراحی جعبه', time: '۱ ساعت قبل', tag: 'طراحی', tagColor: 'bg-purple-500/10 text-purple-400' },
                        { title: 'لیتوگرافی نوبت دوم فرم Heidelberg آغاز شد', label: 'خط تولید', time: '۳ ساعت قبل', tag: 'کارگاه', tagColor: 'bg-emerald-500/10 text-emerald-400' }
                      ].map((log, lIdx) => (
                        <div key={lIdx} className="flex gap-3 text-xs justify-between items-start border-b border-slate-900/60 pb-2.5">
                          <div className="space-y-0.5 flex-1">
                            <p className="font-medium text-slate-200 text-xs">{log.title}</p>
                            <span className="block text-[9px] text-slate-500">{log.label}</span>
                          </div>
                          <div className="text-right flex flex-col gap-1 items-end">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${log.tagColor}`}>{log.tag}</span>
                            <span className="text-[9px] text-slate-500 block whitespace-nowrap">{log.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Visual KPI Charts & Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Financial Revenue Trend Bar chart */}
              <div className="bg-slate-950/20 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2 font-sans">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      جمع فروش هفتگی و تراکنش‌های حسابداری
                    </h4>
                  </div>
                  <div className="flex h-36 items-end gap-3 px-2 border-b border-r border-slate-800/80">
                    {[
                      { day: 'شنبه', revenue: isRawState ? 0 : 65, height: isRawState ? 'h-1' : 'h-16', color: isRawState ? 'bg-slate-800' : 'bg-indigo-500 shadow-indigo-500/20' },
                      { day: 'یک‌شنبه', revenue: isRawState ? 0 : 80, height: isRawState ? 'h-1' : 'h-24', color: isRawState ? 'bg-slate-800' : 'bg-indigo-500 shadow-indigo-500/20' },
                      { day: 'دوشنبه', revenue: isRawState ? 0 : 45, height: isRawState ? 'h-1' : 'h-12', color: isRawState ? 'bg-slate-800' : 'bg-indigo-500 shadow-indigo-500/20' },
                      { day: 'سه‌شنبه', revenue: isRawState ? 0 : 95, height: isRawState ? 'h-1' : 'h-28', color: isRawState ? 'bg-slate-800' : 'bg-indigo-400 shadow-indigo-400/20' },
                      { day: 'چهارشنبه', revenue: isRawState ? 0 : 110, height: isRawState ? 'h-1' : 'h-32', color: isRawState ? 'bg-slate-800' : 'bg-gradient-to-t from-indigo-600 to-violet-500 shadow-indigo-500/20' },
                      { day: 'پنج‌شنبه', revenue: isRawState ? 0 : 50, height: isRawState ? 'h-1' : 'h-14', color: isRawState ? 'bg-slate-800' : 'bg-indigo-500 shadow-indigo-500/20' },
                    ].map((bar, bIdx) => (
                      <div key={bIdx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <div className="text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">{isRawState ? '۰ ریال' : `${bar.revenue}M ریال`}</div>
                        <div className={`w-full ${bar.height} ${bar.color} rounded-t-md transition-all duration-300 hover:brightness-110 shadow`}></div>
                        <span className="text-[9px] text-slate-400 py-1">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-3 border-t border-slate-900/40 pt-2">
                  <span>{isRawState ? 'میانگین فروش روزانه: ۰ ریال' : 'میانگین فروش روزانه کارگاه: ۷۸ میلیون ریال'}</span>
                  <span>{isRawState ? 'حالت خام فعال است' : 'بروزرسانی شده با فاکتورهای امروز'}</span>
                </div>
              </div>

              {/* Machinery Capacity Utilisation Gauge */}
              <div className="bg-slate-950/20 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2 font-sans">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      وضعیت کار لود واقعی و راندمان دستگاه‌های چاپ
                    </h4>
                  </div>
                  
                  <div className="space-y-3.5">
                    {[
                      { name: 'Heidelberg Speedmaster (دستگاه افست اصلی)', percent: isRawState ? 0 : 96, color: 'bg-emerald-500', health: isRawState ? 'آماده شروع کار (0 f/h)' : 'ساعت کار پیوسته (14,500 f/h)' },
                      { name: 'Bobst ExpertCut (دایکات اتوماتیک قالب)', percent: isRawState ? 0 : 78, color: 'bg-indigo-500', health: isRawState ? 'آماده شروع کار (0 s/h)' : 'در حال چیدمان قالب (8,200 s/h)' },
                      { name: 'Saba Lamination (سلفون‌کشی حرارتی)', percent: isRawState ? 0 : 100, color: 'bg-blue-500', health: isRawState ? 'آماده شروع کار' : 'حداکثر لود (95 m) فعال' },
                      { name: 'PlateSetter CTP (تهیه شیت لیتوگرافی)', percent: isRawState ? 0 : 35, color: 'bg-amber-500', health: isRawState ? 'آماده شروع کار' : 'آماده شروع کار بعدی' },
                    ].map((machine, mIdx) => (
                      <div key={mIdx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-300">{machine.name}</span>
                          <span className="text-slate-400 text-[9px]">{machine.health}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800/80">
                          <div className={`h-full ${machine.color} rounded-full`} style={{ width: `${machine.percent}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-3 border-t border-slate-900/40 pt-2">
                  <span>{isRawState ? 'لود دستگاه‌ها: ۰٪ (کارگاه در انتظار کار)' : 'نرخ استهلاک و وضعیت لود دستگاه‌ها متعادل است'}</span>
                  <span>{isRawState ? 'حالت خام اولیه' : 'گزارش تراز کارگاهی خودکار'}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'orders' && (
          <div className="h-full animate-in fade-in duration-200">
            {/* INQUIRY HIGHLIGHT RIBBON INSIDE ORDERS TAB */}
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border border-amber-500/40 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-lg dir-rtl">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 animate-pulse">
                  <Megaphone className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {isRawState ? 'وضعیت استعلام‌ها و صف سفارشات کارگاه' : 'هشدار ویژه استعلام‌های معوق در صف کارگاه'}
                    </span>
                    <Badge color={isRawState ? 'green' : 'yellow'}>
                      {isRawState ? '۰ استعلام معوق (صف خالی)' : '۱۴ استعلام نیازمند تایید'}
                    </Badge>
                  </div>
                  <p className="text-slate-300 mt-0.5">
                    {isRawState
                      ? 'سیستم در حالت خام آماده دریافت اولین استعلام قیمت بستر چاپ و بسته‌بندی می‌باشد.'
                      : 'استعلام‌های ثبت‌شده برای محاسبات جعبه‌های دارویی، هاردباکس و بسته‌بندی صادراتی در انتظار بررسی برآورد کاغذ و خدمات پس از چاپ می‌باشند.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end md:self-center">
                <Badge color="green">
                  {isRawState ? 'حالت خام صفر' : 'پاسخ‌دهی میانگین: ۸ دقیقه'}
                </Badge>
              </div>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80">
              <div className="text-right">
                <p className="text-white font-bold text-base">ردیابی جریان چاپ و شیت‌بندی (Kanban Operations)</p>
                <p className="text-xs text-slate-400 mt-1">پروژه‌ها را بکشید و رها کنید تا وضعیت گردش کار کارگاهی بروز شود.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs border-slate-800/80 hover:bg-slate-900/80 text-slate-300">فیلتر سفارشات فعال</Button>
                <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-bold shadow-lg shadow-indigo-600/20">ثبت نوبت دستی کارگاه</Button>
              </div>
            </div>
            <div className="bg-slate-950/20 border border-slate-800/70 p-6 rounded-3xl">
              <BusinessProcessManager />
            </div>
          </div>
        )}

        {activeTab === 'dieline_analyzer' && (
          <div className="animate-in fade-in duration-200">
            <AdminDielineAnalyzer />
          </div>
        )}

        {activeTab === 'templates_reset' && (
          <div className="animate-in fade-in duration-200">
            <TemplateAndDataControl 
              isRawState={isRawState}
              setIsRawState={setIsRawState}
              handleResetData={handleResetData}
              simulationAlert={simulationAlert}
            />
          </div>
        )}

        {activeTab === 'software_hub' && (
          <div className="animate-in fade-in duration-200">
            <AdminSoftwareManager />
          </div>
        )}

        {activeTab === 'catalogs' && (
          <div className="animate-in fade-in duration-200">
            <AdminCatalogManager />
          </div>
        )}

        {activeTab === 'media_library' && (
          <div className="animate-in fade-in duration-200">
            <MediaManager />
          </div>
        )}

        {activeTab === 'seo_manager' && (
          <div className="animate-in fade-in duration-200">
            <ContentManager />
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="animate-in fade-in duration-200 bg-slate-950/40 border border-slate-800/85 p-6 rounded-3xl text-slate-100 shadow-xl overflow-visible backdrop-blur-md">
            <ProductionSimulator />
          </div>
        )}
        
        {activeTab === 'integrations' && (
          <div className="animate-in fade-in duration-200 bg-slate-950/40 border border-slate-800/85 p-6 rounded-3xl text-slate-100 shadow-xl overflow-hidden backdrop-blur-md">
            <IntegrationHub />
          </div>
        )}

        {activeTab === 'b2b_suite' && (
          <div className="animate-in fade-in duration-200 bg-slate-950/40 border border-slate-800/85 rounded-3xl overflow-hidden shadow-xl shadow-slate-950/20">
            <B2BSuite isDarkMode={isDarkMode} />
          </div>
        )}

        {activeTab === 'team_accounts' && (
          <div className="animate-in fade-in duration-200">
            <TeamManagementPanel isDarkMode={isDarkMode} />
          </div>
        )}
        
        {activeTab === 'formula' && (
          <PricingEngine 
            pricingFormula={pricingFormula} 
            updatePricingFormula={updatePricingFormula}
            handleMarketSimulation={handleMarketSimulation}
            simulationAlert={simulationAlert}
          />
        )}

        {activeTab === 'backup' && (
          <div className="animate-in fade-in duration-200">
            <BackupManager isDarkMode={isDarkMode} />
          </div>
        )}

        {activeTab === 'zip_update' && (
          <div className="animate-in fade-in duration-200">
            <ZipUpdateManager isDarkMode={isDarkMode} />
          </div>
        )}

        {activeTab === 'settings' && (
          <GlobalSettingsPanel 
            globalSettings={globalSettings}
            updateGlobalSettings={updateGlobalSettings}
            siteContent={siteContent}
            updateSiteContent={updateSiteContent}
            uploadAsset={uploadAsset}
            isDarkMode={isDarkMode}
            onSave={handleSaveSettings}
            isSaving={isSavingSettings}
            saveSuccess={saveSuccess}
          />
        )}

        {activeTab === 'slider_settings' && (
          <Card className="p-6">
             <SliderSettingsPanel />
          </Card>
        )}

        {activeTab === 'emergency_banner' && (
          <EmergencyBannerPanel 
            config={emergencyConfig} 
            onUpdate={updateEmergencyConfig} 
          />
        )}

      </main>
    </div>
  );
};

interface PricingEngineProps {
  pricingFormula: any;
  updatePricingFormula: (update: any) => void;
  handleMarketSimulation: () => void;
  simulationAlert: string | null;
}

const PricingEngine: React.FC<PricingEngineProps> = ({
  pricingFormula,
  updatePricingFormula,
  handleMarketSimulation,
  simulationAlert
}) => (
  <div className="space-y-6 animate-in fade-in pb-12 dir-rtl text-right">
    <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-indigo-500/30 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
            <Calculator className="h-6 w-6" />
          </span>
          <h3 className="font-bold text-lg md:text-xl text-blue-100 font-sans">
            موتور پیشرفته قیمت‌گذاری الگوریتمی (Algorithm Pricing Core)
          </h3>
        </div>
        <p className="text-sm text-indigo-200 opacity-90 max-w-2xl">
          فرم‌های زیر پیکربندی زنده بهای تمام‌شده را برای شبیه‌ساز سفارشات و پنل ۳ بعدی مشتری تغییر می‌دهند. این محاسبات به فرمول‌های استهلاک، رنگ زینک و نرخ روز کاغذ کالیبره شده‌اند.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full md:w-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.confirm("آیا از بازگشت به تنظیمات کارخانه و پاک‌سازی تمام داده‌های پنل مدیریت اطمینان دارید؟")) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl transition-all font-bold text-xs"
            title="خام کردن داده‌های ماشین‌آلات"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden md:inline">خام کردن داد‌‌ه‌ها</span>
          </button>
          <MarketSimulatorButton onSimulate={handleMarketSimulation} />
        </div>
        <span className="text-[10px] text-indigo-300 text-center">شبیه‌سازی اثر شوک ارزی و بازار آزاد تهرانی</span>
      </div>
    </div>

    {simulationAlert && (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 p-4 rounded-xl flex items-center gap-3 animate-bounce">
        <span className="p-1 px-2.5 bg-amber-500/20 rounded-lg font-bold">زنده</span>
        <p className="text-xs md:text-sm font-medium">{simulationAlert}</p>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Base Machine Config */}
      <Card className="p-6 border-slate-200/80 dark:border-slate-800 shadow-md bg-white dark:bg-slate-800 rounded-2xl transition hover:shadow-lg">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
          <Cpu className="h-5 w-5 text-indigo-500" />
          <h4 className="font-bold text-slate-800 dark:text-slate-100">سربار فنی و دستمزد زینک (Machine Setups)</h4>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">هزینه ثابت زینک و ورودی لیتوگرافی (هر ورق زینک)</label>
            <div className="relative">
              <NumericFormatInput 
                value={pricingFormula.defaultMachine.plateCost}
                onChange={val => updatePricingFormula({ defaultMachine: { ...pricingFormula.defaultMachine, plateCost: val } })}
                className="w-full p-2.5 pr-4 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 font-mono"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">تومان</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">سربار آماده‌سازی و ستاپ اولیه ماشین (Make-ready Fee)</label>
            <div className="relative">
              <NumericFormatInput 
                value={pricingFormula.defaultMachine.setupCost}
                onChange={val => updatePricingFormula({ defaultMachine: { ...pricingFormula.defaultMachine, setupCost: val } })}
                className="w-full p-2.5 pr-4 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 font-mono"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">تومان</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">اجرت چاپ هر ۱,۰۰۰ دور ضرب شیت (Run Rate)</label>
            <div className="relative">
              <NumericFormatInput 
                value={pricingFormula.defaultMachine.runCostPer1000}
                onChange={val => updatePricingFormula({ defaultMachine: { ...pricingFormula.defaultMachine, runCostPer1000: val } })}
                className="w-full p-2.5 pr-4 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 font-mono"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">تومان</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Sales Config */}
      <Card className="p-6 border-slate-200/80 dark:border-slate-800 shadow-md bg-white dark:bg-slate-800 rounded-2xl transition hover:shadow-lg">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          <h4 className="font-bold text-slate-800 dark:text-slate-100">ضرایب تجاری و اضطراری</h4>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">ضریب کلی مارجین سودآوری (Profit Margin Multiplier)</label>
            <NumericFormatInput 
              value={pricingFormula.profitMargin}
              onChange={val => updatePricingFormula({ profitMargin: val })}
              className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">مثلا ۱.۲ به منزله ۲۰٪ سود ناخالص روی هزینه‌های پایه‌ است.</span>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">ضریب سفارش فوری (سربار کارهای آماده به بلیت‌ست فوری)</label>
            <NumericFormatInput 
              value={pricingFormula.rushMultiplier}
              onChange={val => updatePricingFormula({ rushMultiplier: val })}
              className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block font-semibold">اعمال سربار سختی کار در سفارش سه‌روزه.</span>
          </div>
        </div>
      </Card>
    </div>

    {/* Raw Materials - Paper Table */}
    <Card className="p-6 border-slate-200/80 dark:border-slate-800 shadow-md bg-white dark:bg-slate-800 rounded-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" />
          <h4 className="font-bold text-slate-800 dark:text-slate-100">قیمت کاغذ خام و مقوای ورقی (Paper Inventory Stock Rates)</h4>
        </div>
        <span className="text-xs bg-amber-500/10 text-amber-600 font-bold px-2 py-1 rounded-full">بر اساس قیمت بازاری ریالی تهران</span>
      </div>
      <div className="overflow-x-auto font-sans">
        <table className="w-full text-sm text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-b border-slate-200/50 dark:border-slate-800">
              <th className="p-3 font-semibold">نوع متریال</th>
              <th className="p-3 font-semibold">گرماژ پایه</th>
              <th className="p-3 font-semibold text-left">مبنای کیلوگرمی (تومان)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pricingFormula.papers.map((paper: any, pIdx: number) => (
              paper.weights.map((weight: any, wIdx: number) => (
                <tr key={`${paper.id}-${weight.grammage}`} className="hover:bg-slate-50/55 dark:hover:bg-slate-900/20 transition">
                  <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{wIdx === 0 ? paper.name : <span className="text-slate-400">└─ {paper.name}</span>}</td>
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{weight.grammage} gsm</td>
                  <td className="p-3 text-left">
                    <NumericFormatInput 
                      value={weight.pricePerKg}
                      onChange={(val) => {
                        const newPapers = [...pricingFormula.papers];
                        newPapers[pIdx].weights[wIdx].pricePerKg = val;
                        updatePricingFormula({ papers: newPapers });
                      }}
                      className="w-32 p-1.5 border rounded-lg bg-slate-50 dark:bg-slate-900 text-left text-slate-800 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    {/* Post Press Costs */}
    <Card className="p-6 border-slate-200/80 dark:border-slate-800 shadow-md bg-white dark:bg-slate-800 rounded-2xl">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
        <Layers className="h-5 w-5 text-purple-500" />
        <h4 className="font-bold text-slate-800 dark:text-slate-100">خدمات پس از چاپ و دکوراسیون بسته‌بندی</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pricingFormula.finishes.map((finish: any, idx: number) => (
          <div key={finish.id} className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition hover:ring-1 hover:ring-purple-400">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{finish.name}</span>
              <span className="text-[10px] bg-slate-200/80 dark:bg-slate-800/85 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300 font-semibold">
                {finish.type === 'sqm' ? 'هر مترمربع' : finish.type === 'fixed' ? 'هزینه ثابت' : 'هر ورق/عدد'}
              </span>
            </div>
            <div className="relative">
              <NumericFormatInput 
                value={finish.price}
                onChange={(val) => {
                  const newFinishes = [...pricingFormula.finishes];
                  newFinishes[idx].price = val;
                  updatePricingFormula({ finishes: newFinishes });
                }}
                className="w-full p-1.5 pl-10 text-sm border rounded-lg bg-white dark:bg-slate-800 font-mono text-left"
              />
              <span className="absolute left-2.5 top-2 text-[10px] text-slate-400">تومان</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

interface GlobalSettingsPanelProps {
  globalSettings: any;
  updateGlobalSettings: (update: any) => void;
  siteContent: any;
  updateSiteContent: (key: string, val: any) => void;
  uploadAsset: (file: File) => Promise<any>;
  isDarkMode: boolean;
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
}

const GlobalSettingsPanel: React.FC<GlobalSettingsPanelProps> = ({
  globalSettings,
  updateGlobalSettings,
  siteContent,
  updateSiteContent,
  uploadAsset,
  isDarkMode,
  onSave,
  isSaving,
  saveSuccess
}) => {
  const [isLogoSelectorOpen, setIsLogoSelectorOpen] = useState(false);
  const [isBgSelectorOpen, setIsBgSelectorOpen] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const asset = await uploadAsset(file);
      if (asset) updateGlobalSettings({ logoUrl: asset.data });
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const asset = await uploadAsset(file);
      if (asset) updateSiteContent('heroBackgroundUrl', asset.data);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in dir-rtl text-right font-sans">
      <Card className="p-6 border-slate-200 shadow-md bg-white dark:bg-slate-800 rounded-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 mb-4 gap-4">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
            <Monitor className="h-5 w-5 text-indigo-500" />
            پیکربندی هویت برند و جلوه‌های بصری وب‌سایت
          </h3>
          <Button 
            onClick={onSave} 
            disabled={isSaving}
            className={`flex items-center gap-2 text-sm font-bold ${saveSuccess ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saveSuccess ? 'ذخیره شد' : 'ذخیره تغییرات'}
          </Button>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">نام تجاری سامانه (عنوان هدر و تب مرورگر)</label>
            <input 
              value={globalSettings.siteName}
              onChange={e => updateGlobalSettings({ siteName: e.target.value })}
              className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo setup */}
            <div className="p-4 border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">لوگوی دیجیتال شرکت</label>
              <div className="flex flex-col gap-4">
                {globalSettings.logoUrl ? (
                  <div className="relative group w-36 h-20 bg-white/90 p-2 rounded-xl border border-slate-200 flex items-center justify-center">
                    <img src={globalSettings.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    <button onClick={() => updateGlobalSettings({ logoUrl: '' })} className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-36 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 text-xs font-mono">No Logo Selected</div>
                )}
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition">
                    <Upload className="w-4 h-4" />
                    بارگذاری مستقیم
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                  <Button variant="outline" size="sm" onClick={() => setIsLogoSelectorOpen(true)}>
                    <ImageIcon className="w-4 h-4 ml-2" />
                    انتخاب از رسانه‌ها
                  </Button>
                </div>
              </div>
            </div>

            {/* Background Setup */}
            <div className="p-4 border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">تصویر پس‌زمینه ویترین آتلیه سه‌بعدی</label>
              <div className="flex flex-col gap-4">
                {siteContent.heroBackgroundUrl ? (
                  <div className="relative group w-full h-20 rounded-xl overflow-hidden border border-slate-200">
                    <img src={siteContent.heroBackgroundUrl} alt="Hero" className="w-full h-full object-cover" />
                    <button onClick={() => updateSiteContent('heroBackgroundUrl', '')} className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-full bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 text-xs font-mono">Standard Studio Grid</div>
                )}
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition">
                    <Upload className="w-4 h-4" />
                    آپلود عکس جدید
                    <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                  </label>
                  <Button variant="outline" size="sm" onClick={() => setIsBgSelectorOpen(true)}>
                    <ImageIcon className="w-4 h-4 ml-2" />
                    کتابخانه رسانه‌ای
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">رنگ قالب برندینگ سایت (مد غنی پیش‌فرض)</label>
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border">
              <input 
                type="color"
                value={globalSettings.primaryColor}
                onChange={e => updateGlobalSettings({ primaryColor: e.target.value })}
                className="h-11 w-20 cursor-pointer rounded border"
              />
              <div className="text-right">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">{globalSettings.primaryColor}</span>
                <span className="text-[10px] text-slate-400 block">رنگ منتخب برای دکمه‌ها، زرق و برق‌ها و المان استیت کارت‌ها.</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">آدرس دکمه پرتال اشک قلم (در بخش انتخاب سایت)</label>
              <input 
                type="text"
                value={globalSettings.ashkPortalUrl || ''}
                onChange={e => updateGlobalSettings({ ashkPortalUrl: e.target.value })}
                placeholder="مثال: https://ashkghalam.ir (خالی برای تغییر بوم خودکار)"
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 font-mono text-left"
                dir="ltr"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">در صورت ورود آدرس، کلیک روی «ورود به اشک قلم» در پورتال انتخاب سایت، کاربر را به این آدرس منتقل می‌کند.</span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">آدرس دکمه پرتال بادیکاران توس (در بخش انتخاب سایت)</label>
              <input 
                type="text"
                value={globalSettings.badikaranPortalUrl || ''}
                onChange={e => updateGlobalSettings({ badikaranPortalUrl: e.target.value })}
                placeholder="مثال: https://badikaran.ir (خالی برای تغییر بوم خودکار)"
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 font-mono text-left"
                dir="ltr"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">در صورت ورود آدرس، کلیک روی «ورود به بادیکاران توس» در پورتال انتخاب سایت، کاربر را به این آدرس منتقل می‌کند.</span>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" />
              <span>تنظیمات نوتیفیکیشن پاپ‌آپ بادیکاران (خبر جدید)</span>
            </h3>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-right">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">فعال‌سازی نوتیفیکیشن خبری بادیکاران</span>
                <span className="text-[11px] text-slate-400 mt-1 block">نوتیفیکیشن پاپ‌آپ بادیکاران بعد از تاخیر زمانی معین در پایین صفحه به کاربر نمایش داده می‌شود.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={globalSettings.badikaranNotifEnabled !== false} 
                  onChange={e => updateGlobalSettings({ badikaranNotifEnabled: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
              </label>
            </div>

            {globalSettings.badikaranNotifEnabled !== false && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">عنوان نوتیفیکیشن</label>
                  <input 
                    type="text"
                    value={globalSettings.badikaranNotifTitle || ''}
                    onChange={e => updateGlobalSettings({ badikaranNotifTitle: e.target.value })}
                    placeholder="مثال: خبر جدید پورتال بادیکاران"
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">متن پیام نوتیفیکیشن</label>
                  <textarea 
                    value={globalSettings.badikaranNotifText || ''}
                    onChange={e => updateGlobalSettings({ badikaranNotifText: e.target.value })}
                    placeholder="متن پیام نوتیفیکیشن را در این بخش وارد کنید..."
                    rows={2}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">تاخیر اولیه برای نمایش (ثانیه)</label>
                  <input 
                    type="number"
                    value={globalSettings.badikaranNotifDelay !== undefined ? globalSettings.badikaranNotifDelay : 5}
                    onChange={e => updateGlobalSettings({ badikaranNotifDelay: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 font-mono text-left"
                    dir="ltr"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">مدت زمان نمایش خودکار (ثانیه)</label>
                  <input 
                    type="number"
                    value={globalSettings.badikaranNotifDuration !== undefined ? globalSettings.badikaranNotifDuration : 10}
                    onChange={e => updateGlobalSettings({ badikaranNotifDuration: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 font-mono text-left"
                    dir="ltr"
                    min={1}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. WELCOME MODAL POPUP EDITOR */}
          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span>تنظیمات و ویرایش متون پاپ‌آپ خوش‌آمدگویی (Welcome Popup)</span>
            </h3>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-right">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">فعال‌سازی پاپ‌آپ خوش‌آمدگویی ورودی کاربران</span>
                <span className="text-[11px] text-slate-400 mt-1 block">در صورت فعال بودن، در اولین ورود کاربر پاپ‌آپ خیرمقدم نمایش داده می‌شود.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={globalSettings.welcomeModalEnabled !== false} 
                  onChange={e => updateGlobalSettings({ welcomeModalEnabled: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white"></div>
              </label>
            </div>

            {globalSettings.welcomeModalEnabled !== false && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">عنوان اصلی پاپ‌آپ خوش‌آمدگویی</label>
                  <input 
                    type="text"
                    value={globalSettings.welcomeTitle || ''}
                    onChange={e => updateGlobalSettings({ welcomeTitle: e.target.value })}
                    placeholder="به اشک قلم خوش آمدید!"
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">توضیحات پاپ‌آپ خوش‌آمدگویی</label>
                  <textarea 
                    value={globalSettings.welcomeSubtitle || ''}
                    onChange={e => updateGlobalSettings({ welcomeSubtitle: e.target.value })}
                    placeholder="سامانه هوشمند طراحی و بسته‌بندی..."
                    rows={2}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">عنوان کارت اول (جعبه‌ساز ۳D)</label>
                  <input 
                    type="text"
                    value={globalSettings.welcomeBoxTitle || ''}
                    onChange={e => updateGlobalSettings({ welcomeBoxTitle: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">توضیح زیر کارت اول</label>
                  <input 
                    type="text"
                    value={globalSettings.welcomeBoxDesc || ''}
                    onChange={e => updateGlobalSettings({ welcomeBoxDesc: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">عنوان کارت دوم (استودیو آنلاین)</label>
                  <input 
                    type="text"
                    value={globalSettings.welcomeStudioTitle || ''}
                    onChange={e => updateGlobalSettings({ welcomeStudioTitle: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">توضیح زیر کارت دوم</label>
                  <input 
                    type="text"
                    value={globalSettings.welcomeStudioDesc || ''}
                    onChange={e => updateGlobalSettings({ welcomeStudioDesc: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">متن دکمه تایید / شروع</label>
                  <input 
                    type="text"
                    value={globalSettings.welcomeCtaText || ''}
                    onChange={e => updateGlobalSettings({ welcomeCtaText: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. SITE SWITCHER & MULTI-PORTAL MANAGEMENT STUDIO */}
          <PortalManagementAdmin />

          {/* 5. GENERAL SITE & INQUIRY MESSAGES EDITOR */}
          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <span>ویرایش متون عمومی، هدر، فوتر و پیام‌های ثبت استعلام</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">عنوان اصلی هیرو (Hero Title)</label>
                <input 
                  type="text"
                  value={siteContent.heroTitle || ''}
                  onChange={e => updateSiteContent('heroTitle', e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">زیرعنوان هیرو (Hero Subtitle)</label>
                <input 
                  type="text"
                  value={siteContent.heroSubtitle || ''}
                  onChange={e => updateSiteContent('heroSubtitle', e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">توضیحات هیرو صفحه اصلی</label>
                <textarea 
                  value={siteContent.heroDescription || ''}
                  onChange={e => updateSiteContent('heroDescription', e.target.value)}
                  rows={2}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">توضیحات درباره ما در فوتر</label>
                <textarea 
                  value={siteContent.footerAbout || ''}
                  onChange={e => updateSiteContent('footerAbout', e.target.value)}
                  rows={2}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">شماره تلفن تماس اصلی</label>
                <input 
                  type="text"
                  value={siteContent.contactPhone || ''}
                  onChange={e => updateSiteContent('contactPhone', e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ایمیل پشتیبانی شرکت</label>
                <input 
                  type="text"
                  value={siteContent.contactEmail || ''}
                  onChange={e => updateSiteContent('contactEmail', e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">آدرس پستی مجتمع</label>
                <input 
                  type="text"
                  value={siteContent.contactAddress || globalSettings.contactAddress || ''}
                  onChange={e => {
                    updateSiteContent('contactAddress', e.target.value);
                    updateGlobalSettings({ contactAddress: e.target.value });
                  }}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ساعات کاری مجتمع</label>
                <input 
                  type="text"
                  value={siteContent.workingHours || globalSettings.workingHours || ''}
                  onChange={e => {
                    updateSiteContent('workingHours', e.target.value);
                    updateGlobalSettings({ workingHours: e.target.value });
                  }}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">شماره واتس‌اپ پشتیبانی</label>
                <input 
                  type="text"
                  value={globalSettings.whatsappNumber || ''}
                  onChange={e => updateGlobalSettings({ whatsappNumber: e.target.value })}
                  placeholder="+989120000000"
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 font-mono text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">عنوان پاپ‌آپ موفقیت ثبت استعلام</label>
                <input 
                  type="text"
                  value={globalSettings.inquirySuccessTitle || ''}
                  onChange={e => updateGlobalSettings({ inquirySuccessTitle: e.target.value })}
                  placeholder="استعلام شما با موفقیت ثبت شد"
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">پیام پاپ‌آپ موفقیت ثبت استعلام</label>
                <input 
                  type="text"
                  value={globalSettings.inquirySuccessMessage || ''}
                  onChange={e => updateGlobalSettings({ inquirySuccessMessage: e.target.value })}
                  placeholder="پیش‌فاکتور الگوریتمی صادر گردید..."
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {isLogoSelectorOpen && (
        <MediaSelector 
          onSelect={(url) => {
            updateGlobalSettings({ logoUrl: url });
            setIsLogoSelectorOpen(false);
          }} 
          onClose={() => setIsLogoSelectorOpen(false)} 
        />
      )}
      {isBgSelectorOpen && (
        <MediaSelector 
          onSelect={(url) => {
            updateSiteContent('heroBackgroundUrl', url);
            setIsBgSelectorOpen(false);
          }} 
          onClose={() => setIsBgSelectorOpen(false)} 
        />
      )}
    </div>
  );
};

interface TemplateAndDataControlProps {
  isRawState: boolean;
  setIsRawState: React.Dispatch<React.SetStateAction<boolean>>;
  handleResetData: () => void;
  simulationAlert: string | null;
}

const TemplateAndDataControl: React.FC<TemplateAndDataControlProps> = ({
  isRawState,
  setIsRawState,
  handleResetData,
  simulationAlert
}) => {
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    const loadTemplates = () => {
      const stored = localStorage.getItem('ashk_custom_templates');
      if (stored) {
        try {
          setCustomTemplates(JSON.parse(stored));
        } catch (e) {
          console.warn(e);
        }
      }
    };
    loadTemplates();
    window.addEventListener('ashk_custom_templates_updated', loadTemplates);
    return () => window.removeEventListener('ashk_custom_templates_updated', loadTemplates);
  }, []);

  const handleDeleteTemplate = (id: string) => {
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    localStorage.setItem('ashk_custom_templates', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ashk_custom_templates_updated'));
  };

  const handleFullFactoryReset = async () => {
    try {
      localStorage.clear();
      localStorage.setItem('ashk_is_raw_state', 'true');
    } catch (_) {}

    try {
      if (window.indexedDB && window.indexedDB.databases) {
        const dbs = await indexedDB.databases();
        for (const dbInfo of dbs) {
          if (dbInfo.name) {
            indexedDB.deleteDatabase(dbInfo.name);
          }
        }
      }
    } catch (e) {
      console.warn('IndexedDB clear during factory reset:', e);
    }

    setIsRawState(true);
    setResetSuccessMessage('تمام داده‌ها، آمار آزمایشی و حافظه کش محلی صفر گردیده و سیستم به حالت خام کارخانه‌ای ریست شد.');
    setShowConfirmResetModal(false);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12 dir-rtl text-right">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-rose-500/30 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
              <RefreshCw className="h-6 w-6" />
            </span>
            <h3 className="font-bold text-lg md:text-xl text-rose-100 font-sans">
              مدیریت یکپارچه الگوها، صفر کردن داده‌های آزمایش و ریست دیتابیس
            </h3>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl">
            کنترل متمرکز تمام الگوهای ساختار جعبه، سوئیچ بین حالت خام و داده‌های شبیه‌سازی، تنظیم مجدد اعداد آزمایشی و بازنشانی کامل دیتابیس سیستم.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              const nextVal = !isRawState;
              setIsRawState(nextVal);
              try { localStorage.setItem('ashk_is_raw_state', String(nextVal)); } catch (_) {}
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
              isRawState 
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' 
                : 'bg-amber-600/30 border-amber-500 text-amber-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRawState ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isRawState ? 'حالت واقعی (داده‌های خام کارگاهی فعال)' : 'حالت آزمایشی (شبیه‌ساز فعال)'}
          </button>
        </div>
      </div>

      {simulationAlert && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{simulationAlert}</span>
        </div>
      )}

      {resetSuccessMessage && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{resetSuccessMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Template Management */}
        <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-sky-400" />
              <h4 className="font-bold text-sm text-white">مدیریت الگوهای جعبه و دایلاین‌های سفارشی</h4>
            </div>
            <Badge color="blue">{customTemplates.length} الگوی سفارشی</Badge>
          </div>

          <p className="text-xs text-slate-400">
            لیست تمام الگوها و کاتالوگ‌های سفارشی اضافه شده به سیستم. می‌توانید الگوهای اضافی را حذف کرده یا به تنظیمات کارخانه بازگردانید.
          </p>

          <div className="space-y-2 pr-1">
            {customTemplates.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                هیچ الگوی سفارشی در حافظه ثبت نشده است. استانداردهای پیش‌فرض ECMA و FEFCO فعال هستند.
              </div>
            ) : (
              customTemplates.map(t => (
                <div key={t.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-200 block">{t.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{t.code || t.id} | {t.category || 'Custom'}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition"
                    title="حذف الگو"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Section 2: Reset Test Data & Database Reset */}
        <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-rose-400" />
              <h4 className="font-bold text-sm text-white">تنظیم مجدد اعداد آزمایش و پاکسازی دیتابیس</h4>
            </div>
            <Badge color="red">عملیات حساس</Badge>
          </div>

          <p className="text-xs text-slate-400">
            برای خام‌سازی تمام اعداد شبیه‌سازی، صفر کردن تراکنش‌های آزمایشی یا پاکسازی کامل دیتابیس از کلیدهای زیر استفاده کنید.
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex justify-between items-center">
              <div>
                <span className="font-bold text-xs text-white block">صفر کردن تمام اعداد و تراکنش‌های آزمایشی</span>
                <span className="text-[10px] text-slate-400">تمام آمار نوسانات قیمت، سفارشات تست و معیارهای آزمایشی ریست می‌شوند.</span>
              </div>
              <Button size="sm" onClick={handleResetData} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold border-none">
                صفر کردن اعداد آزمایش
              </Button>
            </div>

            <div className="p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl flex justify-between items-center">
              <div>
                <span className="font-bold text-xs text-rose-300 block">ریست کامل دیتابیس و بازنشانی کارخانه‌ای</span>
                <span className="text-[10px] text-rose-400/80">پاکسازی کش محلی، حذف الگوهای سفارشی و بازیابی ساختار خام اول دوره.</span>
              </div>
              <Button size="sm" onClick={() => setShowConfirmResetModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold border-none">
                ریست کامل دیتابیس
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Confirmation Modal */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800 rounded-2xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-white">تایید بازنشانی کامل دیتابیس</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              آیا از بازنشانی کامل سیستم اطمینان دارید؟ تمام داده‌های محلی، کش الگوها و تنظیمات آزمایشی حذف شده و سیستم به حالت خام کارخانه‌ای باز می‌گردد.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowConfirmResetModal(false)} className="border-slate-700 text-slate-300">
                انصراف
              </Button>
              <Button size="sm" onClick={handleFullFactoryReset} className="bg-rose-600 hover:bg-rose-700 text-white border-none font-bold">
                بله، ریست کامل شود
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface EmergencyBannerPanelProps {
  config?: any;
  onUpdate?: (config: any) => void;
}

const EmergencyBannerPanel: React.FC<EmergencyBannerPanelProps> = ({ config, onUpdate }) => {
  const currentConfig = config || {
    enabled: false,
    message: '',
    linkText: '',
    linkUrl: '',
    backgroundColor: '#dc2626',
    viewOnly: ''
  };

  const [enabled, setEnabled] = useState(currentConfig.enabled);
  const [message, setMessage] = useState(currentConfig.message);
  const [linkText, setLinkText] = useState(currentConfig.linkText || '');
  const [linkUrl, setLinkUrl] = useState(currentConfig.linkUrl || '');
  const [backgroundColor, setBackgroundColor] = useState(currentConfig.backgroundColor || '#dc2626');
  const [viewOnly, setViewOnly] = useState(currentConfig.viewOnly || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        enabled,
        message,
        linkText: linkText.trim() ? linkText : undefined,
        linkUrl: linkUrl.trim() ? linkUrl : undefined,
        backgroundColor,
        viewOnly: viewOnly || undefined
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12 text-right dir-rtl">
      <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-48 h-48 bg-rose-500/5 blur-3xl pointer-events-none rounded-full" />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-sans">مدیریت نوتیفیکیشن وضعیت اضطراری بالای سایت</h3>
            <p className="text-xs text-slate-400 mt-1">با این ابزار می‌توانید در شرایط اضطراری یا اعلام خبر مهم، پیامی را در بالای تمامی صفحات یا یک صفحه خاص به رنگ‌های دلخواه نمایش دهید.</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Active status */}
          <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-slate-800/60">
            <div>
              <span className="font-bold text-sm text-slate-200 block">فعال بودن اعلان فوقانی</span>
              <span className="text-[11px] text-slate-400 mt-1 block">اعلان را به صورت آنی فعال یا غیرفعال کنید</span>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${enabled ? 'bg-emerald-600' : 'bg-slate-800'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Notification message */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">متن پیام اطلاع‌رسانی</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="مثال: همکاران گرامی، به علت نوسانات شدید بازار کاغذ، تمامی پیش‌فاکتورها تا اطلاع ثانوی فاقد اعتبار می‌باشند."
                className="w-full h-24 px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors font-sans resize-none"
              />
            </div>

            {/* Custom Background Color picker & select page */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">رنگ پس‌زمینه نوتیفیکیشن بار</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-12 h-10 p-1 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer"
                  />
                  <div className="flex-1 grid grid-cols-3 gap-1.5">
                    {[
                      { name: 'اضطراری (قرمز)', hex: '#dc2626' },
                      { name: 'هشدار (نارنجی)', hex: '#f97316' },
                      { name: 'اطلاعیه (آبی)', hex: '#2563eb' }
                    ].map((preset) => (
                      <button
                        key={preset.hex}
                        onClick={() => setBackgroundColor(preset.hex)}
                        className={`p-1 text-[10px] font-bold border rounded-xl transition-all ${backgroundColor === preset.hex ? 'border-indigo-500 text-white bg-indigo-500/10' : 'border-slate-800 text-slate-400 bg-slate-950/40 hover:bg-slate-900'}`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Page filter selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">نمایش تنها در صفحه خاص (اختیاری)</label>
                <select
                  value={viewOnly}
                  onChange={(e) => setViewOnly(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">همه صفحات (سایت عمومی)</option>
                  <option value="home">فقط صفحه اصلی</option>
                  <option value="dieline_generator">فقط صفحه جعبه‌ساز ۳D</option>
                  <option value="catalog">فقط صفحه کاتالوگ دیجیتال</option>
                  <option value="library">فقط صفحه کتابخانه</option>
                  <option value="about">فقط صفحه درباره ما</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Action link title */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">متن دکمه لینک اقدام (اختیاری)</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="مثال: کلیک کنید و کاتالوگ را دانلود فرمایید"
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Action link url */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">آدرس اینترنتی لینک اقدام (URL)</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="مثال: https://new.ashkghalam.ir/catalog.pdf"
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-xs text-left font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                dir="ltr"
              />
            </div>
          </div>

          {/* Action Button & Alert */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
            {saveSuccess ? (
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 animate-bounce">
                <CheckCircle className="w-4 h-4" />
                تغییرات نوتیفیکیشن وضعیت اضطراری با موفقیت ذخیره و در سایت منتشر شد!
              </span>
            ) : (
              <span className="text-slate-400 text-[11px]">با کلیک روی ذخیره، پیام جدید روی سایت فعال می‌شود.</span>
            )}
            <Button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 px-6 shadow-lg shadow-indigo-600/20"
            >
              ذخیره و انتشار اعلان فوقانی
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
