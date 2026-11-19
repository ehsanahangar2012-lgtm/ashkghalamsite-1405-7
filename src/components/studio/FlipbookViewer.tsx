import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PageFlip } from 'page-flip';
import {
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  BookOpen,
  ArrowLeftRight,
  ImageOff,
  Volume2,
  VolumeX,
  Columns2,
  Square,
  Sparkles,
  RectangleHorizontal,
  RectangleVertical,
  Search,
  X,
} from 'lucide-react';
import {
  CatalogPage,
  CatalogProject,
  FlipDirection,
  PageOrientationMode,
} from '../../types/flipbook';
import { BookCoverRenderer } from './BookCoverRenderer';
import {
  getFlipbookMutedPreference,
  setFlipbookMutedPreference,
  playPageFlipSound,
  primeFlipSoundAudio,
} from '../../utils/flipSound';

interface FlipbookViewerProps {
  project: CatalogProject;
  onFlipDirectionChange?: (dir: FlipDirection) => void;
  onOrientationChange?: (mode: PageOrientationMode) => void;
  compact?: boolean;
}

type BookSheet =
  | { kind: 'front-cover'; logicalIndex: number }
  | { kind: 'product'; logicalIndex: number; pageNumber: number; page: CatalogPage }
  | { kind: 'colophon'; logicalIndex: number }
  | { kind: 'back-cover'; logicalIndex: number };

interface ProductPageSheetProps {
  page: CatalogPage;
  pageNumber: number;
  showPageNumbers: boolean;
  isNearActive: boolean;
  sidePosition: 'left' | 'right' | 'single';
  isBookLandscape: boolean;
  onInspectPage: (page: CatalogPage) => void;
}

const ProductPageSheet = React.memo(
  React.forwardRef<HTMLDivElement, ProductPageSheetProps>(
    (
      {
        page,
        pageNumber,
        showPageNumbers,
        isNearActive,
        sidePosition,
        isBookLandscape,
        onInspectPage,
      },
      ref
    ) => {
      const [imgError, setImgError] = useState(false);
      const src = page.optimizedDataUrl || page.originalDataUrl;
      const w = page.width || page.originalWidth || 0;
      const h = page.height || page.originalHeight || 0;
      const isPhotoLandscape = w > 0 && h > 0 ? w > h * 1.05 : isBookLandscape;
      const isAiAnalyzed = page.aiStatus === 'done';

      return (
        <div
          ref={ref}
          data-density="soft"
          dir="rtl"
          className="flip-page-sheet relative w-full h-full bg-white text-stone-900 flex flex-col overflow-hidden border border-stone-200/90 group"
        >
          {sidePosition === 'left' && (
            <div className="flip-page-left-shadow absolute inset-0 pointer-events-none z-20" />
          )}
          {sidePosition === 'right' && (
            <div className="flip-page-right-shadow absolute inset-0 pointer-events-none z-20" />
          )}

          {/* Product Image Area — flex-1 mat prevents cropping horizontal or vertical photos */}
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              onInspectPage(page);
            }}
            className="relative w-full flex-1 min-h-0 p-2 sm:p-2.5 overflow-hidden bg-stone-100/95 border-b border-stone-200/80 flex items-center justify-center"
          >
            {!isNearActive ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 gap-2">
                <BookOpen className="w-6 h-6 opacity-40" />
                <span className="text-[11px]">در حال آماده‌سازی صفحه...</span>
              </div>
            ) : imgError || !src ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 gap-2 p-4 text-center">
                <ImageOff className="w-7 h-7 opacity-50" />
                <span className="text-xs">{page.title || 'تصویر محصول'}</span>
              </div>
            ) : (
              <>
                <img
                  src={src}
                  alt={page.title || page.fileName}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-sm transition-transform duration-300 group-hover:scale-[1.015]"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectPage(page);
                  }}
                  title="بزرگ‌نمایی تصویر و مشاهده کامل مشخصات"
                  aria-label="بزرگ‌نمایی تصویر محصول"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity absolute bottom-2 left-2 z-30 h-7 px-2 rounded-lg bg-stone-900/80 hover:bg-stone-900 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow"
                >
                  <Search className="w-3 h-3 text-amber-400" />
                  <span>بزرگ‌نمایی</span>
                </button>
              </>
            )}
          </div>

          {/* Product Details Rendered Below the Photo */}
          <div
            className={`shrink-0 flex flex-col justify-between bg-white ${
              isBookLandscape ? 'px-3.5 py-2 sm:px-4 sm:py-2.5' : 'px-3.5 py-2.5 sm:px-4 sm:py-3'
            }`}
          >
            <div className="space-y-1 overflow-hidden">
              <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-stone-500">
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 truncate">
                  {isAiAnalyzed && <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
                  <span className="truncate">{page.category || 'محصول کاتالوگ'}</span>
                </span>
                {page.sku && (
                  <span className="font-mono text-[10px] text-stone-400 shrink-0 tabular-nums">
                    {page.sku}
                  </span>
                )}
              </div>

              <h3
                className={`font-extrabold text-stone-900 leading-snug ${
                  isBookLandscape ? 'text-xs sm:text-sm line-clamp-1' : 'text-sm line-clamp-1'
                }`}
              >
                {page.title || 'محصول بدون عنوان'}
              </h3>

              <p
                className={`text-[11px] text-stone-600 leading-relaxed ${
                  isBookLandscape ? 'line-clamp-2' : 'line-clamp-2'
                }`}
              >
                {page.description || 'توضیحات معرفی محصول در بخش ویرایشگر قابل تکمیل است.'}
              </p>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-stone-200/90 flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
              <div className="text-stone-500 truncate min-w-0">
                {page.tags && page.tags.length > 0
                  ? page.tags.slice(0, 4).join(' · ')
                  : 'کاتالوگ دیجیتال'}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {page.priceLabel && (
                  <span className="font-bold text-stone-900 tabular-nums">{page.priceLabel}</span>
                )}
                {showPageNumbers && (
                  <span className="text-stone-400 font-mono tabular-nums">
                    {pageNumber.toLocaleString('fa-IR')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  )
);

ProductPageSheet.displayName = 'ProductPageSheet';

interface ColophonSheetProps {
  project: CatalogProject;
}

const ColophonSheet = React.memo(
  React.forwardRef<HTMLDivElement, ColophonSheetProps>(({ project }, ref) => (
    <div
      ref={ref}
      data-density="soft"
      dir="rtl"
      className="flip-page-sheet relative w-full h-full bg-stone-50 text-stone-800 p-5 sm:p-7 flex flex-col justify-between border border-stone-200"
    >
      <div className="text-[11px] text-stone-400 flex justify-between">
        <span>فهرست محصولات</span>
        <span>{project.cover.brandName}</span>
      </div>
      <div className="my-auto space-y-2.5 overflow-hidden">
        <h4 className="text-sm font-extrabold text-stone-900 border-b border-stone-200 pb-2">
          فهرست سریع صفحات
        </h4>
        <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
          {project.pages.slice(0, 10).map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between text-xs gap-2">
              <span className="truncate text-stone-700">{p.title || `صفحه ${idx + 1}`}</span>
              <span className="font-mono text-stone-400 tabular-nums shrink-0">
                {(idx + 1).toLocaleString('fa-IR')}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-[10px] text-stone-400 text-center">
        {project.cover.editionLabel} · {project.cover.yearLabel}
      </div>
    </div>
  ))
);

ColophonSheet.displayName = 'ColophonSheet';

export const FlipbookViewer: React.FC<FlipbookViewerProps> = ({
  project,
  onFlipDirectionChange,
  onOrientationChange,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flipMountRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);

  const [stageSize, setStageSize] = useState({ width: 960, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [forceSinglePage, setForceSinglePage] = useState(false);
  const [activeLogicalIdx, setActiveLogicalIdx] = useState(0);
  const activeLogicalIdxRef = useRef(0);
  activeLogicalIdxRef.current = activeLogicalIdx;
  const [jumpInput, setJumpInput] = useState('1');
  const [inspectedPage, setInspectedPage] = useState<CatalogPage | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => getFlipbookMutedPreference());

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      setFlipbookMutedPreference(next);
      if (!next) {
        primeFlipSoundAudio();
        playPageFlipSound(false);
      }
      return next;
    });
  }, []);

  // Portal state holds imperatively created sheet containers owned outside React's child list
  const [portalState, setPortalState] = useState<{
    key: string;
    nodes: HTMLDivElement[];
  } | null>(null);

  // Track responsive stage dimensions with floored hysteresis to prevent ResizeObserver/scrollbar loops
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    let timer: number | null = null;

    const applyMeasure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      const nextW = Math.floor(w / 24) * 24;
      const nextH = Math.floor(h / 24) * 24;
      setStageSize((prev) => {
        if (Math.abs(prev.width - nextW) < 24 && Math.abs(prev.height - nextH) < 24) {
          return prev;
        }
        return { width: nextW, height: nextH };
      });
    };

    applyMeasure();
    const ro = new ResizeObserver(() => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(applyMeasure, 180);
    });
    ro.observe(el);
    return () => {
      if (timer) window.clearTimeout(timer);
      ro.disconnect();
    };
  }, [isFullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const isMobile = stageSize.width < 720;
  const isSingleView = isMobile || forceSinglePage;

  // Analyze uploaded image orientations so horizontal photos use horizontal pages and vertical photos use vertical pages
  const orientationMetrics = useMemo(() => {
    const landscapeRatios: number[] = [];
    const portraitRatios: number[] = [];

    for (const p of project.pages) {
      const w = p.width || p.originalWidth || 0;
      const h = p.height || p.originalHeight || 0;
      if (w <= 0 || h <= 0) continue;
      const r = w / h;
      if (r > 1.06) {
        landscapeRatios.push(r);
      } else if (r < 0.94) {
        portraitRatios.push(r);
      }
    }

    const detectedOrientation: 'landscape' | 'portrait' =
      landscapeRatios.length > portraitRatios.length ? 'landscape' : 'portrait';

    const resolvedOrientation: 'landscape' | 'portrait' =
      project.pageOrientation === 'landscape' || project.pageOrientation === 'portrait'
        ? project.pageOrientation
        : detectedOrientation;

    let medianLandscapeRatio = 1.38;
    if (landscapeRatios.length > 0) {
      const sorted = [...landscapeRatios].sort((a, b) => a - b);
      medianLandscapeRatio = sorted[Math.floor(sorted.length / 2)];
    }

    let medianPortraitRatio = 0.75;
    if (portraitRatios.length > 0) {
      const sorted = [...portraitRatios].sort((a, b) => a - b);
      medianPortraitRatio = sorted[Math.floor(sorted.length / 2)];
    }

    return {
      detectedOrientation,
      resolvedOrientation,
      isLandscape: resolvedOrientation === 'landscape',
      medianLandscapeRatio,
      medianPortraitRatio,
    };
  }, [project.pages, project.pageOrientation]);

  const logicalSheets = useMemo<BookSheet[]>(() => {
    const list: BookSheet[] = [{ kind: 'front-cover', logicalIndex: 0 }];
    project.pages.forEach((p, idx) => {
      list.push({
        kind: 'product',
        logicalIndex: list.length,
        pageNumber: idx + 1,
        page: p,
      });
    });
    if (list.length % 2 === 0) {
      list.push({ kind: 'colophon', logicalIndex: list.length });
    }
    list.push({ kind: 'back-cover', logicalIndex: list.length });
    return list;
  }, [project.pages]);

  const totalSheets = logicalSheets.length;
  const isRtl = project.flipDirection === 'rtl';

  const physicalSheets = useMemo(() => {
    return isRtl ? [...logicalSheets].reverse() : logicalSheets;
  }, [logicalSheets, isRtl]);

  useEffect(() => {
    setActiveLogicalIdx(0);
    setJumpInput('1');
  }, [isRtl, project.id]);

  useEffect(() => {
    if (activeLogicalIdx >= totalSheets && totalSheets > 0) {
      const clamped = totalSheets - 1;
      setActiveLogicalIdx(clamped);
      setJumpInput(String(clamped + 1));
    }
  }, [activeLogicalIdx, totalSheets]);

  const pageDims = useMemo(() => {
    const padX = isMobile ? 20 : 52;
    const padY = isMobile ? 20 : 36;
    const availW = Math.max(240, stageSize.width - padX);
    const availH = Math.max(240, stageSize.height - padY);

    // Sheet aspect ratio (width / height) follows the photo orientation cleanly
    const targetAspect = orientationMetrics.isLandscape
      ? Math.max(1.22, Math.min(1.45, orientationMetrics.medianLandscapeRatio * 0.9))
      : Math.max(0.68, Math.min(0.84, orientationMetrics.medianPortraitRatio));

    const maxPerPageW = isSingleView
      ? Math.min(availW, orientationMetrics.isLandscape ? 820 : 580)
      : Math.min(Math.floor((availW - 8) / 2), orientationMetrics.isLandscape ? 620 : 500);

    let pageW = maxPerPageW;
    let pageH = Math.round(pageW / targetAspect);

    if (pageH > availH) {
      pageH = availH;
      pageW = Math.round(pageH * targetAspect);
    }

    return {
      width: Math.max(200, pageW),
      height: Math.max(200, pageH),
    };
  }, [stageSize, isMobile, isSingleView, orientationMetrics]);

  const toLogicalIndex = useCallback(
    (physIdx: number) => {
      const clamped = Math.max(0, Math.min(totalSheets - 1, physIdx));
      return isRtl ? totalSheets - 1 - clamped : clamped;
    },
    [isRtl, totalSheets]
  );

  const toPhysicalIndex = useCallback(
    (logIdx: number) => {
      const clamped = Math.max(0, Math.min(totalSheets - 1, logIdx));
      return isRtl ? totalSheets - 1 - clamped : clamped;
    },
    [isRtl, totalSheets]
  );

  const toLogicalRef = useRef(toLogicalIndex);
  toLogicalRef.current = toLogicalIndex;

  const bookKey = `${project.flipDirection}-${orientationMetrics.resolvedOrientation}-${
    isSingleView ? 'single' : 'spread'
  }-${totalSheets}-${pageDims.width}x${pageDims.height}`;

  // Isolate StPageFlip inside an empty host div and project React sheets via createPortal.
  // Explicit pixel dimensions on blockEl prevent StPageFlip from oscillating between portrait & landscape.
  useEffect(() => {
    const mount = flipMountRef.current;
    if (!mount || totalSheets === 0) return;

    mount.innerHTML = '';

    const spreadW = isSingleView ? pageDims.width : pageDims.width * 2;
    const blockEl = document.createElement('div');
    blockEl.className = 'mx-auto';
    blockEl.style.width = `${spreadW}px`;
    blockEl.style.height = `${pageDims.height}px`;
    mount.appendChild(blockEl);

    const containers: HTMLDivElement[] = physicalSheets.map((sheet) => {
      const el = document.createElement('div');
      const isHard = sheet.kind === 'front-cover' || sheet.kind === 'back-cover';
      el.setAttribute('data-density', isHard ? 'hard' : 'soft');
      el.style.width = '100%';
      el.style.height = '100%';
      blockEl.appendChild(el);
      return el;
    });

    const restoredLogical = Math.max(0, Math.min(totalSheets - 1, activeLogicalIdxRef.current));
    const startPhys = toPhysicalIndex(restoredLogical);

    const pf = new PageFlip(blockEl, {
      width: pageDims.width,
      height: pageDims.height,
      size: 'fixed',
      minWidth: pageDims.width,
      maxWidth: pageDims.width,
      minHeight: pageDims.height,
      maxHeight: pageDims.height,
      drawShadow: true,
      flippingTime: 440,
      usePortrait: isSingleView,
      startZIndex: 10,
      autoSize: false,
      maxShadowOpacity: 0.36,
      showCover: true,
      mobileScrollSupport: true,
      swipeDistance: 28,
      clickEventForward: false,
      useMouseEvents: true,
      startPage: startPhys,
    });

    pf.on('flip', (e) => {
      const logical = toLogicalRef.current(Number(e.data ?? 0));
      setActiveLogicalIdx(logical);
      setJumpInput(String(logical + 1));
      playPageFlipSound(isMutedRef.current);
    });

    pf.loadFromHTML(containers);
    pageFlipRef.current = pf;
    setPortalState({ key: bookKey, nodes: containers });

    return () => {
      try {
        pf.off('flip');
        pf.destroy();
      } catch {
        // ignore if already destroyed
      }
      if (pageFlipRef.current === pf) {
        pageFlipRef.current = null;
      }
      if (blockEl.parentNode) {
        blockEl.parentNode.removeChild(blockEl);
      }
      setPortalState(null);
    };
    // physicalSheets intentionally follows bookKey dimensions/direction/orientation/count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKey]);

  const handleFlipNext = useCallback(() => {
    primeFlipSoundAudio();
    const api = pageFlipRef.current;
    if (!api) return;
    if (isRtl) {
      api.flipPrev('bottom');
    } else {
      api.flipNext('bottom');
    }
  }, [isRtl]);

  const handleFlipPrev = useCallback(() => {
    primeFlipSoundAudio();
    const api = pageFlipRef.current;
    if (!api) return;
    if (isRtl) {
      api.flipNext('bottom');
    } else {
      api.flipPrev('bottom');
    }
  }, [isRtl]);

  const handleJumpToLogical = useCallback(
    (targetLogical: number) => {
      primeFlipSoundAudio();
      const clamped = Math.max(0, Math.min(totalSheets - 1, targetLogical));
      const phys = toPhysicalIndex(clamped);
      const api = pageFlipRef.current;
      if (api) {
        api.turnToPage(phys);
      }
      setActiveLogicalIdx(clamped);
      setJumpInput(String(clamped + 1));
      playPageFlipSound(isMutedRef.current);
    },
    [toPhysicalIndex, totalSheets]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (inspectedPage) {
        if (e.key === 'Escape') setInspectedPage(null);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isRtl) handleFlipNext();
        else handleFlipPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isRtl) handleFlipPrev();
        else handleFlipNext();
      } else if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRtl, handleFlipNext, handleFlipPrev, isFullscreen, inspectedPage]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    if (!isFullscreen) {
      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
          setIsFullscreen(true);
          return;
        }
      } catch {
        // Fallback inside restricted iframes
      }
      setIsFullscreen(true);
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {
        // ignore
      }
      setIsFullscreen(false);
    }
  };

  const cycleOrientation = () => {
    if (!onOrientationChange) return;
    const current = project.pageOrientation || 'auto';
    const next: PageOrientationMode =
      current === 'auto' ? 'landscape' : current === 'landscape' ? 'portrait' : 'auto';
    onOrientationChange(next);
  };

  const progressPercent =
    totalSheets > 1 ? Math.round((activeLogicalIdx / (totalSheets - 1)) * 100) : 100;

  return (
    <div
      ref={containerRef}
      dir="rtl"
      onPointerDown={primeFlipSoundAudio}
      className={`flex flex-col bg-[#12141a] text-stone-100 select-none ${
        isFullscreen
          ? 'fixed inset-0 z-[100] w-screen h-screen'
          : compact
          ? 'w-full h-full rounded-xl overflow-hidden border border-stone-800'
          : 'w-full h-full rounded-2xl overflow-hidden border border-stone-800 shadow-xl'
      }`}
    >
      {/* Top Flipbook Viewer Toolbar */}
      <div className="px-3 sm:px-4 py-2 bg-[#181b23] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-stone-100 truncate max-w-[140px] sm:max-w-[220px]">
              {project.cover.title || 'کاتالوگ دیجیتال'}
            </span>
          </div>

          <span className="text-stone-600 hidden sm:inline">|</span>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = parseInt(jumpInput, 10);
              if (!Number.isNaN(parsed)) {
                handleJumpToLogical(parsed - 1);
              }
            }}
            className="flex items-center gap-1.5 text-xs"
          >
            <span className="text-stone-400 hidden sm:inline">صفحه</span>
            <input
              type="number"
              min={1}
              max={totalSheets}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onBlur={() => {
                const parsed = parseInt(jumpInput, 10);
                if (!Number.isNaN(parsed)) handleJumpToLogical(parsed - 1);
                else setJumpInput(String(activeLogicalIdx + 1));
              }}
              aria-label="پرش به صفحه"
              className="w-11 bg-stone-800 border border-white/15 rounded-md px-1.5 py-1 text-center text-xs text-white font-mono tabular-nums focus:outline-none focus:border-amber-400"
            />
            <span className="text-stone-400 tabular-nums whitespace-nowrap">
              از {totalSheets.toLocaleString('fa-IR')}
            </span>
          </form>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleFlipPrev}
            disabled={activeLogicalIdx <= 0}
            title="صفحه قبلی"
            className="h-8 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-35 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
            <span className="hidden md:inline">قبلی</span>
          </button>

          <button
            type="button"
            onClick={handleFlipNext}
            disabled={activeLogicalIdx >= totalSheets - 1}
            title="صفحه بعدی"
            className="h-8 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-35 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span className="hidden md:inline">بعدی</span>
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-white/10 mx-0.5" />

          {/* Desktop 1-page / 2-page spread toggle */}
          {!isMobile && (
            <button
              type="button"
              onClick={() => setForceSinglePage((s) => !s)}
              title={forceSinglePage ? 'نمایش دوصفحه‌ای کتاب' : 'نمایش تک‌صفحه‌ای بزرگ'}
              className={`h-8 px-2 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                forceSinglePage
                  ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
              }`}
            >
              {forceSinglePage ? <Square className="w-3.5 h-3.5" /> : <Columns2 className="w-3.5 h-3.5" />}
              <span className="hidden xl:inline">{forceSinglePage ? 'تک‌صفحه‌ای' : 'دوصفحه‌ای'}</span>
            </button>
          )}

          {/* Zoom Controls */}
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
            title="کوچک‌نمایی"
            aria-label="کوچک‌نمایی"
            className="h-8 w-8 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono tabular-nums text-stone-300 w-9 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.85, Number((z + 0.15).toFixed(2))))}
            title="بزرگ‌نمایی"
            aria-label="بزرگ‌نمایی"
            className="h-8 w-8 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {zoom !== 1 && (
            <button
              type="button"
              onClick={() => setZoom(1)}
              title="بازنشانی زوم"
              aria-label="بازنشانی زوم"
              className="h-8 w-8 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Orientation Toggle (if editable in admin) or Badge */}
          {onOrientationChange ? (
            <button
              type="button"
              onClick={cycleOrientation}
              title="تغییر چیدمان صفحات (خودکار / افقی / عمودی)"
              className="h-8 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {orientationMetrics.isLandscape ? (
                <RectangleHorizontal className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <RectangleVertical className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="hidden md:inline">
                {(project.pageOrientation || 'auto') === 'auto'
                  ? orientationMetrics.isLandscape
                    ? 'افقی (خودکار)'
                    : 'عمودی (خودکار)'
                  : project.pageOrientation === 'landscape'
                  ? 'صفحه افقی'
                  : 'صفحه عمودی'}
              </span>
            </button>
          ) : null}

          {onFlipDirectionChange && (
            <button
              type="button"
              onClick={() => onFlipDirectionChange(isRtl ? 'ltr' : 'rtl')}
              title="تغییر جهت ورق‌زدن (راست‌به‌چپ / چپ‌به‌راست)"
              className="h-8 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">{isRtl ? 'RTL فارسی' : 'LTR لاتین'}</span>
            </button>
          )}

          {/* Sound / Silent Mode Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'حالت سایلنت فعال است — کلیک برای روشن کردن صدای ورق‌زدن' : 'صدای ورق‌زدن روشن است — کلیک برای سایلنت'}
            aria-label={isMuted ? 'روشن کردن صدای ورق‌زدن' : 'حالت سایلنت'}
            className={`h-8 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isMuted
                ? 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-white/10'
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 hover:bg-emerald-500/25'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isMuted ? 'سایلنت' : 'صدا روشن'}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'خروج از تمام‌صفحه' : 'نمایش تمام‌صفحه'}
            aria-label={isFullscreen ? 'خروج از تمام‌صفحه' : 'نمایش تمام‌صفحه'}
            className="h-8 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'خروج' : 'تمام‌صفحه'}</span>
          </button>
        </div>
      </div>

      {/* Slim Reading Progress Bar */}
      <div className="h-0.5 w-full bg-white/5 shrink-0">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3D Flipbook Stage */}
      <div
        ref={stageRef}
        dir="ltr"
        className={`flipbook-stage relative flex-1 ${
          zoom > 1 ? 'overflow-auto' : 'overflow-hidden'
        } flex items-center justify-center p-2 sm:p-4 bg-[radial-gradient(ellipse_at_center,_#222836_0%,_#101218_76%)]`}
      >
        {/* Interactive Edge Navigation Overlay Buttons */}
        <button
          type="button"
          onClick={isRtl ? handleFlipNext : handleFlipPrev}
          disabled={isRtl ? activeLogicalIdx >= totalSheets - 1 : activeLogicalIdx <= 0}
          aria-label={isRtl ? 'ورق‌زدن به صفحه بعدی' : 'ورق‌زدن به صفحه قبلی'}
          className="hidden md:flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-16 rounded-xl bg-black/35 hover:bg-black/65 border border-white/10 text-stone-200 disabled:opacity-0 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={isRtl ? handleFlipPrev : handleFlipNext}
          disabled={isRtl ? activeLogicalIdx <= 0 : activeLogicalIdx >= totalSheets - 1}
          aria-label={isRtl ? 'ورق‌زدن به صفحه قبلی' : 'ورق‌زدن به صفحه بعدی'}
          className="hidden md:flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-16 rounded-xl bg-black/35 hover:bg-black/65 border border-white/10 text-stone-200 disabled:opacity-0 transition-all cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          className="transition-transform duration-200 ease-out flex items-center justify-center"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Non-React StPageFlip host container */}
          <div ref={flipMountRef} />

          {/* Portal sheet contents cleanly into isolated containers */}
          {portalState &&
            portalState.key === bookKey &&
            portalState.nodes.length === physicalSheets.length &&
            physicalSheets.map((sheet, physIdx) => {
              const container = portalState.nodes[physIdx];
              const sidePosition: 'left' | 'right' | 'single' = isSingleView
                ? 'single'
                : physIdx % 2 === 1
                ? 'left'
                : 'right';

              const isNearActive = Math.abs(sheet.logicalIndex - activeLogicalIdx) <= 3;

              let content: React.ReactNode = null;
              if (sheet.kind === 'front-cover') {
                content = (
                  <BookCoverRenderer
                    side="front"
                    cover={project.cover}
                    pageCount={project.pages.length}
                  />
                );
              } else if (sheet.kind === 'back-cover') {
                content = (
                  <BookCoverRenderer
                    side="back"
                    cover={project.cover}
                    pageCount={project.pages.length}
                  />
                );
              } else if (sheet.kind === 'colophon') {
                content = <ColophonSheet project={project} />;
              } else {
                content = (
                  <ProductPageSheet
                    page={sheet.page}
                    pageNumber={sheet.pageNumber}
                    showPageNumbers={project.cover.showPageNumbers}
                    isNearActive={isNearActive}
                    sidePosition={sidePosition}
                    isBookLandscape={orientationMetrics.isLandscape}
                    onInspectPage={setInspectedPage}
                  />
                );
              }

              return createPortal(content, container, `sheet-${sheet.logicalIndex}`);
            })}
        </div>
      </div>

      {/* Bottom Thumbnail & Quick-Jump Strip */}
      <div className="px-3 py-2 bg-[#161920] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {logicalSheets.map((sheet) => {
            const isActive =
              sheet.logicalIndex === activeLogicalIdx ||
              (!isSingleView &&
                activeLogicalIdx > 0 &&
                activeLogicalIdx < totalSheets - 1 &&
                Math.abs(sheet.logicalIndex - activeLogicalIdx) <= 1);
            const label =
              sheet.kind === 'front-cover'
                ? 'جلد'
                : sheet.kind === 'back-cover'
                ? 'پشت'
                : sheet.kind === 'colophon'
                ? 'فهرست'
                : sheet.pageNumber.toLocaleString('fa-IR');

            const tooltip =
              sheet.kind === 'product' ? sheet.page.title || `صفحه ${sheet.pageNumber}` : label;

            return (
              <button
                key={`thumb-${sheet.logicalIndex}`}
                type="button"
                title={tooltip}
                onClick={() => handleJumpToLogical(sheet.logicalIndex)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <span className="hidden lg:inline text-[11px] text-stone-400 whitespace-nowrap shrink-0">
          ورق‌زدن با کشیدن گوشه صفحه، لمس یا دوبارکلیک برای بزرگ‌نمایی عکس
        </span>
      </div>

      {/* Interactive Lightbox Inspector Modal for Clicked / Zoomed Product Photo */}
      {inspectedPage && (
        <div
          className="fixed inset-0 z-[160] bg-black/85 p-4 sm:p-6 flex items-center justify-center"
          dir="rtl"
          onClick={() => setInspectedPage(null)}
        >
          <div
            className="w-full max-w-4xl bg-white text-stone-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between gap-4 bg-stone-50">
              <div className="flex items-center gap-2 min-w-0">
                {inspectedPage.aiStatus === 'done' && (
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <h4 className="text-sm sm:text-base font-extrabold truncate">
                  {inspectedPage.title || 'جزئیات محصول'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectedPage(null)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200 cursor-pointer"
                aria-label="بستن بزرگ‌نمایی"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="w-full max-h-[55vh] rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={inspectedPage.optimizedDataUrl || inspectedPage.originalDataUrl}
                  alt={inspectedPage.title || inspectedPage.fileName}
                  className="max-w-full max-h-[50vh] object-contain rounded"
                />
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                  <span className="font-bold text-amber-700">
                    {inspectedPage.category || 'محصول کاتالوگ'}
                  </span>
                  <div className="flex items-center gap-3">
                    {inspectedPage.sku && (
                      <span className="font-mono text-stone-500">کد: {inspectedPage.sku}</span>
                    )}
                    {inspectedPage.priceLabel && (
                      <span className="font-extrabold text-stone-900">
                        {inspectedPage.priceLabel}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-stone-700 leading-relaxed">
                  {inspectedPage.description || 'توضیحات تکمیلی این محصول ثبت نشده است.'}
                </p>

                {inspectedPage.tags && inspectedPage.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {inspectedPage.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-[11px] font-semibold text-stone-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
