import React, { useState, useEffect } from 'react';
import { 
  Box, Calculator, BookOpen, Users, Cpu, ShieldAlert, CheckCircle, 
  Sparkles, Layers, DollarSign, TrendingUp, Anchor, Globe, FileText, 
  Percent, ArrowLeft, ArrowRight, Download, Server, WifiOff, AlertTriangle, 
  HelpCircle, Trash, RefreshCw, BarChart2, Star, Eye, Sliders,
  UserCheck, Landmark, ShieldCheck, Wallet, Activity, CreditCard, Clock, FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parsePersianFloat } from '../services/numberUtils';
import { Button, Card, Badge } from './UIComponents';
import { NumericFormatInput } from './NumericFormatInput';
import { 
  B2BEnterpriseProvider, MembersTab, CrmTab, TreasuryTab, ReceiptsTab, ContractsTab, ERPIntegrationTab, Member 
} from './B2BERPModules';

export const B2BSuite: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<
    'configurator' | 'profit' | 'standards' | 'marketplace' | 'ai_gateway' | 'architecture' |
    'members' | 'crm' | 'treasury' | 'receipts' | 'contracts' | 'erp_integration'
  >('configurator');

  // --- MEMBER INITIAL STATE FOR ERP INHERITANCE ---
  const [members, setMembers] = useState<Member[]>([
    { id: 'MEM-01', name: 'مهندس احسان آهنگر', companyName: 'زعفران قائنات عتیق', role: 'Customer', nationalId: '۰۹۲۳۴۸۱۷۲', economicCode: '۴۱۱۵۶۸۹۴۳', phone: '۰۹۱۲۴۸۱۹۲۳۴', email: 'ehsanahangar2010@gmail.com', creditLimit: 25000000, walletBalance: 4500000, membershipLevel: 'Gold', history: ['عضویت طلایی ثبت شد', 'پیش‌پرداخت سفارش فولدینگ کارتن: ۱.۵ میلیون'], riskScore: 0, outstandingDebt: 0 },
    { id: 'MEM-02', name: 'سهراب زارعی', companyName: 'چاپخانه خلیج‌فارس کاشان', role: 'Sales Partner', nationalId: '۱۰۳۲۴۹۸۲۳', economicCode: '---', phone: '۰۹۳۵۴۸۲۶۳۹۴', email: 'sohrab@kashanprint.ir', creditLimit: 10000000, walletBalance: 1200000, membershipLevel: 'Silver', history: ['عضویت نقره‌ای ثبت شد'], riskScore: 0, outstandingDebt: 0 },
    { id: 'MEM-03', name: 'امین کاظمی', companyName: 'استودیو طراحی امین هنر', role: 'Designer', nationalId: '۱۲۹۳۸۴۷۵۶', economicCode: '---', phone: '۰۹۱۹۴۸۲۷۳۶۴', email: 'art_amin@outlook.com', creditLimit: 5000000, walletBalance: 2450000, membershipLevel: 'Standard', history: ['عضویت مستقل ثبت شد'], riskScore: 0, outstandingDebt: 0 }
  ]);

  // --- 1. CONFIGURATOR STATE ---
  const [productType, setProductType] = useState('saffron');
  const [length, setLength] = useState(12);
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(4);
  const [weight, setWeight] = useState(50); // grams
  const [quantity, setQuantity] = useState(2000);
  const [industry, setIndustry] = useState('food');
  const [budget, setBudget] = useState('high'); // premium, standard, economical

  // Configurator recommendations
  const getRecommendation = () => {
    let packagingType = 'جعبه تاشو مقوایی (Folding Carton)';
    let material = 'ایندربرد بهداشتی ۳۰۰ گرم با روکش مات';
    let printingMethod = 'چاپ افست ۴ رنگ ترکیبی چشمی';
    let finishing = 'امباس (برجسته‌سازی) + طلاکوب داغ';
    let baseCost = 4200; // Toman per unit
    let time = '۸ روز کاری';

    if (productType === 'saffron') {
      packagingType = 'جعبه لوکس سخت آهنربایی (Hardbox)';
      material = 'گالینگور مخملی روی هاردبورد متراکم ۲ میلی‌متری';
      printingMethod = 'چاپ افست ۲ رنگ پنتون اختصاصی';
      finishing = 'طلاکوب داغ طلایی + یووی موضعی برجسته';
      baseCost = 14500;
      time = '۱۲ روز کاری';
    } else if (productType === 'perfume' || budget === 'high') {
      packagingType = 'جعبه فانتزی کشویی با منقسم کرافت';
      material = 'مقوای کرافت سوئدی ۳۵۰ گرم درجه یک';
      printingMethod = 'چاپ افست تک‌رنگ مشکی صحافی';
      finishing = 'سلفون مات حرارتی + لوگوی برجسته بی‌رنگ';
      baseCost = 8900;
      time = '۱۰ روز کاری';
    } else if (weight > 1000 || quantity >= 5000) {
      packagingType = 'کارتن لمینتی ۳ لایه دایکاتی E-Flute';
      material = 'کارتن کرافت قهوه‌ای پشت سفید + پوستر ۱8۰ گرم';
      printingMethod = 'چاپ افست سلفون براق مجهز به خط قالب';
      finishing = 'خط تا دقیق + چسب لبه اتوماتیک';
      baseCost = 2800;
      time = '۷ روز کاری';
    } else if (budget === 'economical') {
      packagingType = 'جعبه مقوایی ساده کیبوردی';
      material = 'مقوای پشت طوسی ۲۸۰ گرم معمولی';
      printingMethod = 'چاپ افست ۲ رنگ ترکیبی اقتصادی';
      finishing = 'وارنیش محافظ ساده بدون سلفون';
      baseCost = 1900;
      time = '۵ روز کاری';
    }

    const totalCost = baseCost * quantity;
    return { packagingType, material, printingMethod, finishing, baseCost, totalCost, time };
  };

  const recommendation = getRecommendation();

  // --- 2. PROFIT CALCULATOR STATE ---
  const [productCost, setProductCost] = useState(150000); // Cost of raw product (e.g. saffron grams)
  const [marketPrice, setMarketPrice] = useState(420000); // B2C Selling price
  const [marketingCost, setMarketingCost] = useState(30000); // Per unit marketing
  const [shippingCost, setShippingCost] = useState(25000); // Shipping/handling per unit
  const [calcQuantity, setCalcQuantity] = useState(1000); // Sale volume

  // Profit calculation logic
  const packagingUnitCost = recommendation.baseCost;
  const totalProductionCostPerUnit = Number(productCost) + Number(packagingUnitCost) + Number(marketingCost) + Number(shippingCost);
  const profitPerUnit = Number(marketPrice) - totalProductionCostPerUnit;
  const breakEvenUnits = marketPrice > 0 ? Math.ceil((packagingUnitCost * calcQuantity) / (marketPrice - productCost - marketingCost - shippingCost)) : 0;
  
  const totalRevenue = marketPrice * calcQuantity;
  const totalGrossCost = totalProductionCostPerUnit * calcQuantity;
  const netProfit = profitPerUnit * calcQuantity;
  const profitMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // --- 3. EXPORT STANDARDS DATA ---
  const exportStandards = [
    {
      country: 'اتحادیه اروپا (EU)',
      flag: '🇪🇺',
      standards: [
        { title: 'استاندارد بازیافت و زیست‌محیطی', desc: 'استفاده از مقواهای دارای تاییدیه FSC و رنگ‌های پایه گیاهی بدون حلال مخرب.' },
        { title: 'کدهای شناسایی بسته‌بندی', desc: 'درج نماد PAP 21 برای مقوای معمولی و PAP 20 برای کاغذ کرافت صادراتی.' },
        { title: 'استاندارد ایمنی تماس با غذا (FDA EU)', desc: 'برای بسته‌بندی چای، زعفران و خشکبار، لایه داخلی جعبه نباید شامل سرب یا پلاستیک‌های سنگین باشد.' }
      ]
    },
    {
      country: 'کشورهای حوزه خلیج فارس (GCC)',
      flag: '🇸🇦',
      standards: [
        { title: 'برچسب‌گذاری دو زبانه', desc: 'درج مشخصات محصول، تاریخ تولید و انقضا به دو زبان عربی و انگلیسی الزامی است.' },
        { title: 'مقاومت در برابر رطوبت بالا', desc: 'نیاز به سلفون حرارتی مقاوم یا روکش متالایز برای جلوگیری از دفرمه شدن جعبه در بنادر گرم.' },
        { title: 'ابعاد پالت استاندارد خلیج فارس', desc: 'کارتن‌های مادر (Master Carton) باید با پالت‌های ۱۲۰x۱۰۰ سانتی‌متر هماهنگ باشند.' }
      ]
    },
    {
      country: 'شرق آسیا و چین',
      flag: '🇨🇳',
      standards: [
        { title: 'استاندارد لوکس کادویی', desc: 'در فرهنگ شرقی، بسته‌بندی با تم رنگ‌های قرمز، طلایی و بنفش سلطنتی شانس فروش را افزایش می‌دهد.' },
        { title: 'قوانین ضد بسته‌بندی مفرط (Excessive Packaging)', desc: 'حجم فضای خالی داخل جعبه کادویی نباید بیش از ۳۰٪ کل فضای جعبه باشد.' },
        { title: 'سیستم ثبت بارکد دو بعدی', desc: 'تسهیل رهگیری اصالت محصول از طریق کیوآرکدهای منطبق با گمرک چین.' }
      ]
    }
  ];

  // --- 4. DESIGNER MARKETPLACE STATE ---
  const initialTemplates = [
    { id: 1, title: 'قالب جعبه خشابی عطر لوکس شیشه‌ای', designer: 'امین کاظمی', downloads: 142, rating: 4.8, price: '۳۵۰,۰۰۰ تومان', category: 'آرایشی', likes: 24, dielineType: 'Slide-out Box' },
    { id: 2, title: 'کارتن دربدار کیبوردی لوازم الکترونیکی', designer: 'مریم سهرابی', downloads: 89, rating: 4.9, price: 'رایگان (عمومی)', category: 'صنعتی', likes: 45, dielineType: 'Keyboard Box' },
    { id: 3, title: 'جعبه هاردباکس ۳ تکه شکلات و شیرینی صادراتی', designer: 'سهراب راد', downloads: 210, rating: 4.7, price: '۵۰۰,۰۰۰ تومان', category: 'شیرینی و خشکبار', likes: 78, dielineType: 'Hardbox 3-Piece' },
    { id: 4, title: 'بسته‌بندی پاکت کاغذی فانتزی دسته‌دار دایکاتی', designer: 'زهرا تهرانی', downloads: 67, rating: 4.5, price: '۱۸۰,۰۰۰ تومان', category: 'پاکت', likes: 12, dielineType: 'Shopping Bag' }
  ];
  const [templates, setTemplates] = useState(initialTemplates);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('آرایشی');
  const [newTemplatePrice, setNewTemplatePrice] = useState('رایگان');

  const handleUploadTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim()) return;
    const item = {
      id: Date.now(),
      title: newTemplateTitle,
      designer: 'کاربر طراح (شما)',
      downloads: 0,
      rating: 5.0,
      price: newTemplatePrice === 'رایگان' ? 'رایگان' : `${newTemplatePrice} تومان`,
      category: newTemplateCategory,
      likes: 0,
      dielineType: 'Custom Box'
    };
    setTemplates([item, ...templates]);
    setNewTemplateTitle('');
  };

  // --- 5. AI RESILIENCY / GATEWAY STATE ---
  const [offlineMode, setOfflineMode] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'claude' | 'ollama' | 'deepseek'>('gemini');
  const [gatewayLogs, setGatewayLogs] = useState<string[]>([
    'درگاه هوش مصنوعی اشک قلم بارگذاری شد.',
    'وضعیت اینترنت: متصل به شبکه ملی اطلاعات (NIN).',
    'ارائه‌دهنده فعال: Google Gemini 1.5 Pro پروکسی‌شده سرور.',
  ]);

  const toggleOfflineMode = () => {
    setOfflineMode(!offlineMode);
    if (!offlineMode) {
      setGatewayLogs(prev => [
        `[آفلاین] حالت آفلاین ملی فعال شد. ارتباط گیت‌وی با خارج قطع شد.`,
        `[سیستم] سوییچ اتوماتیک به موتور بومی پردازش آفلاین (Local Engine Core).`,
        `[موتور] قوانین آفلاین با موفقیت بارگذاری شدند. آماده پردازش بدون نیاز به اینترنت.`,
        ...prev
      ]);
    } else {
      setGatewayLogs(prev => [
        `[آنلاین] بازگشت به حالت عادی اینترنت.`,
        `[سیستم] اتصال موفقیت‌آمیز به گیت‌وی پشتیبان هوش مصنوعی.`,
        ...prev
      ]);
    }
  };

  const handleProviderChange = (prov: any) => {
    if (offlineMode) return;
    setAiProvider(prov);
    setGatewayLogs(prev => [
      `[گیت‌وی] ارائه‌دهنده هوش مصنوعی به صورت دستی به ${prov.toUpperCase()} تعویض شد.`,
      `[گیت‌وی] همگام‌سازی توکن و احراز هویت با موفقیت انجام شد.`,
      ...prev
    ]);
  };

  return (
    <B2BEnterpriseProvider>
      <div className="max-w-7xl mx-auto p-4 md:p-8 dir-rtl text-right">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-800 rounded-3xl p-6 md:p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full translate-x-24 translate-y-24"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge color="red" className="animate-pulse flex items-center gap-1 bg-red-500/20 text-red-300 border-red-500/40">
                <Cpu className="w-3 h-3" /> مجهز به هوش صنعتی دایکات
              </Badge>
              {offlineMode && (
                <Badge color="gold" className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border-amber-500/40">
                  <WifiOff className="w-3 h-3" /> حالت آفلاین تاب‌آور
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-black mb-2">سامانه هوشمند B2B و مدیریت پایداری</h1>
            <p className="text-white/80 max-w-2xl text-sm leading-relaxed">
              بستر تخصصی بهینه‌سازی فرمول کاغذ و مقوا، محاسبه حاشیه سود محصولات صادراتی، و کنترل هوشمند پردازش ابری هوش مصنوعی در شرایط اختلال اینترنت بین‌المللی.
            </p>
          </div>
          <button
            onClick={toggleOfflineMode}
            className={`px-4 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 whitespace-nowrap ${
              offlineMode 
                ? 'bg-amber-500 text-white shadow-amber-500/20' 
                : 'bg-white text-primary-900 hover:bg-gray-100'
            }`}
          >
            {offlineMode ? <WifiOff className="w-5 h-5 animate-bounce" /> : <Server className="w-5 h-5" />}
            <span>{offlineMode ? 'حالت آفلاین فعال است' : 'فعالسازی حالت آفلاین ملی'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-6 mb-8 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-3xl border border-gray-200/40 text-sm">
        
        {/* Section 1: Industrial Optimization Tools */}
        <div>
          <span className="text-[10px] font-bold text-gray-400 block mb-2 px-2">ابزار محاسباتی و پایداری لیتوگرافی</span>
          <div className="flex flex-wrap gap-1.5 matches-tab flex-row">
            <button
              onClick={() => setActiveTab('configurator')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'configurator'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>پیشنهاددهنده جعبه</span>
            </button>

            <button
              onClick={() => setActiveTab('profit')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'profit'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>محاسبه‌گر سود محصول</span>
            </button>

            <button
              onClick={() => setActiveTab('standards')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'standards'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>استانداردهای صادراتی</span>
            </button>

            <button
              onClick={() => setActiveTab('ai_gateway')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'ai_gateway'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>درگاه پایداری AI</span>
            </button>

            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'marketplace'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>بازارچه طراحان دیلاین</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>معماری و ۲‌۰ فاز کلی پروژه</span>
            </button>
          </div>
        </div>

        {/* Section 2: CRM & Treasury ERP Suite */}
        <div>
          <span className="text-[10px] font-black text-indigo-500 block mb-2 px-2 flex items-center gap-1">
            <Activity className="w-3 h-3 text-indigo-500 animate-pulse" /> سیستم ارتباط تجاری و معین خزانه‌داری (CRM, CRM & Treasury ERP - فاز ۲۱)
          </span>
          <div className="flex flex-wrap gap-1.5 flex-row">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-gradient-to-l from-indigo-600 to-indigo-700 text-white shadow-sm font-extrabold'
                  : 'text-gray-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-gray-800/40'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>مدیریت اعضا و اشتراک‌ها</span>
            </button>

            <button
              onClick={() => setActiveTab('crm')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'crm'
                  ? 'bg-gradient-to-l from-indigo-600 to-indigo-700 text-white shadow-sm font-extrabold'
                  : 'text-gray-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-gray-800/40'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>پیگیری سرنخ و قیف فروش (CRM)</span>
            </button>

            <button
              onClick={() => setActiveTab('treasury')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'treasury'
                  ? 'bg-gradient-to-l from-indigo-600 to-indigo-700 text-white shadow-sm font-extrabold'
                  : 'text-gray-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-gray-800/40'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>خزانه‌داری و چک صیاد</span>
            </button>

            <button
              onClick={() => setActiveTab('receipts')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'receipts'
                  ? 'bg-gradient-to-l from-indigo-600 to-indigo-700 text-white shadow-sm font-extrabold'
                  : 'text-gray-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-gray-800/40'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>قبوض دریافت و پرداخت</span>
            </button>

            <button
              onClick={() => setActiveTab('contracts')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'contracts'
                  ? 'bg-gradient-to-l from-indigo-600 to-indigo-700 text-white shadow-sm font-extrabold'
                  : 'text-gray-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-gray-800/40'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>پیمان‌نامه‌ها و کمیسیون</span>
            </button>

            <button
              onClick={() => setActiveTab('erp_integration')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'erp_integration'
                  ? 'bg-gradient-to-l from-indigo-600 to-indigo-700 text-white shadow-sm font-extrabold'
                  : 'text-gray-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-gray-800/40'
              }`}
            >
              <Activity className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
              <span>شبیه‌ساز یکپارچه ERP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'configurator' && (
          <motion.div
            key="configurator"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Input fields */}
            <div className="lg:col-span-5 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary-500" />
                <span>مشخصات و ابعاد محصول</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2">نوع محصول شما چیست؟</label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm font-medium focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="saffron">زعفران (ظروف شیشه‌ای/کریستال صادراتی)</option>
                    <option value="perfume">عطر و ادکلن یا لوازم آرایشی لوکس</option>
                    <option value="dried_fruits">خشکبار، پسته و شیرینی سنتی</option>
                    <option value="electronics">دستگاه‌های الکترونیکی و لوازم خانگی کوچک</option>
                    <option value="industries">قطعات یدکی صنعتی یا دارویی عمومی</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">طول (سانتی‌متر)</label>
                    <NumericFormatInput
                      value={length}
                      onChange={(val) => setLength(val)}
                      className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-center text-sm font-medium focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">عرض (سانتی‌متر)</label>
                    <NumericFormatInput
                      value={width}
                      onChange={(val) => setWidth(val)}
                      className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-center text-sm font-medium focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">ارتفاع (سانتی‌متر)</label>
                    <NumericFormatInput
                      value={height}
                      onChange={(val) => setHeight(val)}
                      className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-center text-sm font-medium focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">وزن با محصول (گرم)</label>
                    <NumericFormatInput
                      value={weight}
                      onChange={(val) => setWeight(val)}
                      className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm font-medium focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">تیراژ سفارش</label>
                    <NumericFormatInput
                      value={quantity}
                      onChange={(val) => setQuantity(val)}
                      className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm font-medium focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2">استراتژی بودجه و لوکس بودن</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['economical', 'standard', 'high'].map((b) => (
                      <button
                        key={b}
                        onClick={() => setBudget(b)}
                        className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                          budget === b
                            ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-600 dark:text-primary-300'
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500'
                        }`}
                      >
                        {b === 'economical' ? 'اقتصادی و ساده' : b === 'standard' ? 'استاندارد بازار' : 'بسیار لوکس صادراتی'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Recommendation outputs */}
            <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-secondary-500" />
                    <span>پیشنهاد بهینه‌سازی صنعتی (هوش مصنوعی اشک قلم)</span>
                  </h3>
                  <Badge color="green">در دسترس بدون اینترنت</Badge>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-600/20">
                      <span className="block text-xs font-bold text-gray-400 mb-1">نوع ساختار هندسی جعبه</span>
                      <strong className="text-gray-800 dark:text-gray-200">{recommendation.packagingType}</strong>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-600/20">
                      <span className="block text-xs font-bold text-gray-400 mb-1">متریال و کاغذ پیشنهادی</span>
                      <strong className="text-gray-800 dark:text-gray-200">{recommendation.material}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-600/20">
                      <span className="block text-xs font-bold text-gray-400 mb-1">روش چاپ پیشنهادی</span>
                      <strong className="text-gray-800 dark:text-gray-200">{recommendation.printingMethod}</strong>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-600/20">
                      <span className="block text-xs font-bold text-gray-400 mb-1">خدمات پس از چاپ و هنری</span>
                      <strong className="text-gray-800 dark:text-gray-200">{recommendation.finishing}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 text-center">
                      <span className="block text-[10px] text-gray-400 mb-1">زمان تخمینی تولید</span>
                      <strong className="text-primary-600 dark:text-primary-400">{recommendation.time}</strong>
                    </div>
                    <div className="p-4 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 text-center">
                      <span className="block text-[10px] text-gray-400 mb-1">قیمت واحد جعبه</span>
                      <strong className="text-primary-600 dark:text-primary-400">{recommendation.baseCost.toLocaleString()} تومان</strong>
                    </div>
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 text-center">
                      <span className="block text-[10px] text-gray-400 mb-1">کل هزینه بسته‌بندی</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">{recommendation.totalCost.toLocaleString()} تومان</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-l from-primary-50 to-indigo-50 dark:from-primary-900/10 dark:to-indigo-900/10 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm">
                  <span className="font-bold text-gray-700 dark:text-gray-300">طرح خود را بپسندید و مستقیم به ماشین حساب حاشیه سود بفرستید!</span>
                  <p className="text-xs text-gray-400 mt-1">با انتقال مقادیر بالا به تب دوم می‌توانید محاسبه کنید جعبه برای شما چقدر سودآور خواهد بود.</p>
                </div>
                <button
                  onClick={() => setActiveTab('profit')}
                  className="px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 transition-all flex items-center gap-1 text-xs"
                >
                  <span>محاسبه سود محصول</span> <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- PROFIT CALCULATOR TAB --- */}
        {activeTab === 'profit' && (
          <motion.div
            key="profit"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <div className="lg:col-span-5 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span>ورودی مخارج تولید محصول</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2">وزن و نوع محصول</label>
                  <p className="text-sm font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg">
                    {productType === 'saffron' ? 'زعفران کادویی صادراتی' : productType === 'perfume' ? 'محصولات آرایشی/ارگانیک لوکس' : 'سایر بسته‌بندی‌های استاندارد'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">قیمت تمام‌شده خام محصول بدون بسته‌بندی (تومان)</label>
                  <input
                    type="number"
                    value={productCost}
                    onChange={(e) => setProductCost(Number(e.target.value))}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm font-medium focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">هزینه نهایی بسته‌بندی برآوردی (تومان)</label>
                  <input
                    type="number"
                    value={packagingUnitCost}
                    disabled
                    className="w-full rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 p-3 text-sm font-medium text-gray-500 dark:text-gray-400"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">این فیلد بر اساس خروجی فرمول پیشنهاددهنده جعبه همگام شده است.</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">هزینه بازاریابی/فروش</label>
                    <input
                      type="number"
                      value={marketingCost}
                      onChange={(e) => setMarketingCost(Number(e.target.value))}
                      className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">حمل و نقل / ارسال</label>
                    <input
                      type="number"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(Number(e.target.value))}
                      className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">قیمت تک‌فروشی نهایی محصول نهایی کادویی (تومان)</label>
                  <input
                    type="number"
                    value={marketPrice}
                    onChange={(e) => setMarketPrice(Number(e.target.value))}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm font-medium focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">حجم تقریبی فروش سالانه / سفارشی</label>
                  <input
                    type="number"
                    value={calcQuantity}
                    onChange={(e) => setCalcQuantity(Number(e.target.value))}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm font-medium focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Calculations display info */}
            <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <span>برآورد ارزش افزوده و سودآوری بسته جدید</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-600/10 border-r-4 border-amber-500">
                    <span className="text-xs font-bold text-gray-400 block mb-1">کل بهای تمام‌شده یک عدد محصول</span>
                    <strong className="text-xl font-black text-gray-800 dark:text-gray-200">
                      {totalProductionCostPerUnit.toLocaleString()} تومان
                    </strong>
                    <div className="text-[10px] text-gray-400 mt-2">
                      از این مقدار، {((packagingUnitCost / totalProductionCostPerUnit)*100).toFixed(1)}٪ سهم بسته‌بندی است.
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-600/10 border-r-4 border-emerald-500">
                    <span className="text-xs font-bold text-gray-400 block mb-1">حاشیه سود خالص برای هر واحد کالا</span>
                    <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {profitPerUnit.toLocaleString()} تومان
                    </strong>
                    <div className="text-[10px] text-gray-400 mt-2">
                      نسبت سود به ارزش: {profitMarginPercent.toFixed(1)}٪ حاشیه نهایی سود
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl">
                  <div className="flex justify-between items-center text-sm border-b border-gray-200 dark:border-gray-700 pb-2">
                    <span className="text-gray-500">پیش‌بینی کل کل هزینه تولید:</span>
                    <strong className="text-gray-800 dark:text-gray-200">{totalGrossCost.toLocaleString()} تومان</strong>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-gray-200 dark:border-gray-700 pb-2">
                    <span className="text-gray-500">پیش‌بینی حجم کل فروش ناخالص (درآمد):</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{totalRevenue.toLocaleString()} تومان</strong>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-gray-200 dark:border-gray-700 pb-2">
                    <span className="text-purple-500 font-bold">پیش‌بینی سود خالص حاصل از بسته صادراتی لوکس:</span>
                    <strong className="text-purple-600 dark:text-purple-400 font-black">{netProfit.toLocaleString()} تومان</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>تعداد فروش لازم جهت سر به سر کردن سرمایه جعبه:</span>
                    <strong className="text-amber-500">{breakEvenUnits} واحد</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-lg">💡</div>
                <div className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                  <strong>نتیجه تحلیل:</strong> ارتقای بسته‌بندی در رده هدایای صادراتی، قیمت تک‌فروشی زعفران شما را تا ۳ برابر در بازارهای خلیج‌فارس افزایش می‌دهد. هزینه‌های ناچیز خط قالب ما به سودآور‌ترین سرمایه‌گذاری برند شما با حاشیه سود بالا منتهی خواهد شد!
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- EXPORT STANDARDS TAB --- */}
        {activeTab === 'standards' && (
          <motion.div
            key="standards"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Globe className="w-6 h-6 text-primary-500" />
                <span>کتابخانه استانداردهای بسته‌بندی صادراتی و صنایع دستی</span>
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                قوانین گمرکی و فیزیکی بسته‌بندی غلات، خرما، فرش دستبافت، زعفران و خشکبار برای صادرات به مهم‌ترین مقاصد گمرکی جهان.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {exportStandards.map((item, index) => (
                  <div key={index} className="border border-gray-100 dark:border-gray-700 rounded-2xl p-5 bg-gray-50/50 dark:bg-gray-900/30">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{item.flag}</span>
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">{item.country}</h4>
                    </div>

                    <div className="space-y-4">
                      {item.standards.map((s, i) => (
                        <div key={i} className="border-r-2 border-primary-500 pr-3">
                          <h5 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-1">{s.title}</h5>
                          <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* --- DESIGNER MARKETPLACE TAB --- */}
        {activeTab === 'marketplace' && (
          <motion.div
            key="marketplace"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Creator upload box */}
              <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  <span>ثبت و فروش قالب جدید طراحان</span>
                </h3>

                <form onSubmit={handleUploadTemplate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">عنوان اثر لایه باز / ساختار دیلاین</label>
                    <input
                      type="text"
                      placeholder="مانند: قالب جعبه کیبوردی صادراتی پسته"
                      value={newTemplateTitle}
                      onChange={(e) => setNewTemplateTitle(e.target.value)}
                      className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">دسته‌بندی صنعتی</label>
                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value)}
                      className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 p-3 text-sm focus:ring-2"
                    >
                      <option value="آرایشی">لوکس آرایشی و عطر</option>
                      <option value="صنعتی">الکترونیک و سخت‌افزار</option>
                      <option value="شیرینی و خشکبار">شیرینی، سوهان و خرما</option>
                      <option value="پاکت">کیسه کرافت و پاکت دسته دایکاتی</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2">قیمت به تومان (یا وارد کنید رایگان)</label>
                    <input
                      type="text"
                      placeholder="مثال: ۲۵۰,۰۰۰"
                      value={newTemplatePrice}
                      onChange={(e) => setNewTemplatePrice(e.target.value)}
                      className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 p-3 text-sm focus:ring-2"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
                  >
                    بارگذاری قالب بازارچه طراحان
                  </button>
                </form>

                <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <span>طراح گرامی، سود شما از هر فروش پس از چاپ و دایکات نهایی ۷۰٪ خواهد بود. پرداخت آنی با تایید گرافیست.</span>
                </div>
              </div>

              {/* Template list */}
              <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  <span>بازارچه اشتراکی سازه‌های دایکاتی خلاقانه طراحان خاورمیانه</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((tmpl) => (
                    <div key={tmpl.id} className="border border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all rounded-2xl p-4 bg-gray-50/50 dark:bg-gray-900/40 relative">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                          {tmpl.category}
                        </span>
                        <strong className="text-sm text-green-600 font-extrabold">{tmpl.price}</strong>
                      </div>

                      <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-1 line-clamp-1">{tmpl.title}</h4>
                      <p className="text-xs text-gray-400 mb-4">آزادکار: ‌{tmpl.designer}</p>

                      <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-3">
                        <span className="flex items-center gap-1">⭐ {tmpl.rating}</span>
                        <span className="flex items-center gap-1">📂 دانلود: {tmpl.downloads}</span>
                        <button className="text-indigo-600 font-bold hover:underline">دریافت الگو دیلاین</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- AI RESILIENCY / GATEWAY TAB --- */}
        {activeTab === 'ai_gateway' && (
          <motion.div
            key="ai_gateway"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Gateways Settings */}
              <div className="lg:col-span-5 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <Server className="w-5 h-5 text-purple-500" />
                  <span>گیت‌وی تاب‌آوری هوش مصنوعی</span>
                </h3>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">قطع اتصالات اینترنت خارجی (Sandbox)</span>
                    <button
                      onClick={toggleOfflineMode}
                      className={`h-6 w-11 rounded-full relative transition-colors duration-200 ${
                        offlineMode ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span className={`h-5 w-5 bg-white rounded-full absolute top-[2px] transition-transform duration-200 shadow-md ${
                        offlineMode ? '-translate-x-[2px]' : '-translate-x-[24px]'
                      }`}></span>
                    </button>
                  </div>

                  {!offlineMode && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-3">انتخاب دستی ارائه‌دهنده فعال ابری</label>
                      <div className="space-y-2">
                        {[
                          { id: 'gemini', title: 'Google Gemini 1.5 Flash', desc: 'توصیه‌شده، سریع' },
                          { id: 'openai', title: 'OpenAI GPT-4o', desc: 'طراحی ساختار دقیق' },
                          { id: 'claude', title: 'Anthropic Claude Sonnet 3.5', desc: 'متن‌نویسی بهینه تبلیغاتی' },
                          { id: 'deepseek', title: 'DeepSeek Chat Coder', desc: 'تحلیل دقیق سودآوری' },
                          { id: 'ollama', title: 'Ollama Qwen-7B (سرور لوکس محلی)', desc: 'آفلاین، شبکه ملی' }
                        ].map((prov) => (
                          <button
                            key={prov.id}
                            disabled={offlineMode}
                            onClick={() => handleProviderChange(prov.id as any)}
                            className={`w-full p-3 rounded-xl border text-right transition-all flex justify-between items-center ${
                              aiProvider === prov.id
                                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-700 dark:text-primary-300'
                                : 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div>
                              <strong className="block text-xs">{prov.title}</strong>
                              <span className="text-[10px] text-gray-400">{prov.desc}</span>
                            </div>
                            {aiProvider === prov.id && <CheckCircle className="w-4 h-4 text-primary-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {offlineMode && (
                    <div className="p-4 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" />
                      <div>
                        <strong>حالت آفلاین امن فعال است!</strong> هرگونه فراخوانی برای تولید دیلاین یا متن به موتور بومی محلی اشک قلم هدایت می‌شود تا پلتفرم بدون قطعی و با سرعت ۱۰۰٪ کار کند.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Status logs & Failover testing */}
              <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-purple-500" />
                      <span>کنسول رویدادهای زنده و پایش تاب‌آوری شبکه‌</span>
                    </h3>
                    <span className="text-xs text-purple-600 dark:text-purple-400">آفلاین فعال • NIN Ready</span>
                  </div>

                  <div className="bg-gray-900 text-emerald-400 font-mono text-xs p-5 rounded-2xl h-64 overflow-y-auto space-y-2">
                    {gatewayLogs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-gray-600">[{new Date().toLocaleTimeString('fa-IR')}]</span>
                        <span className="break-all">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl">
                  <div className="text-xs text-gray-500">
                    <strong>تست سناریو:</strong> شبیه‌سازی قطعی سرتاسری اینترنت برای تست سیستم بازگشت به عقب
                  </div>
                  <button
                    onClick={() => {
                      setGatewayLogs(prev => [
                        `[خطا] بروز خطا در فراخوانی هوش مصنوعی کمکی بین‌المللی...`,
                        `[عملکرد خلاق] فعالسازی پایگاه داده بک‌آپ فوری جهت بازیابی توصیف‌ها.`,
                        `[سیستم] سوییچ سیستم به لایه پشتیبان و اتمام موفق با پینگ صفر میلی ثانیه.`,
                        ...prev
                      ]);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all"
                  >
                    شبیه‌سازی قطعی اینترنت فرضی
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- ARCHITECTURE & ROADMAP TAB --- */}
        {activeTab === 'architecture' && (
          <motion.div
            key="architecture"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* 20 Phase Checklist */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-3">
                <Layers className="w-6 h-6 text-indigo-500" />
                <span>نقشه راه مهندسی و ارتقای ۲۰ مرحله‌ای اشک قلم</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { phase: 'Phase 1-4', title: 'امنیت، بقا و تعویض لایه هوش مصنوعی', items: ['تعویض CDNs با وازماتن بومی', 'طراحی گیت‌وی پویای LLM', 'فراخوانی Qwen/DeepSeek لوکال'] },
                  { phase: 'Phase 5-8', title: 'استودیو بومی و قیمت‌گذاری چند لایه', items: ['ساخت ادیتور با Canvas API', 'اضافه شدن دایکات و تیغ‌زنی', 'عالی‌ترین فرمول ورق و چسب'] },
                  { phase: 'Phase 9-12', title: 'رهگیری زنجیره ساخت و ۳ بعدی سازی', items: ['داشبورد کامل وضعیت لیتوگرافی', 'مشاهده سه بعدی جعبه‌های فانتزی', 'استاندارد گمرکات صادرات کالا'] },
                  { phase: 'Phase 13-20', title: 'توسعه بازار B2B و سئو اختصاصی', items: ['بازارگاه طراحان و قالب‌سازها', 'رابط کاربری راست‌چین فارسی صدم‌بی‌صدم', 'سئو اتوماتیک و بلاگ هوشمند'] }
                ].map((ph, index) => (
                  <div key={index} className="bg-gray-50/50 dark:bg-gray-905/20 border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
                    <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded mb-2 inline-block">
                      {ph.phase}
                    </span>
                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-3">{ph.title}</h4>
                    <ul className="space-y-2 text-xs text-gray-500 list-disc list-inside">
                      {ph.items.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform technical layout blueprint */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">مدل داده و ساختار یکپارچگی ERP</h3>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  سیستم اشک قلم به راحتی با نرم‌افزارهای یکپارچه مالی (مانند همکاران سیستم و سپیدار) همگام شده تا سفارشات چاپخانه، مقدار استفاده از زینک، بهای ورق مادر و زمان بیکاری ماشین‌آلات لیتوگرافی را خودکار استخراج نماید.
                </p>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-150 font-mono text-xs text-left overflow-x-auto space-y-1">
                  <div><span className="text-cyan-600">Model</span> Order &#123;</div>
                  <div className="pl-4">id: <span className="text-amber-600">string</span>;</div>
                  <div className="pl-4">packaging_type: <span className="text-amber-600">string</span>;</div>
                  <div className="pl-4">materials: <span className="text-cyan-600">Array</span>&lt;material_id&gt;;</div>
                  <div className="pl-4">die_cut_length: <span className="text-purple-600">number</span>; <span className="text-gray-500">// (دور قالب جهت اجرت)</span></div>
                  <div className="pl-4">zinc_count: <span className="text-purple-600">number</span>;</div>
                  <div className="pl-4 font-bold text-emerald-500">estimated_resin_cost: <span className="text-purple-600">number</span>;</div>
                  <div>&#125;</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">جدول بهای بهینه‌سازی شده مواد اولیه بومی</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  بهای ورق طبق نوسانات بومی بورس کاغذ تهران همگام می‌شود تا برآورد کاملا دقیقی تقدیم شود:
                </p>

                <div className="space-y-2 text-xs">
                  {[
                    { name: 'ایندربرد بهداشتی سوئدی گرید اف', price: 'کیلویی ۶۵,۰۰۰ تومان', speed: '۷ روز' },
                    { name: 'کرافت سوئدی ضخیم ۳۵۰گرم', price: 'کیلویی ۵۸,۰۰۰ تومان', speed: '۵ روز' },
                    { name: 'مقوای گلاسه مات ۳۰۰گرم', price: 'کیلویی ۶۲,۰۰۰ تومان', speed: '۶ روز' },
                    { name: 'ورق لمینتی دایکاتی کرافت', price: 'مترمربع ۲۴,۰۰۰ تومان', speed: '۴ روز' }
                  ].map((mat, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                      <span className="font-bold text-gray-700 dark:text-gray-300">{mat.name}</span>
                      <span className="text-emerald-600 font-extrabold">{mat.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <MembersTab members={members} setMembers={setMembers} />
          </motion.div>
        )}

        {activeTab === 'crm' && (
          <motion.div
            key="crm"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <CrmTab />
          </motion.div>
        )}

        {activeTab === 'treasury' && (
          <motion.div
            key="treasury"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <TreasuryTab />
          </motion.div>
        )}

        {activeTab === 'receipts' && (
          <motion.div
            key="receipts"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <ReceiptsTab />
          </motion.div>
        )}

        {activeTab === 'contracts' && (
          <motion.div
            key="contracts"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <ContractsTab />
          </motion.div>
        )}

        {activeTab === 'erp_integration' && (
          <motion.div
            key="erp_integration"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <ERPIntegrationTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </B2BEnterpriseProvider>
  );
};
