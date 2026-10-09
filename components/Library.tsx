import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Download, Search, FileText, Cpu, CheckCircle2, 
  FileCode2, Sparkles, Filter, ExternalLink, HardDrive, Eye,
  Plus, Trash2, Edit3, X, User, Calendar, Layers, ShieldCheck, Check, Info, FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CatalogViewerModal } from '../src/components/catalog/CatalogViewerModal';
import { catalogService } from '../src/services/catalogService';
import { CatalogItem } from '../src/types/catalog';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { LibraryBookItem, UserRole } from '../types';
import { createSvgPlaceholder } from '../utils/imageCache';

// Initial default items - cleared to prevent hardcoded simulated data
const INITIAL_LIBRARY_ITEMS: LibraryBookItem[] = [];

export const Library: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [items, setItems] = useState<LibraryBookItem[]>(() => {
    const saved = localStorage.getItem('ashk_library_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return INITIAL_LIBRARY_ITEMS;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  // Flipbook Modal Viewer State
  const [activeFlipbookCatalog, setActiveFlipbookCatalog] = useState<CatalogItem | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Detail Modal State
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<LibraryBookItem | null>(null);

  // Admin Add / Edit Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<LibraryBookItem> | null>(null);

  useEffect(() => {
    localStorage.setItem('ashk_library_items', JSON.stringify(items));
  }, [items]);

  const categories = [
    { id: 'all', label: 'همه موارد' },
    { id: 'books', label: 'کتاب‌ها و راهنماها' },
    { id: 'catalogs', label: 'کاتالوگ‌های رسمی' },
    { id: 'cad', label: 'قالب‌های CAD و دایلاین' },
    { id: 'software', label: 'نرم‌افزار و پروفایل رنگ' }
  ];

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.author && item.author.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleDownload = (item: LibraryBookItem) => {
    setDownloadingId(item.id);
    setTimeout(() => {
      setDownloadingId(null);
      setDownloadSuccessMessage(`درخواست دانلود فایل "${item.title}" با موفقیت تایید شد.`);
      
      // Update download count
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, downloadsCount: i.downloadsCount + 1 } : i));

      // Generate downloadable summary file
      const content = `گروه صنعتی اشک قلم و بادیکاران توس - مرکز دانلودهای تخصصی\n\nعنوان فایل: ${item.title}\nدسته‌بندی: ${item.categoryLabel}\nفرمت: ${item.format}\nحجم: ${item.fileSize}\nنویسنده/ناشر: ${item.author || 'اشک قلم'}\nتوضیحات: ${item.description}\n\nتاریخ دریافت: ${new Date().toLocaleDateString('fa-IR')}\nبا تشکر از اعتماد شما به صنایع چاپ و بسته‌بندی اشک قلم.`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.id}-${item.title.slice(0, 20)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setTimeout(() => setDownloadSuccessMessage(null), 4000);
    }, 800);
  };

  const handleOpen3DViewer = (item: LibraryBookItem) => {
    const catalogItem: CatalogItem = {
      id: item.id,
      uuid: item.id,
      title: item.title,
      slug: item.id,
      description: item.description,
      category: item.categoryLabel,
      coverImage: item.coverImage || createSvgPlaceholder(item.title),
      thumbnailUrl: item.coverImage || createSvgPlaceholder(item.title),
      pageCount: item.catalogPages?.length || item.pagesCount || 8,
      language: 'فارسی',
      publisher: item.author || 'اشک قلم',
      createdAt: item.dateAdded,
      updatedAt: item.dateAdded,
      isPublished: true,
      featured: true,
      sortOrder: 1,
      views: 120,
      downloads: item.downloadsCount,
      pages: (item.catalogPages && item.catalogPages.length > 0) ? item.catalogPages.map((pg, idx) => ({
        pageNumber: idx + 1,
        imageUrl: pg,
        thumbnailUrl: pg
      })) : [
        { pageNumber: 1, imageUrl: item.coverImage || createSvgPlaceholder(item.title, 1) },
        { pageNumber: 2, imageUrl: createSvgPlaceholder(item.title, 2) },
        { pageNumber: 3, imageUrl: createSvgPlaceholder(item.title, 3) },
        { pageNumber: 4, imageUrl: createSvgPlaceholder(item.title, 4) }
      ]
    };
    setActiveFlipbookCatalog(catalogItem);
    setIsViewerOpen(true);
  };

  const handleSaveBook = () => {
    if (!editingItem || !editingItem.title) return;

    if (editingItem.id) {
      // Edit existing
      setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...editingItem } as LibraryBookItem : i));
    } else {
      // Create new
      const newItem: LibraryBookItem = {
        id: `lib_${Date.now()}`,
        title: editingItem.title || 'عنوان جدید',
        category: editingItem.category || 'books',
        categoryLabel: editingItem.category === 'catalogs' ? 'کاتالوگ‌های رسمی' : editingItem.category === 'cad' ? 'قالب‌های CAD' : editingItem.category === 'software' ? 'نرم‌افزار و پروفایل' : 'کتاب‌ها و راهنماها',
        fileSize: editingItem.fileSize || '5.0 MB',
        format: editingItem.format || 'PDF',
        description: editingItem.description || '',
        coverImage: editingItem.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        downloadsCount: 0,
        dateAdded: new Date().toLocaleDateString('fa-IR'),
        author: editingItem.author || 'دپارتمان تخصصی اشک قلم',
        pagesCount: editingItem.pagesCount || 50
      };
      setItems(prev => [newItem, ...prev]);
    }
    setIsAdminModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteBook = (id: string) => {
    if (confirm('آیا از حذف این فایل از کتابخانه اطمینان دارید؟')) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 text-right" dir="rtl">
      {/* 3D Flipbook Viewer Modal */}
      {isViewerOpen && activeFlipbookCatalog && (
        <CatalogViewerModal
          catalog={activeFlipbookCatalog}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
        />
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 shadow-2xl relative overflow-hidden border border-indigo-500/20">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-10 top-10 w-60 h-60 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
              <BookOpen className="w-4 h-4 text-indigo-300 animate-pulse" />
              <span>کتابخانه دیجیتال و مرکز دانلود مرجع K-Book</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              دانلود کتاب‌های تخصصی، کاتالوگ‌ها و نرم‌افزارهای چاپ
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              مجموعه کامل مرجع‌های مهندسی بسته‌بندی، راهنماهای لیتوگرافی، پروفایل‌های کالیبراسیون رنگ ICC، کاتالوگ‌های لایه باز و قالب‌های CAD سه‌بعدی به همراه قابلیت ورق زدن آنلاین ۳D.
            </p>
          </div>

          {/* Admin Quick Action Button */}
          {isAdmin && (
            <button
              onClick={() => {
                setEditingItem({});
                setIsAdminModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 shrink-0 border border-indigo-400/30 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن کتاب / کاتالوگ جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Toast */}
      {downloadSuccessMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold animate-in fade-in duration-300 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{downloadSuccessMessage}</span>
          </div>
          <button onClick={() => setDownloadSuccessMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Categories Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800/90 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm backdrop-blur-md">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="جستجو در کتاب‌ها، نویسنده یا کاتالوگ‌ها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white text-xs rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Categories Tabs */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start overflow-x-auto pb-1 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/70 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
          >
            <div>
              {/* Cover Thumbnail Image Box */}
              <div className="relative h-48 sm:h-52 w-full bg-slate-900 overflow-hidden">
                <img
                  src={item.coverImage || createSvgPlaceholder(item.title)}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
                
                {/* Top Category Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span className="text-[10px] font-black bg-indigo-600/90 backdrop-blur-md text-white px-3 py-1 rounded-full shadow-lg border border-indigo-400/30">
                    {item.categoryLabel}
                  </span>
                </div>

                {/* Top Right Admin Controls */}
                {isAdmin && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setIsAdminModalOpen(true);
                      }}
                      className="p-1.5 text-slate-200 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                      title="ویرایش"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBook(item.id)}
                      className="p-1.5 text-red-400 hover:text-red-200 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Bottom Overlay Title & Format */}
                <div className="absolute bottom-3 right-3 left-3 text-white space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono">
                    <span className="flex items-center gap-1 text-indigo-300 font-sans font-bold">
                      <User className="w-3 h-3" />
                      {item.author || 'اشک قلم'}
                    </span>
                    <span className="bg-slate-900/80 px-2 py-0.5 rounded text-[9.5px]">
                      {item.format} • {item.fileSize}
                    </span>
                  </div>
                </div>
              </div>

              {/* Text Description Content */}
              <div className="p-5 space-y-3">
                <h3 className="font-black text-sm text-gray-900 dark:text-white leading-snug line-clamp-2">
                  {item.title}
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 px-5 bg-gray-50/70 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedBookForDetails(item)}
                className="text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                <span>جزئیات</span>
              </button>

              <div className="flex items-center gap-2">
                {/* 3D Flipbook viewer button if category is catalog or has catalog pages */}
                {(item.category === 'catalogs' || (item.catalogPages && item.catalogPages.length > 0)) && (
                  <button
                    onClick={() => handleOpen3DViewer(item)}
                    className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-300 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="ورق زدن سه‌بعدی کاتالوگ"
                  >
                    <Eye className="w-3.5 h-3.5 text-purple-500" />
                    <span className="hidden sm:inline">مطالعه ۳D</span>
                  </button>
                )}

                <button
                  onClick={() => handleDownload(item)}
                  disabled={downloadingId === item.id}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-indigo-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {downloadingId === item.id ? (
                    <span className="animate-pulse">در حال آماده‌سازی...</span>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود فایل</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Book Details Modal Drawer */}
      <AnimatePresence>
        {selectedBookForDetails && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full p-6 space-y-6 border border-gray-200 dark:border-gray-800 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedBookForDetails(null)}
                className="absolute left-5 top-5 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <img
                  src={selectedBookForDetails.coverImage || createSvgPlaceholder(selectedBookForDetails.title)}
                  alt={selectedBookForDetails.title}
                  className="w-full sm:w-48 h-64 object-cover rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 shrink-0"
                />

                <div className="space-y-4 flex-1">
                  <span className="inline-block text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full">
                    {selectedBookForDetails.categoryLabel}
                  </span>

                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white leading-snug">
                    {selectedBookForDetails.title}
                  </h2>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div>
                      <span className="font-bold text-gray-700 dark:text-gray-300 block">نویسنده / ناشر:</span>
                      <span>{selectedBookForDetails.author || 'اشک قلم'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700 dark:text-gray-300 block">فرمت و حجم:</span>
                      <span className="dir-ltr inline-block">{selectedBookForDetails.format} ({selectedBookForDetails.fileSize})</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700 dark:text-gray-300 block">تعداد صفحات:</span>
                      <span>{selectedBookForDetails.pagesCount || 'نامشخص'} صفحه</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700 dark:text-gray-300 block">تعداد دانلودها:</span>
                      <span>{selectedBookForDetails.downloadsCount.toLocaleString('fa-IR')} بار</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed pt-2">
                    {selectedBookForDetails.description}
                  </p>

                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={() => {
                        handleDownload(selectedBookForDetails);
                        setSelectedBookForDetails(null);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>دانلود نسخه کامل فایل</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Add/Edit Modal */}
      <AnimatePresence>
        {isAdminModalOpen && editingItem && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl max-w-xl w-full p-6 space-y-4 border border-gray-200 dark:border-gray-800 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <span>{editingItem.id ? 'ویرایش اطلاعات کتابخانه' : 'افزودن کتاب / کاتالوگ جدید'}</span>
                </h3>
                <button
                  onClick={() => setIsAdminModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">عنوان اصلی انتشار</label>
                  <input
                    type="text"
                    value={editingItem.title || ''}
                    onChange={e => setEditingItem(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="عنوان کتاب یا کاتالوگ..."
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">دسته‌بندی</label>
                    <select
                      value={editingItem.category || 'books'}
                      onChange={e => setEditingItem(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="books">کتاب‌ها و راهنماها</option>
                      <option value="catalogs">کاتالوگ‌های رسمی</option>
                      <option value="cad">قالب‌های CAD و دایلاین</option>
                      <option value="software">نرم‌افزار و پروفایل رنگ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">نویسنده / ناشر</label>
                    <input
                      type="text"
                      value={editingItem.author || ''}
                      onChange={e => setEditingItem(prev => ({ ...prev, author: e.target.value }))}
                      placeholder="مجتمع چاپ اشک قلم"
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">فرمت فایل</label>
                    <input
                      type="text"
                      value={editingItem.format || ''}
                      onChange={e => setEditingItem(prev => ({ ...prev, format: e.target.value }))}
                      placeholder="PDF / ZIP / DXF"
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">حجم فایل</label>
                    <input
                      type="text"
                      value={editingItem.fileSize || ''}
                      onChange={e => setEditingItem(prev => ({ ...prev, fileSize: e.target.value }))}
                      placeholder="12.5 MB"
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">آدرس تصویر جلد (Cover Image URL)</label>
                  <input
                    type="text"
                    value={editingItem.coverImage || ''}
                    onChange={e => setEditingItem(prev => ({ ...prev, coverImage: e.target.value }))}
                    placeholder="https://..."
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">توضیحات و خلاصه کتاب</label>
                  <textarea
                    value={editingItem.description || ''}
                    onChange={e => setEditingItem(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="خلاصه‌ای از مطالب فنی و فصل‌های شامل شده..."
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <button
                    onClick={() => setIsAdminModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleSaveBook}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md cursor-pointer"
                  >
                    ذخیره تغییرات
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
