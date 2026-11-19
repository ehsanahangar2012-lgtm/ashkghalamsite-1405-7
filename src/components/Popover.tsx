import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface PopoverTriggerProps {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  ariaProps: {
    'aria-expanded': boolean;
    'aria-haspopup': 'dialog' | 'menu';
    'aria-controls': string;
  };
}

export interface PopoverProps {
  title?: string;
  align?: 'start' | 'end';
  panelClassName?: string;
  renderTrigger: (ctx: PopoverTriggerProps) => React.ReactNode;
  children: (ctx: { close: () => void }) => React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

const COMPACT_BREAKPOINT_PX = 1024;

function detectCompactOrTouchViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const isNarrow = window.innerWidth < COMPACT_BREAKPOINT_PX;
  const isCoarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return isNarrow || isCoarse;
}

export const Popover: React.FC<PopoverProps> = ({
  title,
  align = 'end',
  panelClassName = 'w-64',
  renderTrigger,
  children,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompactModal, setIsCompactModal] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; maxWidth: number }>({
    top: 0,
    left: 0,
    maxWidth: 320,
  });

  const popoverId = useId();
  const triggerWrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const setOpenState = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setIsOpen((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        if (resolved !== prev) {
          onOpenChange?.(resolved);
        }
        return resolved;
      });
    },
    [onOpenChange]
  );

  const open = useCallback(() => setOpenState(true), [setOpenState]);
  const close = useCallback(() => setOpenState(false), [setOpenState]);
  const toggle = useCallback(() => setOpenState((prev) => !prev), [setOpenState]);

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const compact = detectCompactOrTouchViewport();
    setIsCompactModal(compact);
    if (compact || !triggerWrapperRef.current) return;

    const rect = triggerWrapperRef.current.getBoundingClientRect();
    const panelWidth = panelRef.current?.offsetWidth || 256;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;

    let left = align === 'end' ? rect.right - panelWidth : rect.left;
    left = Math.max(margin, Math.min(left, vw - panelWidth - margin));

    const panelHeight = panelRef.current?.offsetHeight || 280;
    let top = rect.bottom + 8;
    if (top + panelHeight > vh - margin && rect.top - panelHeight - 8 > margin) {
      top = rect.top - panelHeight - 8;
    }

    setCoords({
      top: Math.max(margin, top),
      left,
      maxWidth: vw - margin * 2,
    });
  }, [align]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    const handleReposition = () => updatePosition();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition, { passive: true });
    window.addEventListener('scroll', handleReposition, { passive: true, capture: true });

    let prevOverflow = '';
    if (detectCompactOrTouchViewport()) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, { capture: true });
      if (prevOverflow !== undefined && detectCompactOrTouchViewport()) {
        document.body.style.overflow = prevOverflow;
      } else if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [isOpen, close, updatePosition]);

  return (
    <>
      <div ref={triggerWrapperRef} className="inline-flex items-center touch-manipulation">
        {renderTrigger({
          isOpen,
          toggle,
          open,
          close,
          ariaProps: {
            'aria-expanded': isOpen,
            'aria-haspopup': isCompactModal ? 'dialog' : 'menu',
            'aria-controls': popoverId,
          },
        })}
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          isCompactModal ? (
            /* Centralized Modal Presentation on Mobile / Touch Viewports to eliminate touch-bleed */
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title || 'منو'}
              id={popoverId}
              dir="rtl"
              onClick={(e) => {
                if (e.target === e.currentTarget) close();
              }}
              className="fixed inset-0 z-[120] bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center p-4 touch-manipulation font-sans"
            >
              <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-right"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {title || 'انتخاب ابزار'}
                  </span>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="بستن"
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2.5 space-y-1 max-h-[70dvh] overflow-y-auto">
                  {children({ close })}
                </div>
              </div>
            </div>
          ) : (
            /* Desktop Anchored Popover with Portal Dismiss Backdrop */
            <>
              <div
                aria-hidden="true"
                onPointerDown={(e) => {
                  e.preventDefault();
                  close();
                }}
                className="fixed inset-0 z-[119] bg-transparent"
              />
              <div
                ref={panelRef}
                id={popoverId}
                role="menu"
                dir="rtl"
                style={{
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  maxWidth: `${coords.maxWidth}px`,
                }}
                className={`fixed z-[120] ${panelClassName} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 space-y-1 text-right font-sans`}
              >
                {children({ close })}
              </div>
            </>
          ),
          document.body
        )}
    </>
  );
};
