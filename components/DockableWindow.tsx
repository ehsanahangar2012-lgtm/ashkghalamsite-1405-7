import React, { useState, useRef, useEffect, useContext, createContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Square, Minimize2, ArrowLeft, ArrowRight, Move, TableProperties } from 'lucide-react';
import { Badge } from './UIComponents';

export const AnchorContext = createContext<'left' | 'right' | undefined>(undefined);

interface DockableWindowProps {
  id: string;
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  initialX: number;
  initialY: number;
  initialWidth?: number;
  initialHeight?: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zIndex: number;
  onFocus: () => void;
  isMobile?: boolean;
  inlinePopoverAnchor?: 'left' | 'right';
}

export const DockableWindow: React.FC<DockableWindowProps> = ({
  id,
  title,
  icon: IconComponent,
  isOpen,
  onClose,
  children,
  initialX,
  initialY,
  initialWidth = 340,
  initialHeight = 400,
  containerRef,
  zIndex,
  onFocus,
  isMobile = false,
  inlinePopoverAnchor: inlineAnchorProp,
}) => {
  const IconComp = IconComponent as any;
  const contextAnchor = useContext(AnchorContext);
  const inlinePopoverAnchor = inlineAnchorProp || contextAnchor;
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dockSide, setDockSide] = useState<'left' | 'right' | null>(null);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Sync with initial size changes or mobile status
  useEffect(() => {
    if (isMobile) {
      setIsMaximized(true);
      setDockSide(null);
    } else {
      setIsMaximized(false);
      setPosition({ x: initialX, y: initialY });
      setSize({ width: initialWidth, height: initialHeight });
    }
  }, [isMobile, initialX, initialY, initialWidth, initialHeight]);

  // Handle Dragging Constraint limit
  const handleDragEnd = (event: any, info: any) => {
    if (isMaximized || dockSide) return;
    const newX = position.x + info.delta.x;
    const newY = position.y + info.delta.y;
    setPosition({ x: newX, y: newY });
  };

  // Toggle maximize
  const toggleMaximize = () => {
    if (dockSide) setDockSide(null);
    setIsMaximized(!isMaximized);
    if (isMinimized) setIsMinimized(false);
    onFocus();
  };

  // Toggle minimize (collapse content but keep titlebar at bottom or as tiny bubble)
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (isMaximized) setIsMaximized(false);
    onFocus();
  };

  // Dock Left
  const dockLeft = () => {
    if (dockSide === 'left') {
      setDockSide(null);
    } else {
      setDockSide('left');
      setIsMaximized(false);
      setIsMinimized(false);
    }
    onFocus();
  };

  // Dock Right
  const dockRight = () => {
    if (dockSide === 'right') {
      setDockSide(null);
    } else {
      setDockSide('right');
      setIsMaximized(false);
      setIsMinimized(false);
    }
    onFocus();
  };

  // Dynamic Styles base on window state
  const getWindowStateClassesAndStyles = () => {
    if (isMobile) {
      return {
        classes: "fixed inset-0 z-[100] w-full h-full rounded-none bg-slate-950/98",
        style: { zIndex: 9999 }
      };
    }

    if (isMaximized) {
      return {
        classes: "absolute inset-4 z-40 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-sky-500/30 shadow-2xl overflow-hidden shadow-black/90",
        style: { zIndex }
      };
    }

    if (dockSide === 'left') {
      return {
        classes: "absolute left-4 top-16 bottom-16 w-[360px] max-w-[25%] z-35 rounded-2xl bg-slate-900/90 backdrop-blur-xl border-r border border-sky-500/20 shadow-xl overflow-hidden shadow-black/80",
        style: { zIndex }
      };
    }

    if (dockSide === 'right') {
      return {
        classes: "absolute right-4 top-16 bottom-16 w-[360px] max-w-[25%] z-35 rounded-2xl bg-slate-900/90 backdrop-blur-xl border-l border border-sky-500/20 shadow-xl overflow-hidden shadow-black/80",
        style: { zIndex }
      };
    }

    // Default Floating Free State
    return {
      classes: `absolute rounded-2xl bg-[#0c1322]/80 backdrop-blur-md border border-slate-700/40 shadow-2xl overflow-hidden group hover:border-slate-650 transition-colors duration-150`,
      style: {
        x: position.x,
        y: position.y,
        width: size.width,
        height: isMinimized ? 'auto' : size.height,
        zIndex
      }
    };
  };

  const winConfig = getWindowStateClassesAndStyles();

  // Resize Window drag handler
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isMaximized || dockSide || isMinimized) return;
    e.preventDefault();
    e.stopPropagation();
    
    const startWidth = size.width;
    const startHeight = size.height;
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      setSize({
        width: Math.max(280, startWidth + deltaX),
        height: Math.max(160, startHeight + deltaY)
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  if (inlinePopoverAnchor) {
    return (
      <div 
        className={`absolute top-6 flex flex-col w-[320px] max-h-[70vh] rounded-2xl bg-[#0c1322]/95 backdrop-blur-2xl border border-slate-700/80 shadow-2xl overflow-hidden z-50 animate-in fade-in duration-200 shadow-black/80 ${
          inlinePopoverAnchor === 'left' ? 'left-[4.5rem] slide-in-from-left-4' : 'right-[4.5rem] slide-in-from-right-4'
        }`}
        style={{ zIndex: 100 }}
      >
        <div className="relative h-10 shrink-0 bg-[#111928]/90 border-b border-slate-800/80 px-3 flex items-center justify-between text-white" dir="rtl">
          <div className="flex items-center gap-2">
            {IconComp && <IconComp className="w-4 h-4 text-sky-400 shrink-0" />}
            <span className="text-[11px] font-black text-slate-100">{title}</span>
          </div>
          <button 
             onClick={onClose}
             className="p-1 hover:bg-rose-900/50 rounded-lg text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
             <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto max-h-[calc(70vh-40px)] relative custom-scrollbar pointer-events-auto" dir="rtl">
          {children}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={windowRef}
      id={`floating-window-${id}`}
      className={`${winConfig.classes} flex flex-col`}
      style={winConfig.style}
      onMouseDown={onFocus}
      initial={isMobile ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      dir="rtl"
    >
      {/* WINDOW TITLE BAR */}
      <motion.div 
        className="drag-handle relative h-10 shrink-0 bg-[#111928]/90 border-b border-slate-800/80 px-3 flex items-center justify-between select-none cursor-grab active:cursor-grabbing text-slate-300 hover:text-white transition-colors"
        onMouseDown={onFocus}
        // Use Framer Motion attributes for dragging when floating
        {...(!isMaximized && !dockSide && !isMobile ? {
          drag: true,
          dragListener: true,
          dragMomentum: false,
          dragElastic: 0.05,
          onDrag: handleDragEnd,
          dragControls: undefined // Let motion take care
        } : {})}
      >
        <div className="flex items-center gap-2 max-w-[50%]">
          {IconComp && <IconComp className="w-4 h-4 text-sky-400 shrink-0" />}
          <span className="text-[11px] font-black truncate text-slate-100 font-sans">{title}</span>
          
          {dockSide && (
            <Badge color="blue" className="px-1 py-0 px-1 text-[7px] bg-sky-950 text-indigo-400 border border-sky-900/40">
              داک شده
            </Badge>
          )}
          {isMaximized && (
            <Badge color="purple" className="px-1 py-0 px-1 text-[7px] bg-purple-950 text-purple-400 border border-purple-900/40">
              تمام صفحه
            </Badge>
          )}
        </div>

        {/* WINDOW CONTROLS WINDOW BTNS */}
        <div className="flex items-center gap-1.5 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
          {!isMobile && (
            <>
              {/* Dock Left Button */}
              <button 
                onClick={dockLeft}
                className={`p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-sky-400 transition-all ${dockSide === 'left' ? 'text-sky-400 bg-slate-900' : ''}`}
                title="اتصال به چپ (Dock Left)"
              >
                <ArrowRight className="w-3 h-3" />
              </button>

              {/* Dock Right Button */}
              <button 
                onClick={dockRight}
                className={`p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-sky-400 transition-all ${dockSide === 'right' ? 'text-sky-400 bg-slate-900' : ''}`}
                title="اتصال به راست (Dock Right)"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>

              {/* Minimize/Collapse Button */}
              <button 
                onClick={toggleMinimize}
                className={`p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-amber-400 transition-all ${isMinimized ? 'text-amber-400' : ''}`}
                title="کاهش حجم دیواره"
              >
                <Minus className="w-3 h-3" />
              </button>

              {/* Maximize Button */}
              <button 
                onClick={toggleMaximize}
                className={`p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-emerald-400 transition-all ${isMaximized ? 'text-emerald-400' : ''}`}
                title="تمام صفحه یا شناور"
              >
                {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Square className="w-3 h-3" />}
              </button>
            </>
          )}

          {/* Close Window Button */}
          <button 
            onClick={onClose}
            className="p-1 hover:bg-rose-600/25 rounded text-slate-550 hover:text-rose-400 transition-all"
            title="بستن پنجره"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* WINDOW CONTENT WRAPPER */}
      <AnimatePresence initial={false}>
        {!isMinimized && (
          <motion.div 
            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#090e18]/85 text-right select-text text-slate-300"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESIZE DRAG CORNER */}
      {!isMaximized && !dockSide && !isMinimized && !isMobile && (
        <div 
          ref={resizeRef}
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 left-0 w-3.5 h-3.5 cursor-nesw-resize bg-transparent hover:bg-sky-500/10 transition-colors flex items-center justify-center pointer-events-auto"
          title="تغییر ابعاد پنجره"
        >
          <svg width="6" height="6" viewBox="0 0 6 6" className="text-slate-500 fill-current opacity-60">
            <path d="M6,0 L0,6 L6,6 Z" />
          </svg>
        </div>
      )}
    </motion.div>
  );
};
