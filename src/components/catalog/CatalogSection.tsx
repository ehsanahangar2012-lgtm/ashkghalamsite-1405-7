import React, { useState, useEffect } from 'react';
import { CatalogItem } from '../../types/catalog';
import { catalogService } from '../../services/catalogService';
import { CatalogViewerModal } from './CatalogViewerModal';
import { BookOpen, Eye, Download, Sparkles, ChevronLeft, Search, Tag, Layers } from 'lucide-react';

export const CatalogSection: React.FC = () => {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCatalogs();
  }, [activeCategory, searchQuery]);

  const loadCatalogs = async () => {
    setLoading(true);
    const data = await catalogService.fetchCatalogs({
      isPublishedOnly: true,
      category: activeCategory,
      searchQuery: searchQuery
    });
    setCatalogs(data);
    setLoading(false);
  };

  const categories = ['همه', 'جعبه هاردباکس', 'کارتن‌سازی و لمینت', 'چاپ افست و خدمات تکمیلی'];

  return (
    <section id="catalog-section" className="py-20 bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      {/* Background Subtle Gradient Flares */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>کاتالوگ و ژورنال هوشمند با قابلیت زوم و استعلام قیمت</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
            ژورنال و کاتالوگ‌های تخصصی چاپ و بسته‌بندی
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            مشاهده ساختارهای هاردباکس، کارتن‌های لمینیتی و افکت‌های خاص چاپ افست اشک قلم به همراه نقاط تعاملی و استعلام قیمت آنی.
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-md">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در کاتالوگ‌ها..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Catalogs Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-slate-900/50 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : catalogs.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">هیچ کاتالوگی با این مشخصات یافت نشد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {catalogs.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedCatalog(item)}
                className="group bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/50 rounded-3xl overflow-hidden shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col cursor-pointer"
              >
                {/* Cover Preview Image Container - CONTAIN MODE */}
                <div className="relative h-64 overflow-hidden bg-slate-950/90 flex items-center justify-center p-3 border-b border-slate-800/80">
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-2xl group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Badge & Page count */}
                  <div className="absolute top-3 right-3 px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-full text-[11px] font-bold text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{item.pageCount} صفحه</span>
                  </div>

                  {/* Hover Badge Overlay */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="px-5 py-2.5 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-2xl shadow-xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <BookOpen className="w-4 h-4" />
                      مشاهده کاتالوگ
                    </div>
                  </div>
                </div>

                {/* Content info */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-amber-400 mb-1.5 block">{item.category}</span>
                    <h3 className="font-extrabold text-white text-base mb-2 group-hover:text-amber-300 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 mb-4">
                      {item.description}
                    </p>
                  </div>

                  {/* Footer stats & CTA */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        {item.views || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        {item.downloads || 0}
                      </span>
                    </div>

                    <span className="font-bold text-amber-400 group-hover:translate-x-[-4px] transition-transform flex items-center gap-1">
                      مشاهده
                      <ChevronLeft className="w-4 h-4" />
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* 3D Catalog Modal Reader */}
      <CatalogViewerModal
        catalog={selectedCatalog}
        isOpen={!!selectedCatalog}
        onClose={() => setSelectedCatalog(null)}
      />
    </section>
  );
};
