import React, { useState, useEffect } from 'react';
import { Box, Sliders, Palette, Sparkles, Maximize2 } from 'lucide-react';
import { AdminConfig } from '../types';

export const SliderSettingsPanel: React.FC = () => {
  const [config, setConfig] = useState<AdminConfig>(() => {
    const defaultVal: AdminConfig = {
      boxType: 'windowBox',
      length: 3.0,
      width: 3.0,
      height: 0.45,
      cardboardColor: '#d97706',
      artworkColor: '#cca43b',
      speed: 1.0,
      cameraPath: 'cinematic',
      glowActive: true,
      particlesCount: 150,
      ctaServicesText: 'مشاهده خدمات ساختار',
      ctaPortfolioText: 'کاتالوگ و نمونه‌کارها',
      ctaInquiryText: 'محاسبه آنی قیمت جعبه',
      slideDurationMult: 1.0,
      autoCycleBoxes: true,
      promoTitle1: 'طراحی تخصصی دی‌لاین و قالب',
      promoDesc1: 'مهندسی پیشرفته قالب‌های بسته‌بندی با رعایت دقیق استانداردهای FEFCO برای محافظت کامل از محصول شما.',
      promoTitle2: 'طلاکوب و برجسته‌سازی نفیس',
      promoDesc2: 'درخشش بی‌نقص طلاکوب ۲۴ عیار داغ بر روی مقواهای سلولزی با پیشرفته‌ترین ماشین‌آلات شرکت اشک قلم.',
      promoTitle3: 'شبیه‌سازی سه‌بعدی و استودیو',
      promoDesc3: 'اولین موتور رندرینگ آنی جعبه در کشور؛ ابعاد و جزییات طرح خود را قبل از تولید واقعی تماماً لمس و تماشا فرمایید.',
      brandTitle: 'صنایع بسته‌بندی اشک قـلم',
      brandSlogan: 'آفرینش هندسه نفیس و ساخت قالب',
      brandDescription: 'طراحی تخصصی دی‌لاین و دایکات‌های هنری هماهنگ با فرآیندهای پرداخت لوکس، طلاکوب ۲۴ عیار برجسته و بالاترین استانداردهای بسته‌بندی نفیس صادراتی جهان. شبیه‌ساز سه‌بعدی تمام‌دیجیتال و مهندسی توسعه محصول همگام با فناوری مدرن اشک قلم.',
      activeBoxTypes: ['windowBox', 'fefco0427', 'pharmaCarton', 'giftBox', 'slidingSleeve'],
      cameraHeightOffset: 0.0,
      cameraDistanceOffset: 0.0,
      cameraAngleOffset: 0.0
    };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ashk_slider_config');
      if (saved) {
        try {
          return { ...defaultVal, ...JSON.parse(saved) };
        } catch (e) {
          return defaultVal;
        }
      }
    }
    return defaultVal;
  });

  useEffect(() => {
    localStorage.setItem('ashk_slider_config', JSON.stringify(config));
    window.dispatchEvent(new Event('ashk_slider_config_changed'));
  }, [config]);

  // ... rest of the UI code as before, but ensure it uses the local config/setConfig
  return (
    <div className="space-y-5 text-slate-200">
      {/* Box Type Selector */}
... (rest of the UI)
      {/* Box Type Selector */}
      <div className="space-y-2">
        <label className="text-xs font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
          <Box className="w-3.5 h-3.5" />
          <span>ساختار قالب هندسی</span>
        </label>
        <select 
          value={config.boxType}
          onChange={(e) => {
            const selectedVal = e.target.value as any;
            const defaultDimensions: Record<string, { length: number; width: number; height: number }> = {
              fefco0427: { length: 3.0, width: 3.0, height: 0.45 },
              windowBox: { length: 3.0, width: 3.0, height: 0.45 },
              pharmaCarton: { length: 1.6, width: 1.4, height: 1.0 },
              giftBox: { length: 3.0, width: 2.2, height: 0.9 },
              slidingSleeve: { length: 3.0, width: 2.0, height: 0.35 }
            };
            const dims = defaultDimensions[selectedVal] || { length: 3.0, width: 3.0, height: 0.45 };
            setConfig({
              ...config,
              boxType: selectedVal,
              ...dims
            });
          }}
          className="w-full bg-[#0a0f2b] border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
        >
          <option value="fefco0427">FEFCO 0427 (جعبه کلاسیک پیتزا)</option>
          <option value="windowBox">Luxury Windowed Kraft (جعبه ویندودار اشک قلم)</option>
          <option value="pharmaCarton">Pharmaceutical Reverse-Tuck (جعبه داروئی اشک قلم)</option>
          <option value="giftBox">Premium Gift Box (هاردباکس هدیه)</option>
          <option value="slidingSleeve">Sliding Sleeve Carton (کشویی صنعتی)</option>
        </select>
      </div>

      {/* Length, Width, Height sliders */}
      <div className="space-y-4 border-t border-slate-900 pt-3">
        <h4 className="text-[11px] font-black text-slate-400">اندازه‌گذاری قالب (میلی‌متر)</h4>
        
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono font-bold">
            <span className="text-cyan-450">{config.length * 100} mm</span>
            <span>طول جعبه (Length)</span>
          </div>
          <input 
            type="range" min="1.5" max="4.5" step="0.1"
            value={config.length}
            onChange={(e) => setConfig({ ...config, length: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono font-bold">
            <span className="text-cyan-450">{config.width * 100} mm</span>
            <span>عرض جعبه (Width)</span>
          </div>
          <input 
            type="range" min="1.5" max="4.5" step="0.1"
            value={config.width}
            onChange={(e) => setConfig({ ...config, width: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono font-bold">
            <span className="text-cyan-450">{Math.round(config.height * 100)} mm</span>
            <span>ارتفاع جعبه (Height)</span>
          </div>
          <input 
            type="range" min="0.1" max="3.0" step="0.05"
            value={config.height}
            onChange={(e) => setConfig({ ...config, height: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Cardboard Card Colors */}
      <div className="space-y-2 border-t border-slate-900 pt-3">
        <label className="text-xs font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
          <Palette className="w-3.5 h-3.5" />
          <span>طرح متریال مقوا (قالب اصلی)</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { color: '#f3f3f6', label: 'سفید SBS' },
            { color: '#e0cfa9', label: 'کرافت قهوه‌ای' },
            { color: '#1a1f33', label: 'کربن مشکی' },
            { color: '#572214', label: 'چرمی چوبی' }
          ].map((item) => (
            <button
              key={item.color}
              onClick={() => setConfig({ ...config, cardboardColor: item.color })}
              className={`p-1 rounded-lg border text-[9px] font-black text-center transition-all ${
                config.cardboardColor === item.color 
                  ? 'border-amber-500 bg-amber-500/10 text-white' 
                  : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              <div className="w-full h-4 rounded mb-1" style={{ backgroundColor: item.color }} />
              <span className="block truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Foil Stamp Color */}
      <div className="space-y-2">
        <label className="text-xs font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
          <Sparkles className="w-3.5 h-3.5" />
          <span>طلاکوب لوگو (Foil Finishes)</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { color: '#cca43b', label: 'طلای ۲۴ عیار' },
            { color: '#cccccc', label: 'نقره‌ای صیقلی' },
            { color: '#ec4899', label: 'نئون بنفش' },
            { color: '#ffffff', label: 'هولوگرام لوکس' }
          ].map((item) => (
            <button
              key={item.color}
              onClick={() => setConfig({ ...config, artworkColor: item.color })}
              className={`p-1 rounded-lg border text-[9px] font-black text-center transition-all ${
                config.artworkColor === item.color 
                  ? 'border-amber-500 bg-amber-500/10 text-white' 
                  : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              <div className="w-full h-4 rounded mb-1" style={{ backgroundColor: item.color }} />
              <span className="block truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Animation Speed and camera configs */}
      <div className="space-y-3.5 border-t border-slate-900 pt-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-white">{config.speed}x</span>
          <span>سرعت شبیه‌سازی</span>
        </div>
        <input 
          type="range" min="0.25" max="2.5" step="0.25"
          value={config.speed}
          onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
          className="w-full accent-amber-500 cursor-pointer"
        />

        <div className="space-y-2">
          <span className="text-xs">مسیر حرکت دوربین (Orbit)</span>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
            {[
              { val: 'cinematic', label: 'چرخش سینمایی' },
              { val: 'orbit', label: 'فوکوس دستی' },
              { val: 'topDown', label: 'نقشه دو بعدی' },
              { val: 'isometric', label: 'سه‌بعدی ایزومتریک' }
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => setConfig({ ...config, cameraPath: opt.val as any })}
                className={`py-1.5 px-2 rounded-lg border transition-all text-center ${config.cameraPath === opt.val ? 'bg-amber-500 text-slate-900 border-amber-400' : 'bg-slate-900 border-slate-800 text-slate-300'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

       {/* Slide Transition & Cycle configuration section */}
       <div className="space-y-3 border-t border-slate-900 pt-3.5 text-xs">
        <h4 className="text-[11px] font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
          <Sliders className="w-3.5 h-3.5 text-[#cca43b]" />
          <span>تنظیمات اسلایدها و چرخه پخش</span>
        </h4>
        
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-black text-slate-300">
            <span className="text-cyan-400 font-mono font-bold">{config.slideDurationMult}x</span>
            <span>ضریب ماندگاری اسلایدها (Pause)</span>
          </div>
          <input 
            type="range" min="0.5" max="3.0" step="0.25"
            value={config.slideDurationMult}
            onChange={(e) => setConfig({ ...config, slideDurationMult: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <span className="text-[9.5px] text-slate-400 block leading-normal">
            با افزایش ضریب، مکث روی هر اسلاید طولانی تر و با کاهش آن سریعتر پیش می‌رود.
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] font-black text-slate-200 pt-1.5">
          <span>تغییر متوالی قالب هندسی جعبه‌ها</span>
          <input 
            type="checkbox"
            checked={config.autoCycleBoxes}
            onChange={(e) => setConfig({ ...config, autoCycleBoxes: e.target.checked })}
            className="w-4 h-4 accent-amber-500 cursor-pointer rounded border-slate-800 bg-slate-900"
          />
        </div>
        <span className="text-[9.5px] text-slate-400 block leading-normal mt-1">
          در صورت فعال بودن تمایل، در فاز ۱۰ به صورت اتوماتیک قالب جعبه بعدی لود می‌شود.
        </span>
      </div>

      {/* Effects toggle */}
      <div className="flex items-center justify-between border-t border-slate-900 pt-4 text-xs font-bold">
        <span>تلالو و افکت نئونی خطوط</span>
        <input 
          type="checkbox"
          checked={config.glowActive}
          onChange={(e) => setConfig({ ...config, glowActive: e.target.checked })}
          className="w-5 h-5 accent-emerald-500 cursor-pointer"
        />
      </div>

      {/* CTA Custom text inputs */}
      <div className="space-y-3.5 border-t border-slate-900 pt-3 text-xs font-bold">
        <span className="block text-[#cca43b]">ویرایش عناوین دکمه‌های سفارش</span>
        <div className="space-y-2 text-[11px]">
          <div className="space-y-1">
            <span>دکمه استعلام قیمت آنلاین:</span>
            <input 
              type="text" value={config.ctaInquiryText}
              onChange={(e) => setConfig({ ...config, ctaInquiryText: e.target.value })}
              className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white"
            />
          </div>
          <div className="space-y-1">
            <span>دکمه کاتالوگ و نمونه‌کارها:</span>
            <input 
              type="text" value={config.ctaPortfolioText}
              onChange={(e) => setConfig({ ...config, ctaPortfolioText: e.target.value })}
              className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* Promo Text Boxes Editor */}
      <div className="space-y-3.5 border-t border-slate-900 pt-3 text-xs font-bold">
        <span className="block text-[#cca43b]">معرفی خدمات و تبلیغات شیشه‌ای اشک قلم</span>
        
        <div className="space-y-2.5 text-[11px]">
          {/* Card 1 */}
          <div className="space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
            <span className="text-[#cca43b] block">باکس اول (مهندسی قالب):</span>
            <input 
              type="text" value={config.promoTitle1}
              onChange={(e) => setConfig({ ...config, promoTitle1: e.target.value })}
              placeholder="عنوان تبلیغ اول"
              className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[11px] mb-1"
            />
            <textarea 
              value={config.promoDesc1}
              onChange={(e) => setConfig({ ...config, promoDesc1: e.target.value })}
              placeholder="متن توضیحی تبلیغ اول"
              rows={2}
              className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[10px] resize-none"
            />
          </div>

          {/* Card 2 */}
          <div className="space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
            <span className="text-[#cca43b] block">باکس دوم (طلاکوب لوکس):</span>
            <input 
              type="text" value={config.promoTitle2}
              onChange={(e) => setConfig({ ...config, promoTitle2: e.target.value })}
              placeholder="عنوان تبلیغ دوم"
              className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[11px] mb-1"
            />
            <textarea 
              value={config.promoDesc2}
              onChange={(e) => setConfig({ ...config, promoDesc2: e.target.value })}
              placeholder="متن توضیحی تبلیغ دوم"
              rows={2}
              className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[10px] resize-none"
            />
          </div>

          {/* Card 3 */}
          <div className="space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
            <span className="text-[#cca43b] block">باکس سوم (شبیه‌ساز و استودیو):</span>
            <input 
              type="text" value={config.promoTitle3}
              onChange={(e) => setConfig({ ...config, promoTitle3: e.target.value })}
              placeholder="عنوان تبلیغ سوم"
              className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[11px] mb-1"
            />
            <textarea 
              value={config.promoDesc3}
              onChange={(e) => setConfig({ ...config, promoDesc3: e.target.value })}
              placeholder="متن توضیحی تبلیغ سوم"
              rows={2}
              className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[10px] resize-none"
            />
          </div>
        </div>
      </div>

      {/* ── PART 1: CHOOSE DISPLAYED BOX TYPES IN CYCLIC ITERATION ── */}
      <div className="space-y-3 border-t border-slate-900 pt-3.5 text-xs">
        <h4 className="text-[11px] font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
          <Box className="w-3.5 h-3.5 text-[#cca43b]" />
          <span>جعبه‌های فعال در چرخه نمایش (Slider)</span>
        </h4>
        <p className="text-[9.5px] text-slate-400 block leading-normal">
          انواع قالب‌هایی که مایلید در حین پخش هوشمند به ترتیب نمایش داده شوند را تیک بزنید:
        </p>
        <div className="space-y-2 bg-[#0a0f2b]/60 p-3 rounded-xl border border-slate-800/85">
          {[
            { id: 'fefco0427', label: 'کلاسیک پیتزا FEFCO 0427' },
            { id: 'windowBox', label: 'ویندودار لوکس کرافت (Windowed)' },
            { id: 'pharmaCarton', label: 'داروئی استاندارد (Reverse-Tuck)' },
            { id: 'giftBox', label: 'هاردباکس هدیه (Gift Box)' },
            { id: 'slidingSleeve', label: 'کشویی صنعتی (Sliding Sleeve)' }
          ].map((item) => {
            const isChecked = (config.activeBoxTypes || []).includes(item.id as any);
            return (
              <label key={item.id} className="flex items-center gap-2.5 cursor-pointer text-[10.5px] text-slate-350 hover:text-amber-400 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    let updatedList = [...(config.activeBoxTypes || [])];
                    if (e.target.checked) {
                      if (!updatedList.includes(item.id as any)) {
                        updatedList.push(item.id as any);
                      }
                    } else {
                      if (updatedList.length > 1) {
                        updatedList = updatedList.filter(bt => bt !== item.id);
                      }
                    }
                    setConfig({ ...config, activeBoxTypes: updatedList as any });
                  }}
                  className="w-4 h-4 accent-amber-500 rounded border-slate-800 bg-slate-950"
                />
                <span>{item.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── PART 2: SLIDER INTRODUCTION & BRAND COVERS EDITING ── */}
      <div className="space-y-3 border-t border-slate-900 pt-3.5 text-xs">
        <h4 className="text-[11px] font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
          <Sliders className="w-3.5 h-3.5 text-[#cca43b]" />
          <span>متن‌های معرفی و شعارهای اصلی اسلایدر</span>
        </h4>
        <p className="text-[9.5px] text-slate-400 block leading-normal">
          عنوان برند، شعار و متن توضیحی نمایش داده شده بر روی اسلایدر را ویرایش فرمایید:
        </p>
        <div className="space-y-2.5 text-[11px]">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px]">عنوان برند اصلی پوستر:</span>
            <input 
              type="text" 
              value={config.brandTitle}
              onChange={(e) => setConfig({ ...config, brandTitle: e.target.value })}
              className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[11px] focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px]">شعار اصلی پوستر:</span>
            <input 
              type="text" 
              value={config.brandSlogan}
              onChange={(e) => setConfig({ ...config, brandSlogan: e.target.value })}
              className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[11px] focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px]">متن معرفی محصول و فناوری (Sub-Narrative):</span>
            <textarea 
              value={config.brandDescription}
              onChange={(e) => setConfig({ ...config, brandDescription: e.target.value })}
              rows={3}
              className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[10.5px] focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* ── PART 3: ADVANCED CAMERA OFFSET COORDINATES TUNING ── */}
      <div className="space-y-3 border-t border-slate-900 pt-3.5 text-xs">
        <h4 className="text-[11px] font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
          <Maximize2 className="w-3.5 h-3.5 text-[#cca43b]" />
          <span>موقعیت و زوایای قرارگیری دوربین سه بعدی</span>
        </h4>
        <p className="text-[9.5px] text-slate-400 block leading-normal">
          بدون تغییر در کدهای رندرینگ، تراز ارتفاعی و دایرة‌البروج دوربین را بهینه‌سازی و جابجا فرمایید:
        </p>
        <div className="space-y-3 bg-[#0a0f2b]/40 p-3 rounded-xl border border-slate-800/80 text-[10.5px]">
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[9.5px]">
              <span className="text-amber-400">{(config.cameraHeightOffset || 0).toFixed(2)}</span>
              <span>تراز ارتفاع دوربین (Y Height)</span>
            </div>
            <input 
              type="range" min="-3.0" max="3.0" step="0.1"
              value={config.cameraHeightOffset || 0}
              onChange={(e) => setConfig({ ...config, cameraHeightOffset: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-900 rounded-lg appearance-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[9.5px]">
              <span className="text-amber-400">{(config.cameraDistanceOffset || 0).toFixed(2)}</span>
              <span>فاصله کانونی عمق و زوم (Distance)</span>
            </div>
            <input 
              type="range" min="-3.0" max="3.0" step="0.1"
              value={config.cameraDistanceOffset || 0}
              onChange={(e) => setConfig({ ...config, cameraDistanceOffset: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-900 rounded-lg appearance-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[9.5px]">
              <span className="text-amber-400">{(config.cameraAngleOffset || 0).toFixed(2)} rad</span>
              <span>چرخش سمتی پایه افقی (Angle Yaw)</span>
            </div>
            <input 
              type="range" min="-3.14" max="3.14" step="0.1"
              value={config.cameraAngleOffset || 0}
              onChange={(e) => setConfig({ ...config, cameraAngleOffset: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-900 rounded-lg appearance-none"
            />
              </div>

          <button
            onClick={() => setConfig({ ...config, cameraHeightOffset: 0, cameraDistanceOffset: 0, cameraAngleOffset: 0 })}
            className="w-full py-1.5 mt-1 text-center bg-slate-900 rounded-lg border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-850 transition-all text-[9.5px]"
          >
            ریست به زوایای دیفالت سازنده
          </button>
        </div>
      </div>
    </div>
  );
};
