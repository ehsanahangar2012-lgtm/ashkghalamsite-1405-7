import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Layers, Layers3 } from 'lucide-react';

export interface LayerState {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  isLocked: boolean;
  type: string;
}

interface LayerManagerProps {
  layers: LayerState[];
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  layers,
  onToggleVisibility,
  onToggleLock,
}) => {
  return (
    <div className="space-y-3 font-sans" dir="rtl">
      <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2 mb-1">
        <Layers className="w-4 h-4 text-sky-400" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">مدیریت لایه‌های هولوگرام CAD</span>
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {layers.map((layer) => (
          <div 
            key={layer.id}
            className={`flex items-center justify-between p-2 rounded-lg border transition-all ${layer.isVisible ? 'bg-slate-900/30 border-slate-850' : 'bg-slate-950/40 border-slate-950 opacity-40'}`}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full border border-black/35"
                style={{ backgroundColor: layer.color }}
              />
              <span className={`text-[10px] font-bold ${layer.isVisible ? 'text-slate-200' : 'text-slate-500'}`}>
                {layer.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Visibility Toggle */}
              <button
                onClick={() => onToggleVisibility(layer.id)}
                className={`p-1.5 rounded-md hover:bg-slate-800/80 transition-colors ${layer.isVisible ? 'text-sky-400' : 'text-slate-500'}`}
                title={layer.isVisible ? 'پنهان‌سازی لایه' : 'نمایش لایه'}
              >
                {layer.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>

              {/* Lock Toggle */}
              <button
                onClick={() => onToggleLock(layer.id)}
                className={`p-1.5 rounded-md hover:bg-slate-800/80 transition-colors ${layer.isLocked ? 'text-rose-400' : 'text-slate-500'}`}
                title={layer.isLocked ? 'باز کردن قفل' : 'قفل کردن لایه'}
              >
                {layer.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-[7.5px] text-slate-500 flex justify-between px-1 border-t border-slate-850 pt-2 font-mono">
        <span>تعداد لایه‌ها: {layers.length} لایه پویا</span>
        <span>استاندارد لیتوگرافی: CMYK Vector</span>
      </div>
    </div>
  );
};
