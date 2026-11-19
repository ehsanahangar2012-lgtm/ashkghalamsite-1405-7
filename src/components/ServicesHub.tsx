import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SeoHead } from './SeoHead';
import { AppView, ManagedServiceItem } from '../types';
import { Card, Button, BackButton } from './UIComponents';
import { Printer, Box, Scissors, Cpu, ArrowLeft, Layers, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import { SmartHelpButton } from './SmartHelpModal';
import { saveInquiryPrefill } from '../utils/inquiryPrefill';
import { useContent } from '../contexts/ContentContext';
import { NotFound } from './NotFound';
import { findBySlugOrId } from '../utils/slugUtils';

const SERVICE_ICONS: Record<ManagedServiceItem['iconName'], LucideIcon> = {
  Scissors,
  Printer,
  Box,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
};

export const ServicesHub: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { managedServices } = useContent();

  const publishedServices = managedServices.filter(s => s.isPublished !== false);
  const activeService = slug ? findBySlugOrId(publishedServices, slug) : null;

  if (slug && !activeService) {
    return <NotFound />;
  }

  const handleInquiry = (svc: ManagedServiceItem) => {
    saveInquiryPrefill({
      sourceLabel: `بخش خدمات: ${svc.title}`,
      notes: `خدمت انتخابی: ${svc.title} (${svc.badge})`,
    });
    navigate('/inquiry');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 font-sans dir-rtl text-right">
      <SeoHead
        view={AppView.SERVICES}
        customTitle={activeService ? `${activeService.title} | خدمات اشک قلم` : 'خدمات چاپ و بسته‌بندی کارتن اشک قلم'}
        customDescription="خدمات مهندسی دایکات، چاپ افست، شیت‌بندی بهینه و تولید جعبه صنعتی در مجتمع چاپ اشک قلم."
        canonicalPath={slug ? `/services/${slug}` : '/services'}
      />

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-l from-slate-900 via-slate-900 to-amber-950/60 border border-slate-800 p-6 rounded-3xl shadow-2xl text-white">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <BackButton
              label={activeService ? 'بازگشت به همه خدمات' : 'بازگشت'}
              to={activeService ? '/services' : undefined}
              fallbackPath="/"
              variant="dark"
            />
            <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              توانمندی‌های تولیدی و مهندسی اشک قلم
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
            {activeService ? activeService.title : 'خدمات جامع مهندسی چاپ و کارتن‌سازی سه‌بعدی'}
          </h1>
          <p className="text-slate-300 text-sm mt-1.5 max-w-2xl leading-relaxed">
            از ایده و مدل‌سازی سه‌بعدی در استودیو CAD تا تیغ‌سازی لیزری، چاپ افست، لمینت و تحویل تیراژ کارخانه.
          </p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-center">
          <SmartHelpButton
            title="راهنمای خدمات مهندسی اشک قلم"
            description="هر یک از کارت‌های خدمات به ابزار تخصصی مربوطه در پلتفرم متصل است تا پیش از ثبت سفارش، نقشه، ابعاد و استحکام کارتن را دقیق بررسی کنید."
            steps={[
              'روی ابزار مهندسی مرتبط با هر خدمت کلیک کنید.',
              'ابعاد و گرماژ مقوا را تست و فایل DXF/تصویر خروجی بگیرید.',
              'برای استعلام قیمت فوری دکمه ثبت استعلام را انتخاب کنید.'
            ]}
          />
          <Link to="/tools/dieline">
            <Button variant="primary" size="sm" className="text-xs font-bold">
              ورود به کارگاه سه‌بعدی
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {publishedServices.map((svc) => {
          const Icon = SERVICE_ICONS[svc.iconName] || Layers;
          const isCurrent = activeService?.slug === svc.slug;
          return (
            <Card
              key={svc.id || svc.slug}
              className={`group flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                isCurrent
                  ? 'border-amber-500/60 bg-amber-500/5'
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/40'
              }`}
            >
              <div>
                {svc.imageUrl && (
                  <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 mb-4">
                    <img
                      src={svc.imageUrl}
                      alt={svc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {svc.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{svc.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{svc.description}</p>
                <div className="space-y-1.5 mb-6 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/70 rounded-2xl p-3">
                  {svc.specs.map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Link to={svc.toolPath || '/inquiry'}>
                  <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400 hover:text-amber-500 text-xs">
                    {svc.toolLabel || 'ورود به ابزار مرتبط'}
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <Link to={`/services/${svc.slug}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      جزئیات
                    </Button>
                  </Link>
                  <Button variant="primary" size="sm" className="text-xs font-bold" onClick={() => handleInquiry(svc)}>
                    ثبت استعلام
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

