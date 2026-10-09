import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { 
  Layers, ChevronLeft, ChevronRight, Play, Pause, RotateCw, 
  Sparkles, Check, CheckCircle, HelpCircle, Eye, Sliders, Box, Volume2, VolumeX, 
  ArrowLeft, ArrowUpRight, Cpu, Activity, Settings, RefreshCw, Maximize2, Minimize2, Palette, Tag, Compass, Monitor, Info
} from 'lucide-react';

import { AppView } from '../types';

interface ThreeDProductSliderProps {
  onNavigate?: (view: AppView) => void;
}

// Global Types for our Admin Panel State
interface AdminConfig {
  boxType: 'fefco0427' | 'giftBox' | 'slidingSleeve' | 'windowBox' | 'pharmaCarton';
  length: number;
  width: number;
  height: number;
  cardboardColor: string;
  artworkColor: string;
  speed: number;
  cameraPath: 'cinematic' | 'orbit' | 'topDown' | 'isometric';
  glowActive: boolean;
  particlesCount: number;
  ctaServicesText: string;
  ctaPortfolioText: string;
  ctaInquiryText: string;
  slideDurationMult: number;
  autoCycleBoxes: boolean;
  promoTitle1: string;
  promoDesc1: string;
  promoTitle2: string;
  promoDesc2: string;
  promoTitle3: string;
  promoDesc3: string;
  brandTitle: string;
  brandSlogan: string;
  brandDescription: string;
  activeBoxTypes: Array<'fefco0427' | 'windowBox' | 'pharmaCarton' | 'giftBox' | 'slidingSleeve'>;
  cameraHeightOffset: number;
  cameraDistanceOffset: number;
  cameraAngleOffset: number;
}

export const ThreeDProductSlider: React.FC<ThreeDProductSliderProps> = ({ onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const hotspotRef = useRef<HTMLDivElement>(null);

  // Default Cinematic States
  const [phase, setPhase] = useState<number>(1);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [rendererMode, setRendererMode] = useState<'WebGL' | 'Canvas2DFallback'>('WebGL');
  const [fps, setFps] = useState<number>(60);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleWinResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleWinResize);
    return () => window.removeEventListener('resize', handleWinResize);
  }, []);

  // Stage details matching the STORYBOARD SCENE 01-10
  const phaseNames = [
    'SCENE 01: تاریکی صنعتی (Ambiance)',
    'SCENE 02: شبکه فنی مهندسی (Blueprint)',
    'SCENE 03: ترسیم خودکار دی‌لاین (Drawing)',
    'SCENE 04: اندازه‌گذاری دیجیتال (Specs)',
    'SCENE 05: شبیه‌سازی تا کردن (Folding)',
    'SCENE 06: تحلیل اسکلت وایرفریم (Wireframe)',
    'SCENE 07: ساخت متریال مقوا (SBS Cellulose)',
    'SCENE 08: پوشش طلاکوب اشک قلم (Artwork)',
    'SCENE 09: شات استودیویی محصول (Showcase)',
    'SCENE 10: فعال‌سازی درگاه سفارش (CTA)'
  ];

  const phaseDescriptions = [
    'ورود به اتمسفر لوکس اشک قلم. تاریکی عمیق فلزی با ذرات معلق سلولی و هاله نور آبی صنعتی.',
    'بارگذاری خطوط شطرنجی CAD و کادرهای برداری مشابه‌ساز خودکار نرم‌افزارهای صنعتی AutoCAD.',
    'ترسیم تدریجی خطوط قالب تیغ جعبه پیتزا مدل کلاسیک FEFCO 0427 به صورت همزمان.',
    'محاسبه ابعاد طول، عرض و عمق قالب همراه فلش‌های مختصات زوایای خم خم‌کاری و ضخامت ورق.',
    'انیمیشن سینماتیک حرکت مفاصل مکانیکی دی‌لاین از حالت تخت تا قفل‌های نهایی لولایی ساختار جعبه.',
    'تفکیک چندضلعی‌های بدنه و رندر خطوط وایرفریم نئونی چرخان برای عیب‌یابی هندسی قالب در فضا.',
    'تزریق فیبر طبیعی SBS سلولزی، افزایش عمق و ضخامت فیزیکی دیواره‌ها و تشکیل لبه‌های تا شده.',
    'چاپ لوگو طلاکوب ۲۴ عیار برجسته اشک قلم با رفلکس متالیک و بافت لوکس تجاری.',
    'نورپردازی استودیویی چرخشی لوکس، درخشش زوایا، شبیه‌سازی فوکوس عمیق لنز و ریگ نرم شناور.',
    'رونمایی از دکمه‌های تعاملی درگاه‌های استعلام قیمت آنلاین، آرشیو نمونه‌کارها و خدمات مهندسی.'
  ];

  const phaseTasks = [
    ['کالیبراسیون اتمسفر ۳D', 'بارگذاری زوایای نور استودیو', 'پایش لایه‌های گرافیکی'],
    ['لود شبکه‌های برداری CAD', 'تعیین مقیاس کادر مهندسی', 'کالیبره صفحات FEFCO'],
    ['ترسیم اتوماتیک خطوط تیغ', 'برش لیزری دایکات کانسپت', 'ایجاد شیارهای تاشو'],
    ['محاسبه ابعاد سه‌گانه دقیق', 'برآورد تداخل لبه ضخامت ورق', 'نمایش دایمنشن خودکار'],
    ['شبیه‌سازی دینامیک زوایای تاشو', 'محاسبه لولای مفاصل دورانی', 'هندسه خم زوایای متقاطع'],
    ['رندر نگاتیو اسکلت وایرفریم', 'ارزیابی فضای لبه‌های قفل', 'انطباق‌سنجی فواصل خم'],
    ['تزریق بافت سلولزی ۳۵۰گرم', 'مدل‌سازی گرماژ مقوای فشرده', 'بافت لبه تاشده کات'],
    ['کلیشه‌سازی طلاکوب نفیس داغ', 'تعریف بافت برجسته فویل فلزی', 'رفلکس متالیک شبیه‌سازی‌شده'],
    ['تنظیم هوشمند منبع نور استودیو', 'چرخش خودکار ۳۶۰درجه مدل', 'فوکوس عمیق لنز چامبلر'],
    ['نرخ‌گذاری آنلاین بر اساس ابعاد', 'ارتقا به سبد خرید دیجیتال', 'پردازش متریال‌های انتخابی']
  ];

  const hotspotPositions = [
    { top: '65%', left: '50%', label: 'اتمسفر لوکس و نورپردازی عمیق', labelEn: 'AMBIENT ATMOSPHERE' },
    { top: '35%', left: '42%', label: 'طرح شبکه فنی و مهندسی', labelEn: 'BLUEPRINT CAD STRUCTURE' },
    { top: '62%', left: '32%', label: 'ترسیم برداری لیزری دی‌لاین', labelEn: 'LASER CUT SYSTEM' },
    { top: '48%', left: '26%', label: 'اندازه‌گیری و کالیبراسیون دیجیتال', labelEn: 'AUTONOMOUS METRICS' },
    { top: '45%', left: '68%', label: 'مکانیک مفاصل لولایی خم تاشو', labelEn: 'MECHANICAL JOINERY FOLDS' },
    { top: '28%', left: '58%', label: 'آنالیز گراف بدنه و وایرفریم چرخان', labelEn: '3D WIREFRAME MESH' },
    { top: '58%', left: '72%', label: 'بافت فیبر طبیعی سلولزی مقوای SBS', labelEn: 'BOARD SBS CELLULOSE' },
    { top: '38%', left: '50%', label: 'کارهای نفیس طلاکوب برجسته‌ اشک قلم', labelEn: '24K FOIL BRANDING GILT' },
    { top: '32%', left: '80%', label: 'نمای ۳۶۰ درجه نورپردازی استودیو', labelEn: 'FOCAL CAM SWEEP' },
    { top: '48%', left: '50%', label: 'درگاه پیش‌سفارش هوشمند آنلاین', labelEn: 'SECURE TRANSACTION NODE' }
  ];

  // Admin Config Panel presets dynamically backed
  const [config, setConfig] = useState<AdminConfig>(() => {
    const defaultVal: AdminConfig = {
      boxType: 'windowBox',
      length: 3.0,
      width: 3.0,
      height: 0.45,
      cardboardColor: '#d97706', // Premium Kraft/Woody Window Box
      artworkColor: '#cca43b',     // Brand Specular Gold
      speed: 1.0,
      cameraPath: 'cinematic',
      glowActive: true,
      particlesCount: 150,
      ctaServicesText: 'مشاهده خدمات ساختار',
      ctaPortfolioText: 'کاتالوگ و نمونه‌کارها',
      ctaInquiryText: 'محاسبه آنی قیمت جعبه',
      slideDurationMult: 1.0,
      autoCycleBoxes: true,
      promoTitle1: 'طراحی تخصصی دی‌لاین و قالب',
      promoDesc1: 'مهندسی پیشرفته قالب‌های بسته‌بندی با رعایت دقیق استانداردهای FEFCO برای محافظت کامل از محصول شما.',
      promoTitle2: 'طلاکوب و برجسته‌سازی نفیس',
      promoDesc2: 'درخشش بی‌نقص طلاکوب ۲۴ عیار داغ بر روی مقواهای سلولزی با پیشرفته‌ترین ماشین‌آلات شرکت اشک قلم.',
      promoTitle3: 'شبیه‌سازی سه‌بعدی و استودیو',
      promoDesc3: 'اولین موتور رندرینگ آنی جعبه در کشور؛ ابعاد و جزییات طرح خود را قبل از تولید واقعی تماماً لمس و تماشا فرمایید.',
      brandTitle: 'صنایع بسته‌بندی اشک قـلم',
      brandSlogan: 'آفرینش هندسه نفیس و ساخت قالب',
      brandDescription: 'طراحی تخصصی دی‌لاین و دایکات‌های هنری هماهنگ با فرآیندهای پرداخت لوکس، طلاکوب ۲۴ عیار برجسته و بالاترین استانداردهای بسته‌بندی نفیس صادراتی جهان. شبیه‌ساز سه‌بعدی تمام‌دیجیتال و مهندسی توسعه محصول همگام با فناوری مدرن اشک قلم.',
      activeBoxTypes: ['windowBox', 'fefco0427', 'pharmaCarton', 'giftBox', 'slidingSleeve'],
      cameraHeightOffset: 0.0,
      cameraDistanceOffset: 0.0,
      cameraAngleOffset: 0.0
    };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ashk_slider_config');
      if (saved) {
        try {
          return { ...defaultVal, ...JSON.parse(saved) };
        } catch (e) {
          return defaultVal;
        }
      }
    }
    return defaultVal;
  });

  // Keep state synchronized with local storage and other components/tabs
  useEffect(() => {
    localStorage.setItem('ashk_slider_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('ashk_slider_config');
      if (saved) {
        try {
          setConfig(JSON.parse(saved));
        } catch (e) {
          console.warn('Failed to sync slider config', e);
        }
      }
    };
    window.addEventListener('ashk_slider_config_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('ashk_slider_config_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Reference for loop parameters
  const stateRef = useRef({
    phase: 1,
    currentProgress: 0,
    drawProgress: 0,
    gridProgress: 0,
    annotationProgress: 0,
    foldProgress: 0,
    wireProgress: 0,
    materialProgress: 0,
    artworkProgress: 0,
    revealProgress: 0,
    isDestroyed: false,
    cameraAngle: 0,
    fpsHistory: [] as number[],
    lastFrameTime: Date.now(),
    frameCount: 0,
    config: { ...config }
  });

  // Dynamic link config state changes to ref
  useEffect(() => {
    stateRef.current.phase = phase;
    stateRef.current.config = { ...config };
  }, [phase, config]);

  // Handle autonomous timeline cycles with automatic box generation/rotation
  useEffect(() => {
    if (!isAutoPlay) return;

    let timeoutId: any;

    const runThrottledCycle = () => {
      const currentPhase = stateRef.current.phase;
      
      let delay = 2200;
      if (currentPhase === 10) {
        delay = 9500; // Give generous 9.5-second runtime to the Order CTA Activation Scene!
      } else if (currentPhase === 4) {
        delay = 4500; // Give 4.5 seconds for Digital Calibration & Sizing Dimensions scene
      }

      timeoutId = setTimeout(() => {
        setPhase((prev) => {
          if (prev === 10) {
            // Beautifully cycle box type and custom aesthetics on next iteration
            setConfig((currentConfig) => {
              if (!currentConfig.autoCycleBoxes) {
                return currentConfig;
              }
              const presets: Array<{
                boxType: 'fefco0427' | 'giftBox' | 'slidingSleeve' | 'windowBox' | 'pharmaCarton';
                length: number;
                width: number;
                height: number;
                cardboardColor: string;
                artworkColor: string;
              }> = [
                {
                  boxType: 'windowBox',
                  length: 3.0,
                  width: 3.0,
                  height: 0.45,
                  cardboardColor: '#d97706',
                  artworkColor: '#cca43b'
                },
                {
                  boxType: 'fefco0427',
                  length: 3.0,
                  width: 3.0,
                  height: 0.45,
                  cardboardColor: '#fbfbfd',
                  artworkColor: '#cca43b'
                },
                {
                  boxType: 'pharmaCarton',
                  length: 1.6,
                  width: 1.4,
                  height: 1.0,
                  cardboardColor: '#ffffff',
                  artworkColor: '#cca43b'
                },
                {
                  boxType: 'giftBox',
                  length: 3.0,
                  width: 2.2,
                  height: 0.9,
                  cardboardColor: '#475569',
                  artworkColor: '#cca43b'
                },
                {
                  boxType: 'slidingSleeve',
                  length: 3.0,
                  width: 2.0,
                  height: 0.35,
                  cardboardColor: '#0f172a',
                  artworkColor: '#cca43b'
                }
              ];
              const activePresets = presets.filter(p => (currentConfig.activeBoxTypes || []).includes(p.boxType));
              const finalPresets = activePresets.length > 0 ? activePresets : presets;
              const currentIdx = finalPresets.findIndex(p => p.boxType === currentConfig.boxType);
              const nextIdx = (currentIdx === -1) ? 0 : (currentIdx + 1) % finalPresets.length;
              const nextPreset = finalPresets[nextIdx];
              return {
                ...currentConfig,
                ...nextPreset
              };
            });
            return 1; // Cycle back to Phase 1
          }
          return prev + 1;
        });
      }, (delay * config.slideDurationMult) / config.speed);
    };

    runThrottledCycle();

    return () => clearTimeout(timeoutId);
  }, [isAutoPlay, config.speed, phase]);

  // Main Graphics Rendering Thread (WebGL + Canvas2D Fallback integrated)
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    stateRef.current.isDestroyed = false;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    // Check WebGL availability
    let glSupported = false;
    try {
      const dummyCanvas = document.createElement('canvas');
      glSupported = !!(window.WebGLRenderingContext && (dummyCanvas.getContext('webgl') || dummyCanvas.getContext('experimental-webgl')));
    } catch (e) {
      glSupported = false;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    
    // Materials referenced globally in frame loops
    let sbsMaterial: THREE.MeshStandardMaterial | null = null;
    let goldArtworkMaterial: THREE.MeshStandardMaterial | null = null;
    let wireframeMaterial: THREE.MeshBasicMaterial | null = null;
    let lineMaterialBlue: THREE.LineBasicMaterial | null = null;
    let lineMaterialCreaseDashed: THREE.LineDashedMaterial | null = null;
    let particleSystem: THREE.Points | null = null;
    let gridHelper: THREE.GridHelper | null = null;
    let minorGridHelper: THREE.GridHelper | null = null;
    let buildBoxGeometry: ((bType: 'fefco0427' | 'giftBox' | 'slidingSleeve' | 'windowBox' | 'pharmaCarton', boxLength: number, boxWidth: number, boxHeight: number) => void) | null = null;
    
    // Pivot tree node mesh structures
    interface ThreeHingeNode {
      id: string;
      parent: string | null;
      pivot: [number, number, number];
      size: [number, number, number];
      offset: [number, number, number];
      foldAxis: 'x' | 'y' | 'z';
      foldDirection: number;
      maxFoldAngle: number;
      group?: THREE.Group;
      mesh?: THREE.Mesh;
      artworkMesh?: THREE.Mesh;
      glassMesh?: THREE.Mesh;
      outline?: THREE.LineSegments;
    }

    let panelThreeNodes: ThreeHingeNode[] = [];
    let boxRoot: THREE.Group | null = null;
    let nodeMapsInstance: Record<string, ThreeHingeNode> = {};

    // --- INITIALIZE WEBGL GRAPHICS PATH ---
    const initWebGL = (): boolean => {
      try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color('#03050a');
        scene.fog = new THREE.FogExp2('#03050a', 0.1);

        const initialAspect = container.clientWidth / (container.clientHeight || 580);
        camera = new THREE.PerspectiveCamera(42, initialAspect, 0.1, 150);
        camera.position.set(0, 6, 0.1);

        try {
          renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false
          });
        } catch (_) {
          renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            alpha: false,
            powerPreference: "default",
            failIfMajorPerformanceCaveat: false
          });
        }

        renderer.setClearColor('#03050a', 1);

        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          console.warn("WebGL context lost in ThreeDProductSlider");
        }, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight || 580);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        // Double Adaptive Subdivided Blueprint Grid system (Major and ultra-fine Minor lines)
        gridHelper = new THREE.GridHelper(30, 60, '#00f0ff', '#444444');
        gridHelper.position.y = -0.56;
        scene.add(gridHelper);

        minorGridHelper = new THREE.GridHelper(30, 240, '#00f0ff', '#222222');
        minorGridHelper.position.y = -0.562;
        scene.add(minorGridHelper);
        
        // Premium Ambient Particles Background
        const pCount = config.particlesCount;
        const pGeom = new THREE.BufferGeometry();
        const positions = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount * 3; i += 3) {
          positions[i] = (Math.random() - 0.5) * 12;
          positions[i+1] = Math.random() * 5 - 1.5;
          positions[i+2] = (Math.random() - 0.5) * 12;
        }
        pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const pMat = new THREE.PointsMaterial({
          color: '#38bdf8',
          size: 0.04,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending
        });
        particleSystem = new THREE.Points(pGeom, pMat);
        scene.add(particleSystem);

        // Balanced Studio Lighting Setup (Prevents overexposed white blowout)
        const ambientLight = new THREE.AmbientLight('#ffffff', 0.9);
        scene.add(ambientLight);

        const frontLight = new THREE.DirectionalLight('#ffffff', 1.8);
        frontLight.position.set(4, 8, 5);
        frontLight.castShadow = true;
        frontLight.shadow.mapSize.width = 2048;
        frontLight.shadow.mapSize.height = 2048;
        frontLight.shadow.bias = -0.0005;
        scene.add(frontLight);

        const keySpotLight = new THREE.SpotLight('#ffffff', 3.5);
        keySpotLight.position.set(6, 12, 6);
        keySpotLight.angle = Math.PI / 4.5;
        keySpotLight.penumbra = 0.8;
        keySpotLight.castShadow = true;
        keySpotLight.shadow.mapSize.width = 1024;
        keySpotLight.shadow.mapSize.height = 1024;
        scene.add(keySpotLight);

        const industrialFill = new THREE.PointLight('#0ea5e9', 1.8, 15);
        industrialFill.position.set(-6, 4, -6);
        scene.add(industrialFill);

        const warmBackRim = new THREE.PointLight('#f59e0b', 2.0, 12);
        warmBackRim.position.set(6, 3, -6);
        scene.add(warmBackRim);

        // Procedural Kraft / Cardboard organic fibrous texture
        const sbsCanvas = document.createElement('canvas');
        sbsCanvas.width = 512;
        sbsCanvas.height = 512;
        const sbsCtx = sbsCanvas.getContext('2d');
        if (sbsCtx) {
          // Fill pure white base to multiply with configured solid colors perfectly
          sbsCtx.fillStyle = '#ffffff';
          sbsCtx.fillRect(0, 0, 512, 512);

          // 1. Add subtle cardboard dust/specks of warm cellulose
          for (let i = 0; i < 28000; i++) {
            const val = Math.floor(Math.random() * 32);
            sbsCtx.fillStyle = `rgba(${val + 10}, ${val + 5}, ${val}, 0.08)`;
            sbsCtx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
          }

          // 2. Add realistic long cellulose wood pulp Kraft fibers (fine irregular strokes)
          sbsCtx.strokeStyle = 'rgba(20, 15, 10, 0.08)';
          sbsCtx.lineWidth = 1.25;
          for (let i = 0; i < 380; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const len = 4 + Math.random() * 16;
            const angle = Math.random() * Math.PI * 2;
            sbsCtx.beginPath();
            sbsCtx.moveTo(x, y);
            sbsCtx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            sbsCtx.stroke();
          }

          // 3. Add medium recycled paper organic flecks (irregular fiber clusters)
          sbsCtx.fillStyle = 'rgba(30, 20, 12, 0.14)';
          for (let i = 0; i < 1800; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const r = 0.4 + Math.random() * 1.5;
            sbsCtx.beginPath();
            sbsCtx.arc(x, y, r, 0, Math.PI * 2);
            sbsCtx.fill();
          }

          // 4. Add subtle horizontal texture banding from manufacturing rolls
          sbsCtx.fillStyle = 'rgba(0, 0, 0, 0.015)';
          for (let i = 0; i < 512; i += 4) {
            if (Math.random() > 0.35) {
              sbsCtx.fillRect(0, i, 512, 1.8);
            }
          }
        }
        const sbsTex = new THREE.CanvasTexture(sbsCanvas);
        sbsTex.wrapS = THREE.RepeatWrapping;
        sbsTex.wrapT = THREE.RepeatWrapping;
        sbsTex.repeat.set(2, 2);
        sbsTex.anisotropy = (renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function')
          ? renderer.capabilities.getMaxAnisotropy()
          : 1;

        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 512;
        logoCanvas.height = 512;
        const logoCtx = logoCanvas.getContext('2d');
        if (logoCtx) {
          logoCtx.clearRect(0, 0, 512, 512);

          // Beautiful ambient premium gold-style accent circle frame
          logoCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          logoCtx.lineWidth = 5;
          logoCtx.beginPath();
          logoCtx.arc(256, 256, 230, 0, Math.PI * 2);
          logoCtx.stroke();

          // Outer solid brand gold corner border frames
          logoCtx.strokeStyle = '#ffffff';
          logoCtx.lineWidth = 8;
          logoCtx.strokeRect(30, 30, 452, 452);
          logoCtx.lineWidth = 2.5;
          logoCtx.strokeRect(40, 40, 432, 432);

          // DRAW ELEGANT CALLIGRAPHY TEARDROP SYMBOL ("Ashk-Ghalam")
          logoCtx.fillStyle = '#ffffff';
          logoCtx.strokeStyle = '#ffffff';
          
          // Draw teardrop pen tip
          logoCtx.beginPath();
          logoCtx.moveTo(256, 75);
          logoCtx.bezierCurveTo(185, 155, 185, 215, 256, 235);
          logoCtx.bezierCurveTo(327, 215, 327, 155, 256, 75);
          logoCtx.fill();

          // Use 'destination-out' to punch physical holes in the stamp for maximum realism!
          logoCtx.globalCompositeOperation = 'destination-out';
          
          // Split nib line representing "Ghalam"
          logoCtx.strokeStyle = '#000000';
          logoCtx.lineWidth = 5.5;
          logoCtx.beginPath();
          logoCtx.moveTo(256, 115);
          logoCtx.lineTo(256, 205);
          logoCtx.stroke();

          // Pen tip breathing circular hole representing "Ashk" ink
          logoCtx.beginPath();
          logoCtx.arc(256, 155, 7.5, 0, Math.PI * 2);
          logoCtx.fill();
          
          // Revert composite mode to write the texts
          logoCtx.globalCompositeOperation = 'source-over';

          // Ashk Ghalam Calligraphy Persian / Arabic Brand label
          logoCtx.textAlign = 'center';
          logoCtx.fillStyle = '#ffffff';
          logoCtx.font = 'bold 44px Tahoma, Arial, sans-serif';
          logoCtx.fillText('اشک قـلـم', 256, 295);
          
          logoCtx.font = 'bold 15px monospace';
          logoCtx.fillStyle = '#ffffff';
          logoCtx.fillText('CRAFTED PACKAGING PLATFORM', 256, 338);
          logoCtx.fillText(`MODEL: ${config.boxType.toUpperCase()}`, 256, 368);
          
          logoCtx.fillStyle = '#ffffff';
          logoCtx.fillText('DIGITAL MANUFACTURING STANDARD', 256, 408);
        }
        const logoTex = new THREE.CanvasTexture(logoCanvas);
        logoTex.anisotropy = (renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function')
          ? renderer.capabilities.getMaxAnisotropy()
          : 1;

        // Core Materials Compilation
        lineMaterialBlue = new THREE.LineBasicMaterial({
          color: '#00f0ff',
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          fog: false
        });

        lineMaterialCreaseDashed = new THREE.LineDashedMaterial({
          color: '#10b981',
          scale: 1,
          dashSize: 0.1,
          gapSize: 0.08,
          transparent: true,
          opacity: 0.6,
          fog: false
        });

        sbsMaterial = new THREE.MeshStandardMaterial({
          map: sbsTex,
          bumpMap: sbsTex,
          bumpScale: 0.007,
          roughness: 0.88,
          metalness: 0.02,
          transparent: true,
          opacity: 0
        });

        goldArtworkMaterial = new THREE.MeshStandardMaterial({
          map: logoTex,
          bumpMap: logoTex,
          bumpScale: 0.024, // Microscopic embossed-debossed paper-press depth!
          roughness: 0.035, // Smooth metallic sheen
          metalness: 0.99,  // Solid mirror 24k foil reflection
          transparent: true,
          opacity: 0,
          emissive: new THREE.Color('#3d2a12'), // Radiant bronze-gold emissive backlight base
          emissiveIntensity: 0.38,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1.0,
          polygonOffsetUnits: -4.0
        });

        wireframeMaterial = new THREE.MeshBasicMaterial({
          color: '#0ea5e9',
          wireframe: true,
          transparent: true,
          opacity: 0
        });

        // Instantiate FEFCO 0427 Box Nodes
        boxRoot = new THREE.Group();
        boxRoot.position.set(0, -0.05, 0);
        scene.add(boxRoot);

        buildBoxGeometry = (
          bType: 'fefco0427' | 'giftBox' | 'slidingSleeve' | 'windowBox' | 'pharmaCarton',
          boxLength: number,
          boxWidth: number,
          boxHeight: number
        ) => {
          if (boxRoot) {
            while (boxRoot.children.length > 0) {
              boxRoot.remove(boxRoot.children[0]);
            }
          }

          let nodesDef: ThreeHingeNode[] = [];

          if (bType === 'giftBox') {
            // Deep Luxury Gift Box
            nodesDef = [
              {
                id: 'bottom',
                parent: null,
                pivot: [0, 0, 0],
                size: [boxLength, 0.015, boxWidth],
                offset: [0, 0.0075, 0],
                foldAxis: 'x',
                foldDirection: 0,
                maxFoldAngle: 0
              },
              {
                id: 'left_wall',
                parent: 'bottom',
                pivot: [-boxLength / 2, 0, 0],
                size: [boxHeight, 0.015, boxWidth],
                offset: [-boxHeight / 2, 0.0075, 0],
                foldAxis: 'z',
                foldDirection: -1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'right_wall',
                parent: 'bottom',
                pivot: [boxLength / 2, 0, 0],
                size: [boxHeight, 0.015, boxWidth],
                offset: [boxHeight / 2, 0.0075, 0],
                foldAxis: 'z',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'front_wall',
                parent: 'bottom',
                pivot: [0, 0, boxWidth / 2],
                size: [boxLength, 0.015, boxHeight],
                offset: [0, 0.0075, boxHeight / 2],
                foldAxis: 'x',
                foldDirection: -1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'back_wall',
                parent: 'bottom',
                pivot: [0, 0, -boxWidth / 2],
                size: [boxLength, 0.015, boxHeight],
                offset: [0, 0.0075, -boxHeight / 2],
                foldAxis: 'x',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'lid',
                parent: 'back_wall',
                pivot: [0, 0, -boxHeight],
                size: [boxLength, 0.015, boxWidth],
                offset: [0, 0.0075, -boxWidth / 2],
                foldAxis: 'x',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'lid_front_flap',
                parent: 'lid',
                pivot: [0, 0, -boxWidth],
                size: [boxLength - 0.04, 0.014, 0.25],
                offset: [0, -0.007, -0.125],
                foldAxis: 'x',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              }
            ];
          } else if (bType === 'slidingSleeve') {
            // Sliding Sleeve Tube
            nodesDef = [
              {
                id: 'bottom',
                parent: null,
                pivot: [0, 0, 0],
                size: [boxLength, 0.015, boxWidth],
                offset: [0, 0.0075, 0],
                foldAxis: 'x',
                foldDirection: 0,
                maxFoldAngle: 0
              },
              {
                id: 'front_wall',
                parent: 'bottom',
                pivot: [0, 0, boxWidth / 2],
                size: [boxLength, 0.015, boxHeight],
                offset: [0, 0.0075, boxHeight / 2],
                foldAxis: 'x',
                foldDirection: -1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'back_wall',
                parent: 'bottom',
                pivot: [0, 0, -boxWidth / 2],
                size: [boxLength, 0.015, boxHeight],
                offset: [0, 0.0075, -boxHeight / 2],
                foldAxis: 'x',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'lid',
                parent: 'back_wall',
                pivot: [0, 0, -boxHeight],
                size: [boxLength, 0.015, boxWidth],
                offset: [0, 0.0075, -boxWidth / 2],
                foldAxis: 'x',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              }
            ];
          } else if (bType === 'pharmaCarton') {
            // Pharmaceutical Medicine Reverse-Tuck Carton Box
            nodesDef = [
              {
                id: 'bottom',
                parent: null,
                pivot: [0, 0, 0],
                size: [boxLength, 0.015, boxWidth],
                offset: [0, 0.0075, 0],
                foldAxis: 'x',
                foldDirection: 0,
                maxFoldAngle: 0
              },
              {
                id: 'back_wall',
                parent: 'bottom',
                pivot: [0, 0, -boxWidth / 2],
                size: [boxLength, 0.015, boxHeight],
                offset: [0, 0.0075, -boxHeight / 2],
                foldAxis: 'x',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'front_wall',
                parent: 'bottom',
                pivot: [0, 0, boxWidth / 2],
                size: [boxLength, 0.015, boxHeight],
                offset: [0, 0.0075, boxHeight / 2],
                foldAxis: 'x',
                foldDirection: -1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'left_wall',
                parent: 'bottom',
                pivot: [-boxLength / 2, 0, 0],
                size: [boxHeight, 0.015, boxWidth],
                offset: [-boxHeight / 2, 0.0075, 0],
                foldAxis: 'z',
                foldDirection: -1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'right_wall',
                parent: 'bottom',
                pivot: [boxLength / 2, 0, 0],
                size: [boxHeight, 0.015, boxWidth],
                offset: [boxHeight / 2, 0.0075, 0],
                foldAxis: 'z',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'lid',
                parent: 'back_wall',
                pivot: [0, 0, -boxHeight],
                size: [boxLength, 0.015, boxWidth],
                offset: [0, 0.0075, -boxWidth / 2],
                foldAxis: 'x',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'lid_front_flap',
                parent: 'lid',
                pivot: [0, 0, -boxWidth],
                size: [boxLength - 0.03, 0.014, 0.35],
                offset: [0, -0.007, -0.175],
                foldAxis: 'x',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              }
            ];
          } else {
            // Default FEFCO 0427 Pizza Box folds hierarchy
            nodesDef = [
              {
                id: 'bottom',
                parent: null,
                pivot: [0, 0, 0],
                size: [boxLength, 0.015, boxWidth],
                offset: [0, 0.0075, 0],
                foldAxis: 'x',
                foldDirection: 0,
                maxFoldAngle: 0
              },
              {
                id: 'left_wall',
                parent: 'bottom',
                pivot: [-boxLength / 2, 0, 0],
                size: [boxHeight, 0.015, boxWidth],
                offset: [-boxHeight / 2, 0.0075, 0],
                foldAxis: 'z',
                foldDirection: -1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'left_wall_inner',
                parent: 'left_wall',
                pivot: [-boxHeight, 0, 0],
                size: [boxHeight - 0.02, 0.014, boxWidth - 0.04],
                offset: [-(boxHeight - 0.02) / 2, -0.007, 0],
                foldAxis: 'z',
                foldDirection: -1,
                maxFoldAngle: Math.PI * 0.98
              },
              {
                id: 'right_wall',
                parent: 'bottom',
                pivot: [boxLength / 2, 0, 0],
                size: [boxHeight, 0.015, boxWidth],
                offset: [boxHeight / 2, 0.0075, 0],
                foldAxis: 'z',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'right_wall_inner',
                parent: 'right_wall',
                pivot: [boxHeight, 0, 0],
                size: [boxHeight - 0.02, 0.014, boxWidth - 0.04],
                offset: [(boxHeight - 0.02) / 2, -0.007, 0],
                foldAxis: 'z',
                foldDirection: 1,
                maxFoldAngle: Math.PI * 0.98
              },
              {
                id: 'front_wall',
                parent: 'bottom',
                pivot: [0, 0, boxWidth / 2],
                size: [boxLength, 0.015, boxHeight],
                offset: [0, 0.0075, boxHeight / 2],
                foldAxis: 'x',
                foldDirection: -1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'front_wall_inner',
                parent: 'front_wall',
                pivot: [0, 0, boxHeight],
                size: [boxLength - 0.04, 0.014, boxHeight - 0.02],
                offset: [0, -0.007, (boxHeight - 0.02) / 2],
                foldAxis: 'x',
                foldDirection: -1,
                maxFoldAngle: Math.PI * 0.98
              },
              {
                id: 'back_wall',
                parent: 'bottom',
                pivot: [0, 0, -boxWidth / 2],
                size: [boxLength, 0.015, boxHeight],
                offset: [0, 0.0075, -boxHeight / 2],
                foldAxis: 'x',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'lid',
                parent: 'back_wall',
                pivot: [0, 0, -boxHeight],
                size: [boxLength, 0.015, boxWidth],
                offset: [0, 0.0075, -boxWidth / 2],
                foldAxis: 'x',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'lid_front_flap',
                parent: 'lid',
                pivot: [0, 0, -boxWidth],
                size: [boxLength - 0.04, 0.014, boxHeight - 0.05],
                offset: [0, -0.007, -(boxHeight - 0.05) / 2],
                foldAxis: 'x',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'lid_left_flap',
                parent: 'lid',
                pivot: [-boxLength / 2, 0, -boxWidth / 2],
                size: [boxHeight - 0.05, 0.014, boxWidth - 0.04],
                offset: [-(boxHeight - 0.05) / 2, -0.007, 0],
                foldAxis: 'z',
                foldDirection: -1,
                maxFoldAngle: Math.PI / 2
              },
              {
                id: 'lid_right_flap',
                parent: 'lid',
                pivot: [boxLength / 2, 0, -boxWidth / 2],
                size: [boxHeight - 0.05, 0.014, boxWidth - 0.04],
                offset: [(boxHeight - 0.05) / 2, -0.007, 0],
                foldAxis: 'z',
                foldDirection: 1,
                maxFoldAngle: Math.PI / 2
              }
            ];
          }

          panelThreeNodes = nodesDef;

          nodeMapsInstance = {};

          panelThreeNodes.forEach(node => {
            const groupNode = new THREE.Group();
            groupNode.position.set(...node.pivot);

            const geometryBox = new THREE.BoxGeometry(...node.size);
            geometryBox.translate(...node.offset);

            const meshSolid = new THREE.Mesh(geometryBox, sbsMaterial!);
            meshSolid.castShadow = true;
            meshSolid.receiveShadow = true;

            const isLidNode = node.id === 'lid';
            const isWindowBox = bType === 'windowBox';

            if (isLidNode && isWindowBox) {
              // Realistic Window Box Cutout Cardboard representation of the lid
              const lidLength = node.size[0];
              const lidWidth = node.size[2];
              const lidZOffset = node.offset[2];
              const winW = lidLength * 0.58;
              const winH = lidWidth * 0.58;
              const borderHeight = 0.015;

              const leftBorderW = (lidLength - winW) / 2;
              const rightBorderW = (lidLength - winW) / 2;
              const topBorderH = (lidWidth - winH) / 2;
              const bottomBorderH = (lidWidth - winH) / 2;

              // Left Border cardboard mesh
              const leftGeom = new THREE.BoxGeometry(leftBorderW, borderHeight, lidWidth);
              leftGeom.translate(-lidLength/2 + leftBorderW/2, 0.0075, lidZOffset);
              const leftMesh = new THREE.Mesh(leftGeom, sbsMaterial!);
              leftMesh.castShadow = true;
              leftMesh.receiveShadow = true;
              groupNode.add(leftMesh);

              // Right Border cardboard mesh
              const rightGeom = new THREE.BoxGeometry(rightBorderW, borderHeight, lidWidth);
              rightGeom.translate(lidLength/2 - rightBorderW/2, 0.0075, lidZOffset);
              const rightMesh = new THREE.Mesh(rightGeom, sbsMaterial!);
              rightMesh.castShadow = true;
              rightMesh.receiveShadow = true;
              groupNode.add(rightMesh);

              // Top Border cardboard mesh (front-back orientation)
              const topGeom = new THREE.BoxGeometry(winW, borderHeight, topBorderH);
              topGeom.translate(0, 0.0075, lidZOffset - lidWidth/2 + topBorderH/2);
              const topMesh = new THREE.Mesh(topGeom, sbsMaterial!);
              topMesh.castShadow = true;
              topMesh.receiveShadow = true;
              groupNode.add(topMesh);

              // Bottom Border cardboard mesh
              const bottomGeom = new THREE.BoxGeometry(winW, borderHeight, bottomBorderH);
              bottomGeom.translate(0, 0.0075, lidZOffset + lidWidth/2 - bottomBorderH/2);
              const bottomMesh = new THREE.Mesh(bottomGeom, sbsMaterial!);
              bottomMesh.castShadow = true;
              bottomMesh.receiveShadow = true;
              groupNode.add(bottomMesh);

              // Maintain the invisible full meshSolid inside the parent group for mathematically perfect 2D coordinates projection
              meshSolid.visible = false;
              groupNode.add(meshSolid);
            } else {
              groupNode.add(meshSolid);
            }

            // Apply Gold Overlay or Glass window on lid top face
            if (isLidNode) {
              const lidLength = node.size[0];
              const lidWidth = node.size[2];
              const lidZOffset = node.offset[2];
              
              if (isWindowBox) {
                // 1. Solid glass acrylic pane in middle of the lid (perfect fit inside the cutout)
                const winW = lidLength * 0.58;
                const winH = lidWidth * 0.58;
                const glassGeom = new THREE.BoxGeometry(winW + 0.015, 0.016, winH + 0.015);
                glassGeom.translate(0, 0.0075, lidZOffset);
                
                const glassMaterial = new THREE.MeshPhysicalMaterial({
                  color: '#38bdf8',
                  roughness: 0.03,
                  metalness: 0.1,
                  transmission: 0.96, // Realistic glass transmission
                  thickness: 0.15,
                  transparent: true,
                  opacity: 0.75,
                  clearcoat: 1.0,
                  clearcoatRoughness: 0.02,
                  depthWrite: true
                });
                const glassMesh = new THREE.Mesh(glassGeom, glassMaterial);
                groupNode.add(glassMesh);
                node.glassMesh = glassMesh;

                // 2. Gold border accent lining around the glass cutout (flush on top face Y=0.015)
                const borderGeom = new THREE.BoxGeometry(winW + 0.02, 0.011, winH + 0.02);
                borderGeom.translate(0, 0.018, lidZOffset);
                const borderMesh = new THREE.Mesh(borderGeom, goldArtworkMaterial!);
                borderMesh.renderOrder = 9;
                groupNode.add(borderMesh);

                // 3. Dual-sided gold calligraphy logo scripts (Inside face & Outside folded face)
                // INSIDE ARTWORK: facing UP, visible when flat dieline sheet is viewed from above
                const artGeomIn = new THREE.PlaneGeometry(lidLength * 0.75, lidWidth * 0.16);
                artGeomIn.rotateX(-Math.PI / 2);
                artGeomIn.translate(0, 0.018, lidZOffset + lidWidth * 0.35); // flush on inside/top surface
                const artworkMeshIn = new THREE.Mesh(artGeomIn, goldArtworkMaterial!);
                artworkMeshIn.renderOrder = 10;
                groupNode.add(artworkMeshIn);

                // OUTSIDE ARTWORK: facing DOWN, visible on top of the beautifully closed box
                const artGeomOut = new THREE.PlaneGeometry(lidLength * 0.75, lidWidth * 0.16);
                artGeomOut.rotateX(Math.PI / 2); // invert to read correctly on outside face when folded 180 degrees
                artGeomOut.translate(0, -0.003, lidZOffset + lidWidth * 0.35); // flush on outside surface
                const artworkMeshOut = new THREE.Mesh(artGeomOut, goldArtworkMaterial!);
                artworkMeshOut.renderOrder = 10;
                groupNode.add(artworkMeshOut);
                node.artworkMesh = artworkMeshOut;
              } else {
                // Standard solid lid with full gold calligraphy label print coverage on both sides
                // INSIDE ARTWORK: facing UP, visible when flat dieline sheet is viewed from above
                const artGeomIn = new THREE.PlaneGeometry(lidLength * 0.75, lidWidth * 0.75);
                artGeomIn.rotateX(-Math.PI / 2);
                artGeomIn.translate(0, 0.018, lidZOffset); // flush on inside/top surface
                const artworkMeshIn = new THREE.Mesh(artGeomIn, goldArtworkMaterial!);
                artworkMeshIn.renderOrder = 10;
                groupNode.add(artworkMeshIn);

                // OUTSIDE ARTWORK: facing DOWN, visible on top of the folded/closed box
                const artGeomOut = new THREE.PlaneGeometry(lidLength * 0.75, lidWidth * 0.75);
                artGeomOut.rotateX(Math.PI / 2); // invert to read correctly on outside face when folded 180 degrees
                artGeomOut.translate(0, -0.003, lidZOffset); // flush on outside surface
                const artworkMeshOut = new THREE.Mesh(artGeomOut, goldArtworkMaterial!);
                artworkMeshOut.renderOrder = 10;
                groupNode.add(artworkMeshOut);
                node.artworkMesh = artworkMeshOut;
              }
            }

            const meshWire = new THREE.Mesh(geometryBox, wireframeMaterial!);
            groupNode.add(meshWire);

            const edgesGeometry = new THREE.EdgesGeometry(geometryBox);
            const edgeLinesObj = new THREE.LineSegments(edgesGeometry, lineMaterialBlue!);
            groupNode.add(edgeLinesObj);
            node.outline = edgeLinesObj;

            node.group = groupNode;
            node.mesh = meshSolid;
            nodeMapsInstance[node.id] = node;

            if (node.parent && nodeMapsInstance[node.parent]) {
              nodeMapsInstance[node.parent].group?.add(groupNode);
            } else {
              boxRoot!.add(groupNode);
            }
          });

          // Dashed hinge crease overlays
          panelThreeNodes.forEach(node => {
            if (node.parent) {
              const creaseGeom = new THREE.BufferGeometry();
              let ptsList: number[] = [];
              if (node.foldAxis === 'z') {
                ptsList = [0, 0.011, -1.5, 0, 0.011, 1.5];
              } else {
                ptsList = [-1.5, 0.011, 0, 1.5, 0.011, 0];
              }
              creaseGeom.setAttribute('position', new THREE.Float32BufferAttribute(ptsList, 3));
              const creaseLineObj = new THREE.Line(creaseGeom, lineMaterialCreaseDashed!);
              creaseLineObj.computeLineDistances();
              node.group?.add(creaseLineObj);
            }
          });
        };

        buildBoxGeometry(config.boxType, config.length, config.width, config.height);

        setRendererMode('WebGL');
        return true;
      } catch (err) {
        console.warn('WebGL setup failed. Switching gracefully to high-performance Canvas2D fallback.', err);
        setRendererMode('Canvas2DFallback');
        return false;
      }
    };

    // Attempt to boot WebGL, otherwise fallback automatically
    const isWebGLReady = glSupported && initWebGL();

    // --- MOUSE/TOUCH DRAG POINTER REGISTER ---
    const dragRef = {
      isDragging: false,
      startX: 0,
      startY: 0,
      angleOffset: 0,
      tiltOffset: 0
    };

    const handlePointerDown = (e: PointerEvent) => {
      dragRef.isDragging = true;
      dragRef.startX = e.clientX;
      dragRef.startY = e.clientY;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch(_) {}
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.isDragging) return;
      const dx = e.clientX - dragRef.startX;
      const dy = e.clientY - dragRef.startY;
      dragRef.startX = e.clientX;
      dragRef.startY = e.clientY;

      dragRef.angleOffset += dx * 0.007;
      dragRef.tiltOffset = Math.max(-1.0, Math.min(1.2, dragRef.tiltOffset + dy * 0.007));
    };

    const handlePointerUp = (e: PointerEvent) => {
      dragRef.isDragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch(_) {}
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    // --- WINDOW SIZE COMPENSATOR ---
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight || 580;
      if (w > 0 && h > 0) {
        if (renderer && camera) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        } else {
          canvas.width = w * Math.min(window.devicePixelRatio, 2);
          canvas.height = h * Math.min(window.devicePixelRatio, 2);
        }
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = w * Math.min(window.devicePixelRatio, 2);
          overlayCanvasRef.current.height = h * Math.min(window.devicePixelRatio, 2);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Generate automatic timer intervals for initial resizing triggers
    setTimeout(handleResize, 100);
    setTimeout(handleResize, 400);

    // --- RECURSIVE FOLD ANGLE RESOLVERS ---
    const getFoldAngles = (f: number, revealProg: number = 0) => {
      // 4-stage sequential hinges folding: Side walls -> Back Wall -> Lid closes -> Dust tucks
      const foldSides = Math.max(0, Math.min(1, f / 0.35));
      const foldBack = Math.max(0, Math.min(1, (f - 0.35) / 0.3));
      let foldLid = Math.max(0, Math.min(1, (f - 0.65) / 0.25));
      let foldTucks = Math.max(0, Math.min(1, (f - 0.9) / 0.1));

      // At showcase & CTA reveal phases, open the lid halfway (e.g. 50% open)
      // and lift the tucked flaps naturally for a gorgeously detailed view
      foldLid = foldLid * (1.0 - (revealProg * 0.5)); 
      foldTucks = foldTucks * (1.0 - (revealProg * 0.85));

      return {
        leftWall: foldSides * (Math.PI / 2),
        leftInner: foldSides * Math.PI,
        rightWall: foldSides * (Math.PI / 2),
        rightInner: foldSides * Math.PI,
        frontWall: foldSides * (Math.PI / 2),
        frontInner: foldSides * Math.PI,
        backWall: foldBack * (Math.PI / 2),
        lid: foldLid * (Math.PI / 2),
        lidFrontFlap: foldTucks * (Math.PI / 2),
        lidLeftFlap: foldTucks * (Math.PI / 2.05),
        lidRightFlap: foldTucks * (Math.PI / 2.05)
      };
    };

    // --- ANIMATION INTERACTION FRAME LOOP (Runs 60fps) ---
    const current = {
      sceneProgress: 0,
      draw: 0,
      grid: 0,
      annotation: 0,
      fold: 0,
      wire: 0,
      material: 0,
      artwork: 0,
      reveal: 0
    };

    const lastBuiltConfig = {
      boxType: config.boxType as 'fefco0427' | 'giftBox' | 'slidingSleeve' | 'windowBox' | 'pharmaCarton',
      length: config.length,
      width: config.width,
      height: config.height
    };

    let animFrameId: number;
    const renderLoop = () => {
      if (stateRef.current.isDestroyed) return;
      animFrameId = requestAnimationFrame(renderLoop);

      // Clear transparent measurement overlay canvas
      if (overlayCanvasRef.current) {
        const oCtx = overlayCanvasRef.current.getContext('2d');
        if (oCtx) oCtx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }

      // --- CALCULATE FPS AND DIAGNOSTICS ---
      const now = Date.now();
      const delta = now - stateRef.current.lastFrameTime;
      stateRef.current.frameCount++;
      if (delta >= 1000) {
        const calculatedFps = Math.round((stateRef.current.frameCount * 1000) / delta);
        setFps(calculatedFps);
        stateRef.current.frameCount = 0;
        stateRef.current.lastFrameTime = now;
      }

      // Sync and smoothly interpolate targets based on active storyboard phase (Stage 1 to 10)
      const currentPhase = stateRef.current.phase;
      const adminConf = stateRef.current.config;

      // Rebuild the 3D geometries dynamically if any dimensions or boxType have changed, without losing context!
      if (
        buildBoxGeometry &&
        (lastBuiltConfig.boxType !== adminConf.boxType ||
         lastBuiltConfig.length !== adminConf.length ||
         lastBuiltConfig.width !== adminConf.width ||
         lastBuiltConfig.height !== adminConf.height)
      ) {
        try {
          buildBoxGeometry(adminConf.boxType, adminConf.length, adminConf.width, adminConf.height);
        } catch (e) {
          console.error("Dynamic box rebuild failed", e);
        }
        lastBuiltConfig.boxType = adminConf.boxType;
        lastBuiltConfig.length = adminConf.length;
        lastBuiltConfig.width = adminConf.width;
        lastBuiltConfig.height = adminConf.height;
      }

      // Map chronological targets
      const targets = {
        grid: currentPhase >= 2 && currentPhase < 10 ? 1 : (currentPhase === 10 ? 0.3 : 0),
        draw: currentPhase >= 3 ? 1 : 0, 
        annotation: currentPhase === 4 ? 1 : 0,
        fold: currentPhase >= 5 ? 1 : 0,
        wire: currentPhase === 6 ? 1 : 0,
        material: currentPhase >= 7 ? 1 : 0,
        artwork: currentPhase >= 7 ? 1 : 0,
        reveal: currentPhase >= 9 ? 1 : 0
      };

      // Perfect fluid deceleration lerp formula on active dimensions (configured for organic gentle motion)
      const lerpValue = 0.022 * adminConf.speed;
      current.grid += (targets.grid - current.grid) * lerpValue;
      current.draw += (targets.draw - current.draw) * lerpValue;
      current.annotation += (targets.annotation - current.annotation) * lerpValue;
      current.fold += (targets.fold - current.fold) * 0.016 * adminConf.speed;
      current.wire += (targets.wire - current.wire) * lerpValue;
      current.material += (targets.material - current.material) * lerpValue;
      current.artwork += (targets.artwork - current.artwork) * lerpValue;
      current.reveal += (targets.reveal - current.reveal) * 0.012 * adminConf.speed;

      // Update state tracking
      stateRef.current.drawProgress = current.draw;
      stateRef.current.gridProgress = current.grid;
      stateRef.current.annotationProgress = current.annotation;
      stateRef.current.foldProgress = current.fold;
      stateRef.current.wireProgress = current.wire;
      stateRef.current.materialProgress = current.material;
      stateRef.current.artworkProgress = current.artwork;
      stateRef.current.revealProgress = current.reveal;

      const layoutWidth = canvas.clientWidth || container.clientWidth || 800;
      const layoutHeight = canvas.clientHeight || container.clientHeight || 580;

      // --- RENDERING PATH: WEBGL MAIN ENGINE ---
      if (isWebGLReady && scene && camera && renderer) {
        
        // 1. Ambiance background glow and particles count sync
        const pSystem = particleSystem as THREE.Points;
        if (pSystem) {
          pSystem.rotation.y += 0.0012;
          pSystem.rotation.z += 0.0004;
          // Slowly bounce particles
          pSystem.position.y = Math.sin(now * 0.0005) * 0.15;
          (pSystem.material as THREE.Material).opacity = 0.1 + current.grid * 0.45;
        }

        if (gridHelper) {
          (gridHelper.material as THREE.Material).opacity = current.grid > 0.01 ? 0.72 : 0;
          (gridHelper.material as THREE.Material).transparent = true;
          gridHelper.scale.set(current.grid, 1, current.grid);
          const geom = gridHelper.geometry;
          if (geom && geom.attributes.position) {
            geom.setDrawRange(0, Math.floor(geom.attributes.position.count * current.grid));
          }
        }

        if (minorGridHelper) {
          minorGridHelper.material.opacity = current.grid > 0.01 ? 0.35 : 0;
          minorGridHelper.material.transparent = true;
          minorGridHelper.scale.set(current.grid, 1, current.grid);
          const geom = minorGridHelper.geometry;
          if (geom && geom.attributes.position) {
            geom.setDrawRange(0, Math.floor(geom.attributes.position.count * current.grid));
          }
        }

        // Apply admin colors directly
        if (sbsMaterial) {
          try {
            sbsMaterial.color.set(adminConf.cardboardColor || '#d97706');
          } catch (_) {
            try {
              sbsMaterial.color.setHex(0xd97706);
            } catch (__) {}
          }
          sbsMaterial.opacity = current.material * (1 - current.wire * 0.88);
          sbsMaterial.visible = sbsMaterial.opacity > 0.01;
          sbsMaterial.depthWrite = sbsMaterial.opacity > 0.15;
        }

        const lidNode = nodeMapsInstance['lid'];
        if (lidNode && lidNode.glassMesh) {
          const glassMat = lidNode.glassMesh.material as THREE.MeshPhysicalMaterial;
          if (glassMat) {
            glassMat.opacity = current.material * 0.75 * (1 - current.wire * 0.95);
            glassMat.visible = glassMat.opacity > 0.01;
          }
        }

        if (goldArtworkMaterial) {
          try {
            goldArtworkMaterial.color.set(adminConf.artworkColor || '#cca43b');
          } catch (_) {
            try {
              goldArtworkMaterial.color.setHex(0xcca43b);
            } catch (__) {}
          }
          // Apply neon gold mask
          goldArtworkMaterial.opacity = current.artwork * current.material * (1 - current.wire);
          goldArtworkMaterial.visible = goldArtworkMaterial.opacity > 0.01;
          goldArtworkMaterial.depthWrite = goldArtworkMaterial.opacity > 0.15;
        }

        if (lineMaterialBlue) {
          // Keep opacity high when active, and let setDrawRange handle the CAD architect drawing effect instead of a simple fade in
          lineMaterialBlue.opacity = (current.draw > 0.01 ? 0.9 : 0) * (1 - current.material * 0.9);
          lineMaterialBlue.color.set(adminConf.glowActive ? '#00f0ff' : '#64748b');
        }

        if (lineMaterialCreaseDashed) {
          lineMaterialCreaseDashed.opacity = (current.draw > 0.01 ? 0.6 : 0) * (1 - current.material * 0.9);
        }

        if (wireframeMaterial) {
          wireframeMaterial.opacity = current.wire * 0.8;
          wireframeMaterial.visible = wireframeMaterial.opacity > 0.01;
        }

        // Apply dimensions from Admin configuration in real-time length/width parameters
        if (boxRoot) {
          // Dynamic safety zoom-back calculation for the 3D container
          // If any box dimension exceeds standard limits, scale the box down relative to maximum bounds
          const maxDim = Math.max(adminConf.length, adminConf.width, adminConf.height * 1.35);
          const rawRatio = maxDim > 3.0 ? (3.0 / maxDim) : 1.05;
          
          // Apply aspect adjustment to prevent clipping on Portrait/Mobile devices
          const aspectAdj = camera.aspect < 1.0 ? Math.max(0.85, camera.aspect * 1.3) : 1.0;
          
          // Apply flat unfolded state layout safety factor (unfolded dielines occupy more screen space)
          const flatOffset = 1.0 + (1.0 - current.draw) * 0.35;
          
          const zoomRatio = (rawRatio / flatOffset) * aspectAdj;

          const finalScaleFactor = (0.2 + current.draw * 0.58) * zoomRatio;
          boxRoot.scale.setScalar(finalScaleFactor);
          // Adjust physical dimensions based on length/width sliders
          const lx = adminConf.length / 3.0;
          const ly = adminConf.height / 0.45;
          const lz = adminConf.width / 3.0;
          boxRoot.scale.set(
            finalScaleFactor * lx,
            finalScaleFactor * ly,
            finalScaleFactor * lz
          );

          // Technical CAD drawings progression - draw dielines and fold lines like an architect
          boxRoot.traverse((child) => {
            if (child instanceof THREE.LineSegments || child instanceof THREE.Line) {
              const geom = child.geometry;
              if (geom && geom.attributes.position) {
                const totalCount = geom.attributes.position.count;
                geom.setDrawRange(0, Math.floor(totalCount * current.draw));
              }
            }
          });
        }

        // Apply Fold Angle Hinges Hierarchy based on current fold and show progress
        const anglesMap = getFoldAngles(current.fold, current.reveal);
        panelThreeNodes.forEach(node => {
          if (!node.group) return;
          switch (node.id) {
            case 'left_wall':
              node.group.rotation.z = node.foldDirection * anglesMap.leftWall;
              break;
            case 'left_wall_inner':
              node.group.rotation.z = node.foldDirection * anglesMap.leftInner;
              break;
            case 'right_wall':
              node.group.rotation.z = node.foldDirection * anglesMap.rightWall;
              break;
            case 'right_wall_inner':
              node.group.rotation.z = node.foldDirection * anglesMap.rightInner;
              break;
            case 'front_wall':
              node.group.rotation.x = node.foldDirection * anglesMap.frontWall;
              break;
            case 'front_wall_inner':
              node.group.rotation.x = node.foldDirection * anglesMap.frontInner;
              break;
            case 'back_wall':
              node.group.rotation.x = node.foldDirection * anglesMap.backWall;
              break;
            case 'lid':
              node.group.rotation.x = node.foldDirection * anglesMap.lid;
              break;
            case 'lid_front_flap':
              node.group.rotation.x = node.foldDirection * anglesMap.lidFrontFlap;
              break;
            case 'lid_left_flap':
              node.group.rotation.z = node.foldDirection * anglesMap.lidLeftFlap;
              break;
            case 'lid_right_flap':
              node.group.rotation.z = node.foldDirection * anglesMap.lidRightFlap;
              break;
          }
        });

        // 2. Cinematic Camera Controller
        if (!dragRef.isDragging) {
          // Exquisite, ultra-slow rotation for a relaxed high-end presentation feel
          const baseSpin = 0.0008 * adminConf.speed;
          // Even slower on active cover reveals/stage 10 to allow studying details without motion sickness
          const spinMultiplier = current.reveal > 0.01 ? 0.35 : 1.0;
          stateRef.current.cameraAngle += baseSpin * spinMultiplier;
        }
        
        const finalAngle = stateRef.current.cameraAngle + dragRef.angleOffset + (adminConf.cameraAngleOffset || 0);
        const finalTilt = dragRef.tiltOffset;
        const hOffset = adminConf.cameraHeightOffset || 0;
        const dOffset = adminConf.cameraDistanceOffset || 0;

        if (adminConf.cameraPath === 'topDown') {
          camera.position.set(0.001, 8.5 + hOffset, 0);
        } else if (adminConf.cameraPath === 'isometric') {
          // Fixed static technical isometric angle
          const distScale = 1.0 + dOffset * 0.2;
          camera.position.set(5.5 * distScale, 4.0 + hOffset, 5.5 * distScale);
        } else {
          // Dynamic Orbital / Cinematic Path Planning
          if (current.reveal > 0.01) {
            const orbitDist = 4.2 - current.reveal * 0.5 + dOffset;
            camera.position.x = Math.sin(finalAngle) * orbitDist;
            camera.position.z = Math.cos(finalAngle) * orbitDist;
            camera.position.y = 1.35 + (1 - current.reveal) * 2.2 + finalTilt * 2.5 + hOffset;
          } else if (current.fold > 0.01) {
            const orbitDist = 4.6 + dOffset;
            camera.position.x = Math.sin(finalAngle * 0.4) * orbitDist;
            camera.position.z = Math.cos(finalAngle * 0.4) * orbitDist;
            camera.position.y = 2.5 - current.fold * 0.9 + finalTilt * 2.5 + hOffset;
          } else {
            const zoomHeight = 6.2 - current.grid * 2.2 + hOffset;
            camera.position.set(
              (current.grid - current.draw) * 1.5 + Math.sin(finalAngle) * 0.15,
              zoomHeight + finalTilt * 3,
              0.1 + current.grid * 3.0 + Math.cos(finalAngle) * 0.15 + dOffset
            );
          }
        }

        // --- AUTOMATED ZOOM CALIBRATION WHEN LID IS OPEN ---
        let autoZoomModifier = 1.0;
        
        // Smart screen aspect ratio correction
        const aspect = layoutWidth / (layoutHeight || 580);
        if (aspect < 1.0) {
          // Zoom out on narrow screen heights and widths so the complete 3D structure fits within the safe 90% boundary.
          autoZoomModifier += 0.15 + (1.0 - aspect) * 0.45;
        } else if (aspect < 1.45) {
          // Semi-wide or square layout
          autoZoomModifier += 0.20;
        }

        if (current.reveal > 0.01) {
          // When the box lid opens or the package reveals, it expands vertically significantly.
          // Zoom out up to 58% depending on the open state to prevent clipping outside the viewport.
          const mobileRevealExtra = aspect < 1.0 ? 0.45 : 0.0;
          autoZoomModifier += (current.reveal) * (0.58 + mobileRevealExtra);
        } else if (current.fold > 0.35 && current.fold < 0.95) {
          // Peak zoom out of 38% during folding swing animations to contain outer flaps.
          const foldProgress = (current.fold - 0.35) / 0.60;
          const factor = Math.sin(foldProgress * Math.PI);
          autoZoomModifier += factor * 0.38;
        }
        camera.position.multiplyScalar(autoZoomModifier);
        
        // --- SECURE CAMERA OFFSET: ALWAYS PUSH OBJECT TO LEFT ON WIDESCREENS ---
        const targetX = 0;
        const targetY = 0.05;
        const targetZ = 0;

        // Calculate 2D direction components from target to camera on XZ plane
        const dx = camera.position.x - targetX;
        const dz = camera.position.z - targetZ;
        const dist2D = Math.sqrt(dx * dx + dz * dz) || 0.001;

        let screenOffset = 0;
        if (layoutWidth >= 1280) {
          // Widescreen laptops & desktops: Push the box substantially to the left so it doesn't overlap text
          screenOffset = 1.35;
        } else if (layoutWidth >= 1024) {
          // Medium desktops / tablets
          screenOffset = 0.75;
        } else {
          // Mobile / small tablet portrait screens
          screenOffset = 0.0;
        }

        // Camera's local right vector in 3D: perpendicular to its viewing direction facing the target.
        // rx and rz represent the look-right direction vector components on the XZ plane.
        const rx = dz / dist2D;
        const rz = -dx / dist2D;

        // We look at a spot on the camera's local right, which shifts the physical 3D box to the left of the screen.
        const lookAtX = targetX + rx * screenOffset;
        const lookAtY = targetY;
        const lookAtZ = targetZ + rz * screenOffset;

        camera.lookAt(lookAtX, lookAtY, lookAtZ);

        // --- PHYSICAL 3D COORDINATE PROJECTION-LOCKING FOR HOTSPOTS ---
        if (hotspotRef.current && boxRoot) {
          const activePhase = stateRef.current.phase;
          
          // Base variables
          const halfL = adminConf.length / 2;
          const halfW = adminConf.width / 2;
          const hHeight = adminConf.height;

          const target3D = new THREE.Vector3(0, 0, 0);

          // Interpolated values representing physical joints of the 3D cardboard model
          const foldP = current.fold;
          
          switch (activePhase) {
            case 1:
              // Middle floor center
              target3D.set(0, 0.02, 0);
              break;
            case 2:
              // Bottom corner representation
              target3D.set(-halfL, 0.02, halfW);
              break;
            case 3:
              // Dieline blue edge line spot
              target3D.set(halfL * 0.6, 0.02, -halfW * 0.6);
              break;
            case 4:
              // Left horizontal measurement edge
              target3D.set(-halfL * 0.95, 0.02, 0);
              break;
            case 5:
              // Active flap corner fold vertex
              target3D.set(halfL * 1.12, hHeight * foldP * 0.9, halfW * 1.12);
              break;
            case 6:
              // Technical wireframe back-left-top corner
              target3D.set(-halfL, hHeight * foldP, -halfW);
              break;
            case 7:
              // Cardboard material paper thickness flap center and texture
              target3D.set(halfL, (hHeight / 2) * foldP, 0);
              break;
            case 8:
              // Golden center artwork on folding lid (Lid folds down as foldP reaches 1)
              target3D.set(0, hHeight * foldP + 0.02, halfW * (1.1 - foldP));
              break;
            case 9:
              // Golden foil premium branding highlight corner
              target3D.set(halfL * 0.35, hHeight * foldP * 1.05, halfW * foldP * 1.05);
              break;
            case 10:
            default:
              // Showcase elevated floating center
              target3D.set(0, hHeight * foldP * 0.5 + 0.1, 0);
              break;
          }

          // Apply scale changes on box to match user dimension updates
          const maxDim = Math.max(adminConf.length, adminConf.width, adminConf.height * 1.35);
          const rawRatio = maxDim > 3.0 ? (3.0 / maxDim) : 1.05;
          const aspectAdj = camera.aspect < 1.0 ? Math.max(0.45, camera.aspect * 0.85) : 1.0;
          const flatOffset = 1.0 + (1.0 - current.draw) * 0.35;
          const zoomRatio = (rawRatio / flatOffset) * aspectAdj;
          const scaleFact = (0.2 + current.draw * 0.58) * zoomRatio;
          
          target3D.x *= (adminConf.length / 3.0);
          target3D.y *= (adminConf.width / 3.0);
          target3D.z *= (adminConf.height / 3.0);
          target3D.multiplyScalar(scaleFact);

          // Update hierarchical matrix to obtain absolute world coordinates
          boxRoot.updateMatrixWorld(true);
          target3D.applyMatrix4(boxRoot.matrixWorld);

          // Convert 3D world space into clip space coordinate
          target3D.project(camera);

          // Convert clip space [-1, 1] coordinates into actual screen pixels
          const halfWidth = layoutWidth / 2;
          const halfHeight = layoutHeight / 2;

          const screenPX = (target3D.x * halfWidth) + halfWidth;
          const screenPY = (-(target3D.y) * halfHeight) + halfHeight;

          // Directly assign styles bypassing React re-renders to achieve true 60fps locking effect
          hotspotRef.current.style.transform = `translate3d(${screenPX}px, ${screenPY}px, 0)`;
          hotspotRef.current.style.left = '0px';
          hotspotRef.current.style.top = '0px';
        }

        if (renderer && renderer.info && !stateRef.current.isDestroyed) {
          renderer.render(scene, camera);
        }

        // --- DYNAMIC WEBGL DIGITAL CALIBRATION AND SPECS DIMENSIONS OVERLAY ---
        if (current.annotation > 0.01 && overlayCanvasRef.current) {
          const oCanvas = overlayCanvasRef.current;
          const oCtx = oCanvas.getContext('2d');
          if (oCtx) {
            oCtx.save();
            const sX = oCanvas.width;
            const sY = oCanvas.height;
            const scalePixelRatio = Math.min(window.devicePixelRatio, 2);
            
            // Check if active viewport width is on a mobile device and apply micro-scale refinement
            const isMobile = windowWidth < 768;
            const layoutScaleFactor = isMobile ? 0.6 : 1.0;
            const paddingScaleFactor = isMobile ? 0.5 : 1.0;

            oCtx.strokeStyle = '#10b981';
            oCtx.fillStyle = '#10b981';
            oCtx.lineWidth = 1.35 * scalePixelRatio * layoutScaleFactor;
            oCtx.font = `bold ${Math.round(11 * scalePixelRatio * layoutScaleFactor)}px monospace`;

            const draw3DDimension = (pA: [number, number], pB: [number, number], text: string, offsetVal: number) => {
              const dx = pB[0] - pA[0];
              const dy = pB[1] - pA[1];
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len < 5) return;
              const nx = -dy / len;
              const ny = dx / len;

              // Bring offset closer on mobile so dimension lines fit tightly around dielines
              const adjustedOffset = offsetVal * paddingScaleFactor;
              const ox = nx * adjustedOffset * scalePixelRatio;
              const oy = ny * adjustedOffset * scalePixelRatio;

              const exA = [pA[0] + ox, pA[1] + oy];
              const exB = [pB[0] + ox, pB[1] + oy];

              // Translucent helper lines
              oCtx.beginPath();
              oCtx.strokeStyle = 'rgba(16, 185, 129, 0.38)';
              oCtx.moveTo(pA[0] + ox * 0.15, pA[1] + oy * 0.15);
              oCtx.lineTo(exA[0], exA[1]);
              oCtx.moveTo(pB[0] + ox * 0.15, pB[1] + oy * 0.15);
              oCtx.lineTo(exB[0], exB[1]);
              oCtx.stroke();

              // Solid caliper measurement rule line
              oCtx.beginPath();
              oCtx.strokeStyle = '#10b981';
              oCtx.moveTo(exA[0], exA[1]);
              oCtx.lineTo(exB[0], exB[1]);
              oCtx.stroke();

              // Clean dimension pointers
              const arrowSize = 4.5 * scalePixelRatio * layoutScaleFactor;
              const angle = Math.atan2(dy, dx);
              
              oCtx.fillStyle = '#10b981';
              oCtx.beginPath();
              oCtx.moveTo(exA[0], exA[1]);
              oCtx.lineTo(exA[0] + Math.cos(angle + Math.PI/6)*arrowSize, exA[1] + Math.sin(angle + Math.PI/6)*arrowSize);
              oCtx.lineTo(exA[0] + Math.cos(angle - Math.PI/6)*arrowSize, exA[1] + Math.sin(angle - Math.PI/6)*arrowSize);
              oCtx.closePath();
              oCtx.fill();

              oCtx.beginPath();
              oCtx.moveTo(exB[0], exB[1]);
              oCtx.lineTo(exB[0] - Math.cos(angle + Math.PI/6)*arrowSize, exB[1] - Math.sin(angle + Math.PI/6)*arrowSize);
              oCtx.lineTo(exB[0] - Math.cos(angle - Math.PI/6)*arrowSize, exB[1] - Math.sin(angle - Math.PI/6)*arrowSize);
              oCtx.closePath();
              oCtx.fill();

              // Translucent backdrop with solid glow outline
              const mx = (exA[0] + exB[0]) / 2;
              const my = (exA[1] + exB[1]) / 2;
              const textWidth = oCtx.measureText(text).width;
              
              oCtx.fillStyle = 'rgba(2, 4, 10, 0.95)';
              oCtx.fillRect(
                mx - textWidth/2 - 5 * scalePixelRatio * layoutScaleFactor, 
                my - 8 * scalePixelRatio * layoutScaleFactor, 
                textWidth + 10 * scalePixelRatio * layoutScaleFactor, 
                16 * scalePixelRatio * layoutScaleFactor
              );
              
              oCtx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
              oCtx.strokeRect(
                mx - textWidth/2 - 5 * scalePixelRatio * layoutScaleFactor, 
                my - 8 * scalePixelRatio * layoutScaleFactor, 
                textWidth + 10 * scalePixelRatio * layoutScaleFactor, 
                16 * scalePixelRatio * layoutScaleFactor
              );

              oCtx.fillStyle = '#34d399';
              oCtx.textAlign = 'center';
              oCtx.textBaseline = 'middle';
              oCtx.fillText(text, mx, my);
            };

            const realL = Math.round(adminConf.length * 100);
            const realW = Math.round(adminConf.width * 100);
            const realH = Math.round(adminConf.height * 100);

            const bNode = nodeMapsInstance['bottom'];
            const lNode = nodeMapsInstance['left_wall'];
            const lidNode = nodeMapsInstance['lid'];

            const projectPoint = (x: number, y: number, z: number, meshObj: THREE.Mesh): [number, number] => {
              const vector = new THREE.Vector3(x, y, z);
              meshObj.updateMatrixWorld(true);
              vector.applyMatrix4(meshObj.matrixWorld);
              vector.project(camera!);
              const cx = (vector.x * 0.5 + 0.5) * sX;
              const cy = (-(vector.y * 0.5) + 0.5) * sY;
              return [cx, cy];
            };

            if (bNode && bNode.mesh) {
              const bs = bNode.size;
              const p0 = projectPoint(-bs[0]/2, bs[1]/2, -bs[2]/2, bNode.mesh);
              const p1 = projectPoint(bs[0]/2, bs[1]/2, -bs[2]/2, bNode.mesh);
              const p2 = projectPoint(bs[0]/2, bs[1]/2, bs[2]/2, bNode.mesh);
              const p3 = projectPoint(-bs[0]/2, bs[1]/2, bs[2]/2, bNode.mesh);

              // Draw Length (Bottom front side)
              draw3DDimension(p3, p2, `${realL}.00 mm (L)`, 35);
              // Draw Width (Right front side)
              draw3DDimension(p2, p1, `${realW}.00 mm (W)`, 35);
            }

            if (lNode && lNode.mesh) {
              const ls = lNode.size;
              const p0 = projectPoint(-ls[0]/2, ls[1]/2, -ls[2]/2, lNode.mesh);
              const p1 = projectPoint(ls[0]/2, ls[1]/2, -ls[2]/2, lNode.mesh);
              // Draw Height (Left wall extrusion height)
              draw3DDimension(p0, p1, `${realH}.00 mm (H)`, 25);
            }

            if (lidNode && lidNode.mesh) {
              const lds = lidNode.size;
              const p0 = projectPoint(-lds[0]/2, lds[1]/2, -lds[2]/2, lidNode.mesh);
              const p1 = projectPoint(lds[0]/2, lds[1]/2, -lds[2]/2, lidNode.mesh);
              // Draw lid margin dimension
              draw3DDimension(p1, p0, `${realL}.00 mm`, -25);
            }

            oCtx.restore();
          }
        }

      } else {

        // --- RENDERING PATH: HTML5 Canvas2D DUAL ENGINE FALLBACK ---
        // Generates the entire 10-phase sequence mathematically in high quality flat/isometric vectors
        const ctx2d = canvas.getContext('2d');
        if (ctx2d) {
          ctx2d.clearRect(0, 0, canvas.width, canvas.height);
          
          const sX = canvas.width;
          const sY = canvas.height;
          const scalePixelRatio = Math.min(window.devicePixelRatio, 2);
          
          // Background layout gradient
          const darkGrad = ctx2d.createRadialGradient(sX/2, sY/2, 50, sX/2, sY/2, sX/2);
          darkGrad.addColorStop(0, '#0a0e1c');
          darkGrad.addColorStop(1, '#03050a');
          ctx2d.fillStyle = darkGrad;
          ctx2d.fillRect(0, 0, sX, sY);

          // Draw floating cellulose particle mesh
          ctx2d.fillStyle = 'rgba(56,189,248,0.25)';
          const tSeed = now * 0.0003;
          for (let i = 0; i < 35; i++) {
            const px = ((Math.sin(i * 123 + tSeed) * 0.5 + 0.5) * sX);
            const py = ((Math.cos(i * 456 + tSeed * 0.7) * 0.5 + 0.5) * sY);
            const rSize = (Math.sin(i + tSeed) * 1.5 + 2) * scalePixelRatio;
            ctx2d.beginPath();
            ctx2d.arc(px, py, rSize, 0, Math.PI * 2);
            ctx2d.fill();
          }

          // 1. Draw Technical CAD Grid Helper (Scene 02)
          if (current.grid > 0.05) {
            const gridSpacing = 40 * scalePixelRatio;
            const minorSpacing = 10 * scalePixelRatio;
            
            // Progressive grow vectors based on current grid progression state
            const xCenter = sX / 2;
            const yCenter = sY / 2;
            const halfLenX = xCenter * current.grid;
            const halfLenY = yCenter * current.grid;

            // Finer, minor grid lines drawing block (animated center-out growth)
            ctx2d.strokeStyle = adminConf.glowActive ? 'rgba(0,240,255,0.045)' : 'rgba(100,116,139,0.03)';
            ctx2d.lineWidth = 0.5 * scalePixelRatio;
            for (let x = 0; x < sX; x += minorSpacing) {
              if (x % gridSpacing !== 0) {
                ctx2d.beginPath();
                ctx2d.moveTo(x, yCenter - halfLenY);
                ctx2d.lineTo(x, yCenter + halfLenY);
                ctx2d.stroke();
              }
            }
            for (let y = 0; y < sY; y += minorSpacing) {
              if (y % gridSpacing !== 0) {
                ctx2d.beginPath();
                ctx2d.moveTo(xCenter - halfLenX, y);
                ctx2d.lineTo(xCenter + halfLenX, y);
                ctx2d.stroke();
              }
            }

            // Major grid lines drawing block (animated center-out growth)
            ctx2d.strokeStyle = adminConf.glowActive ? 'rgba(0,240,255,0.16)' : 'rgba(100,116,139,0.1)';
            ctx2d.lineWidth = 1 * scalePixelRatio;
            for (let x = 0; x < sX; x += gridSpacing) {
              ctx2d.beginPath();
              ctx2d.moveTo(x, yCenter - halfLenY);
              ctx2d.lineTo(x, yCenter + halfLenY);
              ctx2d.stroke();
            }
            for (let y = 0; y < sY; y += gridSpacing) {
              ctx2d.beginPath();
              ctx2d.moveTo(xCenter - halfLenX, y);
              ctx2d.lineTo(xCenter + halfLenX, y);
              ctx2d.stroke();
            }

            // Tech center crosshair
            ctx2d.strokeStyle = 'rgba(0,240,255,0.25)';
            ctx2d.lineWidth = 1.5 * scalePixelRatio;
            ctx2d.beginPath();
            ctx2d.moveTo(sX / 2 - 30, sY / 2);
            ctx2d.lineTo(sX / 2 + 30, sY / 2);
            ctx2d.moveTo(sX / 2, sY / 2 - 30);
            ctx2d.lineTo(sX / 2, sY / 2 + 30);
            ctx2d.stroke();

            // Coordinate numbers
            ctx2d.fillStyle = 'rgba(0,240,255,0.4)';
            ctx2d.font = '9px monospace';
            ctx2d.fillText('X: 0.00', sX / 2 + 35, sY / 2 - 5);
            ctx2d.fillText('Y: 0.00', sX / 2 - 55, sY / 2 + 15);
            ctx2d.fillText('ASHK GHALAM CAD ENGINE v3.2', 25 * scalePixelRatio, 40 * scalePixelRatio);
          }

          // 2. Compute 3D Orthographic projection to draw dieline folding
          const spinAngle = (now * 0.0003 + dragRef.angleOffset) + current.reveal * 1.5;
          const tiltAngle = 0.45 + dragRef.tiltOffset; // Isometric tilt angle anchor

          // Raw projection for bounding-box calculation
          const projectCoordsRaw = (X: number, Y: number, Z: number): [number, number] => {
            // Apply spin around Y axis
            let x1 = X * Math.cos(spinAngle) - Z * Math.sin(spinAngle);
            let z1 = X * Math.sin(spinAngle) + Z * Math.cos(spinAngle);
            
            // Apply tilt around X axis
            let y2 = Y * Math.cos(tiltAngle) - z1 * Math.sin(tiltAngle);
            return [x1, y2];
          };

          // Define dieline box panels in hierarchy
          interface Panel2D {
            id: string;
            parent: string | null;
            localPoints: [number, number, number][]; // 4 corners local corners
            creaseLine: [[number, number, number], [number, number, number]] | null; // pivot line
            foldAxis: 'x' | 'z';
            foldDir: number;
            maxFold: number;
          }

          const l = adminConf.length / 2; // Half dimensions length
          const w = adminConf.width / 2; // Half dimensions width
          const h = adminConf.height / 2; // Half walls height 
          
          const pizzaPanels: Panel2D[] = [
            {
              id: 'bottom',
              parent: null,
              localPoints: [[-l, 0, -w], [l, 0, -w], [l, 0, w], [-l, 0, w]],
              creaseLine: null,
              foldAxis: 'x', foldDir: 0, maxFold: 0
            },
            {
              id: 'left_wall',
              parent: 'bottom',
              localPoints: [[-h, 0, -w], [0, 0, -w], [0, 0, w], [-h, 0, w]],
              creaseLine: [[-l, 0, -w], [-l, 0, w]],
              foldAxis: 'z', foldDir: -1, maxFold: Math.PI / 2
            },
            {
              id: 'right_wall',
              parent: 'bottom',
              localPoints: [[0, 0, -w], [h, 0, -w], [h, 0, w], [0, 0, w]],
              creaseLine: [[l, 0, -w], [l, 0, w]],
              foldAxis: 'z', foldDir: 1, maxFold: Math.PI / 2
            },
            {
              id: 'front_wall',
              parent: 'bottom',
              localPoints: [[-l, 0, 0], [l, 0, 0], [l, 0, h], [-l, 0, h]],
              creaseLine: [[-l, 0, w], [l, 0, w]],
              foldAxis: 'x', foldDir: -1, maxFold: Math.PI / 2
            },
            {
              id: 'back_wall',
              parent: 'bottom',
              localPoints: [[-l, 0, -h], [l, 0, -h], [l, 0, 0], [-l, 0, 0]],
              creaseLine: [[-l, 0, -w], [l, 0, -w]],
              foldAxis: 'x', foldDir: 1, maxFold: Math.PI / 2
            },
            {
              id: 'lid',
              parent: 'back_wall',
              localPoints: [[-l, 0, -w], [l, 0, -w], [l, 0, 0], [-l, 0, 0]],
              creaseLine: [[-l, 0, -h], [l, 0, -h]],
              foldAxis: 'x', foldDir: 1, maxFold: Math.PI / 2
            }
          ];

          // Sequentially transform panels positions recursively
          const angles2D = getFoldAngles(current.fold);

          const getTransformedPoints = (panel: Panel2D): [number, number, number][] => {
            // Apply rotations based on parents
            let currentPoints = [...panel.localPoints];

            // Local fold rot axis
            let localAngle = 0;
            if (panel.id === 'left_wall') localAngle = -angles2D.leftWall;
            if (panel.id === 'right_wall') localAngle = angles2D.rightWall;
            if (panel.id === 'front_wall') localAngle = -angles2D.frontWall;
            if (panel.id === 'back_wall') localAngle = angles2D.backWall;
            if (panel.id === 'lid') localAngle = angles2D.lid;

            // Apply fold on localPoints
            if (panel.creaseLine && localAngle !== 0) {
              const [[px0, py0, pz0], [px1, py1, pz1]] = panel.creaseLine;
              currentPoints = currentPoints.map(([x, y, z]) => {
                let rx = x, ry = y, rz = z;
                
                if (panel.foldAxis === 'z') {
                  const xOrigin = px0; // Shift relative to hinge
                  const shX = x - xOrigin;
                  const cos = Math.cos(localAngle);
                  const sin = Math.sin(localAngle);
                  rx = xOrigin + shX * cos;
                  ry = shX * sin;
                } else if (panel.foldAxis === 'x') {
                  const zOrigin = pz1;
                  const shZ = z - zOrigin;
                  const cos = Math.cos(localAngle);
                  const sin = Math.sin(localAngle);
                  rz = zOrigin + shZ * cos;
                  ry = -shZ * sin; // standard axis flipped
                }
                return [rx, ry, rz];
              });
            }

            // If panel has parent, inherit parents rot and offset
            if (panel.parent) {
              const parentPanel = pizzaPanels.find(p => p.id === panel.parent);
              if (parentPanel) {
                // Approximate hierarchical pivot rotation inheritance for 2D vectors
                let parentAngle = 0;
                if (parentPanel.id === 'back_wall') parentAngle = angles2D.backWall;
                currentPoints = currentPoints.map(([x, y, z]) => {
                  let rx = x, ry = y, rz = z;
                  if (parentPanel.foldAxis === 'x' && parentAngle !== 0) {
                    const originZ = -w;
                    const shZ = z - originZ;
                    const cos = Math.cos(parentAngle);
                    const sin = Math.sin(parentAngle);
                    rz = originZ + shZ * cos;
                    ry += -shZ * sin;
                  }
                  return [rx, ry, rz];
                });
              }
            }

            return currentPoints;
          };

          // 2D Aspect Ratio Scale and Centering Alignment via dynamic bounding box calculation
          let minX = Infinity;
          let maxX = -Infinity;
          let minY = Infinity;
          let maxY = -Infinity;

          pizzaPanels.forEach(p => {
            const pts3D = getTransformedPoints(p);
            pts3D.forEach(([x, y, z]) => {
              const [px, py] = projectCoordsRaw(x, y, z);
              if (px < minX) minX = px;
              if (px > maxX) maxX = px;
              if (py < minY) minY = py;
              if (py > maxY) maxY = py;
            });
          });

          const boxWidth2D = Math.max(0.1, maxX - minX);
          const boxHeight2D = Math.max(0.1, maxY - minY);

          let leftShiftPx = 0;
          if (sX >= 1280) {
            leftShiftPx = 250 * scalePixelRatio;
          } else if (sX >= 1024) {
            leftShiftPx = 140 * scalePixelRatio;
          }

          // Compute max bounds centered within 88% safe zone (well under the outer edge boundaries)
          const availableWidth = sX - (leftShiftPx > 0 ? leftShiftPx * 2.2 : 40 * scalePixelRatio);
          const availableHeight = sY - 145 * scalePixelRatio;

          const zoomTo90 = 0.88;
          const scaleToFitWidth = (availableWidth * zoomTo90) / boxWidth2D;
          const scaleToFitHeight = (availableHeight * zoomTo90) / boxHeight2D;
          
          const projectionScale = Math.min(scaleToFitWidth, scaleToFitHeight);

          // Center the dieline coordinates exactly within visual margins
          const cx = sX / 2 - leftShiftPx - ((minX + maxX) / 2) * projectionScale;
          const cy = sY / 2 - 25 * scalePixelRatio + (current.grid * 10) - ((minY + maxY) / 2) * projectionScale;

          const projectCoords = (X: number, Y: number, Z: number): [number, number] => {
            const [x1, y2] = projectCoordsRaw(X, Y, Z);
            return [
              cx + x1 * projectionScale,
              cy - y2 * projectionScale
            ];
          };

          // Draw the physical items (Dielines, annotations, wireframe, or solid cardboard)
          if (current.draw > 0.01) {
            
            // Build projected coordinates
            const projectedPanels = pizzaPanels.map(p => {
              const pts3D = getTransformedPoints(p);
              const pts2D = pts3D.map(([x, y, z]) => projectCoords(x, y, z));
              return { id: p.id, pts3D, pts2D };
            });

            // 3. Render Solid / Material Cardboard Mode with flat-shading (Scenes 07, 08, 09)
            if (current.material > 0.05) {
              // Depth-sort panels based on average Y and Z points to solve overlap (Painter's algorithm)
              const sortedRender = [...projectedPanels].sort((a,b) => {
                const centerZa = a.pts3D.reduce((acc, p) => acc + p[2], 0) / 4;
                const centerZb = b.pts3D.reduce((acc, p) => acc + p[2], 0) / 4;
                return centerZa - centerZb; // Far away (largest z) draws first
              });

              sortedRender.forEach(p => {
                ctx2d.beginPath();
                ctx2d.moveTo(p.pts2D[0][0], p.pts2D[0][1]);
                for (let j = 1; j < 4; j++) {
                  ctx2d.lineTo(p.pts2D[j][0], p.pts2D[j][1]);
                }
                ctx2d.closePath();

                // Compute flat dynamic lighting shade based on simple tilt normal
                const diffShade = Math.max(0.4, Math.min(1.0, 0.75 + (p.id === 'bottom' ? -0.1 : (p.id === 'lid' ? 0.15 : 0))));
                const colorValue = Math.floor(240 * diffShade);
                
                // Cardboard Material coloring
                ctx2d.fillStyle = adminConf.cardboardColor;
                ctx2d.fill();

                // Draw solid border strokes
                ctx2d.strokeStyle = 'rgba(100,116,139,0.3)';
                ctx2d.lineWidth = 1 * scalePixelRatio;
                ctx2d.stroke();

                // Scene 08: Premium Gold branding text on top lid
                if (p.id === 'lid' && current.artwork > 0.05) {
                  ctx2d.save();
                  // Map center of lid
                  const lcx = (p.pts2D[0][0] + p.pts2D[2][0]) / 2;
                  const lcy = (p.pts2D[0][1] + p.pts2D[2][1]) / 2;

                  ctx2d.textAlign = 'center';
                  ctx2d.fillStyle = adminConf.artworkColor;
                  ctx2d.font = `bold ${Math.round(14 * scalePixelRatio)}px Vazirmatn, Arial`;
                  ctx2d.fillText('اشک قـلـم', lcx, lcy - 10 * scalePixelRatio);
                  ctx2d.font = `${Math.round(7 * scalePixelRatio)}px monospace`;
                  ctx2d.fillText('FEFCO 0427 PREMIUM', lcx, lcy + 8 * scalePixelRatio);
                  ctx2d.stroke();
                  ctx2d.restore();
                }
              });
            }

            // 4. Render Blueprint / Wireframe outlines (Scenes 03, 06)
            projectedPanels.forEach(p => {
              // progressive dieline line drafting
              const drawLimit = Math.max(0, Math.min(1, current.draw * 1.2));
              
              ctx2d.beginPath();
              ctx2d.moveTo(p.pts2D[0][0], p.pts2D[0][1]);
              
              const linesCount = Math.floor(4 * drawLimit);
              const lineRatio = (drawLimit * 4) % 1;

              for (let j = 1; j < 4; j++) {
                if (j <= linesCount) {
                  ctx2d.lineTo(p.pts2D[j][0], p.pts2D[j][1]);
                } else if (j === linesCount + 1) {
                  const prev = p.pts2D[j-1];
                  const curr = p.pts2D[j];
                  const dx = prev[0] + (curr[0] - prev[0]) * lineRatio;
                  const dy = prev[1] + (curr[1] - prev[1]) * lineRatio;
                  ctx2d.lineTo(dx, dy);
                }
              }
              ctx2d.strokeStyle = adminConf.glowActive ? 'rgba(0,240,255,0.75)' : 'rgba(100,116,139,0.5)';
              
              if (current.wire > 0.05) {
                // High tech wireframe analysis look (Scene 06)
                ctx2d.strokeStyle = `rgba(14,165,233, ${current.wire * 0.9})`;
                ctx2d.lineWidth = 1.5 * scalePixelRatio;
              } else {
                ctx2d.lineWidth = (current.material > 0.9) ? 0.5 * scalePixelRatio : 1.5 * scalePixelRatio;
              }
              
              ctx2d.stroke();
            });

            // 5. Draw interactive measurement indicators (Scene 04)
            if (current.annotation > 0.05) {
              ctx2d.save();
              
              const isMobile = windowWidth < 768;
              const layoutScaleFactor = isMobile ? 0.6 : 1.0;
              const paddingScaleFactor = isMobile ? 0.5 : 1.0;

              ctx2d.strokeStyle = '#10b981';
              ctx2d.fillStyle = '#10b981';
              ctx2d.lineWidth = 1.2 * scalePixelRatio * layoutScaleFactor;
              ctx2d.font = `bold ${Math.round(10 * scalePixelRatio * layoutScaleFactor)}px monospace`;

              const drawDimension = (pA: [number, number], pB: [number, number], text: string, offsetDistance: number) => {
                // Compute normal vector for offset
                const dx = pB[0] - pA[0];
                const dy = pB[1] - pA[1];
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len < 5) return;
                const nx = -dy / len;
                const ny = dx / len;

                // Adjust offset distance tightly check on mobile
                const adjustedOffset = offsetDistance * paddingScaleFactor;
                const ox = nx * adjustedOffset * scalePixelRatio;
                const oy = ny * adjustedOffset * scalePixelRatio;

                const exA = [pA[0] + ox, pA[1] + oy];
                const exB = [pB[0] + ox, pB[1] + oy];

                // Draw extension lines
                ctx2d.beginPath();
                ctx2d.strokeStyle = 'rgba(16, 185, 129, 0.4)';
                ctx2d.moveTo(pA[0] + ox * 0.15, pA[1] + oy * 0.15);
                ctx2d.lineTo(exA[0] + ox * 0.15, exA[1] + oy * 0.15);
                ctx2d.moveTo(pB[0] + ox * 0.15, pB[1] + oy * 0.15);
                ctx2d.lineTo(exB[0] + ox * 0.15, exB[1] + oy * 0.15);
                ctx2d.stroke();

                // Draw dimension line
                ctx2d.beginPath();
                ctx2d.strokeStyle = '#10b981';
                ctx2d.moveTo(exA[0], exA[1]);
                ctx2d.lineTo(exB[0], exB[1]);
                ctx2d.stroke();

                // Draw arrows / markers at both ends
                const arrowSize = 4.5 * scalePixelRatio * layoutScaleFactor;
                const angle = Math.atan2(dy, dx);
                
                // End A Arrow
                ctx2d.beginPath();
                ctx2d.moveTo(exA[0], exA[1]);
                ctx2d.lineTo(exA[0] + Math.cos(angle + Math.PI/6)*arrowSize, exA[1] + Math.sin(angle + Math.PI/6)*arrowSize);
                ctx2d.lineTo(exA[0] + Math.cos(angle - Math.PI/6)*arrowSize, exA[1] + Math.sin(angle - Math.PI/6)*arrowSize);
                ctx2d.closePath();
                ctx2d.fill();

                // End B Arrow
                ctx2d.beginPath();
                ctx2d.moveTo(exB[0], exB[1]);
                ctx2d.lineTo(exB[0] - Math.cos(angle + Math.PI/6)*arrowSize, exB[1] - Math.sin(angle + Math.PI/6)*arrowSize);
                ctx2d.lineTo(exB[0] - Math.cos(angle - Math.PI/6)*arrowSize, exB[1] - Math.sin(angle - Math.PI/6)*arrowSize);
                ctx2d.closePath();
                ctx2d.fill();

                // Draw solid dimension text plate (gorgeous translucent backup)
                const mx = (exA[0] + exB[0]) / 2;
                const my = (exA[1] + exB[1]) / 2;
                const textWidth = ctx2d.measureText(text).width;
                
                ctx2d.fillStyle = 'rgba(2, 4, 10, 0.95)';
                ctx2d.fillRect(
                  mx - textWidth/2 - 5 * scalePixelRatio * layoutScaleFactor, 
                  my - 8 * scalePixelRatio * layoutScaleFactor, 
                  textWidth + 10 * scalePixelRatio * layoutScaleFactor, 
                  16 * scalePixelRatio * layoutScaleFactor
                );
                
                ctx2d.strokeStyle = '#10b981';
                ctx2d.strokeRect(
                  mx - textWidth/2 - 5 * scalePixelRatio * layoutScaleFactor, 
                  my - 8 * scalePixelRatio * layoutScaleFactor, 
                  textWidth + 10 * scalePixelRatio * layoutScaleFactor, 
                  16 * scalePixelRatio * layoutScaleFactor
                );

                ctx2d.fillStyle = '#34d399';
                ctx2d.textAlign = 'center';
                ctx2d.textBaseline = 'middle';
                ctx2d.fillText(text, mx, my);
              };

              // Map panel labels
              // Let's get actual millimeter values based on typical user adjustments
              const realL = Math.round(adminConf.length * 100);
              const realW = Math.round(adminConf.width * 100);
              const realH = Math.round(adminConf.height * 100);

              // 1. Bottom panel dimensions (Length / Width)
              const bottom = projectedPanels.find(p => p.id === 'bottom');
              if (bottom && bottom.pts2D.length >= 4) {
                // Length dimension: Bottom front edge
                drawDimension(bottom.pts2D[3], bottom.pts2D[2], `${realL}.00 mm (L)`, 30);
                // Width dimension: Right edge
                drawDimension(bottom.pts2D[2], bottom.pts2D[1], `${realW}.00 mm (W)`, 30);
              }

              // 2. Left Wall height dimension
              const leftWall = projectedPanels.find(p => p.id === 'left_wall');
              if (leftWall && leftWall.pts2D.length >= 4) {
                // Height dimension
                drawDimension(leftWall.pts2D[0], leftWall.pts2D[1], `${realH}.00 mm (H)`, 25);
              }
              
              // 3. Lid dimensions (for completeness)
              const lid = projectedPanels.find(p => p.id === 'lid');
              if (lid && lid.pts2D.length >= 4) {
                drawDimension(lid.pts2D[1], lid.pts2D[0], `${realL}.00 mm`, -25);
              }

              ctx2d.restore();
            }
          }
        }
      }
    };

    renderLoop();

    // Clean up pipeline resources on component destruction
    return () => {
      stateRef.current.isDestroyed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      if (renderer) {
        try {
          renderer.dispose();
        } catch (_) {}
      }
      if (scene) {
        try { scene.clear(); } catch (_) {}
      }
    };
  }, [config.boxType, config.particlesCount, isFullscreen]);

  // Handle Fullscreen elements requests
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      id="cinematic-stage-root"
      style={{ backgroundColor: '#02040a' }}
      className={`relative w-full ${isFullscreen ? 'fixed inset-0 h-screen z-[100]' : 'h-[82vh] min-h-[600px] md:min-h-[750px] m-0 p-0'} bg-[#02040a] overflow-hidden text-slate-100 select-none font-sans`}
    >
      {/* ── RENDERING LAYER ON CANVAS ── */}
      <canvas ref={canvasRef} style={{ backgroundColor: '#02040a' }} className="absolute inset-0 w-full h-full block z-0" />
      <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full block z-10 pointer-events-none" />

      {/* Ambient background styling colors */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.025),transparent_80%)] pointer-events-none z-0" />
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/85 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none z-10" />

      {/* ── TOP-BAR GLOBAL NAVIGATION HUB ── */}
      <div className="absolute top-4 md:top-6 inset-x-4 md:inset-x-6 flex justify-between items-center z-30 pointer-events-none">
        
        {/* Product Model Selector Pills (انتخاب سریع محصول در اسلایدر) */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/95 border border-slate-800/80 p-1.5 rounded-full shadow-2xl pointer-events-auto dir-rtl">
          {[
            { id: 'windowBox', label: '🪟 ویندودار', length: 3.0, width: 3.0, height: 0.45, cardboardColor: '#d97706' },
            { id: 'fefco0427', label: '🍕 جعبه پیتزا', length: 3.0, width: 3.0, height: 0.45, cardboardColor: '#e2d5c3' },
            { id: 'pharmaCarton', label: '🧪 جعبه دارویی', length: 1.6, width: 1.4, height: 1.0, cardboardColor: '#e2e8f0' },
            { id: 'giftBox', label: '🎁 هاردباکس', length: 3.0, width: 2.2, height: 0.9, cardboardColor: '#475569' },
            { id: 'slidingSleeve', label: '🚪 کشویی صنعتی', length: 3.0, width: 2.0, height: 0.35, cardboardColor: '#0f172a' },
          ].map((prod) => {
            const isActive = config.boxType === prod.id;
            return (
              <button
                key={prod.id}
                onClick={() => {
                  setConfig({
                    ...config,
                    boxType: prod.id as any,
                    length: prod.length,
                    width: prod.width,
                    height: prod.height,
                    cardboardColor: prod.cardboardColor,
                  });
                  setPhase(9);
                  setIsAutoPlay(false);
                }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                    : 'text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800/40'
                }`}
              >
                <span>{prod.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Action controls tools */}
        <div className="flex items-center gap-1.5 md:gap-2.5 pointer-events-auto w-full sm:w-auto justify-between sm:justify-end">
          
          <div className="flex items-center gap-1.5 md:gap-2.5">
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className={`p-2.5 md:p-3 border rounded-full transition-all ${showDebug ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-[#0a0f24]/90 border-slate-800/60 text-slate-300'}`}
              title="نمای دیباگ مهندسی"
            >
              <Activity className="w-4 h-4 md:w-4.5 md:h-4.5" />
            </button>

            <button 
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className={`px-3 md:px-4 py-2 md:py-2.5 rounded-full border transition-all flex items-center gap-1.5 md:gap-2 font-black text-xs ${
                showAdminPanel 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold' 
                  : 'bg-[#0a0f24]/90 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Settings className="w-4 h-4 md:w-4.5 md:h-4.5 animate-spin-slow" />
              <span className="hidden sm:inline">Packaging Hero Studio</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2.5">
            <button 
              onClick={toggleFullscreen}
              className="p-2.5 md:p-3 border border-slate-800/80 rounded-full bg-[#0a0f24]/90 text-slate-300 hover:bg-slate-900 transition-all"
              title="تمام صفحه"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 md:w-4.5 md:h-4.5" /> : <Maximize2 className="w-4 h-4 md:w-4.5 md:h-4.5" />}
            </button>

            <button 
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className={`px-3 md:px-4 py-2 md:py-2.5 rounded-full border transition-all flex items-center gap-1.5 md:gap-2 font-black text-xs ${
                isAutoPlay 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                  : 'bg-slate-900/90 border-slate-800 text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAutoPlay ? 'bg-amber-400 animate-ping' : 'bg-slate-500'}`} />
              <span className="hidden sm:inline">{isAutoPlay ? 'پخش لایو سینماتیک' : 'توقف انیمیشن'}</span>
              {!isAutoPlay && <span className="sm:hidden text-[10px]">توقف</span>}
              {isAutoPlay && <span className="sm:hidden text-[10px] text-amber-400">پخش</span>}
            </button>
          </div>

        </div>
      </div>

      {/* ── PROMINENT SLIDER SIDE NAVIGATION ARROWS (دکمه‌های قبلی و بعدی اسلایدر) ── */}
      <button
        onClick={() => {
          setIsAutoPlay(false);
          setPhase((prev) => (prev < 10 ? prev + 1 : 1));
        }}
        className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-30 p-3 md:p-4 rounded-2xl bg-slate-950/90 border border-amber-500/50 text-amber-300 hover:text-white hover:bg-amber-500/30 hover:border-amber-400 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all transform hover:scale-110 active:scale-95 group cursor-pointer"
        title="اسلاید/مرحله بعد"
        aria-label="Next Slide"
      >
        <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 transition-transform group-hover:-translate-x-1" />
      </button>

      <button
        onClick={() => {
          setIsAutoPlay(false);
          setPhase((prev) => (prev > 1 ? prev - 1 : 10));
        }}
        className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-30 p-3 md:p-4 rounded-2xl bg-slate-950/90 border border-amber-500/50 text-amber-300 hover:text-white hover:bg-amber-500/30 hover:border-amber-400 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all transform hover:scale-110 active:scale-95 group cursor-pointer"
        title="اسلاید/مرحله قبل"
        aria-label="Previous Slide"
      >
        <ChevronRight className="w-6 h-6 md:w-8 md:h-8 transition-transform group-hover:translate-x-1" />
      </button>

      {/* ── ACTIVE PHASE FLOATING HOLOGRAPHIC HOTSPOT (Invisible ref holder to prevent runtime style write crashes) ── */}
      <div ref={hotspotRef} className="hidden pointer-events-none" style={{ display: 'none' }} />

      {/* ── MOBILE RESPONSIVE HOTSPOT DETAILS AND NAVIGATION CARD (BOOSTED ABOVE CONTACT FLOATERS) ── */}
      {windowWidth < 768 && (
        <div className="absolute bottom-36 sm:bottom-28 inset-x-4 mx-auto z-30 pointer-events-auto w-fit select-none text-right">
          <AnimatePresence mode="wait">
            {(() => {
              const activePos = hotspotPositions[phase - 1];
              if (!activePos) return null;
              return (
                <motion.div
                  key={`mobile-details-card-${phase}`}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative overflow-hidden bg-slate-950/95 border border-amber-500/35 rounded-full p-1.5 shadow-[0_15px_30px_rgba(2,4,12,0.98)] flex items-center justify-center"
                >
                  {/* Left side: Premium discrete chevron navigator to cycle through phases */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 bg-slate-900/80 border border-slate-800/80 rounded-full p-1 text-amber-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAutoPlay(false);
                        setPhase((prev) => (prev > 1 ? prev - 1 : 10));
                      }}
                      className="p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-amber-450 active:scale-90"
                      title="مرحله قبل"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    
                    <div className="flex flex-col items-center justify-center px-1 min-w-[34px] font-mono select-none">
                      <span className="text-[12px] font-black text-amber-400">{phase}</span>
                      <span className="text-[7.5px] text-slate-500 font-extrabold leading-none mt-0.5">از ۱۰</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAutoPlay(false);
                        setPhase((prev) => (prev < 10 ? prev + 1 : 1));
                      }}
                      className="p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-amber-450 active:scale-90"
                      title="مرحله بعد"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      )}

      {/* ── CINEMATIC TYPOGRAPHIC OVERLAY - ASHK GHALAM BRAND NARRATIVE (STATIC & HIGH CONTRAST) ── */}
      <div className="absolute right-6 md:right-12 top-20 max-w-md text-right pointer-events-none z-20 select-none hidden xl:block">
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3 animate-fade-in"
        >
          {/* Subtle Premium Accent Label with Gold Animate Ping */}
          <div className="flex items-center gap-2 justify-end">
            <span className="text-[10px] font-mono tracking-widest text-[#cca43b] font-black uppercase">CINEMATIC 3D STUDIO</span>
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#cca43b]" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
          </div>

          {/* Majestic Bold Brand Title, Slogan, and Description - Desktop Compact Version */}
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-5 shadow-2xl shadow-black/80 pointer-events-auto">
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight select-none mb-2">
              {config.brandTitle.includes("اشک") ? (
                <>
                  {config.brandTitle.split("اشک")[0]}
                  <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-[#cca43b] bg-clip-text text-transparent">
                    اشک {config.brandTitle.split("اشک")[1] || "قلم"}
                  </span>
                </>
              ) : config.brandTitle}
            </h1>
            <p className="text-sm lg:text-base font-extrabold text-amber-100 tracking-wide select-none mb-2">
              {config.brandSlogan}
            </p>
            <p className="text-slate-300 text-xs font-bold leading-relaxed text-right select-none opacity-90">
              {config.brandDescription}
            </p>
          </div>
        </motion.div>
      </div>
          

              
        
      
      {/* ── CINEMATIC PRESENTATION CARD DEPRECATED (HIDDEN COMPLETELY FROM VIEW) ── */}
      <div className="hidden">
        <div className="absolute left-6 top-24 bottom-28 w-[380px] hidden xl:flex flex-col gap-4 pointer-events-none z-30 justify-center">
        <div className="w-full bg-[#02050a]/85 border-y border-l border-[#cca43b]/45 shadow-[0_25px_60px_rgba(3,6,18,0.98),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-r-[2rem] p-7 backdrop-blur-2xl text-right space-y-4 pointer-events-auto select-none relative overflow-hidden">
          {/* Ambient luxury corporate gold radial spotlight */}
          <div className="absolute top-0 left-0 w-36 h-36 bg-amber-500/10 rounded-full filter blur-3xl pointer-events-none" />
          
          {/* Header: Ashk Ghalam High-End Corporate Identifier */}
          <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
            <div className="flex items-center gap-2 font-mono text-[10px] text-amber-500/90 font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>ASHK GHALAM • PREMIUM</span>
            </div>
            <span className="text-[10px] font-black text-slate-400 tracking-wider">هنر و صنعت تولید جعبه لوکس</span>
          </div>

          {/* Static Corporate Narrative (Highly Cinematic, Curated Persian Terminology, Zero Phase Shifts) */}
          <div className="space-y-1.5 bg-gradient-to-b from-slate-950/20 to-transparent p-3 rounded-2xl border border-slate-900/10">
            <h2 className="text-sm font-black text-white leading-snug drop-shadow-sm bg-gradient-to-r from-amber-200 via-amber-400 to-[#cca43b] bg-clip-text text-transparent">
              صنایع بسته‌بندی اشک قلم
            </h2>
            <p className="text-slate-350 text-[11px] font-bold leading-relaxed">
              آفرینش هندسه نفیس. پیاده‌سازی حرفه‌ای مکانیزم‌های خلاقانه دی‌لاین، قالب و دایکات‌های هنری هماهنگ با بالاترین استانداردهای صنعتی و صادراتی جهان.
            </p>
          </div>

          {/* Decorative Divider */}
          <div className="h-px bg-gradient-to-l from-transparent via-slate-800/80 to-slate-900/90 my-2" />

          {/* Dynamic Stage Details Area with Smooth Transitional Fade-In */}
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              {/* Dynamic Segment 2: Slide Concept Description */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono text-cyan-400 font-extrabold uppercase">STG {String(phase).padStart(2, '0')} / 10</span>
                  <span className="text-[9.5px] text-slate-400 font-bold">جزییات فاز فعال مهندسی</span>
                </div>
                <h3 className="text-xs font-black text-white">{phaseNames[phase - 1]}</h3>
                <p className="text-slate-350 text-[11px] font-bold leading-relaxed">
                  {phaseDescriptions[phase - 1]}
                </p>
              </div>

              {/* Dynamic Segment 3: Live Handled Tasks Checklist */}
              <div className="space-y-2.5 pt-3 border-t border-slate-900/60">
                <span className="text-[9px] text-emerald-400 font-black tracking-wider block uppercase">⚙️ پایش محاسبات مهندسی و اقدامات انجام‌شده</span>
                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                  {phaseTasks[phase - 1].map((task, tid) => (
                    <div key={tid} className="flex items-center gap-2 text-[10.5px] text-slate-300 font-semibold justify-end">
                      <span className="leading-tight text-right">{task}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)] flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Extra Luxury Brand Seal Footer */}
          <div className="border-t border-slate-900/50 pt-3 flex justify-between items-center text-[9px] text-slate-500 font-mono">
            <span>REAL-TIME 3D SIMULATOR PRO v3.5.1</span>
            <span>اشک قلم © ۱۴۰۵</span>
          </div>
        </div>
      </div>
      </div>

      {/* ── CORE SPECIFICATION SPECS OVERVIEW SHEET (Scene 04 / Debug Overlay) ── */}
      {showDebug && (
        <div className="absolute top-26 left-6 z-20 bg-slate-950/90 border border-slate-900 p-5 rounded-3xl text-right space-y-3 shadow-2xl max-w-[280px]">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h4 className="text-[10px] text-cyan-400 font-mono font-black tracking-widest uppercase">DIAGNOSTICS & TELEMETRY</h4>
          </div>
          <div className="space-y-1.5 text-slate-350 text-[10px] font-mono leading-relaxed">
            <div className="flex justify-between">
              <span className="text-cyan-400 font-black">{rendererMode}</span>
              <span>RENDERENGINE:</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400 font-black">{fps} FPS</span>
              <span>PERFOMANCE STATUS:</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400 font-extrabold">FEFCO 0427 (Pizza Box)</span>
              <span>BOX STRUCTURE:</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white font-extrabold">{config.length * 100} x {config.width * 100} x {config.height * 100} mm</span>
              <span>CONSTR DIMENSIONS:</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400 font-extrabold">{Math.floor(phase * 10)}%</span>
              <span>TIMELINE COMPLETE:</span>
            </div>
          </div>
          <div className="border-t border-slate-900 pt-2 text-[8.5px] text-slate-500 text-center font-mono">
            PRESS DRAG ON GRID TO MANUALLY EXPAND VIEWPORT ORBIT
          </div>
        </div>
      )}

      {/* ── PACKAGING HERO STUDIO (ADMIN CONFIGURATION DRAWER) ── */}
      <AnimatePresence>
        {showAdminPanel && (
          <motion.div 
            initial={{ x: -350, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -350, opacity: 0 }}
            className="absolute left-6 top-24 bottom-24 w-[330px] bg-[#04081c]/95 border border-slate-800/80 rounded-[2.5rem] p-6 shadow-2xl z-40 overflow-y-auto direction-rtl text-right scrollbar-thin overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-white text-base">Packaging Hero Studio</h3>
              </div>
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs"
              >
                بستن پانل
              </button>
            </div>

            <div className="space-y-5 text-slate-200">
              {/* Box Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
                  <Box className="w-3.5 h-3.5" />
                  <span>ساختار قالب هندسی</span>
                </label>
                <select 
                  value={config.boxType}
                  onChange={(e) => {
                    const selectedVal = e.target.value as any;
                    const defaultDimensions: Record<string, { length: number; width: number; height: number }> = {
                      fefco0427: { length: 3.0, width: 3.0, height: 0.45 },
                      windowBox: { length: 3.0, width: 3.0, height: 0.45 },
                      pharmaCarton: { length: 1.6, width: 1.4, height: 1.0 }, // ~10 cm normalized height
                      giftBox: { length: 3.0, width: 2.2, height: 0.9 },
                      slidingSleeve: { length: 3.0, width: 2.0, height: 0.35 }
                    };
                    const dims = defaultDimensions[selectedVal] || { length: 3.0, width: 3.0, height: 0.45 };
                    setConfig({
                      ...config,
                      boxType: selectedVal,
                      ...dims
                    });
                  }}
                  className="w-full bg-[#0a0f2b] border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="fefco0427">FEFCO 0427 (جعبه کلاسیک پیتزا)</option>
                  <option value="windowBox">Luxury Windowed Kraft (جعبه ویندودار اشک قلم)</option>
                  <option value="pharmaCarton">Pharmaceutical Reverse-Tuck (جعبه داروئی اشک قلم)</option>
                  <option value="giftBox">Premium Gift Box (هاردباکس هدیه)</option>
                  <option value="slidingSleeve">Sliding Sleeve Carton (کشویی صنعتی)</option>
                </select>
              </div>

              {/* Length, Width, Height sliders */}
              <div className="space-y-4 border-t border-slate-900 pt-3">
                <h4 className="text-[11px] font-black text-slate-400">اندازه‌گذاری قالب (میلی‌متر)</h4>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="text-cyan-450">{config.length * 100} mm</span>
                    <span>طول جعبه (Length)</span>
                  </div>
                  <input 
                    type="range" min="1.5" max="4.5" step="0.1"
                    value={config.length}
                    onChange={(e) => setConfig({ ...config, length: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="text-cyan-450">{config.width * 100} mm</span>
                    <span>عرض جعبه (Width)</span>
                  </div>
                  <input 
                    type="range" min="1.5" max="4.5" step="0.1"
                    value={config.width}
                    onChange={(e) => setConfig({ ...config, width: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="text-cyan-450">{Math.round(config.height * 100)} mm</span>
                    <span>ارتفاع جعبه (Height)</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="3.0" step="0.05"
                    value={config.height}
                    onChange={(e) => setConfig({ ...config, height: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Cardboard Card Colors */}
              <div className="space-y-2 border-t border-slate-900 pt-3">
                <label className="text-xs font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
                  <Palette className="w-3.5 h-3.5" />
                  <span>طرح متریال مقوا (قالب اصلی)</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { color: '#f3f3f6', label: 'سفید SBS' },
                    { color: '#e0cfa9', label: 'کرافت قهوه‌ای' },
                    { color: '#1a1f33', label: 'کربن مشکی' },
                    { color: '#572214', label: 'چرمی چوبی' }
                  ].map((item) => (
                    <button
                      key={item.color}
                      onClick={() => setConfig({ ...config, cardboardColor: item.color })}
                      className={`p-1 rounded-lg border text-[9px] font-black text-center transition-all ${
                        config.cardboardColor === item.color 
                          ? 'border-amber-500 bg-amber-500/10 text-white' 
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      <div className="w-full h-4 rounded mb-1" style={{ backgroundColor: item.color }} />
                      <span className="block truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Foil Stamp Color */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>طلاکوب لوگو (Foil Finishes)</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { color: '#cca43b', label: 'طلای ۲۴ عیار' },
                    { color: '#cccccc', label: 'نقره‌ای صیقلی' },
                    { color: '#ec4899', label: 'نئون بنفش' },
                    { color: '#ffffff', label: 'هولوگرام لوکس' }
                  ].map((item) => (
                    <button
                      key={item.color}
                      onClick={() => setConfig({ ...config, artworkColor: item.color })}
                      className={`p-1 rounded-lg border text-[9px] font-black text-center transition-all ${
                        config.artworkColor === item.color 
                          ? 'border-amber-500 bg-amber-500/10 text-white' 
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      <div className="w-full h-4 rounded mb-1" style={{ backgroundColor: item.color }} />
                      <span className="block truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Animation Speed and camera configs */}
              <div className="space-y-3.5 border-t border-slate-900 pt-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">{config.speed}x</span>
                  <span>سرعت شبیه‌سازی</span>
                </div>
                <input 
                  type="range" min="0.25" max="2.5" step="0.25"
                  value={config.speed}
                  onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <div className="space-y-2">
                  <span className="text-xs">مسیر حرکت دوربین (Orbit)</span>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                    {[
                      { val: 'cinematic', label: 'چرخش سینمایی' },
                      { val: 'orbit', label: 'فوکوس دستی' },
                      { val: 'topDown', label: 'نقشه دو بعدی' },
                      { val: 'isometric', label: 'سه‌بعدی ایزومتریک' }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => setConfig({ ...config, cameraPath: opt.val as any })}
                        className={`py-1.5 px-2 rounded-lg border transition-all text-center ${config.cameraPath === opt.val ? 'bg-amber-500 text-slate-900 border-amber-400' : 'bg-slate-900 border-slate-800 text-slate-300'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Slide Transition & Cycle configuration section */}
              <div className="space-y-3 border-t border-slate-900 pt-3.5 text-xs">
                <h4 className="text-[11px] font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
                  <Sliders className="w-3.5 h-3.5 text-[#cca43b]" />
                  <span>تنظیمات اسلایدها و چرخه پخش</span>
                </h4>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-black text-slate-300">
                    <span className="text-cyan-400 font-mono font-bold">{config.slideDurationMult}x</span>
                    <span>ضریب ماندگاری اسلایدها (Pause)</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="3.0" step="0.25"
                    value={config.slideDurationMult}
                    onChange={(e) => setConfig({ ...config, slideDurationMult: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[9.5px] text-slate-400 block leading-normal">
                    با افزایش ضریب، مکث روی هر اسلاید طولانی تر و با کاهش آن سریعتر پیش می‌رود.
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-black text-slate-200 pt-1.5">
                  <span>تغییر متوالی قالب هندسی جعبه‌ها</span>
                  <input 
                    type="checkbox"
                    checked={config.autoCycleBoxes}
                    onChange={(e) => setConfig({ ...config, autoCycleBoxes: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer rounded border-slate-800 bg-slate-900"
                  />
                </div>
                <span className="text-[9.5px] text-slate-400 block leading-normal mt-1">
                  در صورت فعال بودن تمایل، در فاز ۱۰ به صورت اتوماتیک قالب جعبه بعدی لود می‌شود.
                </span>
              </div>

              {/* Effects toggle */}
              <div className="flex items-center justify-between border-t border-slate-900 pt-4 text-xs font-bold">
                <span>تلالو و افکت نئونی خطوط</span>
                <input 
                  type="checkbox"
                  checked={config.glowActive}
                  onChange={(e) => setConfig({ ...config, glowActive: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* CTA Custom text inputs */}
              <div className="space-y-3.5 border-t border-slate-900 pt-3 text-xs font-bold">
                <span className="block text-[#cca43b]">ویرایش عناوین دکمه‌های سفارش</span>
                <div className="space-y-2 text-[11px]">
                  <div className="space-y-1">
                    <span>دکمه استعلام قیمت آنلاین:</span>
                    <input 
                      type="text" value={config.ctaInquiryText}
                      onChange={(e) => setConfig({ ...config, ctaInquiryText: e.target.value })}
                      className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <span>دکمه کاتالوگ و نمونه‌کارها:</span>
                    <input 
                      type="text" value={config.ctaPortfolioText}
                      onChange={(e) => setConfig({ ...config, ctaPortfolioText: e.target.value })}
                      className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Promo Text Boxes Editor */}
              <div className="space-y-3.5 border-t border-slate-900 pt-3 text-xs font-bold">
                <span className="block text-[#cca43b]">معرفی خدمات و تبلیغات شیشه‌ای اشک قلم</span>
                
                <div className="space-y-2.5 text-[11px]">
                  {/* Card 1 */}
                  <div className="space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-[#cca43b] block">باکس اول (مهندسی قالب):</span>
                    <input 
                      type="text" value={config.promoTitle1}
                      onChange={(e) => setConfig({ ...config, promoTitle1: e.target.value })}
                      placeholder="عنوان تبلیغ اول"
                      className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[11px] mb-1"
                    />
                    <textarea 
                      value={config.promoDesc1}
                      onChange={(e) => setConfig({ ...config, promoDesc1: e.target.value })}
                      placeholder="متن توضیحی تبلیغ اول"
                      rows={2}
                      className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[10px] resize-none"
                    />
                  </div>

                  {/* Card 2 */}
                  <div className="space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-[#cca43b] block">باکس دوم (طلاکوب لوکس):</span>
                    <input 
                      type="text" value={config.promoTitle2}
                      onChange={(e) => setConfig({ ...config, promoTitle2: e.target.value })}
                      placeholder="عنوان تبلیغ دوم"
                      className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[11px] mb-1"
                    />
                    <textarea 
                      value={config.promoDesc2}
                      onChange={(e) => setConfig({ ...config, promoDesc2: e.target.value })}
                      placeholder="متن توضیحی تبلیغ دوم"
                      rows={2}
                      className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[10px] resize-none"
                    />
                  </div>

                  {/* Card 3 */}
                  <div className="space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-[#cca43b] block">باکس سوم (شبیه‌ساز و استودیو):</span>
                    <input 
                      type="text" value={config.promoTitle3}
                      onChange={(e) => setConfig({ ...config, promoTitle3: e.target.value })}
                      placeholder="عنوان تبلیغ سوم"
                      className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[11px] mb-1"
                    />
                    <textarea 
                      value={config.promoDesc3}
                      onChange={(e) => setConfig({ ...config, promoDesc3: e.target.value })}
                      placeholder="متن توضیحی تبلیغ سوم"
                      rows={2}
                      className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[10px] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* ── PART 1: CHOOSE DISPLAYED BOX TYPES IN CYCLIC ITERATION ── */}
              <div className="space-y-3 border-t border-slate-900 pt-3.5 text-xs">
                <h4 className="text-[11px] font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
                  <Box className="w-3.5 h-3.5 text-[#cca43b]" />
                  <span>جعبه‌های فعال در چرخه نمایش (Slider)</span>
                </h4>
                <p className="text-[9.5px] text-slate-400 block leading-normal">
                  انواع قالب‌هایی که مایلید در حین پخش هوشمند به ترتیب نمایش داده شوند را تیک بزنید:
                </p>
                <div className="space-y-2 bg-[#0a0f2b]/60 p-3 rounded-xl border border-slate-800/85">
                  {[
                    { id: 'fefco0427', label: 'کلاسیک پیتزا FEFCO 0427' },
                    { id: 'windowBox', label: 'ویندودار لوکس کرافت (Windowed)' },
                    { id: 'pharmaCarton', label: 'داروئی استاندارد (Reverse-Tuck)' },
                    { id: 'giftBox', label: 'هاردباکس هدیه (Gift Box)' },
                    { id: 'slidingSleeve', label: 'کشویی صنعتی (Sliding Sleeve)' }
                  ].map((item) => {
                    const isChecked = (config.activeBoxTypes || []).includes(item.id as any);
                    return (
                      <label key={item.id} className="flex items-center gap-2.5 cursor-pointer text-[10.5px] text-slate-350 hover:text-amber-400 transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let updatedList = [...(config.activeBoxTypes || [])];
                            if (e.target.checked) {
                              if (!updatedList.includes(item.id as any)) {
                                updatedList.push(item.id as any);
                              }
                            } else {
                              if (updatedList.length > 1) {
                                updatedList = updatedList.filter(bt => bt !== item.id);
                              }
                            }
                            setConfig({ ...config, activeBoxTypes: updatedList as any });
                          }}
                          className="w-4 h-4 accent-amber-500 rounded border-slate-800 bg-slate-950"
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── PART 2: SLIDER INTRODUCTION & BRAND COVERS EDITING ── */}
              <div className="space-y-3 border-t border-slate-900 pt-3.5 text-xs">
                <h4 className="text-[11px] font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
                  <Sliders className="w-3.5 h-3.5 text-[#cca43b]" />
                  <span>متن‌های معرفی و شعارهای اصلی اسلایدر</span>
                </h4>
                <p className="text-[9.5px] text-slate-400 block leading-normal">
                  عنوان برند، شعار و متن توضیحی نمایش داده شده بر روی اسلایدر را ویرایش فرمایید:
                </p>
                <div className="space-y-2.5 text-[11px]">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px]">عنوان برند اصلی پوستر:</span>
                    <input 
                      type="text" 
                      value={config.brandTitle}
                      onChange={(e) => setConfig({ ...config, brandTitle: e.target.value })}
                      className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[11px] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px]">شعار اصلی پوستر:</span>
                    <input 
                      type="text" 
                      value={config.brandSlogan}
                      onChange={(e) => setConfig({ ...config, brandSlogan: e.target.value })}
                      className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[11px] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px]">متن معرفی محصول و فناوری (Sub-Narrative):</span>
                    <textarea 
                      value={config.brandDescription}
                      onChange={(e) => setConfig({ ...config, brandDescription: e.target.value })}
                      rows={3}
                      className="w-full bg-[#0a0f2b] border border-slate-800 rounded-lg p-2 text-white text-[10.5px] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* ── PART 3: ADVANCED CAMERA OFFSET COORDINATES TUNING ── */}
              <div className="space-y-3 border-t border-slate-900 pt-3.5 text-xs">
                <h4 className="text-[11px] font-black text-[#cca43b] flex items-center gap-1.5 leading-none">
                  <Maximize2 className="w-3.5 h-3.5 text-[#cca43b]" />
                  <span>موقعیت و زوایای قرارگیری دوربین سه بعدی</span>
                </h4>
                <p className="text-[9.5px] text-slate-400 block leading-normal">
                  بدون تغییر در کدهای رندرینگ، تراز ارتفاعی و دایرة‌البروج دوربین را بهینه‌سازی و جابجا فرمایید:
                </p>
                <div className="space-y-3 bg-[#0a0f2b]/40 p-3 rounded-xl border border-slate-800/80 text-[10.5px]">
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[9.5px]">
                      <span className="text-amber-400">{(config.cameraHeightOffset || 0).toFixed(2)}</span>
                      <span>تراز ارتفاع دوربین (Y Height)</span>
                    </div>
                    <input 
                      type="range" min="-3.0" max="3.0" step="0.1"
                      value={config.cameraHeightOffset || 0}
                      onChange={(e) => setConfig({ ...config, cameraHeightOffset: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-900 rounded-lg appearance-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[9.5px]">
                      <span className="text-amber-400">{(config.cameraDistanceOffset || 0).toFixed(2)}</span>
                      <span>فاصله کانونی عمق و زوم (Distance)</span>
                    </div>
                    <input 
                      type="range" min="-3.0" max="3.0" step="0.1"
                      value={config.cameraDistanceOffset || 0}
                      onChange={(e) => setConfig({ ...config, cameraDistanceOffset: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-900 rounded-lg appearance-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[9.5px]">
                      <span className="text-amber-400">{(config.cameraAngleOffset || 0).toFixed(2)} rad</span>
                      <span>چرخش سمتی پایه افقی (Angle Yaw)</span>
                    </div>
                    <input 
                      type="range" min="-3.14" max="3.14" step="0.1"
                      value={config.cameraAngleOffset || 0}
                      onChange={(e) => setConfig({ ...config, cameraAngleOffset: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-900 rounded-lg appearance-none"
                    />
                  </div>

                  <button
                    onClick={() => setConfig({ ...config, cameraHeightOffset: 0, cameraDistanceOffset: 0, cameraAngleOffset: 0 })}
                    className="w-full py-1.5 mt-1 text-center bg-slate-900 rounded-lg border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-850 transition-all text-[9.5px]"
                  >
                    ریست به زوایای دیفالت سازنده
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute bottom-4 md:bottom-8 inset-x-4 md:inset-x-6 flex flex-col lg:flex-row justify-between items-end gap-4 z-30 pointer-events-none">
        
        {/* Sleek Minimalist Slide Controller Bar (Elegant, zero-clutter) */}
        <div className="hidden md:flex items-center gap-4 bg-[#02050a]/90 border border-slate-900/80 px-5 py-3 rounded-full shadow-[0_15px_40px_rgba(3,6,18,0.9)] pointer-events-auto select-none">
          {/* Play/Pause Button to toggle auto-play */}
          <button 
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className="flex items-center justify-center p-1.5 rounded-full hover:bg-slate-900 text-amber-500 transition-colors cursor-pointer"
            title={isAutoPlay ? "توقف پخش خودکار" : "شروع پخش خودکار"}
          >
            {isAutoPlay ? (
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
          
          <div className="h-4 w-px bg-slate-800/80" />
          
          {/* Horizontal dot/step connector timeline */}
          <div className="flex gap-3 items-center">
            {Array.from({ length: 10 }).map((_, i) => {
              const stepNum = i + 1;
              const isAct = phase === stepNum;
              return (
                <button
                  key={stepNum}
                  onClick={() => {
                    setPhase(stepNum);
                    setIsAutoPlay(false);
                  }}
                  className="relative group flex flex-col items-center transition-all duration-300 cursor-pointer"
                >
                  <span className={`text-[9.5px]/none font-mono font-extrabold transition-all duration-300 ${isAct ? 'text-amber-400 scale-110' : 'text-slate-500 group-hover:text-slate-350'}`}>
                    {String(stepNum).padStart(2, '0')}
                  </span>
                  <span className={`w-1 h-1 rounded-full mt-1.5 transition-all ${isAct ? 'bg-amber-500 scale-125 shadow-[0_0_6px_#f59e0b]' : 'bg-slate-800'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile slide navigator is now embedded inside the main details card above the phone floaters, keeping this bottom region perfectly tidy and zero-clutter */}

        {/* ── SYSTEM CTA HOVER ACTION REVEAL MATERIALS LAYER (Active on Scene 10) ── */}
        <div className="flex flex-col gap-3 w-full md:w-auto items-end">
          
          <AnimatePresence>
            {phase >= 9 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="flex flex-col sm:flex-row gap-3 w-full justify-end z-20 pointer-events-auto"
              >
                {/* CTA Inquiring pricing */}
                <button
                  onClick={() => onNavigate && onNavigate(AppView.INQUIRY)}
                  className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-2xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <span>{config.ctaInquiryText}</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-950" />
                </button>

                {/* CTA Dynamic Services page */}
                <button
                  onClick={() => onNavigate && onNavigate(AppView.SERVICES)}
                  className="px-6 py-4 rounded-2xl bg-[#090e24]/95 border border-slate-800 hover:border-slate-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer text-slate-250"
                >
                  <span>{config.ctaServicesText}</span>
                  <Sliders className="w-4 h-4 text-[#cca43b]" />
                </button>

                {/* CTA Catalog view items */}
                <button
                  onClick={() => onNavigate && onNavigate(AppView.PORTFOLIO)}
                  className="px-6 py-4 rounded-2xl bg-[#090e24]/95 border border-slate-800 hover:border-slate-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer text-slate-250"
                >
                  <span>{config.ctaPortfolioText}</span>
                  <Layers className="w-4 h-4 text-slate-400" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drag instruction notice callout */}
          <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono justify-end">
            <span>صفحه را بکشید تا زاویه دوربین تغییر کند</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          </div>
        </div>

      </div>

      {/* ── SKIP BUTTON OR RETURN BUTTON ENTERING HOMEPAGE ── */}
      <button 
        onClick={() => {
          const catSec = document.getElementById('catalog-section');
          if (catSec) {
            catSec.scrollIntoView({ behavior: 'smooth' });
          } else if (onNavigate) {
            onNavigate(AppView.HOME);
          }
        }}
        className="absolute bottom-6 left-6 z-30 bg-slate-950/90 border border-slate-800/80 rounded-full px-5 py-3 hover:bg-slate-900 hover:text-white transition-all text-xs font-black flex items-center gap-2 pointer-events-auto"
      >
        <span>ورود مستقیم به سایت</span>
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* ── MOBILE CINEMATIC INTRO: BRAND SLOGAN (VISIBLE ONLY ON MOBILE) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: [0, 1, 1, 0], scale: 1 }}
        transition={{ duration: 6, times: [0, 0.1, 0.9, 1], ease: "easeInOut" }}
        className="absolute top-8 left-0 w-full text-white p-4 text-center z-[999] xl:hidden pointer-events-none"
      >
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-[0_0_10px_rgba(204,164,59,0.5)]">
          {config.brandTitle}
        </h3>
        <p className="text-sm font-semibold tracking-widest text-slate-300 mt-2 uppercase">
          {config.brandSlogan}
        </p>
      </motion.div>
    </div>
  );
};
