import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useContent } from '../contexts/ContentContext';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';
import { BackButton, Button, Card } from './UIComponents';
import { NotFound } from './NotFound';
import { findBySlugOrId } from '../utils/slugUtils';
import { Sparkles, ArrowLeft, Calculator } from 'lucide-react';

export const CustomPageView: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { customPages } = useContent();

  const publishedPages = customPages.filter(p => p.isPublished);
  const page = slug ? findBySlugOrId(publishedPages, slug) : publishedPages[0];

  if (!page) {
    return <NotFound />;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 font-sans dir-rtl text-right">
      <SeoHead
        view={AppView.CUSTOM_PAGE}
        customTitle={`${page.title} | اشک قلم`}
        customDescription={page.subtitle || page.content.slice(0, 155)}
        canonicalPath={`/pages/${page.slug}`}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <BackButton label="بازگشت" fallbackPath="/" variant="auto" />
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:text-amber-500 font-bold">خانه</Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[240px]">{page.title}</span>
        </div>
      </div>

      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 p-0 shadow-xl">
        {page.heroImage && (
          <div className="w-full max-h-[380px] overflow-hidden bg-slate-950 border-b border-slate-800">
            <img
              src={page.heroImage}
              alt={page.title}
              className="w-full h-full max-h-[380px] object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="p-6 md:p-10 space-y-6">
          <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
            {page.badge && (
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                {page.badge}
              </span>
            )}
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight">
              {page.title}
            </h1>
            {page.subtitle && (
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {page.subtitle}
              </p>
            )}
          </div>

          <div className="text-sm md:text-base text-slate-700 dark:text-slate-200 leading-loose whitespace-pre-line">
            {page.content}
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {page.ctaText && page.ctaLink && (
                <Link to={page.ctaLink}>
                  <Button variant="primary" size="md" className="text-xs md:text-sm font-black">
                    <span>{page.ctaText}</span>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                  </Button>
                </Link>
              )}
              <Link to="/inquiry">
                <Button variant="outline" size="md" className="text-xs md:text-sm font-bold">
                  <Calculator className="w-4 h-4 ml-1" />
                  استعلام فوری قیمت
                </Button>
              </Link>
            </div>
            <BackButton label="بازگشت به صفحه قبل" fallbackPath="/" variant="auto" />
          </div>
        </div>
      </Card>
    </div>
  );
};
