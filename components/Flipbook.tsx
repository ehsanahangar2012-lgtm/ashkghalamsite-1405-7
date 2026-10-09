import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';
import { 
  BookOpen, Maximize, RefreshCw, Upload, Sparkles, FolderPlus,
  ChevronRight, ChevronLeft, Volume2, VolumeX, Eye, Play, Pause, 
  HelpCircle, Trash2, ArrowLeft, Layers, CheckCircle, Search, 
  ZoomIn, ZoomOut, RotateCcw, FileText, Loader2, Info
} from 'lucide-react';
import { MediaItem } from '../types';
import { WebGLPageFlip } from './WebGLPageFlip';
import { prefetchAndCache, getCachedPageUrl, prefetchCatalogPages, pageImageCache } from '../utils/imageCache';

interface FlipbookProps {
  items: MediaItem[];
}

// ────────────── INTERSECTION OBSERVER PAGE SENTINEL FOR PRELOADING ──────────────
interface PagePreloadSentinelProps {
  url: string;
  onVisible: () => void;
}

const PagePreloadSentinel: React.FC<PagePreloadSentinelProps> = ({ url, onVisible }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!url) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          onVisible();
        }
      });
    }, { rootMargin: '600px' }); // Trigger ahead by 600px viewport margin

    const el = elementRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) {
        try {
          observer.unobserve(el);
        } catch (_) {}
      }
      observer.disconnect();
    };
  }, [url, onVisible]);

  return <div ref={elementRef} className="w-1.5 h-1.5 absolute opacity-0 pointer-events-none" style={{ left: 0, top: 0 }} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: BookshelfCover with Perspective Rotation & Dynamic Sheen Light
// ─────────────────────────────────────────────────────────────────────────────
interface BookshelfCoverProps {
  book: MediaItem;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  isCustom: boolean;
}

const BookshelfCover: React.FC<BookshelfCoverProps> = ({ book, onClick, onDelete, isCustom }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Framer Motion values for highly responsive mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const hoverActive = useMotionValue(0);

  // Springs for luxury organic momentum and material presence
  const springConfig = { damping: 20, stiffness: 180, mass: 0.4 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);
  const smoothHover = useSpring(hoverActive, { damping: 15, stiffness: 120 });

  // Transforms for Rotation, Elevation Depth and Alignment perspective on wood shelves
  const rotateX = useTransform(smoothY, (y) => y * -20);
  const rotateY = useTransform(smoothX, (x) => (x * 20) - 12); // Elegant -12deg bias for bookshelf depth layout
  const translateZ = useTransform(smoothHover, (h) => h * 22);

  // High-fidelity responsive material drop shadows
  const shadowX = useTransform(smoothX, (x) => -x * 12 + 4);
  const shadowY = useTransform(smoothY, (y) => -y * 12 + 10);
  const shadowBlur = useTransform(smoothHover, (h) => 15 + h * 15);
  const shadowOpacity = useTransform(smoothHover, (h) => 0.55 + h * 0.15);

  const shadowTemplate = useMotionTemplate`${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, ${shadowOpacity})`;

  // Specular light reflection glares coordinate mappings
  const lightX = useTransform(smoothX, (x) => 50 + x * 40);
  const lightY = useTransform(smoothY, (y) => 50 + y * 40);
  const sheenIntensity = useTransform(smoothHover, (h) => 0.12 + h * 0.5);
  const sheenBackground = useMotionTemplate`radial-gradient(circle 200px at ${lightX}% ${lightY}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 60%, rgba(0, 0, 0, 0.3) 100%)`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const halfWidth = rect.width / 2;
    const halfHeight = rect.height / 2;
    
    // Normalized ranges [-1.0, 1.0] from center axes
    const x = (e.clientX - rect.left - halfWidth) / halfWidth;
    const y = (e.clientY - rect.top - halfHeight) / halfHeight;

    mouseX.set(x);
    mouseY.set(y);
    hoverActive.set(1);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    hoverActive.set(0);
  };

  const totalPages = book.pages ? book.pages.length : 1;

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="group flex flex-col items-center cursor-pointer relative select-none w-36 md:w-44"
    >
      {/* 3D Viewport wrapper */}
      <div className="relative w-36 h-48 md:w-44 md:h-56 mb-5 [perspective:1200px]">
        {/* Dynamic Shadow & Transform sheet */}
        <motion.div 
          style={{ 
            rotateX,
            rotateY,
            z: translateZ,
            boxShadow: shadowTemplate,
            transformStyle: "preserve-3d"
          }}
          className="w-full h-full rounded-r-md rounded-l bg-slate-900 overflow-hidden relative border border-slate-850 origin-left transform-gpu"
        >
          {/* Cover book image */}
          <img 
            src={book.img} 
            alt={book.title} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 pointer-events-none" 
            referrerPolicy="no-referrer"
          />

          {/* Dynamic Specular lighting reflection sheen layer */}
          <motion.div 
            style={{
              background: sheenBackground,
              opacity: sheenIntensity
            }}
            className="absolute inset-0 pointer-events-none mix-blend-overlay"
          />

          {/* Elegant Cover Footer Banner */}
          <div className="absolute inset-x-2 bottom-3 p-2 bg-slate-950/90 backdrop-blur-md rounded border border-white/10 flex flex-col z-20">
            <span className="text-[10px] text-amber-400 font-extrabold truncate">{book.title}</span>
            <span className="text-[8px] text-slate-400 font-mono mt-0.5">{totalPages} صفحه</span>
          </div>

          {/* Page fold spline shadow simulation */}
          <div className="absolute right-0 inset-y-0 w-3 bg-gradient-to-l from-black/80 via-black/25 to-transparent pointer-events-none z-10" />
        </motion.div>

        {/* 3D Paper Pages Thickness layers behind page fold */}
        <div 
          className="absolute right-[-1px] top-[1%] h-[98%] w-[12px] bg-amber-50/95 border-r border-y border-slate-300 rounded-r shadow-inner origin-left scale-x-0 group-hover:scale-x-100 transition-all duration-300 pointer-events-none z-[-1]"
          style={{
            transform: 'rotateY(90deg)',
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 1px, #e2e8f0 1px, #e2e8f0 2px)'
          }}
        />

        {/* Outer shadow */}
        <div className="absolute -bottom-2.5 -left-1 w-[96%] h-2.5 bg-black/60 blur-xs rounded-full pointer-events-none" />
      </div>

      {/* Book description panel specs */}
      <div className="text-center w-full px-2 relative min-h-[48px]">
        <h3 className="text-xs md:text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors truncate">
          {book.title}
        </h3>
        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 leading-tight">{book.description}</p>
        
        {isCustom && onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            title="حذف کاتالوگ"
            className="absolute left-[-16px] top-1/2 -translate-y-1/2 p-1.5 text-rose-500/50 hover:text-rose-400 transition-colors bg-[#080c14]/80 hover:bg-rose-950/20 rounded-lg border border-transparent hover:border-rose-900/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Cache-Aware Lazy Loading Fading Page Frame with Light Sheen
// ─────────────────────────────────────────────────────────────────────────────
const loadedUrlsGlobal = new Set<string>();

interface FlipbookPageProps {
  url: string;
  pageNum: number;
}

const FlipbookPage: React.FC<FlipbookPageProps> = ({ url, pageNum }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => pageImageCache.get(url) || url);
  const [isLoaded, setIsLoaded] = useState(() => {
    if (pageImageCache.has(url)) return true;
    return loadedUrlsGlobal.has(url);
  });
  const [coords, setCoords] = useState({ x: 0, y: 0, hover: false });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    if (pageImageCache.has(url) || loadedUrlsGlobal.has(url)) {
      setResolvedUrl(pageImageCache.get(url) || url);
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);
    prefetchAndCache(url).then((cachedUrl) => {
      if (!active) return;
      setResolvedUrl(cachedUrl);
      
      const img = new Image();
      img.src = cachedUrl;
      img.onload = () => {
        if (active) {
          loadedUrlsGlobal.add(url);
          setIsLoaded(true);
        }
      };
    });
    
    return () => {
      active = false;
    };
  }, [url]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (pageNum !== 1 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      hover: true
    });
  };

  const handleMouseLeave = () => {
    if (pageNum !== 1) return;
    setCoords(prev => ({ ...prev, hover: false }));
  };

  // Dynamic calculations for Cover spotlight if pageNum === 1
  const widthVal = containerRef.current?.clientWidth || 250;
  const heightVal = containerRef.current?.clientHeight || 350;
  const lightX = coords.hover ? (coords.x / widthVal) * 100 : 50;
  const lightY = coords.hover ? (coords.y / heightVal) * 100 : 50;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full relative flex items-center justify-center bg-[#faf9f6] select-none overflow-hidden"
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#faf9f6]/95 z-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="text-[10px] text-slate-400 font-mono mt-2 flex items-center gap-1.5 direction-rtl">
            بارگذاری صفحه {pageNum}...
          </span>
        </div>
      )}
      <motion.img 
        src={resolvedUrl} 
        alt={`Page ${pageNum}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.35 }}
        className="w-full h-full object-cover pointer-events-none"
        referrerPolicy="no-referrer"
      />

      {/* Realistic Dynamic Lighting spotlight sheen layer for Slide Cover (Page 1) */}
      {pageNum === 1 && (
        <div 
          className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-300"
          style={{
            background: coords.hover 
              ? `radial-gradient(circle 240px at ${lightX}% ${lightY}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 75%), 
                 linear-gradient(${180 - Math.atan2(coords.y - (heightVal / 2), coords.x - (widthVal / 2)) * (180 / Math.PI)}deg, rgba(0,0,0,0.18) 0%, transparent 60%)`
              : 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)',
            opacity: coords.hover ? 1 : 0.4
          }}
        />
      )}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORTED COMPONENT: Elegant Advanced Catalog (Flipbook)
// ─────────────────────────────────────────────────────────────────────────────
export const Flipbook: React.FC<FlipbookProps> = ({ items: initialItems }) => {
  const [catalogs, setCatalogs] = useState<MediaItem[]>([]);
  const [selectedBook, setSelectedBook] = useState<MediaItem | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // PHYSICAL BOOK STRUCTURE CALCULATOR: Covers & Spreads Layout Mapping
  // ─────────────────────────────────────────────────────────────────────────────
  interface BookSpread {
    left: string | null;
    right: string | null;
    leftPageNum: number | null;
    rightPageNum: number | null;
  }

  const spreads = React.useMemo<BookSpread[]>(() => {
    if (!selectedBook) return [];
    const list: BookSpread[] = [];

    // 1. FRONT COVER (First page, displayed alone on the right half)
    const coverUrl = selectedBook.coverImg || selectedBook.img || '';
    list.push({
      left: null,
      right: coverUrl,
      leftPageNum: null,
      rightPageNum: 1
    });

    // 2. INSIDE DOUBLE-PAGED SPREADS 
    const inside = selectedBook.pages || [];
    let pageNum = 2;
    for (let i = 0; i < inside.length; i += 2) {
      const leftPage = inside[i] || null;
      const rightPage = inside[i + 1] || null;

      // Swap standard pagination if backCoverImg is ready
      if (i + 1 >= inside.length && selectedBook.backCoverImg) {
        list.push({
          left: leftPage,
          right: selectedBook.backCoverImg,
          leftPageNum: pageNum,
          rightPageNum: pageNum + 1
        });
        pageNum += 2;
      } else {
        list.push({
          left: leftPage,
          right: rightPage,
          leftPageNum: leftPage ? pageNum : null,
          rightPageNum: rightPage ? pageNum + 1 : null
        });
        pageNum += 2;
      }
    }

    // 3. BACK COVER (Last page, displayed alone on the left half)
    const lastSpread = list[list.length - 1];
    if (lastSpread && lastSpread.right && lastSpread.right !== selectedBook.backCoverImg && selectedBook.backCoverImg) {
      list.push({
        left: selectedBook.backCoverImg,
        right: null,
        leftPageNum: pageNum,
        rightPageNum: null
      });
    } else if (!selectedBook.backCoverImg && lastSpread && lastSpread.right) {
      // Noble fallback illustration for back catalog cover
      list.push({
        left: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=600',
        right: null,
        leftPageNum: pageNum,
        rightPageNum: null
      });
    }

    return list;
  }, [selectedBook]);
  
  // Reading & flipping page spreadsheet controls
  const [currentPage, setCurrentPage] = useState<number>(0); 
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipDir, setFlipDir] = useState<'next' | 'prev' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // Page swipe/drag state with custom spring physics
  const isDraggingPageRef = useRef<boolean>(false);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPage, setIsDraggingPage] = useState<boolean>(false);
  const [dragProgress, setDragProgress] = useState<number>(0); // 0 to 1.0
  const [interactiveFlipDir, setInteractiveFlipDir] = useState<'next' | 'prev' | null>(null);

  // Measure book size & dark mode
  const bookChassisRef = useRef<HTMLDivElement>(null);
  const [chassisSize, setChassisSize] = useState({ width: 800, height: 567 });

  useEffect(() => {
    if (!bookChassisRef.current) return;
    const el = bookChassisRef.current;
    const updateSize = () => {
      setChassisSize({
        width: el.clientWidth || 800,
        height: el.clientHeight || 567
      });
    };
    updateSize();
    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [selectedBook]);

  // Zoom scale capabilities
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  // Multi-upload state supporting images AND PDF
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [uploadedPages, setUploadedPages] = useState<string[]>([]);
  
  // AI generative cover states
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isGeneratingBackCover, setIsGeneratingBackCover] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [uploadedTexts, setUploadedTexts] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState('');

  // Client PDF validation, Metadata analysis, & cover generation states
  const [pdfMeta, setPdfMeta] = useState<{ name: string; size: string; pagesCount: number } | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);

  // PDF processing loaders
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Searching keys
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ pageIndex: number; pageNumber: number; sampleText: string }[]>([]);
  const [isSearchingOpen, setIsSearchingOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);

  // Slide speeds calculation tracers
  const lastSliderTime = useRef<number>(0);
  const lastSliderPage = useRef<number>(0);

  // Load PDF.js script dynamically from a public CDN
  useEffect(() => {
    if (!(window as any).pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        if (pdfjs) {
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  // Fetch catalogs from initial + localStorage + applied AI covers
  useEffect(() => {
    const cached = localStorage.getItem('ashk_custom_catalogs_v2');
    const customList = cached ? JSON.parse(cached) : [];
    
    const cachedAiCovers = localStorage.getItem('ashk_ai_covers_v2');
    const aiCovers = cachedAiCovers ? JSON.parse(cachedAiCovers) : {};

    const combined = [...initialItems, ...customList].map(book => {
      if (aiCovers[book.id]) {
        return {
          ...book,
          coverImg: aiCovers[book.id].coverImg || book.coverImg,
          backCoverImg: aiCovers[book.id].backCoverImg || book.backCoverImg
        };
      }
      return book;
    });

    setCatalogs(combined);
    
    // Auto-select the first book on load to ensure the 3D WebGL page turn slider displays actively by default
    if (!selectedBook && combined.length > 0) {
      setSelectedBook(combined[0]);
      setIsAutoPlaying(true);
    }
  }, [initialItems]);

  // Autoplay cycle
  useEffect(() => {
    if (isAutoPlaying && selectedBook) {
      const pagesCount = selectedBook.pages ? selectedBook.pages.length : 1;
      const totalSpreadSheets = Math.ceil(pagesCount / 2);
      const isEnded = currentPage >= totalSpreadSheets - 1;
      
      autoPlayTimer.current = setTimeout(() => {
        if (isEnded) {
          setCurrentPage(0);
        } else {
          handleNextPage();
        }
      }, 4500);
    } else {
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    }
    return () => {
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    };
  }, [isAutoPlaying, currentPage, selectedBook]);

  // ────────────── ACTIVE CATALOG PROACTIVE PRELOADING SYSTEM ──────────────
  useEffect(() => {
    if (spreads.length === 0) return;
    
    // Preload current spread and adjacent spreads recursively to eliminate turn lag
    const spreadsToPreload = [
      currentPage,
      currentPage - 1,
      currentPage + 1,
      currentPage + 2
    ];

    spreadsToPreload.forEach(spreadIdx => {
      if (spreadIdx >= 0 && spreadIdx < spreads.length) {
        const spr = spreads[spreadIdx];
        if (spr.left) {
          prefetchAndCache(spr.left).catch(() => {});
        }
        if (spr.right) {
          prefetchAndCache(spr.right).catch(() => {});
        }
      }
    });
  }, [currentPage, spreads]);

  // Web Audio page turn synthesizer with variable dynamic parameters based on speed
  const playPageTurnSound = (speedFactor: number = 1.0) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Speed factor determines duration (faster sweeps are shorter)
      const duration = Math.min(Math.max(0.6 / speedFactor, 0.16), 1.2);
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      let lastValue = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = 0.73 * lastValue + 0.27 * white; // Smooth lowpass warmth filter
        lastValue = data[i];
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      
      // Dynamic frequency sweep limits based on mechanical turn speed
      const startFreq = 420 * speedFactor;
      const peakFreq = 1650 * speedFactor;
      const endFreq = 260 / speedFactor;
      
      bpf.Q.setValueAtTime(3.0, ctx.currentTime);
      bpf.frequency.setValueAtTime(startFreq, ctx.currentTime);
      bpf.frequency.exponentialRampToValueAtTime(Math.min(peakFreq, 4000), ctx.currentTime + (duration * 0.25));
      bpf.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 120), ctx.currentTime + duration);
      
      const gainNode = ctx.createGain();
      
      // Volume scales naturally with turning speed (up to safe constraints)
      const volumeLimit = Math.min(Math.max(0.12 * speedFactor, 0.04), 0.4);
      
      gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volumeLimit, ctx.currentTime + (duration * 0.15));
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      noise.connect(bpf);
      bpf.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      noise.start();
    } catch (e) {
      console.warn("Could not fire synthesized page sound: ", e);
    }
  };

  const handleNextPage = () => {
    if (!selectedBook || spreads.length === 0) return;
    if (currentPage < spreads.length - 1 && !isFlipping) {
      setIsFlipping(true);
      setFlipDir('next');
      setDragProgress(0);
      playPageTurnSound(1.2); // Normal mechanical trigger speed

      const startTime = performance.now();
      const duration = 550;
      const animateProgress = (now: number) => {
        const elapsed = now - startTime;
        const rawPct = Math.min(elapsed / duration, 1.0);
        // Soft cubic ease-in-out transition curve for natural page weight acceleration
        const progress = 3 * rawPct * rawPct - 2 * rawPct * rawPct * rawPct;
        setDragProgress(progress);
        if (elapsed < duration) {
          requestAnimationFrame(animateProgress);
        }
      };
      requestAnimationFrame(animateProgress);

      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsFlipping(false);
        setFlipDir(null);
        setDragProgress(0);
      }, 550);
    }
  };

  const handlePrevPage = () => {
    if (!selectedBook || spreads.length === 0) return;
    if (currentPage > 0 && !isFlipping) {
      setIsFlipping(true);
      setFlipDir('prev');
      setDragProgress(0);
      playPageTurnSound(1.2);

      const startTime = performance.now();
      const duration = 550;
      const animateProgress = (now: number) => {
        const elapsed = now - startTime;
        const rawPct = Math.min(elapsed / duration, 1.0);
        // Soft cubic ease-in-out transition curve for natural page weight acceleration
        const progress = 3 * rawPct * rawPct - 2 * rawPct * rawPct * rawPct;
        setDragProgress(progress);
        if (elapsed < duration) {
          requestAnimationFrame(animateProgress);
        }
      };
      requestAnimationFrame(animateProgress);

      setTimeout(() => {
        setCurrentPage(prev => prev - 1);
        setIsFlipping(false);
        setFlipDir(null);
        setDragProgress(0);
      }, 550);
    }
  };

  // Pointer-down handler in 3D book chassis to detect click vs drag
  const handleBookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If zoomed in or already flipping, do not intercept slide drag
    if (zoomScale > 1.0 || isFlipping || !selectedBook || spreads.length === 0) return;
    
    // Discard non-left button mouse clicks
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const xRelative = e.clientX - rect.left;
    const width = rect.width;

    // Filter margin trigger targets:
    // Right 48% and Left 48%
    if (xRelative > width * 0.52) {
      // Right page click-drag start -> Next spread logic
      if (currentPage < spreads.length - 1) {
        isDraggingPageRef.current = true;
        setIsDraggingPage(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        setInteractiveFlipDir('next');
        setIsFlipping(true);
        setFlipDir('next');
        setDragProgress(0);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    } else if (xRelative < width * 0.48) {
      // Left page click-drag start -> Previous spread logic
      if (currentPage > 0) {
        isDraggingPageRef.current = true;
        setIsDraggingPage(true);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        setInteractiveFlipDir('prev');
        setIsFlipping(true);
        setFlipDir('prev');
        setDragProgress(0);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    }
  };

  // Pointer-move handler for smooth, real-time responsive flipping page tracking
  const handleBookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPageRef.current || !interactiveFlipDir || !selectedBook) return;

    const rect = e.currentTarget.getBoundingClientRect();
    // Use half width to calculate horizontal turn coverage
    const halfWidth = rect.width / 2 || 400;
    const dx = e.clientX - dragStartPos.current.x;

    if (interactiveFlipDir === 'next') {
      // Swipe leftwards triggers next fold -> negative dx
      const rawPct = -dx / halfWidth;
      const pct = Math.min(Math.max(rawPct, 0), 1.0);
      setDragProgress(pct);
    } else if (interactiveFlipDir === 'prev') {
      // Swipe rightwards triggers prev fold -> positive dx
      const rawPct = dx / halfWidth;
      const pct = Math.min(Math.max(rawPct, 0), 1.0);
      setDragProgress(pct);
    }
  };

  // Pointer-up/end handler that calculates final velocity or percentage coverage to snap/return with spring physics
  const handleBookPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPageRef.current) return;
    isDraggingPageRef.current = false;
    setIsDraggingPage(false);
    
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const dy = e.clientY - dragStartPos.current.y;
    const distanceX = e.clientX - dragStartPos.current.x;
    const totalDistance = Math.sqrt(distanceX * distanceX + dy * dy);

    // Tap fallback: If user performed an extremely tiny touch, treat it as a crisp default click!
    if (totalDistance < 8) {
      // Tiny touch, cancel interactive mode but complete full page turn!
      setInteractiveFlipDir(null);
      playPageTurnSound(1.2);

      setTimeout(() => {
        if (flipDir === 'next') {
          setCurrentPage(prev => prev + 1);
        } else if (flipDir === 'prev') {
          setCurrentPage(prev => prev - 1);
        }
        setIsFlipping(false);
        setFlipDir(null);
        setDragProgress(0);
      }, 550);
      return;
    }

    // Drag release threshold
    if (dragProgress >= 0.35) {
      // COMMIT WORKPAPER TURN SPREAD
      setInteractiveFlipDir(null); // release interactive tracking, trigger Framer Motion swing
      setDragProgress(1.0);
      playPageTurnSound(1.45); // heavy weight swing sound

      setTimeout(() => {
        if (flipDir === 'next') {
          setCurrentPage(prev => prev + 1);
        } else if (flipDir === 'prev') {
          setCurrentPage(prev => prev - 1);
        }
        setIsFlipping(false);
        setFlipDir(null);
        setDragProgress(0);
      }, 600);
    } else {
      // REJECTED AND NATURAL SPRING BACK RETURN
      setInteractiveFlipDir(null);
      setDragProgress(0);
      playPageTurnSound(0.68); // lightweight spring wobble

      setTimeout(() => {
        setIsFlipping(false);
        setFlipDir(null);
        setDragProgress(0);
      }, 600);
    }
  };

  // Open & setup book
  const selectBookToRead = (book: MediaItem) => {
    const initializedBook = {
      ...book,
      pages: book.pages && book.pages.length > 0 ? book.pages : [book.img, book.img]
    };
    setSelectedBook(initializedBook);
    setCurrentPage(0);
    setZoomScale(1.0);
    setIsAutoPlaying(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchingOpen(false);
  };

  // Keyword Text Searching Logic
  const handleTextSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !selectedBook || !selectedBook.texts) {
      setSearchResults([]);
      return;
    }
    
    const results: any[] = [];
    selectedBook.texts.forEach((text, i) => {
      const canonicalQuery = query.toLowerCase().trim();
      const canonicalText = text.toLowerCase();
      
      if (canonicalText.includes(canonicalQuery)) {
        const matchIdx = canonicalText.indexOf(canonicalQuery);
        const start = Math.max(0, matchIdx - 30);
        const end = Math.min(text.length, matchIdx + query.length + 30);
        const snippet = "..." + text.substring(start, end).replace(/\s+/g, ' ') + "...";
        
        results.push({
          pageIndex: Math.floor(i / 2),
          actualPageIndex: i,
          pageNumber: i + 1,
          sampleText: snippet
        });
      }
    });
    setSearchResults(results);
  };

  // Pre-validate selected PDF, parse metadata & generate visual client cover preview
  const validateAndGeneratePdfPreview = async (file: File): Promise<boolean> => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus("در حال اعتبارسنجی ساختار فایل PDF...");
    setUploadError("");
    setPdfPreview(null);
    setPdfMeta(null);
    setPendingPdfFile(null);

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error("پلاگین خوانش PDF در مروگر لود نشده است. لطفاً چند لحظه شکیبا باشید.");
      }

      // Check file buffer
      const fileBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) }).promise;
      
      const numPages = pdf.numPages;
      if (numPages === 0) {
        throw new Error("سند PDF انتخابی کاملاً تهی یا فاقد صفحه است.");
      }

      // Read file metadata
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setPdfMeta({
        name: file.name,
        size: `${fileSizeMB} MB`,
        pagesCount: numPages
      });

      // Quick offline canvas render of first page as cover preview
      setProcessingStatus("در حال تولید پیش‌نمایش گرافیکی جلد کاتالوگ...");
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.6 }); // rapid thumbnail low-res canvas
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;
      }

      const coverDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPdfPreview(coverDataUrl);
      
      // Save valid reference for upload pipeline
      setPendingPdfFile(file);
      
      setProcessingStatus("فایل PDF معتبر شناخته شد. حال می‌توانید آن را به سرور منتقل نمایید.");
      setProcessingProgress(100);
      return true;
    } catch (err: any) {
      console.error(err);
      setUploadError("خطای اعتبارسنجی سند: " + (err.message || "قالب PDF خوانا نیست یا رمزگذاری شده است."));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Multipart File Selector handling
  const handleUploadedFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    const pdfFile = fileList.find(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));

    if (pdfFile) {
      // Validate first and show offline cover
      await validateAndGeneratePdfPreview(pdfFile);
    } else {
      // Standard direct bulk upload for photos
      await runImagesBulkUpload(fileList);
    }
  };

  // Bulk images sequential upload
  const runImagesBulkUpload = async (files: File[]) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus("آغاز فرآیند انتقال تصاویر به سرور...");
    setUploadError("");

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingStatus(`در حال بارگذاری صفحه ${i + 1} از ${files.length}...`);
        
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`مشکل شبکه یا دسترسی در کپی فایل تصویر ${file.name}`);
        }

        const data = await response.json();
        uploadedUrls.push(data.url);
        setProcessingProgress(Math.round(((i + 1) / files.length) * 100));
      }

      setUploadedPages(prev => [...prev, ...uploadedUrls]);
      const fallbackTexts = uploadedUrls.map((_, i) => `تصویر محتوای صفحه ${i + 1}`);
      setUploadedTexts(prev => [...prev, ...fallbackTexts]);

      setProcessingProgress(100);
      setProcessingStatus("آپلود تمامی تصاویر با موفقیت تکمیل شد.");
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "خطا در فرآیند بارگذاری تصاویر.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Full conversion of PDF pages & uploading each page
  const runPdfConversion = async (pdfFile: File) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus("آماده‌سازی پردازش سنگین موتور کلاینت...");
    setUploadError("");

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error("موتور خوانش PDF در دسترس نیست.");
      }

      const fileBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) }).promise;
      const numPages = pdf.numPages;

      if (numPages === 0) {
        throw new Error("سند PDF فاقد صفحه است.");
      }

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      const finalPages: string[] = [];
      const extractedTexts: string[] = [];

      for (let pIdx = 1; pIdx <= numPages; pIdx++) {
        setProcessingStatus(`در حال تبدیل و بهینه‌سازی لایه‌های برگه ${pIdx} از ${numPages}...`);
        setProcessingProgress(Math.round(((pIdx - 1) / numPages) * 100));

        const page = await pdf.getPage(pIdx);
        // Standard vertical output resolution viewports
        const viewPort = page.getViewport({ scale: 1.5 });

        tempCanvas.width = viewPort.width;
        tempCanvas.height = viewPort.height;

        if (tempCtx) {
          tempCtx.fillStyle = '#FFFFFF';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          await page.render({
            canvasContext: tempCtx,
            viewport: viewPort
          }).promise;
        }

        // Extracted texts details for offline search queries
        const textBundle = await page.getTextContent();
        const fulltext = textBundle.items.map((it: any) => it.str).join(' ');
        extractedTexts.push(fulltext);

        // Convert page frame to Blob JPEG
        const canvasBlob = await new Promise<Blob | null>((resolve) => {
          tempCanvas.toBlob(b => resolve(b), 'image/jpeg', 0.86);
        });

        if (!canvasBlob) {
          throw new Error(`خطای اختصاصی پیکسل‌ها در صفحه ${pIdx}`);
        }

        const compiledFile = new File([canvasBlob], `pdf-page-${pIdx}.jpg`, { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('image', compiledFile);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`بارگذاری سمت وب سرور با شکست مواجه شد در صفحه ${pIdx}`);
        }

        const callbackData = await response.json();
        finalPages.push(callbackData.url);
      }

      setUploadedPages(prev => [...prev, ...finalPages]);
      setUploadedTexts(prev => [...prev, ...extractedTexts]);
      setProcessingProgress(100);
      setProcessingStatus("پردازش و بارگذاری صفحات PDF با موفقیت پایان یافت.");
      setPendingPdfFile(null); // Clear pending reference
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "بارگذاری و رندر صفحات PDF با شکست روبرو شد.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct save of custom media catalog
  const handleConfirmCatalog = () => {
    if (!newTitle.trim()) {
      setUploadError('نام کاتالوگ را وارد نمایید.');
      return;
    }
    if (uploadedPages.length === 0) {
      setUploadError('ورق و فایلی جهت ثبت ساختار کاتالوگ آپلود نشده است.');
      return;
    }

    const customMediaBook: MediaItem = {
      id: Date.now(),
      title: newTitle,
      description: newDesc || "کاتالوگ شخصی تولید و توسعه داده شده اختصاصی",
      img: uploadedPages[0], // First paper page as cover image
      category: 'افزوده شده شخصی',
      pages: uploadedPages,
      texts: uploadedTexts
    };

    const cached = localStorage.getItem('ashk_custom_catalogs_v2');
    const customList = cached ? JSON.parse(cached) : [];
    const updatedCustoms = [customMediaBook, ...customList];
    localStorage.setItem('ashk_custom_catalogs_v2', JSON.stringify(updatedCustoms));

    // Update list states
    setCatalogs(prev => [customMediaBook, ...prev]);
    setIsUploadOpen(false);

    // Reset modals configs
    setNewTitle('');
    setNewDesc('');
    setUploadedPages([]);
    setUploadedTexts([]);
    setUploadError('');
    setPdfPreview(null);
    setPdfMeta(null);
    setPendingPdfFile(null);

    // Active directly on book view
    selectBookToRead(customMediaBook);
  };

  const handleDeleteBook = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCustom = catalogs.some(c => c.id === id && c.category === 'افزوده شده شخصی');
    if (!isCustom) return;

    if (confirm('آیا تایید می‌فرمایید این کاتالوگ شخصی به کلی پاک گردد؟')) {
      const cached = localStorage.getItem('ashk_custom_catalogs_v2');
      const customList = cached ? JSON.parse(cached) : [];
      const updatedCustoms = customList.filter((c: any) => c.id !== id);
      localStorage.setItem('ashk_custom_catalogs_v2', JSON.stringify(updatedCustoms));

      setCatalogs(prev => prev.filter(b => b.id !== id));
      if (selectedBook && selectedBook.id === id) {
        setSelectedBook(null);
      }
    }
  };

  const handleGenerateCover = async (type: 'cover' | 'back') => {
    if (!selectedBook) return;
    
    if (type === 'cover') {
      setIsGeneratingCover(true);
    } else {
      setIsGeneratingBackCover(true);
    }
    setGenerationError('');

    try {
      const response = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedBook.title,
          category: selectedBook.category || "Packaging",
          type: type
        })
      });

      if (!response.ok) {
        throw new Error("خطا در پاسخ‌دهی سرور موتور هوش مصنوعی.");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "تولید تصویر با شکست مواجه شد.");
      }

      // Update cached covers index
      const cachedAiCovers = localStorage.getItem('ashk_ai_covers_v2');
      const aiCovers = cachedAiCovers ? JSON.parse(cachedAiCovers) : {};
      
      if (!aiCovers[selectedBook.id]) {
        aiCovers[selectedBook.id] = {};
      }

      if (type === 'cover') {
        aiCovers[selectedBook.id].coverImg = data.url;
      } else {
        aiCovers[selectedBook.id].backCoverImg = data.url;
      }

      localStorage.setItem('ashk_ai_covers_v2', JSON.stringify(aiCovers));

      // Instantly update catalog lists
      setCatalogs(prev => prev.map(book => {
        if (book.id === selectedBook.id) {
          const updatedBook = {
            ...book,
            coverImg: type === 'cover' ? data.url : book.coverImg,
            backCoverImg: type === 'back' ? data.url : book.backCoverImg
          };
          // Also reactive update SelectedBook itself
          setSelectedBook(updatedBook);
          return updatedBook;
        }
        return book;
      }));

    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'خطایی بی نام در ارتباط با مدل پردازش رخ داد.');
    } finally {
      if (type === 'cover') {
        setIsGeneratingCover(false);
      } else {
        setIsGeneratingBackCover(false);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="w-full min-h-[85vh] bg-[#070b13] py-12 px-4 md:px-8 relative overflow-hidden" dir="rtl" ref={containerRef}>
      
      {/* Background decoration spotlights */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-950/15 via-slate-900/5 to-transparent pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-slate-500/5 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* ────────────────── 1. BOOKSHELF LIBRARY PRESENTATION ────────────────── */}
      {!selectedBook ? (
        <div className="max-w-6xl mx-auto z-10 relative">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 pb-6 border-b border-slate-900">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <span className="text-amber-500 font-extrabold uppercase text-xs tracking-wider">نمای لوکس کاتالوگ k-BOOK</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-normal">آلبوم نمونه کار و کاتـالوگ‌های دیجیتال</h1>
              <p className="text-sm text-slate-400 mt-2">کاتالوگ‌های قالب، جعبه‌سازی و ساختار‌های بسته‌بندی را با ورق‌زدن فیزیکی دقیق بازبینی کنید و لذت ببرید.</p>
            </div>
            </div>

          {/* Elegant Showcase Bookshelf Grid */}
          <div className="w-full bg-[#111624]/60 border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative">
            
            {/* Shelf Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-8 gap-y-16">
              {catalogs.map((book) => {
                const isCustom = book.category === 'افزوده شده شخصی';
                return (
                  <BookshelfCover 
                    key={book.id}
                    book={book} 
                    onClick={() => selectBookToRead(book)} 
                    onDelete={(e) => handleDeleteBook(book.id, e)}
                    isCustom={isCustom}
                  />
                );
              })}
            </div>

            {/* Simulated Wood Shelving Base */}
            <div className="w-full h-4 bg-gradient-to-b from-[#18110b] to-[#0a0705] border-t border-amber-950/70 rounded-full mt-10 shadow-xl relative flex items-center justify-center">
              <div className="absolute inset-x-8 -bottom-1 h-2 bg-[#301e12]/30 rounded-full blur-xs" />
            </div>
            
          </div>

        </div>
      ) : (
        /* ────────────────── 2. REALTIME DOUBLE-PAGE FLIPBOOK READER ────────────────── */
        <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Top controllers sticky panel */}
          <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedBook(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-amber-400 font-bold text-xs bg-[#121724] hover:bg-[#182035] border border-slate-800 hover:border-amber-500/30 px-4 py-2.5 rounded-xl transition-all shadow group"
              >
                <ArrowLeft className="w-4 h-4 text-amber-500 group-hover:-translate-x-1 transition-transform" />
                <span>بازگشت به کتابخانه</span>
              </button>

              {/* Sound, Autoplay, Fullscreen configurations */}
              <div className="flex items-center bg-slate-900/90 rounded-xl px-3 py-1.5 border border-slate-850 gap-2.5 text-slate-400 text-xs shadow-md">
                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)} 
                  className={`p-1.5 rounded-lg hover:text-white transition-all ${soundEnabled ? 'text-amber-500 bg-amber-500/5 border border-amber-500/20' : 'text-slate-500 border border-transparent'}`}
                  title={soundEnabled ? "بی صدا کردن صدای ورق کاغذ" : "فعال کردن صدا"}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className={`p-1.5 rounded-lg hover:text-white transition-all ${isAutoPlaying ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-500'}`}
                  title={isAutoPlaying ? "توقف اسلاید شو خودکار" : "شروع اسلاید شو خودکار"}
                >
                  {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={toggleFullscreen} className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-all" title="تمام صفحه">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-center">
              <span className="text-[9px] text-amber-500 uppercase tracking-wider font-black flex items-center gap-1.5 justify-center">
                <Sparkles className="w-3.5 h-3.5 rotate-12" /> ورق زدن دو طرفه واقع گرایانه ۳ بعدی
              </span>
              <h2 className="text-base md:text-lg font-black text-white mt-0.5">{selectedBook.title}</h2>
            </div>

            {/* Keyword searching & zoom scales */}
            <div className="flex items-center gap-3">
              
              {selectedBook.texts && selectedBook.texts.length > 0 && (
                <button
                  onClick={() => setIsSearchingOpen(!isSearchingOpen)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all ${isSearchingOpen ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-lg shadow-amber-500/10' : 'bg-[#121724] text-slate-400 hover:text-white border-slate-800'}`}
                >
                  <Search className="w-4 h-4" />
                  <span>جستجو کلمات ({selectedBook.texts?.filter(t => t.length > 5).length || 0})</span>
                </button>
              )}

              {/* Dynamic Zoom Scale Controllers */}
              <div className="flex items-center bg-[#121724] border border-slate-850 rounded-xl p-1.5 text-slate-400 text-xs">
                <button 
                  onClick={() => setZoomScale(p => Math.min(p + 0.25, 3.0))}
                  className="p-1.5 bg-slate-900 hover:bg-amber-600 hover:text-white rounded-lg transition-colors"
                  title="بزرگنمایی"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="font-mono text-center w-12 text-[11px] text-slate-300">% {Math.round(zoomScale * 100)}</span>
                <button 
                  onClick={() => setZoomScale(p => Math.max(p - 0.25, 1.0))}
                  className="p-1.5 bg-slate-900 hover:bg-amber-600 hover:text-white rounded-lg transition-colors"
                  title="کوچکنمایی"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                {zoomScale > 1.0 && (
                  <button 
                    onClick={() => setZoomScale(1.0)}
                    className="p-1.5 ml-1 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/30 rounded-lg transition-colors"
                    title="ریست کردن مقدار زوم"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Active Search Dropdown panel */}
          {isSearchingOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xl bg-[#0f1424] border border-slate-800 rounded-3xl p-5 mb-6 shadow-2xl relative z-30"
            >
              <div className="flex items-center gap-3 bg-[#080b13] p-2.5 rounded-xl border border-slate-850 mb-3">
                <Search className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <input 
                  type="text"
                  placeholder="عبارت یا واژه ی مورد نظرتان را جستجو کنید (مثال: کارتن، جعبه، گلاسه...)"
                  value={searchQuery}
                  onChange={(e) => handleTextSearch(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder-slate-600 font-medium"
                />
              </div>

              {/* Filter lists */}
              {searchQuery.trim() ? (
                <div className="max-h-48 overflow-y-auto space-y-2 mt-1 scrollbar-thin">
                  {searchResults.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-4">هیچ عبارتی منطبق با واژه ی شما پیدا نشد.</p>
                  ) : (
                    searchResults.map((res, i) => (
                      <div 
                        key={i}
                        onClick={() => {
                          const targetSpread = spreads.findIndex(spr => 
                            spr.leftPageNum === res.pageNumber || spr.rightPageNum === res.pageNumber
                          );
                          if (targetSpread !== -1) {
                            setCurrentPage(targetSpread);
                          } else {
                            setCurrentPage(Math.floor(res.pageIndex / 2));
                          }
                          playPageTurnSound(1.6);
                        }}
                        className="p-2.5 bg-[#141b2e] hover:bg-[#1c2642] border border-slate-850 hover:border-amber-500/20 rounded-xl transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex flex-col flex-1 pl-4 text-right">
                          <span className="text-[10px] text-amber-400 font-extrabold mb-1">صفحه {res.pageNumber} کاتالوگ</span>
                          <span className="text-xs text-slate-400 line-clamp-1 font-medium">{res.sampleText}</span>
                        </div>
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded font-extrabold group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">پرش به صفحه</span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
                  <Info className="w-3.5 h-3.5 animate-bounce" /> عبارات مد نظر در لحظه فیلتر می‌گردند تا بتوانید مستقیم به صفحه هدف بروید.
                </p>
              )}
            </motion.div>
          )}

          {/* ────────────────── THE FLIPBOOK CANVAS & 3D BINDER ────────────────── */}
          <div className="w-full relative py-2 flex justify-center items-center overflow-hidden">
            
            {/* Background ambient light */}
            <div className="absolute w-[95%] max-w-5xl h-full bg-[#101422]/15 rounded-[4rem] blur-3xl opacity-50 pointer-events-none -z-10" />

            {/* Left mechanical trigger button */}
            <button 
              onClick={handlePrevPage}
              disabled={currentPage === 0 || isFlipping || zoomScale > 1.0}
              className="absolute left-1 md:left-6 z-40 p-3.5 rounded-full bg-[#141a2e]/95 h-12 w-12 flex items-center justify-center hover:bg-amber-600 text-white backdrop-blur-md shadow-lg transition-all border border-slate-800 disabled:opacity-0 disabled:pointer-events-none group"
            >
              <ChevronRight className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* 3D DOUBLE PAGE BOOK BINDER CHASSIS WITH SMOOTH SWIPE ACTION */}
            <div 
              ref={bookChassisRef}
              onPointerDown={handleBookPointerDown}
              onPointerMove={handleBookPointerMove}
              onPointerUp={handleBookPointerUp}
              onPointerCancel={handleBookPointerUp}
              className="w-full max-w-4xl aspect-[1.41] bg-gradient-to-br from-[#1b2238] to-[#111625] border-8 border-[#161d30] rounded-[24px] relative shadow-[0_50px_90px_-25px_rgba(0,0,0,0.85)] overflow-hidden flex [perspective:2400px] select-none touch-none"
              style={{ cursor: zoomScale > 1.0 ? 'grab' : isDraggingPage ? 'grabbing' : 'default' }}
            >
              <div className="absolute opacity-0 pointer-events-none w-1 h-1">
                {spreads && spreads.map((spr, sprIdx) => {
                  if (Math.abs(sprIdx - currentPage) <= 2) {
                    return (
                      <React.Fragment key={`sentinels-${sprIdx}`}>
                        {spr.left && <PagePreloadSentinel url={spr.left} onVisible={() => prefetchAndCache(spr.left!)} />}
                        {spr.right && <PagePreloadSentinel url={spr.right} onVisible={() => prefetchAndCache(spr.right!)} />}
                      </React.Fragment>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Dynamic Panning and Scale viewport drag block */}
              <motion.div 
                drag={zoomScale > 1.0}
                dragConstraints={{ 
                  left: -200 * (zoomScale - 1), 
                  right: 200 * (zoomScale - 1), 
                  top: -150 * (zoomScale - 1), 
                  bottom: 150 * (zoomScale - 1) 
                }}
                animate={{ scale: zoomScale }}
                transition={{ type: "spring", stiffness: 220, damping: 25 }}
                className="w-full h-full flex transform-gpu relative"
                style={{ transformOrigin: 'center center', transformStyle: 'preserve-3d' }}
              >
                
                {!isFlipping ? (
                  <>
                    {/* LEFT PAGE SPREAD SENSOR */}
                    <div className="w-[50.15%] h-full relative bg-[#faf9f6]/95 flex flex-col overflow-hidden">
                      {/* Spine inner page folding depth */}
                      <div className="absolute right-0 inset-y-0 w-5 bg-gradient-to-l from-black/18 via-black/4 to-transparent pointer-events-none z-10" />
                      
                      {spreads[currentPage]?.left ? (
                        <FlipbookPage url={spreads[currentPage].left!} pageNum={spreads[currentPage].leftPageNum || 0} />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#faf9f6]/95 p-8 select-none">
                          <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
                          <span className="text-slate-400 text-xs font-bold">پایان صفحات کاتالوگ</span>
                        </div>
                      )}
                      
                      {spreads[currentPage]?.leftPageNum && (
                        <div className="absolute bottom-4 left-6 z-20">
                          <span className="text-[10px] font-mono text-slate-500 font-extrabold bg-slate-100/90 px-2 py-0.5 rounded-full border border-slate-200">
                            {spreads[currentPage].leftPageNum}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* RIGHT PAGE SPREAD SENSOR */}
                    <div className="w-[50.15%] h-full relative bg-[#faf9f6]/95 flex flex-col overflow-hidden">
                      {/* Spine folding shadow */}
                      <div className="absolute left-0 inset-y-0 w-5 bg-gradient-to-r from-black/18 via-black/4 to-transparent pointer-events-none z-10" />

                      {spreads[currentPage]?.right ? (
                        <FlipbookPage url={spreads[currentPage].right!} pageNum={spreads[currentPage].rightPageNum || 0} />
                      ) : (
                        /* Rear design cover fold decoration */
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#faf9f6]/95 p-8 select-none">
                          <img src={selectedBook.img} className="w-20 h-28 object-cover rounded shadow-md mb-3 opacity-25 mx-auto" alt="Cover Placeholder" />
                          <span className="text-slate-400 text-[10px] font-extrabold uppercase font-mono">پایان کاتالوگ</span>
                        </div>
                      )}

                      {spreads[currentPage]?.rightPageNum && (
                        <div className="absolute bottom-4 right-6 z-20">
                          <span className="text-[10px] font-mono text-slate-500 font-extrabold bg-slate-100/90 px-2 py-0.5 rounded-full border border-slate-200">
                            {spreads[currentPage].rightPageNum}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Centered realistic book fold / spine shadow line that pans/scales with the catalog */}
                    <div className="absolute left-1/2 inset-y-0 w-[1.5px] bg-black/45 z-35 pointer-events-none -translate-x-1/2" />
                  </>
                ) : (
                  /* PHYSICAL 3D PAGE FLIP ANIMATION MECHANISM */
                  <div className="w-full h-full relative flex transform-gpu" style={{ transformStyle: 'preserve-3d' }}>
                    
                    {/* Layer 1: Static Left Underlay block */}
                    <div className="w-[50.15%] h-full absolute left-0 top-0 bg-[#faf9f6]/95 overflow-hidden">
                      {/* Spine inner page folding depth */}
                      <div className="absolute right-0 inset-y-0 w-5 bg-gradient-to-l from-black/18 via-black/4 to-transparent pointer-events-none z-10" />
                      {(flipDir === 'next' ? spreads[currentPage]?.left : spreads[currentPage - 1]?.left) ? (
                        <FlipbookPage 
                          url={flipDir === 'next' ? spreads[currentPage].left! : spreads[currentPage - 1].left!} 
                          pageNum={flipDir === 'next' ? (spreads[currentPage].leftPageNum || 0) : (spreads[currentPage - 1].leftPageNum || 0)} 
                        />
                      ) : (
                        <div className="w-full h-full bg-[#141a2e]/10" />
                      )}
                      
                      {/* Dynamic Occulsion Shadow overlay on underlay as turning sheet approaches */}
                      <motion.div 
                        className="absolute inset-0 bg-black pointer-events-none z-15"
                        initial={{ opacity: 0 }}
                        animate={{ 
                          opacity: interactiveFlipDir 
                            ? (interactiveFlipDir === 'prev' ? 0.15 * (1.0 - dragProgress) : 0.08 * dragProgress)
                            : (flipDir === 'prev' ? [0.12, 0.16, 0.08, 0] : [0, 0, 0.10, 0.02, 0])
                        }}
                        transition={{ duration: isDraggingPage ? 0.05 : 0.65 }}
                      />

                      {(flipDir === 'next' ? spreads[currentPage]?.leftPageNum : spreads[currentPage - 1]?.leftPageNum) && (
                        <div className="absolute bottom-4 left-6 z-20">
                          <span className="text-[10px] font-mono text-slate-500 font-extrabold bg-slate-100/90 px-2 py-0.5 rounded-full shadow-sm">
                            {flipDir === 'next' ? spreads[currentPage].leftPageNum : spreads[currentPage - 1].leftPageNum}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Layer 2: Static Right Underlay block */}
                    <div className="w-[50.15%] h-full absolute right-0 top-0 bg-[#faf9f6]/95 overflow-hidden">
                      {/* Spine folding shadow */}
                      <div className="absolute left-0 inset-y-0 w-5 bg-gradient-to-r from-black/18 via-black/4 to-transparent pointer-events-none z-10" />
                      {(flipDir === 'next' ? spreads[currentPage + 1]?.right : spreads[currentPage]?.right) ? (
                        <FlipbookPage 
                          url={flipDir === 'next' ? spreads[currentPage + 1].right! : spreads[currentPage].right!} 
                          pageNum={flipDir === 'next' ? (spreads[currentPage + 1].rightPageNum || 0) : (spreads[currentPage].rightPageNum || 0)} 
                        />
                      ) : (
                        <div className="w-full h-full bg-[#141a2e]/10" />
                      )}

                      {/* Dynamic shadow on right underlay that fades out as leaf is lifted off it */}
                      <motion.div 
                        className="absolute inset-0 bg-black pointer-events-none z-15"
                        initial={{ opacity: 0 }}
                        animate={{ 
                          opacity: interactiveFlipDir 
                            ? (interactiveFlipDir === 'next' ? 0.18 * (1.0 - dragProgress) : 0.08 * dragProgress)
                            : (flipDir === 'next' ? [0.18, 0.12, 0] : [0, 0.05, 0.10, 0])
                        }}
                        transition={{ duration: isDraggingPage ? 0.05 : 0.65 }}
                      />

                      {(flipDir === 'next' ? spreads[currentPage + 1]?.rightPageNum : spreads[currentPage]?.rightPageNum) && (
                        <div className="absolute bottom-4 right-6 z-20">
                          <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100/90 px-2 py-0.5 rounded-full shadow-sm">
                            {flipDir === 'next' ? spreads[currentPage + 1].rightPageNum : spreads[currentPage].rightPageNum}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Layer 3: WebGL-based Deforming Page Curl mesh deforming around simulated cylinder */}
                    {spreads.length > 0 && (
                      <WebGLPageFlip
                        frontPageUrl={getCachedPageUrl(flipDir === 'next'
                          ? (spreads[currentPage]?.right || '')
                          : (spreads[currentPage]?.left || '')
                        )}
                        backPageUrl={getCachedPageUrl(flipDir === 'next'
                          ? (spreads[currentPage + 1]?.left || '')
                          : (spreads[currentPage - 1]?.right || '')
                        )}
                        isDragging={isDraggingPage}
                        dragProgress={dragProgress}
                        direction={flipDir || 'next'}
                        width={chassisSize.width}
                        height={chassisSize.height}
                        isDarkMode={document.documentElement.classList.contains('dark')}
                      />
                    )}
                  </div>
                )}

              </motion.div>

            </div>

            {/* Right physical next page trigger */}
            <button 
              onClick={handleNextPage}
              disabled={currentPage >= spreads.length - 1 || isFlipping || zoomScale > 1.0}
              className="absolute right-1 md:right-6 z-40 p-3.5 rounded-full bg-[#141a2e]/95 h-12 w-12 flex items-center justify-center hover:bg-amber-600 text-white backdrop-blur-md shadow-lg transition-all border border-slate-800 disabled:opacity-0 disabled:pointer-events-none group"
            >
              <ChevronLeft className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
            </button>

          </div>

          {/* Pagination Slider controllers */}
          <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-xl px-4 animate-fade-in text-right">
            
            <div className="flex justify-between items-center w-full text-xs text-slate-400">
              <span className="font-mono font-extrabold text-amber-500 bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10">
                {spreads[currentPage]?.leftPageNum ? `صفحه ${spreads[currentPage].leftPageNum}` : ''}
                {spreads[currentPage]?.leftPageNum && spreads[currentPage]?.rightPageNum ? ' - ' : ''}
                {spreads[currentPage]?.rightPageNum ? `صفحه ${spreads[currentPage].rightPageNum}` : ''}
                {!spreads[currentPage]?.leftPageNum && !spreads[currentPage]?.rightPageNum ? 'جلد کتاب' : ''}
              </span>
              <span className="font-semibold text-slate-500 font-mono">مجموع کل صفحات: {selectedBook.pages?.length || 0}</span>
            </div>

            <div className="w-full flex items-center gap-4">
              <span className="text-slate-500 font-semibold text-xs">شروع</span>
              <input 
                type="range"
                min="0"
                max={spreads.length - 1} 
                value={currentPage}
                onChange={(e) => {
                  const targetVal = parseInt(e.target.value);
                  const now = Date.now();
                  const textDiff = now - lastSliderTime.current;
                  const pageDiff = Math.abs(currentPage - targetVal);
                  
                  let speed = 1.0;
                  if (textDiff > 0 && pageDiff > 0) {
                    const pagesPerSec = pageDiff / (textDiff / 1000);
                    speed = Math.min(Math.max(pagesPerSec * 0.9, 0.5), 3.0);
                  }
                  
                  lastSliderTime.current = now;
                  lastSliderPage.current = targetVal;
                  
                  setCurrentPage(targetVal);
                  playPageTurnSound(speed);
                }}
                className="w-full accent-amber-500 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-slate-500 font-semibold text-xs text-left">پایان</span>
            </div>

            {/* Description details card footer */}
            <div className="bg-[#0f1424] border border-slate-850 rounded-2xl p-4 w-full flex items-center gap-4 mt-2">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-[10px] font-extrabold mb-0.5">آلبوم نمونه کار کاتالوگ بسته‌بندی</p>
                <p className="text-slate-300 text-xs leading-relaxed">{selectedBook.description}</p>
              </div>
            </div>

            {/* Elegant Horizontal Carousel Slider for other catalogs */}
            <div className="mt-8 w-full max-w-4xl text-right animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 justify-start direction-rtl">
                <span className="w-2 h-2 rounded bg-amber-500 animate-pulse"></span>
                کاتالوگ‌های دیجیتال دیگر (اسلایدر سریع)
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent justify-start direction-rtl">
                {catalogs.map((book) => {
                  const isActive = selectedBook?.id === book.id;
                  return (
                    <div 
                      key={`other-book-${book.id}`}
                      onClick={() => {
                        setSelectedBook(book);
                        setCurrentPage(0);
                        setIsAutoPlaying(true);
                      }}
                      className={`flex-shrink-0 cursor-pointer w-28 p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                        isActive 
                          ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10' 
                          : 'bg-[#111624]/60 border-slate-800/80 hover:border-slate-700/85 hover:bg-[#151c2d]/70'
                      }`}
                    >
                      <div className="aspect-[0.75] rounded-lg overflow-hidden mb-1.5 bg-slate-900 border border-slate-800">
                        <img 
                          src={book.img} 
                          alt={book.title} 
                          className="w-full h-full object-cover pointer-events-none" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className={`text-[9px] font-black tracking-normal text-center truncate px-0.5 ${isActive ? 'text-amber-400' : 'text-slate-300'}`}>
                        {book.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
