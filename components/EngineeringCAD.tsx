import React, { useState, useEffect } from 'react';
import { useCadStore } from '../store/useCadStore';
import { CanvasRulers } from './CanvasRulers';
import { PropertyInspector } from './PropertyInspector';
import { Box, Layers, MousePointer2, Save, Download } from 'lucide-react';

export const EngineeringCAD = () => {
  const { dimensions, material, activeStandard, setDimensions } = useCadStore();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  return (
    <div className="h-screen w-screen fixed inset-0 z-50 bg-[#1e1e1e] flex overflow-hidden text-slate-300 font-sans" dir="rtl">
      
      {/* Dockable Toolbar / Side Panel */}
      <div className="w-16 md:w-20 bg-[#2d2d2d] border-l border-[#3a3a3a] flex flex-col items-center py-4 gap-6 shrink-0 z-10 shadow-xl">
        <button className="bg-sky-600 hover:bg-sky-500 text-white p-3 rounded-xl transition-all shadow-lg hover:shadow-sky-500/20" title="ذخیره پروژه">
          <Save className="w-5 h-5" />
        </button>
        <div className="w-8 h-[1px] bg-[#444]" />
        <button className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-[#3a3a3a] transition-all" title="ابزار انتخاب">
          <MousePointer2 className="w-5 h-5" />
        </button>
        <button className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-[#3a3a3a] transition-all" title="مدیریت لایه‌ها">
          <Layers className="w-5 h-5" />
        </button>
        <button className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-[#3a3a3a] transition-all" title="مدل‌های استاندارد">
          <Box className="w-5 h-5" />
        </button>
        <div className="mt-auto">
          <button className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-[#3a3a3a] transition-all" title="خروجی PDF/DXF">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Glass Canvas Area */}
      <div className="flex-1 relative bg-[#1e1e1e] overflow-hidden" 
           style={{ backgroundImage: 'radial-gradient(circle at 100% 100%, #2a2a2a 0%, #1e1e1e 100%)' }}>
        
        {/* Canvas Ruler & Work Area */}
        <div className="absolute inset-0">
           {/* Grid Background */}
           <div 
             className="absolute inset-0 pointer-events-none opacity-20"
             style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
               backgroundSize: '20px 20px',
               transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`
             }}
           />
           
           {/* Center Axes */}
           <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
              <div className="w-full h-[1px] bg-sky-500/50 absolute" />
              <div className="h-full w-[1px] bg-emerald-500/50 absolute" />
           </div>

           {/* Central Workspace Canvas Wrapper */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="relative bg-black/40 border border-white/10 shadow-2xl backdrop-blur-sm flex items-center justify-center pointer-events-auto transition-all"
                style={{
                  width: `${dimensions.L * 3}px`, 
                  height: `${dimensions.H * 3}px`,
                  transform: `scale(${scale})`
                }}
              >
                  {/* Drawing Simulation - Soft Engineering Contrast and Variable Outlines */}
                  <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                     {/* Outer Cut Path with reduced contrast and soft stroke-width */}
                     <rect x="0" y="0" width="100%" height="100%" fill="none" stroke="#475569" strokeWidth="1.3" strokeDasharray="4,4" opacity="0.65" />
                     <path d={`M0,0 L${dimensions.L},0 L${dimensions.L},${dimensions.W} L0,${dimensions.W} Z`} fill="none" stroke="#38bdf8" strokeWidth="1.6" className="animate-pulse" opacity="0.8" />
                     {/* Engineering overlay text */}
                     <text x="10" y="20" fill="#64748b" fontSize="12" fontFamily="monospace">FEFCO {activeStandard}</text>
                     <text x="10" y="40" fill="#64748b" fontSize="12" fontFamily="monospace">TOL: ±0.5mm</text>
                  </svg>
              </div>
           </div>

           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-32 text-center pointer-events-none">
              <p className="font-mono text-xs tracking-widest text-[#666] uppercase bg-[#1e1e1e] px-4 py-1 rounded-full border border-[#333]">Engineering CAD Workspace</p>
           </div>
        </div>

        {/* Floating Property Inspector */}
        <div className="absolute right-6 top-6 bottom-6 w-80 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col overscroll-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">بازرس ویژگی‌ها</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2 block">Standard Model</label>
              <div className="bg-[#1a1a1a] border border-white/5 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#252525] transition-colors">
                <span className="text-sm text-sky-400 font-mono">{activeStandard}</span>
                <span className="text-xs text-slate-400">تغییر</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2 block">Dimensions (mm)</label>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#1a1a1a] border border-white/5 p-2 rounded-xl text-center">
                  <span className="block text-[9px] text-slate-500 mb-1">L</span>
                  <input type="number" value={dimensions.L} className="w-full bg-transparent text-center text-sm font-bold text-white outline-none" onChange={(e) => setDimensions({...dimensions, L: Number(e.target.value)})} />
                </div>
                <div className="bg-[#1a1a1a] border border-white/5 p-2 rounded-xl text-center">
                  <span className="block text-[9px] text-slate-500 mb-1">W</span>
                  <input type="number" value={dimensions.W} className="w-full bg-transparent text-center text-sm font-bold text-white outline-none" onChange={(e) => setDimensions({...dimensions, W: Number(e.target.value)})} />
                </div>
                <div className="bg-[#1a1a1a] border border-white/5 p-2 rounded-xl text-center">
                  <span className="block text-[9px] text-slate-500 mb-1">H</span>
                  <input type="number" value={dimensions.H} className="w-full bg-transparent text-center text-sm font-bold text-white outline-none" onChange={(e) => setDimensions({...dimensions, H: Number(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
