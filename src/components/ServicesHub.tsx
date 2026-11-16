import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';
import { Card, Button } from './UIComponents';
import { Printer, Box, Scissors, Cpu, ArrowLeft, Layers, ShieldCheck } from 'lucide-react';
import { SmartHelpButton } from './SmartHelpModal';
import { saveInquiryPrefill } from '../utils/inquiryPrefill';

const services = [
  {
    slug: 'die-cutting-engineering',
    title: 'مهندسی قالب دایکات و ساخت تیغ لیزری',
    badge: 'Precision CAD',
    specs: ['تلورانس خط تا ±۰.۱۵ میلی‌متر', 'پشتیبانی کامل Bobst و فکی', 'خروجی DXF و AutoCAD'],
    description: 'طراحی تخصصی قالب‌های تخت و روتاری با خطوط تا (Crease) و برش (Cut) مهندسی‌شده برای جعبه‌های صادراتی، دارویی و صنعتی.',
    toolPath: '/tools/dieline',
    toolLabel: 'ورود به مهندسی دایلاین ۳D',
    icon: Scissors,
  },
  {
    slug: 'offset-printing',
    title: 'چاپ افست کارتن و لمینت تا ابعاد شیت بزرگ',
    badge: 'Offset 5-Color',
    specs: ['شیت تا ۱۰۰×۷۰ و فوق بزرگ', 'سلفون مات/براق، UV موضعی و طلاکوب', 'چیدمان بهینه فرم زینک'],
    description: 'چاپ ۵ رنگ همزمان با دقت رنگ CMYK و پنتون، پوشش ورنی پایه آب، سلفون مات و براق، و خدمات تکمیلی طلاکوب و برجسته‌سازی.',
    toolPath: '/tools/design-studio',
    toolLabel: 'ورود به استودیو طراحی و چاپ',
    icon: Printer,
  },
  {
    slug: 'corrugated-packaging',
    title: 'تولید ورق و کارتن ۳ لایه و ۵ لایه صنعتی',
    badge: 'E / B / C / BC Flute',
    specs: ['محاسبه آنلاین مقاومت فشاری BCT', 'تست رطوبت سردخانه و کانتینر', 'ورق کرافت، تست لاینر و سفید'],
    description: 'تولید انواع کارتن مادر، سینی میوه صادراتی و جعبه‌های ای‌کامرس با کنترل مهندسی ضریب ایمنی چیدمان پالت و حمل دریایی.',
    toolPath: '/tools/dieline',
    toolLabel: 'محاسبه مقاومت BCT و قالب',
    icon: Box,
  },
  {
    slug: 'structural-3d-cad',
    title: 'مدل‌سازی سه‌بعدی تعاملی و ماکت قبل از تیراژ',
    badge: 'Interactive PBR 3D',
    specs: ['پیش‌نمایش تاشدن در زوایای ۳۶۰°', 'تست فیزیکی تناسب ابعاد', 'نمونه‌سازی سریع برش پلاتر'],
    description: 'بررسی دقیق فیتینگ محصول داخل جعبه و رندر سه‌بعدی متریال کرافت و ایندربرد در مرورگر پیش از ساخت قالب و شروع تیراژ.',
    toolPath: '/tools/autocad',
    toolLabel: 'ورود به کارگاه CAD',
    icon: Cpu,
  },
];

export const ServicesHub: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const activeService = slug ? services.find(s => s.slug === slug) : null;

  const handleInquiry = (svc: typeof services[0]) => {
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
          <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            توانمندی‌های تولیدی و مهندسی اشک قلم
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-3">
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
        {services.map((svc) => {
          const Icon = svc.icon;
          const isCurrent = activeService?.slug === svc.slug;
          return (
            <Card
              key={svc.slug}
              className={`group flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                isCurrent
                  ? 'border-amber-500/60 bg-amber-500/5'
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/40'
              }`}
            >
              <div>
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
                <Link to={svc.toolPath}>
                  <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400 hover:text-amber-500 text-xs">
                    {svc.toolLabel}
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
