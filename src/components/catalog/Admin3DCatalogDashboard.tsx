import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Trash2, Edit3, Eye, Download, Upload, Check, X, 
  Sparkles, Layers, Tag, Search, RefreshCw, MoveUp, MoveDown, Grid, 
  BarChart2, FileText, Image as ImageIcon, Save, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { CatalogItem, CatalogPage, CatalogHotspot, PDFProcessingProgress } from '../../types/catalog';
import { catalogService } from '../../services/catalogService';
import { processPDFFile } from '../../utils/pdfProcessor';
import { convertFileToWebP, convertBase64ToWebP } from '../../utils/webpConverter';
import { CatalogHotspotEditor } from './CatalogHotspotEditor';
import { useContent } from '../../../contexts/ContentContext';
import { MediaSelector } from '../../../components/AdminTools';

export const Admin3DCatalogDashboard: React.FC = () => {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // MediaSelector and Page Editing States
  const [mediaSelectorField, setMediaSelectorField] = useState<'cover' | 'thumbnail' | 'bulk_pages' | { pageIndex: number } | null>(null);
  const [editingPageInfo, setEditingPageInfo] = useState<{ pageIndex: number; page: CatalogPage } | null>(null);
  
  // PDF Upload & Edit Form State
  const [editingCatalog, setEditingCatalog] = useState<Partial<CatalogItem> | null>(null);
  const [processingProgress, setProcessingProgress] = useState<PDFProcessingProgress | null>(null);
  const [activeHotspotPage, setActiveHotspotPage] = useState<{ page: CatalogPage; pageIndex: number } | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Delete modal state
  const [catalogToDelete, setCatalogToDelete] = useState<CatalogItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showHostGuide, setShowHostGuide] = useState(false);

  useEffect(() => {
    loadAdminCatalogs();
  }, []);

  const loadAdminCatalogs = async () => {
    setLoading(true);
    const data = await catalogService.fetchCatalogs({ isPublishedOnly: false });
    setCatalogs(data);
    setLoading(false);
  };

  const handleSelectMultiplePages = (urls: string[]) => {
    if (!editingCatalog) return;
    const existingPages = editingCatalog.pages || [];
    const startNum = existingPages.length + 1;
    const newPages: CatalogPage[] = urls.map((url, index) => ({
      pageNumber: startNum + index,
      imageUrl: url,
      webpUrl: url,
      thumbnailUrl: url,
      extractedText: `برگه جدید ${startNum + index}`,
      hotspots: []
    }));
    setEditingCatalog({
      ...editingCatalog,
      pages: [...existingPages, ...newPages],
      pageCount: existingPages.length + newPages.length
    });
  };

  const handleStartNewUpload = () => {
    setEditingCatalog({
      id: `cat_${Date.now()}`,
      uuid: crypto.randomUUID?.() || `uuid_${Date.now()}`,
      title: '',
      category: 'جعبه هاردباکس',
      description: '',
      coverImage: '',
      thumbnailUrl: '',
      pageCount: 0,
      language: 'فارسی',
      publisher: 'مجتمع چاپ اشک قلم',
      isPublished: true,
      featured: false,
      sortOrder: catalogs.length + 1,
      views: 0,
      downloads: 0,
      paperFinish: 'glossy',
      pages: []
    });
    setProcessingProgress(null);
    setIsUploadOpen(true);
  };

  const dataURLtoBlob = (dataurl: string): Blob | null => {
    try {
      const arr = dataurl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) return null;
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.error('[Base64 to Blob Conversion] Failed:', e);
      return null;
    }
  };

  const uploadBase64IfNeeded = async (url: string, prefix: string): Promise<string> => {
    if (!url || typeof url !== 'string' || !url.startsWith('data:image/')) {
      return url;
    }

    // Convert base64 to WebP if not already webp
    let webpUrl = url;
    if (!url.startsWith('data:image/webp;')) {
      try {
        webpUrl = await convertBase64ToWebP(url, { maxWidth: 1280, quality: 0.80 });
      } catch (_) {
        webpUrl = url;
      }
    }

    // 1. Decoupled from Firebase: Directly try PHP backend save or fallback to local dataURL
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('./save_catalog.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload_image', image: webpUrl, filename: prefix }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.url) return data.url;
      }
    } catch (_) {
      // Offline / Local / Filtered network fallback instantly uses IndexedDB data URL
    }
    return webpUrl;
  };

  const handlePDFFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await processPDFFile(file, (prog) => {
        setProcessingProgress(prog);
      });

      setEditingCatalog(prev => ({
        ...prev,
        title: prev?.title || result.title || `کاتالوگ ${file.name.replace(/\.[^/.]+$/, '')}`,
        coverImage: result.coverImage,
        thumbnailUrl: result.pages[0]?.thumbnailUrl || result.coverImage,
        pageCount: result.pageCount,
        pages: result.pages
      }));

    } catch (err) {
      console.error('PDF Upload Error:', err);
      alert('خطا در پردازش فایل PDF. لطفاً فایل معتبر انتخاب کنید.');
    }
  };

  const handleImageFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    try {
      setProcessingProgress({
        status: 'rendering',
        currentPage: 0,
        totalPages: fileArray.length,
        percentage: 10,
        message: 'در حال تبدیل هوشمند تصاویر به فرمت WebP...'
      });

      const convertedPages: { imageUrl: string; thumbnailUrl: string; fileName: string }[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        // Convert to high quality WebP
        const webpUrl = await convertFileToWebP(file, { maxWidth: 1280, quality: 0.80 });
        const webpThumbUrl = await convertFileToWebP(file, { maxWidth: 300, quality: 0.65 });

        convertedPages.push({
          imageUrl: webpUrl,
          thumbnailUrl: webpThumbUrl,
          fileName: file.name
        });

        const pct = Math.round(((i + 1) / fileArray.length) * 90);
        setProcessingProgress({
          status: 'rendering',
          currentPage: i + 1,
          totalPages: fileArray.length,
          percentage: pct,
          message: `تبدیل عکس ${i + 1} از ${fileArray.length} به فرمت WebP انجام شد.`
        });
      }

      const existingPages: CatalogPage[] = [...(editingCatalog?.pages || [])];

      convertedPages.forEach((res) => {
        existingPages.push({
          pageNumber: existingPages.length + 1,
          imageUrl: res.imageUrl,
          webpUrl: res.imageUrl,
          thumbnailUrl: res.thumbnailUrl,
          extractedText: `صفحه ${existingPages.length + 1} - ${res.fileName}`,
          hotspots: []
        });
      });

      setEditingCatalog(prev => ({
        ...prev,
        coverImage: prev?.coverImage || existingPages[0]?.imageUrl,
        thumbnailUrl: prev?.thumbnailUrl || existingPages[0]?.thumbnailUrl,
        pageCount: existingPages.length,
        pages: [...existingPages]
      }));

      setProcessingProgress({
        status: 'complete',
        currentPage: fileArray.length,
        totalPages: fileArray.length,
        percentage: 100,
        message: 'تبدیل و بهینه‌سازی تصاویر به فرمت WebP با موفقیت انجام شد.'
      });

      setTimeout(() => setProcessingProgress(null), 2500);

    } catch (err) {
      console.error('Error reading/converting image files:', err);
      alert('خطا در خواندن و تبدیل فایل‌های تصویر به فرمت WebP.');
      setProcessingProgress(null);
    }
  };

  const handleAddSamplePages = () => {
    const samplePages: CatalogPage[] = [
      {
        pageNumber: 1,
        imageUrl: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
        thumbnailUrl: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
        extractedText: `صفحه ۱ - ${editingCatalog?.title || 'کاتالوگ اختصاصی'}`,
        hotspots: []
      },
      {
        pageNumber: 2,
        imageUrl: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
        thumbnailUrl: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
        extractedText: 'صفحه ۲ - مشخصات فنی و ساختار جعبه',
        hotspots: []
      },
      {
        pageNumber: 3,
        imageUrl: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
        thumbnailUrl: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
        extractedText: 'صفحه ۳ - خدمات طلاکوب و برجسته‌سازی',
        hotspots: []
      }
    ];

    setEditingCatalog(prev => ({
      ...prev,
      coverImage: prev?.coverImage || samplePages[0].imageUrl,
      thumbnailUrl: prev?.thumbnailUrl || samplePages[0].thumbnailUrl,
      pageCount: samplePages.length,
      pages: samplePages
    }));
  };

  const handleDeletePage = (pageIndex: number) => {
    if (!editingCatalog?.pages) return;
    const updatedPages = editingCatalog.pages.filter((_, idx) => idx !== pageIndex);
    const renumbered = updatedPages.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    setEditingCatalog({
      ...editingCatalog,
      pages: renumbered,
      pageCount: renumbered.length
    });
  };

  const handleSaveCatalog = async () => {
    let catalogTitle = editingCatalog?.title?.trim();
    if (!catalogTitle) {
      catalogTitle = `کاتالوگ جدید اشک قلم ${new Date().toLocaleDateString('fa-IR')}`;
    }

    let pagesToSave = [...(editingCatalog?.pages || [])];

    // If user has not provided any pages yet, generate initial sample pages so saving never fails
    if (pagesToSave.length === 0) {
      pagesToSave = [
        {
          pageNumber: 1,
          imageUrl: editingCatalog?.coverImage || "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
          thumbnailUrl: editingCatalog?.thumbnailUrl || "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
          extractedText: `صفحه ۱ - ${catalogTitle}`,
          hotspots: []
        },
        {
          pageNumber: 2,
          imageUrl: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
          thumbnailUrl: "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
          extractedText: 'صفحه ۲ - مشخصات کاتالوگ',
          hotspots: []
        }
      ];
    }

    try {
      setIsSaving(true);
      setSaveSuccess(false);

      // 1. Convert base64 images with fast non-blocking fallback
      const processedPages = await Promise.all(
        pagesToSave.map(async (page, index) => {
          const uploadedImg = await uploadBase64IfNeeded(page.imageUrl, `page_${index + 1}`);
          const uploadedThumb = await uploadBase64IfNeeded(page.thumbnailUrl || page.imageUrl, `thumb_${index + 1}`);
          return {
            ...page,
            imageUrl: uploadedImg,
            thumbnailUrl: uploadedThumb
          };
        })
      );

      const coverImg = await uploadBase64IfNeeded(
        editingCatalog?.coverImage || processedPages[0]?.imageUrl || "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
        'cover'
      );
      const thumbUrl = await uploadBase64IfNeeded(
        editingCatalog?.thumbnailUrl || processedPages[0]?.thumbnailUrl || "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"600\" viewBox=\"0 0 900 600\"><rect width=\"100%\" height=\"100%\" fill=\"%231e293b\"/><text x=\"50%\" y=\"50%\" font-family=\"sans-serif\" font-size=\"40\" fill=\"%2364748b\" text-anchor=\"middle\" dominant-baseline=\"middle\">Catalog Image</text></svg>",
        'thumbnail'
      );

      const itemToSave: CatalogItem = {
        id: editingCatalog?.id || `cat_${Date.now()}`,
        uuid: editingCatalog?.uuid || `uuid_${Date.now()}`,
        title: catalogTitle,
        slug: editingCatalog?.slug || catalogTitle.toLowerCase().replace(/\s+/g, '-'),
        description: editingCatalog?.description || 'ژورنال تخصصی بسته‌بندی و چاپ اشک قلم',
        category: editingCatalog?.category || 'جعبه هاردباکس',
        coverImage: coverImg,
        thumbnailUrl: thumbUrl,
        pageCount: processedPages.length,
        fileSize: editingCatalog?.fileSize || '12 MB',
        language: editingCatalog?.language || 'فارسی',
        publisher: editingCatalog?.publisher || 'مجتمع چاپ اشک قلم',
        createdAt: editingCatalog?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublished: editingCatalog?.isPublished ?? true,
        featured: editingCatalog?.featured ?? false,
        sortOrder: editingCatalog?.sortOrder || 1,
        views: editingCatalog?.views || 0,
        downloads: editingCatalog?.downloads || 0,
        paperFinish: editingCatalog?.paperFinish || 'glossy',
        pages: processedPages
      };

      await catalogService.saveCatalog(itemToSave);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
        setIsSaving(false);
        setIsUploadOpen(false);
        setEditingCatalog(null);
        loadAdminCatalogs();
      }, 1000);

    } catch (err: any) {
      console.error('Error saving catalog:', err);
      alert('خطا در ذخیره کاتالوگ: ' + (err?.message || 'مشکل ناخواسته در سرور یا حافظه مرجع.'));
      setIsSaving(false);
    }
  };

  const handleStartEdit = (catalog: CatalogItem) => {
    setEditingCatalog(JSON.parse(JSON.stringify(catalog)));
    setIsUploadOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!catalogToDelete) return;
    setIsDeleting(true);
    try {
      await catalogService.deleteCatalog(catalogToDelete.id);
      setCatalogToDelete(null);
      await loadAdminCatalogs();
    } catch (err: any) {
      console.error('Error deleting catalog:', err);
      alert('خطا در حذف کاتالوگ: ' + (err?.message || 'مشکل ناخواسته'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async (catalog: CatalogItem) => {
    const updated = { ...catalog, isPublished: !catalog.isPublished };
    await catalogService.saveCatalog(updated);
    loadAdminCatalogs();
  };

  const handleSaveHotspotsForPage = (pageIndex: number, hotspots: CatalogHotspot[]) => {
    if (!editingCatalog || !editingCatalog.pages) return;
    const updatedPages = [...editingCatalog.pages];
    updatedPages[pageIndex] = {
      ...updatedPages[pageIndex],
      hotspots
    };
    setEditingCatalog({
      ...editingCatalog,
      pages: updatedPages
    });
  };

  // Compute Stats
  const totalCatalogs = catalogs.length;
  const totalPagesCount = catalogs.reduce((acc, c) => acc + (c.pageCount || 0), 0);
  const totalViews = catalogs.reduce((acc, c) => acc + (c.views || 0), 0);
  const totalDownloads = catalogs.reduce((acc, c) => acc + (c.downloads || 0), 0);

  const filteredCatalogs = catalogs.filter(c =>
    c.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans text-slate-100">
      
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            مدیریت کاتالوگ‌های دیجیتال
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            سیستم هوشمند آپلود PDF، نمایش دو صفحه‌ای با کیفیت بالا و تعریف هات‌اسپات‌های تعاملی
          </p>
        </div>

        <button
          onClick={handleStartNewUpload}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-extrabold text-xs shadow-xl shadow-amber-500/20 hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          افزودن کاتالوگ سه بعدی جدید (PDF)
        </button>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs">
            <span>کل کاتالوگ‌ها</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-extrabold text-white">{totalCatalogs}</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs">
            <span>کل برگه‌های سه بعدی</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-extrabold text-white">{totalPagesCount}</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs">
            <span>بازدید کل</span>
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-extrabold text-white">{totalViews}</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs">
            <span>دانلود کل</span>
            <Download className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-extrabold text-white">{totalDownloads}</span>
        </div>
      </div>

      {/* Persian Host Persistence Status Banner */}
      <div className="mb-6 bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 text-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">سیستم ذخیره‌سازی فایل و کاتالوگ در هاست ایران (cPanel / DirectAdmin)</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">
                تصاویر و صفحات کاتالوگ به‌طور مستقیم در پوشه <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">uploads/</code> هاست ذخیره می‌شوند و روی تمامی سیستم‌ها و موبایل‌ها بدون وابستگی به اینترنت خارجی نمایش داده می‌شوند.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHostGuide(!showHostGuide)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-750 transition-all font-semibold shrink-0"
          >
            {showHostGuide ? 'بستن راهنما' : 'راهنمای هاست و فایل PHP'}
          </button>
        </div>

        {showHostGuide && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-slate-300">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <h5 className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                مراحل فعال‌سازی و اطمینان از ذخیره‌سازی در cPanel:
              </h5>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed pr-1">
                <li>
                  فایل <code className="bg-slate-900 px-1 rounded text-amber-300">save_catalog.php</code> به صورت خودکار در خروجی پروژه قرار دارد و در ریشه سایت آپلود شده است.
                </li>
                <li>
                  یک پوشه به نام <code className="bg-slate-900 px-1 rounded text-amber-300">uploads</code> در کنار فایل‌های سایت خود ایجاد کنید.
                </li>
                <li>
                  سطح دسترسی (Permissions / CHMOD) پوشه <code className="bg-slate-900 px-1 rounded text-amber-300">uploads</code> را روی <span className="text-emerald-400 font-bold">755</span> یا <span className="text-emerald-400 font-bold">777</span> قرار دهید تا سرور اجازه نوشتن فایل داشته باشد.
                </li>
                <li>
                  هنگام ثبت کاتالوگ جدید، سیستم به صورت هوشمند تصاویر PDF را استخراج، به فایل‌های کوچک JPG تبدیل و در پوشه uploads قرار می‌دهد.
                </li>
              </ol>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>مسیر اصلی پردازش: <code className="text-amber-300 font-mono">/save_catalog.php</code></span>
              <a
                href="/save_catalog.php"
                download="save_catalog.php"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-amber-400 hover:underline font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                دانلود اسکریپت save_catalog.php
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="جستجو در عنوان یا دسته‌بندی..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
          />
        </div>

        <button
          onClick={loadAdminCatalogs}
          className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80"
          title="بروزرسانی لیست"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Catalogs Admin Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold">
            <tr>
              <th className="p-4">کاور و عنوان</th>
              <th className="p-4">دسته‌بندی</th>
              <th className="p-4">تعداد برگه</th>
              <th className="p-4">جنس کاغذ</th>
              <th className="p-4">آمار بازدید/دانلود</th>
              <th className="p-4">وضعیت انتشار</th>
              <th className="p-4 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredCatalogs.map(catalog => (
              <tr key={catalog.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <img
                    src={catalog.coverImage}
                    alt={catalog.title}
                    className="w-12 h-16 object-contain bg-slate-950 p-0.5 rounded-lg border border-slate-700"
                  />
                  <div>
                    <h3 className="font-extrabold text-white text-sm">{catalog.title}</h3>
                    <span className="text-[10px] text-slate-400">{catalog.publisher}</span>
                  </div>
                </td>
                <td className="p-4 font-bold text-amber-400">{catalog.category}</td>
                <td className="p-4 font-bold">{catalog.pageCount} صفحه</td>
                <td className="p-4 text-slate-300 capitalize">{catalog.paperFinish || 'گلاسه'}</td>
                <td className="p-4 text-slate-400">
                  {catalog.views} بازدید • {catalog.downloads} دانلود
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleTogglePublish(catalog)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                      catalog.isPublished
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {catalog.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                  </button>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleStartEdit(catalog)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition-colors"
                      title="ویرایش کاتالوگ"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCatalogToDelete(catalog)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="حذف کاتالوگ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* UPLOAD & EDIT MODAL STUDIO */}
      {isUploadOpen && editingCatalog && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <h2 className="font-extrabold text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                استودیو آپلود و ساخت کاتالوگ سه بعدی
              </h2>
              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setEditingCatalog(null);
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-6">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">عنوان کاتالوگ</label>
                <input
                  type="text"
                  value={editingCatalog.title || ''}
                  onChange={e => setEditingCatalog({ ...editingCatalog, title: e.target.value })}
                  placeholder="مثلاً: کاتالوگ نفیس هاردباکس ۲۰۲۶"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">دسته‌بندی</label>
                <select
                  value={editingCatalog.category || 'جعبه هاردباکس'}
                  onChange={e => setEditingCatalog({ ...editingCatalog, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                >
                  <option value="جعبه هاردباکس">جعبه هاردباکس</option>
                  <option value="کارتن‌سازی و لمینت">کارتن‌سازی و لمینت</option>
                  <option value="چاپ افست و خدمات تکمیلی">چاپ افست و خدمات تکمیلی</option>
                  <option value="بسته‌بندی دارویی و بهداشتی">بسته‌بندی دارویی و بهداشتی</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">جنس و پوشش کاغذ سه بعدی</label>
                <select
                  value={editingCatalog.paperFinish || 'glossy'}
                  onChange={e => setEditingCatalog({ ...editingCatalog, paperFinish: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                >
                  <option value="glossy">گلاسه ۲۵۰ گرم (Glossy)</option>
                  <option value="matte">مات لوکس (Matte)</option>
                  <option value="gold_foil">طلاکوب و برجسته (Gold Foil)</option>
                  <option value="embossed">با بافت اختصاصی (Embossed)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">ناشر / مجتمع چاپ</label>
                <input
                  type="text"
                  value={editingCatalog.publisher || 'مجتمع چاپ اشک قلم'}
                  onChange={e => setEditingCatalog({ ...editingCatalog, publisher: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Extra editable metadata fields requested by user */}
              <div>
                <label className="block text-slate-400 mb-1 font-bold">حجم فایل کاتالوگ (جهت دانلود)</label>
                <input
                  type="text"
                  value={editingCatalog.fileSize || '12 MB'}
                  onChange={e => setEditingCatalog({ ...editingCatalog, fileSize: e.target.value })}
                  placeholder="مثال: 12 MB یا 8.5 MB"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">زبان کاتالوگ</label>
                <input
                  type="text"
                  value={editingCatalog.language || 'فارسی'}
                  onChange={e => setEditingCatalog({ ...editingCatalog, language: e.target.value })}
                  placeholder="مثال: فارسی، انگلیسی، دو زبانه"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">ترتیب نمایش کاتالوگ</label>
                <input
                  type="number"
                  value={editingCatalog.sortOrder || 1}
                  onChange={e => setEditingCatalog({ ...editingCatalog, sortOrder: parseInt(e.target.value) || 1 })}
                  placeholder="مثال: 1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-1">
                {/* Empty spacer or placeholder if needed */}
              </div>

              {/* Interactive Cover & Thumbnail with Media Selector option */}
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-3">
                <label className="block text-slate-300 font-bold mb-1">تصویر کاور اصلی کاتالوگ</label>
                {editingCatalog.coverImage && (
                  <div className="w-20 h-28 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden mb-2">
                    <img src={editingCatalog.coverImage} className="w-full h-full object-cover" alt="Cover" />
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingCatalog.coverImage || ''}
                    onChange={e => setEditingCatalog({ ...editingCatalog, coverImage: e.target.value })}
                    placeholder="آدرس تصویر کاور..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaSelectorField('cover')}
                    className="px-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs transition-colors shrink-0"
                  >
                    گالری
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-3">
                <label className="block text-slate-300 font-bold mb-1">تصویر بندانگشتی پیش‌نمایش</label>
                {editingCatalog.thumbnailUrl && (
                  <div className="w-20 h-28 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden mb-2">
                    <img src={editingCatalog.thumbnailUrl} className="w-full h-full object-cover" alt="Thumbnail" />
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingCatalog.thumbnailUrl || ''}
                    onChange={e => setEditingCatalog({ ...editingCatalog, thumbnailUrl: e.target.value })}
                    placeholder="آدرس تصویر بندانگشتی..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaSelectorField('thumbnail')}
                    className="px-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs transition-colors shrink-0"
                  >
                    گالری
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-400 mb-1 font-bold">توضیحات جذاب ژورنال</label>
                <textarea
                  rows={2}
                  value={editingCatalog.description || ''}
                  onChange={e => setEditingCatalog({ ...editingCatalog, description: e.target.value })}
                  placeholder="توضیحات کوتاه جهت نمایش در سایت..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingCatalog.isPublished ?? true}
                    onChange={e => setEditingCatalog({ ...editingCatalog, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                  />
                  <span>انتشار در سایت عمومی</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingCatalog.featured ?? false}
                    onChange={e => setEditingCatalog({ ...editingCatalog, featured: e.target.checked })}
                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                  />
                  <span>نمایش ویژه در صفحه اول (Featured)</span>
                </label>
              </div>
            </div>

            {/* Upload Options Zone */}
            <div className="mb-6 p-6 bg-slate-950 border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-3xl text-center transition-colors">
              <Upload className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h3 className="font-bold text-xs mb-1">افزودن برگه‌ها با فایل PDF یا تصاویر JPG/PNG</h3>
              <p className="text-[11px] text-slate-400 mb-4">فایل PDF یا عکس‌های کاتالوگ خود را انتخاب کنید تا به ژورنال سه بعدی تبدیل شوند</p>
              
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg transition-all">
                  <FileText className="w-4 h-4" />
                  انتخاب فایل PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePDFFileSelected}
                    className="hidden"
                  />
                </label>

                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer border border-slate-700 transition-all">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  افزودن عکس برگه (JPG / PNG)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFilesSelected}
                    className="hidden"
                  />
                </label>

                {/* Bulk library integration */}
                <button
                  type="button"
                  onClick={() => setMediaSelectorField('bulk_pages')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs shadow-lg border border-indigo-500/30 transition-all"
                >
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  درج برگه‌ها از گالری رسانه
                </button>

                <button
                  type="button"
                  onClick={handleAddSamplePages}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/60 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  ایجاد برگه‌های نمونه
                </button>
              </div>

              {/* Progress Indicator */}
              {processingProgress && (
                <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-amber-500/30 text-xs text-right">
                  <div className="flex items-center justify-between mb-2 font-bold">
                    <span className="text-amber-400">{processingProgress.message}</span>
                    <span>{processingProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${processingProgress.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Rendered Pages Grid with Hotspot Buttons & Delete Page */}
            {editingCatalog.pages && editingCatalog.pages.length > 0 ? (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    برگه‌های کاتالوگ ({editingCatalog.pages.length} صفحه آماده انتشار)
                  </h3>
                  <span className="text-[10px] text-slate-400">می‌توانید برای هر صفحه محصول و هات‌اسپات تعریف کنید</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {editingCatalog.pages.map((p, idx) => (
                    <div key={idx} className="relative group bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-1.5 transition-all hover:border-amber-500/40">
                      <img src={p.thumbnailUrl || p.imageUrl} alt={`P ${idx + 1}`} className="w-full h-28 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => handleDeletePage(idx)}
                        className="absolute top-2 left-2 p-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="حذف این برگه"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      
                      <div className="mt-2 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-450">
                          <span className="font-bold text-slate-300">صفحه {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => setEditingPageInfo({ pageIndex: idx, page: p })}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-bold transition-colors flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>ویرایش</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveHotspotPage({ page: p, pageIndex: idx })}
                          className="w-full text-center py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-450 rounded-md text-[10px] font-bold transition-colors"
                        >
                          هات‌اسپات ({p.hotspots?.length || 0})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>هنوز برگه ای اضافه نشده است. با کلیک روی «ذخیره و انتشار»، کاتالوگ همراه با برگه‌های پیش‌فرض منتشر می‌شود.</span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setIsUploadOpen(false);
                  setEditingCatalog(null);
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveCatalog}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ذخیره و انتشار...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                    <span>منتشر شد!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>ذخیره و انتشار کاتالوگ</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* HOTSPOT PAGE EDITOR OVERLAY */}
      {activeHotspotPage && (
        <CatalogHotspotEditor
          page={activeHotspotPage.page}
          pageIndex={activeHotspotPage.pageIndex}
          onSaveHotspots={handleSaveHotspotsForPage}
          onClose={() => setActiveHotspotPage(null)}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {catalogToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl font-sans text-right">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-center mb-2 text-white">
              حذف کاتالوگ سه بعدی
            </h3>
            <p className="text-xs text-slate-300 text-center mb-6 leading-relaxed">
              آیا از حذف کامل کاتالوگ <strong className="text-amber-400">«{catalogToDelete.title}»</strong> اطمینان دارید؟ تمامی برگه‌ها و تنظیمات مرتبط پاک خواهند شد.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCatalogToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال حذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>حذف نهایی</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL PAGE DETAIL EDITOR */}
      {editingPageInfo && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[70] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white w-full max-w-md shadow-2xl font-sans">
            <h3 className="font-extrabold text-sm mb-4 border-b border-slate-800 pb-3 flex items-center gap-2 text-amber-450">
              <Edit3 className="w-5 h-5" />
              <span>ویرایش جزئیات برگه {editingPageInfo.pageIndex + 1}</span>
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img src={editingPageInfo.page.imageUrl} className="w-16 h-20 object-cover rounded-lg border border-slate-800" alt="" />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaSelectorField({ pageIndex: editingPageInfo.pageIndex })}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>تغییر تصویر از گالری</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">آدرس مستقیم تصویر (یا Base64)</label>
                <input
                  type="text"
                  value={editingPageInfo.page.imageUrl}
                  onChange={(e) => {
                    const updated = { ...editingPageInfo.page, imageUrl: e.target.value, thumbnailUrl: e.target.value };
                    setEditingPageInfo({ ...editingPageInfo, page: updated });
                  }}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">متن استخراج‌شده یا توضیحات برگه</label>
                <textarea
                  rows={3}
                  value={editingPageInfo.page.extractedText || ''}
                  onChange={(e) => {
                    const updated = { ...editingPageInfo.page, extractedText: e.target.value };
                    setEditingPageInfo({ ...editingPageInfo, page: updated });
                  }}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setEditingPageInfo(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingCatalog || !editingCatalog.pages) return;
                  const updatedPages = [...editingCatalog.pages];
                  updatedPages[editingPageInfo.pageIndex] = editingPageInfo.page;
                  setEditingCatalog({
                    ...editingCatalog,
                    pages: updatedPages
                  });
                  setEditingPageInfo(null);
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold"
              >
                بروزرسانی برگه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEDIA SELECTOR OVERLAY INTEGRATION */}
      {mediaSelectorField !== null && (
        <MediaSelector
          multiple={mediaSelectorField === 'bulk_pages'}
          onSelect={(url) => {
            if (!editingCatalog) return;
            if (mediaSelectorField === 'cover') {
              setEditingCatalog({ ...editingCatalog, coverImage: url });
            } else if (mediaSelectorField === 'thumbnail') {
              setEditingCatalog({ ...editingCatalog, thumbnailUrl: url });
            } else if (typeof mediaSelectorField === 'object' && 'pageIndex' in mediaSelectorField) {
              const idx = (mediaSelectorField as { pageIndex: number }).pageIndex;
              const updatedPages = [...(editingCatalog.pages || [])];
              if (updatedPages[idx]) {
                updatedPages[idx] = { ...updatedPages[idx], imageUrl: url, thumbnailUrl: url };
                setEditingCatalog({ ...editingCatalog, pages: updatedPages });
              }
              if (editingPageInfo && editingPageInfo.pageIndex === idx) {
                setEditingPageInfo({
                  ...editingPageInfo,
                  page: { ...editingPageInfo.page, imageUrl: url, thumbnailUrl: url }
                });
              }
            }
            setMediaSelectorField(null);
          }}
          onSelectMultiple={(urls) => {
            if (mediaSelectorField === 'bulk_pages') {
              handleSelectMultiplePages(urls);
            }
            setMediaSelectorField(null);
          }}
          onClose={() => setMediaSelectorField(null)}
        />
      )}

    </div>
  );
};
