import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';
import { Card, Button } from './UIComponents';
import { Package, ArrowLeft, Eye, ShieldCheck, Box } from 'lucide-react';
import { SmartHelpButton } from './SmartHelpModal';
import { createPackageSvgDataUrl } from '../utils/packagePreviewSvg';
import { saveInquiryPrefill } from '../utils/inquiryPrefill';

const products = [
  {
    slug: 'fefco-0201-standard-box',
    code: 'FEFCO 0201',
    title: 'کارتن مادر چهار درب استاندارد (FEFCO 0201)',
    category: 'کارتن‌های صنعتی',
    inquiryBoxType: 'کارتن چهار درب (FEFCO 0201)',
    inquiryFlute: 'فلوت B (سه لایه استاندارد)',
    defaultDims: '40x30x25',
    specs: ['فلوت B / C / پنج لایه BC', 'تحمل ستونی BCT بالا', 'چاپ فلکسو یا لمینت افست'],
    tone: '#b45309',
    description: 'کارتن‌های حمل بار عمومی با ورق‌های ۳ لایه و ۵ لایه، مناسب انبارداری، صادرات، صنایع غذایی و لوازم خانگی.',
  },
  {
    slug: 'fefco-0427-mailer-box',
    code: 'FEFCO 0427',
    title: 'جعبه کیبوردی خودبست پستی (FEFCO 0427)',
    category: 'جعبه‌های ای‌کامرس',
    inquiryBoxType: 'جعبه کیبوردی قفل‌دار (FEFCO 0427)',
    inquiryFlute: 'فلوت E (ظریف و لمینتی)',
    defaultDims: '25x18x8',
    specs: ['فلوت E ظریف یا ایندربرد', 'دیواره جانبی دوبل بدون چسب', 'ایده‌آل فروشگاه‌های آنلاین'],
    tone: '#1d4ed8',
    description: 'طراحی مقاوم دولایه با زبانه قفل شونده بدون نیاز به چسب، مناسب پوشاک، لوازم الکترونیکی، هدایا و آرایشی.',
  },
  {
    slug: 'diecut-tray-boxes',
    code: 'DIE-TRAY',
    title: 'سینی کارتن و استند میوه صادراتی (Tray)',
    category: 'صادرات و تره‌بار',
    inquiryBoxType: 'کارتن چهار درب (FEFCO 0201)',
    inquiryFlute: 'فلوت BC (پنج لایه سنگین صادراتی)',
    defaultDims: '50x35x14',
    specs: ['مقاوم در برابر رطوبت سردخانه', 'قفل گوشه چیدمان کانتینری', 'دریچه تهویه لیزری'],
    tone: '#047857',
    description: 'مقاومت بالا در سردخانه با کاغذهای لاینر مقاوم به رطوبت و قابلیت چیدمان ستونی روی پالت‌های کانتینری.',
  },
  {
    slug: 'magnetic-luxury-hardbox',
    code: 'HARDBOX',
    title: 'هاردباکس مگنتی و جعبه لوکس صادراتی',
    category: 'بسته‌بندی لوکس و زعفران',
    inquiryBoxType: 'هاردباکس مگنتی و لوکس',
    inquiryFlute: 'مقوای ایندربرد / گلاسه',
    defaultDims: '22x16x9',
    specs: ['مقوای سخت ۲ تا ۳ میلی‌متر', 'روکش مخملی یا گلاسه + طلاکوب', 'درب مگنتی + فوم برش‌خورده'],
    tone: '#7c3aed',
    description: 'جعبه سخت لوکس برای زعفران، عطر، جواهرات و پکیج‌های هدیه مدیریتی با جزئیات چاپ ویژه.',
  },
];

export const ProductsHub: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const activeProduct = slug ? products.find(p => p.slug === slug) : null;

  const handleInquiry = (prod: typeof products[0]) => {
    saveInquiryPrefill({
      sourceLabel: `بخش محصولات: ${prod.title}`,
      boxType: prod.inquiryBoxType,
      fluteType: prod.inquiryFlute,
      dimensions: prod.defaultDims,
      quantity: '1000',
      notes: `محصول انتخابی: ${prod.title} (${prod.code})`,
    });
    navigate('/inquiry');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 font-sans dir-rtl text-right">
      <SeoHead
        view={AppView.PRODUCTS}
        customTitle={activeProduct ? `${activeProduct.title} | محصولات اشک قلم` : 'محصولات کارتن و جعبه اشک قلم'}
        customDescription="انواع کارتن‌های استاندارد ففکو، جعبه‌های کیبوردی، لمینتی و صادراتی مجتمع چاپ اشک قلم."
        canonicalPath={slug ? `/products/${slug}` : '/products'}
      />

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-l from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 p-6 rounded-3xl shadow-2xl text-white">
        <div>
          <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5" />
            خطوط محصولات مهندسی اشک قلم
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-3">
            {activeProduct ? activeProduct.title : 'انواع جعبه و کارتن‌های مهندسی و صادراتی'}
          </h1>
          <p className="text-slate-300 text-sm mt-1.5">تولید مطابق استانداردهای FEFCO و ECMA با برش دایکات لیزری و پیش‌نمایش سه‌بعدی در استودیو CAD.</p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-center">
          <SmartHelpButton
            title="راهنمای انتخاب محصول بسته‌بندی"
            description="تمامی سازه‌های نمایش‌داده‌شده در این صفحه مستقیماً در جعبه‌ساز سه‌بعدی قابل شخصی‌سازی ابعادی هستند."
            steps={[
              'محصول متناسب با وزن و حساسیت کالای خود را انتخاب کنید.',
              'برای ورود مستقیم به مدل سه‌بعدی روی دکمه باز کردن در جعبه‌ساز ۳D بزنید.',
              'برای تیراژ و قیمت دقیق، دکمه استعلام قیمت را انتخاب کنید.'
            ]}
          />
          <Link to="/tools/dieline">
            <Button variant="primary" size="sm" className="text-xs font-bold">
              سفارش‌سازی ابعاد در ۳D
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {products.map((prod) => {
          const isCurrent = activeProduct?.slug === prod.slug;
          const styleKey =
            prod.code === 'FEFCO 0201'
              ? 'fefco0201'
              : prod.code === 'FEFCO 0427'
              ? 'fefco0427'
              : prod.code === 'HARDBOX'
              ? 'hardbox'
              : 'stand';
          const previewSvg = createPackageSvgDataUrl(prod.title, prod.category, styleKey, prod.tone);
          return (
            <Card
              key={prod.slug}
              className={`group flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                isCurrent
                  ? 'border-amber-500/60 bg-amber-500/5'
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/40'
              }`}
            >
              <div>
                <div className="aspect-[16/9] rounded-2xl bg-slate-950 border border-slate-200 dark:border-slate-800/80 overflow-hidden mb-4 flex items-center justify-center relative">
                  <img
                    src={previewSvg}
                    alt={prod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 right-3 text-[10px] font-mono font-bold text-amber-300 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-amber-500/30">
                    {prod.code}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 inline-flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {prod.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2.5 mb-1.5">{prod.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{prod.description}</p>
                <div className="space-y-1.5 mb-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/70 rounded-2xl p-3">
                  {prod.specs.map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Link to="/tools/dieline" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <Eye className="w-3.5 h-3.5 ml-1" />
                    طراحی سه‌بعدی این ساختار
                  </Button>
                </Link>
                <Link to={`/products/${prod.slug}`}>
                  <Button variant="ghost" size="sm" className="text-xs">
                    مشخصات
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  </Button>
                </Link>
                <Button variant="primary" size="sm" className="text-xs font-bold" onClick={() => handleInquiry(prod)}>
                  استعلام
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
