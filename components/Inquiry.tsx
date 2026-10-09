
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge } from './UIComponents';
import { 
  Upload, Check, Printer, Box, Mic, Sparkles, Sliders, Play, Calculator, Clock,
  CreditCard, ChevronLeft, ChevronRight, Info, FileText, Layers, Scissors, Zap, ShieldCheck, User, Phone
} from 'lucide-react';
import { calculatePrice, PricingParams, PriceResult } from '../services/pricingService';
import { ThreeDPreview } from './ThreeDPreview';
import { extractOrderDetails } from '../services/geminiService';
import { useContent } from '../contexts/ContentContext';
import { useAuth } from '../contexts/AuthContext';
import { loginGuest } from '../services/authService';
import { FileAnalyzer } from './FileAnalyzer';

// --- Constants & Data ---

const CATEGORIES = [
  { id: 'business-card', title: 'کارت ویزیت', icon: CreditCard, desc: 'لمینت، سلفون، کتان و...' },
  { id: 'box', title: 'جعبه و بسته‌بندی', icon: Box, desc: 'هاردباکس، مقوایی، کارتنی' },
  { id: 'flyer', title: 'تراکت و بروشور', icon: FileText, desc: 'گلاسه، تحریر، کرافت' },
  { id: 'label', title: 'لیبل و برچسب', icon: Layers, desc: 'شیشه‌ای، کاغذی، متالایز' },
];

const PAPER_TYPES = [
  { id: 'glossy-300', title: 'گلاسه ۳۰۰ گرم', desc: 'استاندارد و براق، مناسب اکثر کارها' },
  { id: 'matte-300', title: 'مات ۳۰۰ گرم', desc: 'سطح بدون بازتاب نور، شیک و سنگین' },
  { id: 'linen', title: 'کتان بافت‌دار', desc: 'دارای بافت ریز، حس کلاسیک' },
  { id: 'kraft', title: 'کرافت نخودی', desc: 'دوستدار محیط زیست، ظاهر ارگانیک' },
  { id: 'cardboard-ip', title: 'ایندربرد بهداشتی', desc: 'پشت سفید، مناسب جعبه دارو و غذا' },
];

const FINISHES = [
  { id: 'none', title: 'بدون روکش', price: '' },
  { id: 'matte', title: 'سلفون مات', price: '+۸۰۰ ت' },
  { id: 'glossy', title: 'سلفون براق', price: '+۷۰۰ ت' },
  { id: 'velvet', title: 'سلفون مخملی', price: '+۱۵۰۰ ت' },
];

const EXTRAS = [
  { id: 'rounded-corners', title: 'دورگرد (Round)', icon: Scissors },
  { id: 'spot-uv', title: 'یووی موضعی', icon: Sparkles },
  { id: 'gold-foil', title: 'طلاکوب', icon: Zap },
];

export const Inquiry: React.FC = () => {
  const { user, login } = useAuth();
  const { pricingFormula, globalSettings } = useContent(); 
  
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  // Guest Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Smart Fill State
  const [smartInput, setSmartInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isFileValid, setIsFileValid] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [params, setParams] = useState<PricingParams>({
    category: 'business-card',
    size: '8.5x4.8',
    paperType: 'glossy-300',
    quantity: 1000,
    sides: 'single',
    laminate: 'matte',
    extras: [],
    deliverySpeed: 'normal',
  });

  // Price State
  const [price, setPrice] = useState<PriceResult | null>(null);

  // Recalculate price
  useEffect(() => {
    const result = calculatePrice(params, pricingFormula);
    setPrice(result);
  }, [params, pricingFormula]);

  const handleExtraToggle = (id: string) => {
    setParams(prev => {
      const exists = prev.extras.includes(id);
      return {
        ...prev,
        extras: exists ? prev.extras.filter(e => e !== id) : [...prev.extras, id]
      };
    });
  };

  const handleSmartFill = async () => {
    if (!smartInput.trim()) return;
    setIsAnalyzing(true);
    
    try {
      const result = await extractOrderDetails(smartInput);
      if (result) {
        setParams(prev => ({
          ...prev,
          category: result.category !== 'other' ? result.category : prev.category,
          quantity: result.quantity || prev.quantity,
          paperType: result.paperType || prev.paperType,
        }));
        if (result.category !== 'other') setStep(2);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = () => {
    // Validation for step 3
    if (step === 3 && uploadedFile && !isFileValid) {
       alert("لطفا ابتدا خطاهای فایل را بررسی کنید.");
       return;
    }

    if (step === 3) {
      setStep(4);
    } else {
      setStep(s => Math.min(s + 1, 4));
    }
  };

  const handleGuestSubmit = async () => {
    if (!guestName || !guestPhone) return;
    // Create a temporary guest session
    const guestUser = await loginGuest();
    guestUser.name = guestName;
    guestUser.phone = guestPhone;
    login(guestUser);
    setIsSuccess(true);
  };

  const handleAuthenticatedSubmit = () => {
    setIsSuccess(true);
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setIsFileValid(false); // Reset validity until analyzed
    }
  };

  const getTargetDims = () => {
     // Helper to pass dimensions to analyzer
     if (params.size === '8.5x4.8') return { w: 8.5, h: 4.8 };
     if (params.size === '9x6') return { w: 9, h: 6 };
     if (params.size === 'A5') return { w: 14.8, h: 21 };
     if (params.size === 'A4') return { w: 21, h: 29.7 };
     return { w: 10, h: 10 }; // Default
  };

  // --- Render Steps ---

  const renderSmartFill = () => (
    <div className="mb-8 p-1 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-xl shadow-lg animate-in slide-in-from-top-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">سفارش سریع با هوش مصنوعی</h3>
            <p className="text-xs text-gray-500 mb-3">سفارش خود را به زبان ساده بنویسید تا فرم خودکار پر شود.</p>
            <div className="flex gap-2">
              <input 
                value={smartInput}
                onChange={(e) => setSmartInput(e.target.value)}
                placeholder="مثال: ۱۰۰۰ عدد کارت ویزیت گلاسه مات برای شرکت..."
                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleSmartFill()}
              />
              <Button 
                onClick={handleSmartFill} 
                isLoading={isAnalyzing}
                disabled={!smartInput}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                تحلیل و ثبت
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProductSelection = () => (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      {renderSmartFill()}
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">انتخاب محصول</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CATEGORIES.map(cat => (
          <div 
            key={cat.id}
            onClick={() => { setParams({ ...params, category: cat.id as any }); handleNext(); }}
            className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center text-center transition-all hover:shadow-lg hover:-translate-y-1 ${
              params.category === cat.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <div className={`p-3 rounded-full mb-3 ${params.category === cat.id ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
              <cat.icon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-200">{cat.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{cat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConfiguration = () => (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      {/* 1. Paper Type */}
      <section>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
          جنس کاغذ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
           {PAPER_TYPES.map(paper => (
             <div 
               key={paper.id}
               onClick={() => setParams({ ...params, paperType: paper.id })}
               className={`relative cursor-pointer rounded-lg border p-3 transition-all ${
                 params.paperType === paper.id
                   ? 'border-primary-500 ring-1 ring-primary-500 bg-primary-50 dark:bg-primary-900/10' 
                   : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
               }`}
             >
               <div className="flex justify-between items-center mb-1">
                 <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{paper.title}</span>
                 {params.paperType === paper.id && <Check className="h-4 w-4 text-primary-600" />}
               </div>
               <p className="text-xs text-gray-500">{paper.desc}</p>
             </div>
           ))}
        </div>
      </section>

      {/* 2. Specs (Size, Side, Qty) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">ابعاد</label>
            <select value={params.size} onChange={(e) => setParams({...params, size: e.target.value})} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm py-2">
              <option value="8.5x4.8">استاندارد (۸.۵ × ۴.۸)</option>
              <option value="9x6">دورگرد (۹ × ۶)</option>
              <option value="A5">سایز A5</option>
              <option value="A4">سایز A4</option>
            </select>
         </div>
         <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">وجه چاپ</label>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
               <button onClick={() => setParams({...params, sides: 'single'})} className={`flex-1 text-xs py-1.5 rounded-md transition-all ${params.sides === 'single' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}>یک رو</button>
               <button onClick={() => setParams({...params, sides: 'double'})} className={`flex-1 text-xs py-1.5 rounded-md transition-all ${params.sides === 'double' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}>دو رو</button>
            </div>
         </div>
         <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">تیراژ (عدد)</label>
            <select value={params.quantity} onChange={(e) => setParams({...params, quantity: Number(e.target.value)})} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm py-2 font-mono">
              <option value="500">500</option>
              <option value="1000">1,000 (اقتصادی)</option>
              <option value="2000">2,000</option>
              <option value="5000">5,000 (ویژه)</option>
              <option value="10000">10,000</option>
            </select>
         </div>
      </section>

      {/* 3. Finish & Extras */}
      <section>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span>خدمات پس از چاپ</h3>
        <div className="mb-4">
           <label className="block text-xs text-gray-500 mb-2">نوع روکش (سلفون/لمینت)</label>
           <div className="flex flex-wrap gap-2">
              {FINISHES.map(finish => (
                <button key={finish.id} onClick={() => setParams({...params, laminate: finish.id as any})} className={`px-4 py-2 rounded-lg text-xs border transition-all flex items-center gap-2 ${params.laminate === finish.id ? 'border-secondary-500 bg-secondary-50 text-secondary-700' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'}`}>
                  {finish.title} {finish.price && <span className="text-[10px] opacity-70 bg-black/5 px-1 rounded">{finish.price}</span>}
                </button>
              ))}
           </div>
        </div>
        <div>
           <label className="block text-xs text-gray-500 mb-2">خدمات تکمیلی</label>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {EXTRAS.map(extra => (
                <div key={extra.id} onClick={() => handleExtraToggle(extra.id)} className={`cursor-pointer border rounded-lg p-3 flex items-center gap-2 transition-all ${params.extras.includes(extra.id) ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}>
                  <div className={`p-1.5 rounded-full ${params.extras.includes(extra.id) ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-500'}`}><extra.icon className="h-4 w-4" /></div>
                  <span className="text-xs font-medium">{extra.title}</span>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* 4. Delivery Speed */}
      <section>
         <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs">3</span>زمان تحویل</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div onClick={() => setParams({...params, deliverySpeed: 'normal'})} className={`cursor-pointer border rounded-xl p-4 flex items-center justify-between ${params.deliverySpeed === 'normal' ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-gray-400" /><div><div className="text-sm font-bold">عادی</div><div className="text-xs text-gray-500">۷ تا ۱۰ روز کاری</div></div></div><span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">رایگان</span>
           </div>
           <div onClick={() => setParams({...params, deliverySpeed: 'rush'})} className={`cursor-pointer border rounded-xl p-4 flex items-center justify-between ${params.deliverySpeed === 'rush' ? 'border-red-500 ring-1 ring-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className="flex items-center gap-3"><Zap className="h-5 w-5 text-red-500" /><div><div className="text-sm font-bold text-red-600">فوری (Rush)</div><div className="text-xs text-red-400">۲ تا ۳ روز کاری</div></div></div><span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-1 rounded">+۳۵٪</span>
           </div>
        </div>
      </section>
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
       <div 
         onClick={() => fileInputRef.current?.click()}
         className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group flex flex-col items-center"
       >
          <Upload className="mx-auto h-16 w-16 text-gray-300 group-hover:text-primary-500 transition-colors mb-4" />
          <h4 className="font-bold text-lg mb-2 text-gray-700 dark:text-gray-300">
             {uploadedFile ? uploadedFile.name : 'فایل خود را اینجا رها کنید'}
          </h4>
          <p className="text-sm text-gray-500 mb-6">PDF, AI, CDR, PSD, TIFF (حداکثر ۵۰ مگابایت)</p>
          <Button variant="outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
             {uploadedFile ? 'تغییر فایل' : 'انتخاب فایل از سیستم'}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.ai,.psd,.jpg,.png,.tiff" onChange={handleFileUpload} />
       </div>

       {uploadedFile && (
         <FileAnalyzer 
            file={uploadedFile} 
            targetDimensions={getTargetDims()} 
            onVerificationComplete={setIsFileValid} 
         />
       )}
    </div>
  );

  const renderCheckout = () => {
    if (user) {
      return (
        <div className="space-y-6 animate-in slide-in-from-right-4">
           <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl flex items-center gap-3">
              <User className="h-6 w-6 text-green-600" />
              <div>
                 <h3 className="font-bold text-green-800 dark:text-green-300">وارد شده به عنوان: {user.name}</h3>
                 <p className="text-xs text-green-600 dark:text-green-400">سفارش در حساب کاربری شما ثبت خواهد شد.</p>
              </div>
           </div>
           <Button className="w-full h-12 bg-green-600 hover:bg-green-700" onClick={handleAuthenticatedSubmit}>
             تایید و پرداخت نهایی
           </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in slide-in-from-right-4">
         <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">نحوه ثبت سفارش</h2>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Guest Option */}
            <Card className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600">
               <h3 className="font-bold text-lg mb-4">ثبت به عنوان مهمان</h3>
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold mb-1">نام و نام خانوادگی</label>
                     <div className="relative">
                        <User className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input value={guestName} onChange={e => setGuestName(e.target.value)} className="w-full pr-10 pl-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700" placeholder="مثال: علی محمدی" />
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold mb-1">شماره تماس</label>
                     <div className="relative">
                        <Phone className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="w-full pr-10 pl-3 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700" placeholder="0912..." />
                     </div>
                  </div>
                  <Button className="w-full mt-2" onClick={handleGuestSubmit} disabled={!guestName || !guestPhone}>
                     ثبت سفارش فوری
                  </Button>
               </div>
            </Card>

            {/* Login Option */}
            <Card className="p-6 bg-primary-50 dark:bg-primary-900/10 flex flex-col justify-center items-center text-center">
               <h3 className="font-bold text-lg mb-2 text-primary-700 dark:text-primary-300">حساب کاربری دارید؟</h3>
               <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">با ورود به حساب، سوابق سفارشات شما ذخیره شده و شامل تخفیف‌های باشگاه مشتریان می‌شوید.</p>
               <Button variant="outline" className="w-full" onClick={() => window.dispatchEvent(new CustomEvent('open-login'))}>
                  ورود / ثبت نام
               </Button>
            </Card>
         </div>
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="text-center py-12 animate-in zoom-in duration-300">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="h-12 w-12" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {globalSettings.inquirySuccessTitle || 'سفارش با موفقیت ثبت شد!'}
      </h2>
      <p className="text-gray-500 max-w-md mx-auto mb-4 text-sm leading-relaxed">
        {globalSettings.inquirySuccessMessage || 'پیش‌فاکتور الگوریتمی صادر گردید. کارشناسان ما به زودی با شما تماس خواهند گرفت.'}
      </p>
      <p className="text-gray-500 max-w-md mx-auto mb-8 text-xs font-mono">
        کد پیگیری: <span className="font-mono font-bold text-gray-800 dark:text-gray-200">ORD-{Math.floor(Math.random()*10000)}</span>
      </p>
      <div className="flex justify-center gap-4">
        <Button onClick={() => { setIsSuccess(false); setStep(1); }}>ثبت سفارش جدید</Button>
        <Button variant="outline">پیگیری سفارش</Button>
      </div>
    </div>
  );

  if (isSuccess) {
    return (
      <div className="max-w-3xl mx-auto p-8 min-h-screen flex items-center justify-center">
         <Card className="w-full p-8">{renderSuccess()}</Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 min-h-screen pb-32">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">استعلام قیمت و ثبت سفارش آنلاین</h1>
        <div className="flex items-center justify-between relative max-w-3xl mx-auto">
           <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -z-10 -translate-y-1/2"></div>
           {[1, 2, 3, 4].map((s) => (
             <div key={s} className={`flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-900 px-2`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s ? 'bg-primary-600 text-white shadow-lg scale-110' : 'bg-gray-300 text-gray-600'}`}>
                   {s === 4 ? (user ? <Check className="h-4 w-4"/> : <User className="h-4 w-4"/>) : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-primary-600' : 'text-gray-400'}`}>
                   {s === 1 ? 'محصول' : s === 2 ? 'مشخصات' : s === 3 ? 'فایل' : 'هویت'}
                </span>
             </div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
           <Card className="p-6 md:p-8 min-h-[500px]">
              {step === 1 && renderProductSelection()}
              {step === 2 && renderConfiguration()}
              {step === 3 && renderUpload()}
              {step === 4 && renderCheckout()}

              <div className="flex justify-between mt-10 pt-6 border-t border-gray-100 dark:border-gray-700">
                 {step > 1 ? (
                   <Button variant="ghost" onClick={prevStep}><ChevronRight className="h-4 w-4 ml-1" /> مرحله قبل</Button>
                 ) : <div></div>}
                 
                 {step < 4 ? (
                   <Button onClick={handleNext} disabled={!params.category}>مرحله بعد <ChevronLeft className="h-4 w-4 mr-1" /></Button>
                 ) : null}
              </div>
           </Card>
        </div>

        <div className="lg:col-span-1 sticky top-24">
           <Card className="p-0 overflow-hidden shadow-xl border-t-4 border-t-primary-500">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
                 <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><Calculator className="h-5 w-5 text-primary-500" />فاکتور استعلام</h3>
              </div>
              <div className="p-5 space-y-4">
                 {/* (Keep Price Breakdown UI - same as before) */}
                 {price ? (
                    <div className="space-y-3">
                       <div className="flex justify-between text-xs text-gray-500"><span>قیمت واحد:</span><span>{price.unitPrice.toLocaleString()} تومان</span></div>
                       <div className="bg-primary-50 dark:bg-primary-900/30 p-4 rounded-xl mt-2">
                          <div className="text-center">
                             <span className="block text-xs text-primary-600 dark:text-primary-300 mb-1">قیمت نهایی (تومان)</span>
                             <span className="block text-3xl font-extrabold text-primary-700 dark:text-white tracking-tight">{price.totalPrice.toLocaleString()}</span>
                          </div>
                       </div>
                    </div>
                 ) : <div className="text-center py-4 text-gray-400 text-sm">در حال محاسبه...</div>}
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};
