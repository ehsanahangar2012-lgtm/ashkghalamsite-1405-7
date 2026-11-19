import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SeoHead } from './SeoHead';
import { AppView, ManagedProductItem } from '../types';
import { Card, Button, BackButton } from './UIComponents';
import { Package, ArrowLeft, Eye, ShieldCheck, Box } from 'lucide-react';
import { SmartHelpButton } from './SmartHelpModal';
import { createPackageSvgDataUrl } from '../utils/packagePreviewSvg';
import { saveInquiryPrefill } from '../utils/inquiryPrefill';
import { useContent } from '../contexts/ContentContext';
import { NotFound } from './NotFound';
import { findBySlugOrId } from '../utils/slugUtils';

export const ProductsHub: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { managedProducts } = useContent();

  const publishedProducts = managedProducts.filter(p => p.isPublished !== false);
  const activeProduct = slug ? findBySlugOrId(publishedProducts, slug) : null;

  if (slug && !activeProduct) {
    return <NotFound />;
  }

  const handleInquiry = (prod: ManagedProductItem) => {
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
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <BackButton
              label={activeProduct ? 'بازگشت به همه محصولات' : 'بازگشت'}
              to={activeProduct ? '/products' : undefined}
              fallbackPath="/"
              variant="dark"
            />
            <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5" />
              خطوط محصولات مهندسی اشک قلم
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
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
        {publishedProducts.map((prod) => {
          const isCurrent = activeProduct?.slug === prod.slug;
          const styleKey =
            prod.code === 'FEFCO 0201'
              ? 'fefco0201'
              : prod.code === 'FEFCO 0427'
              ? 'fefco0427'
              : prod.code === 'HARDBOX'
              ? 'hardbox'
              : 'stand';
          const previewUrl = prod.imageUrl || createPackageSvgDataUrl(prod.title, prod.category, styleKey, prod.tone);
          return (
            <Card
              key={prod.id || prod.slug}
              className={`group flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                isCurrent
                  ? 'border-amber-500/60 bg-amber-500/5'
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/40'
              }`}
            >
              <div>
                <div className="aspect-[16/9] rounded-2xl bg-slate-950 border border-slate-200 dark:border-slate-800/80 overflow-hidden mb-4 flex items-center justify-center relative">
                  <img
                    src={previewUrl}
                    alt={prod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
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

