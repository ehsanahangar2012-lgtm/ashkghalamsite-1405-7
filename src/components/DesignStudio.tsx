import React, { useRef, useState, useEffect } from 'react';
import { Card, Button, BackButton } from './UIComponents';
import { 
  Download, Upload, Monitor, Share2, Info, Maximize, Minimize, 
  Palette, Sparkles, Loader2, Image as ImageIcon, Type,
  Paintbrush, Eraser, Trash2, Undo, Check, Eye, Layers, Settings, FileImage,
  PenTool, RefreshCw, HardDrive, ExternalLink, CheckCircle2, AlertCircle
} from 'lucide-react';
import { SmartHelpButton } from './SmartHelpModal';
import { generateAIPattern } from '../services/geminiService';
import { apiRequestJson } from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface DesignStudioProps {
  isDarkMode: boolean;
}

type DesignTemplate = 'pizza' | 'mailer' | 'drug';
type StudioMode = 'photocraft' | 'vectorcraft' | 'photopea' | 'local';

interface OfflineEngineMeta {
  id: 'photocraft' | 'vectorcraft';
  title: string;
  label: string;
  src: string;
  accentBg: string;
  accentText: string;
}

const OFFLINE_ENGINES: Record<'photocraft' | 'vectorcraft', OfflineEngineMeta> = {
  photocraft: {
    id: 'photocraft',
    title: 'PhotoCraft',
    label: 'ویرایشگر تصویر PhotoCraft',
    src: '/studio/photocraft/index.html',
    accentBg: 'bg-cyan-500/15 border-cyan-500/30',
    accentText: 'text-cyan-300',
  },
  vectorcraft: {
    id: 'vectorcraft',
    title: 'VectorCraft',
    label: 'طراحی برداری VectorCraft',
    src: '/studio/vectorcraft/index.html',
    accentBg: 'bg-emerald-500/15 border-emerald-500/30',
    accentText: 'text-emerald-300',
  },
};

export const DesignStudio: React.FC<DesignStudioProps> = ({ isDarkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { user } = useAuth();
  // Studio Modes: Photopea (default), PhotoCraft, VectorCraft, Local Dieline Canvas
  const [activeStudioTab, setActiveStudioTab] = useState<StudioMode>('photopea');

  // Installed status from /api/studios/status (null = still checking / unknown)
  const [studioInstalled, setStudioInstalled] = useState<Record<'photocraft' | 'vectorcraft', boolean | null>>({
    photocraft: null,
    vectorcraft: null,
  });

  const refreshStudioInstallStatus = async () => {
    try {
      const { res, data } = await apiRequestJson<{ studios?: Array<{ id: string; installed: boolean }> }>('studios/status', {
        cache: 'no-store',
      });
      if (res.ok && Array.isArray(data?.studios)) {
        const next: Record<'photocraft' | 'vectorcraft', boolean | null> = {
          photocraft: null,
          vectorcraft: null,
        };
        for (const s of data.studios) {
          if (s.id === 'photocraft' || s.id === 'vectorcraft') {
            next[s.id] = Boolean(s.installed);
          }
        }
        setStudioInstalled(next);
      }
    } catch {
      // Leave null so iframe fallback still works if status endpoint is unreachable
    }
  };

  useEffect(() => {
    void refreshStudioInstallStatus();
  }, []);

  // Common UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadedEngines, setLoadedEngines] = useState<Record<'photocraft' | 'vectorcraft' | 'photopea', boolean>>({
    photocraft: false,
    vectorcraft: false,
    photopea: false,
  });
  const [reloadKeys, setReloadKeys] = useState<Record<'photocraft' | 'vectorcraft' | 'photopea', number>>({
    photocraft: 0,
    vectorcraft: 0,
    photopea: 0,
  });
  const [confirmClear, setConfirmClear] = useState(false);
  const [studioToast, setStudioToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStudioToast({ message, type });
  };

  useEffect(() => {
    if (!studioToast) return;
    const t = window.setTimeout(() => setStudioToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [studioToast]);

  const markEngineLoaded = (engine: 'photocraft' | 'vectorcraft' | 'photopea') => {
    setLoadedEngines((prev) => (prev[engine] ? prev : { ...prev, [engine]: true }));
  };

  const reloadEngine = (engine: 'photocraft' | 'vectorcraft' | 'photopea') => {
    setLoadedEngines((prev) => ({ ...prev, [engine]: false }));
    setReloadKeys((prev) => ({ ...prev, [engine]: prev[engine] + 1 }));
  };

  // Allow embedded studios to switch back to Photopea or another tool cleanly
  useEffect(() => {
    const handleStudioMessage = (event: MessageEvent) => {
      if (!event.data || event.data.type !== 'ASHK_STUDIO_SWITCH') return;
      const target = event.data.engine as StudioMode;
      if (target === 'photopea' || target === 'photocraft' || target === 'vectorcraft' || target === 'local') {
        setActiveStudioTab(target);
      }
    };
    window.addEventListener('message', handleStudioMessage);
    return () => window.removeEventListener('message', handleStudioMessage);
  }, []);

  // Monitor network offline state when user is on Photopea
  useEffect(() => {
    const handleOffline = () => {
      if (activeStudioTab === 'photopea') {
        showToast('اتصال اینترنت قطع شد. می‌توانید از PhotoCraft، VectorCraft یا بوم فوری دایکات استفاده کنید.', 'info');
      }
    };
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, [activeStudioTab]);

  // AI Generator state
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPattern, setGeneratedPattern] = useState<string | null>(null);

  // --- LOCAL STUDIO STATE ---
  const [selectedTemplate, setSelectedTemplate] = useState<DesignTemplate>('pizza');
  const [bgColor, setBgColor] = useState('#c4a482'); // Default Kraft Cardboard color
  const [brushColor, setBrushColor] = useState('#1e1b4b'); // Deep indigo
  const [brushSize, setBrushSize] = useState(6);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'rect' | 'circle'>('brush');
  const [isDrawing, setIsDrawing] = useState(false);
  const [textLabel, setTextLabel] = useState('اشک قلم پیتزا');
  const [textSize, setTextSize] = useState(28);
  const [textIsBold, setTextIsBold] = useState(true);
  const [showDielineOverlay, setShowDielineOverlay] = useState(true);
  const [uploadedStickers, setUploadedStickers] = useState<{ id: string, img: HTMLImageElement, x: number, y: number, w: number, h: number }[]>([]);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);

  // Photopea Configuration
  const [embedUrl] = useState(() => {
    const config = {
      environment: {
        theme: isDarkMode ? 2 : 0, 
        lang: 'fa', 
        vmodes: 0, 
        intro: true, 
        showtools: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 
        localsave: true, 
      },
    };
    return `https://www.photopea.com#${encodeURI(JSON.stringify(config))}`;
  });

  // Toggle full screen helper with browser Fullscreen API and CSS fallback
  const toggleFullscreen = () => {
    const elem = containerRef.current || document.documentElement;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
          setIsFullscreen(prev => !prev);
        });
      } else {
        setIsFullscreen(prev => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcut (F / Alt+Enter) for toggling full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'f' || e.key === 'F') && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- CANVAS INTERACTION LOGIC ---
  useEffect(() => {
    if (activeStudioTab === 'local') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Initialize canvas with background color if history is empty
      if (canvasHistory.length === 0) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveHistory();
      }
    }
  }, [activeStudioTab]);

  // Handle background color change dynamically
  useEffect(() => {
    if (activeStudioTab === 'local' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Redraw whole canvas with new background but preserve drawing by filling
        // To do this simply, we clear and repaint, then draw stickers or let them draw.
        // For standard local canvas, we redraw background and re-render history.
        const img = new Image();
        if (canvasHistory.length > 0) {
          img.src = canvasHistory[canvasHistory.length - 1];
          img.onload = () => {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
        } else {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [bgColor]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setCanvasHistory(prev => [...prev.slice(-15), dataUrl]); // Keep last 15 states
  };

  const handleUndo = () => {
    if (canvasHistory.length <= 1) return;
    const newHistory = canvasHistory.slice(0, -1);
    setCanvasHistory(newHistory);
    const prevState = newHistory[newHistory.length - 1];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = prevState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const coords = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? bgColor : brushColor;

    // Handle immediate dot
    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.strokeStyle = tool === 'eraser' ? bgColor : brushColor;
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistory();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!confirmClear) {
      setConfirmClear(true);
      showToast('برای پاک کردن کامل بوم، یک بار دیگر روی دکمه «پاک کردن کل طرح» کلیک کنید.', 'info');
      window.setTimeout(() => setConfirmClear(false), 4000);
      return;
    }

    setConfirmClear(false);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setUploadedStickers([]);
    setCanvasHistory([]);
    setTimeout(() => saveHistory(), 50);
    showToast('بوم طراحی با موفقیت پاک‌سازی شد.', 'success');
  };

  // Sticker logo upload handler
  const handleStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw sticker center-scaled
        const maxStickerDim = 200;
        let w = img.width;
        let h = img.height;
        if (w > maxStickerDim || h > maxStickerDim) {
          if (w > h) {
            h = (maxStickerDim * h) / w;
            w = maxStickerDim;
          } else {
            w = (maxStickerDim * w) / h;
            h = maxStickerDim;
          }
        }

        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;

        ctx.drawImage(img, x, y, w, h);
        saveHistory();
        showToast('نشان تجاری شما با موفقیت به مرکز بوم طراحی افزوده شد.', 'success');
      };
    };
    reader.readAsDataURL(file);
  };

  // Text insertion handler
  const handleAddText = () => {
    const canvas = canvasRef.current;
    if (!canvas || !textLabel.trim()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = brushColor;
    ctx.font = `${textIsBold ? 'black' : 'normal'} ${textSize}px sans-serif, Tahoma`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw text in center of canvas
    ctx.fillText(textLabel, canvas.width / 2, canvas.height / 2);
    saveHistory();
  };

  // Export local canvas to PNG
  const handleExportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `ashkghalam_box_design_${selectedTemplate}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // --- GEMINI AI PATTERN GENERATOR ---
  const handleGeneratePattern = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateAIPattern(prompt);
      if (result) {
        setGeneratedPattern(result);
        showToast('بافت اختصاصی شما با موفقیت تولید شد.', 'success');
      } else {
        showToast('خطا در تولید بافت با هوش مصنوعی. لطفاً مجدداً امتحان نمایید.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('ارتباط با سرور هوش مصنوعی برقرار نشد.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Draw AI pattern on local canvas
  const applyAIPattern = () => {
    if (!generatedPattern) return;
    const img = new Image();
    img.src = generatedPattern;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      saveHistory();
      showToast('بافت هوش مصنوعی به عنوان پس‌زمینه بوم چاپ تنظیم شد.', 'success');
    };
  };

  // Send AI pattern to Photopea
  const sendToPhotopea = () => {
    if (!generatedPattern || !iframeRef.current?.contentWindow) return;
    fetch(generatedPattern)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "ai_pattern.png", { type: "image/png" });
        const reader = new FileReader();
        reader.onload = function() {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(reader.result, "*");
            showToast('بافت به فتوشاپ ابری Photopea ارسال شد.', 'success');
          }
        };
        reader.readAsArrayBuffer(file);
      });
  };

  // Download AI pattern for drag-and-drop into offline PhotoCraft / VectorCraft
  const downloadAIPattern = () => {
    if (!generatedPattern) return;
    const link = document.createElement('a');
    link.download = `ashkghalam_ai_pattern_${Date.now()}.png`;
    link.href = generatedPattern;
    link.click();
    showToast('فایل بافت دانلود شد؛ اکنون می‌توانید آن را داخل PhotoCraft یا VectorCraft بکشید (Drag & Drop).', 'success');
  };

  // Local dieline vector drawing specifications
  const renderDielineGuide = () => {
    if (selectedTemplate === 'pizza') {
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60 z-10" viewBox="0 0 600 600" >
          {/* Pizza Box Template Vector Dieline Overlay (Cuts: Red/Black, Creases: Dotted) */}
          <rect x="50" y="50" width="500" height="500" fill="none" stroke="#2563eb" strokeWidth="1" strokeDasharray="3,3" />
          
          {/* Main fold creases */}
          <line x1="50" y1="120" x2="550" y2="120" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="50" y1="200" x2="550" y2="200" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="50" y1="400" x2="550" y2="400" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="50" y1="480" x2="550" y2="480" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          
          {/* Side Fold creases */}
          <line x1="120" y1="120" x2="120" y2="480" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="480" y1="120" x2="480" y2="480" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />

          {/* Cuts outer border */}
          <rect x="50" y="50" width="500" height="500" fill="none" stroke="#000000" strokeWidth="2" rx="12" />
          
          {/* Ventilation holes (standard Pizza Box CAD circles) */}
          <circle cx="200" cy="160" r="10" fill="none" stroke="#000000" strokeWidth="2" />
          <circle cx="400" cy="160" r="10" fill="none" stroke="#000000" strokeWidth="2" />
          
          {/* Text Labels guide */}
          <text x="300" y="90" fill="#1e293b" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Tahoma">زبانه جلو (FRONT FLAP)</text>
          <text x="300" y="160" fill="#1e293b" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Tahoma">درب جعبه پیتزا (TOP LID)</text>
          <text x="300" y="300" fill="#1e293b" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Tahoma">کف جعبه پیتزا (BOTTOM BASE)</text>
          <text x="300" y="440" fill="#1e293b" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Tahoma">دیواره پشتی (BACK PANEL)</text>
          <text x="200" y="180" fill="#2563eb" fontSize="8" fontWeight="black" textAnchor="middle" fontFamily="Tahoma">منفذ خروج هوا</text>
          <text x="400" y="180" fill="#2563eb" fontSize="8" fontWeight="black" textAnchor="middle" fontFamily="Tahoma">منفذ خروج هوا</text>
        </svg>
      );
    } else if (selectedTemplate === 'mailer') {
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60 z-10" viewBox="0 0 600 600" >
          {/* Mailer Box template */}
          <rect x="80" y="60" width="440" height="480" fill="none" stroke="#2563eb" strokeWidth="1" strokeDasharray="3,3" />
          <line x1="80" y1="150" x2="520" y2="150" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="80" y1="210" x2="520" y2="210" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="80" y1="390" x2="520" y2="390" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="80" y1="450" x2="520" y2="450" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="150" y1="60" x2="150" y2="540" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="450" y1="60" x2="450" y2="540" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <rect x="80" y="60" width="440" height="480" fill="none" stroke="#000000" strokeWidth="2" />
          <text x="300" y="110" fill="#1e293b" fontSize="11" textAnchor="middle" fontFamily="Tahoma">درب رویی (TOP COV)</text>
          <text x="300" y="300" fill="#1e293b" fontSize="11" textAnchor="middle" fontFamily="Tahoma">کفه جعبه پستی (BASE TRAY)</text>
        </svg>
      );
    } else {
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60 z-10" viewBox="0 0 600 600" >
          {/* Standard Medicine Lock-end Box */}
          <rect x="120" y="50" width="360" height="500" fill="none" stroke="#000000" strokeWidth="1.5" />
          <line x1="210" y1="50" x2="210" y2="550" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="300" y1="50" x2="300" y2="550" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="390" y1="50" x2="390" y2="550" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="120" y1="120" x2="480" y2="120" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <line x1="120" y1="480" x2="480" y2="480" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
          <text x="165" y="300" fill="#1e293b" fontSize="10" textAnchor="middle" fontFamily="Tahoma">پنل ۱ (PANEL A)</text>
          <text x="255" y="300" fill="#1e293b" fontSize="10" textAnchor="middle" fontFamily="Tahoma">پنل ۲ (PANEL B)</text>
          <text x="345" y="300" fill="#1e293b" fontSize="10" textAnchor="middle" fontFamily="Tahoma">پنل ۳ (PANEL C)</text>
          <text x="435" y="300" fill="#1e293b" fontSize="10" textAnchor="middle" fontFamily="Tahoma">پنل ۴ (PANEL D)</text>
        </svg>
      );
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col bg-[#0f111a] text-white overflow-hidden transition-all duration-300 ${isFullscreen ? 'h-screen w-screen fixed inset-0 z-50' : 'h-[calc(100vh-80px)]'}`}
    >
      
      {/* Studio Header Toolbar */}
      <div className="min-h-[52px] py-1.5 bg-[#141824] border-b border-slate-850 flex flex-wrap items-center justify-between gap-2 px-3 md:px-4 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <BackButton
            label="بازگشت به سایت"
            variant="danger"
            onClick={() => window.dispatchEvent(new CustomEvent('exit-cad-view'))}
          />
          <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 w-8 h-8 rounded-xl hidden sm:flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-600/25 shrink-0">
            <Palette className="h-4 w-4 text-white animate-pulse" />
          </div>
          <div className="hidden sm:block truncate">
            <h1 className="text-xs font-black text-slate-100 font-sans truncate">استودیو طراحی گرافیک</h1>
            <p className="text-[9.5px] text-slate-400 font-sans truncate">طراحی تصویر، وکتور و بسته‌بندی</p>
          </div>
        </div>

        {/* Studio Switcher: Photopea (Primary Default) + PhotoCraft / VectorCraft / Local (Secondary) */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveStudioTab('photopea')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
              activeStudioTab === 'photopea'
                ? 'bg-indigo-600 border-indigo-400/60 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-indigo-950/50 border-indigo-500/35 text-indigo-200 hover:bg-indigo-900/60 hover:text-white'
            }`}
            title="ویرایشگر آنلاین Photopea (پیش‌فرض)"
          >
            <Monitor className="w-3.5 h-3.5 shrink-0" />
            <span>Photopea</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/25 text-indigo-100 font-bold">پیش‌فرض</span>
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block shrink-0" />

          <div className="flex items-center bg-[#0a0d14] p-1 rounded-xl border border-slate-800 gap-1">
            <button
              onClick={() => setActiveStudioTab('photocraft')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[10.5px] sm:text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
                activeStudioTab === 'photocraft'
                  ? 'bg-cyan-600 border-cyan-400/50 text-white shadow'
                  : 'bg-[#141824] border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-white'
              }`}
              title="ویرایشگر تصویر PhotoCraft (جایگزین)"
            >
              <HardDrive className="w-3.5 h-3.5 shrink-0" />
              <span>PhotoCraft</span>
            </button>

            <button
              onClick={() => setActiveStudioTab('vectorcraft')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[10.5px] sm:text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
                activeStudioTab === 'vectorcraft'
                  ? 'bg-emerald-600 border-emerald-400/50 text-white shadow'
                  : 'bg-[#141824] border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-white'
              }`}
              title="طراحی برداری VectorCraft (جایگزین)"
            >
              <PenTool className="w-3.5 h-3.5 shrink-0" />
              <span>VectorCraft</span>
            </button>

            <button
              onClick={() => setActiveStudioTab('local')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[10.5px] sm:text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
                activeStudioTab === 'local'
                  ? 'bg-amber-600 border-amber-400/50 text-white shadow'
                  : 'bg-[#141824] border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-white'
              }`}
              title="بوم فوری طراحی روی قالب دایکات"
            >
              <Paintbrush className="w-3.5 h-3.5 shrink-0" />
              <span>بوم فوری دایکات</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Toggle Button */}
          <Button 
            size="sm" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${isSidebarOpen ? 'bg-indigo-600 text-white shadow-lg' : 'bg-[#1e2330] text-slate-300 hover:bg-slate-750'}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">بافت‌ساز هوشمند</span>
          </Button>

          {/* Fullscreen Mode Toggle Button */}
          <button 
            onClick={toggleFullscreen}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isFullscreen 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' 
                : 'bg-[#1e2330] text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title={isFullscreen ? "خروج از حالت تمام‌صفحه (کلید F یا Esc)" : "حالت تمام‌صفحه (کلید F)"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? "خروج از تمام‌صفحه" : "تمام‌صفحه"}</span>
          </button>

          {/* Smart Help Button */}
          <SmartHelpButton
            sectionTitle="استودیو طراحی گرافیک"
            sectionKey="design_studio"
            description="محیط طراحی تصویر، وکتور و آماده‌سازی فایل‌های چاپی بسته‌بندی."
            tips={[
              "Photopea به عنوان محیط پیش‌فرض برای طراحی و ویرایش حرفه‌ای فایل‌های گرافیکی باز می‌شود.",
              "در صورت عدم کارکرد یا کندی بارگذاری Photopea، می‌توانید از دکمه‌های جایگزین PhotoCraft، VectorCraft و بوم فوری دایکات در نوار بالا استفاده کنید.",
              "برای فضای کاری گسترده‌تر، دکمه تمام‌صفحه یا کلید F کیبورد را بزنید."
            ]}
            className="w-8 h-8 rounded-xl bg-[#1e2330] text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30"
          />
        </div>
      </div>

      {/* Non-blocking inline toast notification */}
      {studioToast && (
        <div
          dir="rtl"
          className={`px-4 py-2 text-xs font-bold flex items-center justify-between gap-3 border-b shrink-0 ${
            studioToast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800/60'
              : studioToast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800/60'
              : 'bg-indigo-950/90 text-indigo-200 border-indigo-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            {studioToast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{studioToast.message}</span>
          </div>
          <button
            onClick={() => setStudioToast(null)}
            className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {/* Workspace Wrapper */}
      <div className="flex-1 relative w-full flex overflow-hidden">
        
        {/* AI Sidebar */}
        <div className={`bg-[#0c0e17] border-l border-slate-850 flex flex-col transition-all duration-300 z-30 ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`} dir="rtl">
          <div className="p-5 flex flex-col h-full w-80 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-850">
              <div className="bg-indigo-650/20 p-2 rounded-xl text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-xs text-white">تولید بافت چاپی</h3>
                <p className="text-[9.5px] text-slate-400 mt-0.5">ایجاد پترن اختصاصی برای بسته‌بندی</p>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="text-[10px] font-bold text-slate-300 mb-2 block">توصیف طرح یا بافت پترن (Prompt)</label>
                <textarea 
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="مثلاً: پترن اسلیمی طلایی با جزئیات لوکس مناسب جعبه زعفران بر روی پس‌زمینه زرشکی..."
                  className="w-full h-24 bg-[#141824] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-650 resize-none focus:border-indigo-500 outline-none transition-all font-sans leading-relaxed"
                />
              </div>

              <Button 
                onClick={handleGeneratePattern} 
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white border-none shadow-md py-2.5 rounded-xl font-bold text-xs font-sans transition-all"
              >
                {isGenerating ? (
                  <><Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" /> در حال پردازش مدل هوشمند...</>
                ) : (
                  <><ImageIcon className="w-3.5 h-3.5 ml-1.5" /> تولید پترن اختصاصی</>
                )}
              </Button>

              {generatedPattern && (
                <div className="mt-5 space-y-3 animate-in fade-in slide-in-from-bottom-3 p-3 bg-indigo-950/20 rounded-xl border border-indigo-900/30">
                  <label className="text-[10px] font-bold text-slate-300 block">بافت تولید شده اختصاصی شما:</label>
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#07090f] aspect-square relative group">
                    <img src={generatedPattern} alt="Generated Pattern" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 items-center justify-center p-3">
                      {activeStudioTab === 'local' ? (
                        <Button onClick={applyAIPattern} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white w-full text-[10px]">
                          <Upload className="w-3.5 h-3.5 ml-1.5" />
                          اعمال مستقیم به بوم طراحی
                        </Button>
                      ) : activeStudioTab === 'photopea' ? (
                        <Button onClick={sendToPhotopea} size="sm" className="bg-emerald-600 hover:bg-emerald-550 text-white w-full text-[10px]">
                          <Upload className="w-3.5 h-3.5 ml-1.5" />
                          ارسال به فتوشاپ ابری
                        </Button>
                      ) : (
                        <Button onClick={downloadAIPattern} size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white w-full text-[10px]">
                          <Download className="w-3.5 h-3.5 ml-1.5" />
                          دانلود برای PhotoCraft / VectorCraft
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-relaxed text-justify">💡 این پترن تکرارپذیر توسط موتور هوش مصنوعی اشک قلم طراحی شده است و مناسب چاپ‌های نفیس است.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- MAIN TAB CONTENT WORKSPACE --- */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* TAB 1: HTML5 GUARANTEED LOCAL CANVAS DESIGNER */}
          {activeStudioTab === 'local' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Tool Panel (Right side in RTL) */}
              <div className="w-full md:w-72 bg-[#0c0e17] border-r md:border-r-0 md:border-l border-slate-850 p-4 flex flex-col space-y-4 overflow-y-auto" dir="rtl">
                
                {/* Section 1: Templates selection */}
                <div>
                  <h3 className="text-[10.5px] font-black text-indigo-400 mb-2.5 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>الگو و قالب راهنمای جعبه:</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => setSelectedTemplate('pizza')}
                      className={`px-3 py-2 rounded-xl text-[10.5px] font-bold text-right border transition-all flex items-center justify-between ${selectedTemplate === 'pizza' ? 'bg-indigo-950/50 border-indigo-500 text-white' : 'bg-[#141824] border-slate-800 text-slate-400 hover:border-slate-700'}`}
                    >
                      <span>🍕 جعبه پیتزا کلاسیک (FEFCO 0426)</span>
                      {selectedTemplate === 'pizza' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                    <button
                      onClick={() => setSelectedTemplate('mailer')}
                      className={`px-3 py-2 rounded-xl text-[10.5px] font-bold text-right border transition-all flex items-center justify-between ${selectedTemplate === 'mailer' ? 'bg-indigo-950/50 border-indigo-500 text-white' : 'bg-[#141824] border-slate-800 text-slate-400 hover:border-slate-700'}`}
                    >
                      <span>✉️ کارتن پستی کیبوردی (FEFCO 0427)</span>
                      {selectedTemplate === 'mailer' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                    <button
                      onClick={() => setSelectedTemplate('drug')}
                      className={`px-3 py-2 rounded-xl text-[10.5px] font-bold text-right border transition-all flex items-center justify-between ${selectedTemplate === 'drug' ? 'bg-indigo-950/50 border-indigo-500 text-white' : 'bg-[#141824] border-slate-800 text-slate-400 hover:border-slate-700'}`}
                    >
                      <span>💊 جعبه دارویی زبانه دار (ECMA)</span>
                      {selectedTemplate === 'drug' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  </div>
                </div>

                <hr className="border-slate-850" />

                {/* Section 2: Colors Setup */}
                <div>
                  <h3 className="text-[10.5px] font-black text-indigo-400 mb-2.5 flex items-center gap-1.5">
                    <Settings className="w-4 h-4" />
                    <span>رنگ‌بندی جنس و جوهر چاپ:</span>
                  </h3>
                  
                  {/* Background Selector */}
                  <div className="space-y-1.5 mb-3">
                    <span className="text-[10px] text-slate-400 block font-sans">رنگ مقوای خام (شبیه‌ساز جنس):</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { name: 'کرافت قهوه‌ای', value: '#c4a482' },
                        { name: 'سفید ایندربرد', value: '#fafcfd' },
                        { name: 'کارتن طوسی', value: '#8f9296' },
                        { name: 'مشکی لوکس', value: '#15171c' },
                        { name: 'قرمز فست‌فود', value: '#9c1c1c' },
                      ].map((bgPreset) => (
                        <button
                          key={bgPreset.value}
                          onClick={() => setBgColor(bgPreset.value)}
                          className={`px-2 py-1.5 rounded-lg text-[9.5px] font-bold border transition-all ${bgColor === bgPreset.value ? 'bg-indigo-900/40 border-indigo-500 text-white' : 'bg-[#141824] border-slate-850 text-slate-400'}`}
                          style={{ borderRight: `3px solid ${bgPreset.value}` }}
                        >
                          {bgPreset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brush / Ink color */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 block font-sans">رنگ جوهر چاپ زنده:</span>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={brushColor} 
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="w-10 h-8 rounded-lg bg-transparent border border-slate-850 cursor-pointer"
                      />
                      <div className="flex-1 flex gap-1 items-center">
                        {['#1e1b4b', '#b91c1c', '#047857', '#eab308', '#ffffff'].map(c => (
                          <button
                            key={c}
                            onClick={() => setBrushColor(c)}
                            className="w-5 h-5 rounded-full border border-slate-800 transition-transform hover:scale-110 cursor-pointer"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-850" />

                {/* Section 3: Drawing Tools */}
                <div>
                  <h3 className="text-[10.5px] font-black text-indigo-400 mb-2.5 flex items-center gap-1.5">
                    <Paintbrush className="w-4 h-4" />
                    <span>ابزارهای رسم دستی:</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setTool('brush')}
                      className={`py-2 px-2.5 rounded-xl text-[10.5px] font-bold flex items-center justify-center gap-1.5 border transition-all ${tool === 'brush' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#141824] border-slate-850 text-slate-400 hover:border-slate-750'}`}
                    >
                      <Paintbrush className="w-3.5 h-3.5" />
                      <span>قلم جوهر</span>
                    </button>
                    <button
                      onClick={() => setTool('eraser')}
                      className={`py-2 px-2.5 rounded-xl text-[10.5px] font-bold flex items-center justify-center gap-1.5 border transition-all ${tool === 'eraser' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#141824] border-slate-850 text-slate-400 hover:border-slate-750'}`}
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>پاک‌کن لبه</span>
                    </button>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-400 font-sans">
                      <span>اندازه قلم:</span>
                      <span>{brushSize}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="2" 
                      max="40" 
                      value={brushSize} 
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <hr className="border-slate-850" />

                {/* Section 4: Text placement & Sticker upload */}
                <div>
                  <h3 className="text-[10.5px] font-black text-indigo-400 mb-2.5 flex items-center gap-1.5">
                    <Type className="w-4 h-4" />
                    <span>افزودن برچسب و نوشته فارسی:</span>
                  </h3>
                  <div className="space-y-2">
                    <input 
                      type="text"
                      value={textLabel}
                      onChange={(e) => setTextLabel(e.target.value)}
                      placeholder="متن دلخواه (مانند پیتزا مخصوص)"
                      className="w-full bg-[#141824] border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-slate-650 font-sans"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddText}
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[10px] font-sans flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        <Type className="w-3.5 h-3.5" />
                        <span>درج متن در مرکز</span>
                      </button>
                      <button
                        onClick={() => setTextIsBold(!textIsBold)}
                        className={`px-3 py-1.5 rounded-xl border text-[10px] font-black ${textIsBold ? 'bg-indigo-950/40 border-indigo-500 text-white' : 'bg-[#141824] border-slate-850 text-slate-400'}`}
                      >
                        B
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-[10px] text-slate-400 block mb-2 font-sans">بارگذاری نشان تجاری یا لوگوی اختصاصی شما:</span>
                    <label className="w-full py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl text-[10px] font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-all text-center">
                      <FileImage className="w-3.5 h-3.5 text-indigo-400" />
                      <span>انتخاب لوگو (PNG/Sticker)</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleStickerUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                <hr className="border-slate-850" />

                {/* Section 5: Vector Dieline Display toggle */}
                <div className="flex items-center justify-between py-1 bg-[#141824]/50 px-3 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-400 font-sans">نمایش خطوط راهنمای تیغ‌زنی:</span>
                  <button
                    onClick={() => setShowDielineOverlay(!showDielineOverlay)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${showDielineOverlay ? 'bg-indigo-650 text-white' : 'bg-slate-800 text-slate-500'}`}
                    title="تغییر وضعیت نمایش دیلاین"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

              {/* Main Canvas Staging Ground (Center) */}
              <div className="flex-1 bg-[#13151f] flex flex-col items-center justify-center p-4 relative overflow-auto select-none">
                
                {/* Header notes */}
                <div className="mb-4 text-center">
                  <span className="text-[10px] text-indigo-400 font-bold bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-900/30 font-sans">
                    بوم لایو دو بعدی هماهنگ با تیغه‌های برش دایکات کارخانه
                  </span>
                  <p className="text-[9.5px] text-slate-400 mt-1.5 font-sans leading-relaxed">
                    با موس یا لمس روی جعبه نقاشی کنید یا با دکمه‌های کناری نشان تجاری و متن اضافه نمایید.
                  </p>
                </div>

                {/* Render container matching canvas exact size with overlay vector layers */}
                <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 shrink-0 select-none">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={600}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] md:w-[500px] md:h-[500px] lg:w-[520px] lg:h-[520px] cursor-crosshair relative z-0"
                  />
                  
                  {/* Dynamic Crisp SVG Vector guide overlay */}
                  {showDielineOverlay && renderDielineGuide()}
                </div>

                {/* Canvas Actions bar */}
                <div className="mt-4 flex gap-2.5 bg-[#0a0d14] p-2 rounded-2xl border border-slate-850 shrink-0">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleUndo}
                    disabled={canvasHistory.length <= 1}
                    className="px-3.5 py-1.5 rounded-xl text-[10.5px] font-bold text-slate-300 bg-slate-900 hover:bg-slate-800"
                  >
                    <Undo className="w-3.5 h-3.5 ml-1.5" />
                    <span>برگشت (Undo)</span>
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={clearCanvas}
                    className="px-3.5 py-1.5 rounded-xl text-[10.5px] font-black text-rose-450 bg-[#250d0e] hover:bg-[#3d1214] border border-rose-950"
                  >
                    <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                    <span>پاک کردن کل طرح</span>
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleExportCanvas}
                    className="px-4 py-1.5 rounded-xl text-[10.5px] font-black text-white bg-indigo-600 hover:bg-indigo-550"
                  >
                    <Download className="w-3.5 h-3.5 ml-1.5" />
                    <span>دانلود تصویر نهایی طرح بسته‌بندی</span>
                  </Button>
                </div>

              </div>

            </div>
          )}

          {/* TAB: PHOTOCRAFT & VECTORCRAFT */}
          {(activeStudioTab === 'photocraft' || activeStudioTab === 'vectorcraft') && (() => {
            const engine = OFFLINE_ENGINES[activeStudioTab];
            const otherEngine = activeStudioTab === 'photocraft' ? OFFLINE_ENGINES.vectorcraft : OFFLINE_ENGINES.photocraft;
            const engineLoaded = loadedEngines[engine.id];
            const isNotInstalled = studioInstalled[engine.id] === false;

            if (isNotInstalled) {
              return (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#141720] p-6 text-center" dir="rtl">
                  <div className="max-w-md w-full bg-[#1a1f2e] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div className={`w-12 h-12 mx-auto rounded-2xl border flex items-center justify-center ${engine.accentBg} ${engine.accentText}`}>
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <h2 className="text-base font-black text-white">
                      {engine.label} هنوز تکمیل نشده است
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      فایل‌های این ابزار هنوز از طریق پنل مدیریت دانلود و تکمیل نشده‌اند. تا زمان فعال‌سازی، می‌توانید از محیط پیش‌فرض <strong className="text-white">Photopea</strong> یا <strong className="text-white">بوم فوری دایکات</strong> استفاده کنید.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveStudioTab('photopea')}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition cursor-pointer"
                      >
                        استفاده از Photopea
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveStudioTab('local')}
                        className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border border-amber-500/35 text-xs font-bold transition cursor-pointer"
                      >
                        بوم فوری دایکات
                      </button>
                      <button
                        type="button"
                        onClick={() => void refreshStudioInstallStatus()}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>بررسی مجدد</span>
                      </button>
                    </div>
                    {user?.role === 'ADMIN' && (
                      <div className="pt-3 border-t border-slate-800">
                        <a
                          href="/admin"
                          onClick={() => {
                            try {
                              sessionStorage.setItem('ashk_admin_active_tab', 'studio_installer');
                            } catch {}
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-400 hover:text-cyan-300"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>رفتن به پنل مدیریت برای دانلود و نصب {engine.title}</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div className="flex-1 flex flex-col relative bg-[#141720]">
                {!engineLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141720] z-20 p-6 text-center" dir="rtl">
                    <div className="w-10 h-10 border-4 border-t-cyan-400 border-slate-700 rounded-full animate-spin mb-4" />
                    <p className="text-slate-100 text-xs font-bold font-sans">
                      در حال آماده‌سازی {engine.label}...
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1.5 max-w-md font-sans leading-relaxed">
                      در صورت طولانی شدن بارگذاری می‌توانید از Photopea یا ابزارهای دیگر استفاده کنید.
                    </p>
                    <div className="mt-4 flex gap-2 flex-wrap justify-center">
                      <button
                        onClick={() => setActiveStudioTab('photopea')}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        انتقال به Photopea
                      </button>
                      <button
                        onClick={() => setActiveStudioTab(otherEngine.id)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        انتقال به {otherEngine.title}
                      </button>
                      <button
                        onClick={() => setActiveStudioTab('local')}
                        className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        بوم فوری دایکات
                      </button>
                    </div>
                  </div>
                )}

                <iframe
                  key={`${engine.id}-${reloadKeys[engine.id]}`}
                  src={engine.src}
                  title={engine.label}
                  className="flex-1 h-full border-0 relative z-10 w-full bg-[#141720]"
                  onLoad={() => markEngineLoaded(engine.id)}
                  allow="clipboard-read; clipboard-write; fullscreen"
                  allowFullScreen
                />

                <div
                  dir="rtl"
                  className="bg-[#12141c] px-4 py-1.5 border-t border-slate-850 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-400 font-sans z-10"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold ${engine.accentBg} ${engine.accentText}`}>
                      {engine.label}
                    </span>
                    <span className="text-slate-400 hidden md:inline">ابزار جایگزین:</span>
                    <button
                      onClick={() => setActiveStudioTab('photopea')}
                      className="px-2 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 border border-indigo-500/30 font-bold cursor-pointer transition-colors"
                    >
                      Photopea
                    </button>
                    <button
                      onClick={() => setActiveStudioTab(otherEngine.id)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold cursor-pointer transition-colors"
                    >
                      {otherEngine.title}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => reloadEngine(engine.id)}
                      className="text-slate-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>بارگذاری مجدد</span>
                    </button>
                    <a
                      href={engine.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                    >
                      <span>پنجره مجزا</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB: PHOTOPEA (DEFAULT) */}
          {activeStudioTab === 'photopea' && (
            <div className="flex-1 flex flex-col relative bg-[#1e1e1e]">
              {!loadedEngines.photopea && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#13151f] z-20 p-6 text-center" dir="rtl">
                  <div className="w-10 h-10 border-4 border-t-indigo-500 border-slate-800 rounded-full animate-spin mb-4" />
                  <p className="text-slate-100 text-sm font-bold font-sans">در حال آماده‌سازی Photopea...</p>
                  <p className="text-slate-400 text-xs mt-2 max-w-md font-sans leading-relaxed">
                    در صورت عدم کارکرد یا کندی بارگذاری Photopea، می‌توانید گزینه‌های جایگزین PhotoCraft، VectorCraft یا بوم فوری دایکات را امتحان کنید.
                  </p>
                  <div className="mt-4 flex gap-2 flex-wrap justify-center">
                    <button
                      onClick={() => setActiveStudioTab('photocraft')}
                      className="px-3.5 py-2 bg-cyan-600/20 hover:bg-cyan-600/35 text-cyan-200 border border-cyan-500/40 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      استفاده از PhotoCraft
                    </button>
                    <button
                      onClick={() => setActiveStudioTab('vectorcraft')}
                      className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-200 border border-emerald-500/40 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      استفاده از VectorCraft
                    </button>
                    <button
                      onClick={() => setActiveStudioTab('local')}
                      className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/35 text-amber-200 border border-amber-500/40 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      بوم فوری دایکات
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2.5 flex-wrap justify-center">
                    <a 
                      href="https://www.photopea.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 text-white font-bold rounded-xl text-xs shadow-lg flex items-center gap-1.5 transition-all no-underline cursor-pointer"
                    >
                      <span>باز کردن در تب جدید</span>
                      <Share2 className="w-3.5 h-3.5 text-white" />
                    </a>
                    <Button 
                      onClick={() => markEngineLoaded('photopea')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      نمایش محیط کار
                    </Button>
                  </div>
                </div>
              )}

              <iframe
                key={`photopea-${reloadKeys.photopea}`}
                ref={iframeRef}
                src={embedUrl}
                title="Photopea Editor"
                className="flex-1 h-full border-0 relative z-10 w-full"
                onLoad={() => markEngineLoaded('photopea')}
                allow="clipboard-read; clipboard-write; camera; fullscreen"
                allowFullScreen
              />

              <div dir="rtl" className="bg-[#12141c] px-4 py-1.5 border-t border-slate-850 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-300 font-sans z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>در صورت عدم کارکرد یا بارگذاری نشدن Photopea، گزینه‌های جایگزین را امتحان کنید:</span>
                  </span>
                  <button
                    onClick={() => setActiveStudioTab('photocraft')}
                    className="px-2 py-0.5 rounded bg-cyan-600/20 hover:bg-cyan-600/35 text-cyan-300 border border-cyan-500/35 font-bold cursor-pointer transition-colors"
                  >
                    PhotoCraft
                  </button>
                  <button
                    onClick={() => setActiveStudioTab('vectorcraft')}
                    className="px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/35 font-bold cursor-pointer transition-colors"
                  >
                    VectorCraft
                  </button>
                  <button
                    onClick={() => setActiveStudioTab('local')}
                    className="px-2 py-0.5 rounded bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border border-amber-500/35 font-bold cursor-pointer transition-colors"
                  >
                    بوم فوری دایکات
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => reloadEngine('photopea')}
                    className="text-slate-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>بارگذاری مجدد</span>
                  </button>
                  <a 
                    href="https://www.photopea.com" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                  >
                    <span>پنجره مجزا</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
