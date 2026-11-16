import React, { useState, useEffect } from 'react';
import { Card, Button } from './UIComponents';
import {
  Sliders,
  Save,
  Check,
  RotateCcw,
  Upload,
  Trash2,
  Image as ImageIcon,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SmartHelpButton } from './SmartHelpModal';
import { useContent } from '../contexts/ContentContext';

export interface SliderConfig {
  autoPlay: boolean;
  autoSlide: boolean;
  autoDielineFold: boolean;
  slideDurationSec: number;
  rotationSpeed: number;
  defaultModelId: string;
  defaultFoldProgress: number;
  materialPreset: 'carbon' | 'kraft' | 'sbs' | 'royal';
  showWireframe: boolean;
  brandTitle: string;
  brandSlogan: string;
  boxLogoUrl: string;
  boxLogoMode: 'color' | 'foil';
}

export const DEFAULT_SLIDER_CONFIG: SliderConfig = {
  autoPlay: true,
  autoSlide: true,
  autoDielineFold: true,
  slideDurationSec: 11,
  rotationSpeed: 0.9,
  defaultModelId: 'giftBox',
  defaultFoldProgress: 100,
  materialPreset: 'carbon',
  showWireframe: false,
  brandTitle: 'اشک قلم',
  brandSlogan: 'مهندسی بسته‌بندی و کارتن‌سازی سه‌بعدی صنعتی',
  boxLogoUrl: '',
  boxLogoMode: 'color',
};

function optimizeLogoImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 512;
        const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(64, Math.round(img.width * scale));
        const h = Math.max(64, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(String(reader.result || ''));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export const SliderSettingsPanel: React.FC = () => {
  const { globalSettings, assets, uploadAsset } = useContent();

  const [config, setConfig] = useState<SliderConfig>(() => {
    try {
      const saved = localStorage.getItem('ashk_slider_config');
      return saved ? { ...DEFAULT_SLIDER_CONFIG, ...JSON.parse(saved) } : DEFAULT_SLIDER_CONFIG;
    } catch {
      return DEFAULT_SLIDER_CONFIG;
    }
  });
  const [savedBanner, setSavedBanner] = useState(false);
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const broadcastConfig = (nextConfig: SliderConfig) => {
    try {
      localStorage.setItem('ashk_slider_config', JSON.stringify(nextConfig));
      window.dispatchEvent(new Event('ashk-slider-config-updated'));
    } catch {}
  };

  useEffect(() => {
    broadcastConfig(config);
  }, [config]);

  const handleSave = async () => {
    broadcastConfig(config);
    setIsSavingServer(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sliderConfig: config }),
      });
    } catch {}
    setIsSavingServer(false);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2800);
  };

  const handleReset = () => {
    setConfig(DEFAULT_SLIDER_CONFIG);
    broadcastConfig(DEFAULT_SLIDER_CONFIG);
  };

  const handleBoxLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const optimized = await optimizeLogoImageToDataUrl(file);
      setConfig((prev) => ({ ...prev, boxLogoUrl: optimized }));
      if (uploadAsset) {
        await uploadAsset(file);
      }
    } catch {}
    e.target.value = '';
  };

  const handleUseSiteLogo = () => {
    if (globalSettings?.logoUrl) {
      setConfig((prev) => ({ ...prev, boxLogoUrl: globalSettings.logoUrl }));
    }
  };

  const activeLogoPreview = config.boxLogoUrl || globalSettings?.logoUrl || '';

  return (
    <Card className="p-6 space-y-6 bg-slate-900/70 border-slate-800 dir-rtl text-right">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">تنظیمات اسلایدر سه‌بعدی و لوگوی روی جعبه</h3>
            <p className="text-xs text-slate-400">
              بارگذاری لوگوی برند روی درب جعبه، کنترل انیمیشن تبدیل دایلاین به جعبه و اسلاید خودکار محصولات
            </p>
          </div>
        </div>
        <SmartHelpButton
          title="تنظیمات اسلایدر سه‌بعدی و لوگو"
          description="لوگوی آپلودشده در این بخش مستقیماً روی بسته‌بندی‌های سه‌بعدی صفحه اصلی منتشر و طلاکوب/چاپ می‌شود."
          steps={[
            'لوگوی برند خود را بارگذاری کنید یا از لوگوی اصلی سایت استفاده نمایید.',
            'حالت چاپ لوگو (چاپ رنگی UV یا طلاکوب برجسته) را تعیین کنید.',
            'پخش خودکار اسلایدها و نمایش تبدیل دایلاین به جعبه را فعال کنید و ذخیره بزنید.',
          ]}
        />
      </div>

      {/* Section 1: 3D Box Brand Logo Uploader */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/25 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              لوگوی منتشرشده روی بدنه و درب جعبه‌های سه‌بعدی
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              فایل PNG با پس‌زمینه شفاف بهترین نتیجه را برای چاپ و طلاکوب روی درب جعبه ایجاد می‌کند.
            </p>
          </div>
          {config.boxLogoUrl && (
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, boxLogoUrl: '' }))}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف و بازگشت به نشان پیش‌فرض</span>
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          {/* Preview Tile */}
          <div className="w-36 h-36 rounded-2xl bg-[#0c1220] border border-slate-700/80 flex flex-col items-center justify-center p-3 shrink-0 relative overflow-hidden">
            {activeLogoPreview ? (
              <>
                <img
                  src={activeLogoPreview}
                  alt="لوگوی روی جعبه"
                  className={`max-w-full max-h-24 object-contain ${
                    config.boxLogoMode === 'foil' ? 'brightness-110 contrast-125 sepia saturate-200' : ''
                  }`}
                />
                <span className="text-[10px] text-slate-400 mt-2">
                  {config.boxLogoUrl ? 'لوگوی اختصاصی اسلایدر' : 'لوگوی پیش‌فرض سایت'}
                </span>
              </>
            ) : (
              <div className="text-center space-y-1.5">
                <Layers className="w-8 h-8 text-amber-400/70 mx-auto" />
                <span className="text-[11px] text-slate-400 block">نشان پیش‌فرض اشک قلم</span>
              </div>
            )}
          </div>

          {/* Upload & Mode Controls */}
          <div className="flex-1 space-y-3 w-full">
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-colors">
                <Upload className="w-4 h-4" />
                <span>بارگذاری لوگوی جدید روی جعبه</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleBoxLogoUpload} />
              </label>

              {globalSettings?.logoUrl && (
                <button
                  type="button"
                  onClick={handleUseSiteLogo}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  استفاده از لوگوی اصلی سایت
                </button>
              )}

              {Array.isArray(assets) && assets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMediaPicker((v) => !v)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>انتخاب از کتابخانه رسانه ({assets.length})</span>
                </button>
              )}
            </div>

            {/* Print / Foil Finish Mode for Logo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, boxLogoMode: 'color' }))}
                className={`p-2.5 rounded-xl border text-right text-xs transition-colors cursor-pointer ${
                  config.boxLogoMode === 'color'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-200 font-bold'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold">چاپ رنگی UV (حفظ رنگ اصلی لوگو)</div>
                <div className="text-[11px] opacity-80 mt-0.5">نمایش رنگ‌های واقعی برند با قاب طلاکوب</div>
              </button>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, boxLogoMode: 'foil' }))}
                className={`p-2.5 rounded-xl border text-right text-xs transition-colors cursor-pointer ${
                  config.boxLogoMode === 'foil'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-200 font-bold'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold">طلاکوب / نقره‌کوب متالیک برجسته</div>
                <div className="text-[11px] opacity-80 mt-0.5">تبدیل خودکار لوگو به فویل داغ ۲۴ عیار</div>
              </button>
            </div>
          </div>
        </div>

        {/* Media Asset Picker */}
        {showMediaPicker && Array.isArray(assets) && assets.length > 0 && (
          <div className="pt-3 border-t border-slate-800 grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => {
                  setConfig((prev) => ({ ...prev, boxLogoUrl: asset.data }));
                  setShowMediaPicker(false);
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 flex flex-col items-center gap-1 cursor-pointer transition-colors"
              >
                <img src={asset.data} alt={asset.name} className="w-12 h-12 object-contain" />
                <span className="text-[10px] text-slate-300 truncate w-full text-center">{asset.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Slider Sequence & Dieline-to-Box Animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
          <div>
            <span className="text-slate-200 font-bold block">اسلایدر خودکار (رفتن به مدل بعدی بعد از نمایش)</span>
            <span className="text-[11px] text-slate-400">نمایش چرخشی ۵ ساختار بسته‌بندی پشت‌سرهم</span>
          </div>
          <input
            type="checkbox"
            checked={config.autoSlide}
            onChange={(e) => setConfig((prev) => ({ ...prev, autoSlide: e.target.checked }))}
            className="accent-amber-500 w-4 h-4 cursor-pointer shrink-0"
          />
        </label>

        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
          <div>
            <span className="text-slate-200 font-bold block">انیمیشن تبدیل دایلاین به جعبه در هر اسلاید</span>
            <span className="text-[11px] text-slate-400">نمایش نقشه برش و خط تا و سپس تاشدن به جعبه ۳D</span>
          </div>
          <input
            type="checkbox"
            checked={config.autoDielineFold}
            onChange={(e) => setConfig((prev) => ({ ...prev, autoDielineFold: e.target.checked }))}
            className="accent-amber-500 w-4 h-4 cursor-pointer shrink-0"
          />
        </label>

        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
          <span className="text-slate-200 font-bold">چرخش خودکار میز نمایشگاهی</span>
          <input
            type="checkbox"
            checked={config.autoPlay}
            onChange={(e) => setConfig((prev) => ({ ...prev, autoPlay: e.target.checked }))}
            className="accent-amber-500 w-4 h-4 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
          <span className="text-slate-200 font-bold">نمایش پیش‌فرض خطوط قالب CAD</span>
          <input
            type="checkbox"
            checked={config.showWireframe}
            onChange={(e) => setConfig((prev) => ({ ...prev, showWireframe: e.target.checked }))}
            className="accent-amber-500 w-4 h-4 cursor-pointer"
          />
        </label>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-300 font-bold">مدت زمان نمایش هر اسلاید:</span>
            <span className="text-amber-400 font-mono font-bold tabular-nums">{config.slideDurationSec} ثانیه</span>
          </div>
          <input
            type="range"
            min="6"
            max="22"
            step="1"
            value={config.slideDurationSec}
            onChange={(e) => setConfig((prev) => ({ ...prev, slideDurationSec: parseInt(e.target.value, 10) }))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-300 font-bold">سرعت چرخش صحنه:</span>
            <span className="text-amber-400 font-mono font-bold tabular-nums">{config.rotationSpeed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="2.5"
            step="0.1"
            value={config.rotationSpeed}
            onChange={(e) => setConfig((prev) => ({ ...prev, rotationSpeed: parseFloat(e.target.value) }))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <label className="block text-slate-300 font-bold">مدل شروع اسلایدر:</label>
          <select
            value={config.defaultModelId}
            onChange={(e) => setConfig((prev) => ({ ...prev, defaultModelId: e.target.value }))}
            className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
          >
            <option value="giftBox">هاردباکس مگنتی صادراتی (Hardbox)</option>
            <option value="windowBox">جعبه ویندودار لوکس اشک قلم (Window Box)</option>
            <option value="fefco0427">جعبه کیبوردی خودبست پستی (FEFCO 0427)</option>
            <option value="pharmaCarton">جعبه دارویی و آرایشی استاندارد (ECMA A20)</option>
            <option value="slidingSleeve">کاور و کشوی صنعتی ریلی (Sleeve)</option>
          </select>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <label className="block text-slate-300 font-bold">متریال پیش‌فرض بدنه:</label>
          <select
            value={config.materialPreset}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, materialPreset: e.target.value as SliderConfig['materialPreset'] }))
            }
            className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
          >
            <option value="carbon">کربن مخملی + طلاکوب داغ</option>
            <option value="kraft">کرافت طبیعی صنعتی</option>
            <option value="sbs">ایندربرد سفید بهداشتی (SBS)</option>
            <option value="royal">سرمه‌ای سلطنتی مات</option>
          </select>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <label className="block text-slate-300 font-bold">نام برند حک‌شده روی جعبه:</label>
          <input
            type="text"
            value={config.brandTitle}
            onChange={(e) => setConfig((prev) => ({ ...prev, brandTitle: e.target.value }))}
            className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <label className="block text-slate-300 font-bold">میزان تاخوردن دستی پیش‌فرض (وقتی تبدیل خودکار خاموش است):</label>
          <div className="flex items-center gap-3 pt-1">
            <input
              type="range"
              min="0"
              max="100"
              step="2"
              value={config.defaultFoldProgress}
              onChange={(e) => setConfig((prev) => ({ ...prev, defaultFoldProgress: parseInt(e.target.value, 10) }))}
              className="flex-1 accent-amber-500 cursor-pointer"
            />
            <span className="text-amber-400 font-mono font-bold w-10 text-left tabular-nums">
              {config.defaultFoldProgress}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} variant="primary" size="sm" className="text-xs font-bold" disabled={isSavingServer}>
            {savedBanner ? <Check className="w-4 h-4 ml-1.5" /> : <Save className="w-4 h-4 ml-1.5" />}
            {isSavingServer
              ? 'در حال ذخیره...'
              : savedBanner
              ? 'تنظیمات و لوگوی جعبه ذخیره شد'
              : 'ذخیره و انتشار در اسلایدر اصلی'}
          </Button>
          <Button onClick={handleReset} variant="outline" size="sm" className="text-xs">
            <RotateCcw className="w-3.5 h-3.5 ml-1" /> بازنشانی پیش‌فرض
          </Button>
        </div>
        {savedBanner && (
          <span className="text-xs font-bold text-emerald-400">لوگو و تنظیمات اسلایدر با صفحه نخست همگام شد</span>
        )}
      </div>
    </Card>
  );
};
