import * as THREE from 'three';

export interface MaterialPalette {
  id: string;
  label: string;
  color: string;
  roughness: number;
  metalness: number;
  bumpScale: number;
  isVelvet?: boolean;
}

export const BOARD_MATERIALS: MaterialPalette[] = [
  { id: 'sbs', label: 'ایندربرد سفید SBS', color: '#f2f0eb', roughness: 0.52, metalness: 0.03, bumpScale: 0.004 },
  { id: 'kraft', label: 'کرافت طبیعی', color: '#c89b66', roughness: 0.86, metalness: 0.02, bumpScale: 0.012 },
  { id: 'carbon', label: 'کربن مخملی', color: '#141824', roughness: 0.72, metalness: 0.08, bumpScale: 0.008, isVelvet: true },
  { id: 'royal', label: 'سرمه‌ای سلطنتی', color: '#132342', roughness: 0.58, metalness: 0.06, bumpScale: 0.006 },
];

export interface FoilPalette {
  id: string;
  label: string;
  color: string;
  emissive: string;
  roughness: number;
  metalness: number;
}

export const FOIL_MATERIALS: FoilPalette[] = [
  { id: 'gold24k', label: 'طلای ۲۴ عیار', color: '#e5b84b', emissive: '#3a2606', roughness: 0.14, metalness: 0.96 },
  { id: 'silver', label: 'نقره‌ای کروم', color: '#dce3ec', emissive: '#1e2430', roughness: 0.1, metalness: 0.98 },
  { id: 'rosegold', label: 'مس رزگلد', color: '#d98c72', emissive: '#331810', roughness: 0.16, metalness: 0.94 },
];

export function createBoardFiberTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);

    // Fine cellulose grain speckles
    for (let i = 0; i < 16000; i++) {
      const shade = 228 + Math.floor(Math.random() * 27);
      ctx.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade - 5})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }

    // Subtle directional paper fibers
    ctx.strokeStyle = 'rgba(120, 100, 75, 0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 420; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const len = 6 + Math.random() * 18;
      const ang = (Math.random() - 0.5) * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }

    // Fine press-roller micro lines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.014)';
    for (let y = 0; y < 512; y += 4) {
      if (Math.random() > 0.3) ctx.fillRect(0, y, 512, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export interface FoilArtworkOptions {
  modelCode: string;
  modelTitleFa: string;
  maxAnisotropy: number;
  brandTitle?: string;
  customLogoUrl?: string;
  logoMode?: 'color' | 'foil';
  onTextureUpdated?: () => void;
}

/**
 * Draws a logo image onto a temp canvas and converts it into a crisp monochrome alpha silhouette
 * suitable for 24K hot-foil stamping (knocking out near-white JPG backgrounds if opaque).
 */
function drawFoilSilhouetteLogo(
  targetCtx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number
) {
  const aspect = img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1;
  let drawW = maxW;
  let drawH = maxW / aspect;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = maxH * aspect;
  }

  const off = document.createElement('canvas');
  off.width = Math.max(64, Math.round(drawW));
  off.height = Math.max(64, Math.round(drawH));
  const octx = off.getContext('2d');
  if (!octx) return;

  octx.drawImage(img, 0, 0, off.width, off.height);
  const imgData = octx.getImageData(0, 0, off.width, off.height);
  const d = imgData.data;

  // Detect whether image has meaningful transparency
  let hasAlpha = false;
  for (let i = 3; i < d.length; i += 16) {
    if (d[i] < 235) {
      hasAlpha = true;
      break;
    }
  }

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const a = d[i + 3];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (hasAlpha) {
      // Keep alpha, force white RGB for foil tinting
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = a;
    } else {
      // Knock out near-white background so JPG logos stamp cleanly in foil
      const whiteness = lum > 225 ? Math.max(0, 255 - (lum - 225) * 8.5) : 255;
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = Math.round((whiteness * a) / 255);
    }
  }

  octx.putImageData(imgData, 0, 0);
  targetCtx.drawImage(off, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
}

function drawDefaultFoilFrameAndText(
  ctx: CanvasRenderingContext2D,
  modelCode: string,
  modelTitleFa: string,
  brandTitle: string,
  skipCenterEmblem: boolean
) {
  ctx.clearRect(0, 0, 768, 768);

  // Outer double luxury foil frame
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(42, 42, 684, 684);
  ctx.lineWidth = 2.5;
  ctx.strokeRect(60, 60, 648, 648);

  // Corner ornamental brackets
  const corner = 34;
  const corners = [
    [42, 42, 1, 1],
    [726, 42, -1, 1],
    [42, 726, 1, -1],
    [726, 726, -1, -1],
  ];
  ctx.lineWidth = 4;
  corners.forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx * 18, cy + dy * (18 + corner));
    ctx.lineTo(cx + dx * 18, cy + dy * 18);
    ctx.lineTo(cx + dx * (18 + corner), cy + dy * 18);
    ctx.stroke();
  });

  if (!skipCenterEmblem) {
    // Ashk Ghalam emblem (stylized fountain-pen droplet / nib)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(384, 130);
    ctx.bezierCurveTo(295, 235, 295, 320, 384, 348);
    ctx.bezierCurveTo(473, 320, 473, 235, 384, 130);
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(384, 190);
    ctx.lineTo(384, 310);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(384, 240, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Circular subtle seal
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(384, 242, 128, 0, Math.PI * 2);
  ctx.stroke();

  // Brand typography
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px Vazirmatn, Tahoma, sans-serif';
  ctx.fillText(brandTitle || 'اشک قـلـم', 384, 445);

  ctx.font = 'bold 19px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('ASHK GHALAM PACKAGING ATELIER', 384, 495);

  // Thin divider
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(220, 520, 328, 2);

  ctx.font = 'bold 24px Vazirmatn, Tahoma, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(modelTitleFa, 384, 566);

  ctx.font = 'bold 17px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`${modelCode.toUpperCase()}  •  24K FOIL & SPOT UV`, 384, 608);
}

export function createFoilArtworkTexture(options: FoilArtworkOptions): THREE.CanvasTexture {
  const {
    modelCode,
    modelTitleFa,
    maxAnisotropy,
    brandTitle = 'اشک قـلـم',
    customLogoUrl,
    logoMode = 'color',
    onTextureUpdated,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;

  if (ctx) {
    const hasCustomLogo = Boolean(customLogoUrl && customLogoUrl.trim().length > 0);
    // Draw frame/text immediately; if color-mode custom logo is placed on separate mesh, keep emblem blank on foil canvas
    drawDefaultFoilFrameAndText(ctx, modelCode, modelTitleFa, brandTitle, hasCustomLogo);
    tex.needsUpdate = true;

    if (hasCustomLogo && logoMode === 'foil' && customLogoUrl) {
      const img = new Image();
      if (!customLogoUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        drawDefaultFoilFrameAndText(ctx, modelCode, modelTitleFa, brandTitle, true);
        drawFoilSilhouetteLogo(ctx, img, 384, 242, 220, 200);
        tex.needsUpdate = true;
        onTextureUpdated?.();
      };
      img.src = customLogoUrl;
    }
  }

  return tex;
}

/**
 * Creates a crisp full-color UV-varnish CanvasTexture for the admin-uploaded logo.
 */
export function createCustomColorLogoTexture(
  customLogoUrl: string,
  maxAnisotropy: number,
  onLoaded?: () => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;

  if (ctx && customLogoUrl) {
    const img = new Image();
    if (!customLogoUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      ctx.clearRect(0, 0, 512, 512);
      const aspect = img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1;
      const maxDim = 440;
      let dw = maxDim;
      let dh = maxDim / aspect;
      if (dh > maxDim) {
        dh = maxDim;
        dw = maxDim * aspect;
      }
      ctx.drawImage(img, (512 - dw) / 2, (512 - dh) / 2, dw, dh);
      tex.needsUpdate = true;
      onLoaded?.();
    };
    img.src = customLogoUrl;
  }

  return tex;
}

export function createStudioFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle radial architectural glow
    const grad = ctx.createRadialGradient(512, 512, 40, 512, 512, 500);
    grad.addColorStop(0, 'rgba(229, 184, 75, 0.08)');
    grad.addColorStop(0.45, 'rgba(56, 189, 248, 0.035)');
    grad.addColorStop(1, 'rgba(7, 11, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine engineering grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
    ctx.lineWidth = 1;
    const step = 32;
    for (let i = 0; i <= 1024; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }

    // Concentric calibration rings
    ctx.strokeStyle = 'rgba(229, 184, 75, 0.16)';
    [160, 270, 390].forEach((r) => {
      ctx.beginPath();
      ctx.arc(512, 512, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Degree ticks around outer ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    for (let deg = 0; deg < 360; deg += 5) {
      const rad = (deg * Math.PI) / 180;
      const r1 = 390;
      const r2 = deg % 30 === 0 ? 410 : 398;
      ctx.beginPath();
      ctx.moveTo(512 + Math.cos(rad) * r1, 512 + Math.sin(rad) * r1);
      ctx.lineTo(512 + Math.cos(rad) * r2, 512 + Math.sin(rad) * r2);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 124);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.32)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

// =========================================================================
// PROCEDURAL PBR PACKAGING SURFACE PRESETS FOR DIELINE GENERATOR 3D STUDIO
// =========================================================================

export type SurfacePresetId =
  | 'glossy_coated'
  | 'matte_laminated'
  | 'soft_touch'
  | 'kraft_natural'
  | 'kraft_white'
  | 'corrugated_e'
  | 'corrugated_b'
  | 'linen_textured'
  | 'metallic_foil';

export interface PackagingSurfacePreset {
  id: SurfacePresetId;
  labelFa: string;
  shortLabelFa: string;
  swatchColor: string;
  defaultColor: string;
  innerDefaultColor: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenRoughness: number;
  bumpScale: number;
  anisotropy: number;
  isCorrugated?: boolean;
  fluteCount?: number;
  linkedMaterialId?: string;
}

export const PACKAGING_SURFACE_PRESETS: PackagingSurfacePreset[] = [
  {
    id: 'glossy_coated',
    labelFa: 'گلاسه / سلفون براق',
    shortLabelFa: 'گلاسه براق',
    swatchColor: '#f8fafc',
    defaultColor: '#ffffff',
    innerDefaultColor: '#e5e7eb',
    roughness: 0.22,
    metalness: 0.02,
    clearcoat: 0.92,
    clearcoatRoughness: 0.06,
    sheen: 0.0,
    sheenRoughness: 0.5,
    bumpScale: 0.25,
    anisotropy: 0.0,
    linkedMaterialId: 'inderboard-300',
  },
  {
    id: 'matte_laminated',
    labelFa: 'سلفون مات ابریشمی',
    shortLabelFa: 'سلفون مات',
    swatchColor: '#e2e8f0',
    defaultColor: '#f5f5f4',
    innerDefaultColor: '#d6d3d1',
    roughness: 0.58,
    metalness: 0.02,
    clearcoat: 0.14,
    clearcoatRoughness: 0.62,
    sheen: 0.22,
    sheenRoughness: 0.6,
    bumpScale: 0.5,
    anisotropy: 0.0,
    linkedMaterialId: 'sbs-300',
  },
  {
    id: 'soft_touch',
    labelFa: 'سافت‌تاچ مخملی',
    shortLabelFa: 'مخملی',
    swatchColor: '#1e293b',
    defaultColor: '#1e2433',
    innerDefaultColor: '#2c3344',
    roughness: 0.78,
    metalness: 0.04,
    clearcoat: 0.0,
    clearcoatRoughness: 0.8,
    sheen: 0.88,
    sheenRoughness: 0.68,
    bumpScale: 0.75,
    anisotropy: 0.0,
    linkedMaterialId: 'sbs-400',
  },
  {
    id: 'kraft_natural',
    labelFa: 'کرافت قهوه‌ای طبیعی',
    shortLabelFa: 'کرافت طبیعی',
    swatchColor: '#b98b5c',
    defaultColor: '#c49868',
    innerDefaultColor: '#ad8052',
    roughness: 0.88,
    metalness: 0.01,
    clearcoat: 0.0,
    clearcoatRoughness: 0.9,
    sheen: 0.08,
    sheenRoughness: 0.85,
    bumpScale: 1.65,
    anisotropy: 0.0,
    linkedMaterialId: 'kraft-300',
  },
  {
    id: 'kraft_white',
    labelFa: 'کرافت سفید الیاف‌دار',
    shortLabelFa: 'کرافت سفید',
    swatchColor: '#ebe4d8',
    defaultColor: '#f0eadf',
    innerDefaultColor: '#c8b69c',
    roughness: 0.80,
    metalness: 0.01,
    clearcoat: 0.0,
    clearcoatRoughness: 0.85,
    sheen: 0.05,
    sheenRoughness: 0.8,
    bumpScale: 1.35,
    anisotropy: 0.0,
    linkedMaterialId: 'inderboard-250',
  },
  {
    id: 'corrugated_e',
    labelFa: 'کارتن مایکروویو (E-Flute)',
    shortLabelFa: 'مایکروویو E',
    swatchColor: '#cfa97e',
    defaultColor: '#d4b086',
    innerDefaultColor: '#b58b5e',
    roughness: 0.86,
    metalness: 0.01,
    clearcoat: 0.0,
    clearcoatRoughness: 0.9,
    sheen: 0.05,
    sheenRoughness: 0.85,
    bumpScale: 2.0,
    anisotropy: 0.0,
    isCorrugated: true,
    fluteCount: 22,
    linkedMaterialId: 'corrugated-e',
  },
  {
    id: 'corrugated_b',
    labelFa: 'کارتن سه‌لایه (B-Flute)',
    shortLabelFa: 'سه‌لایه B',
    swatchColor: '#ba8c5a',
    defaultColor: '#c29463',
    innerDefaultColor: '#a37649',
    roughness: 0.90,
    metalness: 0.01,
    clearcoat: 0.0,
    clearcoatRoughness: 0.95,
    sheen: 0.05,
    sheenRoughness: 0.9,
    bumpScale: 2.5,
    anisotropy: 0.0,
    isCorrugated: true,
    fluteCount: 11,
    linkedMaterialId: 'corrugated-b',
  },
  {
    id: 'linen_textured',
    labelFa: 'مقوای کتان برجسته',
    shortLabelFa: 'کتان برجسته',
    swatchColor: '#ede8de',
    defaultColor: '#f2ede2',
    innerDefaultColor: '#ddd5c7',
    roughness: 0.66,
    metalness: 0.02,
    clearcoat: 0.08,
    clearcoatRoughness: 0.55,
    sheen: 0.35,
    sheenRoughness: 0.65,
    bumpScale: 1.85,
    anisotropy: 0.0,
    linkedMaterialId: 'sbs-400',
  },
  {
    id: 'metallic_foil',
    labelFa: 'لمینت متالیک برس‌خورده',
    shortLabelFa: 'متالیک',
    swatchColor: '#cbd5e1',
    defaultColor: '#dce3ed',
    innerDefaultColor: '#d1d5db',
    roughness: 0.22,
    metalness: 0.82,
    clearcoat: 0.45,
    clearcoatRoughness: 0.14,
    sheen: 0.0,
    sheenRoughness: 0.4,
    bumpScale: 0.65,
    anisotropy: 0.65,
    linkedMaterialId: 'inderboard-350',
  },
];

export interface SurfacePBRMaps {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  edgeMap: THREE.CanvasTexture;
  edgeBumpMap: THREE.CanvasTexture;
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createSurfacePBRMaps(
  presetId: SurfacePresetId,
  maxAnisotropy: number,
  repeatScale = 1
): SurfacePBRMaps {
  const size = 512;
  const preset = PACKAGING_SURFACE_PRESETS.find((p) => p.id === presetId) || PACKAGING_SURFACE_PRESETS[0];
  const rand = seededRand(presetId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0) * 31, 17));

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const actx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d')!;

  // Base fills (albedo stays near white/neutral so Three.js material.color multiplies cleanly)
  actx.fillStyle = '#ffffff';
  actx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);
  const baseRoughVal = Math.round(preset.roughness * 255);
  rctx.fillStyle = `rgb(${baseRoughVal},${baseRoughVal},${baseRoughVal})`;
  rctx.fillRect(0, 0, size, size);

  if (presetId === 'glossy_coated') {
    // Ultra-fine calendered mineral coating
    for (let i = 0; i < 4000; i++) {
      const v = 247 + Math.floor(rand() * 8);
      actx.fillStyle = `rgb(${v},${v},${v})`;
      actx.fillRect(rand() * size, rand() * size, 1.5, 1.5);
    }
    const g = bctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, 'rgba(134,134,134,0.2)');
    g.addColorStop(0.5, 'rgba(122,122,122,0.2)');
    g.addColorStop(1, 'rgba(134,134,134,0.2)');
    bctx.fillStyle = g;
    bctx.fillRect(0, 0, size, size);
  } else if (presetId === 'matte_laminated' || presetId === 'soft_touch') {
    // Micro-pebble matte/velvet film dispersion
    const count = presetId === 'soft_touch' ? 22000 : 14000;
    for (let i = 0; i < count; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const shade = 236 + Math.floor(rand() * 19);
      actx.fillStyle = `rgb(${shade},${shade},${shade})`;
      actx.fillRect(x, y, 1.5, 1.5);

      const bv = 108 + Math.floor(rand() * 40);
      bctx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bctx.fillRect(x, y, 2, 2);

      const rv = Math.min(255, Math.max(80, baseRoughVal + Math.floor((rand() - 0.5) * 28)));
      rctx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rctx.fillRect(x, y, 2, 2);
    }
  } else if (presetId === 'kraft_natural' || presetId === 'kraft_white') {
    // Organic wood-pulp cellulose fibers & recycled lignin flecks
    const isNatural = presetId === 'kraft_natural';
    for (let i = 0; i < 20000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const tone = isNatural ? 210 + Math.floor(rand() * 42) : 228 + Math.floor(rand() * 26);
      actx.fillStyle = `rgb(${tone},${tone - 4},${tone - 10})`;
      actx.fillRect(x, y, 1.8, 1.8);

      const bv = 90 + Math.floor(rand() * 76);
      bctx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bctx.fillRect(x, y, 2, 2);
    }

    // Long directional pulp fibers
    for (let i = 0; i < 950; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = 8 + rand() * 26;
      const ang = (rand() - 0.5) * 0.75;
      const dark = rand() > 0.45;
      actx.strokeStyle = isNatural
        ? dark
          ? 'rgba(92, 62, 34, 0.19)'
          : 'rgba(255, 240, 215, 0.16)'
        : dark
          ? 'rgba(130, 118, 102, 0.14)'
          : 'rgba(255, 255, 255, 0.25)';
      actx.lineWidth = 0.8 + rand() * 1.1;
      actx.beginPath();
      actx.moveTo(x, y);
      actx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      actx.stroke();

      bctx.strokeStyle = dark ? 'rgba(70,70,70,0.28)' : 'rgba(205,205,205,0.25)';
      bctx.lineWidth = 1.2;
      bctx.beginPath();
      bctx.moveTo(x, y);
      bctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      bctx.stroke();

      const rv = Math.min(255, baseRoughVal + (dark ? 18 : -14));
      rctx.strokeStyle = `rgba(${rv},${rv},${rv},0.35)`;
      rctx.beginPath();
      rctx.moveTo(x, y);
      rctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      rctx.stroke();
    }

    // Occasional dark recycled bark specks
    for (let i = 0; i < 240; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rad = 0.8 + rand() * 1.6;
      actx.fillStyle = isNatural ? 'rgba(68, 43, 21, 0.36)' : 'rgba(120, 108, 92, 0.22)';
      actx.beginPath();
      actx.arc(x, y, rad, 0, Math.PI * 2);
      actx.fill();
    }
  } else if (presetId === 'corrugated_e' || presetId === 'corrugated_b') {
    const fluteCount = preset.fluteCount || 18;
    // Subtle fluted washboard undulation visible across kraft linerboard
    for (let x = 0; x < size; x++) {
      const wave = Math.sin((x / size) * Math.PI * 2 * fluteCount);
      const albShade = Math.round(240 + wave * 12);
      actx.fillStyle = `rgb(${albShade},${albShade - 3},${albShade - 7})`;
      actx.fillRect(x, 0, 1, size);

      const bVal = Math.round(128 + wave * 42);
      bctx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
      bctx.fillRect(x, 0, 1, size);

      const rVal = Math.min(255, Math.max(150, Math.round(baseRoughVal - wave * 14)));
      rctx.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
      rctx.fillRect(x, 0, 1, size);
    }
    // Kraft pulp fiber grain layered on top of flute ribs
    for (let i = 0; i < 16000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const v = 205 + Math.floor(rand() * 40);
      actx.fillStyle = `rgba(${v},${v - 5},${v - 10},0.35)`;
      actx.fillRect(x, y, 2, 2);
    }
    for (let i = 0; i < 650; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = 8 + rand() * 20;
      const ang = (rand() - 0.5) * 0.6;
      actx.strokeStyle = rand() > 0.4 ? 'rgba(90, 58, 28, 0.22)' : 'rgba(250, 232, 205, 0.16)';
      actx.lineWidth = 1;
      actx.beginPath();
      actx.moveTo(x, y);
      actx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      actx.stroke();
    }
  } else if (presetId === 'linen_textured') {
    // Luxury cross-hatched woven linen embossing
    const step = 8;
    for (let y = 0; y < size; y += step) {
      const shade = y % (step * 2) === 0 ? 248 : 236;
      actx.fillStyle = `rgb(${shade},${shade},${shade})`;
      actx.fillRect(0, y, size, step / 2);

      const bv = y % (step * 2) === 0 ? 170 : 96;
      bctx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bctx.fillRect(0, y, size, step / 2);
    }
    for (let x = 0; x < size; x += step) {
      const even = x % (step * 2) === 0;
      actx.fillStyle = even ? 'rgba(255,255,255,0.22)' : 'rgba(180,175,165,0.18)';
      actx.fillRect(x, 0, step / 2, size);

      bctx.fillStyle = even ? 'rgba(210,210,210,0.45)' : 'rgba(70,70,70,0.45)';
      bctx.fillRect(x, 0, step / 2, size);

      const rv = even ? baseRoughVal - 18 : baseRoughVal + 18;
      rctx.fillStyle = `rgba(${rv},${rv},${rv},0.5)`;
      rctx.fillRect(x, 0, step / 2, size);
    }
  } else if (presetId === 'metallic_foil') {
    // Brushed anisotropic metal foil streaks
    for (let y = 0; y < size; y += 2) {
      const shade = 228 + Math.floor(rand() * 27);
      actx.fillStyle = `rgb(${shade},${shade},${shade})`;
      actx.fillRect(0, y, size, 1.5);

      const bv = 112 + Math.floor(rand() * 32);
      bctx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bctx.fillRect(0, y, size, 1.5);

      const rv = Math.max(25, Math.min(120, baseRoughVal + Math.floor((rand() - 0.5) * 32)));
      rctx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rctx.fillRect(0, y, size, 1.5);
    }
  }

  // Cut-edge texture (corrugated wavy core vs solid compressed paper edge)
  const edgeCanvas = document.createElement('canvas');
  edgeCanvas.width = 256;
  edgeCanvas.height = 64;
  const ectx = edgeCanvas.getContext('2d')!;

  const edgeBumpCanvas = document.createElement('canvas');
  edgeBumpCanvas.width = 256;
  edgeBumpCanvas.height = 64;
  const ebctx = edgeBumpCanvas.getContext('2d')!;

  if (preset.isCorrugated) {
    // Dark hollow flutes + outer & inner kraft liner bands + bright sinusoidal corrugated medium
    ectx.fillStyle = '#3b2615';
    ectx.fillRect(0, 0, 256, 64);
    ebctx.fillStyle = '#202020';
    ebctx.fillRect(0, 0, 256, 64);

    // Top & bottom kraft liners
    ectx.fillStyle = '#cfa77d';
    ectx.fillRect(0, 0, 256, 10);
    ectx.fillRect(0, 54, 256, 10);
    ebctx.fillStyle = '#d8d8d8';
    ebctx.fillRect(0, 0, 256, 10);
    ebctx.fillRect(0, 54, 256, 10);

    // Sinusoidal corrugated flute wave
    const waves = presetId === 'corrugated_b' ? 5 : 9;
    ectx.strokeStyle = '#c5996c';
    ectx.lineWidth = 7;
    ectx.lineCap = 'round';
    ectx.beginPath();
    ebctx.strokeStyle = '#ffffff';
    ebctx.lineWidth = 7;
    ebctx.lineCap = 'round';
    ebctx.beginPath();
    for (let x = 0; x <= 256; x += 2) {
      const y = 32 + Math.sin((x / 256) * Math.PI * 2 * waves) * 19;
      if (x === 0) {
        ectx.moveTo(x, y);
        ebctx.moveTo(x, y);
      } else {
        ectx.lineTo(x, y);
        ebctx.lineTo(x, y);
      }
    }
    ectx.stroke();
    ebctx.stroke();
  } else {
    ectx.fillStyle = presetId === 'kraft_natural' ? '#a67b50' : '#d6d2c9';
    ectx.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 600; i++) {
      const v = 135 + Math.floor(rand() * 55);
      ectx.fillStyle = `rgba(${v},${v - 5},${v - 10},0.35)`;
      ectx.fillRect(rand() * 256, rand() * 64, 3, 1.5);
    }
    ebctx.fillStyle = '#909090';
    ebctx.fillRect(0, 0, 256, 64);
  }

  const configureMap = (canvas: HTMLCanvasElement, isColor: boolean, repeatX = 1.5 * repeatScale, repeatY = 1.5 * repeatScale) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  };

  return {
    map: configureMap(albedoCanvas, true),
    bumpMap: configureMap(bumpCanvas, false),
    roughnessMap: configureMap(roughCanvas, false),
    edgeMap: configureMap(edgeCanvas, true, Math.max(1, 2 * repeatScale), 1),
    edgeBumpMap: configureMap(edgeBumpCanvas, false, Math.max(1, 2 * repeatScale), 1),
  };
}

/**
 * Generates an alpha/luminance mask for Gold Foil / Spot UV decorative framing & emblem
 * applied on the outer box lid & front display panel in DielineGenerator 3D Preview.
 */
export function createSpecialEffectOverlayTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, 456, 456);
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 432, 432);

    // Center geometric packaging seal
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 220, 68, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(256, 174);
    ctx.lineTo(294, 212);
    ctx.lineTo(256, 266);
    ctx.lineTo(218, 212);
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Vazirmatn, Tahoma, sans-serif';
    ctx.fillText('اشک قـلـم', 256, 350);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillText('PREMIUM PACKAGING', 256, 386);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

