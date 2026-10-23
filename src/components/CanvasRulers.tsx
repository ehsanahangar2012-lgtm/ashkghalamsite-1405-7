import React, { useMemo } from 'react';

interface CanvasRulersProps {
  pan: { x: number; y: number };
  zoomScale: number;
  canvasWidth: number;
  canvasHeight: number;
  cursorPos: { x: number; y: number } | null;
  dielineBounds: { xMin: number; xMax: number; yMin: number; yMax: number };
}

export const CanvasRulers: React.FC<CanvasRulersProps> = ({
  pan,
  zoomScale,
  canvasWidth,
  canvasHeight,
  cursorPos,
  dielineBounds,
}) => {
  const rulerSize = 24; // Depth of ruler bar in pixels

  // Horizontal ticks calculation
  const horizontalRulerTicks = useMemo(() => {
    const ticks: { x: number; label: string; isMajor: boolean }[] = [];
    
    // We want to calculate coordinate markers starting from dieline bounds center
    // Let's determine step base on zoom scale
    let step = 10; // mm
    if (zoomScale < 0.25) step = 100;
    else if (zoomScale < 0.8) step = 50;
    else if (zoomScale > 3.0) step = 2;
    else if (zoomScale > 6.0) step = 0.5;

    const startX = Math.round((dielineBounds.xMin - 1600) / step) * step;
    const endX = Math.round((dielineBounds.xMax + 1600) / step) * step;

    for (let coord = startX; coord <= endX; coord += step) {
      // Convert millimeter CAD coordinate to screen pixels
      // Pixel = (coord) * zoomScale + center + pan
      const pixelX = coord * zoomScale + canvasWidth / 2 + pan.x;
      if (pixelX >= rulerSize && pixelX <= canvasWidth) {
        const isMajor = coord % (step * 5) === 0;
        const label = isMajor ? `${Math.round(coord)}` : '';
        ticks.push({ x: pixelX, label, isMajor });
      }
    }

    return ticks;
  }, [pan.x, zoomScale, canvasWidth, dielineBounds.xMin, dielineBounds.xMax]);

  // Vertical ticks calculation
  const verticalRulerTicks = useMemo(() => {
    const ticks: { y: number; label: string; isMajor: boolean }[] = [];
    
    let step = 10; // mm
    if (zoomScale < 0.25) step = 100;
    else if (zoomScale < 0.8) step = 50;
    else if (zoomScale > 3.0) step = 2;
    else if (zoomScale > 6.0) step = 0.5;

    const startY = Math.round((dielineBounds.yMin - 1600) / step) * step;
    const endY = Math.round((dielineBounds.yMax + 1600) / step) * step;

    for (let coord = startY; coord <= endY; coord += step) {
      const pixelY = coord * zoomScale + canvasHeight / 2 + pan.y;
      if (pixelY >= rulerSize && pixelY <= canvasHeight) {
        const isMajor = coord % (step * 5) === 0;
        const label = isMajor ? `${Math.round(coord)}` : '';
        ticks.push({ y: pixelY, label, isMajor });
      }
    }

    return ticks;
  }, [pan.y, zoomScale, canvasHeight, dielineBounds.yMin, dielineBounds.yMax]);

  // Track pointer values converting screen pixels back to millimeter coordinates
  const pointerVal = useMemo(() => {
    if (!cursorPos) return null;
    return {
      x: cursorPos.x * zoomScale + canvasWidth / 2 + pan.x,
      y: cursorPos.y * zoomScale + canvasHeight / 2 + pan.y,
    };
  }, [cursorPos, zoomScale, canvasWidth, canvasHeight, pan]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[25] select-none text-[8px] font-mono font-bold text-slate-400">
      {/* Corner Intersection Block */}
      <div 
        className="absolute left-0 top-0 bg-[#090d14]/95 border-b border-r border-slate-800/80 z-[28] flex items-center justify-center text-[7.5px] text-sky-400"
        style={{ width: rulerSize, height: rulerSize }}
      >
        mm
      </div>

      {/* HORIZONTAL RULER */}
      <div 
        className="absolute top-0 right-0 left-0 bg-[#070a10]/90 backdrop-blur border-b border-slate-800/60 z-[26]" 
        style={{ height: rulerSize, paddingLeft: rulerSize }}
      >
        <svg width="100%" height="100%" className="w-full h-full">
          {horizontalRulerTicks.map((t, idx) => (
            <g key={`h-tick-${idx}`} transform={`translate(${t.x - rulerSize}, 0)`}>
              <line 
                x1="0" 
                y1={t.isMajor ? "10" : "16"} 
                x2="0" 
                y2="24" 
                stroke="#334155" 
                strokeWidth={t.isMajor ? "1" : "0.5"} 
              />
              {t.label && (
                <text x="3" y="11" fill="#475569" className="text-[7.5px]">{t.label}</text>
              )}
            </g>
          ))}
          
          {/* Active Hover Cursor Overlay Tick */}
          {pointerVal && pointerVal.x >= rulerSize && (
            <line 
              x1={pointerVal.x - rulerSize} 
              y1="0" 
              x2={pointerVal.x - rulerSize} 
              y2="24" 
              stroke="#ef4444" 
              strokeWidth="0.8" 
              opacity="0.8"
            />
          )}
        </svg>
      </div>

      {/* VERTICAL RULER */}
      <div 
        className="absolute left-0 top-0 bottom-0 bg-[#070a10]/90 backdrop-blur border-r border-slate-800/60 z-[26]" 
        style={{ width: rulerSize, paddingTop: rulerSize }}
      >
        <svg width="100%" height="100%" className="w-full h-full">
          {verticalRulerTicks.map((t, idx) => (
            <g key={`v-tick-${idx}`} transform={`translate(0, ${t.y - rulerSize})`}>
              <line 
                x1={t.isMajor ? "10" : "16"} 
                y1="0" 
                x2="24" 
                y2="0" 
                stroke="#334155" 
                strokeWidth={t.isMajor ? "1" : "0.5"} 
              />
              {t.label && (
                <text 
                  x="3" 
                  y="-2" 
                  fill="#475569" 
                  transform={`rotate(-90 3 -2)`} 
                  className="text-[7.5px]"
                >
                  {t.label}
                </text>
              )}
            </g>
          ))}

          {/* Active Hover Cursor Overlay Tick */}
          {pointerVal && pointerVal.y >= rulerSize && (
            <line 
              x1="0" 
              y1={pointerVal.y - rulerSize} 
              x2="24" 
              y2={pointerVal.y - rulerSize} 
              stroke="#ef4444" 
              strokeWidth="0.8" 
              opacity="0.8"
            />
          )}
        </svg>
      </div>
    </div>
  );
};
