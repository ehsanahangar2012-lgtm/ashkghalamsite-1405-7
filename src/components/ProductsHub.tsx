import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';
import { Card, Button } from './UIComponents';
import { Box, Package, ShieldCheck, ArrowLeft, Eye } from 'lucide-react';

const products = [
  {
    slug: 'fefco-0201-standard-box',
    title: 'کارتن مادر چهار درب استاندارد (FEFCO 0201)',
    category: 'کارتن‌های صنعتی',
    description: 'کارتن‌های حمل بار عمومی با فلوت B و C و ترکیبی BC، مناسب انبارداری، صنایع غذایی و لوازم خانگی.',
  },
  {
    slug: 'fefco-0427-mailer-box',
    title: 'جعبه کیبوردی خودبست پستی (FEFCO 0427)',
    category: 'جعبه‌های ای‌کامرس',
    description: 'طراحی مقاوم دولایه با زبانه قفل شونده بدون نیاز به چسب، مناسب پوشاک، لوازم الکترونیکی و آرایشی.',
  },
  {
    slug: 'diecut-tray-boxes',
    title: 'سینی کارتن و استند میوه صادراتی (Tray)',
    category: 'صادرات و تره‌بار',
    description: 'مقاومت بالا در سردخانه با کاغذهای نیمه‌ضدآب و قابلیت چیدمان ستونی روی پالت‌های کانتینری.',
  },
];

export const ProductsHub: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const activeProduct = slug ? products.find(p => p.slug === slug) : null;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 font-sans">
      <SeoHead
        view={AppView.PRODUCTS}
        customTitle={activeProduct ? `${activeProduct.title} | محصولات اشک قلم` : 'محصولات کارتن و جعبه اشک قلم'}
        customDescription="انواع کارتن‌های استاندارد ففکو، جعبه‌های کیبوردی، لمینتی و صادراتی مجتمع چاپ اشک قلم."
        canonicalPath={slug ? `/products/${slug}` : '/products'}
      />

      <div className="mb-8">
        <span className="text-xs font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          دسته‌بندی محصولات
        </span>
        <h1 className="text-3xl font-black text-slate-100 mt-2">
          {activeProduct ? activeProduct.title : 'انواع جعبه و کارتن‌های مهندسی اشک قلم'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">تولید مطابق استانداردهای بین‌المللی با ورق‌های درجه یک و دایکات دقیق.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((prod) => {
          const isCurrent = activeProduct?.slug === prod.slug;
          return (
            <Card
              key={prod.slug}
              className={`flex flex-col justify-between transition-all ${
                isCurrent ? 'border-amber-500/50 bg-amber-500/5' : 'hover:border-slate-700'
              }`}
            >
              <div>
                <div className="aspect-[4/3] rounded-xl bg-slate-800 overflow-hidden mb-4 flex items-center justify-center">
                  <Package className="w-12 h-12 text-amber-500/70" />
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                  {prod.category}
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-2 mb-1.5">{prod.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{prod.description}</p>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-800">
                <Link to={`/products/${prod.slug}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-3.5 h-3.5 ml-1" />
                    مشخصات فنی
                  </Button>
                </Link>
                <Link to="/inquiry">
                  <Button variant="primary" size="sm">
                    استعلام
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
