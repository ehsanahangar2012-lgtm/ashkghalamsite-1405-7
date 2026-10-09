
import React, { useState, useRef } from 'react';
import { User, Project, UserRole } from '../types';
import { Card, Button, Badge } from './UIComponents';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Clock, CheckCircle, Package, Download, Upload, Coins, TrendingUp, Scissors, PaintBucket, Truck, Search, Layout, Image as ImageIcon, User as UserIcon, Camera, Edit2, Bell, Trash2, Calculator, Check, Sparkles, Layers } from 'lucide-react';
import { SeoStudio, ContentManager, MediaManager } from './AdminTools';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { usePersianNumberInput } from '../hooks/usePersianNumberInput';
import { NumericFormatInput } from './NumericFormatInput';

interface DashboardProps {
  user: User;
  activeRole: UserRole;
  projects?: Project[];
}

const mockStats = [
  { name: 'فروردین', orders: 0 },
  { name: 'اردیبهشت', orders: 0 },
  { name: 'خرداد', orders: 0 },
  { name: 'تیر', orders: 0 },
  { name: 'مرداد', orders: 0 },
  { name: 'شهریور', orders: 0 },
];

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
      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 z-0"></div>
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-primary-500 text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-400 dark:bg-gray-700'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isCurrent ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}>
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
  const { login } = useAuth();
  const { uploadAsset } = useContent();
  const isAdmin = activeRole === UserRole.ADMIN;
  const [adminTab, setAdminTab] = useState<'overview' | 'seo' | 'cms' | 'media'>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for the interactive pricing estimation widget
  const [estLength, setEstLength] = useState<number>(25);
  const [estWidth, setEstWidth] = useState<number>(15);
  const [estHeight, setEstHeight] = useState<number>(10);
  const [estQty, setEstQty] = useState<number>(1000);
  const [boxType, setBoxType] = useState<string>('box');

  // Custom notifications state for separate notifications panel
  const [notifications, setNotifications] = useState<Array<{ id: number; text: string; time: string; unread: boolean; category: string }>>([]);

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const asset = await uploadAsset(file);
      if (asset) {
        // Update user context with new avatar
        login({ ...user, avatar: asset.data });
      }
    }
  };

  const renderAdminView = () => (
    <div className="space-y-6">
      {/* Admin Tabs */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex gap-2 overflow-x-auto">
         <button onClick={() => setAdminTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${adminTab === 'overview' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
           <TrendingUp className="h-4 w-4" /> داشبورد
         </button>
         <button onClick={() => setAdminTab('seo')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${adminTab === 'seo' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
           <Search className="h-4 w-4" /> SEO Studio
         </button>
         <button onClick={() => setAdminTab('cms')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${adminTab === 'cms' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
           <Layout className="h-4 w-4" /> مدیریت محتوا (CMS)
         </button>
         <button onClick={() => setAdminTab('media')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${adminTab === 'media' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
           <ImageIcon className="h-4 w-4" /> گالری و مدیا
         </button>
      </div>

      {adminTab === 'overview' && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">سفارشات فعال</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">0</h3>
                </div>
                <Package className="h-8 w-8 text-primary-500" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">درآمد ماهانه</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">0 T</h3>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">کاربران جدید</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">0</h3>
                </div>
                <UserIcon className="h-8 w-8 text-secondary-500" />
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">آمار فروش شش ماهه</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockStats}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#888888" />
                  <YAxis stroke="#888888" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
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

  const renderUserView = () => {
    const getDynamicEstimatePrice = () => {
      let multiplier = 850; 
      if (boxType === 'hardbox') multiplier = 2400;
      if (boxType === 'laminate') multiplier = 1450;
      const baseArea = (estLength * estWidth * 2) + (estWidth * estHeight * 2) + (estLength * estHeight * 2);
      const materialCost = baseArea * multiplier;
      const setupFee = 420000;
      const total = (materialCost + setupFee / Math.max(1, estQty)) * estQty;
      return isNaN(total) ? 0 : Math.round(total);
    };

    return (
      <div className="space-y-6">
        {/* Top Mini Summary Cards (Compact Visuals) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* User Compact Card */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-150 dark:border-gray-700 flex items-center gap-3">
            <div className="relative">
              {user.avatar ? (
                <img src={user.avatar} className="w-11 h-11 rounded-full border-2 border-primary-100 dark:border-primary-900 object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-gray-750 flex items-center justify-center text-primary-600 dark:text-gray-300 font-bold">
                  {user.name.charAt(0)}
                </div>
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-primary-650 text-white p-1 rounded-full shadow hover:bg-primary-750 transition-all"
                title="تغییر تصویر"
              >
                <Camera className="w-2.5 h-2.5" />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProfileUpload} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{user.name}</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">{user.role === 'SMB' ? 'حساب تجاری (بسته‌بندی)' : 'عضو حقیقی'}</p>
            </div>
          </div>

          {/* Wallet Balance Card (Compact) */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-150 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[11px] text-gray-400">کیف پول مالی</span>
                <span className="text-sm font-black text-gray-950 dark:text-white mt-0.5 block">
                  {user.walletBalance !== undefined ? user.walletBalance.toLocaleString() : '۰'} <span className="text-[10px] font-normal text-gray-500">تومان</span>
                </span>
              </div>
            </div>
            <Badge color="green">فعال</Badge>
          </div>

          {/* Loyalty Club Score */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-150 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[11px] text-gray-400">توکن‌های وفاداری</span>
                <span className="text-sm font-black text-gray-950 dark:text-white mt-0.5 block">
                  {user.tokens || 0} <span className="text-[10px] font-normal text-gray-500">امتیاز اشک قلم</span>
                </span>
              </div>
            </div>
            <span className="text-[10.5px] cursor-pointer hover:underline text-secondary-600">خرج توکن</span>
          </div>

          {/* Active Worksite Inquiries Count */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-150 dark:border-gray-700 flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[11px] text-gray-400">کل پرونده‌های ثبت فیزیکی</span>
              <span className="text-sm font-black text-gray-950 dark:text-white mt-0.5 block">
                {projects.length || 0} <span className="text-[10px] font-normal text-gray-500">سفارش / دیلاین</span>
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic & Interactive Price Estimator Widget (Prevents visual clutter by replacing long lists with instant interactive tooling) */}
        <div className="bg-gradient-to-br from-slate-850 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-black flex items-center gap-2">
                <Calculator className="h-4.5 w-4.5 text-primary-450" />
                تخمین‌ساز و استعلام‌گیر آنلاین قیمت جعبه
              </h3>
              <p className="text-[11px] text-slate-350 mt-1">تخمین سریع قیمت کل شیت، دایکات و چاپ بر اساس اندازه شابلون شما بدون پرش ورودی</p>
            </div>
            <div className="flex gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/50">
              <button 
                onClick={() => setBoxType('box')} 
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all font-bold ${boxType === 'box' ? 'bg-primary-600 text-white shadow' : 'text-slate-400'}`}
              >
                جعبه دارویی/مقوایی
              </button>
              <button 
                onClick={() => setBoxType('hardbox')} 
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all font-bold ${boxType === 'hardbox' ? 'bg-primary-600 text-white shadow' : 'text-slate-400'}`}
              >
                جعبه هاردباکس
              </button>
              <button 
                onClick={() => setBoxType('laminate')} 
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all font-bold ${boxType === 'laminate' ? 'bg-primary-600 text-white shadow' : 'text-slate-400'}`}
              >
                کارتن سه لایه لمینتی
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/40 p-4 rounded-lg border border-slate-800/60 mb-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5 font-bold">طول جعبه (cm)</label>
              <NumericFormatInput
                value={estLength}
                onChange={setEstLength}
                className="w-full text-center text-xs font-mono font-bold py-1.5 px-2 bg-slate-800 border border-slate-100 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5 font-bold">عرض جعبه (cm)</label>
              <NumericFormatInput
                value={estWidth}
                onChange={setEstWidth}
                className="w-full text-center text-xs font-mono font-bold py-1.5 px-2 bg-slate-800 border border-slate-100 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5 font-bold font-bold">ارتفاع کامل (cm)</label>
              <NumericFormatInput
                value={estHeight}
                onChange={setEstHeight}
                className="w-full text-center text-xs font-mono font-bold py-1.5 px-2 bg-slate-800 border border-slate-100 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5 font-bold">تیراژ کل (عدد)</label>
              <NumericFormatInput
                value={estQty}
                onChange={setEstQty}
                className="w-full text-center text-xs font-mono font-bold py-1.5 px-2 bg-slate-800 border border-slate-100 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-right font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800">
            <span className="text-[11.5px] text-slate-300">قیمت نهایی برآورد کلیدزن آماده تولید:</span>
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-primary-400">{getDynamicEstimatePrice().toLocaleString()} ریال</span>
              <Button size="sm" className="bg-primary-600 text-white font-bold text-[10.5px]">ارسال فیزیکی جهت قرار در نوبت تولید</Button>
            </div>
          </div>
        </div>

        {/* Split Grid: Recent Projects on Right, Notifications/Activities on Left */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Projects Card (پروژه‌های اخیر) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-xs border border-gray-150 dark:border-gray-700 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-primary-500" />
                  پروژه‌های اخیر طراحی و تولید
                </h3>
                <Badge color="blue">{projects.length} فعال</Badge>
              </div>

              <div className="space-y-3.5">
                {projects.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-6">پروژه‌ای برای این کاربر ثبت نشده است.</p>
                ) : (
                  projects.slice(0, 3).map((project) => (
                    <div key={project.id} className="p-3 bg-gray-50 dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 bg-primary-50 dark:bg-primary-950/40 rounded flex items-center justify-center text-primary-600">
                            <Layers className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-gray-900 dark:text-white leading-tight">{project.title}</h4>
                            <span className="text-[9.5px] text-gray-400 font-mono mt-0.5 block">{project.type} • {project.date}</span>
                          </div>
                        </div>
                        <Badge color={project.status === 'delivered' ? 'green' : project.status === 'saved_design' ? 'gold' : 'blue'}>
                          {project.status === 'delivered' ? 'تحویل شد' : project.status === 'saved_design' ? 'آماده بلیت‌ست' : 'در دست اقدام'}
                        </Badge>
                      </div>
                      {project.status !== 'saved_design' && <OrderTimeline status={project.status} />}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <span className="text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline cursor-pointer">
                مشاهده تمام آرشیو پروژه‌ها ←
              </span>
            </div>
          </div>

          {/* Separate Notifications Section (اعلانات و هشدارها) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-xs border border-gray-150 dark:border-gray-700 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell className="h-4.5 w-4.5 text-secondary-500" />
                  اعلانات مهم سیستم و فرآیندها
                </h3>
                {notifications.some(n => n.unread) && (
                  <button 
                    onClick={markAllNotificationsRead} 
                    className="text-[11px] text-primary-640 hover:underline cursor-pointer"
                  >
                    خوانده‌شدن همه کاربران
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {notifications.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-6">اعلان جدیدی وجود ندارد.</p>
                ) : (
                  notifications.map(item => (
                    <div 
                      key={item.id} 
                      className={`p-2.5 rounded-lg border flex items-start justify-between transition-colors ${
                        item.unread 
                          ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50' 
                          : 'bg-gray-50/70 dark:bg-gray-850/50 border-gray-100 dark:border-gray-750'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 h-1.5 w-1.5 rounded-full ${item.unread ? 'bg-blue-500 animate-pulse' : 'bg-gray-305'}`} />
                        <div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-normal">{item.text}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-750 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">{item.category}</span>
                            <span className="text-[9.5px] text-gray-400 font-mono-rtl">{item.time}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeNotification(item.id)} 
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <span className="text-xs text-secondary-600 dark:text-secondary-400 font-bold hover:underline cursor-pointer">
                تنظیمات پیام‌رسان و کاتالیزورها ←
              </span>
            </div>
          </div>

        </div>

        {/* Compact File Management Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-xs border border-gray-150 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="h-4.5 w-4.5 text-blue-500" />
              مدیریت و بایگانی فنی کلیشه‌های دایکات و عکس
            </h3>
            <Button size="sm" className="text-[10px]">
              <Upload className="h-3.5 w-3.5 ml-1" /> آپلود سریع دیلاین
            </Button>
          </div>
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-850/30 transition-colors cursor-pointer">
            <p className="text-xs text-gray-600 dark:text-gray-300">طرح جدید بسته‌بندی خود را برای بررسی به بخش فنی بفرستید</p>
            <p className="text-[10.5px] text-gray-400 mt-1 font-mono">PDF, AI, PSD, CDR (Max 150MB)</p>
          </div>
        </div>

      </div>
    );
  };

  return isAdmin ? renderAdminView() : renderUserView();
};
