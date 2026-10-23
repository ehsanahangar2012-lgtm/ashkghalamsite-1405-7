import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { catalogService, CatalogItem } from '../../services/catalogService';
import { SeoHead } from '../SeoHead';
import { Button, Card } from '../UIComponents';
import { NotFound } from '../NotFound';
import { BookOpen, Download, ChevronRight, HelpCircle, ArrowRight, Share2, Layers, CheckCircle } from 'lucide-react';

export const CatalogItemPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (slug) {
      setLoading(true);
      catalogService.getCatalogBySlugOrId(slug).then((cat) => {
        setCatalog(cat);
        setLoading(false);
      });
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-400">در حال بارگذاری کاتالوگ...</p>
      </div>
    );
  }

  if (!catalog) {
    return <NotFound />;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 font-sans">
      <SeoHead
        customTitle={`${catalog.title} | کاتالوگ رسمی اشک قلم`}
        customDescription={catalog.description || `مشاهده و دریافت کاتالوگ ${catalog.title} در صنایع بسته‌بندی اشک قلم.`}
        canonicalPath={`/catalog/${catalog.slug || catalog.id}`}
        noIndex={false}
      />

      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/catalog')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors font-bold cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
          <span>بازگشت به فهرست کاتالوگ‌ها</span>
        </button>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg cursor-pointer"
          title="راهنمای کاتالوگ"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>راهنما</span>
        </button>
      </div>

      {showHelp && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
          <p className="font-bold mb-1">راهنمای مطالعه و استعلام:</p>
          <p>
            این کاتالوگ شامل مشخصات فنی، خطوط تا و برش، و ضخامت فلوت‌های مقوا برای تولید کارتن است. برای دریافت فایل وکتور DXF یا سفارش ساخت قالب دایکات، می‌توانید از طریق دکمه «ثبت استعلام» با شماره کارتن به مهندسی اشک قلم ارجاع دهید.
          </p>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2 rounded-2xl bg-slate-800 overflow-hidden min-h-[300px] flex items-center justify-center relative">
            {catalog.coverImage ? (
              <img src={catalog.coverImage} alt={catalog.title} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-8 text-slate-500">
                <BookOpen className="w-16 h-16 mx-auto mb-3 opacity-40 text-amber-500" />
                <span className="text-sm font-bold text-slate-300">{catalog.title}</span>
              </div>
            )}
            <span className="absolute top-4 right-4 text-xs font-bold bg-slate-950/90 backdrop-blur px-3 py-1 rounded-lg text-amber-400 border border-amber-500/30">
              {catalog.category}
            </span>
          </div>

          <div className="md:w-1/2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono text-slate-400">شناسه: {catalog.slug || catalog.id}</span>
              <h1 className="text-2xl font-black text-slate-100 mt-1 mb-4">{catalog.title}</h1>

              {catalog.description && (
                <p className="text-sm text-slate-300 leading-relaxed mb-6 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                  {catalog.description}
                </p>
              )}

              <div className="space-y-2 mb-6 text-xs text-slate-400">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span>وضعیت انتشار:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    رسمی و تایید شده
                  </span>
                </div>
                {catalog.pageCount && (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                    <span>تعداد صفحات:</span>
                    <span className="text-slate-200 font-mono font-bold">{catalog.pageCount} صفحه</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
              {catalog.pdfUrl ? (
                <a href={catalog.pdfUrl} target="_blank" rel="noopener noreferrer" download className="flex-1">
                  <Button variant="primary" className="w-full">
                    <Download className="w-4 h-4 ml-2" />
                    دریافت فایل PDF
                  </Button>
                </a>
              ) : (
                <Link to="/inquiry" className="flex-1">
                  <Button variant="primary" className="w-full">
                    ثبت استعلام این مدل
                  </Button>
                </Link>
              )}
              <Link to="/inquiry" className="sm:w-auto">
                <Button variant="outline">
                  استعلام قیمت
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
