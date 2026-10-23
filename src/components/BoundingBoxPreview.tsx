import React from 'react';

interface BoundingBoxPreviewProps {
  L: number;
  W: number;
  H: number;
}

export const BoundingBoxPreview: React.FC<BoundingBoxPreviewProps> = ({ L, W, H }) => {
  // Normalize dimensions to fit within the preview pane (say 120x120px area)
  const maxDim = Math.max(L, W, H);
  const scale = maxDim > 0 ? 80 / maxDim : 1;

  const sL = L * scale;
  const sW = W * scale;
  const sH = H * scale;

  // Isometric projection angles
  const angle = Math.PI / 6; // 30 degrees
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Projection vectors
  const pXx = -cos;
  const pXy = sin;
  
  const pYx = cos;
  const pYy = sin;
  
  const pZx = 0;
  const pZy = -1;

  // Center the drawing
  const cx = 100;
  const cy = 90 + (sH * 0.5);

  const points = {
    A: { x: cx, y: cy }, // Front bottom corner
    B: { x: cx + pXx * sL, y: cy + pXy * sL }, // Left bottom
    C: { x: cx + pYx * sW, y: cy + pYy * sW }, // Right bottom
    D: { x: cx + pXx * sL + pYx * sW, y: cy + pXy * sL + pYy * sW }, // Back bottom
    E: { x: cx + pZx * sH, y: cy + pZy * sH }, // Front top
    F: { x: cx + pXx * sL + pZx * sH, y: cy + pXy * sL + pZy * sH }, // Left top
    G: { x: cx + pYx * sW + pZx * sH, y: cy + pYy * sW + pZy * sH }, // Right top
    H_point: { x: cx + pXx * sL + pYx * sW + pZx * sH, y: cy + pXy * sL + pYy * sW + pZy * sH }, // Back top
  };

  return (
    <div className="w-full flex justify-center py-2 bg-[#040608] rounded-xl border border-slate-800/80 my-3 relative overflow-hidden group">
      <div className="absolute top-1 right-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest">Live Schema</div>
      <svg width={200} height={140} viewBox="0 0 200 140" className="opacity-90">
        <defs>
          <linearGradient id="frontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6}/>
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="rightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#172554" stopOpacity={0.4}/>
          </linearGradient>
          <linearGradient id="topGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.7}/>
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.3}/>
          </linearGradient>
        </defs>

        {/* Back lines (dashed) */}
        <polyline points={`${points.B.x},${points.B.y} ${points.D.x},${points.D.y} ${points.C.x},${points.C.y}`} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={points.D.x} y1={points.D.y} x2={points.H_point.x} y2={points.H_point.y} stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />

        {/* Top face */}
        <polygon 
          points={`${points.E.x},${points.E.y} ${points.G.x},${points.G.y} ${points.H_point.x},${points.H_point.y} ${points.F.x},${points.F.y}`} 
          fill="url(#topGrad)" 
          stroke="#7dd3fc" 
          strokeWidth="1" 
          strokeLinejoin="round" 
        />
        
        {/* Right face */}
        <polygon 
          points={`${points.A.x},${points.A.y} ${points.C.x},${points.C.y} ${points.G.x},${points.G.y} ${points.E.x},${points.E.y}`} 
          fill="url(#rightGrad)" 
          stroke="#0ea5e9" 
          strokeWidth="1" 
          strokeLinejoin="round" 
        />
        
        {/* Front/Left face */}
        <polygon 
          points={`${points.A.x},${points.A.y} ${points.B.x},${points.B.y} ${points.F.x},${points.F.y} ${points.E.x},${points.E.y}`} 
          fill="url(#frontGrad)" 
          stroke="#bae6fd" 
          strokeWidth="1" 
          strokeLinejoin="round" 
        />

        {/* Labels */}
        <text 
          x={(points.A.x + points.B.x)/2 - 15} 
          y={(points.A.y + points.B.y)/2 + 10} 
          fill="#94a3b8" 
          fontSize="8" 
          fontWeight="bold" 
          fontFamily="monospace"
        >
          L:{L}
        </text>
        <text 
          x={(points.A.x + points.C.x)/2 + 5} 
          y={(points.A.y + points.C.y)/2 + 10} 
          fill="#94a3b8" 
          fontSize="8" 
          fontWeight="bold" 
          fontFamily="monospace"
        >
          W:{W}
        </text>
        <text 
          x={points.A.x - 20} 
          y={(points.A.y + points.E.y)/2 + 3} 
          fill="#94a3b8" 
          fontSize="8" 
          fontWeight="bold" 
          fontFamily="monospace"
        >
          H:{H}
        </text>
      </svg>
    </div>
  );
};
