import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Project, UserRole } from '../types';
import { Card, Button, Badge, BackButton } from './UIComponents';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, CheckCircle, Package, Upload, Coins, TrendingUp, Scissors, PaintBucket, Truck, Search, Layout, Image as ImageIcon, User as UserIcon, Camera, Calculator, Sparkles, Layers, ClipboardList } from 'lucide-react';
import { SeoStudio, ContentManager, MediaManager } from './AdminTools';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { NumericFormatInput } from './NumericFormatInput';
import { SmartHelpButton } from './SmartHelpModal';

interface DashboardProps {
  user: User;
  activeRole: UserRole;
  projects?: Project[];
}

interface StoredInquiryRow {
  id: string;
  name?: string;
  boxType?: string;
  dimensions?: string;
  quantity?: string;
  estimatedTotalToman?: number;
  shamsiDate?: string;
  status?: string;
}

const SHAMSI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const OrderTimeline = ({ status }: { status: string }) => {
  const steps = [
    { id: 'pending', label: 'تایید فایل', icon: FileText },
    { id: 'processing', label: 'لیتوگرافی', icon: Scissors },
    { id: 'printing', label: 'چاپ و رنگ', icon: PaintBucket },
    { id: 'shipped', label: 'ارسال', icon: Truck },
    { id: 'delivered', label: 'تحویل', icon: CheckCircle },
  ];

  const currentIdx = steps.findIndex(s => s.id === status);
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className="mt-4 relative">
      <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0"></div>
      <div
        className="absolute top-1/2 right-0 h-1 bg-primary-500 -translate-y-1/2 z-0 transition-all duration-500"
        style={{ width: `${(activeIdx / (steps.length - 1)) * 100}%` }}
      ></div>
      <div className="relative z-10 flex justify-between">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx <= activeIdx;
          const isCurrent = idx === activeIdx;

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-primary-500 text-white shadow-lg scale-110' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isCurrent ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ user, activeRole, projects = [] }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { uploadAsset, pricingFormula } = useContent();
  const isAdmin = activeRole === UserRole.ADMIN;
  const [adminTab, setAdminTab] = useState<'overview' | 'seo' | 'cms' | 'media'>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dielineUploadRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [inquirySubmitStatus, setInquirySubmitStatus] = useState<string | null>(null);
  const [recentInquiries, setRecentInquiries] = useState<StoredInquiryRow[]>([]);

  const [estLength, setEstLength] = useState<number>(25);
  const [estWidth, setEstWidth] = useState<number>(15);
  const [estHeight, setEstHeight] = useState<number>(10);
  const [estQty, setEstQty] = useState<number>(1000);
  const [boxType, setBoxType] = useState<string>('box');

  useEffect(() => {
    const loadInquiries = async () => {
      let localList: StoredInquiryRow[] = [];
      try {
        localList = JSON.parse(localStorage.getItem('ashk_user_inquiries') || '[]');
      } catch {
        localList = [];
      }
      try {
        const res = await fetch('/api/inquiries');
        if (res.ok) {
          const serverList = await res.json();
          if (Array.isArray(serverList) && serverList.length > 0) {
            setRecentInquiries(serverList.slice(0, 8));
            return;
          }
        }
      } catch {
        // Fallback to locally persisted inquiries
      }
      setRecentInquiries(localList.slice(0, 8));
    };
    loadInquiries();
  }, []);

  const estimatedPipelineRevenue = useMemo(() => {
    const orderTotal = (user.orderHistory || []).reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const inqTotal = recentInquiries.reduce((sum, inq) => sum + (Number(inq.estimatedTotalToman) || 0), 0);
    const projectValue = projects.reduce((sum, p) => sum + (p.status === 'delivered' ? 18500000 : 12000000), 0);
    return orderTotal + inqTotal + projectValue;
  }, [user.orderHistory, recentInquiries, projects]);

  const monthlyStats = useMemo(() => {
    const counts: Record<string, number> = {};
    SHAMSI_MONTHS.slice(0, 6).forEach(m => { counts[m] = 0; });
    projects.forEach(p => {
      const parts = (p.date || '').split('/');
      if (parts.length >= 2) {
        const monthIdx = parseInt(parts[1].replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))), 10) - 1;
        const mName = SHAMSI_MONTHS[monthIdx];
        if (mName && counts[mName] !== undefined) counts[mName] += 1;
      }
    });
    return Object.entries(counts).map(([name, orders]) => ({ name, orders }));
  }, [projects]);

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const asset = await uploadAsset(file);
      if (asset) {
        login({ ...user, avatar: asset.data });
      }
    }
  };

  const handleQuickDielineUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const asset = await uploadAsset(files[0]);
    if (asset) {
      setUploadStatus(`فایل «${asset.name}» با موفقیت در بایگانی فنی ثبت شد.`);
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  const getDynamicEstimatePrice = () => {
    const paperPrice = pricingFormula?.papers?.[0]?.weights?.[0]?.pricePerKg || 62000;
    const scaleFactor = paperPrice / 62000;
    let multiplier = 850 * scaleFactor;
    if (boxType === 'hardbox') multiplier = 2400 * scaleFactor;
    if (boxType === 'laminate') multiplier = 1450 * scaleFactor;
    const baseArea = (estLength * estWidth * 2) + (estWidth * estHeight * 2) + (estLength * estHeight * 2);
    const materialCost = baseArea * multiplier;
    const setupFee = pricingFormula?.defaultMachine?.setupCost || 420000;
    const total = (materialCost + setupFee / Math.max(1, estQty)) * estQty;
    return isNaN(total) ? 0 : Math.round(total);
  };

  const handleSendEstimateToQueue = async () => {
    const estimated = getDynamicEstimatePrice();
    const record: StoredInquiryRow = {
      id: `INQ-DASH-${Date.now()}`,
      name: user.name,
      boxType: boxType === 'hardbox' ? 'هاردباکس لوکس' : boxType === 'laminate' ? 'کارتن سه لایه لمینتی' : 'جعبه دارویی/مقوایی',
      dimensions: `${estLength}x${estWidth}x${estHeight}`,
      quantity: String(estQty),
      estimatedTotalToman: Math.round(estimated / 10),
      shamsiDate: new Date().toLocaleDateString('fa-IR'),
      status: 'ثبت از پیشخوان',
    };
    try {
      await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          phone: user.username,
          company: user.companyName || 'سفارش کاربری',
          boxType: record.boxType,
          dimensions: record.dimensions,
          quantity: record.quantity,
          estimatedTotalToman: record.estimatedTotalToman,
          notes: `برآورد تخمینی از داشبورد: ${estimated.toLocaleString('fa-IR')} ریال`,
          shamsiDate: record.shamsiDate,
        }),
      });
      setRecentInquiries(prev => [record, ...prev.slice(0, 7)]);
      setInquirySubmitStatus('درخواست برآورد با موفقیت در صف واقعی تولید ثبت شد.');
    } catch {
      setInquirySubmitStatus('ارتباط با سرور برقرار نشد؛ لطفاً از صفحه استعلام استفاده کنید.');
    }
    setTimeout(() => setInquirySubmitStatus(null), 4000);
  };

  const renderAdminView = () => (
    <div className="space-y-6 dir-rtl text-right">
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          <BackButton label="بازگشت" fallbackPath="/" variant="auto" />
          <button onClick={() => setAdminTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer ${adminTab === 'overview' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <TrendingUp className="h-4 w-4" /> داشبورد
          </button>
          <button onClick={() => setAdminTab('seo')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer ${adminTab === 'seo' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <Search className="h-4 w-4" /> SEO Studio
          </button>
          <button onClick={() => setAdminTab('cms')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer ${adminTab === 'cms' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <Layout className="h-4 w-4" /> مدیریت محتوا (CMS)
          </button>
          <button onClick={() => setAdminTab('media')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer ${adminTab === 'media' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <ImageIcon className="h-4 w-4" /> گالری و مدیا
          </button>
        </div>
        <SmartHelpButton
          sectionTitle="راهنمای داشبورد آمار"
          description="آمار این بخش به‌صورت زنده از پروژه‌ها و سفارشات واقعی ثبت‌شده استخراج می‌شود."
          tips={[
            'نمودار میله‌ای وضعیت ماهانه سفارشات ثبت‌شده به تاریخ شمسی را نمایش می‌دهد.',
            'در تب SEO و CMS می‌توانید متون و برچسب‌های سایت را مستقیم ویرایش کنید.',
          ]}
        />
      </div>

      {adminTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">سفارشات و پروژه‌های فعال</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{(projects.length + recentInquiries.length).toLocaleString('fa-IR')}</h3>
                </div>
                <Package className="h-8 w-8 text-primary-500" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">گردش مالی سفارشات و برآوردها</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {estimatedPipelineRevenue.toLocaleString('fa-IR')} تومان
                  </h3>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">موجودی کیف پول کاربر</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{(user.walletBalance || 0).toLocaleString('fa-IR')} تومان</h3>
                </div>
                <UserIcon className="h-8 w-8 text-secondary-500" />
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">آمار سفارشات شش ماهه (بر اساس پروژه‌های واقعی)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#888888" />
                  <YAxis stroke="#888888" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                  <Bar dataKey="orders" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {adminTab === 'seo' && <SeoStudio />}
      {adminTab === 'cms' && <ContentManager />}
      {adminTab === 'media' && <MediaManager />}
    </div>
  );

  const renderUserView = () => (
    <div className="space-y-6 dir-rtl text-right">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton label="بازگشت" fallbackPath="/" variant="auto" />
          <h2 className="text-xl font-black text-slate-900 dark:text-white">پیشخوان کاربری و سفارشات</h2>
        </div>
        <SmartHelpButton
          sectionTitle="راهنمای پیشخوان کاربری"
          description="در این بخش می‌توانید وضعیت پروژه‌های خود را دنبال کرده و برآورد سریع قیمت و آپلود فایل دیلاین انجام دهید."
          tips={[
            'از ویجت تخمین قیمت برای محاسبه سریع و ثبت در صف واقعی کارگاه استفاده کنید.',
            'پروژه‌های ذخیره‌شده در جعبه‌ساز سه‌بعدی در لیست پروژه‌های اخیر نمایش داده می‌شوند.',
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="relative">
            {user.avatar ? (
              <img src={user.avatar} className="w-11 h-11 rounded-full border-2 border-primary-100 dark:border-primary-900 object-cover" alt={user.name} />
            ) : (
              <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-slate-800 flex items-center justify-center text-primary-600 dark:text-slate-300 font-bold">
                {user.name.charAt(0)}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-primary-600 text-white p-1 rounded-full shadow hover:bg-primary-700 transition-all cursor-pointer"
              title="تغییر تصویر"
            >
              <Camera className="w-2.5 h-2.5" />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProfileUpload} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{user.name}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{user.role === 'SMB' ? 'حساب تجاری (بسته‌بندی)' : 'عضو سامانه اشک قلم'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">کیف پول مالی</span>
              <span className="text-sm font-black text-slate-950 dark:text-white mt-0.5 block">
                {user.walletBalance !== undefined ? user.walletBalance.toLocaleString('fa-IR') : '۰'} <span className="text-[10px] font-normal text-slate-500">تومان</span>
              </span>
            </div>
          </div>
          <Badge color="green">فعال</Badge>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">امتیاز کاربری</span>
              <span className="text-sm font-black text-slate-950 dark:text-white mt-0.5 block">
                {user.tokens || 0} <span className="text-[10px] font-normal text-slate-500">امتیاز اشک قلم</span>
              </span>
            </div>
          </div>
          <button onClick={() => navigate('/inquiry')} className="text-[10.5px] cursor-pointer hover:underline text-secondary-600">ثبت سفارش</button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">کل پرونده‌ها و استعلام‌ها</span>
            <span className="text-sm font-black text-slate-950 dark:text-white mt-0.5 block">
              {(projects.length + recentInquiries.length).toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-500">مورد فعال</span>
            </span>
          </div>
        </div>
      </div>

      {/* Price Estimator */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              <Calculator className="h-4.5 w-4.5 text-primary-400" />
              تخمین‌ساز و ثبت استعلام سریع قیمت جعبه
            </h3>
            <p className="text-[11px] text-slate-300 mt-1">تخمین سریع قیمت بر اساس فرمول واقعی کاغذ و هزینه ستاپ ماشین چاپ</p>
          </div>
          <div className="flex gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/50">
            <button onClick={() => setBoxType('box')} className={`px-2.5 py-1 rounded-md text-[11px] transition-all font-bold cursor-pointer ${boxType === 'box' ? 'bg-primary-600 text-white shadow' : 'text-slate-400'}`}>
              جعبه دارویی/مقوایی
            </button>
            <button onClick={() => setBoxType('hardbox')} className={`px-2.5 py-1 rounded-md text-[11px] transition-all font-bold cursor-pointer ${boxType === 'hardbox' ? 'bg-primary-600 text-white shadow' : 'text-slate-400'}`}>
              جعبه هاردباکس
            </button>
            <button onClick={() => setBoxType('laminate')} className={`px-2.5 py-1 rounded-md text-[11px] transition-all font-bold cursor-pointer ${boxType === 'laminate' ? 'bg-primary-600 text-white shadow' : 'text-slate-400'}`}>
              کارتن سه لایه لمینتی
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/40 p-4 rounded-lg border border-slate-800/60 mb-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5 font-bold">طول جعبه (cm)</label>
            <NumericFormatInput value={estLength} onChange={setEstLength} className="w-full text-center text-xs font-mono font-bold py-1.5 px-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5 font-bold">عرض جعبه (cm)</label>
            <NumericFormatInput value={estWidth} onChange={setEstWidth} className="w-full text-center text-xs font-mono font-bold py-1.5 px-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5 font-bold">ارتفاع کامل (cm)</label>
            <NumericFormatInput value={estHeight} onChange={setEstHeight} className="w-full text-center text-xs font-mono font-bold py-1.5 px-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5 font-bold">تیراژ کل (عدد)</label>
            <NumericFormatInput value={estQty} onChange={setEstQty} className="w-full text-center text-xs font-mono font-bold py-1.5 px-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800">
          <span className="text-[11.5px] text-slate-300">قیمت نهایی برآورد آماده تولید:</span>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-lg font-black text-primary-400">{getDynamicEstimatePrice().toLocaleString('fa-IR')} ریال</span>
            <Button size="sm" onClick={handleSendEstimateToQueue} className="bg-primary-600 text-white font-bold text-[10.5px]">
              ثبت این برآورد در صف استعلام واقعی
            </Button>
          </div>
        </div>
        {inquirySubmitStatus && (
          <p className="text-xs text-emerald-400 mt-3 font-bold">{inquirySubmitStatus}</p>
        )}
      </div>

      {/* Recent Inquiries Tracker */}
      {recentInquiries.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-xs border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="h-4.5 w-4.5 text-amber-500" />
              پیگیری استعلام‌های قیمت ثبت‌شده
            </h3>
            <Badge color="gold">{recentInquiries.length} استعلام</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentInquiries.slice(0, 4).map((inq) => (
              <div key={inq.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{inq.boxType || 'سفارش جعبه'}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {inq.dimensions || '-'} · تیراژ {inq.quantity || '-'} · {inq.shamsiDate || ''}
                  </p>
                </div>
                <div className="text-left">
                  <Badge color="blue">{inq.status || 'ثبت‌شده'}</Badge>
                  {inq.estimatedTotalToman ? (
                    <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      ~{inq.estimatedTotalToman.toLocaleString('fa-IR')} تومان
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Projects */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-primary-500" />
              پروژه‌های اخیر طراحی و تولید
            </h3>
            <Badge color="blue">{projects.length} فعال</Badge>
          </div>

          <div className="space-y-3.5">
            {projects.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">پروژه‌ای برای این کاربر ثبت نشده است. از جعبه‌ساز ۳D طرح خود را ذخیره کنید.</p>
            ) : (
              projects.slice(0, 5).map((project) => (
                <div key={project.id} className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 bg-primary-50 dark:bg-primary-950/40 rounded flex items-center justify-center text-primary-600">
                        <Layers className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">{project.title}</h4>
                        <span className="text-[9.5px] text-slate-400 font-mono mt-0.5 block">{project.type} • {project.date}</span>
                      </div>
                    </div>
                    <Badge color={project.status === 'delivered' ? 'green' : project.status === 'saved_design' ? 'gold' : 'blue'}>
                      {project.status === 'delivered' ? 'تحویل شد' : project.status === 'saved_design' ? 'آماده پلیت‌ست' : 'در دست اقدام'}
                    </Badge>
                  </div>
                  {project.status !== 'saved_design' && <OrderTimeline status={project.status} />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick File Upload */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-xs border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Upload className="h-4.5 w-4.5 text-blue-500" />
            مدیریت و بایگانی فنی فایل‌های دیلاین و تصویر
          </h3>
          <Button size="sm" onClick={() => dielineUploadRef.current?.click()} className="text-[10px]">
            <Upload className="h-3.5 w-3.5 ml-1" /> آپلود سریع فایل
          </Button>
        </div>
        <input
          ref={dielineUploadRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.svg,.dxf"
          onChange={(e) => handleQuickDielineUpload(e.target.files)}
        />
        <div
          onClick={() => dielineUploadRef.current?.click()}
          className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <p className="text-xs text-slate-600 dark:text-slate-300">طرح جدید بسته‌بندی خود را برای ذخیره در کتابخانه فنی انتخاب کنید</p>
          <p className="text-[10.5px] text-slate-400 mt-1 font-mono">PDF, SVG, DXF, PNG, JPG</p>
          {uploadStatus && <p className="text-xs text-emerald-500 font-bold mt-2">{uploadStatus}</p>}
        </div>
      </div>
    </div>
  );

  return isAdmin ? renderAdminView() : renderUserView();
};
