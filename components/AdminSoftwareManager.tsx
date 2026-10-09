import React, { useState, useEffect } from 'react';
import { 
  Laptop, Plus, Edit3, Trash2, Save, RefreshCw, Key, Download, 
  CheckCircle, AlertCircle, FileText, Smartphone, Calculator, Coins,
  Users, Layers, ExternalLink, Image, Search, ChevronRight, X
} from 'lucide-react';
import { SmartHelpButton } from './SmartHelpModal';

export const AdminSoftwareManager: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'licenses' | 'new_product'>('products');
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State for create/edit
  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    englishName: '',
    version: 'v1.0.0',
    category: 'حسابداری و مالیاتی',
    shortDesc: '',
    fullDesc: '',
    badge: 'سیستم ویژه',
    color: 'from-blue-600 to-indigo-700',
    iconName: 'Calculator',
    featured: true,
    downloadCondition: 'requires_registration',
    downloadUrl: '',
    downloadSize: '50 مگابایت',
    releaseDatePersian: '۱۴۰۴/۰۶/۲۸',
    capabilities: ['کارکرد کاملاً آفلاین بدون وابستگی به اینترنت'],
    specs: {
      os: 'ویندوز ۱۰ / ۱۱ یا اندروید',
      ram: '۴ گیگابایت',
      database: 'دیتابیس محلی ایمن',
      offlineEngine: true
    },
    plans: [
      {
        name: 'نسخه استاندارد',
        price: 'رایگان با ثبت‌نام',
        period: 'دائمی',
        features: ['پشتیبانی از پایگاه داده محلی', 'پشتیبان‌گیری خودکار'],
        conditionType: 'requires_registration'
      }
    ],
    catalogPages: [
      {
        title: 'معرفی میز کار و امکانات سیستم',
        description: 'رابط کاربری سریع و روان طراحی شده برای بازار ایران بدون نیاز به اینترنت.',
        imageUrl: '/media/catalog_page1.png',
        highlights: ['سرعت فوق‌العاده', 'کارکرد ۱۰۰٪ مستقل'],
        stat: { label: 'ضریب اطمینان', value: '۱۰۰٪' }
      }
    ]
  });

  // Fetch products & licenses
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, licRes] = await Promise.all([
        fetch('/api/software/products'),
        fetch('/api/software/licenses/list')
      ]);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.products) setProducts(prodData.products);
      }
      if (licRes.ok) {
        const licData = await licRes.json();
        if (licData.licenses) setLicenses(licData.licenses);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (prod: any) => {
    setEditingProduct(prod);
    setFormData(JSON.parse(JSON.stringify(prod)));
    setActiveTab('new_product');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('آیا از حذف این نرم‌افزار از سیستم اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/software/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('نرم‌افزار با موفقیت حذف گردید.');
        fetchData();
      }
    } catch (e) {
      alert('خطا در حذف');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) {
      alert('لطفاً نام و دسته‌بندی را وارد نمایید.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/software/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert('اطلاعات نرم‌افزار با موفقیت در بک‌اند ذخیره شد.');
        setEditingProduct(null);
        setActiveTab('products');
        fetchData();
      } else {
        const err = await res.json();
        alert('خطا: ' + (err.error || 'ذخیره انجام نشد'));
      }
    } catch (e: any) {
      alert('خطا در ارتباط با سرور: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">مدیریت بک‌اند و کاتالوگ‌های نرم‌افزار</h2>
              <SmartHelpButton sectionTitle="مدیریت نرم‌افزارها" sectionKey="admin_software" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              تعریف نرم‌افزارهای حسابداری، حواله، اپلیکیشن‌های اندروید، کاتالوگ‌های متنی و تصویری و شرایط دانلود و لایسنس
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingProduct(null);
              setActiveTab('products');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            لیست نرم‌افزارها ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('licenses')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'licenses'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            لایسنس‌های صادر شده ({licenses.length})
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setActiveTab('new_product');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'new_product'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800 text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>ثبت نرم‌افزار جدید</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Products List */}
      {activeTab === 'products' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200">نرم‌افزارهای فعال در فروشگاه</h3>
            <button
              onClick={fetchData}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="بروزرسانی لیست"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                  <th className="pb-3 pr-2">نام برنامه و نسخه</th>
                  <th className="pb-3">دسته‌بندی</th>
                  <th className="pb-3">شرط دانلود</th>
                  <th className="pb-3">حجم / تاریخ انتشار</th>
                  <th className="pb-3">پلن‌ها و کاتالوگ</th>
                  <th className="pb-3 text-left pl-2">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-2">
                      <div className="font-bold text-white text-sm">{prod.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono" dir="ltr">{prod.englishName} ({prod.version})</div>
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        prod.downloadCondition === 'free' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' :
                        prod.downloadCondition === 'requires_registration' ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40' :
                        'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                      }`}>
                        {prod.downloadCondition === 'free' ? 'آزاد / رایگان' :
                         prod.downloadCondition === 'requires_registration' ? 'عضویت در سایت' :
                         'نیازمند لایسنس رسمی'}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-300">
                      <div>{prod.downloadSize}</div>
                      <div className="text-[10px] text-slate-500">{prod.releaseDatePersian}</div>
                    </td>
                    <td className="py-3.5 text-slate-400">
                      <div>{prod.plans?.length || 0} پلن قیمت</div>
                      <div className="text-[10px] text-primary-400">{prod.catalogPages?.length || 0} صفحه کاتالوگ</div>
                    </td>
                    <td className="py-3.5 text-left pl-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(prod)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                          title="ویرایش نرم‌افزار"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(prod.id)}
                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Licenses List */}
      {activeTab === 'licenses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-sm font-bold text-slate-200 mb-4">گزارش لایسنس‌های صادر شده در سرور بک‌اند</h3>
          {licenses.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">هنوز هیچ لایسنسی ثبت نگردیده است.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="pb-3 pr-2">کد لایسنس فعال‌سازی</th>
                    <th className="pb-3">نام نرم‌افزار</th>
                    <th className="pb-3">متقاضی و تلفن</th>
                    <th className="pb-3">پلن انتخابی</th>
                    <th className="pb-3">وضعیت</th>
                    <th className="pb-3 text-left pl-2">تاریخ ثبت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {licenses.map((lic) => (
                    <tr key={lic.id} className="hover:bg-slate-800/30 transition-colors font-sans">
                      <td className="py-3.5 pr-2">
                        <span className="font-mono text-amber-300 font-bold bg-slate-950 px-2.5 py-1 rounded-md border border-amber-500/30 select-all" dir="ltr">
                          {lic.licenseKey}
                        </span>
                      </td>
                      <td className="py-3.5 font-bold text-white">{lic.productName}</td>
                      <td className="py-3.5 text-slate-300">
                        <div>{lic.customerName} {lic.companyName ? `(${lic.companyName})` : ''}</div>
                        <div className="text-[10px] text-slate-500 font-mono" dir="ltr">{lic.customerPhone}</div>
                      </td>
                      <td className="py-3.5 text-slate-300">{lic.planName}</td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                          {lic.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-left pl-2 text-slate-500 text-[11px]">
                        ۱۴۰۴/۰۶/۲۸
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Create / Edit Product Form */}
      {activeTab === 'new_product' && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-extrabold text-white">
              {editingProduct ? `ویرایش نرم‌افزار: ${editingProduct.name}` : 'تعریف و انتشار نرم‌افزار جدید در بک‌اند'}
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
            >
              بازگشت به لیست
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">نام فارسی نرم‌افزار *:</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثلاً: سامانه حسابداری دوطرفه اشک"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">نام لاتین (English Name):</label>
              <input
                type="text"
                value={formData.englishName}
                onChange={e => setFormData({ ...formData, englishName: e.target.value })}
                placeholder="Ashk Accounting Core"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500 font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">نسخه نرم‌افزار:</label>
              <input
                type="text"
                value={formData.version}
                onChange={e => setFormData({ ...formData, version: e.target.value })}
                placeholder="v1.0.0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500 font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">دسته‌بندی تخصصی:</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
              >
                <option value="حسابداری و مالیاتی">حسابداری و مالیاتی</option>
                <option value="سامانه‌های حواله و ارزی">سامانه‌های حواله و ارزی</option>
                <option value="اپلیکیشن‌های کاربردی اندروید">اپلیکیشن‌های کاربردی اندروید</option>
                <option value="ابزارهای مهندسی و صنعتی">ابزارهای مهندسی و صنعتی</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">شرط دانلود و دسترسی:</label>
              <select
                value={formData.downloadCondition}
                onChange={e => setFormData({ ...formData, downloadCondition: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
              >
                <option value="free">دانلود آزاد و رایگان</option>
                <option value="requires_registration">نیازمند عضویت / ثبت‌نام در سامانه</option>
                <option value="requires_license">نیازمند خرید لایسنس رسمی و کد فعال‌سازی</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">آیکون شاخص:</label>
              <select
                value={formData.iconName}
                onChange={e => setFormData({ ...formData, iconName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
              >
                <option value="Calculator">حسابداری (Calculator)</option>
                <option value="Coins">حواله و ارز (Coins)</option>
                <option value="Smartphone">اندروید کاربردی (Smartphone)</option>
                <option value="Box">انبارداری و بارکد (Box)</option>
                <option value="Users">منابع انسانی (Users)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">توضیح کوتاه ویترین (۱ یا ۲ جمله):</label>
            <input
              type="text"
              value={formData.shortDesc}
              onChange={e => setFormData({ ...formData, shortDesc: e.target.value })}
              placeholder="توضیح مختصر جهت نمایش در کارت فروشگاهی..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">معرفی کامل و مشخصات فنی:</label>
            <textarea
              rows={3}
              value={formData.fullDesc}
              onChange={e => setFormData({ ...formData, fullDesc: e.target.value })}
              placeholder="متن کامل معرفی فنی، استانداردهای طراحی و امنیت..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">لینک دانلود فایل نصبی / APK:</label>
              <input
                type="text"
                value={formData.downloadUrl}
                onChange={e => setFormData({ ...formData, downloadUrl: e.target.value })}
                placeholder="/downloads/app_setup.exe"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500 font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">حجم بسته نصبی:</label>
              <input
                type="text"
                value={formData.downloadSize}
                onChange={e => setFormData({ ...formData, downloadSize: e.target.value })}
                placeholder="۱۴۲ مگابایت"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">تاریخ انتشار (شمسی):</label>
              <input
                type="text"
                value={formData.releaseDatePersian}
                onChange={e => setFormData({ ...formData, releaseDatePersian: e.target.value })}
                placeholder="۱۴۰۴/۰۶/۲۸"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Catalog Slides Editor */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <span className="text-xs font-extrabold text-amber-400 block flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              کاتالوگ و صفحات بروشور نرم‌افزار (عکس و متن):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">عنوان صفحه کاتالوگ:</label>
                <input
                  type="text"
                  value={formData.catalogPages[0]?.title || ''}
                  onChange={e => {
                    const pages = [...formData.catalogPages];
                    pages[0] = { ...pages[0], title: e.target.value };
                    setFormData({ ...formData, catalogPages: pages });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">مسیر تصویر یا کاتالوگ:</label>
                <input
                  type="text"
                  value={formData.catalogPages[0]?.imageUrl || ''}
                  onChange={e => {
                    const pages = [...formData.catalogPages];
                    pages[0] = { ...pages[0], imageUrl: e.target.value };
                    setFormData({ ...formData, catalogPages: pages });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">توضیحات صفحه کاتالوگ:</label>
              <textarea
                rows={2}
                value={formData.catalogPages[0]?.description || ''}
                onChange={e => {
                  const pages = [...formData.catalogPages];
                  pages[0] = { ...pages[0], description: e.target.value };
                  setFormData({ ...formData, catalogPages: pages });
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>ذخیره در بک‌اند و انتشار</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
