
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { loginUser, registerUser, loginGuest } from '../services/authService';
import { Button, Card, Badge } from './UIComponents';
import { 
  User, Lock, Mail, ArrowRight, Building, Upload, Camera, 
  Compass, ExternalLink, Link as LinkIcon, Box, Calculator, 
  Layers, BookOpen, ShieldCheck, Check, Sparkles, X, Plus, Trash2, ArrowUpRight
} from 'lucide-react';
import { UserRole, AppView } from '../types';

interface LoginProps {
  onBack?: () => void;
  onLoginSuccess?: (user: any) => void;
  onNavigateView?: (view: AppView) => void;
  targetRole?: UserRole; // Optional: Enforce specific role login (e.g., Admin)
}

interface CustomLink {
  id: string;
  title: string;
  url: string;
  category: string;
}

export const Login: React.FC<LoginProps> = ({ onBack, onLoginSuccess, onNavigateView, targetRole }) => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Portal Navigator Window & Link Receiver State
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const [savedLinks, setSavedLinks] = useState<CustomLink[]>(() => {
    try {
      const stored = localStorage.getItem('ashk_received_portal_links');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      { id: '1', title: 'سامانه استعلام قیمت آنلاین', url: '/inquiry', category: 'داخلی' },
      { id: '2', title: 'استودیو دیلاین CAD و قالب‌سازی', url: '/dieline', category: 'داخلی' },
      { id: '3', title: 'آلبوم نمونه کارها و کاتالوگ k-BOOK', url: '/catalog', category: 'داخلی' },
      { id: '4', title: 'پرتال B2B و خدمات همکاران لیتوگرافی', url: '/b2b', category: 'داخلی' },
      { id: '5', title: 'سایت اصلی مجموعه چاپ و جعبه‌سازی اشک قلم', url: 'https://ashkghalam.com', category: 'خارجی' },
    ];
  });

  const handleSuccess = (user: any) => {
    if (targetRole && user.role !== targetRole) {
      setError('دسترسی غیرمجاز: شما اجازه ورود به این بخش را ندارید.');
      return;
    }
    // Inject avatar if uploaded during registration
    if (!isLogin && avatarPreview) {
        user.avatar = avatarPreview;
    }
    login(user);
    if (onLoginSuccess) onLoginSuccess(user);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const res = await loginUser(username, password);
        if (res.success && res.user) {
          handleSuccess(res.user);
        } else {
          setError(res.error || 'خطا در ورود');
        }
      } else {
        const res = await registerUser({ name, username, password, companyName });
        if (res.success && res.user) {
          handleSuccess(res.user);
        } else {
          setError('خطا در ثبت نام');
        }
      }
    } catch (err) {
      setError('خطای سرور');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    const user = await loginGuest();
    handleSuccess(user);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              setAvatarPreview(ev.target?.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  // Portal Navigation Handler
  const handleNavigatePortal = (view: AppView) => {
    setShowPortalModal(false);
    if (onNavigateView) {
      onNavigateView(view);
    } else if (onBack) {
      onBack();
    }
  };

  // Custom Link Receiver Handler
  const handleLaunchReceivedLink = (urlToLaunch?: string) => {
    const target = (urlToLaunch || inputUrl).trim();
    if (!target) {
      setLinkStatus('لطفا یک آدرس اینترنتی یا مسیر داخلی وارد کنید.');
      return;
    }

    const lower = target.toLowerCase();
    
    // Check internal route mappings
    if (lower.includes('inquiry') || lower.includes('estelam') || lower === '/inquiry') {
      setLinkStatus('هدایت به سامانه استعلام قیمت...');
      setTimeout(() => handleNavigatePortal(AppView.INQUIRY), 500);
      return;
    }
    if (lower.includes('dieline') || lower.includes('cad') || lower === '/dieline') {
      setLinkStatus('هدایت به استودیو دیلاین...');
      setTimeout(() => handleNavigatePortal(AppView.DIELINE_GENERATOR), 500);
      return;
    }
    if (lower.includes('catalog') || lower.includes('kbook') || lower === '/catalog') {
      setLinkStatus('هدایت به کاتالوگ الکترونیک...');
      setTimeout(() => handleNavigatePortal(AppView.CATALOG), 500);
      return;
    }
    if (lower.includes('b2b') || lower.includes('litho') || lower === '/b2b') {
      setLinkStatus('هدایت به پرتال B2B همکاران...');
      setTimeout(() => handleNavigatePortal(AppView.B2B_SUITE), 500);
      return;
    }
    if (lower.includes('admin') || lower.includes('panel') || lower === '/admin') {
      setLinkStatus('هدایت به پنل مدیریت...');
      setTimeout(() => handleNavigatePortal(AppView.ADMIN_PANEL), 500);
      return;
    }

    // External URL
    let finalUrl = target;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
      setLinkStatus(`لینک ${finalUrl} در پنجره جدید باز شد.`);
    } catch (e) {
      setLinkStatus('امکان بازکردن مستقیم لینک وجود ندارد.');
    }
  };

  const handleSaveCustomLink = () => {
    if (!inputUrl.trim()) return;
    const newLink: CustomLink = {
      id: Date.now().toString(),
      title: inputTitle.trim() || inputUrl.trim(),
      url: inputUrl.trim(),
      category: inputUrl.startsWith('http') ? 'خارجی' : 'سفارشی'
    };
    const updated = [newLink, ...savedLinks];
    setSavedLinks(updated);
    try {
      localStorage.setItem('ashk_received_portal_links', JSON.stringify(updated));
    } catch (e) {}
    setInputUrl('');
    setInputTitle('');
    setLinkStatus('پیوند با موفقیت در فهرست لینک‌های سریع ذخیره گردید.');
  };

  const handleDeleteSavedLink = (id: string) => {
    const updated = savedLinks.filter(l => l.id !== id);
    setSavedLinks(updated);
    try {
      localStorage.setItem('ashk_received_portal_links', JSON.stringify(updated));
    } catch (e) {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 relative dir-rtl">
      <div className="absolute inset-0 bg-[url('https://picsum.photos/1920/1080?blur=5')] bg-cover bg-center opacity-10"></div>
      
      <Card className="w-full max-w-md p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setShowPortalModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition shadow-sm animate-pulse"
          >
            <Compass className="w-4 h-4 text-indigo-500" />
            <span>پنجره هدایت به بخش‌ها و لینک‌ها</span>
          </button>

          {onBack && (
            <button 
              onClick={onBack}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex items-center gap-1 text-xs"
            >
              <ArrowRight className="h-4 w-4" /> بازگشت
            </button>
          )}
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto flex items-center justify-center mb-4 text-white text-2xl font-bold shadow-lg shadow-primary-500/40">
            ا
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {targetRole === UserRole.ADMIN ? 'ورود مدیران سیستم' : (isLogin ? 'ورود به اشک قلم' : 'ایجاد حساب جدید')}
          </h1>
          <p className="text-gray-500 text-sm">
            {targetRole === UserRole.ADMIN 
              ? 'لطفا برای دسترسی به پنل مدیریت وارد شوید'
              : (isLogin ? 'برای دسترسی به پنل کاربری وارد شوید' : 'پروفایل خود را بسازید و شروع کنید')
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !targetRole && (
            <>
              {/* Progressive Profiling: Avatar Upload */}
              <div className="flex justify-center mb-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 hover:border-primary-500 cursor-pointer flex items-center justify-center relative overflow-hidden group transition-colors"
                  >
                      {avatarPreview ? (
                          <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                      ) : (
                          <Camera className="text-gray-400 group-hover:text-primary-500 w-8 h-8" />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity">
                          آپلود تصویر
                      </div>
                  </div>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">نام و نام خانوادگی</label>
                <div className="relative">
                  <User className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="w-full pr-10 pl-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">نام شرکت / برند (اختیاری)</label>
                <div className="relative">
                  <Building className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={companyName} 
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full pr-10 pl-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">نام کاربری</label>
            <div className="relative">
              <Mail className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="w-full pr-10 pl-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">رمز عبور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full pr-10 pl-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                required 
              />
            </div>
          </div>

          <Button type="submit" className="w-full shadow-lg shadow-primary-500/30" isLoading={loading}>
            {isLogin ? 'ورود به حساب' : 'ایجاد حساب کاربری'}
          </Button>
        </form>

        {!targetRole && (
          <div className="mt-6 flex flex-col gap-3 text-center">
            <button onClick={handleGuest} className="text-sm text-gray-500 hover:text-primary-600 transition-colors">
              ورود به عنوان مهمان (دسترسی محدود)
            </button>
            
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
              <div className="relative flex justify-center text-xs"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500">یا</span></div>
            </div>

            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-primary-600 font-bold hover:underline transition-all"
            >
              {isLogin ? 'حساب کاربری ندارید؟ ثبت نام کنید' : 'حساب دارید؟ وارد شوید'}
            </button>
          </div>
        )}
      </Card>

      {/* PORTAL NAVIGATOR & SITE LINK RECEIVER MODAL */}
      {showPortalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-right space-y-6 shadow-2xl relative my-8 text-white dir-rtl animate-in zoom-in-95">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                  <Compass className="w-6 h-6 animate-spin-slow" />
                </span>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-white">
                    پنجره هوشمند هدایت به بخش‌ها و لینک‌های سایت
                  </h3>
                  <p className="text-xs text-slate-400">
                    مسیریابی سریع به سامانه‌ها، دریافت لینک‌های اختصاصی و ورود به بخش‌های پرکاربرد
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPortalModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECTION 1: SITE LINK RECEIVER & URL LAUNCHER */}
            <div className="p-4 bg-slate-950/80 border border-indigo-900/40 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-xs text-indigo-200">دریافت آدرس سایت یا لینک اختصاصی</span>
                </div>
                <Badge color="blue">موتور مسیریاب زنده</Badge>
              </div>

              <div className="flex flex-col md:flex-row gap-2">
                <input 
                  type="text"
                  placeholder="عنوان پیوند (مثلاً: سایت اصلی اشک قلم)"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  className="w-full md:w-1/3 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <input 
                  type="text"
                  placeholder="آدرس لینک را وارد کنید (مثلا: /inquiry یا ashkghalam.com)"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full md:w-1/2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleLaunchReceivedLink()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5 ml-1" /> هدایت
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleSaveCustomLink}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs whitespace-nowrap"
                    title="ذخیره در میانبرها"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {linkStatus && (
                <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/40 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>{linkStatus}</span>
                </div>
              )}
            </div>

            {/* SECTION 2: PORTAL NAVIGATION CARDS (GRID OF DESTINATIONS) */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>هدایت مستقیم به بخش‌های مختلف سامانه اشک قلم</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  onClick={() => handleNavigatePortal(AppView.INQUIRY)}
                  className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 rounded-2xl cursor-pointer group transition-all duration-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-110 transition">
                      <Calculator className="w-5 h-5" />
                    </span>
                    <div>
                      <span className="font-bold text-xs text-white block group-hover:text-amber-300 transition">
                        استعلام آنلاین قیمت جعبه
                      </span>
                      <span className="text-[10px] text-slate-400">محاسبه متریال، فرم شیت و خدمات پس از چاپ</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
                </div>

                <div 
                  onClick={() => handleNavigatePortal(AppView.DIELINE_GENERATOR)}
                  className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-sky-500/50 rounded-2xl cursor-pointer group transition-all duration-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl group-hover:scale-110 transition">
                      <Box className="w-5 h-5" />
                    </span>
                    <div>
                      <span className="font-bold text-xs text-white block group-hover:text-sky-300 transition">
                        استودیو دیلاین CAD و قالب‌سازی
                      </span>
                      <span className="text-[10px] text-slate-400">طراحی ساختار ECMA و FEFCO با خروجی DXF/PDF</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition" />
                </div>

                <div 
                  onClick={() => handleNavigatePortal(AppView.CATALOG)}
                  className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 rounded-2xl cursor-pointer group transition-all duration-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition">
                      <BookOpen className="w-5 h-5" />
                    </span>
                    <div>
                      <span className="font-bold text-xs text-white block group-hover:text-emerald-300 transition">
                        آلبوم کاتالوگ الکترونیک (k-BOOK)
                      </span>
                      <span className="text-[10px] text-slate-400">مشاهده نمونه‌کارها و جلوه‌های سه‌بعدی بسته‌بندی</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
                </div>

                <div 
                  onClick={() => handleNavigatePortal(AppView.B2B_SUITE)}
                  className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl cursor-pointer group transition-all duration-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-110 transition">
                      <Layers className="w-5 h-5" />
                    </span>
                    <div>
                      <span className="font-bold text-xs text-white block group-hover:text-indigo-300 transition">
                        پرتال B2B همکاران و لیتوگرافی
                      </span>
                      <span className="text-[10px] text-slate-400">مدیریت سفارشات عمده و چیدمان زینک</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
                </div>

                <div 
                  onClick={() => handleNavigatePortal(AppView.ADMIN_PANEL)}
                  className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-rose-500/50 rounded-2xl cursor-pointer group transition-all duration-200 flex items-center justify-between col-span-1 sm:col-span-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl group-hover:scale-110 transition">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                    <div>
                      <span className="font-bold text-xs text-white block group-hover:text-rose-300 transition">
                        ورود به پنل مدیریت کارگاه و کنترل کیفیت
                      </span>
                      <span className="text-[10px] text-slate-400">ویژه اپراتورها، مدیران فروش و کارشناسان فنی</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition" />
                </div>
              </div>
            </div>

            {/* SECTION 3: SAVED QUICK LINKS LIST */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-bold block">فهرست پیوندها و میانبرهای دریافت شده:</span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {savedLinks.map(link => (
                  <div key={link.id} className="p-2 bg-slate-950/40 border border-slate-800/80 rounded-xl flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">{link.category}</span>
                      <span className="font-bold text-slate-200">{link.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono dir-ltr">{link.url}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleLaunchReceivedLink(link.url)}
                        className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                      >
                        ورود <ExternalLink className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSavedLink(link.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPortalModal(false)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                بستن پنجره
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

