import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';
import { Card, Button } from './UIComponents';
import { Printer, Box, Layers, Scissors, Truck, Cpu, ArrowLeft } from 'lucide-react';

const services = [
  {
    slug: 'die-cutting-engineering',
    title: 'مهندسی قالب دایکات و ساخت تیغ لیرزی',
    description: 'طراحی تخصصی قالب‌های تخت و روتاری با خطوط تا (Crease) و برش (Cut) فوق‌العاده دقیق برای دستگاه‌های Bobst و Heidelberg.',
    icon: Scissors,
  },
  {
    slug: 'offset-printing',
    title: 'چاپ افست کارتن و لمینت تا ابعاد شیت بزرگ',
    description: 'چاپ ۵ رنگ همزمان، پوشش ورنی پایه آب، سلفون مات و براق، و طلاکوب اختصاصی بسته‌بندی.',
    icon: Printer,
  },
  {
    slug: 'corrugated-packaging',
    title: 'تولید ورق و کارتن ۳ لایه و ۵ لایه صنعتی',
    description: 'تامین ورق‌های کارتن با فلوت B, C, E و ترکیبی BC با بالاترین استانداردهای مقاومت فشاری BCT و رطوبت.',
    icon: Box,
  },
  {
    slug: 'structural-3d-cad',
    title: 'مدل‌سازی سه‌بعدی و ماکت‌سازی قبل از تیراژ',
    description: 'بررسی فیتینگ محصول داخل جعبه، رندر سه‌بعدی واقع‌گرایانه و ساخت نمونه ماکت بدون هزینه قالب.',
    icon: Cpu,
  },
];

export const ServicesHub: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const activeService = slug ? services.find(s => s.slug === slug) : null;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 font-sans">
      <SeoHead
        view={AppView.SERVICES}
        customTitle={activeService ? `${activeService.title} | خدمات اشک قلم` : 'خدمات چاپ و بسته‌بندی کارتن اشک قلم'}
        customDescription="خدمات مهندسی دایکات، چاپ افست، شیت‌بندی بهینه و تولید جعبه صنعتی در مجتمع چاپ اشک قلم."
        canonicalPath={slug ? `/services/${slug}` : '/services'}
      />

      <div className="mb-8">
        <span className="text-xs font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          توانمندی‌های تولیدی اشک قلم
        </span>
        <h1 className="text-3xl font-black text-slate-100 mt-2">
          {activeService ? activeService.title : 'خدمات جامع مهندسی چاپ و کارتن‌سازی'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          از ایده و طراحی الگو در استودیو CAD تا قالب‌سازی لیزری، چاپ شیت و تحویل سریع بار کارتن.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((svc) => {
          const Icon = svc.icon;
          const isCurrent = activeService?.slug === svc.slug;
          return (
            <Card
              key={svc.slug}
              className={`flex flex-col justify-between transition-all ${
                isCurrent ? 'border-amber-500/50 bg-amber-500/5' : 'hover:border-slate-700'
              }`}
            >
              <div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 w-fit mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">{svc.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">{svc.description}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <Link to={`/services/${svc.slug}`}>
                  <Button variant="ghost" size="sm">
                    جزئیات خدمت
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  </Button>
                </Link>
                <Link to="/inquiry">
                  <Button variant="primary" size="sm">
                    ثبت استعلام
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
