import React, { useState } from 'react';
import { useContent, DEFAULT_PORTALS } from '../contexts/ContentContext';
import { PortalItemConfig } from '../types';
import { 
  Building2, Box, Printer, Laptop, Cpu, Layers, Sparkles, Globe, 
  ShieldCheck, Plus, Trash2, Edit3, Eye, RotateCcw, Check, HelpCircle,
  ExternalLink, ArrowLeft, Palette, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { renderPortalIcon, getPortalColorTheme, SiteSwitcherModal } from './SiteSwitcherModal';

export const PortalManagementAdmin: React.FC = () => {
  const { globalSettings, updateGlobalSettings } = useContent();
  const [showSmartHelp, setShowSmartHelp] = useState(false);
  const [editingPortalId, setEditingPortalId] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Available Color Themes
  const availableThemes = [
    { id: 'sky', label: 'آبی آسمانی (طراحی و CAD)', bgClass: 'bg-sky-500', textClass: 'text-sky-500' },
    { id: 'emerald', label: 'زمردی (صنعتی و افست)', bgClass: 'bg-emerald-500', textClass: 'text-emerald-500' },
    { id: 'indigo', label: 'نیلی (نرم‌افزار و IT)', bgClass: 'bg-indigo-500', textClass: 'text-indigo-500' },
    { id: 'amber', label: 'کهربایی (همکاران و B2B)', bgClass: 'bg-amber-500', textClass: 'text-amber-500' },
    { id: 'purple', label: 'بنفش لوکس (بسته‌بندی فانتزی)', bgClass: 'bg-purple-500', textClass: 'text-purple-500' },
    { id: 'rose', label: 'یاقوتی (آتلیه و گرافیک)', bgClass: 'bg-rose-500', textClass: 'text-rose-500' },
    { id: 'cyan', label: 'فیروزه‌ای نئون (تحقیق و توسعه)', bgClass: 'bg-cyan-500', textClass: 'text-cyan-500' }
  ];

  // Available Icons
  const availableIcons = [
    { id: 'Box', label: 'جعبه و بسته‌بندی' },
    { id: 'Printer', label: 'دستگاه چاپ افست' },
    { id: 'Laptop', label: 'سیستم و نرم‌افزار' },
    { id: 'Cpu', label: 'موتور پردازشگر' },
    { id: 'Building2', label: 'مجتمع و کارخانه' },
    { id: 'Layers', label: 'لایه‌ها و متریال' },
    { id: 'Sparkles', label: 'نوآوری و پریمیوم' },
    { id: 'Globe', label: 'شبکه و بین‌المللی' },
    { id: 'ShieldCheck', label: 'امنیت و کنترل کیفی' }
  ];

  // Current Portals List
  const portals: PortalItemConfig[] = (globalSettings.portalsList && globalSettings.portalsList.length > 0)
    ? globalSettings.portalsList
    : DEFAULT_PORTALS;

  const handleUpdatePortal = (id: string, updates: Partial<PortalItemConfig>) => {
    const updated = portals.map(p => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      return p;
    });
    updateGlobalSettings({ portalsList: updated });
  };

  const handleAddPortal = () => {
    const newId = 'portal_' + Date.now();
    const newPortal: PortalItemConfig = {
      id: newId,
      title: 'پرتال جدید سازمانی',
      englishTitle: 'New Organization Portal',
      tagline: 'توضیح کوتاه و ماموریت این درگاه',
      badge: 'واحد جدید',
      description: 'معرفی جامع و کامل خدمات، توانمندی‌ها و استانداردهای این واحد صنعتی یا خدماتی.',
      iconName: 'Box',
      colorTheme: 'cyan',
      services: [
        'خدمت تخصصی اول',
        'خدمت تخصصی دوم',
        'مشاوره و پشتیبانی'
      ],
      metrics: [
        { label: 'استاندارد', value: 'تضمین کیفیت' },
        { label: 'سرعت اجرا', value: 'آنی' }
      ],
      buttonText: 'ورود به درگاه',
      enabled: true,
      order: portals.length + 1
    };
    const updated = [...portals, newPortal];
    updateGlobalSettings({ portalsList: updated });
    setEditingPortalId(newId);
  };

  const handleDeletePortal = (id: string) => {
    if (portals.length <= 1) {
      alert('حداقل باید یک پرتال در سامانه فعال باشد.');
      return;
    }
    if (window.confirm('آیا از حذف این درگاه مطمئن هستید؟')) {
      const updated = portals.filter(p => p.id !== id);
      updateGlobalSettings({ portalsList: updated });
      if (editingPortalId === id) setEditingPortalId(null);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('آیا مایلید لیست پرتال‌ها و معرفی‌های درگاه به تنظیمات رسمی کارخانه بازگردانی شوند؟')) {
      updateGlobalSettings({
        portalsList: DEFAULT_PORTALS,
        siteSwitcherTitle: 'انتخاب پرتال / برند درگاه',
        siteSwitcherSubtitle: 'لطفاً درگاه تخصصی یا واحد صنعتی مورد نظر خود را جهت ورود انتخاب کنید',
        siteSwitcherEnabled: true
      });
      setEditingPortalId(null);
    }
  };

  return (
    <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 space-y-5" dir="rtl">
      {/* Header with Help & Preview Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                مدیریت پرتال‌ها و معرفی درگاه‌های انتخاب سایت (Site Switcher)
              </h3>
              <span className="text-[10px] bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                بک‌اند داینامیک
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تنظیم کارت‌ها، معرفی‌ها، خدمات، متناظر سازی آیکون‌ها و پالت رنگی هر درگاه
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Smart Help Button */}
          <button
            type="button"
            onClick={() => setShowSmartHelp(!showSmartHelp)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showSmartHelp
                ? 'bg-sky-500 text-white border-sky-400'
                : 'bg-slate-150 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700'
            }`}
            title="راهنمای هوشمند سیستم پرتال‌ها"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>راهنمای هوشمند</span>
          </button>

          {/* Live Preview Button */}
          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>پیش‌نمایش زنده پنجره</span>
          </button>

          {/* Reset Defaults Button */}
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-2.5 py-1.5 rounded-xl text-xs text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
            title="بازنشانی به تنظیمات پیش‌فرض"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Smart Help Drawer */}
      {showSmartHelp && (
        <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
          <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            <span>نکات هوشمند در تنظیم پرتال‌های درگاه:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11.5px] pr-1">
            <li><strong>رنگ‌بندی متناظر:</strong> هر واحد صنعتی با تم مشخص شناخته می‌شود (مثلاً آبی برای استودیوی CAD و ابزارهای هندسی، سبز برای تولیدات چاپ و کارتن، نیلی برای فناوری اطلاعات و نرم‌افزارها، زرد/کهربایی برای همکاری B2B).</li>
            <li><strong>آیکون‌های هماهنگ:</strong> آیکون انتخابی در هدر کارت و دکمه ورود متناسب با ماهیت خدمات واحد نمایش می‌یابد.</li>
            <li><strong>معرفی و خدمات:</strong> هر خط از خدمات به صورت آیتم بولت‌دار اختصاصی با نشانگر نوری نمایش داده می‌شود.</li>
            <li><strong>پایدارسازی داده‌ها:</strong> تمامی تغییرات اعمال‌شده بی‌درنگ در سیستم محلی و دیتابیس پایدار ذخیره می‌شوند.</li>
          </ul>
        </div>
      )}

      {/* General Settings: Title, Subtitle, Auto-Popup Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between md:col-span-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">
              فعال‌سازی نمایش خودکار پنجره در اولین مراجعه کاربر
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              در صورت فعال بودن، اگر کاربر قبلاً پرتال انتخاب نکرده باشد، پنجره انتخاب پرتال برای او باز می‌شود.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={globalSettings.siteSwitcherEnabled !== false} 
              onChange={e => updateGlobalSettings({ siteSwitcherEnabled: e.target.checked })}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            عنوان پنجره مودال
          </label>
          <input
            type="text"
            value={globalSettings.siteSwitcherTitle || ''}
            onChange={e => updateGlobalSettings({ siteSwitcherTitle: e.target.value })}
            placeholder="انتخاب پرتال / برند درگاه"
            className="w-full p-2.5 text-xs border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            زیرعنوان و متن راهنمای بالای پنجره
          </label>
          <input
            type="text"
            value={globalSettings.siteSwitcherSubtitle || ''}
            onChange={e => updateGlobalSettings({ siteSwitcherSubtitle: e.target.value })}
            placeholder="لطفاً درگاه تخصصی یا واحد صنعتی مورد نظر خود را جهت ورود انتخاب فرمایید"
            className="w-full p-2.5 text-xs border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Portals Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span>لیست پرتال‌های فعال درگاه ({portals.length} درگاه)</span>
          </h4>

          <button
            type="button"
            onClick={handleAddPortal}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن پرتال جدید</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portals.map((portal) => {
            const isEditing = editingPortalId === portal.id;
            const theme = getPortalColorTheme(portal.colorTheme);

            return (
              <div 
                key={portal.id}
                className={`p-4 rounded-2xl border-2 transition-all bg-white dark:bg-slate-900 ${
                  isEditing 
                    ? `${theme.border} ring-2 ring-${portal.colorTheme}-500/20 shadow-md` 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Portal Item Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${theme.bgLight} ${theme.text} flex items-center justify-center border border-slate-200 dark:border-slate-800 shrink-0`}>
                      {renderPortalIcon(portal.iconName, 'w-5 h-5')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug break-words">
                          {portal.title}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${theme.badge}`}>
                          {portal.badge || 'درگاه'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block break-words mt-0.5" dir="ltr">
                        {portal.englishTitle || portal.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingPortalId(isEditing ? null : portal.id)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                        isEditing 
                          ? 'bg-sky-500 text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title="ویرایش مشخصات"
                    >
                      {isEditing ? <ChevronUp className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePortal(portal.id)}
                      className="p-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="حذف پرتال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Brief Summary View */}
                {!isEditing && (
                  <div className="pt-3 space-y-2 text-xs">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px] line-clamp-2">
                      {portal.description}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>تعداد خدمات: {portal.services?.length || 0}</span>
                      <span className="flex items-center gap-1">
                        <span>تم:</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`}></span>
                      </span>
                      <span>آیکون: {portal.iconName}</span>
                    </div>
                  </div>
                )}

                {/* Expanded In-Depth Editor */}
                {isEditing && (
                  <div className="pt-4 space-y-4 text-xs border-t border-slate-100 dark:border-slate-800 mt-3">
                    {/* Basic Info Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          عنوان فارسی درگاه
                        </label>
                        <input
                          type="text"
                          value={portal.title}
                          onChange={e => handleUpdatePortal(portal.id, { title: e.target.value })}
                          className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          عنوان انگلیسی / لاتین
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={portal.englishTitle || ''}
                          onChange={e => handleUpdatePortal(portal.id, { englishTitle: e.target.value })}
                          className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          برچسب / نشان (Badge)
                        </label>
                        <input
                          type="text"
                          value={portal.badge || ''}
                          onChange={e => handleUpdatePortal(portal.id, { badge: e.target.value })}
                          placeholder="مثلاً: پرتال تخصصی ۳D & CAD"
                          className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          متن دکمه ورود (CTA)
                        </label>
                        <input
                          type="text"
                          value={portal.buttonText || ''}
                          onChange={e => handleUpdatePortal(portal.id, { buttonText: e.target.value })}
                          placeholder="ورود به درگاه"
                          className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    {/* Color Theme Selector */}
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-sky-500" />
                        <span>رنگ‌بندی متناظر اختصاصی این درگاه:</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableThemes.map(t => (
                          <button
                            type="button"
                            key={t.id}
                            onClick={() => handleUpdatePortal(portal.id, { colorTheme: t.id })}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                              portal.colorTheme === t.id
                                ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 shadow-sm font-bold'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span className={`w-3 h-3 rounded-full ${t.bgClass}`}></span>
                            <span>{t.label.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Icon Selector */}
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        آیکون متناظر این درگاه:
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {availableIcons.map(ic => {
                          const isSel = portal.iconName === ic.id;
                          return (
                            <button
                              type="button"
                              key={ic.id}
                              onClick={() => handleUpdatePortal(portal.id, { iconName: ic.id })}
                              className={`flex items-center gap-1.5 p-2 rounded-lg border text-[10.5px] transition-all cursor-pointer ${
                                isSel
                                  ? `${theme.border} ${theme.bgLight} ${theme.text} font-bold shadow-sm`
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                              }`}
                            >
                              {renderPortalIcon(ic.id, 'w-4 h-4 shrink-0')}
                              <span className="truncate">{ic.label.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        متن معرفی و ماموریت درگاه
                      </label>
                      <textarea
                        rows={2}
                        value={portal.description}
                        onChange={e => handleUpdatePortal(portal.id, { description: e.target.value })}
                        className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 leading-relaxed"
                      />
                    </div>

                    {/* Services (One per line) */}
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        امکانات و خدمات کلیدی (هر سطر یک خدمت)
                      </label>
                      <textarea
                        rows={3}
                        value={portal.services?.join('\n') || ''}
                        onChange={e => handleUpdatePortal(portal.id, { services: e.target.value.split('\n') })}
                        className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 font-sans"
                        placeholder="طراحی آنلاین جعبه و تیغ‌سازی ۳D&#10;استودیوی آنلاین گرافیک"
                      />
                    </div>

                    {/* External Link or Target URL */}
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>آدرس URL اختصاصی یا دامنه مجزا (اختیاری)</span>
                        <span className="text-[10.5px] text-slate-400 font-normal">در صورت خالی بودن، کاربر به همین پرتال وارد می‌شود</span>
                      </label>
                      <input
                        type="url"
                        dir="ltr"
                        value={portal.targetUrl || ''}
                        onChange={e => handleUpdatePortal(portal.id, { targetUrl: e.target.value })}
                        placeholder="https://badikaran.ir یا https://software.ashkghalam.ir"
                        className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingPortalId(null)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تکمیل و بستن ویرایش این درگاه</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Preview Modal */}
      <SiteSwitcherModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        activePortal="ashk"
        onSelectPortal={(p) => {
          alert(`پیش‌نمایش: پرتال «${p}» انتخاب شد.`);
          setPreviewModalOpen(false);
        }}
      />
    </div>
  );
};
