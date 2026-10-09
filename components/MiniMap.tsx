import React from 'react';

interface MiniMapProps {
  cuts: string[];
  creases: string[];
  dielineBounds: { xMin: number; xMax: number; totalW: number; totalH: number };
  pan: { x: number; y: number };
  zoomScale: number;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  cuts,
  creases,
  dielineBounds,
  pan,
  zoomScale,
}) => {
  // Pad the viewport bounds
  const mapWidth = 120;
  const mapHeight = 100;

  const pad = 20;
  const scaleX = (mapWidth - pad) / (dielineBounds.totalW || 1);
  const scaleY = (mapHeight - pad) / (dielineBounds.totalH || 1);
  const scale = Math.min(scaleX, scaleY) || 0.2;

  // Center alignment offset
  const tx = (mapWidth - dielineBounds.totalW * scale) / 2 - dielineBounds.xMin * scale;
  const ty = (mapHeight - dielineBounds.totalH * scale) / 2 - ((dielineBounds as any).yMin || 0) * scale;

  return (
    <div className="absolute bottom-16 left-6 z-30 w-36 h-32 bg-[#080d19]/90 backdrop-blur border border-slate-800 rounded-xl shadow-xl p-1 select-none pointer-events-auto flex flex-col items-center justify-between">
      <span className="text-[7.5px] font-bold text-sky-400/80 font-mono tracking-wider uppercase mb-0.5">MINI-MAP NAVIGATOR</span>
      <div className="w-full flex-1 relative bg-[#04060b] rounded border border-slate-900/60 overflow-hidden">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className="w-full h-full"
        >
          {/* Slices of dielines scaled down */}
          <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
            {/* Creases */}
            {creases.map((c, i) => (
              <path key={`m-crease-${i}`} d={c} stroke="#10b981" strokeWidth="2.5" strokeDasharray="5,5" fill="none" opacity="0.4" />
            ))}
            {/* Cuts */}
            {cuts.map((c, i) => (
              <path key={`m-cut-${i}`} d={c} stroke="#38bdf8" strokeWidth="4" fill="none" opacity="0.6" />
            ))}
          </g>

          {/* Canvas viewport simulated window block */}
          {/* We show where the current view center is */}
          <circle 
            cx={mapWidth / 2} 
            cy={mapHeight / 2} 
            r="8" 
            fill="none" 
            stroke="#ef4444" 
            strokeWidth="0.8" 
            className="animate-ping" 
          />
          <circle 
            cx={mapWidth / 2} 
            cy={mapHeight / 2} 
            r="2" 
            fill="#ef4444" 
          />
        </svg>
      </div>
      <div className="text-[7px] text-slate-500 font-mono flex justify-between w-full px-1.5 mt-0.5">
        <span>zoom: {Math.round(zoomScale * 100)}%</span>
        <span>x: {Math.round(pan.x)}, y: {Math.round(pan.y)}</span>
      </div>
    </div>
  );
};
