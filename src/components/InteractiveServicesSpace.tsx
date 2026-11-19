import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Link } from 'react-router-dom';
import { Scissors, Printer, Box, Cpu, ArrowLeft, CheckCircle2, Hand, ArrowUpDown } from 'lucide-react';

type ServiceArtifactId = 'dieline' | 'offset' | 'corrugated' | 'cad';

interface ServiceItem {
  id: ServiceArtifactId;
  index: string;
  title: string;
  subtitle: string;
  description: string;
  specs: string[];
  toolPath: string;
  toolLabel: string;
  servicePath: string;
  icon: React.FC<{ className?: string }>;
}

const SERVICES: ServiceItem[] = [
  {
    id: 'dieline',
    index: '01',
    title: 'مهندسی قالب دایکات و تیغ لیزری',
    subtitle: 'تخته قالب برش لیزری و تیغ‌های دقیق Bobst',
    description:
      'طراحی تخصصی قالب‌های تخت و روتاری با خطوط تا (Crease) و برش (Cut) مهندسی‌شده برای جعبه‌های دارویی، بهداشتی و صادراتی.',
    specs: ['تلورانس خط تا ±۰.۱۵ میلی‌متر', 'جبران ضخامت ورق و جهت الیاف', 'خروجی مستقیم DXF و AutoCAD'],
    toolPath: '/tools/dieline',
    toolLabel: 'ورود به جعبه‌ساز ۳D',
    servicePath: '/services/die-cutting-engineering',
    icon: Scissors,
  },
  {
    id: 'offset',
    index: '02',
    title: 'چاپ افست ۵ رنگ و طلاکوب لوکس',
    subtitle: 'سیلندرهای CMYK + برج ورنی، UV موضعی و فویل ۲۴ عیار',
    description:
      'چاپ افست هم‌زمان تا ابعاد شیت ۷۰×۱۰۰ و بزرگ‌تر با دقت رنگ پنتون، سلفون مات و مخملی و طلاکوب حرارتی.',
    specs: ['کالیبراسیون رنگی CMYK و پنتون', 'سلفون حرارتی، UV برجسته و طلاکوب', 'بهینه‌سازی چیدمان فرم زینک'],
    toolPath: '/tools/design-studio',
    toolLabel: 'استودیو طراحی و چاپ',
    servicePath: '/services/offset-printing',
    icon: Printer,
  },
  {
    id: 'corrugated',
    index: '03',
    title: 'تولید ورق و کارتن ۳ و ۵ لایه (BCT)',
    subtitle: 'ساختار موجی فلوت E / B / C / BC با لاینر کرافت مقاوم',
    description:
      'مهندسی ترکیب ورق کارتن مادر و جعبه‌های صادراتی با محاسبه مقاومت فشاری ستونی (BCT) برای انبارداری و سردخانه.',
    specs: ['تحلیل مقاومت فشاری McKee BCT', 'مقاوم در برابر رطوبت سردخانه', 'فلوت‌های E، B، C و ترکیبی BC'],
    toolPath: '/products',
    toolLabel: 'مشاهده ساختارهای کارتن',
    servicePath: '/services/corrugated-packaging',
    icon: Box,
  },
  {
    id: 'cad',
    index: '04',
    title: 'مدل‌سازی سه‌بعدی CAD و ماکت قبل از تیراژ',
    subtitle: 'شبیه‌سازی تاشدن، تداخل زبانه‌ها و تایید نهایی قبل از ساخت قالب',
    description:
      'مشاهده کامل جعبه در فضای سه‌بعدی تعاملی و بررسی تناسب ابعاد محصول پیش از صرف هزینه ساخت تیغ و چاپ تیراژ.',
    specs: ['پیش‌نمایش تاشدن ۰ تا ۱۰۰ درصد', 'محیط آنلاین اتوکد بدون نصب', 'پشتیبانی استانداردهای FEFCO و ECMA'],
    toolPath: '/tools/autocad',
    toolLabel: 'ورود به محیط CAD آنلاین',
    servicePath: '/services/structural-3d-cad',
    icon: Cpu,
  },
];

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

function buildFluteWaveGeometry(
  width: number,
  depth: number,
  amplitude: number,
  cycles: number,
  thickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = (u - 0.5) * width;
    const y = Math.sin(u * Math.PI * 2 * cycles) * amplitude;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    const x = (u - 0.5) * width;
    const y = Math.sin(u * Math.PI * 2 * cycles) * amplitude - thickness;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const extrude = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });
  extrude.translate(0, 0, -depth / 2);
  return extrude;
}

function createServiceArtifact(id: ServiceArtifactId): {
  group: THREE.Group;
  animate: (t: number) => void;
} {
  const group = new THREE.Group();

  if (id === 'dieline') {
    // Birch plywood die-board + metallic cutting rules + brass creasing matrix
    const boardMat = new THREE.MeshStandardMaterial({
      color: '#b0895c',
      roughness: 0.72,
      metalness: 0.05,
    });
    const baseBoard = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.14, 2.2), boardMat);
    baseBoard.castShadow = true;
    baseBoard.receiveShadow = true;
    group.add(baseBoard);

    const frameMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.35,
      metalness: 0.85,
    });
    const outerFrame = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.08, 2.32), frameMat);
    outerFrame.position.y = -0.04;
    group.add(outerFrame);

    // Steel cutting blades raised above board
    const steelMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.16,
      metalness: 0.96,
    });
    const creaseMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      roughness: 0.25,
      metalness: 0.88,
      emissive: '#78350f',
      emissiveIntensity: 0.35,
    });

    const cutRects: Array<[number, number, number, number]> = [
      [2.4, 0.025, 0, -0.75],
      [2.4, 0.025, 0, 0.75],
      [0.025, 1.5, -1.2, 0],
      [0.025, 1.5, 1.2, 0],
      [0.025, 0.65, -0.5, 0.42],
      [0.025, 0.65, 0.5, 0.42],
    ];
    cutRects.forEach(([w, d, x, z]) => {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), steelMat);
      blade.position.set(x, 0.14, z);
      blade.castShadow = true;
      group.add(blade);
    });

    const creaseLines: Array<[number, number, number, number]> = [
      [1.0, 0.02, 0, 0.1],
      [0.02, 1.5, -0.5, 0],
      [0.02, 1.5, 0.5, 0],
    ];
    creaseLines.forEach(([w, d, x, z]) => {
      const rule = new THREE.Mesh(new THREE.BoxGeometry(w, 0.17, d), creaseMat);
      rule.position.set(x, 0.12, z);
      group.add(rule);
    });

    // Laser beam head floating above die-board
    const laserHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, 0.38, 24),
      new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.9, roughness: 0.2 })
    );
    laserHead.position.set(0, 0.95, 0);
    group.add(laserHead);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.75, 12),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.75 })
    );
    beam.position.set(0, 0.5, 0);
    group.add(beam);

    return {
      group,
      animate: (t: number) => {
        const lx = Math.sin(t * 1.3) * 0.9;
        const lz = Math.cos(t * 0.9) * 0.55;
        laserHead.position.x = lx;
        laserHead.position.z = lz;
        beam.position.x = lx;
        beam.position.z = lz;
      },
    };
  }

  if (id === 'offset') {
    // 5-Color Offset Cylinder Stack (CMYK + 24K Gold Varnish/Foil)
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#111827',
      metalness: 0.85,
      roughness: 0.3,
    });
    const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.55, 2.7), frameMat);
    leftSide.position.set(-1.35, 0.45, 0);
    leftSide.castShadow = true;
    group.add(leftSide);

    const rightSide = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.55, 2.7), frameMat);
    rightSide.position.set(1.35, 0.45, 0);
    rightSide.castShadow = true;
    group.add(rightSide);

    const inkColors = ['#06b6d4', '#ec4899', '#eab308', '#1e293b', '#e5b84b'];
    const rollers: THREE.Mesh[] = [];
    inkColors.forEach((hex, idx) => {
      const z = -0.96 + idx * 0.48;
      const y = idx % 2 === 0 ? 0.65 : 0.95;
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 2.52, 32),
        new THREE.MeshStandardMaterial({
          color: hex,
          metalness: idx === 4 ? 0.95 : 0.62,
          roughness: idx === 4 ? 0.16 : 0.28,
        })
      );
      cyl.rotation.z = Math.PI / 2;
      cyl.position.set(0, y, z);
      cyl.castShadow = true;
      group.add(cyl);
      rollers.push(cyl);

      // End gear hub
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16),
        frameMat
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.set(1.44, y, z);
      group.add(hub);
    });

    // Printed sheet passing below cylinders
    const sheet = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.02, 2.9),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.45, metalness: 0.05 })
    );
    sheet.position.set(0, 0.15, 0);
    sheet.receiveShadow = true;
    group.add(sheet);

    const goldStrip = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.025, 0.55),
      new THREE.MeshStandardMaterial({ color: '#e5b84b', metalness: 0.96, roughness: 0.14 })
    );
    goldStrip.position.set(0, 0.165, 0.35);
    group.add(goldStrip);

    return {
      group,
      animate: (t: number) => {
        rollers.forEach((r, i) => {
          r.rotation.x = t * (i % 2 === 0 ? 1.8 : -1.8);
        });
        sheet.position.z = Math.sin(t * 0.8) * 0.18;
        goldStrip.position.z = 0.35 + Math.sin(t * 0.8) * 0.18;
      },
    };
  }

  if (id === 'corrugated') {
    // Exploded 5-ply BC-Flute corrugated board cross-section
    const kraftOuterMat = new THREE.MeshStandardMaterial({ color: '#c89b66', roughness: 0.85, metalness: 0.02 });
    const kraftFluteMat = new THREE.MeshStandardMaterial({ color: '#9c6b3b', roughness: 0.88, metalness: 0.02 });
    const innerWhiteMat = new THREE.MeshStandardMaterial({ color: '#ebe7df', roughness: 0.65, metalness: 0.03 });

    const layers: Array<{ mesh: THREE.Mesh; baseY: number }> = [];

    const bottomLiner = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, 1.9), kraftOuterMat);
    bottomLiner.castShadow = true;
    bottomLiner.receiveShadow = true;
    group.add(bottomLiner);
    layers.push({ mesh: bottomLiner, baseY: 0.05 });

    const cFlute = new THREE.Mesh(buildFluteWaveGeometry(2.68, 1.88, 0.11, 7, 0.03), kraftFluteMat);
    cFlute.castShadow = true;
    group.add(cFlute);
    layers.push({ mesh: cFlute, baseY: 0.25 });

    const midLiner = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.04, 1.9), kraftOuterMat);
    midLiner.castShadow = true;
    group.add(midLiner);
    layers.push({ mesh: midLiner, baseY: 0.45 });

    const bFlute = new THREE.Mesh(buildFluteWaveGeometry(2.68, 1.88, 0.075, 11, 0.026), kraftFluteMat);
    bFlute.castShadow = true;
    group.add(bFlute);
    layers.push({ mesh: bFlute, baseY: 0.61 });

    const topLiner = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, 1.9), innerWhiteMat);
    topLiner.castShadow = true;
    group.add(topLiner);
    layers.push({ mesh: topLiner, baseY: 0.77 });

    // Brass compression ring above board illustrating BCT test
    const loadRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.02, 12, 48),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.9, roughness: 0.2 })
    );
    loadRing.rotation.x = Math.PI / 2;
    loadRing.position.y = 1.15;
    group.add(loadRing);

    return {
      group,
      animate: (t: number) => {
        const breathe = (Math.sin(t * 1.4) * 0.5 + 0.5) * 0.16;
        layers.forEach((l, idx) => {
          l.mesh.position.y = l.baseY + idx * breathe;
        });
        loadRing.position.y = 1.12 + 4 * breathe + Math.sin(t * 2) * 0.04;
      },
    };
  }

  // 'cad': Parametric wireframe + solid translucent CAD blueprint cube
  const solidCore = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 1.25, 1.45),
    new THREE.MeshStandardMaterial({
      color: '#0ea5e9',
      roughness: 0.2,
      metalness: 0.2,
      transparent: true,
      opacity: 0.24,
    })
  );
  solidCore.position.y = 0.68;
  group.add(solidCore);

  const wireFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.82, 1.32, 1.52)),
    new THREE.LineBasicMaterial({ color: '#38bdf8' })
  );
  wireFrame.position.y = 0.68;
  group.add(wireFrame);

  const innerFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.25, 0.85, 1.05)),
    new THREE.LineBasicMaterial({ color: '#f59e0b' })
  );
  innerFrame.position.y = 0.68;
  group.add(innerFrame);

  // Orbiting CAD calibration ring
  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.48, 0.015, 12, 64),
    new THREE.MeshStandardMaterial({ color: '#e5b84b', metalness: 0.95, roughness: 0.18 })
  );
  orbitRing.rotation.x = Math.PI / 2.6;
  orbitRing.position.y = 0.68;
  group.add(orbitRing);

  return {
    group,
    animate: (t: number) => {
      solidCore.rotation.y = t * 0.35;
      wireFrame.rotation.y = t * 0.35;
      innerFrame.rotation.y = -t * 0.5;
      orbitRing.rotation.z = t * 0.4;
    },
  };
}

export const InteractiveServicesSpace: React.FC = () => {
  const [selectedId, setSelectedId] = useState<ServiceArtifactId>('dieline');
  const [hasEnteredProximity, setHasEnteredProximity] = useState<boolean>(false);
  const [touchInspectMode, setTouchInspectMode] = useState<boolean>(false);
  const touchInspectRef = useRef<boolean>(false);
  const spinVelRef = useRef<number>(0);
  const spinOffsetRef = useRef<number>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const switchArtifactRef = useRef<((id: ServiceArtifactId) => void) | null>(null);
  const touchToggleHandleRef = useRef<((active: boolean) => void) | null>(null);

  const activeService = SERVICES.find((s) => s.id === selectedId) || SERVICES[0];

  useEffect(() => {
    switchArtifactRef.current?.(selectedId);
  }, [selectedId]);

  useEffect(() => {
    touchInspectRef.current = touchInspectMode;
    touchToggleHandleRef.current?.(touchInspectMode);
  }, [touchInspectMode]);

  // Defer second WebGL context creation until user scrolls near this section
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || hasEnteredProximity) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHasEnteredProximity(true);
          obs.disconnect();
        }
      },
      { rootMargin: '320px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasEnteredProximity]);

  useEffect(() => {
    if (!hasEnteredProximity) return;
    const mount = mountRef.current;
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
      });
    } catch {
      return;
    }

    const w = mount.clientWidth || 560;
    const h = mount.clientHeight || 420;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, lowPowerMode ? 1.15 : 1.5)
    );
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = !lowPowerMode;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090e1b');
    scene.fog = new THREE.FogExp2('#090e1b', 0.06);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 80);
    camera.position.set(3.4, 2.3, 3.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.target.set(0, 0.45, 0);

    const isTouchFirst = isCompactViewport || isCoarsePointer;
    if (isTouchFirst && !touchInspectRef.current) {
      controls.enabled = false;
      renderer.domElement.style.touchAction = 'pan-y';
    } else {
      controls.enabled = true;
      renderer.domElement.style.touchAction = 'none';
    }

    touchToggleHandleRef.current = (active: boolean) => {
      if (isTouchFirst) {
        controls.enabled = active;
        renderer.domElement.style.touchAction = active ? 'none' : 'pan-y';
      } else {
        controls.enabled = true;
        renderer.domElement.style.touchAction = 'none';
      }
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.pointerType === 'mouse') {
        controls.enabled = true;
        renderer.domElement.style.touchAction = 'none';
      } else if (ev.pointerType === 'touch' && !touchInspectRef.current) {
        controls.enabled = false;
        renderer.domElement.style.touchAction = 'pan-y';
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });

    let tTrack = { active: false, startX: 0, startY: 0, lastX: 0, axis: 'none' as 'none' | 'x' | 'y' };
    const onTouchStart = (ev: TouchEvent) => {
      if (touchInspectRef.current || ev.touches.length !== 1) {
        tTrack.active = false;
        return;
      }
      const p = ev.touches[0];
      tTrack = { active: true, startX: p.clientX, startY: p.clientY, lastX: p.clientX, axis: 'none' };
    };
    const onTouchMove = (ev: TouchEvent) => {
      if (!tTrack.active || touchInspectRef.current || ev.touches.length !== 1) return;
      const p = ev.touches[0];
      const dxAbs = Math.abs(p.clientX - tTrack.startX);
      const dyAbs = Math.abs(p.clientY - tTrack.startY);
      if (tTrack.axis === 'none') {
        if (dxAbs < 8 && dyAbs < 8) return;
        if (dyAbs >= dxAbs * 0.9) {
          tTrack.axis = 'y';
          return;
        }
        tTrack.axis = 'x';
      }
      if (tTrack.axis === 'x') {
        const dx = p.clientX - tTrack.lastX;
        tTrack.lastX = p.clientX;
        spinOffsetRef.current += dx * 0.009;
        spinVelRef.current = THREE.MathUtils.clamp(dx * 0.14, -4, 4);
      }
    };
    const onTouchEnd = () => {
      tTrack.active = false;
      tTrack.axis = 'none';
    };
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: true });
    renderer.domElement.addEventListener('touchcancel', onTouchEnd, { passive: true });

    scene.add(new THREE.HemisphereLight('#c7d9ff', '#1c1917', 0.7));
    const key = new THREE.DirectionalLight('#fff2db', 2.0);
    key.position.set(4, 6, 4);
    key.castShadow = !lowPowerMode;
    key.shadow.mapSize.set(512, 512);
    scene.add(key);

    const rim = new THREE.DirectionalLight('#38bdf8', 1.1);
    rim.position.set(-4, 3, -4);
    scene.add(rim);

    // Subtle dark stage platform
    const stageDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.25, 0.12, 48),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.45, metalness: 0.55 })
    );
    stageDisc.position.y = -0.14;
    stageDisc.receiveShadow = true;
    scene.add(stageDisc);

    const ringTrim = new THREE.Mesh(
      new THREE.TorusGeometry(2.12, 0.015, 12, 72),
      new THREE.MeshStandardMaterial({ color: '#e5b84b', roughness: 0.2, metalness: 0.95 })
    );
    ringTrim.rotation.x = Math.PI / 2;
    ringTrim.position.y = -0.08;
    scene.add(ringTrim);

    const pivot = new THREE.Group();
    scene.add(pivot);

    let activeArtifact = createServiceArtifact(selectedId);
    pivot.add(activeArtifact.group);

    switchArtifactRef.current = (id: ServiceArtifactId) => {
      pivot.remove(activeArtifact.group);
      activeArtifact.group.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      activeArtifact = createServiceArtifact(id);
      pivot.add(activeArtifact.group);
    };

    const onResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      if (nw > 0 && nh > 0) {
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      }
    };
    window.addEventListener('resize', onResize, { passive: true });

    let frameId = 0;
    let isLoopScheduled = false;
    let disposed = false;
    let isVisible = true;
    let firstFrameDrawn = false;
    const start = performance.now();

    const scheduleTick = () => {
      if (disposed || isLoopScheduled) return;
      isLoopScheduled = true;
      if (isSoftwareGl) frameId = window.setTimeout(tick, 20);
      else frameId = requestAnimationFrame(tick);
    };

    const wakeTick = () => {
      if (disposed) return;
      if (isVisible && !document.hidden) {
        scheduleTick();
      }
    };

    const visObserver = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
        if (isVisible) wakeTick();
      },
      { threshold: 0.05 }
    );
    if (sectionRef.current) {
      visObserver.observe(sectionRef.current);
    }

    const onVisibilityChange = () => {
      if (!document.hidden) wakeTick();
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
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) frameId = window.setTimeout(poll, 5);
        else {
          if (sync) gl.deleteSync(sync);
          isLoopScheduled = true;
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    let prevTick = performance.now();
    const tick = () => {
      isLoopScheduled = false;
      if (disposed) return;
      if ((!isVisible || document.hidden) && firstFrameDrawn) {
        return;
      }
      firstFrameDrawn = true;
      const now = performance.now();
      const dt = Math.min(0.05, (now - prevTick) / 1000);
      prevTick = now;
      if (Math.abs(spinVelRef.current) > 0.002) {
        spinOffsetRef.current += spinVelRef.current * dt;
        spinVelRef.current *= Math.exp(-5.5 * dt);
      } else {
        spinVelRef.current = 0;
      }
      const t = (now - start) / 1000;
      pivot.rotation.y = t * 0.22 + spinOffsetRef.current;
      activeArtifact.animate(t);
      controls.update();
      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else scheduleTick();
    };

    scheduleTick();

    return () => {
      disposed = true;
      touchToggleHandleRef.current = null;
      visObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown, { capture: true });
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      renderer.domElement.removeEventListener('touchcancel', onTouchEnd);
      controls.dispose();
      envRT.dispose();
      renderer.dispose();
    };
  }, [hasEnteredProximity]);

  return (
    <section
      ref={sectionRef}
      aria-label="فضای سه‌بعدی تعاملی خدمات صنعتی اشک قلم"
      className="relative w-full py-10 md:py-20 bg-[#070b14] text-slate-100 border-b border-slate-800/80"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6 md:mb-10">
          <div>
            <p className="text-xs font-bold text-amber-400 mb-1.5">
              آتلیه سه‌بعدی خدمات مهندسی و چاپ
            </p>
            <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-white [text-wrap:balance]">
              چرخه کامل تولید از مدل ۳D تا چاپ افست ۵ رنگ
            </h2>
          </div>
          <Link
            to="/services"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>همه خدمات صنعتی</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-stretch">
          {/* Service Selector: sleek 2x2 compact cards on mobile, full stack on lg+ */}
          <div className="lg:col-span-5 grid grid-cols-2 lg:flex lg:flex-col gap-2 sm:gap-3">
            {SERVICES.map((svc) => {
              const Icon = svc.icon;
              const isSelected = svc.id === selectedId;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setSelectedId(svc.id)}
                  className={`text-right p-3 md:p-5 rounded-xl md:rounded-2xl border transition-colors cursor-pointer flex items-center lg:items-start gap-2.5 lg:gap-4 ${
                    isSelected
                      ? 'bg-[#10182b] border-amber-500/60 shadow-lg'
                      : 'bg-[#0b101d] border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`p-2 md:p-3 rounded-lg md:rounded-xl border shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-900 text-amber-400 border-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="hidden lg:block text-xs font-mono font-bold text-slate-500 mb-0.5">{svc.index}</span>
                    <h3 className="text-xs sm:text-sm md:text-base font-black text-white leading-snug line-clamp-2 lg:line-clamp-none">
                      {svc.title}
                    </h3>
                    <p className="hidden lg:block text-xs text-slate-400 leading-relaxed mt-1">{svc.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive 3D Artifact Stage + Specs Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl md:rounded-3xl overflow-hidden bg-[#090e1b] border border-slate-800 shadow-2xl">
            <div className="relative h-56 sm:h-72 md:h-96 w-full">
              <div
                ref={mountRef}
                className={`w-full h-full cursor-grab active:cursor-grabbing ${
                  touchInspectMode ? 'touch-none' : 'touch-pan-y md:touch-none'
                }`}
              />
              <div className="hidden sm:block absolute top-4 right-4 pointer-events-none">
                <span className="text-[11px] font-mono text-slate-400 bg-[#060913]/85 px-3 py-1.5 rounded-lg border border-slate-800">
                  مدل سه‌بعدی تعاملی · برای چرخش بکشید
                </span>
              </div>
              <div className="sm:hidden absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10">
                <button
                  type="button"
                  onClick={() => setTouchInspectMode((v) => !v)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border shadow-lg whitespace-nowrap cursor-pointer ${
                    touchInspectMode
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-[#060913]/85 text-amber-200 border-amber-400/35'
                  }`}
                >
                  {touchInspectMode ? (
                    <>
                      <ArrowUpDown className="w-3 h-3" />
                      <span>بازگشت به اسکرول صفحه</span>
                    </>
                  ) : (
                    <>
                      <Hand className="w-3 h-3 text-amber-400" />
                      <span>چرخش آزاد ۳D</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 md:p-7 border-t border-slate-800/90 flex-1 flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-black text-white mb-1.5">
                  {activeService.title}
                </h3>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-3.5">
                  {activeService.description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {activeService.specs.map((sp, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-200 bg-[#0d1424] border border-slate-800/80 rounded-xl px-3 py-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="leading-snug">{sp}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800/70">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={activeService.toolPath}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span>{activeService.toolLabel}</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to={activeService.servicePath}
                    className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition-colors whitespace-nowrap"
                  >
                    مشخصات فنی
                  </Link>
                </div>

                <Link
                  to="/inquiry"
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 whitespace-nowrap"
                >
                  ثبت استعلام فوری
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
