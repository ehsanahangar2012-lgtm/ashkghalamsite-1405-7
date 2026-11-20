import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  Info,
  Sparkles,
  ImageOff,
  Smartphone,
} from 'lucide-react';
import { getUploadFallbackCandidates } from '../../utils/catalogAssets';

export interface LightboxSlide {
  id?: string;
  src: string;
  fallbackSrc?: string;
  title?: string;
  category?: string;
  description?: string;
  sku?: string;
  priceLabel?: string;
  tags?: string[];
  aiStatus?: string;
}

interface CatalogImageLightboxProps {
  slides: LightboxSlide[];
  initialIndex?: number;
  onClose: () => void;
}

export const CatalogImageLightbox: React.FC<CatalogImageLightboxProps> = ({
  slides,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(slides.length - 1, initialIndex))
  );
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [imgMeta, setImgMeta] = useState<{ w: number; h: number } | null>(null);
  const [isPortraitScreen, setIsPortraitScreen] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );
  const [candidateIdx, setCandidateIdx] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const pinchRef = useRef<{ dist: number; startScale: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const slide = slides[currentIndex] || slides[0];
  const candidates = slide
    ? getUploadFallbackCandidates(slide.src, slide.fallbackSrc)
    : [];
  const activeSrc = candidates[candidateIdx] || slide?.src || '';

  const isHorizontalPhoto = Boolean(imgMeta && imgMeta.w > imgMeta.h * 1.15);
  const isRotatedQuarter = rotation % 180 !== 0;

  const resetTransform = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  useEffect(() => {
    setCandidateIdx(0);
    setImgFailed(false);
    setImgMeta(null);
    resetTransform();
  }, [currentIndex, resetTransform]);

  useEffect(() => {
    const onResize = () => {
      setIsPortraitScreen(window.innerHeight > window.innerWidth);
    };
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  const goPrev = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goNext = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight') {
        goPrev();
      } else if (e.key === 'ArrowLeft') {
        goNext();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(4, Number((s + 0.35).toFixed(2))));
      } else if (e.key === '-') {
        setScale((s) => {
          const next = Math.max(1, Number((s - 0.35).toFixed(2)));
          if (next === 1) setOffset({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key.toLowerCase() === 'r') {
        setRotation((r) => (r + 90) % 360);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext]);

  const toggleFullscreen = async () => {
    const el = rootRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
          setIsFullscreen(true);
          return;
        }
      } catch {
        // Fallback when native fullscreen is blocked
      }
      setIsFullscreen((v) => !v);
    } else {
      try {
        await document.exitFullscreen();
      } catch {}
      setIsFullscreen(false);
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(4, Number((s + 0.4).toFixed(2))));
  const handleZoomOut = () =>
    setScale((s) => {
      const next = Math.max(1, Number((s - 0.4).toFixed(2)));
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
    setOffset({ x: 0, y: 0 });
  };

  const handleToggleDoubleTapZoom = () => {
    setScale((s) => {
      if (s > 1.2) {
        setOffset({ x: 0, y: 0 });
        return 1;
      }
      return 2.25;
    });
  };

  // Mouse pan when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    setOffset({
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
    });
  };

  const handleMouseUp = () => {
    dragRef.current.active = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((s) => {
      const next = Math.max(1, Math.min(4, Number((s + delta).toFixed(2))));
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  // Touch pinch-to-zoom, pan & double-tap
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), startScale: scale };
      dragRef.current.active = false;
      return;
    }
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        handleToggleDoubleTapZoom();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
      if (scale > 1) {
        dragRef.current = {
          active: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          origX: offset.x,
          origY: offset.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / Math.max(10, pinchRef.current.dist);
      const nextScale = Math.max(1, Math.min(4, Number((pinchRef.current.startScale * ratio).toFixed(2))));
      setScale(nextScale);
      if (nextScale <= 1) setOffset({ x: 0, y: 0 });
      return;
    }
    if (e.touches.length === 1 && dragRef.current.active && scale > 1) {
      setOffset({
        x: dragRef.current.origX + (e.touches[0].clientX - dragRef.current.startX),
        y: dragRef.current.origY + (e.touches[0].clientY - dragRef.current.startY),
      });
    }
  };

  const handleTouchEnd = () => {
    pinchRef.current = null;
    dragRef.current.active = false;
  };

  if (!slide) return null;

  return (
    <div
      ref={rootRef}
      dir="rtl"
      className="fixed inset-0 z-[220] w-screen h-[100dvh] bg-black/97 text-white flex flex-col select-none overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Compact Top Control Bar */}
      <div className="px-2.5 sm:px-4 py-2 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-2 shrink-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            aria-label="بستن نمایش تمام‌صفحه"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
              {slide.title || 'نمای بزرگ تصویر کاتالوگ'}
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              {slides.length > 1 && (
                <span className="font-mono tabular-nums text-amber-400">
                  {(currentIndex + 1).toLocaleString('fa-IR')} / {slides.length.toLocaleString('fa-IR')}
                </span>
              )}
              {slide.category && <span className="truncate">{slide.category}</span>}
              <span className="font-mono tabular-nums">{Math.round(scale * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Zoom / Rotate / Fullscreen Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            title="کوچک‌نمایی"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            title="بزرگ‌نمایی"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRotate}
            title="چرخش ۹۰ درجه تصویر (عالی برای عکس‌های افقی در موبایل)"
            className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
              isRotatedQuarter
                ? 'bg-amber-500 text-slate-950'
                : isHorizontalPhoto && isPortraitScreen
                ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50 animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <RotateCw className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">چرخش</span>
          </button>
          {(scale !== 1 || rotation !== 0) && (
            <button
              type="button"
              onClick={resetTransform}
              title="بازنشانی نما"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'خروج از تمام‌صفحه' : 'نمایش تمام‌صفحه'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Landscape Photo Helper Banner on Portrait Mobile */}
      {isHorizontalPhoto && isPortraitScreen && !isRotatedQuarter && scale === 1 && (
        <div className="px-3 py-1.5 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between gap-2 text-[11px] text-amber-200 z-20 shrink-0">
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0 rotate-90" />
            این تصویر افقی است؛ برای مشاهده بسیار بزرگ‌تر روی موبایل، آن را بچرخانید:
          </span>
          <button
            type="button"
            onClick={handleRotate}
            className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[10px] shrink-0 cursor-pointer"
          >
            چرخش تمام‌صفحه ۹۰°
          </button>
        </div>
      )}

      {/* Main Interactive Zoom/Rotate Stage */}
      <div
        className={`relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden touch-none ${
          scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleToggleDoubleTapZoom}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {slides.length > 1 && scale === 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="تصویر قبلی"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/85 border border-white/15 flex items-center justify-center text-white cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="تصویر بعدی"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/85 border border-white/15 flex items-center justify-center text-white cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}

        {imgFailed || !activeSrc ? (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-6 text-center">
            <ImageOff className="w-10 h-10 opacity-50" />
            <span className="text-xs">امکان بارگذاری این تصویر فراهم نشد.</span>
          </div>
        ) : (
          <div
            className="flex items-center justify-center transition-transform duration-150 ease-out"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src={activeSrc}
              alt={slide.title || 'تصویر کاتالوگ'}
              draggable={false}
              referrerPolicy="no-referrer"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setImgMeta({ w: img.naturalWidth, h: img.naturalHeight });
                }
              }}
              onError={() => {
                if (candidateIdx + 1 < candidates.length) {
                  setCandidateIdx((p) => p + 1);
                } else {
                  setImgFailed(true);
                }
              }}
              style={{
                maxWidth: isRotatedQuarter ? '82dvh' : '96vw',
                maxHeight: isRotatedQuarter ? '94vw' : '82dvh',
              }}
              className="w-auto h-auto object-contain rounded-md shadow-2xl"
            />
          </div>
        )}
      </div>

      {/* Compact Collapsible Bottom Details Bar */}
      {(slide.description || slide.priceLabel || slide.sku || (slide.tags && slide.tags.length > 0)) && (
        <div className="bg-black/85 backdrop-blur-md border-t border-white/10 px-3 sm:px-5 py-2 shrink-0 z-30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 text-[11px] text-slate-300">
              {slide.aiStatus === 'done' && <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              <span className="truncate font-semibold text-white">
                {slide.description
                  ? showInfo
                    ? slide.title || 'توضیحات محصول'
                    : slide.description
                  : slide.title}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {slide.priceLabel && (
                <span className="text-[11px] font-black text-amber-400 tabular-nums">{slide.priceLabel}</span>
              )}
              <button
                type="button"
                onClick={() => setShowInfo((v) => !v)}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <Info className="w-3 h-3 text-amber-400" />
                <span>{showInfo ? 'بستن جزئیات' : 'مشخصات'}</span>
              </button>
            </div>
          </div>

          {showInfo && (
            <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5 text-[11px] text-slate-300 max-h-36 overflow-y-auto">
              {slide.sku && <div className="font-mono text-slate-400">کد محصول: {slide.sku}</div>}
              {slide.description && <p className="leading-relaxed text-slate-200">{slide.description}</p>}
              {slide.tags && slide.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {slide.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-slate-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
