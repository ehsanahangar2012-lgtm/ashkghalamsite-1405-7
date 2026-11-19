import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Box,
  ArrowUpRight,
  Sparkles,
  Eye,
  SlidersHorizontal,
  Repeat,
  Hand,
  ArrowUpDown,
} from 'lucide-react';
import { AppView } from '../types';
import { useContent } from '../contexts/ContentContext';
import { saveInquiryPrefill } from '../utils/inquiryPrefill';
import {
  BOARD_MATERIALS,
  FOIL_MATERIALS,
  HeroBoardSurfaceType,
  HeroBoardTextureSet,
  createHeroBoardMaps,
  createBrushedFoilMaps,
  createFoilArtworkTexture,
  createCustomColorLogoTexture,
  createStudioFloorTexture,
  createContactShadowTexture,
} from './three/packagingTextures';
import {
  PACKAGING_MODELS,
  PackagingModelId,
  ServiceHotspotSpec,
  buildPackagingAssembly,
  PackagingAssemblyResult,
} from './three/packagingModels';

export interface ThreeDProductSliderProps {
  onNavigate?: (view: AppView) => void;
}

type ViewMode = 'studio' | 'cad' | 'exploded';
type SlidePhase = 'dieline' | 'folding' | 'showcase' | 'manual';

const _vec3 = new THREE.Vector3();
const _targetPos = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function mapLegacyModelId(id?: string): PackagingModelId {
  if (!id) return 'giftBox';
  if (PACKAGING_MODELS.some((m) => m.id === id)) return id as PackagingModelId;
  if (id === 'hardbox') return 'giftBox';
  if (id === 'fefco0201') return 'fefco0427';
  if (id === 'ecma_pharma') return 'pharmaCarton';
  if (id === 'pos_stand') return 'windowBox';
  return 'giftBox';
}

function mapLegacyMaterialId(id?: string): string | null {
  if (!id) return null;
  if (BOARD_MATERIALS.some((b) => b.id === id)) return id;
  if (id === 'velvet_gold') return 'carbon';
  if (id === 'matte_indigo') return 'royal';
  if (id === 'pharma_gloss') return 'sbs';
  return null;
}

export const ThreeDProductSlider: React.FC<ThreeDProductSliderProps> = ({ onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const { globalSettings } = useContent();

  // Sync with Admin SliderSettingsPanel config
  const [sliderConfig, setSliderConfig] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('ashk_slider_config');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncConfig = () => {
      try {
        const raw = localStorage.getItem('ashk_slider_config');
        if (raw) setSliderConfig(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener('ashk-slider-config-updated', syncConfig);
    window.addEventListener('ashk_slider_config_changed', syncConfig);
    return () => {
      window.removeEventListener('ashk-slider-config-updated', syncConfig);
      window.removeEventListener('ashk_slider_config_changed', syncConfig);
    };
  }, []);

  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const mapped = mapLegacyModelId(sliderConfig?.defaultModelId);
    const idx = PACKAGING_MODELS.findIndex((m) => m.id === mapped);
    return idx >= 0 ? idx : 0;
  });

  const activeModel = PACKAGING_MODELS[activeIndex] || PACKAGING_MODELS[0];

  const [boardId, setBoardId] = useState<string>(
    () => mapLegacyMaterialId(sliderConfig?.materialPreset) || activeModel.defaultBoardId
  );
  const [foilId, setFoilId] = useState<string>(activeModel.defaultFoilId);
  const [foldPercent, setFoldPercent] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    sliderConfig?.showWireframe ? 'cad' : 'studio'
  );
  const [autoRotate, setAutoRotate] = useState<boolean>(() =>
    sliderConfig?.autoPlay !== undefined ? Boolean(sliderConfig.autoPlay) : true
  );
  const [autoSlide, setAutoSlide] = useState<boolean>(() =>
    sliderConfig?.autoSlide !== undefined ? Boolean(sliderConfig.autoSlide) : true
  );
  const [autoDielineFold, setAutoDielineFold] = useState<boolean>(() =>
    sliderConfig?.autoDielineFold !== undefined ? Boolean(sliderConfig.autoDielineFold) : true
  );
  const [slidePhase, setSlidePhase] = useState<SlidePhase>('dieline');

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [activeHotspot, setActiveHotspot] = useState<ServiceHotspotSpec | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);
  const [userInteracted, setUserInteracted] = useState<boolean>(false);
  const [touchInspectMode, setTouchInspectMode] = useState<boolean>(false);
  const touchInspectRef = useRef<boolean>(false);
  const horizontalSpinVelRef = useRef<number>(0);

  // Direct DOM refs so 60fps Three.js loop never triggers 18Hz React tree re-renders
  const progressBarRef = useRef<HTMLDivElement>(null);
  const foldBadgeRef = useRef<HTMLSpanElement>(null);
  const foldSliderInputRef = useRef<HTMLInputElement>(null);
  const foldSliderValueRef = useRef<HTMLSpanElement>(null);
  const hotspotBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastFoldPctRef = useRef<number>(0);

  const effectiveLogoUrl = (sliderConfig?.boxLogoUrl || globalSettings?.logoUrl || '').trim();
  const effectiveLogoMode: 'color' | 'foil' = sliderConfig?.boxLogoMode === 'foil' ? 'foil' : 'color';
  const effectiveBrandTitle = sliderConfig?.brandTitle || 'اشک قـلـم';
  const slideDurationSec = Math.max(6, Math.min(25, Number(sliderConfig?.slideDurationSec) || 11));

  // Sync admin config updates dynamically
  useEffect(() => {
    if (!sliderConfig) return;
    if (sliderConfig.autoPlay !== undefined) setAutoRotate(Boolean(sliderConfig.autoPlay));
    if (sliderConfig.autoSlide !== undefined) setAutoSlide(Boolean(sliderConfig.autoSlide));
    if (sliderConfig.autoDielineFold !== undefined) setAutoDielineFold(Boolean(sliderConfig.autoDielineFold));
    if (sliderConfig.showWireframe !== undefined) setViewMode(sliderConfig.showWireframe ? 'cad' : 'studio');
    const mappedMat = mapLegacyMaterialId(sliderConfig.materialPreset);
    if (mappedMat) setBoardId(mappedMat);
  }, [sliderConfig]);

  useEffect(() => {
    if (!dockCollapsed) {
      if (foldSliderInputRef.current) foldSliderInputRef.current.value = String(lastFoldPctRef.current);
      if (foldSliderValueRef.current) foldSliderValueRef.current.textContent = `${lastFoldPctRef.current}%`;
    }
  }, [dockCollapsed]);

  // Ref for triggering slide changes from inside requestAnimationFrame cleanly
  const selectModelIndexRef = useRef<(idx: number) => void>(() => {});

  const selectModelIndex = useCallback((nextIdx: number) => {
    const normalized = ((nextIdx % PACKAGING_MODELS.length) + PACKAGING_MODELS.length) % PACKAGING_MODELS.length;
    const model = PACKAGING_MODELS[normalized];
    setActiveIndex(normalized);
    setBoardId(model.defaultBoardId);
    setFoilId(model.defaultFoilId);
    setActiveHotspot(null);
    sceneStateRef.current.cycleElapsed = 0;
    sceneStateRef.current.manualFoldOverride = false;
    sceneStateRef.current.userDragging = false;
    lastFoldPctRef.current = 0;
    if (progressBarRef.current) progressBarRef.current.style.transform = 'scaleX(0.05)';
    if (foldBadgeRef.current) foldBadgeRef.current.textContent = '0%';
    if (foldSliderInputRef.current) foldSliderInputRef.current.value = '0';
    if (foldSliderValueRef.current) foldSliderValueRef.current.textContent = '0%';
    setSlidePhase(sceneStateRef.current.autoDielineFold ? 'dieline' : 'showcase');
  }, []);

  selectModelIndexRef.current = selectModelIndex;

  // Mutable ref state read inside Three.js animation loop without tearing down WebGL
  const sceneStateRef = useRef({
    modelId: activeModel.id as PackagingModelId,
    modelCode: activeModel.code,
    modelTitleFa: activeModel.nameFa,
    boardId,
    foilId,
    foldTarget: 0,
    explodeTarget: viewMode === 'exploded' ? 1 : 0,
    cadTarget: viewMode === 'cad' ? 1 : 0,
    autoRotate,
    autoSlide,
    autoDielineFold,
    slideDurationSec,
    rotationSpeed: sliderConfig?.rotationSpeed ?? 0.9,
    hotspots: activeModel.hotspots,
    cycleElapsed: 0,
    manualFoldOverride: false,
    userDragging: false,
    activeHotspotPause: false,
    brandTitle: effectiveBrandTitle,
    logoUrl: effectiveLogoUrl,
    logoMode: effectiveLogoMode,
    cameraPreset: null as { pos: [number, number, number]; target: [number, number, number] } | null,
    isVisible: true,
  });

  useEffect(() => {
    const st = sceneStateRef.current;
    st.modelId = activeModel.id;
    st.modelCode = activeModel.code;
    st.modelTitleFa = activeModel.nameFa;
    st.boardId = boardId;
    st.foilId = foilId;
    st.explodeTarget = viewMode === 'exploded' ? 1 : 0;
    st.cadTarget = viewMode === 'cad' ? 1 : 0;
    st.autoRotate = autoRotate;
    st.autoSlide = autoSlide;
    st.autoDielineFold = autoDielineFold;
    st.slideDurationSec = slideDurationSec;
    st.rotationSpeed = sliderConfig?.rotationSpeed ?? 0.9;
    st.hotspots = activeModel.hotspots;
    st.activeHotspotPause = Boolean(activeHotspot);
    st.brandTitle = effectiveBrandTitle;
    st.logoUrl = effectiveLogoUrl;
    st.logoMode = effectiveLogoMode;
  }, [
    activeModel,
    boardId,
    foilId,
    viewMode,
    autoRotate,
    autoSlide,
    autoDielineFold,
    slideDurationSec,
    sliderConfig,
    activeHotspot,
    effectiveBrandTitle,
    effectiveLogoUrl,
    effectiveLogoMode,
  ]);

  // Persistent Three.js handles for live model/logo rebuilds without recreating renderer
  const threeHandlesRef = useRef<{
    rebuildAssembly: (id: PackagingModelId) => void;
    refreshArtwork: () => void;
    updateMaterials: (bId: string, fId: string) => void;
    setTouchInspect: (active: boolean) => void;
    resetCamera: () => void;
    replayFold: () => void;
  } | null>(null);

  useEffect(() => {
    touchInspectRef.current = touchInspectMode;
    threeHandlesRef.current?.setTouchInspect(touchInspectMode);
  }, [touchInspectMode]);

  useEffect(() => {
    threeHandlesRef.current?.rebuildAssembly(activeModel.id);
  }, [activeModel.id]);

  useEffect(() => {
    threeHandlesRef.current?.refreshArtwork();
  }, [effectiveBrandTitle, effectiveLogoUrl, effectiveLogoMode]);

  useEffect(() => {
    threeHandlesRef.current?.updateMaterials(boardId, foilId);
  }, [boardId, foilId]);

  // Initialize WebGL Scene once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const isCompactViewport = window.innerWidth < 768;
    const isCoarsePointer =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const lowPowerMode = isSoftwareGl || isCompactViewport || isCoarsePointer;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const width = mount.clientWidth || 1200;
    const height = mount.clientHeight || 680;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, lowPowerMode ? 1.15 : 1.5)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !lowPowerMode;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const handleContextLost = (ev: Event) => {
      ev.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color('#020307');
    scene.background = bgColor;
    scene.fog = new THREE.FogExp2('#020307', 0.055);

    // Studio Reflection Environment (RoomEnvironment via PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    const initialAspect = width / height;
    const isPortraitInit = initialAspect < 0.85;
    const camera = new THREE.PerspectiveCamera(isPortraitInit ? 46 : 38, initialAspect, 0.1, 100);
    camera.position.set(isPortraitInit ? 3.85 : 3.45, isPortraitInit ? 3.05 : 2.95, isPortraitInit ? 4.65 : 4.15);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = 0.22;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minDistance = 2.6;
    controls.maxDistance = 8.5;
    controls.target.set(0, isPortraitInit ? 0.14 : 0.34, 0);

    // Smart Touch Scroll Arbitration:
    // On mobile/touch devices, preserve native vertical page scroll (pan-y) by default,
    // allow passive horizontal finger swipe to spin the 3D turntable smoothly,
    // and switch to full 2-axis OrbitControls when user activates 360 Inspect Mode or uses a mouse.
    const isTouchFirstDevice = isCompactViewport || isCoarsePointer;
    if (isTouchFirstDevice && !touchInspectRef.current) {
      controls.enabled = false;
      renderer.domElement.style.touchAction = 'pan-y';
    } else {
      controls.enabled = true;
      renderer.domElement.style.touchAction = 'none';
    }

    const onPointerDownArbitrate = (ev: PointerEvent) => {
      if (ev.pointerType === 'mouse') {
        controls.enabled = true;
        renderer.domElement.style.touchAction = 'none';
      } else if (ev.pointerType === 'touch' && !touchInspectRef.current) {
        controls.enabled = false;
        renderer.domElement.style.touchAction = 'pan-y';
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDownArbitrate, {
      capture: true,
      passive: true,
    });

    let touchTrack: {
      active: boolean;
      startX: number;
      startY: number;
      lastX: number;
      axis: 'none' | 'x' | 'y';
    } = { active: false, startX: 0, startY: 0, lastX: 0, axis: 'none' };

    const onTouchStartPassive = (ev: TouchEvent) => {
      if (touchInspectRef.current || ev.touches.length !== 1) {
        touchTrack.active = false;
        return;
      }
      const pt = ev.touches[0];
      touchTrack = {
        active: true,
        startX: pt.clientX,
        startY: pt.clientY,
        lastX: pt.clientX,
        axis: 'none',
      };
    };

    const onTouchMovePassive = (ev: TouchEvent) => {
      if (!touchTrack.active || touchInspectRef.current || ev.touches.length !== 1) return;
      const pt = ev.touches[0];
      const totalDx = Math.abs(pt.clientX - touchTrack.startX);
      const totalDy = Math.abs(pt.clientY - touchTrack.startY);

      if (touchTrack.axis === 'none') {
        if (totalDx < 8 && totalDy < 8) return;
        if (totalDy >= totalDx * 0.9) {
          touchTrack.axis = 'y'; // Native vertical scroll wins immediately
          return;
        }
        touchTrack.axis = 'x';
        setUserInteracted(true);
      }

      if (touchTrack.axis === 'x') {
        const dx = pt.clientX - touchTrack.lastX;
        touchTrack.lastX = pt.clientX;
        stagePivot.rotation.y += dx * 0.0085;
        plinthGroup.rotation.y += dx * 0.0085;
        horizontalSpinVelRef.current = THREE.MathUtils.clamp(dx * 0.14, -4.5, 4.5);
      }
    };

    const onTouchEndPassive = () => {
      touchTrack.active = false;
      touchTrack.axis = 'none';
    };

    renderer.domElement.addEventListener('touchstart', onTouchStartPassive, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMovePassive, { passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEndPassive, { passive: true });
    renderer.domElement.addEventListener('touchcancel', onTouchEndPassive, { passive: true });

    controls.addEventListener('start', () => {
      sceneStateRef.current.cameraPreset = null;
      sceneStateRef.current.userDragging = true;
      setUserInteracted(true);
    });
    controls.addEventListener('end', () => {
      sceneStateRef.current.userDragging = false;
    });

    // High-Contrast Luxury Exhibition Lighting Rig + Studio Softboxes
    const hemiLight = new THREE.HemisphereLight('#dbeafe', '#14110c', 0.68);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff5e1', 2.65);
    keyLight.position.set(4.5, 7.5, 5.0);
    keyLight.castShadow = !lowPowerMode;
    keyLight.shadow.mapSize.set(512, 512);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 20;
    const d = 3.8;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 1.65);
    rimLight.position.set(-5.0, 4.2, -4.5);
    scene.add(rimLight);

    const warmAccentLight = new THREE.PointLight('#f59e0b', 2.2, 14, 1.4);
    warmAccentLight.position.set(3.2, 2.3, -3.2);
    scene.add(warmAccentLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const topSoftbox = new THREE.RectAreaLight('#fff8eb', 2.6, 5.8, 3.2);
      topSoftbox.position.set(1.1, 5.1, 2.2);
      topSoftbox.lookAt(0, 0.35, 0);
      scene.add(topSoftbox);

      const coolSoftbox = new THREE.RectAreaLight('#bae6fd', 1.35, 4.2, 2.8);
      coolSoftbox.position.set(-4.2, 2.7, -2.4);
      coolSoftbox.lookAt(0, 0.35, 0);
      scene.add(coolSoftbox);
    }

    const maxAniso =
      typeof renderer.capabilities.getMaxAnisotropy === 'function'
        ? renderer.capabilities.getMaxAnisotropy()
        : 1;

    const floorTex = createStudioFloorTexture(maxAniso);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.78,
      metalness: 0.18,
    });
    const floorGeo = new THREE.CircleGeometry(18, 64);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.34;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Exhibition Turntable Plinth
    const plinthGroup = new THREE.Group();
    const plinthBaseGeo = new THREE.CylinderGeometry(2.55, 2.72, 0.22, 64);
    const plinthBaseMat = new THREE.MeshStandardMaterial({
      color: '#060911',
      roughness: 0.38,
      metalness: 0.65,
    });
    const plinthBase = new THREE.Mesh(plinthBaseGeo, plinthBaseMat);
    plinthBase.position.y = -0.22;
    plinthBase.receiveShadow = true;
    plinthGroup.add(plinthBase);

    const brassRingGeo = new THREE.TorusGeometry(2.56, 0.02, 16, 96);
    brassRingGeo.rotateX(Math.PI / 2);
    const brassRingMat = new THREE.MeshStandardMaterial({
      color: '#f2c96b',
      emissive: '#92400e',
      emissiveIntensity: 0.45,
      roughness: 0.18,
      metalness: 0.96,
    });
    const brassRing = new THREE.Mesh(brassRingGeo, brassRingMat);
    brassRing.position.y = -0.105;
    plinthGroup.add(brassRing);

    const haloRingGeo = new THREE.TorusGeometry(2.74, 0.01, 12, 96);
    haloRingGeo.rotateX(Math.PI / 2);
    const haloRingMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.42,
    });
    const haloRing = new THREE.Mesh(haloRingGeo, haloRingMat);
    haloRing.position.y = -0.22;
    plinthGroup.add(haloRing);

    const plinthTopGeo = new THREE.CylinderGeometry(2.48, 2.54, 0.04, 64);
    const plinthTopMat = new THREE.MeshStandardMaterial({
      color: '#090e1a',
      roughness: 0.52,
      metalness: 0.35,
    });
    const plinthTop = new THREE.Mesh(plinthTopGeo, plinthTopMat);
    plinthTop.position.y = -0.09;
    plinthTop.receiveShadow = true;
    plinthGroup.add(plinthTop);

    const shadowTex = createContactShadowTexture();
    const contactShadowGeo = new THREE.PlaneGeometry(4.0, 4.0);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.position.y = -0.068;
    plinthGroup.add(contactShadow);
    scene.add(plinthGroup);

    // Ambient Dust Particles
    const particleCount = lowPowerMode ? 24 : 48;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 2.6 + Math.random() * 5.2;
      const theta = Math.random() * Math.PI * 2;
      pPos[i * 3] = Math.cos(theta) * r;
      pPos[i * 3 + 1] = Math.random() * 3.8 - 0.1;
      pPos[i * 3 + 2] = Math.sin(theta) * r;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: '#e5b84b',
      size: 0.032,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Shared PBR Packaging Materials (Physical Materials + Procedural Normal & Roughness Maps)
    const boardMapsCache = new Map<HeroBoardSurfaceType, HeroBoardTextureSet>();
    const getBoardMaps = (surfaceType: HeroBoardSurfaceType): HeroBoardTextureSet => {
      const existing = boardMapsCache.get(surfaceType);
      if (existing) return existing;
      const created = createHeroBoardMaps(surfaceType, maxAniso);
      boardMapsCache.set(surfaceType, created);
      return created;
    };

    const initialBoardMaps = getBoardMaps('velvet');
    const innerLinerMaps = getBoardMaps('glossy');
    const brushedFoilMaps = createBrushedFoilMaps(maxAniso);

    let foilTex = createFoilArtworkTexture({
      modelCode: sceneStateRef.current.modelCode,
      modelTitleFa: sceneStateRef.current.modelTitleFa,
      maxAnisotropy: maxAniso,
      brandTitle: sceneStateRef.current.brandTitle,
      customLogoUrl: sceneStateRef.current.logoUrl,
      logoMode: sceneStateRef.current.logoMode,
    });
    let colorLogoTex: THREE.CanvasTexture | null = null;

    const boardMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#141926'),
      map: initialBoardMaps.map,
      normalMap: initialBoardMaps.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: initialBoardMaps.roughnessMap,
      roughness: 0.82,
      metalness: 0.03,
      clearcoat: 0.04,
      clearcoatRoughness: 0.72,
      sheen: 0.95,
      sheenRoughness: 0.52,
      sheenColor: new THREE.Color('#94a3b8'),
      envMapIntensity: 1.1,
    });

    const innerMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#dfd6c7'),
      map: innerLinerMaps.map,
      normalMap: innerLinerMaps.normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughnessMap: innerLinerMaps.roughnessMap,
      roughness: 0.72,
      metalness: 0.02,
      sheen: 0.25,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color('#f5efe6'),
      envMapIntensity: 0.9,
      side: THREE.DoubleSide,
    });

    const foilMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ecc154'),
      map: foilTex,
      alphaMap: foilTex,
      transparent: true,
      alphaTest: 0.15,
      roughnessMap: brushedFoilMaps.roughnessMap,
      normalMap: brushedFoilMaps.normalMap,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughness: 0.12,
      metalness: 0.98,
      anisotropy: 0.72,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.75,
      emissive: new THREE.Color('#3f2804'),
      emissiveIntensity: 0.38,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });

    const colorLogoMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transparent: true,
      alphaTest: 0.08,
      roughness: 0.14,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.35,
      side: THREE.DoubleSide,
      visible: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -3,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#dbeafe',
      roughness: 0.06,
      metalness: 0.06,
      transmission: 0,
      transparent: true,
      opacity: 0.28,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.95,
      envMapIntensity: 1.85,
      depthWrite: false,
    });

    const wireMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      wireframe: true,
      transparent: true,
      opacity: 0,
      visible: false,
    });

    const edgeMat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.06,
    });

    const creaseMat = new THREE.LineDashedMaterial({
      color: '#f59e0b',
      dashSize: 0.08,
      gapSize: 0.05,
      transparent: true,
      opacity: 0.04,
    });

    const stagePivot = new THREE.Group();
    stagePivot.position.y = -0.05;
    scene.add(stagePivot);

    let currentAssembly: PackagingAssemblyResult | null = null;
    let foldCurrent = 0;
    let explodeCurrent = 0;
    let cadCurrent = 0;

    const refreshArtwork = () => {
      const st = sceneStateRef.current;
      foilTex.dispose();
      foilTex = createFoilArtworkTexture({
        modelCode: st.modelCode,
        modelTitleFa: st.modelTitleFa,
        maxAnisotropy: maxAniso,
        brandTitle: st.brandTitle,
        customLogoUrl: st.logoUrl,
        logoMode: st.logoMode,
        onTextureUpdated: () => {
          foilMat.needsUpdate = true;
        },
      });
      foilMat.map = foilTex;
      foilMat.alphaMap = foilTex;
      foilMat.needsUpdate = true;

      if (colorLogoTex) {
        colorLogoTex.dispose();
        colorLogoTex = null;
      }

      if (st.logoUrl && st.logoMode === 'color') {
        colorLogoTex = createCustomColorLogoTexture(st.logoUrl, maxAniso, () => {
          colorLogoMat.needsUpdate = true;
        });
        colorLogoMat.map = colorLogoTex;
        colorLogoMat.visible = true;
        colorLogoMat.needsUpdate = true;
      } else {
        colorLogoMat.map = null;
        colorLogoMat.visible = false;
        colorLogoMat.needsUpdate = true;
      }
    };

    const rebuildAssembly = (id: PackagingModelId) => {
      const spec = PACKAGING_MODELS.find((m) => m.id === id) || PACKAGING_MODELS[0];
      if (currentAssembly) {
        stagePivot.remove(currentAssembly.root);
        currentAssembly.root.traverse((obj) => {
          if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        });
      }

      // Reset fold to flat dieline whenever a new slide starts in autoDielineFold mode
      if (sceneStateRef.current.autoDielineFold && !sceneStateRef.current.manualFoldOverride) {
        foldCurrent = 0;
        sceneStateRef.current.foldTarget = 0;
      }

      refreshArtwork();

      currentAssembly = buildPackagingAssembly(
        spec.id,
        spec.defaultDims.length,
        spec.defaultDims.width,
        spec.defaultDims.height,
        boardMat,
        innerMat,
        foilMat,
        colorLogoMat,
        glassMat,
        wireMat,
        edgeMat,
        creaseMat
      );
      stagePivot.add(currentAssembly.root);
    };

    const updateMaterials = (bId: string, fId: string) => {
      const bSpec = BOARD_MATERIALS.find((b) => b.id === bId) || BOARD_MATERIALS[0];
      const fSpec = FOIL_MATERIALS.find((f) => f.id === fId) || FOIL_MATERIALS[0];
      const maps = getBoardMaps(bSpec.surfaceType);

      boardMat.color.set(bSpec.color);
      boardMat.map = maps.map;
      boardMat.normalMap = maps.normalMap;
      boardMat.normalScale.set(bSpec.normalScale, bSpec.normalScale);
      boardMat.roughnessMap = maps.roughnessMap;
      boardMat.roughness = bSpec.roughness;
      boardMat.metalness = bSpec.metalness;
      boardMat.clearcoat = bSpec.clearcoat;
      boardMat.clearcoatRoughness = bSpec.clearcoatRoughness;
      boardMat.sheen = bSpec.sheen;
      boardMat.sheenRoughness = bSpec.sheenRoughness;
      boardMat.sheenColor.set(bSpec.sheenColor);
      boardMat.envMapIntensity = bSpec.envMapIntensity;
      boardMat.needsUpdate = true;

      innerMat.color.set(bSpec.innerColor);
      innerMat.needsUpdate = true;

      foilMat.color.set(fSpec.color);
      foilMat.emissive.set(fSpec.emissive);
      foilMat.roughness = fSpec.roughness;
      foilMat.metalness = fSpec.metalness;
      foilMat.needsUpdate = true;
    };

    const setTouchInspect = (active: boolean) => {
      if (isTouchFirstDevice) {
        controls.enabled = active;
        renderer.domElement.style.touchAction = active ? 'none' : 'pan-y';
      } else {
        controls.enabled = true;
        renderer.domElement.style.touchAction = 'none';
      }
    };

    const resetCamera = () => {
      sceneStateRef.current.cameraPreset = {
        pos: [3.7, 2.55, 4.35],
        target: [0, 0.38, 0],
      };
    };

    const replayFold = () => {
      sceneStateRef.current.manualFoldOverride = false;
      sceneStateRef.current.cycleElapsed = 0;
      sceneStateRef.current.foldTarget = 0;
      foldCurrent = 0;
      lastFoldPctRef.current = 0;
      if (progressBarRef.current) progressBarRef.current.style.transform = 'scaleX(0.05)';
      if (foldBadgeRef.current) foldBadgeRef.current.textContent = '0%';
      if (foldSliderInputRef.current) foldSliderInputRef.current.value = '0';
      if (foldSliderValueRef.current) foldSliderValueRef.current.textContent = '0%';
      setSlidePhase('dieline');
      setFoldPercent(0);
    };

    threeHandlesRef.current = {
      rebuildAssembly,
      refreshArtwork,
      updateMaterials,
      setTouchInspect,
      resetCamera,
      replayFold,
    };

    rebuildAssembly(sceneStateRef.current.modelId);
    updateMaterials(sceneStateRef.current.boardId, sceneStateRef.current.foilId);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w > 0 && h > 0) {
        const aspect = w / h;
        camera.aspect = aspect;
        camera.fov = aspect < 0.85 ? 46 : 38;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', onResize, { passive: true });

    let frameId = 0;
    let isLoopScheduled = false;
    let disposed = false;
    let lastTime = performance.now();
    let lastUiBroadcast = 0;
    let lastBroadcastPhase: SlidePhase = 'dieline';
    let firstFrameDrawn = false;

    const scheduleFrame = () => {
      if (disposed || isLoopScheduled) return;
      isLoopScheduled = true;
      if (isSoftwareGl) {
        frameId = window.setTimeout(animate, 20);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    const wakeLoop = () => {
      if (disposed) return;
      if (sceneStateRef.current.isVisible && !document.hidden) {
        lastTime = performance.now();
        scheduleFrame();
      }
    };

    const visObserver = new IntersectionObserver(
      (entries) => {
        const visibleNow = entries[0]?.isIntersecting ?? true;
        sceneStateRef.current.isVisible = visibleNow;
        if (visibleNow) {
          wakeLoop();
        }
      },
      { threshold: 0.05 }
    );
    if (containerRef.current) {
      visObserver.observe(containerRef.current);
    }

    const onVisibilityChange = () => {
      if (!document.hidden) {
        wakeLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        isLoopScheduled = true;
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          isLoopScheduled = true;
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const animate = () => {
      isLoopScheduled = false;
      if (disposed) return;
      const st = sceneStateRef.current;
      if ((!st.isVisible || document.hidden) && firstFrameDrawn) {
        // Completely pause RAF when offscreen or tab hidden (0 idle CPU/GPU cost)
        return;
      }
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      firstFrameDrawn = true;

      // Slider Cycle State Machine: Flat Dieline -> Beautiful Fold -> Assembled Showcase -> Next Item
      let computedPhase: SlidePhase = st.manualFoldOverride ? 'manual' : 'showcase';
      let cycleRatio = 0;

      if (!st.manualFoldOverride && !st.activeHotspotPause && !st.userDragging) {
        if (st.autoSlide || st.autoDielineFold) {
          st.cycleElapsed += dt;
          const dur = st.slideDurationSec;
          cycleRatio = Math.min(1, st.cycleElapsed / dur);

          if (st.autoDielineFold) {
            if (cycleRatio < 0.18) {
              // Phase 1: Display flat Dieline cut/crease blueprint
              st.foldTarget = 0;
              computedPhase = 'dieline';
            } else if (cycleRatio < 0.52) {
              // Phase 2: Smooth Dieline -> 3D Box transformation
              const t = (cycleRatio - 0.18) / 0.34;
              st.foldTarget = THREE.MathUtils.clamp(t, 0, 1);
              computedPhase = 'folding';
            } else if (cycleRatio < 0.92) {
              // Phase 3: Assembled 3D Box Hero Showcase with Logo
              st.foldTarget = 1;
              computedPhase = 'showcase';
            } else {
              // Phase 4: Subtle gentle unfold before switching to next slide
              const t = (cycleRatio - 0.92) / 0.08;
              st.foldTarget = Math.max(0.25, 1 - t * 0.75);
              computedPhase = 'folding';
            }
          } else {
            st.foldTarget = 1;
            computedPhase = 'showcase';
          }

          if (st.cycleElapsed >= dur) {
            if (st.autoSlide) {
              st.cycleElapsed = 0;
              selectModelIndexRef.current(
                (PACKAGING_MODELS.findIndex((m) => m.id === st.modelId) + 1) % PACKAGING_MODELS.length
              );
            } else {
              // Hold assembled after single dieline-to-box animation
              st.cycleElapsed = dur * 0.8;
            }
          }
        }
      }

      // Frame-rate independent exponential damping
      foldCurrent = THREE.MathUtils.damp(foldCurrent, st.foldTarget, 6.2, dt);
      explodeCurrent = THREE.MathUtils.damp(explodeCurrent, st.explodeTarget, 5.2, dt);
      cadCurrent = THREE.MathUtils.damp(cadCurrent, st.cadTarget, 6.0, dt);

      if (currentAssembly) {
        currentAssembly.applyFoldAndExplode(foldCurrent, explodeCurrent);
        currentAssembly.setCadMode(cadCurrent, foldCurrent);
      }

      // Gently frame elevated blueprint angle when flat dieline is shown (unless user is orbiting)
      if (!st.cameraPreset && !st.userDragging && !st.activeHotspotPause && st.autoDielineFold && !st.manualFoldOverride) {
        const isPortraitView = camera.aspect < 0.85;
        const flatWeight = THREE.MathUtils.clamp(1 - foldCurrent * 1.15, 0, 1);
        const desiredY = THREE.MathUtils.lerp(isPortraitView ? 2.55 : 2.35, isPortraitView ? 3.85 : 3.55, flatWeight);
        const desiredDist = THREE.MathUtils.lerp(isPortraitView ? 5.65 : 5.05, isPortraitView ? 6.55 : 5.95, flatWeight);
        const curHorizontalDist = Math.hypot(camera.position.x, camera.position.z) || 1;
        const targetHoriz = Math.sqrt(Math.max(4, desiredDist * desiredDist - desiredY * desiredY));
        const scaleHoriz = THREE.MathUtils.damp(curHorizontalDist, targetHoriz, 2.2, dt) / curHorizontalDist;
        camera.position.x *= scaleHoriz;
        camera.position.z *= scaleHoriz;
        camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredY, 2.4, dt);
      }

      if (Math.abs(horizontalSpinVelRef.current) > 0.002) {
        stagePivot.rotation.y += horizontalSpinVelRef.current * dt;
        plinthGroup.rotation.y += horizontalSpinVelRef.current * dt;
        horizontalSpinVelRef.current *= Math.exp(-5.5 * dt);
      } else {
        horizontalSpinVelRef.current = 0;
      }

      if (st.autoRotate) {
        const spinFactor = computedPhase === 'dieline' ? 0.14 : 0.26;
        stagePivot.rotation.y += dt * spinFactor * st.rotationSpeed;
        plinthGroup.rotation.y += dt * spinFactor * st.rotationSpeed;
      }

      particles.rotation.y += dt * 0.04;

      if (st.cameraPreset) {
        _vec3.set(...st.cameraPreset.pos);
        _targetPos.set(...st.cameraPreset.target);
        camera.position.lerp(_vec3, 1 - Math.exp(-4.5 * dt));
        controls.target.lerp(_targetPos, 1 - Math.exp(-4.5 * dt));
        if (camera.position.distanceTo(_vec3) < 0.03) {
          st.cameraPreset = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      // Direct DOM HUD & Hotspot sync (zero React re-renders per frame)
      if (now - lastUiBroadcast > 50 && mount.clientWidth > 0) {
        lastUiBroadcast = now;

        if (!st.manualFoldOverride) {
          const pct = Math.round(foldCurrent * 100);
          lastFoldPctRef.current = pct;
          if (foldBadgeRef.current) foldBadgeRef.current.textContent = `${pct}%`;
          if (progressBarRef.current) {
            progressBarRef.current.style.transform = `scaleX(${Math.max(0.05, cycleRatio)})`;
          }
          if (foldSliderInputRef.current && document.activeElement !== foldSliderInputRef.current) {
            foldSliderInputRef.current.value = String(pct);
          }
          if (foldSliderValueRef.current) foldSliderValueRef.current.textContent = `${pct}%`;
          if (computedPhase !== lastBroadcastPhase) {
            lastBroadcastPhase = computedPhase;
            setSlidePhase(computedPhase);
          }
        }

        const mw = mount.clientWidth;
        if (mw >= 768) {
          const mh = mount.clientHeight;
          stagePivot.updateMatrixWorld(true);
          for (let i = 0; i < st.hotspots.length; i++) {
            const hs = st.hotspots[i];
            const btn = hotspotBtnRefs.current[hs.id];
            if (!btn) continue;
            _vec3.set(hs.localPoint[0], hs.localPoint[1], hs.localPoint[2]);
            _vec3.applyMatrix4(stagePivot.matrixWorld);
            _vec3.project(camera);
            const x = (_vec3.x * 0.5 + 0.5) * mw;
            const y = (-_vec3.y * 0.5 + 0.5) * mh;
            const visible = _vec3.z < 1 && foldCurrent > 0.72 && x > 30 && x < mw - 30 && y > 40 && y < mh - 80;
            if (visible) {
              btn.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
              btn.style.opacity = '1';
              btn.style.pointerEvents = 'auto';
            } else {
              btn.style.opacity = '0';
              btn.style.pointerEvents = 'none';
            }
          }
        }
      }

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        scheduleFrame();
      }
    };

    scheduleFrame();

    return () => {
      disposed = true;
      visObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDownArbitrate, { capture: true });
      renderer.domElement.removeEventListener('touchstart', onTouchStartPassive);
      renderer.domElement.removeEventListener('touchmove', onTouchMovePassive);
      renderer.domElement.removeEventListener('touchend', onTouchEndPassive);
      renderer.domElement.removeEventListener('touchcancel', onTouchEndPassive);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      floorTex.dispose();
      boardMapsCache.forEach((set) => {
        set.map.dispose();
        set.normalMap.dispose();
        set.roughnessMap.dispose();
      });
      boardMapsCache.clear();
      brushedFoilMaps.roughnessMap.dispose();
      brushedFoilMaps.normalMap.dispose();
      foilTex.dispose();
      colorLogoTex?.dispose();
      shadowTex.dispose();
      envRT.dispose();
      boardMat.dispose();
      innerMat.dispose();
      foilMat.dispose();
      colorLogoMat.dispose();
      glassMat.dispose();
      wireMat.dispose();
      edgeMat.dispose();
      creaseMat.dispose();
      floorMat.dispose();
      floorGeo.dispose();
      plinthBaseGeo.dispose();
      plinthBaseMat.dispose();
      brassRingGeo.dispose();
      brassRingMat.dispose();
      haloRingGeo.dispose();
      haloRingMat.dispose();
      plinthTopGeo.dispose();
      plinthTopMat.dispose();
      contactShadowGeo.dispose();
      contactShadowMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      renderer.dispose();
    };
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!isFullscreen) {
      el.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleHotspotClick = (hs: ServiceHotspotSpec) => {
    setActiveHotspot((prev) => (prev?.id === hs.id ? null : hs));
    setAutoRotate(false);
    const [hx, hy, hz] = hs.localPoint;
    sceneStateRef.current.cameraPreset = {
      pos: [hx * 1.4 + 2.4, Math.max(1.2, hy + 1.4), hz * 1.4 + 2.8],
      target: [hx * 0.35, Math.max(0.2, hy * 0.6), hz * 0.35],
    };
  };

  const handleManualFoldScrub = (val: number) => {
    sceneStateRef.current.manualFoldOverride = true;
    sceneStateRef.current.foldTarget = val / 100;
    lastFoldPctRef.current = val;
    if (foldBadgeRef.current) foldBadgeRef.current.textContent = `${val}%`;
    if (foldSliderValueRef.current) foldSliderValueRef.current.textContent = `${val}%`;
    if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${Math.max(0.05, val / 100)})`;
    setFoldPercent(val);
    setSlidePhase('manual');
  };

  const handleToggleAutoSlide = () => {
    const next = !autoSlide;
    setAutoSlide(next);
    if (next) {
      sceneStateRef.current.manualFoldOverride = false;
      sceneStateRef.current.cycleElapsed = 0;
      setAutoDielineFold(true);
    }
  };

  const activeBoard = useMemo(
    () => BOARD_MATERIALS.find((b) => b.id === boardId) || BOARD_MATERIALS[0],
    [boardId]
  );

  const handleInquiryPrefill = () => {
    const activeFoil = FOIL_MATERIALS.find((f) => f.id === foilId) || FOIL_MATERIALS[0];
    const lCm = Math.round(activeModel.defaultDims.length * 10);
    const wCm = Math.round(activeModel.defaultDims.width * 10);
    const hCm = Math.round(activeModel.defaultDims.height * 10);

    const mappedBoxType =
      activeModel.id === 'giftBox' || activeModel.id === 'slidingSleeve'
        ? 'هاردباکس مگنتی و لوکس'
        : activeModel.id === 'fefco0427'
        ? 'جعبه کیبوردی قفل‌دار (FEFCO 0427)'
        : activeModel.id === 'windowBox'
        ? 'جعبه پنجره‌دار و استند تبلیغاتی'
        : 'کارتن لمینتی با چاپ افست';

    const mappedFlute =
      activeModel.id === 'fefco0427'
        ? 'فلوت E (ظریف و لمینتی)'
        : 'مقوای ایندربرد / گلاسه';

    saveInquiryPrefill({
      sourceLabel: `مدل ۳D اسلایدر: ${activeModel.nameFa} (${activeModel.code})`,
      boxType: mappedBoxType,
      fluteType: mappedFlute,
      dimensions: `${lCm}x${wCm}x${hCm}`,
      quantity: '1000',
      notes: `ساختار انتخابی: ${activeModel.nameFa} | جنس مقوا: ${activeBoard.label} | فویل و چاپ: ${activeFoil.label}`,
    });
    onNavigate?.(AppView.INQUIRY);
  };

  const phaseLabelFa = useMemo(() => {
    if (slidePhase === 'dieline') return 'نقشه دایلاین';
    if (slidePhase === 'folding') return 'تبدیل به جعبه';
    if (slidePhase === 'manual') return 'کنترل دستی';
    return 'نمایش نهایی';
  }, [slidePhase]);

  return (
    <section
      ref={containerRef}
      aria-label="نمایشگر سه‌بعدی محصولات اشک قلم"
      className={`relative w-full ${
        isFullscreen ? 'fixed inset-0 h-screen z-[100]' : 'h-[90dvh] min-h-[540px] sm:h-[88dvh] md:h-[85vh] md:min-h-[640px] max-h-[92dvh] md:max-h-[880px]'
      } bg-[#020307] text-slate-100 overflow-hidden select-none font-sans border-b border-slate-900`}
      dir="rtl"
    >
      {/* Subtle Ambient Studio Aura around 3D Centerpiece */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_46%,rgba(245,158,11,0.07),rgba(15,23,42,0.08)_38%,transparent_68%)]"
      />

      {/* Isolated WebGL Canvas Container (Native vertical page scroll by default on mobile; pan-y) */}
      <div
        ref={canvasMountRef}
        className={`absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing ${
          touchInspectMode ? 'touch-none' : 'touch-pan-y md:touch-none'
        }`}
      />

      {/* Fallback when WebGL is unavailable */}
      {webglUnavailable && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020307] p-8 text-center">
          <Box className="w-14 h-14 text-amber-400 mb-3" />
          <h2 className="text-xl font-black text-white mb-2">{activeModel.nameFa}</h2>
        </div>
      )}

      {/* Subtle Edge Vignette */}
      <div className="absolute inset-x-0 top-0 h-20 md:h-24 bg-gradient-to-b from-[#020307]/90 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-24 md:h-32 bg-gradient-to-t from-[#020307]/96 via-[#020307]/45 to-transparent pointer-events-none" />

      {/* 3D Interactive Service Hotspots (Desktop/Tablet only; positioned directly via refs) */}
      <div className="hidden md:block absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {activeModel.hotspots.map((spec) => {
          const isSelected = activeHotspot?.id === spec.id;
          return (
            <button
              key={spec.id}
              ref={(el) => {
                hotspotBtnRefs.current[spec.id] = el;
              }}
              type="button"
              onClick={() => handleHotspotClick(spec)}
              title={spec.label}
              aria-label={spec.label}
              style={{
                opacity: 0,
                pointerEvents: 'none',
                transform: 'translate3d(-9999px, -9999px, 0)',
              }}
              className={`absolute top-0 left-0 flex items-center justify-center gap-1.5 rounded-full font-bold transition-colors cursor-pointer shadow-xl border px-2.5 py-1 text-[11px] will-change-transform ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-[#0b1120]/90 text-slate-100 border-amber-500/45 hover:border-amber-400 hover:bg-[#111a2e]'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
              <span className="whitespace-nowrap">{spec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Minimal Top Bar Overlay inside 3D Stage (Zero Descriptions — Pure Visual Focus) */}
      <div className="absolute top-3.5 md:top-6 inset-x-3.5 md:inset-x-8 flex items-start justify-between gap-3 z-20 pointer-events-none">
        {/* Top-Right Compact Headline */}
        <div className="max-w-[66%] md:max-w-lg pointer-events-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0b1120]/80 border border-amber-500/30 text-[10px] md:text-xs text-amber-400 font-mono mb-1.5 shadow-sm">
            <span>{activeModel.code}</span>
            <span className="text-slate-500">·</span>
            <span className="font-sans text-sky-300 font-bold">{phaseLabelFa}</span>
            <span ref={foldBadgeRef} className="text-slate-200 tabular-nums">{foldPercent}%</span>
          </div>

          <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight mb-2 drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)] [text-wrap:balance]">
            {activeModel.nameFa}
          </h1>

          {/* Ultra-slim Progress Bar */}
          <div className="w-32 sm:w-44 md:w-64 h-0.5 bg-slate-800/90 rounded-full overflow-hidden mb-0 md:mb-3.5">
            <div
              ref={progressBarRef}
              className="h-full bg-gradient-to-l from-amber-400 to-sky-400 transition-transform duration-150 origin-right will-change-transform"
              style={{
                transform: 'scaleX(0.05)',
              }}
            />
          </div>

          {/* Desktop Primary CTAs */}
          <div className="hidden md:flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleInquiryPrefill}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-amber-500/20 whitespace-nowrap"
            >
              <span>استعلام قیمت</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate?.(AppView.DIELINE_GENERATOR)}
              className="px-3.5 py-2 rounded-xl bg-[#0d1424]/90 hover:bg-[#141f38] text-slate-100 border border-slate-700/80 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Box className="w-4 h-4 text-amber-400" />
              <span>جعبه‌ساز ۳D</span>
            </button>
          </div>
        </div>

        {/* Top-Left Stage Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto shrink-0">
          <div className="hidden md:flex items-center gap-1 bg-[#0b1120]/90 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => selectModelIndex(activeIndex - 1)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="مدل قبلی"
              aria-label="مدل قبلی"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-1.5 text-xs font-mono font-bold text-amber-400 tabular-nums whitespace-nowrap">
              {String(activeIndex + 1).padStart(2, '0')} / {String(PACKAGING_MODELS.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => selectModelIndex(activeIndex + 1)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="مدل بعدی"
              aria-label="مدل بعدی"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => threeHandlesRef.current?.replayFold()}
            className="p-2 md:px-3 md:py-2 rounded-xl bg-[#0b1120]/90 border border-sky-500/40 text-sky-300 hover:text-white hover:border-sky-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="پخش مجدد تبدیل دایلاین به جعبه"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">دایلاین ← جعبه</span>
          </button>

          <button
            type="button"
            onClick={handleToggleAutoSlide}
            className={`p-2 md:px-3 md:py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              autoSlide
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                : 'bg-[#0b1120]/90 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title={autoSlide ? 'توقف اسلاید خودکار' : 'شروع اسلاید خودکار'}
          >
            {autoSlide ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => threeHandlesRef.current?.resetCamera()}
            className="hidden sm:flex p-2 rounded-xl bg-[#0b1120]/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title="بازنشانی دوربین"
            aria-label="بازنشانی دوربین"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-xl bg-[#0b1120]/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title={isFullscreen ? 'خروج از تمام‌صفحه' : 'نمایش تمام‌صفحه'}
            aria-label={isFullscreen ? 'خروج از تمام‌صفحه' : 'نمایش تمام‌صفحه'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Smart Mobile Touch Arbitration Pill (Allows seamless vertical page scroll + horizontal 360 spin + free Orbit toggle) */}
      {(dockCollapsed || touchInspectMode) && (
        <div
          className={`md:hidden absolute ${
            dockCollapsed ? 'bottom-[7.85rem]' : 'top-[4.6rem]'
          } left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-auto`}
        >
          {touchInspectMode ? (
            <button
              type="button"
              onClick={() => setTouchInspectMode(false)}
              className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black flex items-center gap-1.5 shadow-xl shadow-emerald-500/25 whitespace-nowrap cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>حالت چرخش ۳D فعال · بازگشت به اسکرول</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTouchInspectMode(true);
                setDockCollapsed(true);
                setUserInteracted(true);
              }}
              className="px-3 py-1 rounded-full bg-[#0b1120]/85 border border-amber-400/40 text-[10px] font-bold text-amber-200 flex items-center gap-1.5 shadow-lg whitespace-nowrap cursor-pointer"
            >
              <Hand className="w-3 h-3 text-amber-400" />
              <span>
                {!userInteracted ? 'اسکرول آزاد · کشیدن افقی یا لمس برای ۳۶۰°' : 'چرخش آزاد ۳۶۰°'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Selected 3D Service Hotspot Drawer */}
      <AnimatePresence>
        {activeHotspot && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-16 md:top-20 left-3.5 md:left-8 z-30 w-72 sm:w-80 max-w-[calc(100vw-1.75rem)] bg-[#0b1120]/95 border border-amber-500/40 rounded-2xl p-3.5 md:p-4 shadow-2xl pointer-events-auto"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-amber-400">{activeHotspot.label}</span>
              <button
                type="button"
                onClick={() => setActiveHotspot(null)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                بستن
              </button>
            </div>
            <h3 className="text-sm font-black text-white mb-1">{activeHotspot.serviceTitle}</h3>
            <p className="text-[11px] font-mono text-sky-300 mb-2">{activeHotspot.spec}</p>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">{activeHotspot.description}</p>
            <button
              type="button"
              onClick={() => onNavigate?.(activeHotspot.targetView)}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{activeHotspot.ctaText}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimal Dimension Pill (Desktop only) */}
      <div className="hidden xl:flex items-center gap-2.5 absolute right-8 bottom-32 z-10 pointer-events-none text-[11px] font-mono text-slate-400 tabular-nums">
        <span>{Math.round(activeModel.defaultDims.length * 100)}×{Math.round(activeModel.defaultDims.width * 100)}×{Math.round(activeModel.defaultDims.height * 100)} mm</span>
        <span>·</span>
        <span className="font-sans text-slate-300">{activeBoard.label}</span>
      </div>

      {/* Bottom Edge: Clean Mobile Action Strip + Expandable Dock */}
      <div className="absolute bottom-[4.75rem] md:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(940px,94vw)] flex flex-col items-center pointer-events-none">
        {dockCollapsed ? (
          <div className="flex items-center justify-between md:justify-center w-full gap-2 pointer-events-auto">
            {/* Mobile Slide Stepper + Indicator Dots */}
            <div className="flex md:hidden items-center gap-1 bg-[#0b1120]/90 border border-slate-800 rounded-xl p-0.5 shadow-lg">
              <button
                type="button"
                onClick={() => selectModelIndex(activeIndex - 1)}
                className="p-2 text-slate-300 hover:text-white cursor-pointer"
                aria-label="قبلی"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1 px-1">
                {PACKAGING_MODELS.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selectModelIndex(idx)}
                    aria-label={m.nameFa}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === activeIndex ? 'w-4 bg-amber-400' : 'w-1.5 bg-slate-600 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => selectModelIndex(activeIndex + 1)}
                className="p-2 text-slate-300 hover:text-white cursor-pointer"
                aria-label="بعدی"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleInquiryPrefill}
                className="md:hidden px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-lg shadow-amber-500/20 cursor-pointer whitespace-nowrap"
              >
                <span>استعلام</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setDockCollapsed(false)}
                className="px-3 py-2 md:py-1.5 rounded-xl border bg-[#0b1120]/90 border-slate-800 text-[11px] font-bold text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-lg"
              >
                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                <span>تنظیمات</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDockCollapsed(true)}
            className="pointer-events-auto px-3.5 py-1.5 mb-1 rounded-t-xl border border-b-0 bg-[#0b1120]/95 border-slate-800 text-[11px] font-bold text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3 text-amber-400" />
            <span>بستن تنظیمات</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}

        <AnimatePresence initial={false}>
          {!dockCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-auto w-full max-h-[45vh] md:max-h-none overflow-y-auto bg-[#0a0f1e]/95 border border-slate-800 rounded-2xl p-2.5 md:p-3 shadow-2xl flex flex-col gap-2.5 md:gap-3"
            >
              {/* Row 1: Packaging Models Carousel */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {PACKAGING_MODELS.map((m, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectModelIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {m.nameFa}
                    </button>
                  );
                })}
              </div>

              {/* Row 2: Fold Slider + Board Material + Foil + Render Mode */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-800/80">
                <div className="md:col-span-4 flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                    تبدیل دایلاین ← جعبه:
                  </span>
                  <input
                    ref={foldSliderInputRef}
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    defaultValue={foldPercent}
                    onChange={(e) => handleManualFoldScrub(Number(e.target.value))}
                    aria-label="میزان تاشدن دایلاین به جعبه"
                    className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span ref={foldSliderValueRef} className="text-[11px] font-mono font-bold text-amber-400 w-9 text-left tabular-nums">
                    {foldPercent}%
                  </span>
                </div>

                <div className="md:col-span-3 flex items-center gap-2 justify-start md:justify-center">
                  <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">مقوا:</span>
                  <div className="flex items-center gap-1.5">
                    {BOARD_MATERIALS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBoardId(b.id)}
                        title={b.label}
                        aria-label={b.label}
                        className={`w-6 h-6 rounded-lg border transition-transform cursor-pointer ${
                          boardId === b.id
                            ? 'border-amber-400 scale-110 ring-2 ring-amber-400/30'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: b.color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-2 justify-start md:justify-center">
                  <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">فویل:</span>
                  <div className="flex items-center gap-1.5">
                    {FOIL_MATERIALS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFoilId(f.id)}
                        title={f.label}
                        aria-label={f.label}
                        className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                          foilId === f.id
                            ? 'border-white scale-115 ring-2 ring-amber-400/30'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: f.color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="md:col-span-3 flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 justify-end">
                  <button
                    type="button"
                    onClick={() => setViewMode('studio')}
                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
                      viewMode === 'studio'
                        ? 'bg-slate-800 text-amber-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>واقعی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cad')}
                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
                      viewMode === 'cad'
                        ? 'bg-slate-800 text-sky-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>CAD</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('exploded')}
                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
                      viewMode === 'exploded'
                        ? 'bg-slate-800 text-emerald-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Box className="w-3 h-3" />
                    <span>انفجاری</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
