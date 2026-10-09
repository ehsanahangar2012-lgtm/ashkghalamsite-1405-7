import React, { useState, useEffect } from 'react';
import { 
  Calculator, Coins, Smartphone, Box, ShieldCheck, Download, Sparkles, CheckCircle2, 
  HelpCircle, ChevronLeft, ChevronRight, ExternalLink, Send, FileText, Check, 
  Terminal, Server, Zap, RefreshCw, Laptop, Award, PhoneCall, Sliders, Users,
  Key, AlertCircle, ArrowLeft, ArrowRight, Eye, Star, Search, Filter, Lock, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, Badge } from './UIComponents';
import { useAuth } from '../contexts/AuthContext';
import { SmartHelpButton } from './SmartHelpModal';

export interface SoftwareProduct {
  id: string;
  name: string;
  englishName: string;
  version: string;
  category: string;
  shortDesc: string;
  fullDesc: string;
  badge: string;
  color: string;
  iconName: string;
  featured: boolean;
  downloadCondition: 'free' | 'requires_registration' | 'requires_license';
  downloadUrl: string;
  downloadSize: string;
  releaseDatePersian: string;
  capabilities: string[];
  specs: {
    os: string;
    ram: string;
    gpu?: string;
    database?: string;
    offlineEngine: boolean;
  };
  plans: {
    name: string;
    price: string;
    period: string;
    features: string[];
    recommended?: boolean;
    conditionType?: 'free' | 'requires_registration' | 'requires_license';
  }[];
  catalogPages: {
    title: string;
    description: string;
    imageUrl?: string;
    highlights: string[];
    stat?: { label: string; value: string };
  }[];
}

interface SoftwareMarketplaceProps {
  onBackToHome: () => void;
  onNavigateToDieline?: () => void;
}

export const SoftwareMarketplace: React.FC<SoftwareMarketplaceProps> = ({ 
  onBackToHome 
}) => {
  const { user, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<SoftwareProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<SoftwareProduct | null>(null);
  const [catalogModalProduct, setCatalogModalProduct] = useState<SoftwareProduct | null>(null);
  const [catalogPageIndex, setCatalogPageIndex] = useState(0);

  // License Request Modal
  const [licenseModalProduct, setLicenseModalProduct] = useState<SoftwareProduct | null>(null);
  const [licenseForm, setLicenseForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    companyName: '',
    planName: ''
  });
  const [isSubmittingLicense, setIsSubmittingLicense] = useState(false);
  const [issuedLicense, setIssuedLicense] = useState<any | null>(null);

  // Download Verification Modal
  const [downloadPromptProduct, setDownloadPromptProduct] = useState<SoftwareProduct | null>(null);
  const [inputLicenseKey, setInputLicenseKey] = useState('');
  const [downloadVerificationError, setDownloadVerificationError] = useState<string | null>(null);
  const [isVerifyingDownload, setIsVerifyingDownload] = useState(false);
  const [downloadSuccessUrl, setDownloadSuccessUrl] = useState<string | null>(null);

  // Fetch software products from backend
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/software/products');
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
          return;
        }
      }
    } catch (e) {
      console.warn('Network offline or backend fetch failed, using built-in cache:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Pre-fill user data into license form if logged in
  useEffect(() => {
    if (user) {
      setLicenseForm(prev => ({
        ...prev,
        customerName: prev.customerName || user.name || '',
        customerPhone: prev.customerPhone || user.phone || '',
        customerEmail: prev.customerEmail || user.email || '',
        companyName: prev.companyName || user.companyName || ''
      }));
    }
  }, [user]);

  // Handle Download Click
  const handleInitiateDownload = async (product: SoftwareProduct) => {
    setDownloadVerificationError(null);
    setDownloadSuccessUrl(null);
    setInputLicenseKey('');

    // Case 1: Free download
    if (product.downloadCondition === 'free') {
      triggerBrowserDownload(product.downloadUrl, product.name);
      return;
    }

    // Case 2: Requires registration
    if (product.downloadCondition === 'requires_registration') {
      if (!isAuthenticated && !user) {
        setDownloadPromptProduct(product);
        return;
      }
      // If already logged in, verify with server and download
      try {
        const res = await fetch('/api/software/download/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            userEmail: user?.email || 'authenticated-user',
            userPhone: user?.phone || 'authenticated-user'
          })
        });
        const data = await res.json();
        if (data.authorized) {
          triggerBrowserDownload(data.downloadUrl || product.downloadUrl, product.name);
        } else {
          setDownloadPromptProduct(product);
          setDownloadVerificationError(data.message || 'نیاز به ورود به حساب کاربری');
        }
      } catch (err) {
        triggerBrowserDownload(product.downloadUrl, product.name);
      }
      return;
    }

    // Case 3: Requires license
    if (product.downloadCondition === 'requires_license') {
      setDownloadPromptProduct(product);
    }
  };

  const verifyLicenseAndDownload = async () => {
    if (!downloadPromptProduct) return;
    if (!inputLicenseKey.trim()) {
      setDownloadVerificationError('لطفاً کد لایسنس نرم‌افزار را وارد نمایید.');
      return;
    }

    setIsVerifyingDownload(true);
    setDownloadVerificationError(null);
    try {
      const res = await fetch('/api/software/download/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: downloadPromptProduct.id,
          licenseKey: inputLicenseKey.trim()
        })
      });
      const data = await res.json();
      if (data.authorized) {
        setDownloadSuccessUrl(data.downloadUrl || downloadPromptProduct.downloadUrl);
        triggerBrowserDownload(data.downloadUrl || downloadPromptProduct.downloadUrl, downloadPromptProduct.name);
      } else {
        setDownloadVerificationError(data.message || 'کد لایسنس نامعتبر است.');
      }
    } catch (err: any) {
      setDownloadVerificationError('خطا در اتصال به سرور محلی.');
    } finally {
      setIsVerifyingDownload(false);
    }
  };

  const triggerBrowserDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'software_download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Submit license request
  const handleSubmitLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseModalProduct) return;
    if (!licenseForm.customerName || !licenseForm.customerPhone) {
      alert('لطفاً نام و شماره تماس خود را وارد نمایید.');
      return;
    }

    setIsSubmittingLicense(true);
    try {
      const res = await fetch('/api/software/license/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: licenseModalProduct.id,
          planName: licenseForm.planName || licenseModalProduct.plans[0]?.name,
          customerName: licenseForm.customerName,
          customerPhone: licenseForm.customerPhone,
          customerEmail: licenseForm.customerEmail,
          companyName: licenseForm.companyName
        })
      });
      const data = await res.json();
      if (data.success && data.licenseKey) {
        setIssuedLicense(data);
      } else {
        alert(data.error || 'خطا در صدور لایسنس');
      }
    } catch (err: any) {
      alert('خطا در ارتباط با سرور: ' + err.message);
    } finally {
      setIsSubmittingLicense(false);
    }
  };

  // Map icon name to lucide component
  const getProductIcon = (name: string) => {
    switch (name) {
      case 'Calculator': return Calculator;
      case 'Coins': return Coins;
      case 'Smartphone': return Smartphone;
      case 'Box': return Box;
      case 'Users': return Users;
      default: return Laptop;
    }
  };

  // Filter products
  const categories = [
    { id: 'all', label: 'همه نرم‌افزارها', icon: Laptop },
    { id: 'حسابداری و مالیاتی', label: 'حسابداری و مالیاتی', icon: Calculator },
    { id: 'سامانه‌های حواله و ارزی', label: 'سامانه‌های حواله و ارزی', icon: Coins },
    { id: 'اپلیکیشن‌های کاربردی اندروید', label: 'اپلیکیشن‌های کاربردی اندروید', icon: Smartphone }
  ];

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = !searchQuery.trim() || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredProduct = products.find(p => p.featured) || products[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24" dir="rtl">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-black bg-primary-500/20 text-primary-400 border border-primary-500/30">
                  مرکز مهندسی نرم‌افزار اشک قلم
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  موتورهای ۱۰۰٪ آفلاین
                </span>
                <SmartHelpButton sectionTitle="فروشگاه تخصصی نرم‌افزار" sectionKey="software_store" />
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                سامانه‌های حسابداری، حواله ارزی و اپلیکیشن‌های اندروید
              </h1>
              
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-medium">
                توسعه‌یافته بر پایه استانداردهای امنیتی بالا، پایگاه‌های داده محلی رمزنگاری‌شده و بدون وابستگی به اینترنت خارجی یا سرویس‌های مسدودشده.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onBackToHome}
                className="px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white font-bold text-xs sm:text-sm border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>بازگشت به پرتال اصلی</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="mt-8 pt-6 border-t border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
              {categories.map(cat => {
                const CatIcon = cat.icon;
                const count = products.filter(p => cat.id === 'all' || p.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-600/30'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <CatIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام برنامه، نسخه..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Software Store Showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Spotlight Creative Hero Banner (Special Showcase) */}
        {!isLoading && activeCategory === 'all' && !searchQuery && featuredProduct && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 p-6 sm:p-8 shadow-2xl">
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" />
                    محصول منتخب و پرچمدار
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    نسخه {featuredProduct.version}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {featuredProduct.category}
                  </span>
                </div>

                <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {featuredProduct.name}
                </h2>
                
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-normal">
                  {featuredProduct.shortDesc}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>دیتابیس آفلاین رمزنگاری‌شده</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>لایسنس دائم سخت‌افزاری</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                    <Download className="w-4 h-4 text-sky-400" />
                    <span>حجم: {featuredProduct.downloadSize}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    onClick={() => handleInitiateDownload(featuredProduct)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary-600/30 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود مستقیم پکیج نصبی</span>
                  </button>

                  <button
                    onClick={() => {
                      setCatalogModalProduct(featuredProduct);
                      setCatalogPageIndex(0);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-primary-400" />
                    <span>بررسی کاتالوگ و امکانات کامل</span>
                  </button>

                  <button
                    onClick={() => {
                      setLicenseModalProduct(featuredProduct);
                      setIssuedLicense(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-xs sm:text-sm border border-amber-500/30 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>دریافت لایسنس رسمی</span>
                  </button>
                </div>
              </div>

              {/* Graphic Mockup Area */}
              <div className="lg:col-span-4 flex justify-center lg:justify-end">
                <div className="w-full max-w-xs bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-4 shadow-xl text-center space-y-3 relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary-600 mx-auto flex items-center justify-center text-white shadow-lg">
                    <Laptop className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-indigo-300 block" dir="ltr">{featuredProduct.englishName}</span>
                    <span className="text-xs font-bold text-white mt-1 block">آماده نصب روی تمام سیستم‌ها</span>
                  </div>
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 text-right space-y-1">
                    <div className="flex justify-between">
                      <span>پشتیبانی سیستم‌عامل:</span>
                      <span className="text-slate-200 font-bold">{featuredProduct.specs.os}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>پایگاه داده:</span>
                      <span className="text-emerald-400 font-bold">محلی رمزنگاری‌شده</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
            <span className="text-sm font-bold text-slate-400">در حال بارگذاری لیست نرم‌افزارهای فعال...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800 p-8">
            <Laptop className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-base text-slate-300">هیچ نرم‌افزاری در این دسته‌بندی یافت نشد</h3>
            <p className="text-xs text-slate-500 mt-1">لطفاً فیلتر جستجو را تغییر دهید.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredProducts.map((product) => {
              const IconComp = getProductIcon(product.iconName);
              return (
                <div
                  key={product.id}
                  className="bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 hover:border-slate-700/90 rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between relative group"
                >
                  {/* Top Bar inside Card */}
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${product.color} p-3 text-white flex items-center justify-center shadow-lg`}>
                          <IconComp className="w-8 h-8" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-primary-400 bg-primary-950/60 px-2 py-0.5 rounded-md border border-primary-800/40">
                              {product.version}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                              {product.category}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white mt-1 group-hover:text-primary-300 transition-colors">
                            {product.name}
                          </h3>
                          <span className="text-xs font-mono text-slate-500 block" dir="ltr">
                            {product.englishName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {product.badge}
                        </span>
                        <SmartHelpButton sectionTitle={product.name} sectionKey={product.id} description={product.fullDesc} tips={product.capabilities} />
                      </div>
                    </div>

                    {/* Short Description */}
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal mb-5">
                      {product.shortDesc}
                    </p>

                    {/* Key Technical Capabilities Checklist */}
                    <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/80 mb-5">
                      <span className="text-[11px] font-extrabold text-slate-400 block mb-2.5 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        قابلیت‌های کلیدی نرم‌افزار:
                      </span>
                      <ul className="space-y-2">
                        {product.capabilities.slice(0, 3).map((cap, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-5">{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Hardware & OS Specs Bar */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 mb-6 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                      <div>
                        <span className="text-slate-500 font-bold block">سیستم‌عامل:</span>
                        <span className="text-slate-300 font-semibold">{product.specs.os}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">حجم و تاریخ انتشار:</span>
                        <span className="text-slate-300 font-semibold">{product.downloadSize} | {product.releaseDatePersian}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Buttons */}
                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">شرط فعال‌سازی:</span>
                        <span className="text-xs font-bold text-amber-400">
                          {product.downloadCondition === 'free' ? 'دانلود آزاد و رایگان' :
                           product.downloadCondition === 'requires_registration' ? 'رایگان با عضویت در سامانه' :
                           'نیازمند تهیه لایسنس رسمی'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setCatalogModalProduct(product);
                          setCatalogPageIndex(0);
                        }}
                        className="text-xs text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1 bg-primary-950/40 hover:bg-primary-900/50 px-3 py-1.5 rounded-xl border border-primary-800/40 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>کاتالوگ تصویری و مشخصات</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        onClick={() => handleInitiateDownload(product)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>
                          {product.downloadCondition === 'requires_license' ? 'دانلود فایل نصبی (با لایسنس)' : 'دانلود مستقیم برنامه'}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setLicenseModalProduct(product);
                          setIssuedLicense(null);
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Key className="w-4 h-4 text-amber-400" />
                        <span>دریافت لایسنس و قیمت</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Software Catalog & Specs Viewer */}
      <AnimatePresence>
        {catalogModalProduct && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 border border-primary-500/30 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">کاتالوگ و مشخصات: {catalogModalProduct.name}</h3>
                    <span className="text-xs text-slate-400 font-mono" dir="ltr">{catalogModalProduct.englishName} • {catalogModalProduct.version}</span>
                  </div>
                </div>
                <button
                  onClick={() => setCatalogModalProduct(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Full Description */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs font-extrabold text-slate-400 block mb-1">معرفی جامع نرم‌افزار:</span>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {catalogModalProduct.fullDesc}
                  </p>
                </div>

                {/* Interactive Catalog Slide / Page */}
                {catalogModalProduct.catalogPages && catalogModalProduct.catalogPages.length > 0 && (
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/90 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        صفحه {catalogPageIndex + 1} از {catalogModalProduct.catalogPages.length}: {catalogModalProduct.catalogPages[catalogPageIndex].title}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={catalogPageIndex === 0}
                          onClick={() => setCatalogPageIndex(prev => Math.max(0, prev - 1))}
                          className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-30 hover:bg-slate-700 text-white cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          disabled={catalogPageIndex === catalogModalProduct.catalogPages.length - 1}
                          onClick={() => setCatalogPageIndex(prev => Math.min(catalogModalProduct.catalogPages.length - 1, prev + 1))}
                          className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-30 hover:bg-slate-700 text-white cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {catalogModalProduct.catalogPages[catalogPageIndex].description}
                    </p>

                    {catalogModalProduct.catalogPages[catalogPageIndex].highlights && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {catalogModalProduct.catalogPages[catalogPageIndex].highlights.map((hl, i) => (
                          <span key={i} className="text-[11px] bg-slate-800 text-primary-300 px-2.5 py-1 rounded-lg font-bold border border-slate-700/80">
                            ✓ {hl}
                          </span>
                        ))}
                      </div>
                    )}

                    {catalogModalProduct.catalogPages[catalogPageIndex].stat && (
                      <div className="mt-3 p-3 rounded-xl bg-primary-950/40 border border-primary-900/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">{catalogModalProduct.catalogPages[catalogPageIndex].stat?.label}</span>
                        <span className="text-xs font-black text-primary-400">{catalogModalProduct.catalogPages[catalogPageIndex].stat?.value}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Plans & Pricing Cards */}
                <div>
                  <h4 className="text-sm font-extrabold text-white mb-3 flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    پلن‌های لایسنس و قیمت‌های مصوب:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {catalogModalProduct.plans.map((plan, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border text-right ${
                          plan.recommended 
                            ? 'bg-primary-950/30 border-primary-600/60 shadow-md' 
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-extrabold text-xs text-white">{plan.name}</span>
                          {plan.recommended && (
                            <span className="text-[10px] font-black bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full">پیشنهادی</span>
                          )}
                        </div>
                        <div className="text-sm font-black text-amber-400 mb-1">{plan.price}</div>
                        <span className="text-[10px] text-slate-400 block mb-2.5">{plan.period}</span>
                        <ul className="space-y-1">
                          {plan.features.map((feat, fIdx) => (
                            <li key={fIdx} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <button
                  onClick={() => setCatalogModalProduct(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  بستن کاتالوگ
                </button>
                <button
                  onClick={() => {
                    const prod = catalogModalProduct;
                    setCatalogModalProduct(null);
                    handleInitiateDownload(prod);
                  }}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-primary-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود مستقیم این برنامه</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Request & Issue License Modal */}
      <AnimatePresence>
        {licenseModalProduct && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">دریافت لایسنس و فعال‌سازی آنلاین</h3>
                    <span className="text-xs text-slate-400 font-medium">{licenseModalProduct.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => setLicenseModalProduct(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                {issuedLicense ? (
                  <div className="space-y-5 text-center">
                    <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                      <CheckCircle className="w-8 h-8" />
                    </div>

                    <h4 className="text-lg font-black text-white">لایسنس با موفقیت صادر گردید</h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                      کد فعال‌سازی اختصاصی شما در سرور محلی ثبت شد. این کد را در اولین اجرای نرم‌افزار وارد نمایید.
                    </p>

                    {/* License Box */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 text-center font-mono">
                      <span className="text-[10px] text-amber-400 uppercase tracking-widest block mb-1 font-sans">کد لایسنس اختصاصی شما:</span>
                      <div className="text-lg sm:text-xl font-bold text-amber-300 select-all tracking-wider" dir="ltr">
                        {issuedLicense.licenseKey}
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-right space-y-1">
                      <div><strong className="text-slate-200">دارنده لایسنس:</strong> {issuedLicense.license?.customerName}</div>
                      <div><strong className="text-slate-200">شماره ثبت شده:</strong> {issuedLicense.license?.customerPhone}</div>
                      <div><strong className="text-slate-200">نسخه پلن:</strong> {issuedLicense.license?.planName}</div>
                      <div><strong className="text-slate-200">تاریخ صدور (شمسی):</strong> ۱۴۰۴/۰۶/۲۸</div>
                    </div>

                    <div className="flex gap-2 pt-3">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(issuedLicense.licenseKey);
                          alert('کد لایسنس در حافظه کپی شد.');
                        }}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                      >
                        کپی کردن کد لایسنس
                      </button>
                      <button
                        onClick={() => {
                          const url = issuedLicense.downloadUrl || licenseModalProduct.downloadUrl;
                          setLicenseModalProduct(null);
                          triggerBrowserDownload(url, licenseModalProduct.name);
                        }}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30"
                      >
                        <Download className="w-4 h-4" />
                        <span>دانلود مستقیم برنامه</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitLicense} className="space-y-4 text-right">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">انتخاب نسخه / پلن:</label>
                      <select
                        value={licenseForm.planName}
                        onChange={e => setLicenseForm({ ...licenseForm, planName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                      >
                        {licenseModalProduct.plans.map((p, i) => (
                          <option key={i} value={p.name}>
                            {p.name} - ({p.price})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1.5">نام و نام خانوادگی متقاضی *:</label>
                        <input
                          type="text"
                          required
                          value={licenseForm.customerName}
                          onChange={e => setLicenseForm({ ...licenseForm, customerName: e.target.value })}
                          placeholder="مثلاً: احمد رضایی"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1.5">شماره موبایل فعال *:</label>
                        <input
                          type="tel"
                          required
                          value={licenseForm.customerPhone}
                          onChange={e => setLicenseForm({ ...licenseForm, customerPhone: e.target.value })}
                          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1.5">نام شرکت یا صرافی (اختیاری):</label>
                        <input
                          type="text"
                          value={licenseForm.companyName}
                          onChange={e => setLicenseForm({ ...licenseForm, companyName: e.target.value })}
                          placeholder="شرکت تجاری..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1.5">ایمیل (جهت ارسال نسخه پشتیبان لایسنس):</label>
                        <input
                          type="email"
                          value={licenseForm.customerEmail}
                          onChange={e => setLicenseForm({ ...licenseForm, customerEmail: e.target.value })}
                          placeholder="info@example.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                      💡 لایسنس صادرشده دارای کلید هش ۲۵۶ بیتی بوده و به صورت کاملاً مستقل از اینترنت روی سیستم محلی شما فعال می‌گردد.
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setLicenseModalProduct(null)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingLicense}
                        className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-lg shadow-amber-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingLicense ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                        <span>صدور و فعال‌سازی فوری لایسنس</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Download Condition Check Prompt */}
      <AnimatePresence>
        {downloadPromptProduct && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-right space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 border border-primary-500/30 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">شرط دانلود: {downloadPromptProduct.name}</h3>
                  <span className="text-[11px] text-slate-400">اعتبارسنجی سطح دسترسی دانلود</span>
                </div>
              </div>

              {downloadPromptProduct.downloadCondition === 'requires_registration' ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    دانلود این نرم‌افزار برای کلیه کاربران عضو و ثبت‌نام‌شده در سامانه اشک قلم کاملاً رایگان است. لطفاً وارد حساب کاربری خود شوید یا اطلاعات اولیه را وارد فرمایید.
                  </p>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">ثبت سریع جهت دانلود:</span>
                    <input
                      type="text"
                      placeholder="شماره موبایل یا ایمیل شما..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setDownloadPromptProduct(null)}
                      className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={() => {
                        triggerBrowserDownload(downloadPromptProduct.downloadUrl, downloadPromptProduct.name);
                        setDownloadPromptProduct(null);
                      }}
                      className="flex-1 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold cursor-pointer"
                    >
                      ورود و دانلود فایل
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    این نرم‌افزار نیازمند لایسنس معتبر است. در صورتی که قبلاً لایسنس دریافت کرده‌اید، کد آن را وارد فرمایید؛ در غیر این صورت می‌توانید به سادگی لایسنس آنلاین صادر کنید.
                  </p>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">کد لایسنس فعال‌سازی:</label>
                    <input
                      type="text"
                      value={inputLicenseKey}
                      onChange={e => setInputLicenseKey(e.target.value)}
                      placeholder="ASHK-XXXX-YYYY-ZZZZ-WWWW"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-center text-amber-300 outline-none focus:border-amber-500"
                      dir="ltr"
                    />
                  </div>

                  {downloadVerificationError && (
                    <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-[11px]">
                      {downloadVerificationError}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        const prod = downloadPromptProduct;
                        setDownloadPromptProduct(null);
                        setLicenseModalProduct(prod);
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                    >
                      دریافت لایسنس جدید
                    </button>
                    <button
                      onClick={verifyLicenseAndDownload}
                      disabled={isVerifyingDownload}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingDownload ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span>تایید و دانلود</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
