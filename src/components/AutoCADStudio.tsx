import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, DragEvent } from 'react';
import { Upload, X, MousePointer2, Hand, Layers, Settings, Maximize2, Minimize2, ZoomIn, ZoomOut, Download, Plus, Trash2, Command, Circle, Square, Minus, Move, Undo, Redo, RotateCw, Grid3X3, Type, FileDown, Image as ImageIcon, FileType2 } from 'lucide-react';
import DxfParser from 'dxf-parser';

type Point = { x: number, y: number, bulge?: number };

type Entity = {
  id: string;
  type: 'LINE' | 'CIRCLE' | 'RECT' | 'LWPOLYLINE' | 'TEXT' | 'ARC';
  layer: string;
  color?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
  text?: string;
  startAngle?: number;
  endAngle?: number;
  vertices?: Point[];
  shape?: boolean;
  selected?: boolean;
};

const transformEntity = (ent: Entity, tx: number, ty: number, sx: number, sy: number): Entity => {
  const transformPt = (p: Point) => ({ x: p.x * sx + tx, y: p.y * sy + ty, bulge: p.bulge });
  const avgS = (Math.abs(sx) + Math.abs(sy)) / 2;
  
  if (ent.type === 'LINE' || ent.type === 'RECT') {
    const p1 = transformPt({x: ent.x1!, y: ent.y1!});
    const p2 = transformPt({x: ent.x2!, y: ent.y2!});
    return { ...ent, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  }
  if (ent.type === 'CIRCLE' || ent.type === 'ARC') {
    const p = transformPt({x: ent.cx!, y: ent.cy!});
    return { ...ent, cx: p.x, cy: p.y, r: ent.r! * avgS }; 
  }
  if (ent.type === 'TEXT') {
    const p = transformPt({x: ent.x1!, y: ent.y1!});
    return { ...ent, x1: p.x, y1: p.y };
  }
  if (ent.type === 'LWPOLYLINE' && ent.vertices) {
    return { ...ent, vertices: ent.vertices.map(v => transformPt(v)) };
  }
  return ent;
};

const calculateExtents = (ents: Entity[]) => {
  if (ents.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  ents.forEach(ent => {
    if (ent.type === 'LINE' || ent.type === 'RECT') {
      minX = Math.min(minX, ent.x1||0, ent.x2||0); maxX = Math.max(maxX, ent.x1||0, ent.x2||0);
      minY = Math.min(minY, ent.y1||0, ent.y2||0); maxY = Math.max(maxY, ent.y1||0, ent.y2||0);
    } else if (ent.type === 'CIRCLE' || ent.type === 'ARC') {
      minX = Math.min(minX, (ent.cx||0) - (ent.r||0)); maxX = Math.max(maxX, (ent.cx||0) + (ent.r||0));
      minY = Math.min(minY, (ent.cy||0) - (ent.r||0)); maxY = Math.max(maxY, (ent.cy||0) + (ent.r||0));
    } else if (ent.type === 'LWPOLYLINE' && ent.vertices) {
      ent.vertices.forEach(v => {
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      });
    } else if (ent.type === 'TEXT') {
      minX = Math.min(minX, ent.x1||0); maxX = Math.max(maxX, (ent.x1||0) + 10);
      minY = Math.min(minY, ent.y1||0); maxY = Math.max(maxY, (ent.y1||0) + 10);
    }
  });
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
};

const flattenDXF = (dxf: any): Entity[] => {
  const entities: Entity[] = [];
  let idCounter = 0;

  const parseEntity = (ent: any, transform: {x: number, y: number, scaleX: number, scaleY: number, rotation: number}, defaultLayer: string): Entity[] => {
    const layer = ent.layer || defaultLayer;
    const color = '#e2e8f0';
    
    const applyTransform = (p: Point) => {
      let x = p.x * transform.scaleX;
      let y = p.y * transform.scaleY;
      if (transform.rotation) {
        const rad = transform.rotation * Math.PI / 180;
        const s = Math.sin(rad);
        const c = Math.cos(rad);
        const nx = x * c - y * s;
        const ny = x * s + y * c;
        x = nx;
        y = ny;
      }
      x += transform.x;
      y += transform.y;
      return { x, y, bulge: p.bulge };
    };

    const base = { id: `ent-${Date.now()}-${idCounter++}`, layer, color };
    
    if (ent.type === 'LINE') {
      const p1 = applyTransform(ent.vertices[0]);
      const p2 = applyTransform(ent.vertices[1]);
      return [{ ...base, type: 'LINE', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }];
    } else if (ent.type === 'CIRCLE') {
      const p = applyTransform(ent.center);
      const r = ent.radius * Math.abs(transform.scaleX);
      return [{ ...base, type: 'CIRCLE', cx: p.x, cy: p.y, r }];
    } else if (ent.type === 'ARC') {
       const p = applyTransform(ent.center);
       const r = ent.radius * Math.abs(transform.scaleX);
       let startAngle = ent.startAngle + (transform.rotation * Math.PI / 180 || 0);
       let endAngle = ent.endAngle + (transform.rotation * Math.PI / 180 || 0);
       return [{ ...base, type: 'ARC', cx: p.x, cy: p.y, r, startAngle, endAngle }];
    } else if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
      const vertices = ent.vertices.map((v: any) => applyTransform(v));
      return [{ ...base, type: 'LWPOLYLINE', vertices, shape: ent.shape }];
    } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
      const p = applyTransform(ent.startPoint || {x:0, y:0});
      return [{ ...base, type: 'TEXT', x1: p.x, y1: p.y, text: ent.text }];
    } else if (ent.type === 'INSERT') {
      const block = dxf.blocks[ent.name];
      if (!block) return [];
      
      const newTransform = {
        x: transform.x + ent.position.x,
        y: transform.y + ent.position.y,
        scaleX: transform.scaleX * (ent.scale?.x || 1),
        scaleY: transform.scaleY * (ent.scale?.y || 1),
        rotation: transform.rotation + (ent.rotation || 0)
      };

      let blockEntities: Entity[] = [];
      block.entities.forEach((bEnt: any) => {
         blockEntities = blockEntities.concat(parseEntity(bEnt, newTransform, layer));
      });
      return blockEntities;
    }
    return [];
  };

  if (dxf.entities) {
    dxf.entities.forEach((ent: any) => {
       entities.push(...parseEntity(ent, {x:0, y:0, scaleX:1, scaleY:1, rotation:0}, '0'));
    });
  }
  
  return entities;
};

const ToolButton = ({ icon, active, onClick, disabled, title, text }: any) => (
  <button 
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={`p-1.5 rounded transition flex items-center justify-center gap-1.5 text-xs
      ${disabled ? 'opacity-30 cursor-not-allowed' : 
        active ? 'bg-blue-600 text-white shadow-inner' : 'text-slate-300 hover:bg-slate-700'}`}
  >
    {icon}
    {text && <span>{text}</span>}
  </button>
);

const PropInput = ({ label, value, onChange, type = 'number' }: { label: string, value?: any, onChange: (v: any) => void, type?: string }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="w-16 text-[10px] text-slate-400 font-mono uppercase truncate" title={label}>{label}</span>
    <input 
      type={type} 
      value={type === 'number' && typeof value === 'number' && !isNaN(value) ? Number(value.toFixed(2)) : (value === undefined || isNaN(value) ? '' : value)} 
      onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)} 
      className="flex-1 w-full bg-[#141419] border border-slate-700 text-white px-2 py-1 rounded outline-none focus:border-blue-500 text-xs font-mono"
    />
  </div>
);

export const AutoCADStudio = ({ onExit }: { onExit?: () => void }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [entities, setEntities] = useState<Entity[]>([]);
  const [previewEntities, setPreviewEntities] = useState<Entity[] | null>(null);
  
  const [history, setHistory] = useState<Entity[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'pan'|'move'|'resize'|null>(null);
  
  const [actionState, setActionState] = useState<{
    type: 'resize' | 'move' | 'pan';
    startPos: Point;
    startBounds?: {minX: number, minY: number, maxX: number, maxY: number};
    originalEntities?: Entity[];
    handle?: string;
  } | null>(null);
  
  const [selBox, setSelBox] = useState<{start: Point, end: Point} | null>(null);
  const [snapPoint, setSnapPoint] = useState<Point | null>(null);
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null);
  
  const [commandLine, setCommandLine] = useState('');
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Smart CAD Engine Active.', 'Tip: Drag to box-select, use handles to resize, or drag items to move.']);
  
  const [activeTool, setActiveTool] = useState('select'); 
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [layers, setLayers] = useState<string[]>(['0']);
  const [hiddenLayers, setHiddenLayers] = useState<string[]>([]);
  const [activeLayer, setActiveLayer] = useState('0');

  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);

  const [drawState, setDrawState] = useState<{ step: number, startPoint?: {x: number, y: number}, currentPoint?: {x: number, y: number} }>({ step: 0 });
  
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasBgColor = '#22222a'; 
  const defaultLineColor = '#e2e8f0';
  const selectedColor = '#3b82f6';

  const updateEntities = (newEntities: Entity[] | ((prev: Entity[]) => Entity[])) => {
    setEntities(prev => {
      const next = typeof newEntities === 'function' ? newEntities(prev) : newEntities;
      if (next === prev) return prev;
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(next);
      if (newHistory.length > 50) newHistory.shift();
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return next;
    });
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(i => i - 1);
      setEntities(history[historyIndex - 1]);
      addLog('Undo executed.');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(i => i + 1);
      setEntities(history[historyIndex + 1]);
      addLog('Redo executed.');
    }
  };

  const getMouseCoords = (e: ReactMouseEvent | globalThis.MouseEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left - pan.x) / zoom;
    let y = (e.clientY - rect.top - pan.y) / (-zoom); // Y IS NEGATIVE ZOOM TO POINT UP
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    return { x, y };
  };

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-49), msg]);

  const zoomExtents = (ents: Entity[] = entities) => {
    if (!containerRef.current) return;
    const { minX, minY, maxX, maxY } = calculateExtents(ents);
    let width = maxX - minX; let height = maxY - minY;
    if (width === 0) width = 100; if (height === 0) height = 100;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const padding = 60;
    const scaleX = (containerWidth - padding * 2) / width;
    const scaleY = (containerHeight - padding * 2) / height;
    const newZoom = Math.min(scaleX, scaleY, 50);

    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    const newPanX = (containerWidth / 2) - (centerX * newZoom);
    const newPanY = (containerHeight / 2) + (centerY * newZoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
    addLog('[SYSTEM] Zoom Extents applied.');
  };

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { addLog(`[ERROR] File size exceeds 5MB limit.`); return; }
    setFileName(file.name);
    addLog(`Loading ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parser = new DxfParser();
        const dxf = parser.parseSync(text);
        if (dxf && dxf.entities) {
          const parsedEntities = flattenDXF(dxf);
          setEntities(parsedEntities);
          setHistory([parsedEntities]);
          setHistoryIndex(0);
          addLog(`[SUCCESS] Loaded ${parsedEntities.length} entities.`);
          
          const layerSet = new Set<string>(['0']);
          parsedEntities.forEach(ent => layerSet.add(ent.layer));
          setLayers(Array.from(layerSet).sort());
          setTimeout(() => zoomExtents(parsedEntities), 100);
        } else {
          addLog('[WARNING] No entities found in file.');
        }
      } catch (err: any) {
        addLog(`[ERROR] DXF Parse Failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    if (!trimmed) return;
    addLog(`C:\> ${cmd}`);
    setCommandLine('');
    
    if (trimmed === 'clear') setLogs(['[SYSTEM] Terminal Cleared.']);
    else if (trimmed === 'z' || trimmed === 'zoom') zoomExtents();
    else if (trimmed === 'l' || trimmed === 'line') { setActiveTool('line'); setDrawState({step: 0}); addLog('Command: LINE. Specify first point:'); }
    else if (trimmed === 'c' || trimmed === 'circle') { setActiveTool('circle'); setDrawState({step: 0}); addLog('Command: CIRCLE. Specify center point:'); }
    else if (trimmed === 'rec' || trimmed === 'rect') { setActiveTool('rect'); setDrawState({step: 0}); addLog('Command: RECTANGLE. Specify first corner:'); }
    else if (trimmed === 'e' || trimmed === 'erase' || trimmed === 'delete') deleteSelected();
    else addLog(`Unknown command: "${cmd}". Try LINE, CIRCLE, RECT, ERASE, ZOOM.`);
  };

  const deleteSelected = () => {
    const count = entities.filter(e => e.selected).length;
    if (count > 0) {
      updateEntities(prev => prev.filter(e => !e.selected));
      addLog(`Deleted ${count} entities.`);
    }
  };

  const handleSvgMouseDown = (e: ReactMouseEvent) => {
    const rawCoords = getMouseCoords(e);
    const coords = snapPoint || rawCoords;
    const target = e.target as SVGElement;
    
    if (e.button === 1 || (e.button === 0 && activeTool === 'pan')) {
      setIsDragging(true); setDragType('pan');
      setActionState({ type: 'pan', startPos: { x: e.clientX - pan.x, y: e.clientY - pan.y } });
      return;
    }

    if (e.button !== 0) return; 

    if (activeTool === 'select') {
       const handle = target.getAttribute('data-handle');
       if (handle) {
          setActionState({
            type: 'resize',
            startPos: rawCoords,
            startBounds: calculateExtents(entities.filter(e => e.selected)),
            originalEntities: entities.filter(e => e.selected),
            handle
          });
          setIsDragging(true); setDragType('resize');
          return;
       }

       if (target.getAttribute('data-selected') === 'true') {
          setActionState({
            type: 'move',
            startPos: coords,
            originalEntities: entities.filter(e => e.selected)
          });
          setIsDragging(true); setDragType('move');
          return;
       }

       if (target.tagName === 'svg') {
          if (!e.shiftKey) updateEntities(prev => prev.map(ent => ({ ...ent, selected: false })));
          setSelBox({ start: coords, end: coords });
       }
       return;
    }

    if (activeTool === 'line' || activeTool === 'rect') {
      if (drawState.step === 0) {
        setDrawState({ step: 1, startPoint: coords, currentPoint: coords });
      } else if (drawState.step === 1 && drawState.startPoint) {
        const newEntity: Entity = {
          id: `ent-${Date.now()}`,
          type: activeTool === 'line' ? 'LINE' : 'RECT',
          layer: activeLayer,
          color: defaultLineColor,
          x1: drawState.startPoint.x, y1: drawState.startPoint.y,
          x2: coords.x, y2: coords.y
        };
        updateEntities(prev => [...prev, newEntity]);
        if (activeTool === 'line') setDrawState({ step: 1, startPoint: coords, currentPoint: coords });
        else { setDrawState({ step: 0 }); setActiveTool('select'); }
      }
    } else if (activeTool === 'circle') {
      if (drawState.step === 0) {
        setDrawState({ step: 1, startPoint: coords, currentPoint: coords });
      } else if (drawState.step === 1 && drawState.startPoint) {
        const r = Math.hypot(coords.x - drawState.startPoint.x, coords.y - drawState.startPoint.y);
        updateEntities(prev => [...prev, { id: `ent-${Date.now()}`, type: 'CIRCLE', layer: activeLayer, color: defaultLineColor, cx: drawState.startPoint!.x, cy: drawState.startPoint!.y, r }]);
        setDrawState({ step: 0 }); setActiveTool('select');
      }
    }
  };

  const handleSvgMouseMove = (e: ReactMouseEvent) => {
    const rawCoords = getMouseCoords(e);
    setCursorWorld(rawCoords);

    if (isDragging && actionState) {
       if (actionState.type === 'pan') {
         setPan({ x: e.clientX - actionState.startPos.x, y: e.clientY - actionState.startPos.y });
         return;
       }
       
       if (actionState.type === 'resize' && actionState.startBounds && actionState.originalEntities) {
          const b = actionState.startBounds;
          let nx = b.minX, ny = b.minY, nX = b.maxX, nY = b.maxY;
          const dx = rawCoords.x - actionState.startPos.x;
          const dy = rawCoords.y - actionState.startPos.y;

          if (actionState.handle!.includes('w')) nx += dx;
          if (actionState.handle!.includes('e')) nX += dx;
          if (actionState.handle!.includes('s')) ny += dy;
          if (actionState.handle!.includes('n')) nY += dy;

          if (nx > nX - 0.1) { if (actionState.handle!.includes('w')) nx = nX - 0.1; else nX = nx + 0.1; }
          if (ny > nY - 0.1) { if (actionState.handle!.includes('s')) ny = nY - 0.1; else nY = ny + 0.1; }

          const sx = (nX - nx) / (b.maxX - b.minX || 1);
          const sy = (nY - ny) / (b.maxY - b.minY || 1);
          const tx = nx - b.minX * sx;
          const ty = ny - b.minY * sy;

          const previews = actionState.originalEntities.map(ent => transformEntity(ent, tx, ty, sx, sy));
          setPreviewEntities(previews);
          return;
       }
       
       if (actionState.type === 'move' && actionState.originalEntities) {
          const coords = snapPoint || rawCoords;
          const dx = coords.x - actionState.startPos.x;
          const dy = coords.y - actionState.startPos.y;
          const previews = actionState.originalEntities.map(ent => transformEntity(ent, dx, dy, 1, 1));
          setPreviewEntities(previews);
          return;
       }
    }

    if (selBox) {
      setSelBox({ ...selBox, end: rawCoords });
      return;
    }

    let newSnapPoint = null;
    if (activeTool !== 'pan') {
      const threshold = 15 / zoom;
      let minD = Infinity;
      entities.forEach(ent => {
         const pts: Point[] = [];
         if (ent.type === 'LINE' || ent.type === 'RECT') pts.push({x: ent.x1!, y: ent.y1!}, {x: ent.x2!, y: ent.y2!});
         if (ent.type === 'LWPOLYLINE' && ent.vertices) ent.vertices.forEach(v => pts.push(v));
         if (ent.type === 'CIRCLE' || ent.type === 'ARC') pts.push({x: ent.cx!, y: ent.cy!});
         pts.forEach(p => {
           const d = Math.hypot(p.x - rawCoords.x, p.y - rawCoords.y);
           if (d < threshold && d < minD) { minD = d; newSnapPoint = p; }
         });
      });
    }
    setSnapPoint(newSnapPoint);
    if (drawState.step === 1) setDrawState(prev => ({ ...prev, currentPoint: newSnapPoint || rawCoords }));
  };

  const handleSvgMouseUp = () => {
    if (isDragging && actionState && previewEntities) {
       updateEntities(prev => prev.map(ent => {
          const p = previewEntities.find(pe => pe.id === ent.id);
          return p ? { ...p, selected: true } : ent;
       }));
    }

    setIsDragging(false);
    setDragType(null);
    setActionState(null);
    setPreviewEntities(null);

    if (selBox) {
       const minX = Math.min(selBox.start.x, selBox.end.x);
       const maxX = Math.max(selBox.start.x, selBox.end.x);
       const minY = Math.min(selBox.start.y, selBox.end.y);
       const maxY = Math.max(selBox.start.y, selBox.end.y);
       const isCrossing = selBox.end.x < selBox.start.x;

       if (maxX - minX > 0.1 || maxY - minY > 0.1) {
         updateEntities(prev => prev.map(ent => {
            let inBounds = false;
            const b = calculateExtents([ent]);
            if (b.minX !== 0 || b.maxX !== 0) {
               if (isCrossing) inBounds = !(b.maxX < minX || b.minX > maxX || b.maxY < minY || b.minY > maxY);
               else inBounds = b.minX >= minX && b.maxX <= maxX && b.minY >= minY && b.maxY <= maxY;
            }
            return {...ent, selected: ent.selected || inBounds};
         }));
       }
       setSelBox(null);
    }
  };

  const toggleSelection = (id: string, e: ReactMouseEvent) => {
    e.stopPropagation();
    if (activeTool === 'select' && dragType !== 'move' && dragType !== 'resize') {
      updateEntities(prev => prev.map(ent => ent.id === id ? { ...ent, selected: !ent.selected } : (e.shiftKey ? ent : { ...ent, selected: false })));
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    const direction = e.deltaY > 0 ? -1 : 1;
    
    const mouseX = e.clientX - (containerRef.current?.getBoundingClientRect().left || 0);
    const mouseY = e.clientY - (containerRef.current?.getBoundingClientRect().top || 0);
    
    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / (-zoom);
    
    const newZoom = Math.max(0.001, Math.min(10000, zoom * Math.pow(zoomFactor, direction)));
    
    const newPanX = mouseX - (worldX * newZoom);
    const newPanY = mouseY + (worldY * newZoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
      const start = { x: x + Math.cos(startAngle) * r, y: y + Math.sin(startAngle) * r };
      const end = { x: x + Math.cos(endAngle) * r, y: y + Math.sin(endAngle) * r };
      let diff = endAngle - startAngle;
      while (diff < 0) diff += 2 * Math.PI;
      const largeArcFlag = diff <= Math.PI ? "0" : "1";
      return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const renderPolyline = (vertices: Point[], closed?: boolean) => {
     if (vertices.length < 2) return '';
     let d = `M ${vertices[0].x} ${vertices[0].y} `;
     for (let i = 1; i < vertices.length; i++) {
        const p1 = vertices[i-1];
        const p2 = vertices[i];
        if (p1.bulge) {
           const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
           const theta = 4 * Math.atan(p1.bulge);
           const r = Math.abs(dist / (2 * Math.sin(theta / 2)));
           const largeArc = Math.abs(theta) > Math.PI ? 1 : 0;
           const sweep = p1.bulge > 0 ? 1 : 0;
           d += `A ${r} ${r} 0 ${largeArc} ${sweep} ${p2.x} ${p2.y} `;
        } else d += `L ${p2.x} ${p2.y} `;
     }
     if (closed) {
        const p1 = vertices[vertices.length - 1];
        const p2 = vertices[0];
        if (p1.bulge) {
           const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
           const theta = 4 * Math.atan(p1.bulge);
           const r = Math.abs(dist / (2 * Math.sin(theta / 2)));
           const largeArc = Math.abs(theta) > Math.PI ? 1 : 0;
           const sweep = p1.bulge > 0 ? 1 : 0;
           d += `A ${r} ${r} 0 ${largeArc} ${sweep} ${p2.x} ${p2.y} `;
        } else d += `Z`;
     }
     return d;
  };

  const handleNumericEdit = (prop: string, val: number) => {
    if (isNaN(val)) return;
    const selected = entities.filter(e => e.selected);
    if (selected.length === 0) return;
    const b = calculateExtents(selected);
    const w = b.maxX - b.minX || 1;
    const h = b.maxY - b.minY || 1;
    let tx = 0, ty = 0, sx = 1, sy = 1;
    
    if (prop === 'x') { tx = val - b.minX; }
    if (prop === 'y') { ty = val - b.minY; }
    if (prop === 'w') { sx = val / w; tx = b.minX - b.minX * sx; }
    if (prop === 'h') { sy = val / h; ty = b.minY - b.minY * sy; }
    
    updateEntities(prev => prev.map(ent => {
      if (!ent.selected) return ent;
      return transformEntity(ent, tx, ty, sx, sy);
    }));
  };

  const selectedEntities = entities.filter(e => e.selected);
  const selectionBounds = selectedEntities.length > 0 ? calculateExtents(selectedEntities) : null;

  return (
    <div className={`flex flex-col bg-[#1e1e24] text-slate-300 font-sans ${isFullScreen ? 'fixed inset-0 z-[100]' : 'h-screen w-full'}`} dir="ltr">
      <div className="h-14 bg-[#18181c] border-b border-slate-700/80 flex items-center justify-between px-4 shrink-0 shadow-md z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold tracking-wide">
            <Command className="w-5 h-5" />
            <span>CAD Studio PRO Engine</span>
          </div>
          <div className="h-5 w-px bg-slate-700 mx-1" />
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded text-xs font-semibold transition flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" /> Open DXF/DWG
            </button>
            <input ref={fileInputRef} type="file" accept=".dxf,.dwg" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 bg-[#141419] border border-slate-700/50 px-3 py-1.5 rounded-full shadow-inner">
            {fileName || 'No file selected'}
          </span>
          <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition">
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {onExit && <button onClick={onExit} className="p-1.5 hover:bg-red-900/50 rounded text-slate-400 hover:text-red-400 transition ml-1"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      
      <div className="h-12 bg-[#18181c] border-b border-slate-700/80 flex items-center px-4 shrink-0 gap-1 overflow-x-auto z-10 shadow-sm">
        <ToolButton icon={<MousePointer2 className="w-4 h-4"/>} active={activeTool === 'select'} onClick={() => {setActiveTool('select'); setDrawState({step:0});}} title="Select/Move/Resize" text="Select" />
        <ToolButton icon={<Hand className="w-4 h-4"/>} active={activeTool === 'pan'} onClick={() => setActiveTool('pan')} title="Pan Canvas" />
        <div className="w-px h-5 bg-slate-700 mx-2" />
        <ToolButton icon={<Trash2 className="w-4 h-4"/>} onClick={deleteSelected} title="Delete Selected" />
        <div className="w-px h-5 bg-slate-700 mx-2" />
        <ToolButton icon={<Minus className="w-4 h-4"/>} active={activeTool === 'line'} onClick={() => {setActiveTool('line'); setDrawState({step:0});}} title="Draw Line" />
        <ToolButton icon={<Square className="w-4 h-4"/>} active={activeTool === 'rect'} onClick={() => {setActiveTool('rect'); setDrawState({step:0});}} title="Draw Rectangle" />
        <ToolButton icon={<Circle className="w-4 h-4"/>} active={activeTool === 'circle'} onClick={() => {setActiveTool('circle'); setDrawState({step:0});}} title="Draw Circle" />
        <div className="w-px h-5 bg-slate-700 mx-2" />
        <ToolButton icon={<Undo className="w-4 h-4"/>} active={false} onClick={undo} disabled={historyIndex <= 0} title="Undo" />
        <ToolButton icon={<Redo className="w-4 h-4"/>} active={false} onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo" />
        <div className="w-px h-5 bg-slate-700 mx-2" />
        <ToolButton icon={<ZoomIn className="w-4 h-4"/>} active={false} onClick={() => zoomExtents()} title="Zoom Extents" text="Fit" />
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="w-64 bg-[#18181c] border-r border-slate-700/80 flex flex-col shrink-0 z-10 shadow-[4px_0_10px_rgba(0,0,0,0.1)]">
          <div className="p-3 border-b border-slate-700/80 bg-[#141419] flex justify-between items-center">
            <span className="text-xs font-semibold flex items-center gap-2 tracking-wide text-slate-200"><Layers className="w-4 h-4 text-blue-400"/> LAYERS</span>
          </div>
          <div className="h-1/2 overflow-y-auto p-2 space-y-0.5 border-b border-slate-700/80 bg-[#1e1e24]">
            {layers.map(layer => (
              <div key={layer} className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition ${activeLayer === layer ? 'bg-slate-700 border-l-2 border-blue-500 text-blue-200 shadow-inner' : 'hover:bg-slate-800 text-slate-400'}`} onClick={() => setActiveLayer(layer)}>
                <span className="truncate w-40 font-mono" title={layer}>{layer}</span>
                <button onClick={(e) => { e.stopPropagation(); setHiddenLayers(prev => prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]); }} className={`w-3 h-3 rounded-full border ${hiddenLayers.includes(layer) ? 'border-slate-600 bg-transparent' : 'border-blue-500 bg-blue-500'}`}/>
              </div>
            ))}
          </div>
          
          <div className="p-3 bg-[#141419] border-b border-slate-700/80">
            <span className="text-xs font-semibold flex items-center gap-2 tracking-wide text-slate-200"><Settings className="w-4 h-4 text-blue-400"/> PROPERTIES</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-xs text-slate-400 space-y-4 bg-[#1e1e24]">
            {selectionBounds ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="font-bold text-blue-300 uppercase tracking-widest text-[10px] border-b border-slate-700 pb-2 flex justify-between">
                  <span>{selectedEntities.length} OBJECT{selectedEntities.length>1?'S':''}</span>
                  <span>{selectedEntities.length===1 ? selectedEntities[0].type : 'MIXED'}</span>
                </div>
                <PropInput label="X Pos" value={selectionBounds.minX} onChange={v => handleNumericEdit('x', v)} />
                <PropInput label="Y Pos" value={selectionBounds.minY} onChange={v => handleNumericEdit('y', v)} />
                <PropInput label="Width" value={selectionBounds.maxX - selectionBounds.minX} onChange={v => handleNumericEdit('w', v)} />
                <PropInput label="Height" value={selectionBounds.maxY - selectionBounds.minY} onChange={v => handleNumericEdit('h', v)} />
                <div className="h-px bg-slate-700/50 w-full" />
                <PropInput label="Layer" value={selectedEntities[0].layer} type="text" onChange={v => updateEntities(p => p.map(e => e.selected ? {...e, layer: v} : e))} />
              </div>
            ) : (
              <div className="text-center p-4 text-slate-500 font-mono mt-10">Select objects to edit properties.</div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div 
            className="flex-1 relative outline-none transition-colors duration-200"
            style={{ backgroundColor: isDraggingFile ? '#1e293b' : canvasBgColor, cursor: activeTool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair' }}
            tabIndex={0} 
            onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDraggingFile(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDraggingFile(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }}
            ref={containerRef}
            onKeyDown={(e) => {
               if (e.key === 'Delete' || e.key === 'Backspace') executeCommand('delete');
               if (e.key === 'Escape') { setDrawState({step:0}); setActiveTool('select'); }
               if (e.ctrlKey && e.key === 'z') undo();
               if (e.ctrlKey && e.key === 'y') redo();
            }}
          >
            {isDraggingFile && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-900/30 backdrop-blur-md border-[6px] border-dashed border-blue-500/70 m-4 rounded-xl pointer-events-none">
                 <div className="text-blue-200 font-bold text-2xl tracking-widest flex items-center gap-4"><Upload className="w-10 h-10 animate-bounce text-blue-400" /> DROP DWG/DXF FILE TO LOAD</div>
              </div>
            )}
            
            <div className="absolute inset-0" onWheel={handleWheel} onMouseDown={handleSvgMouseDown} onMouseMove={handleSvgMouseMove} onMouseUp={handleSvgMouseUp} onMouseLeave={handleSvgMouseUp}>
              <svg ref={svgRef} className="w-full h-full">
                {cursorWorld && (
                   <g pointerEvents="none">
                      <line x1={cursorWorld.x * zoom + pan.x} y1={-10000} x2={cursorWorld.x * zoom + pan.x} y2={10000} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                      <line x1={-10000} y1={pan.y - cursorWorld.y * zoom} x2={10000} y2={pan.y - cursorWorld.y * zoom} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                   </g>
                )}

                <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}, ${-zoom})`, transformOrigin: '0 0' }}>
                  {entities.map(e => {
                    if (hiddenLayers.includes(e.layer)) return null;
                    const ent = (e.selected && previewEntities) ? (previewEntities.find(pe => pe.id === e.id) || e) : e;
                    const color = ent.selected ? selectedColor : (ent.color || defaultLineColor);
                    const sw = (ent.selected ? 2 : 1) / zoom;
                    
                    if (ent.type === 'LINE') return <line key={ent.id} data-selected={ent.selected} x1={ent.x1 || 0} y1={ent.y1 || 0} x2={ent.x2 || 0} y2={ent.y2 || 0} stroke={color} strokeWidth={sw} onMouseDown={(ev) => toggleSelection(ent.id, ev)} className="cursor-pointer" />;
                    if (ent.type === 'CIRCLE') return <circle key={ent.id} data-selected={ent.selected} cx={ent.cx} cy={ent.cy} r={ent.r} fill="none" stroke={color} strokeWidth={sw} onMouseDown={(ev) => toggleSelection(ent.id, ev)} className="cursor-pointer" />;
                    if (ent.type === 'ARC' && ent.startAngle !== undefined && ent.endAngle !== undefined) return <path key={ent.id} data-selected={ent.selected} d={describeArc(ent.cx!, ent.cy!, ent.r!, ent.startAngle, ent.endAngle)} fill="none" stroke={color} strokeWidth={sw} onMouseDown={(ev) => toggleSelection(ent.id, ev)} className="cursor-pointer" />;
                    if (ent.type === 'TEXT') return <text key={ent.id} data-selected={ent.selected} x={ent.x1 || 0} y={-(ent.y1 || 0)} transform="scale(1, -1)" fill={color} fontSize={14 / zoom} fontFamily="monospace" onMouseDown={(ev) => toggleSelection(ent.id, ev)} className="cursor-pointer" style={{userSelect:'none'}}>{ent.text}</text>;
                    if (ent.type === 'RECT') return <rect key={ent.id} data-selected={ent.selected} x={Math.min(ent.x1||0, ent.x2||0)} y={Math.min(ent.y1||0, ent.y2||0)} width={Math.abs((ent.x2||0)-(ent.x1||0))} height={Math.abs((ent.y2||0)-(ent.y1||0))} fill="none" stroke={color} strokeWidth={sw} onMouseDown={(ev) => toggleSelection(ent.id, ev)} className="cursor-pointer" />;
                    if (ent.type === 'LWPOLYLINE' && ent.vertices) return <path key={ent.id} data-selected={ent.selected} d={renderPolyline(ent.vertices, ent.shape)} fill="none" stroke={color} strokeWidth={sw} onMouseDown={(ev) => toggleSelection(ent.id, ev)} className="cursor-pointer" strokeLinejoin="round" strokeLinecap="round" />;
                    return null;
                  })}

                  {(() => {
                     if (drawState.step !== 1 || !drawState.startPoint || !drawState.currentPoint) return null;
                     const { startPoint: s, currentPoint: c } = drawState;
                     const sw = 1/zoom;
                     if (activeTool === 'line') return <line x1={s.x} y1={s.y} x2={c.x} y2={c.y} stroke={selectedColor} strokeWidth={sw} strokeDasharray={`${4/zoom} ${4/zoom}`} />;
                     if (activeTool === 'rect') return <rect x={Math.min(s.x||0, c.x||0)} y={Math.min(s.y||0, c.y||0)} width={Math.abs((c.x||0)-(s.x||0)) || 0} height={Math.abs((c.y||0)-(s.y||0)) || 0} fill="none" stroke={selectedColor} strokeWidth={sw} strokeDasharray={`${4/zoom} ${4/zoom}`} />;
                     if (activeTool === 'circle') return <circle cx={s.x} cy={s.y} r={Math.hypot(c.x-s.x, c.y-s.y)} fill="none" stroke={selectedColor} strokeWidth={sw} strokeDasharray={`${4/zoom} ${4/zoom}`} />;
                     return null;
                  })()}

                  {selectionBounds && activeTool === 'select' && (
                     <g>
                        <rect x={selectionBounds.minX} y={selectionBounds.minY} width={(selectionBounds.maxX - selectionBounds.minX) || 0} height={(selectionBounds.maxY - selectionBounds.minY) || 0} fill="none" stroke="#fbbf24" strokeWidth={2/zoom} strokeDasharray={`${4/zoom} ${4/zoom}`} pointerEvents="none" />
                        <rect data-handle="sw" x={selectionBounds.minX - 4/zoom} y={selectionBounds.minY - 4/zoom} width={8/zoom} height={8/zoom} fill="#fbbf24" style={{cursor: 'nesw-resize'}} />
                        <rect data-handle="se" x={selectionBounds.maxX - 4/zoom} y={selectionBounds.minY - 4/zoom} width={8/zoom} height={8/zoom} fill="#fbbf24" style={{cursor: 'nwse-resize'}} />
                        <rect data-handle="nw" x={selectionBounds.minX - 4/zoom} y={selectionBounds.maxY - 4/zoom} width={8/zoom} height={8/zoom} fill="#fbbf24" style={{cursor: 'nwse-resize'}} />
                        <rect data-handle="ne" x={selectionBounds.maxX - 4/zoom} y={selectionBounds.maxY - 4/zoom} width={8/zoom} height={8/zoom} fill="#fbbf24" style={{cursor: 'nesw-resize'}} />
                        <rect data-handle="s" x={selectionBounds.minX + (selectionBounds.maxX-selectionBounds.minX)/2 - 4/zoom} y={selectionBounds.minY - 4/zoom} width={8/zoom} height={8/zoom} fill="#fbbf24" style={{cursor: 'ns-resize'}} />
                        <rect data-handle="n" x={selectionBounds.minX + (selectionBounds.maxX-selectionBounds.minX)/2 - 4/zoom} y={selectionBounds.maxY - 4/zoom} width={8/zoom} height={8/zoom} fill="#fbbf24" style={{cursor: 'ns-resize'}} />
                        <rect data-handle="w" x={selectionBounds.minX - 4/zoom} y={selectionBounds.minY + (selectionBounds.maxY-selectionBounds.minY)/2 - 4/zoom} width={8/zoom} height={8/zoom} fill="#fbbf24" style={{cursor: 'ew-resize'}} />
                        <rect data-handle="e" x={selectionBounds.maxX - 4/zoom} y={selectionBounds.minY + (selectionBounds.maxY-selectionBounds.minY)/2 - 4/zoom} width={8/zoom} height={8/zoom} fill="#fbbf24" style={{cursor: 'ew-resize'}} />
                     </g>
                  )}

                  {selBox && (
                     <rect 
                       x={Math.min(selBox.start.x, selBox.end.x)} 
                       y={Math.min(selBox.start.y, selBox.end.y)} 
                       width={Math.abs(selBox.end.x - selBox.start.x)} 
                       height={Math.abs(selBox.end.y - selBox.start.y)} 
                       fill={selBox.end.x < selBox.start.x ? 'rgba(74, 222, 128, 0.15)' : 'rgba(96, 165, 250, 0.15)'} 
                       stroke={selBox.end.x < selBox.start.x ? '#4ade80' : '#60a5fa'} 
                       strokeWidth={1/zoom} 
                       strokeDasharray={selBox.end.x < selBox.start.x ? `${5/zoom} ${5/zoom}` : "none"} 
                     />
                  )}

                  {snapPoint && <rect x={snapPoint.x - 4/zoom} y={snapPoint.y - 4/zoom} width={8/zoom} height={8/zoom} fill="none" stroke="#fbbf24" strokeWidth={2/zoom} pointerEvents="none" />}
                </g>
              </svg>
            </div>
          </div>

          <div className="h-32 border-t border-slate-700/80 bg-[#141419] shrink-0 flex flex-col font-mono text-xs z-10">
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
               {logs.map((log, i) => <div key={i} className={`${log.includes('[ERROR]') ? 'text-red-400 font-semibold' : log.includes('[SUCCESS]') ? 'text-green-400' : 'text-slate-400'}`}>{log}</div>)}
            </div>
            <div className="h-8 border-t border-slate-700/80 flex items-center bg-[#18181c] px-2">
               <span className="text-blue-400 font-bold mr-2">Command:</span>
               <input type="text" className="flex-1 bg-transparent text-white outline-none" value={commandLine} onChange={e => setCommandLine(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') executeCommand(commandLine); }} />
               {cursorWorld && <div className="text-slate-500 ml-4 hidden md:block">{cursorWorld.x.toFixed(2)}, {cursorWorld.y.toFixed(2)}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
