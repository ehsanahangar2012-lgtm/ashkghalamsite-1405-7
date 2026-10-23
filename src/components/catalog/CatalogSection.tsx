import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { catalogService, CatalogItem } from '../../services/catalogService';
import { Card, Button, Badge } from '../UIComponents';
import { BookOpen, Search, Download, Eye, Layers, Filter } from 'lucide-react';

export const CatalogSection: React.FC = () => {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    catalogService.fetchCatalogs(true).then((data) => {
      setCatalogs(data);
      setLoading(false);
    });
  }, []);

  const categories = ['ALL', ...Array.from(new Set(catalogs.map(c => c.category).filter(Boolean)))];

  const filtered = catalogs.filter(c => {
    const matchCat = selectedCategory === 'ALL' || c.category === selectedCategory;
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || 
                        c.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            کاتالوگ‌های تخصصی اشک قلم
          </span>
          <h1 className="text-3xl font-black text-slate-100 mt-2">کاتالوگ‌های دیجیتال و مهندسی جعبه</h1>
          <p className="text-slate-400 text-sm mt-1">مشاهده و دریافت کاتالوگ‌های رسمی مقاطع قالب، ساختارهای FEFCO و نمونه‌های تولیدی.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="جستجو در کاتالوگ‌ها..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 pl-9 focus:outline-none focus:border-amber-500 w-64"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {categories.length > 2 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'همه کاتالوگ‌ها' : cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-64 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-200 mb-1">کاتالوگی یافت نشد</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            در حال حاضر کاتالوگ عمومی تایید شده‌ای برای این دسته‌بندی وجود ندارد.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map(cat => (
            <Card key={cat.id} className="flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <div className="aspect-[4/3] rounded-xl bg-slate-800 overflow-hidden mb-4 relative">
                  {cat.coverImage ? (
                    <img src={cat.coverImage} alt={cat.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-800/50">
                      <BookOpen className="w-10 h-10 mb-2 opacity-50" />
                      <span className="text-xs">کاتالوگ رسمی</span>
                    </div>
                  )}
                  <span className="absolute top-3 right-3 text-[10px] font-bold bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-md text-amber-400 border border-amber-500/30">
                    {cat.category || 'صنعتی'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-100 mb-1.5 line-clamp-1">{cat.title}</h3>
                {cat.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{cat.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800 mt-2">
                <Link to={`/catalog/${cat.slug || cat.id}`} className="flex-1">
                  <Button variant="primary" size="sm" className="w-full">
                    <Eye className="w-3.5 h-3.5 ml-1" />
                    مشاهده کاتالوگ
                  </Button>
                </Link>
                {cat.pdfUrl && (
                  <a href={cat.pdfUrl} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="outline" size="sm">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
