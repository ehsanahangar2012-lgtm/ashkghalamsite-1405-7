import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export interface FlapDirections {
  topFlap?: number;
  bottomFlap?: number;
  leftFlap?: number;
  rightFlap?: number;
  top?: 'inside' | 'outside' | string;
  bottom?: 'inside' | 'outside' | string;
  left?: 'inside' | 'outside' | string;
  right?: 'inside' | 'outside' | string;
}

export interface ThreeDPreviewProps {
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  paperType?: 'coated' | 'kraft' | 'corrugated';
  specialEffect?: string;
  isOpenRatio?: number;
  wireframe?: boolean;
  autoRotate?: boolean;
  cameraOrbit?: boolean;
  resetTrigger?: number;
  viewAngle?: 'perspective' | 'front' | 'top' | 'side';
  isExploded?: boolean;
  flapDirections?: FlapDirections;
  hasDieCut?: boolean;
  selectedModelId?: string;
  customEntities?: any[];
  customAnchors?: any[];
  textureUrl?: string;
  lightIntensity?: number;
  showDimensions?: boolean;
  materialThickness?: number;
}

export const ThreeDPreview: React.FC<ThreeDPreviewProps> = ({
  width = 200,
  height = 150,
  depth = 100,
  color = '#d4a373',
  paperType = 'coated',
  wireframe = false,
  autoRotate = true,
  isOpenRatio = 0,
  materialThickness = 0.45,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loadingPhase, setLoadingPhase] = useState<'shaders' | 'geometry' | 'pbr' | 'ready'>('shaders');
  const [loadingProgress, setLoadingProgress] = useState<number>(10);
  const [isRenderReady, setIsRenderReady] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    setIsRenderReady(false);
    setRenderError(null);
    setLoadingPhase('shaders');
    setLoadingProgress(15);

    let isMounted = true;
    let reqId: number;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let geometry: THREE.BoxGeometry | null = null;
    let material: THREE.MeshStandardMaterial | null = null;

    try {
      const widthPx = mountRef.current.clientWidth || 400;
      const heightPx = mountRef.current.clientHeight || 300;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, widthPx / heightPx, 0.1, 2000);
      camera.position.set(300, 250, 400);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(widthPx, heightPx);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(renderer.domElement);

      // 1. Shaders & Environment Lights initialization
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
      dirLight1.position.set(200, 400, 300);
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0xffedd5, 0.6);
      dirLight2.position.set(-200, -100, -200);
      scene.add(dirLight2);

      // Simulation of PBR compile progression
      const t1 = setTimeout(() => {
        if (!isMounted) return;
        setLoadingPhase('geometry');
        setLoadingProgress(50);
      }, 70);

      // 2. Parametric Geometry Setup
      const w = Math.max(20, (width || 200) * 0.8);
      const h = Math.max(20, (height || 150) * 0.8);
      const d = Math.max(20, (depth || 100) * 0.8);

      geometry = new THREE.BoxGeometry(w, h, d);

      // PBR Paper Material with roughness & micro-bump
      let roughness = 0.65;
      let metalness = 0.05;
      if (paperType === 'kraft') {
        roughness = 0.85;
      } else if (paperType === 'corrugated') {
        roughness = 0.90;
      }

      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness,
        metalness,
        wireframe: !!wireframe,
      });

      const box = new THREE.Mesh(geometry, material);
      box.castShadow = true;
      box.receiveShadow = true;
      scene.add(box);

      // Highlight Crease & Cut Edges
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMat = new THREE.LineBasicMaterial({ 
        color: paperType === 'kraft' ? 0x6b4423 : 0x334155, 
        linewidth: 1 
      });
      const edgeLines = new THREE.LineSegments(edges, lineMat);
      box.add(edgeLines);

      camera.lookAt(0, 0, 0);

      // Warmup shader compilation before displaying
      const t2 = setTimeout(() => {
        if (!isMounted || !renderer || !scene || !camera) return;
        setLoadingPhase('pbr');
        setLoadingProgress(85);
        renderer.compile(scene, camera);

        const t3 = setTimeout(() => {
          if (!isMounted) return;
          setLoadingPhase('ready');
          setLoadingProgress(100);
          setIsRenderReady(true);
        }, 80);

        return () => clearTimeout(t3);
      }, 140);

      const animate = () => {
        reqId = requestAnimationFrame(animate);
        if (autoRotate && box) {
          box.rotation.y += 0.008;
        }
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };
      animate();

      const handleResize = () => {
        if (!mountRef.current || !camera || !renderer) return;
        const nw = mountRef.current.clientWidth;
        const nh = mountRef.current.clientHeight;
        if (nw > 0 && nh > 0) {
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        isMounted = false;
        clearTimeout(t1);
        clearTimeout(t2);
        cancelAnimationFrame(reqId);
        window.removeEventListener('resize', handleResize);
        if (renderer) renderer.dispose();
        if (geometry) geometry.dispose();
        if (material) material.dispose();
        if (mountRef.current) {
          mountRef.current.innerHTML = '';
        }
      };
    } catch (err: any) {
      console.error('Three.js initialization error:', err);
      setRenderError('خطا در راه‌اندازی رندر سه‌بعدی WebGL: ' + (err?.message || 'مشکل در شتاب‌دهنده گرافیکی'));
    }
  }, [width, height, depth, color, paperType, wireframe, autoRotate, isOpenRatio, materialThickness]);

  return (
    <div className="w-full h-full min-h-[320px] relative rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-800 flex items-center justify-center">
      {/* 3D Canvas Mount Point */}
      <div 
        ref={mountRef} 
        className={`w-full h-full min-h-[320px] transition-opacity duration-500 ${isRenderReady ? 'opacity-100' : 'opacity-0'}`} 
      />

      {/* Interactive PBR Loading Indicator Overlay */}
      {!isRenderReady && !renderError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center select-none" dir="rtl">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10 animate-pulse">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" style={{ animationDuration: '2.5s' }} />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 animate-ping" />
          </div>

          <h4 className="text-sm font-black text-slate-100 mb-1 flex items-center gap-2">
            <span>در حال پردازش رندر متریال سه‌بعدی PBR</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-bold">
              {loadingProgress}٪
            </span>
          </h4>

          <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-3">
            {loadingPhase === 'shaders' && 'کامپایل سایه‌زن‌های PBR و بازتاب نور محیطی...'}
            {loadingPhase === 'geometry' && 'محاسبه خطوط خمش، هندسه پنل‌ها و لبه‌های دایکات...'}
            {loadingPhase === 'pbr' && 'اعمال تکسچرینگ مقوا و بارگذاری شیدرهای WebGL...'}
            {loadingPhase === 'ready' && 'آماده‌سازی نهایی فضای سه‌بعدی...'}
          </p>

          {/* Micro Progress Bar */}
          <div className="w-48 h-1.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Graceful Fallback if WebGL crashes or errors */}
      {renderError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 p-6 text-center" dir="rtl">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 mb-3">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-rose-300 mb-1">عدم موفقیت در بارگذاری موتور سه‌بعدی</h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">{renderError}</p>
        </div>
      )}
    </div>
  );
};
