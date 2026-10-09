import React, { useState, useEffect } from 'react';
import { 
  X, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, Maximize2, Minimize2, 
  Moon, Sun, Sparkles, Download, MessageSquare, 
  Grid, ShoppingBag, Play, Pause, BookOpen, RotateCcw
} from 'lucide-react';
import { AICatalogAssistant } from './AICatalogAssistant';
import { CatalogItem, CatalogHotspot } from '../../types/catalog';
import { catalogService } from '../../services/catalogService';

interface CatalogViewerModalProps {
  catalog: CatalogItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CatalogViewerModal: React.FC<CatalogViewerModalProps> = ({
  catalog,
  isOpen,
  onClose
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isNightMode, setIsNightMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<CatalogHotspot | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Responsive Window Width Tracker
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const pageStep = isMobile ? 1 : 2;

  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
    setTouchStartX(null);
  };

  // Auto-flip State
  const [isAutoFlipping, setIsAutoFlipping] = useState(false);
  const [autoFlipIntervalSec, setAutoFlipIntervalSec] = useState(4);

  useEffect(() => {
    if (catalog) {
      setCurrentPage(0);
      setIsAutoFlipping(false);
      setZoomLevel(1);
      catalogService.recordAnalytics(catalog.id, 'view');
    }
  }, [catalog]);

  // Auto-flip Interval Effect
  useEffect(() => {
    if (!isAutoFlipping || !catalog) return;

    const timer = setInterval(() => {
      setCurrentPage((prev) => {
        const total = catalog.pages.length || 1;
        if (prev + pageStep < total) {
          return prev + pageStep;
        } else {
          return 0; // Cycle back to page 1
        }
      });
    }, autoFlipIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [isAutoFlipping, autoFlipIntervalSec, catalog, pageStep]);

  if (!isOpen || !catalog) return null;

  const totalPages = catalog.pages.length || 1;

  const handleNextPage = () => {
    if (currentPage + pageStep < totalPages) {
      setCurrentPage(prev => prev + pageStep);
      setZoomLevel(1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage - pageStep >= 0) {
      setCurrentPage(prev => prev - pageStep);
      setZoomLevel(1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleDownloadPDF = () => {
    catalogService.recordAnalytics(catalog.id, 'download');
    if (catalog.pdfUrl) {
      window.open(catalog.pdfUrl, '_blank');
    } else {
      alert('فایل PDF این کاتالوگ آماده دانلود است.');
    }
  };

  const leftPageObj = catalog.pages[currentPage];
  const rightPageObj = catalog.pages[currentPage + 1];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col font-sans transition-colors duration-300 ${isNightMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* 1. TOP NAVIGATION BAR */}
      <div className={`p-4 border-b flex items-center justify-between z-20 backdrop-blur-md ${isNightMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        {/* Left Section: Title & Metadata */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base">{catalog.title}</h2>
            <div className="flex items-center gap-2 text-[11px] opacity-75">
              <span>{catalog.category}</span>
              <span>•</span>
              <span>{catalog.publisher || 'اشک قلم'}</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{catalog.pageCount} صفحه</span>
            </div>
          </div>
        </div>

        {/* Center Section: Zoom & Auto-Play Controls */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="بزرگ‌نمایی"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-amber-400 min-w-[40px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="کوچک‌نمایی"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {zoomLevel !== 1 && (
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="بازنشانی زوم"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-800 my-auto mx-1" />

          {/* Auto-Play Toggle */}
          <button
            onClick={() => setIsAutoFlipping(!isAutoFlipping)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              isAutoFlipping 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 animate-pulse' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="ورق خوردن اتوماتیک صفحات"
          >
            {isAutoFlipping ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isAutoFlipping ? 'ورق زدن خودکار (فعال)' : 'ورق زدن خودکار'}</span>
          </button>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* AI Assistant Button */}
          <button
            onClick={() => setIsAiAssistantOpen(!isAiAssistantOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">دستیار هوشمند AI</span>
          </button>

          {/* Night/Light Toggle */}
          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className={`p-2.5 rounded-xl border transition-colors ${isNightMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-200 border-slate-300 text-slate-700'}`}
            title="حالت شب / روز"
          >
            {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className={`p-2.5 rounded-xl border transition-colors ${isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-700'}`}
            title="تمام صفحه"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Download */}
          <button
            onClick={handleDownloadPDF}
            className={`p-2.5 rounded-xl border transition-colors ${isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-amber-400' : 'bg-slate-200 border-slate-300 text-slate-700 hover:text-amber-600'}`}
            title="دانلود فایل PDF"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN 2D CATALOG SPREAD VIEW AREA */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-4 touch-pan-y"
      >
        
        {/* Pages Container with smooth zoom transform */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 max-w-7xl w-full h-full max-h-[82vh] transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Left / Active Page */}
          {leftPageObj && (
            <div className="relative flex-1 w-full h-full max-h-[78vh] flex items-center justify-center bg-slate-900/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden group">
              <img
                src={leftPageObj.imageUrl}
                alt={`برگه ${currentPage + 1}`}
                className="max-h-[74vh] max-w-full object-contain rounded-xl select-none"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-3 left-4 bg-slate-950/80 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-amber-500/30">
                برگه {currentPage + 1}
              </span>

              {/* Hotspots Overlay for Left Page */}
              {leftPageObj.hotspots?.map((hs) => (
                <button
                  key={hs.id}
                  onClick={() => setSelectedHotspot(hs)}
                  style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 group/hs flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-950 shadow-lg border-2 border-white hover:scale-125 transition-transform cursor-pointer animate-pulse"
                  title={hs.title}
                >
                  <span className="text-xs font-bold font-sans">✚</span>
                  <div className="absolute hidden group-hover/hs:flex flex-col bottom-8 right-0 w-44 p-2 bg-slate-900/95 backdrop-blur-md rounded-xl text-white text-xs shadow-2xl border border-amber-500/40 z-50 pointer-events-none text-right font-sans">
                    <span className="font-bold text-amber-400">{hs.title}</span>
                    {hs.price && <span className="text-amber-300 font-extrabold text-[11px] mt-0.5">{hs.price}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Right Page - Rendered ONLY on Desktop Spreads */}
          {!isMobile && rightPageObj && (
            <div className="relative flex-1 w-full h-full max-h-[78vh] flex items-center justify-center bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden group">
              <img
                src={rightPageObj.imageUrl}
                alt={`برگه ${currentPage + 2}`}
                className="max-h-[74vh] max-w-full object-contain rounded-xl select-none"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-3 right-4 bg-slate-950/80 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-amber-500/30">
                برگه {currentPage + 2}
              </span>

              {/* Hotspots Overlay for Right Page */}
              {rightPageObj.hotspots?.map((hs) => (
                <button
                  key={hs.id}
                  onClick={() => setSelectedHotspot(hs)}
                  style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 group/hs flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-950 shadow-lg border-2 border-white hover:scale-125 transition-transform cursor-pointer animate-pulse"
                  title={hs.title}
                >
                  <span className="text-xs font-bold font-sans">✚</span>
                  <div className="absolute hidden group-hover/hs:flex flex-col bottom-8 right-0 w-44 p-2 bg-slate-900/95 backdrop-blur-md rounded-xl text-white text-xs shadow-2xl border border-amber-500/40 z-50 pointer-events-none text-right font-sans">
                    <span className="font-bold text-amber-400">{hs.title}</span>
                    {hs.price && <span className="text-amber-300 font-extrabold text-[11px] mt-0.5">{hs.price}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Previous / Next Floating Navigation Arrows */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 0}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-4 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white border border-slate-700 shadow-2xl disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 backdrop-blur-md z-30"
          title="صفحه قبلی"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <button
          onClick={handleNextPage}
          disabled={currentPage + pageStep >= totalPages}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-4 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white border border-slate-700 shadow-2xl disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 backdrop-blur-md z-30"
          title="صفحه بعدی"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* AI Assistant Side Drawer */}
        <AICatalogAssistant
          catalog={catalog}
          currentPage={currentPage}
          isOpen={isAiAssistantOpen}
          onClose={() => setIsAiAssistantOpen(false)}
        />
      </div>

      {/* 3. BOTTOM CONTROLS & THUMBNAIL DRAWER */}
      <div className={`p-3 border-t z-20 backdrop-blur-md flex flex-col gap-2 ${isNightMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}>
        
        {/* Thumbnail Preview Bar (Collapsible) */}
        {showThumbnails && (
          <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 px-2 scrollbar-thin scrollbar-thumb-amber-500">
            {catalog.pages.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentPage(isMobile ? idx : (idx % 2 === 0 ? idx : idx - 1));
                  setZoomLevel(1);
                }}
                className={`flex-shrink-0 w-16 h-22 rounded-lg overflow-hidden border-2 bg-slate-950 transition-all relative group flex items-center justify-center p-0.5 ${
                  currentPage === idx || (!isMobile && currentPage + 1 === idx)
                    ? 'border-amber-500 scale-105 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400'
                    : 'border-slate-700 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={p.thumbnailUrl || p.imageUrl} alt={`Page ${idx + 1}`} className="max-w-full max-h-full object-contain rounded" referrerPolicy="no-referrer" />
                <span className="absolute bottom-1 right-1 text-[9px] bg-slate-950/90 text-white px-1.5 py-0.5 rounded font-bold">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-amber-400 transition-colors"
            >
              <Grid className="w-4 h-4" />
              <span>{showThumbnails ? 'بستن پیش‌نمایش برگه ها' : 'مشاهده همه برگه ها'}</span>
            </button>

            {/* Mobile Auto-play Toggle Button */}
            <button
              onClick={() => setIsAutoFlipping(!isAutoFlipping)}
              className={`lg:hidden flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                isAutoFlipping 
                  ? 'bg-emerald-500 text-slate-950 shadow-md animate-pulse' 
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {isAutoFlipping ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{isAutoFlipping ? 'خودکار' : 'ورق زدن خودکار'}</span>
            </button>
          </div>

          {/* Spread Progress Indicator & Speed Controls */}
          <div className="flex items-center gap-3">
            {isAutoFlipping && (
              <div className="flex items-center gap-1 bg-slate-950/60 px-2 py-1 rounded-lg border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                <span>سرعت:</span>
                {[3, 5, 8].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setAutoFlipIntervalSec(sec)}
                    className={`px-1.5 py-0.5 rounded ${autoFlipIntervalSec === sec ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    {sec}ث
                  </button>
                ))}
              </div>
            )}

            <span className="text-xs font-bold text-amber-400 font-sans">
              {isMobile 
                ? `برگه ${currentPage + 1} از ${totalPages}`
                : `برگه ${currentPage + 1} - ${Math.min(currentPage + 2, totalPages)} از ${totalPages}`}
            </span>

            {/* Pagination Slider bar */}
            <input
              type="range"
              min={0}
              max={Math.max(0, totalPages - pageStep)}
              step={pageStep}
              value={currentPage}
              onChange={(e) => {
                setCurrentPage(Number(e.target.value));
                setZoomLevel(1);
              }}
              className="w-24 sm:w-56 accent-amber-500 cursor-pointer"
            />
          </div>

          <a
            href="https://wa.me/989120000000?text=%D8%B3%D9%84%D8%A7%D9%85%20%D8%A7%D8%B3%D8%AA%D8%B9%D9%84%D8%A7%D9%85%20%D9%82%DB%8C%D9%85%D8%AA%20%DA%A9%D8%A7%D8%AA%D8%A7%D9%84%D9%88%DA%AF"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            استعلام قیمت ساخت کاتالوگ
          </a>
        </div>
      </div>

      {/* 4. HOTSPOT DETAIL POPUP MODAL */}
      {selectedHotspot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 text-white shadow-2xl relative font-sans">
            <button
              onClick={() => setSelectedHotspot(null)}
              className="absolute top-4 left-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-amber-400">{selectedHotspot.title}</h3>
                {selectedHotspot.subtitle && <p className="text-xs text-slate-400">{selectedHotspot.subtitle}</p>}
              </div>
            </div>

            {selectedHotspot.price && (
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 mb-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">قیمت و شرایط سفارش:</span>
                <span className="font-extrabold text-amber-300 text-sm">{selectedHotspot.price}</span>
              </div>
            )}

            {selectedHotspot.description && (
              <p className="text-xs text-slate-300 leading-relaxed mb-6 bg-slate-950/50 p-3 rounded-xl">
                {selectedHotspot.description}
              </p>
            )}

            <div className="flex items-center gap-3">
              <a
                href={`https://wa.me/989120000000?text=${encodeURIComponent(`سلام، استعلام قیمت محصول ${selectedHotspot.title}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs shadow-lg shadow-emerald-500/20"
              >
                <MessageSquare className="w-4 h-4" />
                استعلام قیمت واتساپ
              </a>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
