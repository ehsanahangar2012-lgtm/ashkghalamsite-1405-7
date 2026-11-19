import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '../contexts/ContentContext';
import { CustomPageItem, ManagedProductItem, ManagedServiceItem } from '../types';
import { Button, Badge } from './UIComponents';
import { MediaSelector } from './AdminTools';
import { toSlug } from '../utils/slugUtils';
import {
  FileText,
  Package,
  Layers,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
  ExternalLink,
  Image as ImageIcon,
  X,
} from 'lucide-react';

type ManagerSubTab = 'pages' | 'products' | 'services';

const EMPTY_PAGE: CustomPageItem = {
  id: '',
  slug: '',
  title: '',
  subtitle: '',
  badge: 'صفحه اختصاصی',
  heroImage: '',
  content: '',
  ctaText: 'ثبت استعلام قیمت',
  ctaLink: '/inquiry',
  showInNav: true,
  showInFooter: true,
  isPublished: true,
  updatedAt: '',
};

const EMPTY_PRODUCT: ManagedProductItem = {
  id: '',
  slug: '',
  code: 'CUSTOM-BOX',
  title: '',
  category: 'بسته‌بندی اختصاصی',
  inquiryBoxType: 'جعبه اختصاصی و لمینتی',
  inquiryFlute: 'فلوت E یا مقوای ایندربرد',
  defaultDims: '25x18x8',
  specs: ['چاپ افست ۵ رنگ با سلفون مات یا براق', 'برش لیزری دقیق دایکات', 'امکان سفارشی‌سازی ابعاد در استودیو ۳D'],
  tone: '#d97706',
  description: '',
  imageUrl: '',
  isPublished: true,
};

const EMPTY_SERVICE: ManagedServiceItem = {
  id: '',
  slug: '',
  title: '',
  badge: 'Industrial Service',
  specs: ['کیفیت تضمینی خط تولید صنعتی', 'مشاوره مهندسی پیش از چاپ', 'تحویل سریع و زمان‌بندی‌شده'],
  description: '',
  toolPath: '/inquiry',
  toolLabel: 'ثبت درخواست و استعلام قیمت',
  iconName: 'Layers',
  imageUrl: '',
  isPublished: true,
};

const ICON_OPTIONS: Array<{ value: ManagedServiceItem['iconName']; label: string }> = [
  { value: 'Scissors', label: 'دایکات و برش (Scissors)' },
  { value: 'Printer', label: 'چاپ افست (Printer)' },
  { value: 'Box', label: 'کارتن و بسته‌بندی (Box)' },
  { value: 'Cpu', label: 'مدل‌سازی ۳D (Cpu)' },
  { value: 'Layers', label: 'لمینت و تکمیلی (Layers)' },
  { value: 'Sparkles', label: 'خدمات لوکس (Sparkles)' },
  { value: 'ShieldCheck', label: 'تضمین کیفیت (Shield)' },
];

export const AdminContentPagesManager: React.FC = () => {
  const {
    customPages,
    managedProducts,
    managedServices,
    upsertCustomPage,
    deleteCustomPage,
    upsertManagedProduct,
    deleteManagedProduct,
    upsertManagedService,
    deleteManagedService,
  } = useContent();

  const [subTab, setSubTab] = useState<ManagerSubTab>('pages');
  const [notice, setNotice] = useState<string | null>(null);
  const [mediaTarget, setMediaTarget] = useState<'page' | 'product' | 'service' | null>(null);

  // Page form state
  const [pageForm, setPageForm] = useState<CustomPageItem>(EMPTY_PAGE);
  const [slugManualPage, setSlugManualPage] = useState(false);

  // Product form state
  const [productForm, setProductForm] = useState<ManagedProductItem>(EMPTY_PRODUCT);
  const [productSpecsText, setProductSpecsText] = useState(EMPTY_PRODUCT.specs.join('\n'));
  const [slugManualProd, setSlugManualProd] = useState(false);

  // Service form state
  const [serviceForm, setServiceForm] = useState<ManagedServiceItem>(EMPTY_SERVICE);
  const [serviceSpecsText, setServiceSpecsText] = useState(EMPTY_SERVICE.specs.join('\n'));
  const [slugManualSvc, setSlugManualSvc] = useState(false);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3500);
  };

  // --- Pages Handlers ---
  const resetPageForm = () => {
    setPageForm({ ...EMPTY_PAGE });
    setSlugManualPage(false);
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageForm.title.trim() || !pageForm.content.trim()) {
      showToast('لطفاً عنوان صفحه و متن محتوا را تکمیل کنید.');
      return;
    }
    const cleanSlug = toSlug(pageForm.slug || pageForm.title) || `page-${Date.now()}`;
    const item: CustomPageItem = {
      ...pageForm,
      id: pageForm.id || `page-${Date.now()}`,
      slug: cleanSlug,
      title: pageForm.title.trim(),
      content: pageForm.content.trim(),
      updatedAt: new Date().toISOString(),
    };
    await upsertCustomPage(item);
    resetPageForm();
    showToast(`صفحه «${item.title}» با موفقیت ذخیره و منتشر شد.`);
  };

  // --- Products Handlers ---
  const resetProductForm = () => {
    setProductForm({ ...EMPTY_PRODUCT });
    setProductSpecsText(EMPTY_PRODUCT.specs.join('\n'));
    setSlugManualProd(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title.trim() || !productForm.description.trim()) {
      showToast('لطفاً نام محصول و توضیحات فنی را وارد کنید.');
      return;
    }
    const cleanSlug = toSlug(productForm.slug || productForm.title) || `product-${Date.now()}`;
    const parsedSpecs = productSpecsText
      .split(/\n|،|,/)
      .map(s => s.trim())
      .filter(Boolean);
    const item: ManagedProductItem = {
      ...productForm,
      id: productForm.id || `prod-${Date.now()}`,
      slug: cleanSlug,
      title: productForm.title.trim(),
      code: (productForm.code || 'CUSTOM').trim(),
      specs: parsedSpecs.length > 0 ? parsedSpecs : ['ساختار صنعتی استاندارد'],
    };
    await upsertManagedProduct(item);
    resetProductForm();
    showToast(`محصول «${item.title}» در ویترین محصولات ثبت شد.`);
  };

  // --- Services Handlers ---
  const resetServiceForm = () => {
    setServiceForm({ ...EMPTY_SERVICE });
    setServiceSpecsText(EMPTY_SERVICE.specs.join('\n'));
    setSlugManualSvc(false);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.title.trim() || !serviceForm.description.trim()) {
      showToast('لطفاً عنوان خدمت و شرح مهندسی را وارد کنید.');
      return;
    }
    const cleanSlug = toSlug(serviceForm.slug || serviceForm.title) || `service-${Date.now()}`;
    const parsedSpecs = serviceSpecsText
      .split(/\n|،|,/)
      .map(s => s.trim())
      .filter(Boolean);
    const item: ManagedServiceItem = {
      ...serviceForm,
      id: serviceForm.id || `svc-${Date.now()}`,
      slug: cleanSlug,
      title: serviceForm.title.trim(),
      specs: parsedSpecs.length > 0 ? parsedSpecs : ['خدمات تخصصی صنعتی اشک قلم'],
    };
    await upsertManagedService(item);
    resetServiceForm();
    showToast(`خدمت «${item.title}» در بخش خدمات ثبت شد.`);
  };

  return (
    <div className="space-y-6 text-right dir-rtl font-sans">
      {/* Header & Subtabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>مدیریت صفحات جدید، معرفی محصولات و خدمات</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ساخت صفحات دلخواه در سایت (`/pages/:slug`) و افزودن یا ویرایش کارت‌های ویترین محصولات و خدمات صنعتی.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('pages')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'pages'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>صفحات جدید ({customPages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('products')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'products'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>محصولات جدید ({managedProducts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('services')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'services'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>خدمات جدید ({managedServices.length})</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* ==================== 1. CUSTOM PAGES TAB ==================== */}
      {subTab === 'pages' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSavePage} className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>{pageForm.id ? 'ویرایش صفحه اختصاصی' : 'ایجاد صفحه جدید در سایت'}</span>
              </h3>
              {pageForm.id && (
                <button
                  type="button"
                  onClick={resetPageForm}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>انصراف از ویرایش</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان صفحه *</label>
                <input
                  type="text"
                  required
                  value={pageForm.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setPageForm(prev => ({
                      ...prev,
                      title,
                      slug: slugManualPage ? prev.slug : toSlug(title),
                    }));
                  }}
                  placeholder="مثال: راهنمای بسته‌بندی زعفران صادراتی"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نشانی صفحه (Slug) در URL</label>
                <input
                  type="text"
                  dir="ltr"
                  value={pageForm.slug}
                  onChange={(e) => {
                    setSlugManualPage(true);
                    setPageForm(prev => ({ ...prev, slug: e.target.value }));
                  }}
                  placeholder="saffron-packaging-guide"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-mono focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">زیرعنوان / توضیح کوتاه</label>
                <input
                  type="text"
                  value={pageForm.subtitle || ''}
                  onChange={(e) => setPageForm(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="معرفی استانداردها و متریال صادراتی..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">برچسب بالای عنوان (Badge)</label>
                <input
                  type="text"
                  value={pageForm.badge || ''}
                  onChange={(e) => setPageForm(prev => ({ ...prev, badge: e.target.value }))}
                  placeholder="ویژه / اطلاعیه / معرفی"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">تصویر بنر صفحه (اختیاری)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={pageForm.heroImage || ''}
                  onChange={(e) => setPageForm(prev => ({ ...prev, heroImage: e.target.value }))}
                  placeholder="https://... یا انتخاب از کتابخانه"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:border-amber-500 outline-none"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setMediaTarget('page')} className="border-slate-700 text-slate-200">
                  <ImageIcon className="w-3.5 h-3.5 ml-1" />
                  انتخاب تصویر
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">متن کامل محتوای صفحه *</label>
              <textarea
                required
                rows={6}
                value={pageForm.content}
                onChange={(e) => setPageForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="محتوای کامل صفحه را اینجا بنویسید..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white leading-relaxed focus:border-amber-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">متن دکمه فراخوان (CTA)</label>
                <input
                  type="text"
                  value={pageForm.ctaText || ''}
                  onChange={(e) => setPageForm(prev => ({ ...prev, ctaText: e.target.value }))}
                  placeholder="ثبت استعلام قیمت"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">مسیر مقصد دکمه (Route)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={pageForm.ctaLink || ''}
                  onChange={(e) => setPageForm(prev => ({ ...prev, ctaLink: e.target.value }))}
                  placeholder="/inquiry"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-mono focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-slate-950/60 border border-slate-800 rounded-2xl p-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={pageForm.showInNav ?? true}
                  onChange={(e) => setPageForm(prev => ({ ...prev, showInNav: e.target.checked }))}
                  className="accent-amber-500 w-4 h-4"
                />
                <span>نمایش در منوی ناوبری بالای سایت</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={pageForm.showInFooter ?? true}
                  onChange={(e) => setPageForm(prev => ({ ...prev, showInFooter: e.target.checked }))}
                  className="accent-amber-500 w-4 h-4"
                />
                <span>نمایش در فوتر سایت</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-emerald-300">
                <input
                  type="checkbox"
                  checked={pageForm.isPublished}
                  onChange={(e) => setPageForm(prev => ({ ...prev, isPublished: e.target.checked }))}
                  className="accent-emerald-500 w-4 h-4"
                />
                <span>وضعیت انتشار فعال</span>
              </label>
            </div>

            <Button type="submit" variant="primary" className="w-full py-2.5 text-xs font-black">
              <Save className="w-4 h-4 ml-1.5" />
              {pageForm.id ? 'ذخیره تغییرات صفحه' : 'ساخت و انتشار صفحه جدید'}
            </Button>
          </form>

          {/* Existing Pages List */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="font-extrabold text-sm text-white border-b border-slate-800 pb-3">
              صفحات ایجادشده ({customPages.length})
            </h3>
            {customPages.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                هنوز هیچ صفحه اختصاصی ایجاد نشده است. از فرم سمت راست اولین صفحه خود را بسازید.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {customPages.map(page => (
                  <div key={page.id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-white">{page.title}</h4>
                        <span className="text-[10px] font-mono text-amber-400 block mt-0.5" dir="ltr">/pages/{page.slug}</span>
                      </div>
                      <Badge color={page.isPublished ? 'green' : 'gray'}>
                        {page.isPublished ? 'منتشرشده' : 'پیش‌نویس'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/70">
                      <Link
                        to={`/pages/${page.slug}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 font-bold inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        مشاهده صفحه
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setPageForm(page);
                          setSlugManualPage(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-[11px] text-indigo-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => upsertCustomPage({ ...page, isPublished: !page.isPublished })}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        {page.isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {page.isPublished ? 'عدم نمایش' : 'انتشار'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCustomPage(page.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-[11px] text-rose-300 font-bold inline-flex items-center gap-1 mr-auto cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 2. MANAGED PRODUCTS TAB ==================== */}
      {subTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSaveProduct} className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>{productForm.id ? 'ویرایش محصول بسته‌بندی' : 'معرفی محصول جدید در سایت'}</span>
              </h3>
              {productForm.id && (
                <button type="button" onClick={resetProductForm} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                  <span>محصول جدید</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نام محصول *</label>
                <input
                  type="text"
                  required
                  value={productForm.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setProductForm(prev => ({
                      ...prev,
                      title,
                      slug: slugManualProd ? prev.slug : toSlug(title),
                    }));
                  }}
                  placeholder="مثال: جعبه کشویی لاکچری زعفران"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">کد فنی / استاندارد</label>
                <input
                  type="text"
                  dir="ltr"
                  value={productForm.code}
                  onChange={(e) => setProductForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="FEFCO 0427 / LUXURY"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-mono focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">دسته‌بندی</label>
                <input
                  type="text"
                  value={productForm.category}
                  onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">ابعاد پیش‌فرض (L×W×H)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={productForm.defaultDims}
                  onChange={(e) => setProductForm(prev => ({ ...prev, defaultDims: e.target.value }))}
                  placeholder="25x18x8"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">رنگ شاخص کارت</label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                  <input
                    type="color"
                    value={productForm.tone}
                    onChange={(e) => setProductForm(prev => ({ ...prev, tone: e.target.value }))}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-[11px] font-mono text-slate-300">{productForm.tone}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نشانی یکتا (Slug)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={productForm.slug}
                  onChange={(e) => {
                    setSlugManualProd(true);
                    setProductForm(prev => ({ ...prev, slug: e.target.value }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-300 font-mono focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">جنس / فلوت پیشنهادی</label>
                <input
                  type="text"
                  value={productForm.inquiryFlute}
                  onChange={(e) => setProductForm(prev => ({ ...prev, inquiryFlute: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">تصویر محصول (اختیاری — پیش‌فرض تصویر وکتور مهندسی)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={productForm.imageUrl || ''}
                  onChange={(e) => setProductForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://... یا انتخاب از گالری"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:border-indigo-500 outline-none"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setMediaTarget('product')} className="border-slate-700 text-slate-200">
                  <ImageIcon className="w-3.5 h-3.5 ml-1" />
                  انتخاب تصویر
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">توضیحات فنی محصول *</label>
              <textarea
                required
                rows={3}
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white leading-relaxed focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">ویژگی‌ها و مشخصات کلیدی (هر خط یک مورد)</label>
              <textarea
                rows={3}
                value={productSpecsText}
                onChange={(e) => setProductSpecsText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white leading-relaxed focus:border-indigo-500 outline-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-300">
              <input
                type="checkbox"
                checked={productForm.isPublished}
                onChange={(e) => setProductForm(prev => ({ ...prev, isPublished: e.target.checked }))}
                className="accent-emerald-500 w-4 h-4"
              />
              <span>نمایش محصول در صفحه محصولات سایت (`/products`)</span>
            </label>

            <Button type="submit" variant="primary" className="w-full py-2.5 text-xs font-black">
              <Save className="w-4 h-4 ml-1.5" />
              {productForm.id ? 'بروزرسانی مشخصات محصول' : 'افزودن محصول جدید به سایت'}
            </Button>
          </form>

          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white">محصولات ثبت‌شده ({managedProducts.length})</h3>
              <Link to="/products" className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1">
                <span>ویترین محصولات</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {managedProducts.map(prod => (
                <div key={prod.id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-white">{prod.title}</h4>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{prod.category} • {prod.code}</span>
                    </div>
                    <Badge color={prod.isPublished ? 'green' : 'gray'}>
                      {prod.isPublished ? 'فعال' : 'مخفی'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/70">
                    <Link
                      to={`/products/${prod.slug}`}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 font-bold inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      نمایش
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setProductForm(prod);
                        setProductSpecsText(prod.specs.join('\n'));
                        setSlugManualProd(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-[11px] text-indigo-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      ویرایش
                    </button>
                    <button
                      type="button"
                      onClick={() => upsertManagedProduct({ ...prod, isPublished: !prod.isPublished })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {prod.isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {prod.isPublished ? 'مخفی' : 'انتشار'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteManagedProduct(prod.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-[11px] text-rose-300 font-bold inline-flex items-center gap-1 mr-auto cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. MANAGED SERVICES TAB ==================== */}
      {subTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSaveService} className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>{serviceForm.id ? 'ویرایش خدمت صنعتی' : 'معرفی خدمت جدید در سایت'}</span>
              </h3>
              {serviceForm.id && (
                <button type="button" onClick={resetServiceForm} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                  <span>خدمت جدید</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان خدمت *</label>
                <input
                  type="text"
                  required
                  value={serviceForm.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setServiceForm(prev => ({
                      ...prev,
                      title,
                      slug: slugManualSvc ? prev.slug : toSlug(title),
                    }));
                  }}
                  placeholder="مثال: طلاکوب، برجسته‌سازی و UV موضعی"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">برچسب فنی (Badge)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={serviceForm.badge}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, badge: e.target.value }))}
                  placeholder="Hot Foil & Spot UV"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-mono focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نشانی یکتا (Slug)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={serviceForm.slug}
                  onChange={(e) => {
                    setSlugManualSvc(true);
                    setServiceForm(prev => ({ ...prev, slug: e.target.value }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-mono focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">آیکون نمایشی</label>
                <select
                  value={serviceForm.iconName}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, iconName: e.target.value as ManagedServiceItem['iconName'] }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
                >
                  {ICON_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">متن دکمه ابزار مرتبط</label>
                <input
                  type="text"
                  value={serviceForm.toolLabel}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, toolLabel: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">مسیر ابزار یا صفحه هدف</label>
                <input
                  type="text"
                  dir="ltr"
                  value={serviceForm.toolPath}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, toolPath: e.target.value }))}
                  placeholder="/tools/dieline"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-mono focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">تصویر خدمت (اختیاری)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={serviceForm.imageUrl || ''}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://... یا انتخاب از کتابخانه"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:border-emerald-500 outline-none"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setMediaTarget('service')} className="border-slate-700 text-slate-200">
                  <ImageIcon className="w-3.5 h-3.5 ml-1" />
                  انتخاب تصویر
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">شرح فنی خدمت *</label>
              <textarea
                required
                rows={3}
                value={serviceForm.description}
                onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white leading-relaxed focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">مزیت‌ها و مشخصات (هر خط یک مورد)</label>
              <textarea
                rows={3}
                value={serviceSpecsText}
                onChange={(e) => setServiceSpecsText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white leading-relaxed focus:border-emerald-500 outline-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-300">
              <input
                type="checkbox"
                checked={serviceForm.isPublished}
                onChange={(e) => setServiceForm(prev => ({ ...prev, isPublished: e.target.checked }))}
                className="accent-emerald-500 w-4 h-4"
              />
              <span>نمایش خدمت در صفحه خدمات سایت (`/services`)</span>
            </label>

            <Button type="submit" variant="primary" className="w-full py-2.5 text-xs font-black">
              <Save className="w-4 h-4 ml-1.5" />
              {serviceForm.id ? 'بروزرسانی مشخصات خدمت' : 'افزودن خدمت جدید به سایت'}
            </Button>
          </form>

          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white">خدمات ثبت‌شده ({managedServices.length})</h3>
              <Link to="/services" className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1">
                <span>ویترین خدمات</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {managedServices.map(svc => (
                <div key={svc.id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-white">{svc.title}</h4>
                      <span className="text-[10px] font-mono text-emerald-400 block mt-0.5">{svc.badge}</span>
                    </div>
                    <Badge color={svc.isPublished ? 'green' : 'gray'}>
                      {svc.isPublished ? 'فعال' : 'مخفی'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/70">
                    <Link
                      to={`/services/${svc.slug}`}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 font-bold inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      نمایش
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setServiceForm(svc);
                        setServiceSpecsText(svc.specs.join('\n'));
                        setSlugManualSvc(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-[11px] text-indigo-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      ویرایش
                    </button>
                    <button
                      type="button"
                      onClick={() => upsertManagedService({ ...svc, isPublished: !svc.isPublished })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {svc.isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {svc.isPublished ? 'مخفی' : 'انتشار'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteManagedService(svc.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-[11px] text-rose-300 font-bold inline-flex items-center gap-1 mr-auto cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mediaTarget && (
        <MediaSelector
          onClose={() => setMediaTarget(null)}
          onSelect={(url) => {
            if (mediaTarget === 'page') {
              setPageForm(prev => ({ ...prev, heroImage: url }));
            } else if (mediaTarget === 'product') {
              setProductForm(prev => ({ ...prev, imageUrl: url }));
            } else if (mediaTarget === 'service') {
              setServiceForm(prev => ({ ...prev, imageUrl: url }));
            }
            setMediaTarget(null);
          }}
        />
      )}
    </div>
  );
};
