import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2, Palette, BookMarked, RectangleHorizontal, RectangleVertical, Sparkles, Image as ImageIcon } from 'lucide-react';
import { CoverDesignConfig, FlipDirection, OptimizationSettings, PageOrientationMode } from '../../types/flipbook';
import { COVER_TEMPLATES } from '../../data/demoCatalog';
import { optimizeFileToWebP } from '../../utils/imageOptimizer';
import { MediaSelector } from '../AdminTools';

interface CoverDesignerPanelProps {
  cover: CoverDesignConfig;
  optimization: OptimizationSettings;
  pageOrientation?: PageOrientationMode;
  flipDirection?: FlipDirection;
  onChangeCover: (patch: Partial<CoverDesignConfig>) => void;
  onChangeOrientation?: (mode: PageOrientationMode) => void;
  onChangeFlipDirection?: (dir: FlipDirection) => void;
}

const COLOR_PRESETS = [
  { label: 'سرمه‌ای و طلایی', primary: '#111827', accent: '#d4af37', text: '#f9fafb' },
  { label: 'کاغذی مینیمال', primary: '#fafaf9', accent: '#b45309', text: '#1c1917' },
  { label: 'سبز یشمی', primary: '#064e3b', accent: '#fbbf24', text: '#ecfdf5' },
  { label: 'آبی مهندسی', primary: '#0f172a', accent: '#38bdf8', text: '#f8fafc' },
  { label: 'قهوه‌ای بوتیک', primary: '#292524', accent: '#e07a5f', text: '#f5f5f4' },
];

export const CoverDesignerPanel: React.FC<CoverDesignerPanelProps> = ({
  cover,
  optimization,
  pageOrientation = 'auto',
  flipDirection = 'rtl',
  onChangeCover,
  onChangeOrientation,
  onChangeFlipDirection,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const frontImgInputRef = useRef<HTMLInputElement>(null);
  const backImgInputRef = useRef<HTMLInputElement>(null);
  const [mediaTargetField, setMediaTargetField] = useState<
    'logoDataUrl' | 'frontCustomImageUrl' | 'backCustomImageUrl' | null
  >(null);

  const handleImageUpload = async (
    file: File,
    field: 'logoDataUrl' | 'frontCustomImageUrl' | 'backCustomImageUrl'
  ) => {
    try {
      const res = await optimizeFileToWebP(file, {
        quality: Math.max(0.8, optimization.quality),
        maxDimension: field === 'logoDataUrl' ? 500 : optimization.maxDimension,
      });
      onChangeCover({ [field]: res.optimizedDataUrl });
    } catch {
      // ignore invalid file
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Orientation & Flip Direction */}
      {(onChangeOrientation || onChangeFlipDirection) && (
        <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-extrabold text-stone-900">ابعاد صفحات و جهت ورق‌زدن</h3>
          </div>

          {onChangeOrientation && (
            <div className="space-y-2">
              <span className="block text-[11px] font-bold text-stone-600">
                تناسب جهت صفحات کاتالوگ با تصاویر
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'auto' as const,
                    label: 'خودکار (بر اساس عکس)',
                    icon: <Sparkles className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'landscape' as const,
                    label: 'افقی (Landscape)',
                    icon: <RectangleHorizontal className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'portrait' as const,
                    label: 'عمودی (Portrait)',
                    icon: <RectangleVertical className="w-3.5 h-3.5" />,
                  },
                ].map((opt) => {
                  const active = pageOrientation === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeOrientation(opt.id)}
                      className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer ${
                        active
                          ? 'border-amber-600 bg-amber-50 text-amber-900'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span className={active ? 'text-amber-600' : 'text-stone-500'}>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {onChangeFlipDirection && (
            <div className="space-y-2 pt-1">
              <span className="block text-[11px] font-bold text-stone-600">جهت ورق‌زدن کتاب</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeFlipDirection('rtl')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                    flipDirection === 'rtl'
                      ? 'border-amber-600 bg-amber-50 text-amber-900'
                      : 'border-stone-200 bg-stone-50 text-stone-700'
                  }`}
                >
                  راست‌به‌چپ فارسی (RTL)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFlipDirection('ltr')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                    flipDirection === 'ltr'
                      ? 'border-amber-600 bg-amber-50 text-amber-900'
                      : 'border-stone-200 bg-stone-50 text-stone-700'
                  }`}
                >
                  چپ‌به‌راست لاتین (LTR)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cover Template Selection */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <BookMarked className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-extrabold text-stone-900">انتخاب قالب جلد جلو و پشت</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {COVER_TEMPLATES.map((tpl) => {
            const active = cover.templateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() =>
                  onChangeCover({
                    templateId: tpl.id,
                    primaryColor: tpl.primaryColor,
                    accentColor: tpl.accentColor,
                    textColor: tpl.textColor,
                  })
                }
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                  active
                    ? 'border-amber-600 bg-amber-50/60'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <span
                  className="w-8 h-10 rounded-md border border-black/10 shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: tpl.primaryColor }}
                >
                  <span className="w-3 h-0.5 block" style={{ backgroundColor: tpl.accentColor }} />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-stone-900">{tpl.name}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                    {tpl.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Palette */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <Palette className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-extrabold text-stone-900">پالت رنگ و هویت بصری</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() =>
                onChangeCover({
                  primaryColor: preset.primary,
                  accentColor: preset.accent,
                  textColor: preset.text,
                })
              }
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:border-amber-500 text-[11px] font-semibold text-stone-700 flex items-center gap-1.5 cursor-pointer bg-stone-50"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/15"
                style={{ backgroundColor: preset.primary }}
              />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-[11px] font-bold text-stone-600 mb-1">رنگ زمینه</span>
            <input
              type="color"
              value={cover.primaryColor}
              onChange={(e) => onChangeCover({ primaryColor: e.target.value })}
              className="w-full h-9 rounded-lg border border-stone-200 cursor-pointer bg-white p-0.5"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold text-stone-600 mb-1">رنگ تاکیدی</span>
            <input
              type="color"
              value={cover.accentColor}
              onChange={(e) => onChangeCover({ accentColor: e.target.value })}
              className="w-full h-9 rounded-lg border border-stone-200 cursor-pointer bg-white p-0.5"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold text-stone-600 mb-1">رنگ متن</span>
            <input
              type="color"
              value={cover.textColor}
              onChange={(e) => onChangeCover({ textColor: e.target.value })}
              className="w-full h-9 rounded-lg border border-stone-200 cursor-pointer bg-white p-0.5"
            />
          </label>
        </div>
      </div>

      {/* Front Cover Texts & Brand Logo */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-3">
          متن جلد جلو و لوگوی برند
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">عنوان اصلی کاتالوگ</label>
            <input
              type="text"
              value={cover.title}
              onChange={(e) => onChangeCover({ title: e.target.value })}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">نام برند / شرکت</label>
            <input
              type="text"
              value={cover.brandName}
              onChange={(e) => onChangeCover({ brandName: e.target.value })}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-600 mb-1">زیرعنوان توصیفی</label>
          <input
            type="text"
            value={cover.subtitle}
            onChange={(e) => onChangeCover({ subtitle: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">نسخه / فصل</label>
            <input
              type="text"
              value={cover.editionLabel}
              onChange={(e) => onChangeCover({ editionLabel: e.target.value })}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">سال انتشار</label>
            <input
              type="text"
              value={cover.yearLabel}
              onChange={(e) => onChangeCover({ yearLabel: e.target.value })}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Logo & Custom Cover Image Uploads */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Logo */}
          <div className="p-3 rounded-lg border border-stone-200 bg-stone-50 space-y-2">
            <span className="block text-[11px] font-bold text-stone-700">لوگوی برند</span>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'logoDataUrl');
                e.target.value = '';
              }}
            />
            {cover.logoDataUrl ? (
              <div className="flex items-center justify-between gap-2">
                <img src={cover.logoDataUrl} alt="لوگو" className="h-8 max-w-[80px] object-contain" />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMediaTargetField('logoDataUrl')}
                    className="text-amber-700 hover:bg-amber-50 p-1 rounded cursor-pointer"
                    title="انتخاب از رسانه سایت"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeCover({ logoDataUrl: undefined })}
                    className="text-red-600 hover:bg-red-50 p-1 rounded cursor-pointer"
                    title="حذف لوگو"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-1.5 px-2 rounded-lg border border-dashed border-stone-300 hover:border-amber-500 text-[11px] font-semibold text-stone-600 flex items-center justify-center gap-1 cursor-pointer bg-white"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>آپلود لوگو</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTargetField('logoDataUrl')}
                  className="w-full py-1 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>انتخاب از رسانه</span>
                </button>
              </div>
            )}
          </div>

          {/* Front Cover Custom Image */}
          <div className="p-3 rounded-lg border border-stone-200 bg-stone-50 space-y-2">
            <span className="block text-[11px] font-bold text-stone-700">تصویر جلد جلو</span>
            <input
              ref={frontImgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'frontCustomImageUrl');
                e.target.value = '';
              }}
            />
            {cover.frontCustomImageUrl ? (
              <div className="flex items-center justify-between gap-2">
                <img
                  src={cover.frontCustomImageUrl}
                  alt="جلد جلو"
                  className="h-8 w-12 rounded object-cover"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMediaTargetField('frontCustomImageUrl')}
                    className="text-amber-700 hover:bg-amber-50 p-1 rounded cursor-pointer"
                    title="انتخاب از رسانه سایت"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeCover({ frontCustomImageUrl: undefined })}
                    className="text-red-600 hover:bg-red-50 p-1 rounded cursor-pointer"
                    title="حذف تصویر جلد جلو"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => frontImgInputRef.current?.click()}
                  className="w-full py-1.5 px-2 rounded-lg border border-dashed border-stone-300 hover:border-amber-500 text-[11px] font-semibold text-stone-600 flex items-center justify-center gap-1 cursor-pointer bg-white"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>تصویر اختصاصی</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTargetField('frontCustomImageUrl')}
                  className="w-full py-1 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>انتخاب از رسانه</span>
                </button>
              </div>
            )}
          </div>

          {/* Back Cover Custom Image */}
          <div className="p-3 rounded-lg border border-stone-200 bg-stone-50 space-y-2">
            <span className="block text-[11px] font-bold text-stone-700">تصویر جلد پشت</span>
            <input
              ref={backImgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'backCustomImageUrl');
                e.target.value = '';
              }}
            />
            {cover.backCustomImageUrl ? (
              <div className="flex items-center justify-between gap-2">
                <img
                  src={cover.backCustomImageUrl}
                  alt="جلد پشت"
                  className="h-8 w-12 rounded object-cover"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMediaTargetField('backCustomImageUrl')}
                    className="text-amber-700 hover:bg-amber-50 p-1 rounded cursor-pointer"
                    title="انتخاب از رسانه سایت"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeCover({ backCustomImageUrl: undefined })}
                    className="text-red-600 hover:bg-red-50 p-1 rounded cursor-pointer"
                    title="حذف تصویر جلد پشت"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => backImgInputRef.current?.click()}
                  className="w-full py-1.5 px-2 rounded-lg border border-dashed border-stone-300 hover:border-amber-500 text-[11px] font-semibold text-stone-600 flex items-center justify-center gap-1 cursor-pointer bg-white"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>تصویر اختصاصی</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTargetField('backCustomImageUrl')}
                  className="w-full py-1 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>انتخاب از رسانه</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back Cover Details */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-3">
          محتوای جلد پشت و تنظیمات نمایش
        </h3>

        <div>
          <label className="block text-[11px] font-bold text-stone-600 mb-1">تیتر جلد پشت</label>
          <input
            type="text"
            value={cover.backHeadline}
            onChange={(e) => onChangeCover({ backHeadline: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-600 mb-1">متن پایانی</label>
          <textarea
            rows={2}
            value={cover.backDescription}
            onChange={(e) => onChangeCover({ backDescription: e.target.value })}
            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">اطلاعات تماس</label>
            <input
              type="text"
              value={cover.backContactInfo}
              onChange={(e) => onChangeCover({ backContactInfo: e.target.value })}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">نشانی وب‌سایت</label>
            <input
              type="text"
              value={cover.backWebsite}
              onChange={(e) => onChangeCover({ backWebsite: e.target.value })}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 pt-2 cursor-pointer text-xs font-semibold text-stone-700">
          <input
            type="checkbox"
            checked={cover.showPageNumbers}
            onChange={(e) => onChangeCover({ showPageNumbers: e.target.checked })}
            className="rounded accent-amber-600 w-4 h-4"
          />
          <span>نمایش شماره صفحه در پایین صفحات محصول</span>
        </label>
      </div>

      {mediaTargetField && (
        <MediaSelector
          multiple={false}
          onSelect={(url) => {
            onChangeCover({ [mediaTargetField]: url });
            setMediaTargetField(null);
          }}
          onClose={() => setMediaTargetField(null)}
        />
      )}
    </div>
  );
};
