
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { analyzeTopology } from '../services/customDielineEngine';

export interface FlapDirections {
  top: 'inside' | 'outside';
  bottom: 'inside' | 'outside';
  left: 'inside' | 'outside';
  right: 'inside' | 'outside';
}

// Helper to create high-contrast, beautiful 3D sprite text labels for measurements
function createTextSprite(text: string, color: string = '#38bdf8'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Elegant translucent backdrop
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, 256, 64, 12);
    } else {
      ctx.rect(0, 0, 256, 64);
    }
    ctx.fill();
    
    // High-tech outline border
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // High-contrast clean text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true, 
    depthWrite: false, 
    depthTest: false 
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.4, 0.6, 1.0);
  sprite.renderOrder = 999; // Ensure it stays on top of everything
  return sprite;
}

// Point-in-polygon helper using standard ray-casting algorithm
function isPointInPolygon(p: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > p.y) !== (yj > p.y))
        && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Sutherland-Hodgman polygon clipping algorithm against an axis-aligned box
function clipPolygon(poly: THREE.Vector2[], minX: number, maxX: number, minY: number, maxY: number): THREE.Vector2[] {
  let current = [...poly];
  
  // Clip against left: x >= minX
  let next: THREE.Vector2[] = [];
  for (let i = 0; i < current.length; i++) {
    const p1 = current[i];
    const p2 = current[(i + 1) % current.length];
    
    const p1_inside = p1.x >= minX;
    const p2_inside = p2.x >= minX;
    
    if (p1_inside && p2_inside) {
      next.push(p2.clone());
    } else if (p1_inside && !p2_inside) {
      const t = (minX - p1.x) / (p2.x - p1.x);
      const iy = p1.y + t * (p2.y - p1.y);
      next.push(new THREE.Vector2(minX, iy));
    } else if (!p1_inside && p2_inside) {
      const t = (minX - p1.x) / (p2.x - p1.x);
      const iy = p1.y + t * (p2.y - p1.y);
      next.push(new THREE.Vector2(minX, iy));
      next.push(p2.clone());
    }
  }
  current = next;
  if (current.length < 3) return [];
  
  // Clip against right: x <= maxX
  next = [];
  for (let i = 0; i < current.length; i++) {
    const p1 = current[i];
    const p2 = current[(i + 1) % current.length];
    
    const p1_inside = p1.x <= maxX;
    const p2_inside = p2.x <= maxX;
    
    if (p1_inside && p2_inside) {
      next.push(p2.clone());
    } else if (p1_inside && !p2_inside) {
      const t = (maxX - p1.x) / (p2.x - p1.x);
      const iy = p1.y + t * (p2.y - p1.y);
      next.push(new THREE.Vector2(maxX, iy));
    } else if (!p1_inside && p2_inside) {
      const t = (maxX - p1.x) / (p2.x - p1.x);
      const iy = p1.y + t * (p2.y - p1.y);
      next.push(new THREE.Vector2(maxX, iy));
      next.push(p2.clone());
    }
  }
  current = next;
  if (current.length < 3) return [];
  
  // Clip against bottom: y >= minY
  next = [];
  for (let i = 0; i < current.length; i++) {
    const p1 = current[i];
    const p2 = current[(i + 1) % current.length];
    
    const p1_inside = p1.y >= minY;
    const p2_inside = p2.y >= minY;
    
    if (p1_inside && p2_inside) {
      next.push(p2.clone());
    } else if (p1_inside && !p2_inside) {
      const t = (minY - p1.y) / (p2.y - p1.y);
      const ix = p1.x + t * (p2.x - p1.x);
      next.push(new THREE.Vector2(ix, minY));
    } else if (!p1_inside && p2_inside) {
      const t = (minY - p1.y) / (p2.y - p1.y);
      const ix = p1.x + t * (p2.x - p1.x);
      next.push(new THREE.Vector2(ix, minY));
      next.push(p2.clone());
    }
  }
  current = next;
  if (current.length < 3) return [];
  
  // Clip against top: y <= maxY
  next = [];
  for (let i = 0; i < current.length; i++) {
    const p1 = current[i];
    const p2 = current[(i + 1) % current.length];
    
    const p1_inside = p1.y <= maxY;
    const p2_inside = p2.y <= maxY;
    
    if (p1_inside && p2_inside) {
      next.push(p2.clone());
    } else if (p1_inside && !p2_inside) {
      const t = (maxY - p1.y) / (p2.y - p1.y);
      const ix = p1.x + t * (p2.x - p1.x);
      next.push(new THREE.Vector2(ix, maxY));
    } else if (!p1_inside && p2_inside) {
      const t = (maxY - p1.y) / (p2.y - p1.y);
      const ix = p1.x + t * (p2.x - p1.x);
      next.push(new THREE.Vector2(ix, maxY));
      next.push(p2.clone());
    }
  }
  
  
  const deduplicated: THREE.Vector2[] = [];
  for (let i = 0; i < next.length; i++) {
    const p1 = next[i];
    const p2 = next[(i + 1) % next.length];
    if (p1.distanceTo(p2) > 1e-4) {
      deduplicated.push(p1);
    }
  }
  
  if (deduplicated.length < 3) return [];

  // Remove collinear points
  const cleaned: THREE.Vector2[] = [];
  for (let i = 0; i < deduplicated.length; i++) {
    const prev = deduplicated[(i - 1 + deduplicated.length) % deduplicated.length];
    const curr = deduplicated[i];
    const nextPt = deduplicated[(i + 1) % deduplicated.length];
    
    // Check if curr is collinear with prev and next
    const crossProduct = (curr.x - prev.x) * (nextPt.y - prev.y) - (curr.y - prev.y) * (nextPt.x - prev.x);
    if (Math.abs(crossProduct) > 1e-4) {
       cleaned.push(curr);
    }
  }
  
  if (cleaned.length < 3) return [];
  return cleaned;
}


// Generate high-fidelity procedural paper/cardboard textures to simulate real physics
function createProceduralTexture(type: string, colorHex: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  if (type === 'corrugated') {
    // Warm brown base for corrugated cardboard
    ctx.fillStyle = colorHex || '#c8b195';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw vertical fluting structure (corrugated ribs)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 14;
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    
    // Add fine paper pulp speckles and noise
    for (let i = 0; i < 6000; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const size = Math.random() * 1.8;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(px, py, size, size);
    }
  } else if (type === 'kraft') {
    // Unbleached rich organic brown Kraft paper texture
    ctx.fillStyle = colorHex || '#c2a278';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw organic cellulose fiber strands
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 180; i++) {
      ctx.beginPath();
      const sx = Math.random() * 512;
      const sy = Math.random() * 512;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + (Math.random() - 0.5) * 40,
        sy + (Math.random() - 0.5) * 40,
        sx + (Math.random() - 0.5) * 80,
        sy + (Math.random() - 0.5) * 80
      );
      ctx.stroke();
    }
    
    // Fine grainy paper texture
    for (let i = 0; i < 9000; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const size = Math.random() * 1.5;
      ctx.fillStyle = Math.random() > 0.45 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
      ctx.fillRect(px, py, size, size);
    }
  } else {
    // Standard white coated / semi-gloss cardboard (satin feel)
    ctx.fillStyle = colorHex || '#ffffff';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add extremely subtle, soft satin reflection gradient
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Very subtle premium card stock micro-texture
    for (let i = 0; i < 2000; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const size = Math.random() * 1.0;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
      ctx.fillRect(px, py, size, size);
    }
  }
  
  // Draw premium branding emblem centered on the texture tile for added depth realism (embossed logo & debossed text)
  const cx = 256;
  const cy = 256;
  
  ctx.save();
  ctx.strokeStyle = type === 'kraft' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 2.5;
  
  // Elegant circular seal border
  ctx.beginPath();
  ctx.arc(cx, cy, 75, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle interior dashed ring
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, 68, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Traditional Persian decorative divider flourishes
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = type === 'kraft' ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.20)';
  
  // Upper flourish line
  ctx.beginPath();
  ctx.moveTo(cx - 45, cy - 25);
  ctx.quadraticCurveTo(cx, cy - 35, cx + 45, cy - 25);
  ctx.stroke();

  // Lower flourish line
  ctx.beginPath();
  ctx.moveTo(cx - 45, cy + 25);
  ctx.quadraticCurveTo(cx, cy + 35, cx + 45, cy + 25);
  ctx.stroke();

  // Main Calligraphy text "اشک قلم"
  ctx.fillStyle = type === 'kraft' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.40)';
  ctx.font = "bold 32px 'Aref Ruqaa', Vazirmatn, system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("اشک قلم", cx, cy - 2);

  // Subtext above: "صنایع چاپ و بسته‌بندی"
  ctx.font = '9px Vazirmatn, system-ui, sans-serif';
  ctx.fillText("صنایع چاپ و بسته‌بندی", cx, cy - 40);

  // Subtext below: "ASHK GHALAM"
  ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
  ctx.fillText("ASHK GHALAM", cx, cy + 40);
  ctx.restore();
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Generate a high-fidelity procedural bump/normal mapping layer for embossing, debossing, and paper textures
function createProceduralBumpMap(type: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  // Base is neutral gray (no displacement)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);
  
  if (type === 'corrugated') {
    // High-realism fluted cardboard ridges & troughs
    for (let x = 0; x < 512; x++) {
      const heightVal = Math.sin((x / 32) * Math.PI * 2); // ranges -1 to 1
      const gray = Math.floor(128 + heightVal * 32); // ranges 96 to 160 (distinct bump amplitude)
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.fillRect(x, 0, 1, 512);
    }
    
    // Fine-grained pulpy fiber bump noise
    for (let i = 0; i < 4000; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const size = Math.random() * 1.5;
      const noise = (Math.random() - 0.5) * 16;
      const grayVal = Math.floor(128 + noise);
      ctx.fillStyle = `rgba(${grayVal}, ${grayVal}, ${grayVal}, 0.12)`;
      ctx.fillRect(px, py, size, size);
    }
  } else if (type === 'kraft') {
    // Unbleached tactile organic cellulose fiber bump map
    for (let i = 0; i < 180; i++) {
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      ctx.beginPath();
      const sx = Math.random() * 512;
      const sy = Math.random() * 512;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + (Math.random() - 0.5) * 40,
        sy + (Math.random() - 0.5) * 40,
        sx + (Math.random() - 0.5) * 80,
        sy + (Math.random() - 0.5) * 80
      );
      ctx.stroke();
    }
    
    // Fine organic grains
    for (let i = 0; i < 8000; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const size = Math.random() * 1.2;
      const noise = (Math.random() - 0.5) * 12;
      const grayVal = Math.floor(128 + noise);
      ctx.fillStyle = `rgba(${grayVal}, ${grayVal}, ${grayVal}, 0.15)`;
      ctx.fillRect(px, py, size, size);
    }
  } else {
    // 'coated' satin / semi-gloss stock fine micro-bumps
    for (let i = 0; i < 3000; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const size = Math.random() * 1.0;
      const noise = (Math.random() - 0.5) * 8;
      const grayVal = Math.floor(128 + noise);
      ctx.fillStyle = `rgba(${grayVal}, ${grayVal}, ${grayVal}, 0.08)`;
      ctx.fillRect(px, py, size, size);
    }
  }
  
  // Draw the exact matching emblem in height displacement!
  // Embossed parts (raised) -> drawn in light gray/white (e.g., rgb(180, 180, 180))
  // Debossed parts (sunken/carved) -> drawn in dark gray/black (e.g., rgb(80, 80, 80))
  const cx = 256;
  const cy = 256;
  
  ctx.save();
  // Emboss (raise) the circular frame and divider flourishes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'; // Raised white bump overlay
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 75, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 68, 0, Math.PI * 2);
  ctx.stroke();

  // Flourish lines (raised)
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(cx - 45, cy - 25);
  ctx.quadraticCurveTo(cx, cy - 35, cx + 45, cy - 25);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 45, cy + 25);
  ctx.quadraticCurveTo(cx, cy + 35, cx + 45, cy + 25);
  ctx.stroke();

  // Deboss (carve out) the text labels inside the emblem
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; // Sunken black carve overlay
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = "bold 32px 'Aref Ruqaa', Vazirmatn, system-ui, sans-serif";
  ctx.fillText("اشک قلم", cx, cy - 2);

  ctx.font = '9px Vazirmatn, system-ui, sans-serif';
  ctx.fillText("صنایع چاپ و بسته‌بندی", cx, cy - 40);

  ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
  ctx.fillText("ASHK GHALAM", cx, cy + 40);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

interface ThreeDPreviewProps {
  width: number;
  height: number;
  depth: number;
  color: string;
  paperType?: 'coated' | 'kraft' | 'corrugated';
  isOpenRatio?: number;
  textureUrl?: string | null;
  specialEffect?: 'none' | 'gold_foil' | 'uv_spot' | 'both';
  autoRotate?: boolean;
  cameraOrbit?: boolean;
  resetTrigger?: number;
  viewAngle?: 'front' | 'top' | 'side' | 'perspective';
  isExploded?: boolean;
  flapDirections?: FlapDirections;
  hasDieCut?: boolean;
  selectedModelId?: string;
  customEntities?: any[];
  customAnchors?: any;
  wireframe?: boolean;
  lightIntensity?: number;
  showDimensions?: boolean;
  materialThickness?: number;
}

export const ThreeDPreview: React.FC<ThreeDPreviewProps> = ({ 
  width: rawWidth, height: rawHeight, depth: rawDepth, color, paperType = 'coated', isOpenRatio = 0, textureUrl,
  specialEffect = 'none', autoRotate = false, cameraOrbit = false, resetTrigger = 0, viewAngle = 'perspective', isExploded = false,
  flapDirections = { top: 'inside', bottom: 'inside', left: 'inside', right: 'inside' },
  hasDieCut = false,
  selectedModelId = 'ecma-a2020',
  customEntities,
  wireframe = false,
  lightIntensity = 1,
  customAnchors,
  showDimensions = true,
  materialThickness
}) => {
  const width = (isNaN(rawWidth) || rawWidth <= 0) ? 100 : rawWidth;
  const height = (isNaN(rawHeight) || rawHeight <= 0) ? 100 : rawHeight;
  const depth = (isNaN(rawDepth) || rawDepth <= 0) ? 100 : rawDepth;

  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const lightsRef = useRef<any>({});
  const matsRef = useRef<any>({});
  const activeHoverMeshRef = useRef<THREE.Mesh | null>(null);
  const fitCameraRef = useRef<(() => void) | null>(null);
  
  // Refs for dynamic properties to avoid re-initializing the whole scene
  const isOpenRatioRef = useRef(isOpenRatio);
  const autoRotateRef = useRef(autoRotate);
  const cameraOrbitRef = useRef(cameraOrbit);
  const isExplodedRef = useRef(isExploded);
  const flapDirRef = useRef(flapDirections);

  useEffect(() => {
    isOpenRatioRef.current = isOpenRatio;
  }, [isOpenRatio]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    cameraOrbitRef.current = cameraOrbit;
  }, [cameraOrbit]);

  useEffect(() => {
    if (resetTrigger > 0 && fitCameraRef.current) {
      fitCameraRef.current();
    }
  }, [resetTrigger]);

  useEffect(() => {
    isExplodedRef.current = isExploded;
  }, [isExploded]);

  useEffect(() => {
    flapDirRef.current = flapDirections;
  }, [flapDirections]);

  const customEntitiesStr = JSON.stringify(customEntities);
  const customAnchorsStr = JSON.stringify(customAnchors);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = null; // Transparent to show CSS gradient
    
    // Initialize with safe defaults if dimensions are 0
    const initialWidth = mountRef.current.clientWidth || 800;
    const initialHeight = mountRef.current.clientHeight || 600;

    const s = 0.1;
    const w = width * s;
    const h = height * s;
    const d = depth * s;
    let boxBodyBottom = -h / 2;
    const maxDim = Math.max(w, h, d);
    const idealDist = Math.max(12, Math.min(65, maxDim * 2.1));

    const camera = new THREE.PerspectiveCamera(40, initialWidth / initialHeight, 0.1, 1000);
    // Set initial position based on viewAngle dynamically with idealDist
    switch (viewAngle) {
      case 'front': camera.position.set(0, 0, idealDist * 1.5); break;
      case 'top': camera.position.set(0, idealDist * 1.5, 0); break;
      case 'side': camera.position.set(idealDist * 1.5, 0, 0); break;
      default: camera.position.set(idealDist * 0.9, idealDist * 0.7, idealDist * 0.9); break;
    }
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: true, failIfMajorPerformanceCaveat: false });
      } catch (_) {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "default", preserveDrawingBuffer: true, failIfMajorPerformanceCaveat: false });
      }
    } catch (e) {
      if (mountRef.current) {
        mountRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400 text-xs p-4 text-center">مرورگر شما از WebGL پشتیبانی نمی‌کند یا ظرفیت گرافیکی کامل شده است.</div>';
      }
      return () => {};
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn("WebGL context lost in ThreeDPreview.");
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initialWidth, initialHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    const currentMount = mountRef.current;
    currentMount.appendChild(renderer.domElement);

    // --- Post-Processing with FXAA (Fast Approximate Anti-Aliasing) ---
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.x = 1 / (initialWidth * pixelRatio);
    fxaaPass.material.uniforms['resolution'].value.y = 1 / (initialHeight * pixelRatio);
    composer.addPass(fxaaPass);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 200;
    controls.minDistance = 10;
    controlsRef.current = controls;

    // --- Studio Lighting (Professional 3-Point Setup) ---
    const amb = new THREE.AmbientLight(0xffffff, 0.5 * lightIntensity);
    lightsRef.current.ambient = amb;
    scene.add(amb);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0 * lightIntensity);
    lightsRef.current.main = mainLight;
    mainLight.position.set(30, 45, 30);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 250;
    mainLight.shadow.camera.left = -30;
    mainLight.shadow.camera.right = 30;
    mainLight.shadow.camera.top = 30;
    mainLight.shadow.camera.bottom = -30;
    mainLight.shadow.bias = -0.0005; // Fix shadow acne!
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xfffbeb, 1.0 * lightIntensity); // Warm soft fill light
    lightsRef.current.fill = fillLight;
    fillLight.position.set(-30, 15, 20);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 1.2 * lightIntensity); // Cool silhouette rim light
    lightsRef.current.rim = rimLight;
    rimLight.position.set(10, 30, -40);
    scene.add(rimLight);

    // --- Reflective Floor ---
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      roughness: 0.8,
      metalness: 0.2,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -10;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid helper for industrial feel
    const grid = new THREE.GridHelper(200, 40, 0x1e293b, 0x0f172a);
    grid.position.y = -9.9;
    scene.add(grid);

    // --- Dynamic Material Logic ---
    const loader = new THREE.TextureLoader();
    let texture: THREE.Texture | null = null;
    if (textureUrl) {
      texture = loader.load(textureUrl);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    } else {
      texture = createProceduralTexture(paperType, color);
    }

    // High-fidelity bump/normal mapping layer for embossing, debossing, and paper texture fluting
    const bumpMapTexture = createProceduralBumpMap(paperType);

    // Create an advanced studio environment map for premium reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x1a1a1f); // Sleek dark studio background
    
    // Add multiple professional softbox lighting panels in the environment scene
    // These will reflect as gorgeous, crisp, realistic light boxes on the box surfaces!
    const softboxGeo = new THREE.PlaneGeometry(8, 8);
    const softboxMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    
    // Top-left softbox
    const sb1 = new THREE.Mesh(softboxGeo, softboxMat);
    sb1.position.set(12, 15, 12);
    sb1.lookAt(0, 0, 0);
    envScene.add(sb1);
    
    // Top-right softbox
    const sb2 = new THREE.Mesh(softboxGeo, softboxMat);
    sb2.position.set(-12, 15, -12);
    sb2.lookAt(0, 0, 0);
    envScene.add(sb2);
    
    // Cool vertical strip light (creates gorgeous linear reflections)
    const stripGeo = new THREE.PlaneGeometry(2, 15);
    const stripMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, side: THREE.DoubleSide }); // subtle ice-blue tone
    const sb3 = new THREE.Mesh(stripGeo, stripMat);
    sb3.position.set(15, 5, -15);
    sb3.lookAt(0, 0, 0);
    envScene.add(sb3);
    
    // Soft overhead skylight ring
    const skyRingGeo = new THREE.RingGeometry(8, 10, 32);
    const skyRingMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb, side: THREE.DoubleSide }); // subtle warm gold tone
    const sb4 = new THREE.Mesh(skyRingGeo, skyRingMat);
    sb4.position.set(0, 25, 0);
    sb4.rotation.x = Math.PI / 2;
    envScene.add(sb4);

    const envMap = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envMap;
    pmremGenerator.dispose(); // Always dispose PMREMGenerator after generation to save GPU memory!

    const material = new THREE.MeshPhysicalMaterial({
      color: texture ? 0xffffff : new THREE.Color(color),
      map: texture,
      bumpMap: bumpMapTexture,
      bumpScale: paperType === 'corrugated' ? 0.035 : (paperType === 'kraft' ? 0.025 : 0.008),
      roughness: specialEffect === 'gold_foil' ? 0.1 : (specialEffect === 'uv_spot' ? 0.1 : (paperType === 'coated' ? 0.4 : (paperType === 'kraft' ? 0.9 : 0.7))),
      metalness: specialEffect === 'gold_foil' ? 0.9 : (specialEffect === 'uv_spot' ? 0.3 : 0.05),
      clearcoat: specialEffect === 'uv_spot' ? 1.0 : 0.0,
      clearcoatRoughness: specialEffect === 'uv_spot' ? 0.05 : 0.0,
      envMap: envMap,
      envMapIntensity: specialEffect === 'gold_foil' ? 2.0 : (specialEffect === 'uv_spot' ? 1.5 : 0.5),
      side: THREE.DoubleSide,
    });

    const sideMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      wireframe: wireframe,
      bumpMap: bumpMapTexture,
      bumpScale: paperType === 'corrugated' ? 0.015 : 0.006,
      roughness: material.roughness,
      metalness: material.metalness,
      clearcoat: material.clearcoat,
      clearcoatRoughness: material.clearcoatRoughness,
      envMap: envMap,
      envMapIntensity: material.envMapIntensity,
      side: THREE.DoubleSide,
    });

    matsRef.current.main = material;
    matsRef.current.side = sideMaterial;

    if (specialEffect === 'gold_foil') {
      material.color.setHex(0xd4af37); // Classic Gold
      sideMaterial.color.setHex(0xd4af37);
    }

    // Material thickness simulation (Rule #2)
    // Scale real thickness (mm) to 3D unit coordinate space (s = 0.1)
    let t = 0.02; // Default fallback (0.2 mm scaled)
    if (materialThickness !== undefined && !isNaN(materialThickness)) {
      t = Math.max(0.01, materialThickness * s);
    } else {
      if (paperType === 'corrugated') {
        t = 0.22; // ~2.2 mm
      } else if (paperType === 'kraft') {
        t = 0.06; // ~0.6 mm
      } else {
        t = 0.04; // ~0.4 mm
      }
    }

    const createPanel = (pw: number, ph: number, customShape?: THREE.Shape) => {
      let geo: THREE.BufferGeometry;
      let meshMaterials: THREE.Material | THREE.Material[];
      
      if (isNaN(pw) || pw <= 0) pw = 0.1;
      if (isNaN(ph) || ph <= 0) ph = 0.1;
      
      if (customShape) {
        // Soft bevel for custom shapes too
        const extrudeSettings = { depth: t, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 };
        geo = new THREE.ExtrudeGeometry(customShape, extrudeSettings);
        geo.translate(0, 0, -t/2); // Center the thickness
        
        geo.computeBoundingBox();
        const bbox = geo.boundingBox!;
        const posAttribute = geo.attributes.position;
        const uvAttribute = geo.attributes.uv;
        const sizeX = bbox.max.x - bbox.min.x;
        const sizeY = bbox.max.y - bbox.min.y;
        for (let i = 0; i < posAttribute.count; i++) {
          const x = posAttribute.getX(i);
          const y = posAttribute.getY(i);
          const u = sizeX > 0 ? (x - bbox.min.x) / sizeX : 0.5;
          const v = sizeY > 0 ? (y - bbox.min.y) / sizeY : 0.5;
          uvAttribute.setXY(i, u, v);
        }
        meshMaterials = [material, sideMaterial];
      } else {
        const shape = new THREE.Shape();
        const radius = Math.min(pw, ph) * 0.05;
        const x = -pw/2;
        const y = -ph/2;
        shape.moveTo(x + radius, y);
        shape.lineTo(x + pw - radius, y);
        shape.quadraticCurveTo(x + pw, y, x + pw, y + radius);
        shape.lineTo(x + pw, y + ph - radius);
        shape.quadraticCurveTo(x + pw, y + ph, x + pw - radius, y + ph);
        shape.lineTo(x + radius, y + ph);
        shape.quadraticCurveTo(x, y + ph, x, y + ph - radius);
        shape.lineTo(x, y + radius);
        shape.quadraticCurveTo(x, y, x + radius, y);

        const extrudeSettings = { depth: t, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 };
        geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.translate(0, 0, -t/2); 
        
        geo.computeBoundingBox();
        const bbox = geo.boundingBox!;
        const posAttribute = geo.attributes.position;
        const uvAttribute = geo.attributes.uv;
        const sizeX = bbox.max.x - bbox.min.x;
        const sizeY = bbox.max.y - bbox.min.y;
        for (let i = 0; i < posAttribute.count; i++) {
          const x = posAttribute.getX(i);
          const y = posAttribute.getY(i);
          const u = sizeX > 0 ? (x - bbox.min.x) / sizeX : 0.5;
          const v = sizeY > 0 ? (y - bbox.min.y) / sizeY : 0.5;
          uvAttribute.setXY(i, u, v);
        }
        meshMaterials = [material, sideMaterial];
      }
      
      const mesh = new THREE.Mesh(geo, meshMaterials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      return mesh;
    };


    const boxRoot = new THREE.Group();
    scene.add(boxRoot);

    let updateFolds = () => {};
    let isTelescopic = selectedModelId.includes('0300') || selectedModelId.includes('telescopic');
    let isMailer = selectedModelId.includes('0427') || selectedModelId.includes('mailer');
    let isRsc = selectedModelId.includes('0201') || selectedModelId.includes('rsc');

    if (customEntities && customEntities.length > 0 && !isMailer && !isTelescopic && !isRsc) {
      let entitiesToProcess = [...customEntities];

      // 1. Parse all entities safely and scale by s (0.1) to match 3D scene grid coordinates perfectly!
      const parsedEntities = entitiesToProcess.map(e => {
        const x1 = typeof e.x1 === 'number' ? e.x1 : parseFloat(e.x1);
        const y1 = typeof e.y1 === 'number' ? e.y1 : parseFloat(e.y1);
        const x2 = typeof e.x2 === 'number' ? e.x2 : parseFloat(e.x2);
        const y2 = typeof e.y2 === 'number' ? e.y2 : parseFloat(e.y2);
        const r = typeof e.r === 'number' ? e.r : parseFloat(e.r);
        return {
          type: e.type,
          x1: (isNaN(x1) ? 0 : x1) * s,
          y1: (isNaN(y1) ? 0 : y1) * s,
          x2: (isNaN(x2) ? 0 : x2) * s,
          y2: (isNaN(y2) ? 0 : y2) * s,
          r: isNaN(r) ? undefined : r * s,
          isCrease: !!e.isCrease,
          layer: e.layer || ''
        };
      });

      // 2. Perform Topological Analysis to extract panel crease lines, and scale anchors by s
      let rawAnchors = customAnchors || analyzeTopology(entitiesToProcess, { L: rawWidth, W: rawDepth, H: rawHeight });
      
      if (customAnchors && customAnchors.topSideOrientation === 'bottom') {
        let maxYVal = -Infinity;
        customEntities.forEach(e => {
          const y1 = typeof e.y1 === 'number' ? e.y1 : parseFloat(e.y1);
          const y2 = typeof e.y2 === 'number' ? e.y2 : parseFloat(e.y2);
          if (isFinite(y1)) maxYVal = Math.max(maxYVal, y1);
          if (isFinite(y2)) maxYVal = Math.max(maxYVal, y2);
        });
        if (isFinite(maxYVal)) {
          const flippedCreaseY = (customAnchors.creaseY || []).map((y: number) => maxYVal - y).sort((a: number, b: number) => a - b);
          const flippedMinY = isNaN(customAnchors.minY) ? 0 : (maxYVal - (customAnchors.maxY ?? maxYVal));
          const flippedMaxY = isNaN(customAnchors.maxY) ? maxYVal : (maxYVal - (customAnchors.minY ?? 0));
          rawAnchors = {
            ...customAnchors,
            creaseY: flippedCreaseY,
            minY: Math.min(flippedMinY, flippedMaxY),
            maxY: Math.max(flippedMinY, flippedMaxY)
          };
        }
      }

      const anchors = {
        ...rawAnchors,
        creaseX: (rawAnchors.creaseX || []).map(x => x * s),
        creaseY: (rawAnchors.creaseY || []).map(y => y * s),
        minX: (rawAnchors.minX ?? 0) * s,
        maxX: (rawAnchors.maxX ?? 100) * s,
        minY: (rawAnchors.minY ?? 0) * s,
        maxY: (rawAnchors.maxY ?? 100) * s,
      };

      const minX = anchors.minX ?? 0;
      const minY = anchors.minY ?? 0;
      const maxX = anchors.maxX ?? (rawWidth * s);
      const maxY = anchors.maxY ?? ((rawHeight + rawDepth * 1.5) * s);
      
      const creaseX = [...(anchors.creaseX || [])];
      const creaseY = [...(anchors.creaseY || [])];
      
      // Pad out crease lines if they weren't detected
      if (creaseX.length < 5) {
        const fallbackL = (rawWidth || 100) * s;
        const fallbackW = (rawDepth || 80) * s;
        const g = 15 * s;
        creaseX.push(g, g + fallbackL, g + fallbackL + fallbackW, g + fallbackL + fallbackW + fallbackL, g + fallbackL + fallbackW + fallbackL + fallbackW);
      }
      if (creaseY.length < 2) {
        const fallbackH = (rawHeight || 80) * s;
        const midY = (maxY - minY) / 2;
        creaseY.push(midY - fallbackH/2, midY + fallbackH/2);
      }

      // Shift entities so they match minX = 0, minY = 0
      // If they were already shifted by analyzeTopology, their current minimum coordinates are 0, so we do not shift again.
      let currentMinX = Infinity;
      let currentMinY = Infinity;
      parsedEntities.forEach(e => {
        if (e.type === 'LINE') {
          currentMinX = Math.min(currentMinX, e.x1, e.x2);
          currentMinY = Math.min(currentMinY, e.y1, e.y2);
        } else {
          currentMinX = Math.min(currentMinX, e.x1);
          currentMinY = Math.min(currentMinY, e.y1);
        }
      });
      const shiftX = isFinite(currentMinX) ? currentMinX : 0;
      const shiftY = isFinite(currentMinY) ? currentMinY : 0;

      const shiftedEntities = parsedEntities.map(e => ({
        ...e,
        x1: e.x1 - shiftX,
        y1: e.y1 - shiftY,
        x2: e.type === 'LINE' ? e.x2 - shiftX : undefined,
        y2: e.type === 'LINE' ? e.y2 - shiftY : undefined,
      }));

      const cX0 = creaseX[0];
      const cX1 = creaseX[1];
      const cX2 = creaseX[2];
      const cX3 = creaseX[3];
      const cX4 = creaseX[4];
      
      const cY0 = creaseY[0];
      const cY1 = creaseY[1];

      const h_body = cY1 - cY0;
      boxBodyBottom = -h_body / 2;
      const w_glue = cX0;
      const w_p1 = cX1 - cX0; // Back wall
      const w_p2 = cX2 - cX1; // Right side wall
      const w_p3 = cX3 - cX2; // Front wall
      const w_p4 = cX4 - cX3; // Left side wall

      // 3. Helper to map 2D point coordinates to their logical packaging panel zone
      const getSubPanelIndex = (mx: number, my: number) => {
        let pIdx = 1;
        if (mx < cX0) pIdx = 0;
        else if (mx >= cX0 && mx < cX1) pIdx = 1;
        else if (mx >= cX1 && mx < cX2) pIdx = 2;
        else if (mx >= cX2 && mx < cX3) pIdx = 3;
        else pIdx = 4;
        
        let yZone = 'mid';
        if (my < cY0) yZone = 'bot';
        else if (my > cY1) yZone = 'top';
        
        return { pIdx, yZone };
      };

      // 4. Custom Extrude & Line Overlay Builders with correct UV coordinate mapping
      const createExtrudedPanelMesh = (shape: THREE.Shape | null) => {
        if (!shape) return null;
        const extrudeSettings = { depth: t, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 };
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.translate(0, 0, -t/2); // Center thickness
        
        geo.computeBoundingBox();
        const bbox = geo.boundingBox!;
        const posAttribute = geo.attributes.position;
        const uvAttribute = geo.attributes.uv;
        const sizeX = bbox.max.x - bbox.min.x;
        const sizeY = bbox.max.y - bbox.min.y;
        for (let i = 0; i < posAttribute.count; i++) {
          const x = posAttribute.getX(i);
          const y = posAttribute.getY(i);
          const u = sizeX > 0 ? (x - bbox.min.x) / sizeX : 0.5;
          const v = sizeY > 0 ? (y - bbox.min.y) / sizeY : 0.5;
          uvAttribute.setXY(i, u, v);
        }
        
        const mesh = new THREE.Mesh(geo, [material, sideMaterial]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      };

      const createLinesForPanel = (localEntities: any[]) => {
        const cutPos: number[] = [];
        const creasePos: number[] = [];
        
        localEntities.forEach(e => {
          if (e.type === 'LINE') {
            if (e.isCrease) {
              creasePos.push(e.x1, e.y1, 0.015);
              creasePos.push(e.x2, e.y2, 0.015);
            } else {
              cutPos.push(e.x1, e.y1, 0.015);
              cutPos.push(e.x2, e.y2, 0.015);
            }
          }
        });
        
        const linesGroup = new THREE.Group();
        if (cutPos.length > 0) {
          const cutGeo = new THREE.BufferGeometry();
          cutGeo.setAttribute('position', new THREE.Float32BufferAttribute(cutPos, 3));
          const cutMat = new THREE.LineBasicMaterial({ color: 0xff3333, linewidth: 2 });
          linesGroup.add(new THREE.LineSegments(cutGeo, cutMat));
        }
        if (creasePos.length > 0) {
          const creaseGeo = new THREE.BufferGeometry();
          creaseGeo.setAttribute('position', new THREE.Float32BufferAttribute(creasePos, 3));
          const creaseMat = new THREE.LineBasicMaterial({ color: 0x33ff33, linewidth: 2 });
          linesGroup.add(new THREE.LineSegments(creaseGeo, creaseMat));
        }
        return linesGroup;
      };

      // 5. Intelligent Greedy Segment Stitcher for high-fidelity custom flap shapes with auto-healing and filleting
      const getCustomShapeForRegion = (
        xMin: number, 
        xMax: number, 
        yMin: number, 
        yMax: number, 
        yHinge: number, 
        isTop: boolean
      ): THREE.Shape | null => {
        const w = xMax - xMin;
        const h = yMax - yMin;
        const cx = (xMin + xMax) / 2;
        
        const segments: { p1: THREE.Vector2, p2: THREE.Vector2 }[] = [];
        shiftedEntities.forEach(e => {
          if (e.isCrease || e.type !== 'LINE') return;
          const midX = (e.x1 + e.x2) / 2;
          const midY = (e.y1 + e.y2) / 2;
          // Scaled tolerances: 15 * s = 1.5, 8 * s = 0.8 to capture flared parts of tuck flaps and handle crease misalignments in scaled units
          if (midX >= xMin - 1.5 && midX <= xMax + 1.5 && midY >= yMin - 0.8 && midY <= yMax + 0.8) {
            const p1 = new THREE.Vector2(e.x1 - cx, e.y1 - yHinge);
            const p2 = new THREE.Vector2(e.x2 - cx, e.y2 - yHinge);
            segments.push({ p1, p2 });
          }
        });

        if (segments.length === 0) {
          return null;
        }

        // Group endpoints that are close to each other to heal any minor gaps. Scaled tolerance: 2.5 * s = 0.25
        const vertices: THREE.Vector2[] = [];
        const getVertexIndex = (pt: THREE.Vector2): number => {
          for (let i = 0; i < vertices.length; i++) {
            if (vertices[i].distanceTo(pt) < 0.25) {
              return i;
            }
          }
          vertices.push(pt.clone());
          return vertices.length - 1;
        };

        const edges: { u: number; v: number; dist: number; avgY: number }[] = [];
        segments.forEach(seg => {
          const u = getVertexIndex(seg.p1);
          const v = getVertexIndex(seg.p2);
          if (u !== v) {
            const dist = seg.p1.distanceTo(seg.p2);
            const avgY = (seg.p1.y + seg.p2.y) / 2;
            edges.push({ u, v, dist, avgY });
          }
        });

        if (vertices.length === 0) {
          return null;
        }

        // Build adjacency list
        const adj: { to: number; weight: number }[][] = Array.from({ length: vertices.length }, () => []);
        
        let minYVal = 0;
        let maxYVal = 0;
        vertices.forEach(v => {
          minYVal = Math.min(minYVal, v.y);
          maxYVal = Math.max(maxYVal, v.y);
        });

        edges.forEach(edge => {
          let weightFactor = 1.0;
          if (isTop) {
            weightFactor = (maxYVal - edge.avgY) + 0.1;
          } else {
            weightFactor = (edge.avgY - minYVal) + 0.1;
          }
          const weight = edge.dist * weightFactor;
          adj[edge.u].push({ to: edge.v, weight });
          adj[edge.v].push({ to: edge.u, weight });
        });

        // Smart Proactive Gap Healer: add bidirectional edges between any two endpoints within 8mm (scaled: 8.0 * s = 0.8)
        for (let i = 0; i < vertices.length; i++) {
          for (let j = i + 1; j < vertices.length; j++) {
            const d = vertices[i].distanceTo(vertices[j]);
            if (d < 0.8) {
              adj[i].push({ to: j, weight: d * 1.2 });
              adj[j].push({ to: i, weight: d * 1.2 });
            }
          }
        }

        // Find start and end vertices: they must be closest to the hinge endpoints
        let startVertex = -1;
        let endVertex = -1;
        let minStartD = Infinity;
        let minEndD = Infinity;
        const leftTarget = new THREE.Vector2(-w / 2, 0);
        const rightTarget = new THREE.Vector2(w / 2, 0);

        for (let i = 0; i < vertices.length; i++) {
          const dStart = vertices[i].distanceTo(leftTarget);
          const dEnd = vertices[i].distanceTo(rightTarget);
          if (dStart < minStartD) {
            minStartD = dStart;
            startVertex = i;
          }
          if (dEnd < minEndD) {
            minEndD = dEnd;
            endVertex = i;
          }
        }

        // Run Dijkstra to find the outer-most continuous path from start to end with automatic gap healing
        let pathVertices: THREE.Vector2[] = [];
        const maxGapHeals = 3;
        for (let heal = 0; heal < maxGapHeals; heal++) {
          const dists = new Array(vertices.length).fill(Infinity);
          const parentOf = new Array(vertices.length).fill(-1);
          const visited = new Set<number>();

          dists[startVertex] = 0;

          for (let step = 0; step < vertices.length; step++) {
            let u = -1;
            let minDist = Infinity;
            for (let i = 0; i < vertices.length; i++) {
              if (!visited.has(i) && dists[i] < minDist) {
                minDist = dists[i];
                u = i;
              }
            }

            if (u === -1 || u === endVertex) {
              break;
            }

            visited.add(u);

            adj[u].forEach(edge => {
              if (!visited.has(edge.to)) {
                const newD = dists[u] + edge.weight;
                if (newD < dists[edge.to]) {
                  dists[edge.to] = newD;
                  parentOf[edge.to] = u;
                }
              }
            });
          }

          if (dists[endVertex] !== Infinity) {
            let curr = endVertex;
            while (curr !== -1) {
              pathVertices.push(vertices[curr]);
              curr = parentOf[curr];
            }
            pathVertices.reverse();
            break; // Successfully connected!
          }

          // Gap Healer: find the connected component from startVertex
          const startComp = new Set<number>();
          const queue = [startVertex];
          startComp.add(startVertex);
          while (queue.length > 0) {
            const currNode = queue.shift()!;
            adj[currNode].forEach(edge => {
              if (!startComp.has(edge.to)) {
                startComp.add(edge.to);
                queue.push(edge.to);
              }
            });
          }

          let closestU = -1;
          let closestV = -1;
          let minGapDist = Infinity;

          for (const u of Array.from(startComp)) {
            for (let v = 0; v < vertices.length; v++) {
              if (!startComp.has(v)) {
                const d = vertices[u].distanceTo(vertices[v]);
                if (d < minGapDist) {
                  minGapDist = d;
                  closestU = u;
                  closestV = v;
                }
              }
            }
          }

          // Heal the gap with an artificial edge if distance is reasonable (scaled: 15.0 * s = 1.5)
          if (minGapDist < 1.5 && closestU !== -1 && closestV !== -1) {
            adj[closestU].push({ to: closestV, weight: minGapDist });
            adj[closestV].push({ to: closestU, weight: minGapDist });
          } else {
            break; // Gap too large to bridge automatically
          }
        }

        // Robust Greedy Fallback Path if Dijkstra fails due to disconnected graph segments
        if (pathVertices.length < 3) {
          pathVertices = [];
          const visited = new Set<number>();
          let curr = startVertex;
          pathVertices.push(vertices[curr]);
          visited.add(curr);

          while (visited.size < vertices.length) {
            let next = -1;
            let minDist = Infinity;
            for (let i = 0; i < vertices.length; i++) {
              if (!visited.has(i)) {
                const d = vertices[curr].distanceTo(vertices[i]);
                if (d < minDist) {
                  minDist = d;
                  next = i;
                }
              }
            }

            if (next === -1 || minDist > (w * 0.5)) {
              break;
            }

            curr = next;
            pathVertices.push(vertices[curr]);
            visited.add(curr);

            if (curr === endVertex) {
              break;
            }
          }

          // If greedy chain doesn't reach endVertex, artificially force-connect it
          if (curr !== endVertex && endVertex !== -1 && pathVertices.length > 0) {
            pathVertices.push(vertices[endVertex]);
          }
        }

        // Fallback to default trapezoid if path finding and greedy fallback BOTH failed
        if (pathVertices.length < 3) {
          const shape = new THREE.Shape();
          const hVal = isTop ? h : -h;
          const taper = w * 0.08;
          shape.moveTo(-w/2 + taper, 0);
          shape.lineTo(-w/2 + taper, hVal * 0.95);
          shape.lineTo(w/2 - taper, hVal * 0.95);
          shape.lineTo(w/2 - taper, 0);
          shape.closePath();
          return shape;
        }

        // FORCE gap elimination: anchor the path perfectly to the exact hinge corners
        const exactLeft = new THREE.Vector2(-w / 2, 0);
        const exactRight = new THREE.Vector2(w / 2, 0);
        
        const d1L = pathVertices[0].distanceTo(exactLeft);
        const d1R = pathVertices[0].distanceTo(exactRight);
        
        if (d1L < d1R) {
            if (d1L > 0.001) pathVertices.unshift(exactLeft);
            if (pathVertices[pathVertices.length - 1].distanceTo(exactRight) > 0.001) {
                pathVertices.push(exactRight);
            }
        } else {
            if (d1R > 0.001) pathVertices.unshift(exactRight);
            if (pathVertices[pathVertices.length - 1].distanceTo(exactLeft) > 0.001) {
                pathVertices.push(exactLeft);
            }
        }

        // 5b. Internal Cutout Loop / Locking Slit Detector (scaled: 2.5 * s = 0.25, 1.5 * s = 0.15)
        const holePaths: THREE.Path[] = [];
        try {
          const unusedSegments = segments.filter(seg => {
            const p1Close = pathVertices.some(v => v.distanceTo(seg.p1) < 0.25) || Math.abs(seg.p1.y) < 0.25;
            const p2Close = pathVertices.some(v => v.distanceTo(seg.p2) < 0.25) || Math.abs(seg.p2.y) < 0.25;
            return !p1Close && !p2Close;
          });

          const holeVertices: THREE.Vector2[] = [];
          const getHoleVertexIdx = (pt: THREE.Vector2) => {
            for (let i = 0; i < holeVertices.length; i++) {
              if (holeVertices[i].distanceTo(pt) < 0.15) return i;
            }
            holeVertices.push(pt.clone());
            return holeVertices.length - 1;
          };

          const holeEdges: { u: number; v: number }[] = [];
          unusedSegments.forEach(seg => {
            const u = getHoleVertexIdx(seg.p1);
            const v = getHoleVertexIdx(seg.p2);
            if (u !== v) holeEdges.push({ u, v });
          });

          const holeAdj: number[][] = Array.from({ length: holeVertices.length }, () => []);
          holeEdges.forEach(e => {
            holeAdj[e.u].push(e.v);
            holeAdj[e.v].push(e.u);
          });

          const holeVisited = new Set<number>();
          for (let start = 0; start < holeVertices.length; start++) {
            if (holeVisited.has(start) || holeAdj[start].length < 2) continue;

            const loop: number[] = [];
            let curr = start;
            let prev = -1;
            let isClosed = false;

            while (curr !== -1) {
              loop.push(curr);
              holeVisited.add(curr);

              let next = -1;
              const neighbors = holeAdj[curr];
              for (const n of neighbors) {
                if (n === start && loop.length > 2) {
                  isClosed = true;
                  break;
                }
                if (n !== prev && !holeVisited.has(n)) {
                  next = n;
                  break;
                }
              }

              if (isClosed) break;
              prev = curr;
              curr = next;
            }

            if (isClosed && loop.length >= 3) {
              const hPath = new THREE.Path();
              hPath.moveTo(holeVertices[loop[0]].x, holeVertices[loop[0]].y);
              for (let i = 1; i < loop.length; i++) {
                hPath.lineTo(holeVertices[loop[i]].x, holeVertices[loop[i]].y);
              }
              hPath.closePath();
              holePaths.push(hPath);
            }
          }
        } catch (err) {
          console.error("Failed to detect internal cutout holes:", err);
        }

        // Build clean 2D shape with beautiful corner fillets (scaled: 3.0 * s = 0.3, 5.0 * s = 0.5)
        const shape = new THREE.Shape();
        if (pathVertices.length >= 3) {
          shape.moveTo(pathVertices[0].x, pathVertices[0].y);
          for (let i = 1; i < pathVertices.length - 1; i++) {
            const prev = pathVertices[i - 1];
            const curr = pathVertices[i];
            const next = pathVertices[i + 1];

            const d1 = new THREE.Vector2().subVectors(curr, prev);
            const d2 = new THREE.Vector2().subVectors(next, curr);
            const len1 = d1.length();
            const len2 = d2.length();

            if (len1 > 0.3 && len2 > 0.3) {
              const d1Norm = d1.clone().normalize();
              const d2Norm = d2.clone().normalize();
              const dot = d1Norm.dot(d2Norm);

              // If it's a real corner turn
              if (dot > -0.95 && dot < 0.95) {
                const filletRadius = Math.min(0.5, len1 * 0.25, len2 * 0.25);
                const p1 = new THREE.Vector2().addScaledVector(d1Norm, -filletRadius).add(curr);
                const p2 = new THREE.Vector2().addScaledVector(d2Norm, filletRadius).add(curr);

                shape.lineTo(p1.x, p1.y);
                shape.quadraticCurveTo(curr.x, curr.y, p2.x, p2.y);
                continue;
              }
            }
            shape.lineTo(curr.x, curr.y);
          }
          shape.lineTo(pathVertices[pathVertices.length - 1].x, pathVertices[pathVertices.length - 1].y);
        } else {
          shape.moveTo(pathVertices[0].x, pathVertices[0].y);
          for (let i = 1; i < pathVertices.length; i++) {
            shape.lineTo(pathVertices[i].x, pathVertices[i].y);
          }
        }
        shape.closePath();

        // Feed internal cutout loops as holes into the Three.js shape
        if (holePaths.length > 0) {
          shape.holes = holePaths;
        }

        return shape;
      };

      // 6. Build standard helper shapes
      const createRectShape = (w: number, h: number, pIdx?: number): THREE.Shape => {
        const shape = new THREE.Shape();
        const halfW = w / 2;
        const halfH = h / 2;
        shape.moveTo(-halfW, -halfH);
        shape.lineTo(halfW, -halfH);
        shape.lineTo(halfW, halfH);
        shape.lineTo(-halfW, halfH);
        shape.closePath();
        
        // Dynamically detect any internal cutouts (windows, etc.) from DXF for this panel
        if (pIdx !== undefined) {
          try {
            const midEntities = shiftedEntities.filter(e => {
              const { pIdx: eIdx, yZone } = getSubPanelIndex((e.x1 + (e.x2 ?? e.x1)) / 2, (e.y1 + (e.y2 ?? e.y1)) / 2);
              return eIdx === pIdx && yZone === 'mid' && !e.isCrease && e.type === 'LINE';
            });
            const holeSegments: { p1: THREE.Vector2, p2: THREE.Vector2 }[] = [];
            
            // Map panel index to real X bounds
            let xMin = 0, xMax = 0;
            if (pIdx === 0) { xMin = 0; xMax = cX0; }
            else if (pIdx === 1) { xMin = cX0; xMax = cX1; }
            else if (pIdx === 2) { xMin = cX1; xMax = cX2; }
            else if (pIdx === 3) { xMin = cX2; xMax = cX3; }
            else if (pIdx === 4) { xMin = cX3; xMax = cX4; }
            
            const cx = (xMin + xMax) / 2;
            const cy = (cY0 + cY1) / 2;
            
            midEntities.forEach(e => {
              // Ignore border lines of the panel
              if (Math.abs(e.x1 - xMin) < 0.5 || Math.abs(e.x1 - xMax) < 0.5 || 
                  Math.abs(e.y1 - cY0) < 0.5 || Math.abs(e.y1 - cY1) < 0.5) return;
                  
              const p1 = new THREE.Vector2(e.x1 - cx, e.y1 - cy);
              const p2 = new THREE.Vector2(e.x2! - cx, e.y2! - cy);
              holeSegments.push({ p1, p2 });
            });
            
            if (holeSegments.length >= 3) {
                // Group points to close loops
                const pts: THREE.Vector2[] = [];
                const edges: {u: number, v: number}[] = [];
                const getPtIdx = (v: THREE.Vector2) => {
                    for(let i=0; i<pts.length; i++) if (pts[i].distanceTo(v) < 0.25) return i;
                    pts.push(v);
                    return pts.length - 1;
                };
                holeSegments.forEach(seg => {
                    const u = getPtIdx(seg.p1);
                    const v = getPtIdx(seg.p2);
                    if (u !== v) edges.push({u, v});
                });
                
                // Extremely simple loop finding for windows
                if (edges.length >= 3) {
                    const holePath = new THREE.Path();
                    let curr = edges[0].u;
                    let prev = -1;
                    holePath.moveTo(pts[curr].x, pts[curr].y);
                    
                    const visitedEdges = new Set<number>();
                    let edgesWalked = 0;
                    while (edgesWalked < edges.length) {
                        const edgeIdx = edges.findIndex((e, i) => !visitedEdges.has(i) && (e.u === curr || e.v === curr));
                        if (edgeIdx === -1) break;
                        visitedEdges.add(edgeIdx);
                        const edge = edges[edgeIdx];
                        const next = (edge.u === curr) ? edge.v : edge.u;
                        holePath.lineTo(pts[next].x, pts[next].y);
                        curr = next;
                        edgesWalked++;
                        if (curr === edges[0].u) {
                            holePath.closePath();
                            if (!shape.holes) shape.holes = [];
                            shape.holes.push(holePath);
                            break;
                        }
                    }
                }
            }
          } catch (e) { console.warn(e); }
        }
        
        return shape;
      };

      const createGlueTabShape3D = (w: number, h: number): THREE.Shape => {
        const shape = new THREE.Shape();
        const halfH = h / 2;
        const taper = h * 0.05;
        shape.moveTo(w / 2, -halfH);
        shape.lineTo(-w / 2, -halfH + taper);
        shape.lineTo(-w / 2, halfH - taper);
        shape.lineTo(w / 2, halfH);
        shape.closePath();
        return shape;
      };

      // 7. Define main 3D groups and form the fold-parent-hierarchy
      const backGroup = new THREE.Group();
      const glueTabGroup = new THREE.Group();
      const rightSideGroup = new THREE.Group();
      const frontGroup = new THREE.Group();
      const leftSideGroup = new THREE.Group();

      boxRoot.add(backGroup);
      backGroup.position.set(0, 0, -w_p2 / 2); // Center box by shifting back panel rearwards

      // Fold chain assembly
      backGroup.add(glueTabGroup);
      glueTabGroup.position.set(-w_p1 / 2, 0, 0);

      backGroup.add(rightSideGroup);
      rightSideGroup.position.set(w_p1 / 2, 0, 0);

      rightSideGroup.add(frontGroup);
      frontGroup.position.set(w_p2, 0, 0);

      frontGroup.add(leftSideGroup);
      leftSideGroup.position.set(w_p3, 0, 0);

      // Create main solid meshes
      const glueTabMesh = createExtrudedPanelMesh(createGlueTabShape3D(w_glue, h_body));
      glueTabMesh.position.set(-w_glue / 2, 0, 0);
      glueTabGroup.add(glueTabMesh);

      const backMesh = createExtrudedPanelMesh(createRectShape(w_p1, h_body, 1));
      backMesh.position.set(0, 0, 0);
      backGroup.add(backMesh);

      const rightSideMesh = createExtrudedPanelMesh(createRectShape(w_p2, h_body, 2));
      rightSideMesh.position.set(w_p2 / 2, 0, 0);
      rightSideGroup.add(rightSideMesh);

      const frontMesh = createExtrudedPanelMesh(createRectShape(w_p3, h_body, 3));
      frontMesh.position.set(w_p3 / 2, 0, 0);
      frontGroup.add(frontMesh);

      const leftSideMesh = createExtrudedPanelMesh(createRectShape(w_p4, h_body, 4));
      leftSideMesh.position.set(w_p4 / 2, 0, 0);
      leftSideGroup.add(leftSideMesh);

      // Create overlay lines for main panels
      const filterMidEntities = (idx: number) => shiftedEntities.filter(e => {
        const { pIdx, yZone } = getSubPanelIndex((e.x1 + (e.x2 ?? e.x1)) / 2, (e.y1 + (e.y2 ?? e.y1)) / 2);
        return pIdx === idx && yZone === 'mid';
      });

      const glueTabLines = createLinesForPanel(filterMidEntities(0).map(e => ({
        ...e,
        x1: e.x1 - cX0,
        y1: e.y1 - (cY0 + cY1)/2,
        x2: e.type === 'LINE' ? e.x2 - cX0 : undefined,
        y2: e.type === 'LINE' ? e.y2 - (cY0 + cY1)/2 : undefined,
      })));
      glueTabGroup.add(glueTabLines);

      const backLines = createLinesForPanel(filterMidEntities(1).map(e => ({
        ...e,
        x1: e.x1 - (cX0 + cX1)/2,
        y1: e.y1 - (cY0 + cY1)/2,
        x2: e.type === 'LINE' ? e.x2 - (cX0 + cX1)/2 : undefined,
        y2: e.type === 'LINE' ? e.y2 - (cY0 + cY1)/2 : undefined,
      })));
      backGroup.add(backLines);

      const rightLines = createLinesForPanel(filterMidEntities(2).map(e => ({
        ...e,
        x1: e.x1 - cX1,
        y1: e.y1 - (cY0 + cY1)/2,
        x2: e.type === 'LINE' ? e.x2 - cX1 : undefined,
        y2: e.type === 'LINE' ? e.y2 - (cY0 + cY1)/2 : undefined,
      })));
      rightSideGroup.add(rightLines);

      const frontLines = createLinesForPanel(filterMidEntities(3).map(e => ({
        ...e,
        x1: e.x1 - cX2,
        y1: e.y1 - (cY0 + cY1)/2,
        x2: e.type === 'LINE' ? e.x2 - cX2 : undefined,
        y2: e.type === 'LINE' ? e.y2 - (cY0 + cY1)/2 : undefined,
      })));
      frontGroup.add(frontLines);

      const leftLines = createLinesForPanel(filterMidEntities(4).map(e => ({
        ...e,
        x1: e.x1 - cX3,
        y1: e.y1 - (cY0 + cY1)/2,
        x2: e.type === 'LINE' ? e.x2 - cX3 : undefined,
        y2: e.type === 'LINE' ? e.y2 - (cY0 + cY1)/2 : undefined,
      })));
      leftSideGroup.add(leftLines);

      // Arrays to hold all top/bottom/tuck hinge groups for folding animation
      const topFlapGroupsToFold: { group: THREE.Group; panelIdx: number }[] = [];
      const botFlapGroupsToFold: { group: THREE.Group; panelIdx: number }[] = [];
      const topTuckGroupsToFold: { group: THREE.Group; panelIdx: number }[] = [];
      const botTuckGroupsToFold: { group: THREE.Group; panelIdx: number }[] = [];

      // 8. Build Top & Bottom Flaps for Panels 1, 2, 3, 4 with secondary folds support
      const parentGroups = [null, backGroup, rightSideGroup, frontGroup, leftSideGroup];

      for (let i = 1; i <= 4; i++) {
        const parent = parentGroups[i];
        if (!parent) continue;

        const xMin = creaseX[i-1];
        const xMax = creaseX[i];
        const cx_i = (xMin + xMax) / 2;
        const xLoc = i === 1 ? 0 : (i === 2 ? w_p2/2 : (i === 3 ? w_p3/2 : w_p4/2));

        // -- TOP FLAPS & TUCK LIDS --
        const topCreases = shiftedEntities.filter(e => 
          e.isCrease && 
          e.type === 'LINE' && 
          Math.abs(e.y1 - e.y2) < 2.0 && 
          ((e.x1 + e.x2)/2 >= xMin - 2) && 
          ((e.x1 + e.x2)/2 <= xMax + 2) && 
          ((e.y1 + e.y2)/2 > cY1 + 5)
        );
        let yCreaseTop = -1;
        if (topCreases.length > 0) {
          topCreases.sort((a, b) => ((a.y1 + a.y2)/2) - ((b.y1 + b.y2)/2));
          yCreaseTop = (topCreases[0].y1 + topCreases[0].y2) / 2;
        }

        const topFlapGroup = new THREE.Group();
        topFlapGroup.position.set(xLoc, h_body/2, 0);

        let topFlapAdded = false;

        if (yCreaseTop > cY1) {
          // Double fold (Tuck Flap)
          const shapeA = getCustomShapeForRegion(xMin, xMax, cY1, yCreaseTop, cY1, true);
          const meshA = createExtrudedPanelMesh(shapeA);
          if (meshA) {
            topFlapGroup.add(meshA);
            topFlapAdded = true;

            const localEntitiesA = shiftedEntities.filter(e => {
              const mx = (e.x1 + (e.x2 ?? e.x1)) / 2;
              const my = (e.y1 + (e.y2 ?? e.y1)) / 2;
              return mx >= xMin - 2 && mx <= xMax + 2 && my >= cY1 && my <= yCreaseTop;
            }).map(e => ({
              ...e,
              x1: e.x1 - cx_i,
              y1: e.y1 - cY1,
              x2: e.type === 'LINE' ? e.x2 - cx_i : undefined,
              y2: e.type === 'LINE' ? e.y2 - cY1 : undefined,
            }));
            topFlapGroup.add(createLinesForPanel(localEntitiesA));
          }

          const tuckGroup = new THREE.Group();
          tuckGroup.position.set(0, yCreaseTop - cY1, 0);

          const shapeB = getCustomShapeForRegion(xMin, xMax, yCreaseTop, maxY, yCreaseTop, true);
          const meshB = createExtrudedPanelMesh(shapeB);
          if (meshB) {
            tuckGroup.add(meshB);
            topFlapGroup.add(tuckGroup);
            topTuckGroupsToFold.push({ group: tuckGroup, panelIdx: i });
            topFlapAdded = true;

            const localEntitiesB = shiftedEntities.filter(e => {
              const mx = (e.x1 + (e.x2 ?? e.x1)) / 2;
              const my = (e.y1 + (e.y2 ?? e.y1)) / 2;
              return mx >= xMin - 2 && mx <= xMax + 2 && my > yCreaseTop;
            }).map(e => ({
              ...e,
              x1: e.x1 - cx_i,
              y1: e.y1 - yCreaseTop,
              x2: e.type === 'LINE' ? e.x2 - cx_i : undefined,
              y2: e.type === 'LINE' ? e.y2 - yCreaseTop : undefined,
            }));
            tuckGroup.add(createLinesForPanel(localEntitiesB));
          }
        } else {
          // Single piece top flap
          const shape = getCustomShapeForRegion(xMin, xMax, cY1, maxY, cY1, true);
          const mesh = createExtrudedPanelMesh(shape);
          if (mesh) {
            topFlapGroup.add(mesh);
            topFlapAdded = true;

            const localEntities = shiftedEntities.filter(e => {
              const mx = (e.x1 + (e.x2 ?? e.x1)) / 2;
              const my = (e.y1 + (e.y2 ?? e.y1)) / 2;
              return mx >= xMin - 2 && mx <= xMax + 2 && my >= cY1;
            }).map(e => ({
              ...e,
              x1: e.x1 - cx_i,
              y1: e.y1 - cY1,
              x2: e.type === 'LINE' ? e.x2 - cx_i : undefined,
              y2: e.type === 'LINE' ? e.y2 - cY1 : undefined,
            }));
            topFlapGroup.add(createLinesForPanel(localEntities));
          }
        }

        if (topFlapAdded) {
          parent.add(topFlapGroup);
          topFlapGroupsToFold.push({ group: topFlapGroup, panelIdx: i });
        }

        // -- BOTTOM FLAPS & TUCK LIDS --
        const botCreases = shiftedEntities.filter(e => 
          e.isCrease && 
          e.type === 'LINE' && 
          Math.abs(e.y1 - e.y2) < 2.0 && 
          ((e.x1 + e.x2)/2 >= xMin - 2) && 
          ((e.x1 + e.x2)/2 <= xMax + 2) && 
          ((e.y1 + e.y2)/2 < cY0 - 5)
        );
        let yCreaseBot = -1;
        if (botCreases.length > 0) {
          botCreases.sort((a, b) => ((b.y1 + b.y2)/2) - ((a.y1 + a.y2)/2));
          yCreaseBot = (botCreases[0].y1 + botCreases[0].y2) / 2;
        }

        const botFlapGroup = new THREE.Group();
        botFlapGroup.position.set(xLoc, -h_body/2, 0);

        let botFlapAdded = false;

        const decodedModelId = decodeURIComponent(selectedModelId).toLowerCase();
        const isLockBottomBox = 
          decodedModelId.includes('snap-lock') || 
          decodedModelId.includes('lock-bottom') || 
          decodedModelId.includes('2110') || 
          decodedModelId.includes('lock') ||
          decodedModelId.includes('قفل') ||
          decodedModelId.includes('crash');

        if (yCreaseBot < cY0 && yCreaseBot !== -1 && !isLockBottomBox) {
          // Double fold bottom tuck
          const shapeA = getCustomShapeForRegion(xMin, xMax, yCreaseBot, cY0, cY0, false);
          const meshA = createExtrudedPanelMesh(shapeA);
          if (meshA) {
            botFlapGroup.add(meshA);
            botFlapAdded = true;

            const localEntitiesA = shiftedEntities.filter(e => {
              const mx = (e.x1 + (e.x2 ?? e.x1)) / 2;
              const my = (e.y1 + (e.y2 ?? e.y1)) / 2;
              return mx >= xMin - 2 && mx <= xMax + 2 && my >= yCreaseBot && my <= cY0;
            }).map(e => ({
              ...e,
              x1: e.x1 - cx_i,
              y1: e.y1 - cY0,
              x2: e.type === 'LINE' ? e.x2 - cx_i : undefined,
              y2: e.type === 'LINE' ? e.y2 - cY0 : undefined,
            }));
            botFlapGroup.add(createLinesForPanel(localEntitiesA));
          }

          const tuckGroup = new THREE.Group();
          tuckGroup.position.set(0, yCreaseBot - cY0, 0);

          const shapeB = getCustomShapeForRegion(xMin, xMax, minY, yCreaseBot, yCreaseBot, false);
          const meshB = createExtrudedPanelMesh(shapeB);
          if (meshB) {
            tuckGroup.add(meshB);
            botFlapGroup.add(tuckGroup);
            botTuckGroupsToFold.push({ group: tuckGroup, panelIdx: i });
            botFlapAdded = true;

            const localEntitiesB = shiftedEntities.filter(e => {
              const mx = (e.x1 + (e.x2 ?? e.x1)) / 2;
              const my = (e.y1 + (e.y2 ?? e.y1)) / 2;
              return mx >= xMin - 2 && mx <= xMax + 2 && my < yCreaseBot;
            }).map(e => ({
              ...e,
              x1: e.x1 - cx_i,
              y1: e.y1 - yCreaseBot,
              x2: e.type === 'LINE' ? e.x2 - cx_i : undefined,
              y2: e.type === 'LINE' ? e.y2 - yCreaseBot : undefined,
            }));
            tuckGroup.add(createLinesForPanel(localEntitiesB));
          }
        } else {
          // Single piece bottom flap
          const shape = getCustomShapeForRegion(xMin, xMax, minY, cY0, cY0, false);
          const mesh = createExtrudedPanelMesh(shape);
          if (mesh) {
            botFlapGroup.add(mesh);
            botFlapAdded = true;

            const localEntities = shiftedEntities.filter(e => {
              const mx = (e.x1 + (e.x2 ?? e.x1)) / 2;
              const my = (e.y1 + (e.y2 ?? e.y1)) / 2;
              return mx >= xMin - 2 && mx <= xMax + 2 && my <= cY0;
            }).map(e => ({
              ...e,
              x1: e.x1 - cx_i,
              y1: e.y1 - cY0,
              x2: e.type === 'LINE' ? e.x2 - cx_i : undefined,
              y2: e.type === 'LINE' ? e.y2 - cY0 : undefined,
            }));
            botFlapGroup.add(createLinesForPanel(localEntities));
          }
        }

        if (botFlapAdded) {
          parent.add(botFlapGroup);
          botFlapGroupsToFold.push({ group: botFlapGroup, panelIdx: i });
        }
      }

      // 9. Premium progressive and collision-free folding animator
      updateFolds = () => {
        const ratio = isOpenRatioRef.current;
        
        // Custom easing function: smooth sine ease-in-out
        const easeInOut = (x: number) => {
          return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
        };
        const smoothRatio = easeInOut(ratio);
        const angle = (Math.PI / 2) * smoothRatio;

        // Side walls fold perpendicular to each other to enclose the 3D space
        if (glueTabGroup) {
          glueTabGroup.rotation.y = angle + 0.01; // Micro clearance angle
          glueTabGroup.position.z = -t * 0.15 * smoothRatio; // Shift inwards to nest perfectly
        }
        if (rightSideGroup) {
          rightSideGroup.rotation.y = -angle;
          rightSideGroup.position.z = -t * 0.1 * smoothRatio;
        }
        if (frontGroup) {
          frontGroup.rotation.y = -angle;
          frontGroup.position.z = -t * 0.2 * smoothRatio;
        }
        if (leftSideGroup) {
          leftSideGroup.rotation.y = -angle;
          leftSideGroup.position.z = -t * 0.3 * smoothRatio;
        }

        // "Flap-in" progressive folding mechanics to prevent panel self-intersection
        // 1. Dust flaps (panels 2 and 4) fold first (0.0 to 0.55 ratio)
        const ratioDust = ratio <= 0.55 ? ratio / 0.55 : 1.0;
        const angleDust = (Math.PI / 2) * easeInOut(ratioDust);

        // 2. Main lids (panels 1 and 3) fold second (0.35 to 0.85 ratio)
        const ratioLid = ratio < 0.35 ? 0.0 : (ratio <= 0.85 ? (ratio - 0.35) / 0.5 : 1.0);
        const angleLid = (Math.PI / 2) * easeInOut(ratioLid);

        // 3. Tuck flaps fold third (0.7 to 1.0 ratio)
        const ratioTuck = ratio < 0.7 ? 0.0 : (ratio - 0.7) / 0.3;
        const angleTuck = (Math.PI / 2) * easeInOut(ratioTuck);

        // Apply progressive folding angles to prevent collision / overlapping
        // Panel 1 (back) folds inwards with positive rotation for top and negative for bottom.
        // Panels 2, 3, 4 fold inwards with negative rotation for top and positive for bottom.
        topFlapGroupsToFold.forEach(item => {
          const isDustFlap = item.panelIdx === 2 || item.panelIdx === 4;
          const a = isDustFlap ? angleDust : angleLid;
          
          // Apply dynamic clearance along Z axis depending on folding speed to prevent overlapping
          if (isDustFlap) {
            item.group.position.z = -t * 0.5 * ratioDust;
          } else {
            item.group.position.z = t * 0.1 * ratioLid;
          }
          item.group.rotation.x = a;
        });

        topTuckGroupsToFold.forEach(item => {
          item.group.rotation.x = angleTuck;
        });

        botFlapGroupsToFold.forEach(item => {
          const isDustFlap = item.panelIdx === 2 || item.panelIdx === 4;
          const a = isDustFlap ? angleDust : angleLid;
          
          if (isDustFlap) {
            item.group.position.z = -t * 0.5 * ratioDust;
          } else {
            item.group.position.z = t * 0.1 * ratioLid;
          }
          item.group.rotation.x = -a;
        });

        botTuckGroupsToFold.forEach(item => {
          item.group.rotation.x = -angleTuck;
        });
      };

    } else if (isTelescopic) {

      // --- TELESCOPIC 2-PIECE MODEL (LID & TRAY) ---
      const trayGroup = new THREE.Group();
      boxRoot.add(trayGroup);

      const lidGroup = new THREE.Group();
      boxRoot.add(lidGroup);

      // Tray panels (w x d bottom plate, and 4 walls of height h)
      const bottomPlate = createPanel(w, d);
      bottomPlate.rotation.x = -Math.PI / 2;
      bottomPlate.position.y = -h / 2;
      trayGroup.add(bottomPlate);

      const frontPlate = createPanel(w, h);
      frontPlate.position.set(0, 0, d/2);
      trayGroup.add(frontPlate);

      const backPlate = createPanel(w, h);
      backPlate.position.set(0, 0, -d/2);
      trayGroup.add(backPlate);

      const leftPlate = createPanel(d, h);
      leftPlate.rotation.y = -Math.PI / 2;
      leftPlate.position.set(-w/2, 0, 0);
      trayGroup.add(leftPlate);

      const rightPlate = createPanel(d, h);
      rightPlate.rotation.y = Math.PI / 2;
      rightPlate.position.set(w/2, 0, 0);
      trayGroup.add(rightPlate);

      // Lid panels (larger by tolerance factor, walls of height h * 0.55)
      const lw = w * 1.04;
      const ld = d * 1.04;
      const lh = h * 0.55;

      const topPlate = createPanel(lw, ld);
      topPlate.rotation.x = Math.PI / 2;
      topPlate.position.y = h/2 + 0.01;
      lidGroup.add(topPlate);

      const lFrontPlate = createPanel(lw, lh);
      lFrontPlate.position.set(0, h/2 - lh/2, ld/2);
      lidGroup.add(lFrontPlate);

      const lBackPlate = createPanel(lw, lh);
      lBackPlate.position.set(0, h/2 - lh/2, -ld/2);
      lidGroup.add(lBackPlate);

      const lLeftPlate = createPanel(ld, lh);
      lLeftPlate.rotation.y = -Math.PI / 2;
      lLeftPlate.position.set(-lw/2, h/2 - lh/2, 0);
      lidGroup.add(lLeftPlate);

      const lRightPlate = createPanel(ld, lh);
      lRightPlate.rotation.y = Math.PI / 2;
      lRightPlate.position.set(lw/2, h/2 - lh/2, 0);
      lidGroup.add(lRightPlate);

      updateFolds = () => {
        const ratio = isOpenRatioRef.current;
        // Slide the lid group upwards dynamically to show reveal
        const offset = h * 1.8 * ratio;
        lidGroup.position.y = offset;

        const explodeOffset = isExplodedRef.current ? 3 : 0;
        lFrontPlate.position.z = ld/2 + explodeOffset;
        lBackPlate.position.z = -ld/2 - explodeOffset;
        lLeftPlate.position.x = -lw/2 - explodeOffset;
        lRightPlate.position.x = lw/2 + explodeOffset;

        frontPlate.position.z = d/2 + explodeOffset;
        backPlate.position.z = -d/2 - explodeOffset;
        leftPlate.position.x = -w/2 - explodeOffset;
        rightPlate.position.x = w/2 + explodeOffset;
      };

        } else if (isMailer) {
      // --- MAILER (KIBORDI) BOX ---
      // Accurate 0427 Dieline 3D Model
      
      const createRectShape = (rw, rh) => {
         const sh = new THREE.Shape();
         sh.moveTo(-rw/2, 0);
         sh.lineTo(rw/2, 0);
         sh.lineTo(rw/2, rh);
         sh.lineTo(-rw/2, rh);
         sh.lineTo(-rw/2, 0);
         return sh;
      };

      const createLidTuckShape = (tw, th) => {
         const sh = new THREE.Shape();
         const radius = th * 0.3;
         sh.moveTo(-tw/2, 0);
         sh.lineTo(-tw/2 + radius, th - radius);
         sh.quadraticCurveTo(-tw/2 + radius*1.5, th, -tw/2 + radius*3, th);
         sh.lineTo(tw/2 - radius*3, th);
         sh.quadraticCurveTo(tw/2 - radius*1.5, th, tw/2 - radius, th - radius);
         sh.lineTo(tw/2, 0);
         sh.lineTo(-tw/2, 0);
         return sh;
      };

      const createSideDustFlap = (fw, fh, isFront) => {
         const sh = new THREE.Shape();
         const cx = 0; // Attached to edge
         if (isFront) {
            sh.moveTo(0, 0);
            sh.lineTo(fw, 0);
            sh.lineTo(fw - fw*0.2, fh);
            sh.lineTo(0, fh);
         } else {
            sh.moveTo(0, 0);
            sh.lineTo(-fw, 0);
            sh.lineTo(-fw + fw*0.2, fh);
            sh.lineTo(0, fh);
         }
         sh.lineTo(0, 0);
         return sh;
      };

      const base = createPanel(w, d); // centered
      base.rotation.x = -Math.PI / 2;
      base.position.y = -h / 2;
      boxRoot.add(base);

      // Back wall & Lid
      const backHinge = new THREE.Group();
      backHinge.position.set(0, 0, -d/2);
      base.add(backHinge);
      
      const back = createPanel(w, h, createRectShape(w, h));
      back.rotation.x = Math.PI / 2;
      backHinge.add(back);

      const lidHinge = new THREE.Group();
      lidHinge.position.set(0, h, 0);
      back.add(lidHinge);
      
      const lid = createPanel(w, d, createRectShape(w, d));
      lid.rotation.x = -Math.PI / 2;
      lidHinge.add(lid);

      const lidTuckHinge = new THREE.Group();
      lidTuckHinge.position.set(0, d, 0);
      lid.add(lidTuckHinge);
      
      const lidTuck = createPanel(w * 0.9, h * 0.4, createLidTuckShape(w * 0.9, h * 0.4));
      lidTuck.rotation.x = Math.PI / 2;
      lidTuckHinge.add(lidTuck);

      // Front wall & Roll-over
      const frontHinge = new THREE.Group();
      frontHinge.position.set(0, 0, d/2);
      base.add(frontHinge);
      
      const front = createPanel(w, h, createRectShape(w, h));
      front.rotation.x = -Math.PI / 2;
      frontHinge.add(front);

      const frontRollHinge = new THREE.Group();
      frontRollHinge.position.set(0, h, 0);
      front.add(frontRollHinge);

      const frontRoll = createPanel(w, h, createRectShape(w, h));
      frontRoll.rotation.x = -Math.PI / 2;
      frontRollHinge.add(frontRoll);

      // Left fold sidewall
      const leftHinge = new THREE.Group();
      leftHinge.position.set(-w/2, 0, 0);
      base.add(leftHinge);
      
      const leftWall = createPanel(d, h, createRectShape(d, h));
      leftWall.rotation.y = -Math.PI / 2;
      leftWall.rotation.x = -Math.PI / 2;
      leftHinge.add(leftWall);

      const leftRollHinge = new THREE.Group();
      leftRollHinge.position.set(0, h, 0);
      leftWall.add(leftRollHinge);

      const leftRoll = createPanel(d, h, createRectShape(d, h));
      leftRoll.rotation.x = Math.PI / 2;
      leftRollHinge.add(leftRoll);

      // Left Dust Flaps (attached to leftWall)
      const leftFrontFlapHinge = new THREE.Group();
      leftFrontFlapHinge.position.set(d/2, 0, 0);
      leftWall.add(leftFrontFlapHinge);
      const leftFrontFlap = createPanel(d/2, h*0.9, createSideDustFlap(d/2, h*0.9, true));
      leftFrontFlapHinge.add(leftFrontFlap);

      const leftBackFlapHinge = new THREE.Group();
      leftBackFlapHinge.position.set(-d/2, 0, 0);
      leftWall.add(leftBackFlapHinge);
      const leftBackFlap = createPanel(d/2, h*0.9, createSideDustFlap(d/2, h*0.9, false));
      leftBackFlapHinge.add(leftBackFlap);

      // Right fold sidewall
      const rightHinge = new THREE.Group();
      rightHinge.position.set(w/2, 0, 0);
      base.add(rightHinge);
      
      const rightWall = createPanel(d, h, createRectShape(d, h));
      rightWall.rotation.y = Math.PI / 2;
      rightWall.rotation.x = -Math.PI / 2;
      rightHinge.add(rightWall);

      const rightRollHinge = new THREE.Group();
      rightRollHinge.position.set(0, h, 0);
      rightWall.add(rightRollHinge);

      const rightRoll = createPanel(d, h, createRectShape(d, h));
      rightRoll.rotation.x = Math.PI / 2;
      rightRollHinge.add(rightRoll);

      // Right Dust Flaps (attached to rightWall)
      const rightFrontFlapHinge = new THREE.Group();
      rightFrontFlapHinge.position.set(-d/2, 0, 0); // Note: due to rotation, front is -d/2 or +d/2 depending on orientation.
      rightWall.add(rightFrontFlapHinge);
      const rightFrontFlap = createPanel(d/2, h*0.9, createSideDustFlap(d/2, h*0.9, false));
      rightFrontFlapHinge.add(rightFrontFlap);

      const rightBackFlapHinge = new THREE.Group();
      rightBackFlapHinge.position.set(d/2, 0, 0);
      rightWall.add(rightBackFlapHinge);
      const rightBackFlap = createPanel(d/2, h*0.9, createSideDustFlap(d/2, h*0.9, true));
      rightBackFlapHinge.add(rightBackFlap);

      updateFolds = () => {
        const ratio = isOpenRatioRef.current;
        const angle = (Math.PI / 2) * ratio;

        // Folding Sequence for Mailer (from open to closed)
        // angle goes from 0 (closed) to Math.PI/2 (open)
        
        // 1. Dust flaps fold in (when closing, they go to 90 deg)
        // When open, ratio=1 -> angle=90. Wait, if ratio=1, it means open.
        // Closed means ratio=0, angle=0.
        // If angle=0 (closed), dust flap should be rotated 90 deg relative to side wall!
        const closedAngle = Math.PI / 2 - angle; // 90 when closed, 0 when open
        
        leftFrontFlapHinge.rotation.y = -closedAngle;
        leftBackFlapHinge.rotation.y = closedAngle;
        
        // Right wall is rotated +90 deg, so its local axes are flipped relative to left wall
        rightFrontFlapHinge.rotation.y = closedAngle;
        rightBackFlapHinge.rotation.y = -closedAngle;

        // 2. Side walls fold up
        leftHinge.rotation.y = -angle;
        rightHinge.rotation.y = angle;

        // 3. Side roll-overs fold down
        leftRollHinge.rotation.x = -closedAngle;
        rightRollHinge.rotation.x = -closedAngle;

        // 4. Front wall folds up
        frontHinge.rotation.y = angle;
        
        // 5. Front roll-over folds down over front dust flaps
        frontRollHinge.rotation.x = closedAngle;

        // 6. Back wall folds up
        backHinge.rotation.y = -angle;

        // 7. Lid folds down
        lidHinge.rotation.x = closedAngle;

        // 8. Lid tuck folds down
        lidTuckHinge.rotation.x = closedAngle;
      };
} else if (isRsc) {
      // --- AMERICAN BOX (RSC / FLAPS) ---
      const back = createPanel(w, h);
      boxRoot.add(back);

      const rightHinge = new THREE.Group();
      rightHinge.position.set(w/2, 0, 0);
      back.add(rightHinge);
      
      const rightSide = createPanel(d, h);
      rightSide.position.set(d/2, 0, 0);
      rightHinge.add(rightSide);

      const leftHinge = new THREE.Group();
      leftHinge.position.set(-w/2, 0, 0);
      back.add(leftHinge);
      
      const leftSide = createPanel(d, h);
      leftSide.position.set(-d/2, 0, 0);
      leftHinge.add(leftSide);

      const frontHinge = new THREE.Group();
      frontHinge.position.set(d/2, 0, 0);
      rightSide.add(frontHinge);
      
      const front = createPanel(w, h);
      front.position.set(w/2, 0, 0);
      frontHinge.add(front);

      // Top flaps
      const topBackFlapH = new THREE.Group();
      topBackFlapH.position.set(0, h/2, 0);
      back.add(topBackFlapH);
      const topBackFlap = createPanel(w, d/2);
      topBackFlap.position.set(0, d/4, 0);
      topBackFlapH.add(topBackFlap);

      const topFrontFlapH = new THREE.Group();
      topFrontFlapH.position.set(0, h/2, 0);
      front.add(topFrontFlapH);
      const topFrontFlap = createPanel(w, d/2);
      topFrontFlap.position.set(0, d/4, 0);
      topFrontFlapH.add(topFrontFlap);

      const topLeftFlapH = new THREE.Group();
      topLeftFlapH.position.set(0, h/2, 0);
      leftSide.add(topLeftFlapH);
      const topLeftFlap = createPanel(d, w/2);
      topLeftFlap.position.set(0, w/4, 0);
      topLeftFlapH.add(topLeftFlap);

      const topRightFlapH = new THREE.Group();
      topRightFlapH.position.set(0, h/2, 0);
      rightSide.add(topRightFlapH);
      const topRightFlap = createPanel(d, w/2);
      topRightFlap.position.set(0, w/4, 0);
      topRightFlapH.add(topRightFlap);

      // Bottom flaps representation
      const botBackFlapH = new THREE.Group();
      botBackFlapH.position.set(0, -h/2, 0);
      back.add(botBackFlapH);
      const botBackFlap = createPanel(w, d/2);
      botBackFlap.position.set(0, -d/4, 0);
      botBackFlapH.add(botBackFlap);

      const botFrontFlapH = new THREE.Group();
      botFrontFlapH.position.set(0, -h/2, 0);
      front.add(botFrontFlapH);
      const botFrontFlap = createPanel(w, d/2);
      botFrontFlap.position.set(0, -d/4, 0);
      botFrontFlapH.add(botFrontFlap);

      const botLeftFlapH = new THREE.Group();
      botLeftFlapH.position.set(0, -h/2, 0);
      leftSide.add(botLeftFlapH);
      const botLeftFlap = createPanel(d, w/2);
      botLeftFlap.position.set(0, -w/4, 0);
      botLeftFlapH.add(botLeftFlap);

      const botRightFlapH = new THREE.Group();
      botRightFlapH.position.set(0, -h/2, 0);
      rightSide.add(botRightFlapH);
      const botRightFlap = createPanel(d, w/2);
      botRightFlap.position.set(0, -w/4, 0);
      botRightFlapH.add(botRightFlap);

      updateFolds = () => {
        const ratio = isOpenRatioRef.current;
        const angle = (Math.PI / 2) * ratio;

        rightHinge.rotation.y = angle;
        frontHinge.rotation.y = angle;
        leftHinge.rotation.y = -angle;

        // Sequence: Left/Right fold first, Front/Back fold second
        const flapAngleLeftRight = Math.min(Math.PI / 2, angle * 1.5);
        const flapAngleFrontBack = Math.max(0, angle - (Math.PI / 6)) * 1.5;

        const dirs = flapDirRef.current;
        const lMult = dirs.left === 'outside' ? -1 : 1;
        const rMult = dirs.right === 'outside' ? -1 : 1;
        const tMult = dirs.top === 'outside' ? -1 : 1;
        const bMult = dirs.bottom === 'outside' ? -1 : 1;

        topLeftFlapH.rotation.x = flapAngleLeftRight * lMult;
        topRightFlapH.rotation.x = flapAngleLeftRight * rMult;
        botLeftFlapH.rotation.x = -flapAngleLeftRight * lMult;
        botRightFlapH.rotation.x = -flapAngleLeftRight * rMult;

        topBackFlapH.rotation.x = flapAngleFrontBack * tMult;
        topFrontFlapH.rotation.x = flapAngleFrontBack * tMult;
        botBackFlapH.rotation.x = -flapAngleFrontBack * bMult;
        botFrontFlapH.rotation.x = -flapAngleFrontBack * bMult;

        const explodeOffset = isExplodedRef.current ? 5 : 0;
        rightHinge.position.x = w/2 + explodeOffset;
        leftHinge.position.x = -w/2 - explodeOffset;
        frontHinge.position.x = d/2 + explodeOffset;
      };

    } else {
      // --- DEFAULT CLASSIC TUCK BOX (ECMA TUCK END) ---
      
      // Helper for Dust Flap Shape (Top)
      const createDustFlapShape = (fw, fh) => {
         const sh = new THREE.Shape();
         const cx = fw/2;
         const cy = fh;
         const inset = fw * 0.15; // chamfer
         const radius = Math.min(fw, fh) * 0.1;
         
         sh.moveTo(-cx, 0);
         sh.lineTo(-cx + inset, cy - radius);
         sh.quadraticCurveTo(-cx + inset + radius*0.3, cy, -cx + inset + radius, cy);
         sh.lineTo(cx - inset - radius, cy);
         sh.quadraticCurveTo(cx - inset - radius*0.3, cy, cx - inset, cy - radius);
         sh.lineTo(cx, 0);
         sh.lineTo(-cx, 0);
         return sh;
      };

      // Helper for Dust Flap Shape (Bottom)
      const createDustFlapShapeBot = (fw, fh) => {
         const sh = new THREE.Shape();
         const cx = fw/2;
         const cy = -fh;
         const inset = fw * 0.15;
         const radius = Math.min(fw, fh) * 0.1;
         
         sh.moveTo(-cx, 0);
         sh.lineTo(-cx + inset, cy + radius);
         sh.quadraticCurveTo(-cx + inset + radius*0.3, cy, -cx + inset + radius, cy);
         sh.lineTo(cx - inset - radius, cy);
         sh.quadraticCurveTo(cx - inset - radius*0.3, cy, cx - inset, cy + radius);
         sh.lineTo(cx, 0);
         sh.lineTo(-cx, 0);
         return sh;
      };
      
      // Helper for Tuck Flap Shape (Top)
      const createTuckShape = (tw, th) => {
         const sh = new THREE.Shape();
         const cx = tw/2;
         const cy = th;
         const lockW = Math.max(0.5, tw * 0.05);
         const lockH = Math.min(th * 0.3, 0.5);
         const inset = tw * 0.08;
         const radius = Math.min(tw, th) * 0.2;
         
         sh.moveTo(-cx, 0);
         sh.lineTo(-cx, lockH); // Lock bulge
         sh.lineTo(-cx + inset, lockH + lockH); // taper
         sh.lineTo(-cx + inset, cy - radius);
         sh.quadraticCurveTo(-cx + inset, cy, -cx + inset + radius, cy);
         sh.lineTo(cx - inset - radius, cy);
         sh.quadraticCurveTo(cx - inset, cy, cx - inset, cy - radius);
         sh.lineTo(cx - inset, lockH + lockH);
         sh.lineTo(cx, lockH);
         sh.lineTo(cx, 0);
         sh.lineTo(-cx, 0);
         return sh;
      };

      // Helper for Tuck Flap Shape (Bottom)
      const createTuckShapeBot = (tw, th) => {
         const sh = new THREE.Shape();
         const cx = tw/2;
         const cy = -th;
         const lockW = Math.max(0.5, tw * 0.05);
         const lockH = Math.min(th * 0.3, 0.5);
         const inset = tw * 0.08;
         const radius = Math.min(tw, th) * 0.2;
         
         sh.moveTo(-cx, 0);
         sh.lineTo(-cx, -lockH); 
         sh.lineTo(-cx + inset, -(lockH + lockH)); 
         sh.lineTo(-cx + inset, cy + radius);
         sh.quadraticCurveTo(-cx + inset, cy, -cx + inset + radius, cy);
         sh.lineTo(cx - inset - radius, cy);
         sh.quadraticCurveTo(cx - inset, cy, cx - inset, cy + radius);
         sh.lineTo(cx - inset, -(lockH + lockH));
         sh.lineTo(cx, -lockH);
         sh.lineTo(cx, 0);
         sh.lineTo(-cx, 0);
         return sh;
      };
      
      // Helper for Glue Tab
      const createGlueTabShape = (gw, gh) => {
         const sh = new THREE.Shape();
         const cx = -gw;
         const cy = gh/2;
         const chamfer = Math.min(gw * 0.5, gh * 0.1);
         
         sh.moveTo(0, cy);
         sh.lineTo(cx, cy - chamfer);
         sh.lineTo(cx, -cy + chamfer);
         sh.lineTo(0, -cy);
         sh.lineTo(0, cy);
         return sh;
      };
      
      const dfH = Math.min(d * 0.5, 1.5 * s);
      const tfH = Math.min(d * 0.6, 1.8 * s);
      const gtW = 1.5 * s;

      const back = createPanel(w, h);
      boxRoot.add(back);
      if (showDimensions) {
        const backLbl = createTextSprite(`${Math.round(width)}×${Math.round(height)} mm`, '#cbd5e1');
        backLbl.scale.set(1.4, 0.35, 1);
        backLbl.position.set(0, 0, t/2 + 0.02);
        back.add(backLbl);
      }

      const rightHinge = new THREE.Group();
      rightHinge.position.set(w/2, 0, 0);
      back.add(rightHinge);
      const rightSide = createPanel(d, h);
      rightSide.position.set(d/2, 0, 0);
      rightHinge.add(rightSide);
      if (showDimensions) {
        const rightLbl = createTextSprite(`${Math.round(depth)}×${Math.round(height)} mm`, '#cbd5e1');
        rightLbl.scale.set(1.4, 0.35, 1);
        rightLbl.position.set(0, 0, t/2 + 0.02);
        rightSide.add(rightLbl);
      }

      const leftHinge = new THREE.Group();
      leftHinge.position.set(-w/2, 0, 0);
      back.add(leftHinge);
      const leftSide = createPanel(d, h);
      leftSide.position.set(-d/2, 0, 0);
      leftHinge.add(leftSide);
      if (showDimensions) {
        const leftLbl = createTextSprite(`${Math.round(depth)}×${Math.round(height)} mm`, '#cbd5e1');
        leftLbl.scale.set(1.4, 0.35, 1);
        leftLbl.position.set(0, 0, t/2 + 0.02);
        leftSide.add(leftLbl);
      }

      // Top-Left & Bottom-Left Dust Flaps
      const topLeftFlapH = new THREE.Group();
      topLeftFlapH.position.set(0, h/2, 0);
      leftSide.add(topLeftFlapH);
      const topLeftFlap = createPanel(d, dfH, createDustFlapShape(d, dfH));
      // No position offset needed since shape is drawn from origin
      topLeftFlapH.add(topLeftFlap);

      const botLeftFlapH = new THREE.Group();
      botLeftFlapH.position.set(0, -h/2, 0);
      leftSide.add(botLeftFlapH);
      const botLeftFlap = createPanel(d, dfH, createDustFlapShapeBot(d, dfH));
      botLeftFlapH.add(botLeftFlap);

      const frontHinge = new THREE.Group();
      frontHinge.position.set(d/2, 0, 0);
      rightSide.add(frontHinge);
      const front = createPanel(w, h);
      front.position.set(w/2, 0, 0);
      frontHinge.add(front);
      if (showDimensions) {
        const frontLbl = createTextSprite(`${Math.round(width)}×${Math.round(height)} mm`, '#cbd5e1');
        frontLbl.scale.set(1.4, 0.35, 1);
        frontLbl.position.set(0, 0, t/2 + 0.02);
        front.add(frontLbl);
      }

      // Top-Right & Bottom-Right Dust Flaps
      const topRightFlapH = new THREE.Group();
      topRightFlapH.position.set(0, h/2, 0);
      rightSide.add(topRightFlapH);
      const topRightFlap = createPanel(d, dfH, createDustFlapShape(d, dfH));
      topRightFlapH.add(topRightFlap);

      const botRightFlapH = new THREE.Group();
      botRightFlapH.position.set(0, -h/2, 0);
      rightSide.add(botRightFlapH);
      const botRightFlap = createPanel(d, dfH, createDustFlapShapeBot(d, dfH));
      botRightFlapH.add(botRightFlap);

      const glueHinge = new THREE.Group();
      glueHinge.position.set(-d/2, 0, 0);
      leftSide.add(glueHinge);
      const glueTab = createPanel(gtW, h, createGlueTabShape(gtW, h));
      glueHinge.add(glueTab);

      const topHinge = new THREE.Group();
      topHinge.position.set(0, h/2, 0);
      back.add(topHinge);
      const topLid = createPanel(w, d);
      topLid.position.set(0, d/2, 0);
      topHinge.add(topLid);
      if (showDimensions) {
        const topLbl = createTextSprite(`${Math.round(width)}×${Math.round(depth)} mm`, '#cbd5e1');
        topLbl.scale.set(1.4, 0.35, 1);
        topLbl.position.set(0, 0, t/2 + 0.02);
        topLid.add(topLbl);
      }

      const topTuckHinge = new THREE.Group();
      topTuckHinge.position.set(0, d/2, 0);
      topLid.add(topTuckHinge);
      const topTuck = createPanel(w, tfH, createTuckShape(w, tfH));
      topTuckHinge.add(topTuck);

      const bottomHinge = new THREE.Group();
      bottomHinge.position.set(0, -h/2, 0);
      back.add(bottomHinge);
      const bottomLid = createPanel(w, d);
      bottomLid.position.set(0, -d/2, 0);
      bottomHinge.add(bottomLid);
      if (showDimensions) {
        const botLbl = createTextSprite(`${Math.round(width)}×${Math.round(depth)} mm`, '#cbd5e1');
        botLbl.scale.set(1.4, 0.35, 1);
        botLbl.position.set(0, 0, t/2 + 0.02);
        bottomLid.add(botLbl);
      }

      const bottomTuckHinge = new THREE.Group();
      bottomTuckHinge.position.set(0, -d/2, 0);
      bottomLid.add(bottomTuckHinge);
      const bottomTuck = createPanel(w, tfH, createTuckShapeBot(w, tfH));
      bottomTuckHinge.add(bottomTuck);

      updateFolds = () => {
        const angle = (Math.PI / 2) * isOpenRatioRef.current;
        const dirs = flapDirRef.current;
        
        const rMult = dirs.right === 'outside' ? -1 : 1;
        const lMult = dirs.left === 'outside' ? -1 : 1;
        const tMult = dirs.top === 'outside' ? -1 : 1;
        const bMult = dirs.bottom === 'outside' ? -1 : 1;

        if (rightHinge) rightHinge.rotation.y = angle * rMult;
        if (frontHinge) frontHinge.rotation.y = angle * rMult;
        if (leftHinge) leftHinge.rotation.y = -angle * lMult;
        if (glueHinge) glueHinge.rotation.y = -angle * lMult;
        
        if (topHinge) topHinge.rotation.x = angle * tMult;
        if (topTuckHinge) topTuckHinge.rotation.x = angle * tMult;
        
        if (bottomHinge) bottomHinge.rotation.x = -angle * bMult;
        if (bottomTuckHinge) bottomTuckHinge.rotation.x = -angle * bMult; // Match bottom lid direction to complete 180 deg inward fold

        // Fold the four side dust flaps beautifully inwards
        const flapAngle = Math.min(Math.PI / 2, angle * 1.4);
        topLeftFlapH.rotation.x = flapAngle * lMult;
        topRightFlapH.rotation.x = flapAngle * rMult;
        botLeftFlapH.rotation.x = -flapAngle * lMult;
        botRightFlapH.rotation.x = -flapAngle * rMult;

        const explodeOffset = isExplodedRef.current ? 5 : 0;
        if (rightHinge) rightHinge.position.x = (w/2) + explodeOffset;
        if (leftHinge) leftHinge.position.x = (-w/2) - explodeOffset;
        if (topHinge) topHinge.position.y = (h/2) + explodeOffset;
        if (bottomHinge) bottomHinge.position.y = (-h/2) - explodeOffset;
        if (frontHinge) frontHinge.position.x = (d/2) + explodeOffset;
      };
    }

    // Run updateFolds once so everything is at its initial positions
    updateFolds();

    // Dynamically adjust camera to perfectly fit the entire box in the frame, and adjust floor to rest under the box
    const fitCameraAndAdjustFloor = () => {
      scene.updateMatrixWorld(true);
      boxRoot.updateMatrixWorld(true);

      const bbox = new THREE.Box3().setFromObject(boxRoot);
      if (!bbox.isEmpty()) {
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        const size = new THREE.Vector3();
        bbox.getSize(size);

        // Center orbit controls target on the exact center of the box
        controls.target.copy(center);

        // Position the floor and grid exactly under the bottom of the box so it never sinks or floats
        floor.position.y = boxBodyBottom - 0.02;
        grid.position.y = boxBodyBottom - 0.01;

        // Calculate the ideal camera distance to show the entire box safely using its bounding sphere
        const sphere = new THREE.Sphere();
        bbox.getBoundingSphere(sphere);
        const fov = camera.fov * (Math.PI / 180);
        let cameraDist = Math.abs(sphere.radius / Math.sin(fov / 2));
        
        // Add a professional padding so that the entire box and its dimensions fit comfortably
        cameraDist *= 1.45;

        // Dynamically adjust OrbitControls limits to prevent manual zoom blockages
        controls.minDistance = Math.max(1, cameraDist * 0.15);
        controls.maxDistance = Math.max(500, cameraDist * 8);

        // Position camera relative to the center based on its current direction or viewAngle
        let dir = new THREE.Vector3();
        switch (viewAngle) {
          case 'front': dir.set(0, 0, 1); break;
          case 'top': dir.set(0, 1, 0.001).normalize(); break; // Slightly off-axis top view to avoid gimbal lock
          case 'side': dir.set(1, 0, 0); break;
          default: dir.set(0.8, 0.65, 0.8).normalize(); break;
        }

        camera.position.copy(dir.multiplyScalar(cameraDist).add(center));

        // Set clipping planes safely to avoid z-fighting or clipping
        camera.near = Math.max(0.05, cameraDist / 20);
        camera.far = Math.max(1000, cameraDist * 10);
        camera.updateProjectionMatrix();

        controls.update();
      }
    };

    // Store framing function in ref for reset triggers
    fitCameraRef.current = fitCameraAndAdjustFloor;

    // Run the framing initially
    fitCameraAndAdjustFloor();

    // Animation Math
    let isDisposed = false;
    let frameId: number;
    const animate = () => {
      if (isDisposed) return;
      frameId = requestAnimationFrame(animate);
      
      // Perform standard fold updates dynamically
      updateFolds();

      if (autoRotateRef.current && boxRoot) {
        boxRoot.rotation.y += 0.005;
      }

      if (controls && !isDisposed) {
        controls.autoRotate = !!cameraOrbitRef.current;
        controls.autoRotateSpeed = 2.0;
        try { controls.update(); } catch (_) {}
      }

      if (!isDisposed && composer && renderer && renderer.info) {
        try {
          composer.render();
        } catch (_) {
          // Guard against mid-disposal render tick
        }
      }
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || isDisposed) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      if (width === 0 || height === 0) return;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (renderer) renderer.setSize(width, height);
      if (composer) composer.setSize(width, height);

      if (renderer && fxaaPass) {
        const pr = renderer.getPixelRatio();
        fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pr);
        fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pr);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(mountRef.current);

    // Real-time Annotation Layer and Tooltip
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    tooltip.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    tooltip.style.border = '1px solid #0ea5e9';
    tooltip.style.borderRadius = '8px';
    tooltip.style.padding = '8px 12px';
    tooltip.style.color = '#fff';
    tooltip.style.fontFamily = 'system-ui, sans-serif';
    tooltip.style.fontSize = '12px';
    tooltip.style.fontWeight = '600';
    tooltip.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.zIndex = '100';
    tooltip.style.direction = 'rtl';
    currentMount?.appendChild(tooltip);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      if (!currentMount || isDisposed) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(boxRoot.children, true);

      if (intersects.length > 0) {
        const meshIntersect = intersects.find(intersect => intersect.object instanceof THREE.Mesh);
        if (meshIntersect) {
          const obj = meshIntersect.object as THREE.Mesh;
          if (obj.geometry) {
            obj.geometry.computeBoundingBox();
            const bbox = obj.geometry.boundingBox;
            if (bbox) {
              const w_val = Math.round((bbox.max.x - bbox.min.x) / s);
              const h_val = Math.round((bbox.max.y - bbox.min.y) / s);
              
              const labelText = `پنل فعال: ${w_val} × ${h_val} میلی‌متر`;
              tooltip.innerHTML = labelText;
              tooltip.style.display = 'block';
              tooltip.style.left = `${event.clientX - rect.left + 15}px`;
              tooltip.style.top = `${event.clientY - rect.top + 15}px`;
              
              // Highlight selected mesh with emissive glow
              if (activeHoverMeshRef.current !== obj) {
                if (activeHoverMeshRef.current) {
                  const m = activeHoverMeshRef.current.material;
                  if (Array.isArray(m)) {
                    m.forEach((mat: any) => { if (mat && mat.emissive) mat.emissive.setHex(0x000000); });
                  } else if (m && (m as any).emissive) {
                    (m as any).emissive.setHex(0x000000);
                  }
                }
                activeHoverMeshRef.current = obj;
                const m = obj.material;
                if (Array.isArray(m)) {
                  m.forEach((mat: any) => { if (mat && mat.emissive) mat.emissive.setHex(0x0f172a); });
                } else if (m && (m as any).emissive) {
                  (m as any).emissive.setHex(0x0f172a);
                }
              }
              return;
            }
          }
        }
      }

      // Clear highlight if not hovering any panel
      if (activeHoverMeshRef.current) {
        const m = activeHoverMeshRef.current.material;
        if (Array.isArray(m)) {
          m.forEach((mat: any) => { if (mat && mat.emissive) mat.emissive.setHex(0x000000); });
        } else if (m && (m as any).emissive) {
          (m as any).emissive.setHex(0x000000);
        }
        activeHoverMeshRef.current = null;
      }
      tooltip.style.display = 'none';
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
      
      if (controls) {
        try { controls.dispose(); } catch (_) {}
      }

      scene.traverse((object: any) => {
        if (!object.isMesh) return;
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (object.material.isMaterial) {
            object.material.dispose();
          } else if (Array.isArray(object.material)) {
            object.material.forEach((m: any) => m?.dispose());
          }
        }
      });

      // Dispose composer BEFORE disposing renderer to prevent accessing undefined renderer.info
      if (composer) {
        try { composer.dispose(); } catch (_) {}
      }
      if (renderer) {
        try {
          renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
          renderer.forceContextLoss();
          renderer.dispose();
        } catch (_) {}
      }
      if (material) {
        try { material.dispose(); } catch (_) {}
      }
      if (texture) {
        try { texture.dispose(); } catch (_) {}
      }
      if (bumpMapTexture) {
        try { bumpMapTexture.dispose(); } catch (_) {}
      }
      
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
      }
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
      if (currentMount && renderer && renderer.domElement && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, [width, height, depth, color, paperType, textureUrl, specialEffect, selectedModelId, customEntitiesStr,
  customAnchorsStr, showDimensions, materialThickness]);

  // Adaptive Studio HDR Lighting & Physical Material Controller
  useEffect(() => {
    if (!matsRef.current.main) return;
    const mat = matsRef.current.main;
    const sideMat = matsRef.current.side;
    
    let finalRoughness = 0.4;
    let finalMetalness = 0.05;
    let finalClearcoat = 0.0;
    let finalClearcoatRoughness = 0.0;
    let finalEnvMapIntensity = 0.5;
    
    let ambientInt = 0.5;
    let mainInt = 2.0;
    let fillInt = 1.0;
    let rimInt = 1.2;
    let envInt = 1.0;

    if (specialEffect === 'gold_foil') {
      finalRoughness = 0.10;
      finalMetalness = 0.98;
      finalEnvMapIntensity = 2.5;
      ambientInt = 0.35;
      mainInt = 2.2;
      rimInt = 1.4;
      fillInt = 0.8;
      envInt = 2.5;
    } else if (specialEffect === 'uv_spot') {
      finalRoughness = 0.20;
      finalMetalness = 0.25;
      finalClearcoat = 1.0;
      finalClearcoatRoughness = 0.02;
      finalEnvMapIntensity = 2.0;
      ambientInt = 0.4;
      mainInt = 2.0;
      rimInt = 1.3;
      fillInt = 0.7;
      envInt = 1.8;
    } else {
      switch (paperType) {
        case 'kraft':
          finalRoughness = 0.88;
          finalMetalness = 0.02;
          finalEnvMapIntensity = 0.4;
          ambientInt = 0.5; 
          mainInt = 1.8;
          fillInt = 1.0;
          rimInt = 0.8;
          envInt = 0.6;
          break;
        case 'corrugated':
          finalRoughness = 0.78;
          finalMetalness = 0.03;
          finalEnvMapIntensity = 0.5;
          ambientInt = 0.45;
          mainInt = 1.9;
          fillInt = 1.0;
          rimInt = 0.9;
          envInt = 0.7;
          break;
        case 'coated':
        default:
          finalRoughness = 0.24;
          finalMetalness = 0.08;
          finalClearcoat = 0.3;
          finalClearcoatRoughness = 0.08;
          finalEnvMapIntensity = 1.5;
          ambientInt = 0.4;
          mainInt = 2.0;
          fillInt = 0.8;
          rimInt = 1.2;
          envInt = 1.5;
          break;
      }
    }
    
    mat.roughness = finalRoughness;
    mat.metalness = finalMetalness;
    if (mat.clearcoat !== undefined) {
      mat.clearcoat = finalClearcoat;
      mat.clearcoatRoughness = finalClearcoatRoughness;
    }
    mat.envMapIntensity = finalEnvMapIntensity;
    mat.needsUpdate = true;
    
    sideMat.roughness = finalRoughness;
    sideMat.metalness = finalMetalness;
    if (sideMat.clearcoat !== undefined) {
      sideMat.clearcoat = finalClearcoat;
      sideMat.clearcoatRoughness = finalClearcoatRoughness;
    }
    sideMat.envMapIntensity = finalEnvMapIntensity;
    sideMat.needsUpdate = true;

    if (lightsRef.current.ambient) lightsRef.current.ambient.intensity = ambientInt * lightIntensity;
    if (lightsRef.current.main) lightsRef.current.main.intensity = mainInt * lightIntensity;
    if (lightsRef.current.fill) lightsRef.current.fill.intensity = fillInt * lightIntensity;
    if (lightsRef.current.rim) lightsRef.current.rim.intensity = rimInt * lightIntensity;
    if (lightsRef.current.env) lightsRef.current.env.intensity = envInt * lightIntensity;
  }, [paperType, specialEffect, lightIntensity, color, textureUrl]);

  // Update wireframe dynamically
  useEffect(() => {
    if (matsRef.current.main) matsRef.current.main.wireframe = wireframe;
    if (matsRef.current.side) matsRef.current.side.wireframe = wireframe;
  }, [wireframe]);


  // Handle View Angle Changes
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    
    const s = 0.1;
    const w = width * s;
    const h = height * s;
    const d = depth * s;
    const maxDim = Math.max(w, h, d);
    const idealDist = Math.max(12, Math.min(65, maxDim * 2.1));
    
    switch (viewAngle) {
      case 'front':
        cam.position.set(0, 0, idealDist * 1.5);
        break;
      case 'top':
        cam.position.set(0, idealDist * 1.5, 0);
        break;
      case 'side':
        cam.position.set(idealDist * 1.5, 0, 0);
        break;
      case 'perspective':
        cam.position.set(idealDist * 0.9, idealDist * 0.7, idealDist * 0.9);
        break;
    }
    ctrl.target.set(0, 0, 0);
    ctrl.update();
  }, [viewAngle, width, height, depth]);

  return <div ref={mountRef} className="absolute inset-0 cursor-move z-10" style={{ touchAction: 'none' }} />;
};
