import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  AlertCircle,
  Loader2,
  Plus,
  X,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RectangleHorizontal,
  RectangleVertical,
  Image as ImageIcon,
} from 'lucide-react';
import { CatalogPage, OptimizationSettings } from '../../types/flipbook';
import { UploadedAsset } from '../../types';
import {
  optimizeFileToWebP,
  formatBytesFa,
  calculateSavingsPercent,
} from '../../utils/imageOptimizer';
import { uploadImageAssetToServer } from '../../services/projectStorageService';
import { MediaSelector } from '../AdminTools';

interface ImageUploaderPanelProps {
  pages: CatalogPage[];
  optimization: OptimizationSettings;
  onAddPages: (newPages: CatalogPage[]) => void;
  onUpdatePage: (id: string, patch: Partial<CatalogPage>) => void;
  onRemovePage: (id: string) => void;
  onReorderPages: (fromIdx: number, toIdx: number) => void;
}

function buildMetadataFromFileName(fileName: string): {
  title: string;
  description: string;
  category: string;
  tags: string[];
} {
  const cleanTitle = (fileName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  const lower = cleanTitle.toLowerCase();

  let category = 'کارتن‌های صنعتی و صادراتی';
  if (lower.includes('hardbox') || lower.includes('هاردباکس') || lower.includes('لوکس')) {
    category = 'هاردباکس و لوکس';
  } else if (lower.includes('pharma') || lower.includes('دارو') || lower.includes('بهداشتی')) {
    category = 'دارویی و بهداشتی';
  } else if (lower.includes('mailer') || lower.includes('کیبوردی') || lower.includes('پستی')) {
    category = 'ای‌کامرس و پستی';
  }

  return {
    title: cleanTitle || 'محصول جدید کاتالوگ',
    description: cleanTitle
      ? `${cleanTitle} — طراحی و تولید اختصاصی با استاندارد چاپ و برش اشک قلم.`
      : 'طراحی و تولید اختصاصی با بالاترین کیفیت چاپ و بسته‌بندی.',
    category,
    tags: ['کاتالوگ', category, cleanTitle].filter(Boolean).slice(0, 4),
  };
}

export const ImageUploaderPanel: React.FC<ImageUploaderPanelProps> = ({
  pages,
  optimization,
  onAddPages,
  onUpdatePage,
  onRemovePage,
  onReorderPages,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedPageId, setExpandedPageId] = useState<string | null>(pages[0]?.id || null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [newTagByPage, setNewTagByPage] = useState<Record<string, string>>({});
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [replacingPageId, setReplacingPageId] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      setUploadError('لطفاً فقط فایل‌های تصویری معتبر (JPG، PNG، WebP) انتخاب کنید.');
      return;
    }

    setUploadBusy(true);
    setUploadError(null);

    const created: CatalogPage[] = [];
    const failedNames: string[] = [];

    try {
      for (const file of files) {
        if (!mountedRef.current) break;
        try {
          const result = await optimizeFileToWebP(file, optimization);
          const meta = buildMetadataFromFileName(file.name);
          const storedUrl = await uploadImageAssetToServer(result.optimizedDataUrl);
          if (typeof window !== 'undefined' && !storedUrl.startsWith('data:')) {
            window.dispatchEvent(new Event('ashk-media-synced'));
          }
          created.push({
            id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            fileName: file.name,
            title: meta.title,
            description: meta.description,
            category: meta.category,
            tags: meta.tags,
            originalDataUrl: storedUrl,
            optimizedDataUrl: storedUrl,
            originalSizeBytes: result.originalSizeBytes,
            optimizedSizeBytes: result.optimizedSizeBytes,
            originalWidth: result.originalWidth,
            originalHeight: result.originalHeight,
            width: result.width,
            height: result.height,
            aiStatus: 'done',
          });
        } catch {
          failedNames.push(file.name);
        }
      }

      if (!mountedRef.current) return;

      if (created.length > 0) {
        onAddPages(created);
        setExpandedPageId(created[0].id);
      }
      if (failedNames.length > 0) {
        setUploadError(`پردازش این فایل‌ها با خطا مواجه شد: ${failedNames.join('، ')}`);
      }
    } finally {
      if (mountedRef.current) {
        setUploadBusy(false);
      }
    }
  };

  const handleSelectAssetsFromMedia = (selectedAssets: UploadedAsset[]) => {
    if (!selectedAssets.length) return;
    const created: CatalogPage[] = selectedAssets.map((asset) => {
      const meta = buildMetadataFromFileName(asset.title || asset.name || 'محصول کاتالوگ');
      const url = asset.url || asset.data;
      return {
        id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fileName: asset.name || 'media-image.webp',
        title: asset.title || meta.title,
        description: asset.description || meta.description,
        category: asset.category || meta.category,
        tags: meta.tags,
        originalDataUrl: url,
        optimizedDataUrl: url,
        originalSizeBytes: asset.size || 120000,
        optimizedSizeBytes: asset.size || 120000,
        originalWidth: asset.width || 900,
        originalHeight: asset.height || 1200,
        width: asset.width || 900,
        height: asset.height || 1200,
        aiStatus: 'done',
      };
    });
    onAddPages(created);
    if (created[0]) setExpandedPageId(created[0].id);
    setShowMediaPicker(false);
  };

  const handleAddTag = (page: CatalogPage) => {
    const raw = (newTagByPage[page.id] || '').trim().replace(/^#+/, '');
    if (!raw) return;
    if (!page.tags.includes(raw)) {
      onUpdatePage(page.id, { tags: [...page.tags, raw] });
    }
    setNewTagByPage((prev) => ({ ...prev, [page.id]: '' }));
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFiles(true);
        }}
        onDragLeave={() => setIsDraggingFiles(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFiles(false);
          if (e.dataTransfer.files?.length) {
            void processFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => !uploadBusy && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !uploadBusy) fileInputRef.current?.click();
        }}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors cursor-pointer ${
          isDraggingFiles
            ? 'border-amber-600 bg-amber-50/70'
            : 'border-stone-300 bg-stone-50/70 hover:border-amber-500 hover:bg-stone-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void processFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />

        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2.5">
          {uploadBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
        </div>

        <h3 className="text-sm font-extrabold text-stone-900">
          {uploadBusy ? 'در حال فشرده‌سازی WebP و افزودن صفحات...' : 'تصاویر محصولات را بکشید و اینجا رها کنید'}
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          تبدیل آنی به WebP با تشخیص خودکار جهت افقی/عمودی و امکان درج عنوان و توضیحات زیر هر عکس
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={uploadBusy}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>آپلود از سیستم</span>
          </button>
          <button
            type="button"
            disabled={uploadBusy}
            onClick={(e) => {
              e.stopPropagation();
              setShowMediaPicker(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>انتخاب از رسانه سایت</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Batch Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-stone-200 pb-3">
        <div className="text-xs text-stone-600 tabular-nums">
          تعداد صفحات:{' '}
          <span className="font-extrabold text-stone-900">{pages.length.toLocaleString('fa-IR')} صفحه</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>آماده برای ثبت و انتشار</span>
        </span>
      </div>

      {/* Empty State */}
      {pages.length === 0 ? (
        <div className="py-12 px-4 text-center border border-stone-200 rounded-xl bg-white">
          <p className="text-sm font-bold text-stone-700">هنوز صفحه‌ای به کاتالوگ اضافه نشده است</p>
          <p className="text-xs text-stone-500 mt-1">
            تصاویر محصولات خود را از کادر بالا آپلود کنید تا کاتالوگ سه‌بعدی ساخته شود.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((page, idx) => {
            const isExpanded = expandedPageId === page.id;
            const savings = calculateSavingsPercent(page.originalSizeBytes, page.optimizedSizeBytes);
            const isLandscape = (page.width || page.originalWidth) > (page.height || page.originalHeight) * 1.05;

            return (
              <div
                key={page.id}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== idx) {
                    onReorderPages(dragIndex, idx);
                  }
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`rounded-xl border bg-white transition-colors ${
                  dragIndex === idx ? 'border-amber-500 opacity-60' : 'border-stone-200'
                }`}
              >
                {/* Compact Row Header */}
                <div className="p-3 flex items-center gap-3">
                  <div
                    className="text-stone-400 hover:text-stone-600 cursor-grab shrink-0"
                    title="برای تغییر ترتیب بکشید"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <img
                    src={page.optimizedDataUrl || page.originalDataUrl}
                    alt={page.title}
                    className={`${
                      isLandscape ? 'w-14 h-11' : 'w-11 h-14'
                    } rounded-lg object-cover bg-stone-100 border border-stone-200 shrink-0`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500 tabular-nums">
                      <span className="font-bold text-amber-700">صفحه {(idx + 1).toLocaleString('fa-IR')}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-0.5 text-sky-700 font-semibold">
                        {isLandscape ? (
                          <RectangleHorizontal className="w-3 h-3" />
                        ) : (
                          <RectangleVertical className="w-3 h-3" />
                        )}
                        {isLandscape ? 'افقی' : 'عمودی'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">
                        {formatBytesFa(page.optimizedSizeBytes)}
                        {savings > 0 ? ` (${savings.toLocaleString('fa-IR')}٪↓)` : ''}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate mt-0.5">
                      {page.title || page.fileName}
                    </h4>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onReorderPages(idx, idx - 1)}
                      disabled={idx === 0}
                      title="انتقال به بالا"
                      aria-label="انتقال صفحه به بالا"
                      className="h-8 w-7 rounded-lg hover:bg-stone-100 text-stone-500 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onReorderPages(idx, idx + 1)}
                      disabled={idx === pages.length - 1}
                      title="انتقال به پایین"
                      aria-label="انتقال صفحه به پایین"
                      className="h-8 w-7 rounded-lg hover:bg-stone-100 text-stone-500 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemovePage(page.id)}
                      title="حذف صفحه"
                      aria-label="حذف صفحه"
                      className="h-8 w-7 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedPageId(isExpanded ? null : page.id)}
                      aria-label={isExpanded ? 'بستن ویرایشگر صفحه' : 'باز کردن ویرایشگر صفحه'}
                      className="h-8 w-7 rounded-lg hover:bg-stone-100 text-stone-600 flex items-center justify-center cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Inline Metadata Editor */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-stone-100 space-y-3 bg-stone-50/50 rounded-b-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">
                          عنوان محصول (نمایش زیر عکس)
                        </label>
                        <input
                          type="text"
                          value={page.title}
                          onChange={(e) => onUpdatePage(page.id, { title: e.target.value })}
                          placeholder="عنوان محصول..."
                          className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">
                          دسته‌بندی محصول
                        </label>
                        <input
                          type="text"
                          value={page.category}
                          onChange={(e) => onUpdatePage(page.id, { category: e.target.value })}
                          placeholder="مثلاً: کارتن‌های صنعتی"
                          className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">
                        توضیح کوتاه محصول (قابل ویرایش)
                      </label>
                      <textarea
                        rows={2}
                        value={page.description}
                        onChange={(e) => onUpdatePage(page.id, { description: e.target.value })}
                        placeholder="توضیحات معرفی محصول در زیر تصویر کاتالوگ..."
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 leading-relaxed focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">
                          کد محصول / SKU (اختیاری)
                        </label>
                        <input
                          type="text"
                          value={page.sku || ''}
                          onChange={(e) => onUpdatePage(page.id, { sku: e.target.value })}
                          placeholder="مثلاً: PRD-102"
                          className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">
                          برچسب قیمت (اختیاری)
                        </label>
                        <input
                          type="text"
                          value={page.priceLabel || ''}
                          onChange={(e) => onUpdatePage(page.id, { priceLabel: e.target.value })}
                          placeholder="مثلاً: تماس بگیرید"
                          className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Editable Tags */}
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1.5">
                        برچسب‌ها
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {page.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-stone-200 text-[11px] text-stone-700"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdatePage(page.id, {
                                  tags: page.tags.filter((t) => t !== tag),
                                })
                              }
                              aria-label={`حذف برچسب ${tag}`}
                              className="text-stone-400 hover:text-red-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newTagByPage[page.id] || ''}
                          onChange={(e) =>
                            setNewTagByPage((prev) => ({ ...prev, [page.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag(page);
                            }
                          }}
                          placeholder="افزودن برچسب جدید..."
                          className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTag(page)}
                          className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>افزودن</span>
                        </button>
                      </div>
                    </div>

                    {/* Technical Compression Telemetry Row */}
                    <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 tabular-nums">
                      <span>
                        حجم اصلی: {formatBytesFa(page.originalSizeBytes)} → خروجی WebP:{' '}
                        <strong className="text-emerald-700">{formatBytesFa(page.optimizedSizeBytes)}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReplacingPageId(page.id)}
                          className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>تغییر / انتخاب از رسانه</span>
                        </button>
                        <span>
                          ابعاد: {page.width} × {page.height} پیکسل ({isLandscape ? 'افقی' : 'عمودی'})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showMediaPicker && (
        <MediaSelector
          multiple
          onSelect={() => {}}
          onSelectMultipleAssets={handleSelectAssetsFromMedia}
          onClose={() => setShowMediaPicker(false)}
        />
      )}

      {replacingPageId && (
        <MediaSelector
          multiple={false}
          onSelect={(url) => {
            onUpdatePage(replacingPageId, {
              originalDataUrl: url,
              optimizedDataUrl: url,
            });
            setReplacingPageId(null);
          }}
          onSelectAsset={(asset) => {
            const url = asset.url || asset.data;
            onUpdatePage(replacingPageId, {
              originalDataUrl: url,
              optimizedDataUrl: url,
              fileName: asset.name || undefined,
              optimizedSizeBytes: asset.size || undefined,
              width: asset.width || undefined,
              height: asset.height || undefined,
            });
            setReplacingPageId(null);
          }}
          onClose={() => setReplacingPageId(null)}
        />
      )}
    </div>
  );
};
