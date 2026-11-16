import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AlertCircle } from 'lucide-react';
import {
  createContactShadowTexture,
  createSpecialEffectOverlayTexture,
  createSurfacePBRMaps,
  PACKAGING_SURFACE_PRESETS,
  SurfacePBRMaps,
  SurfacePresetId,
} from './three/packagingTextures';

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

export type StudioEnvPreset = 'dark_studio' | 'warm_atelier' | 'bright_showroom';
export type InnerBoardStyle = 'auto' | 'kraft' | 'white' | 'grey';

export interface ThreeDPreviewProps {
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  paperType?: 'coated' | 'kraft' | 'corrugated';
  surfacePreset?: SurfacePresetId;
  innerBoardStyle?: InnerBoardStyle;
  textureScale?: number;
  grainIntensity?: number;
  studioEnvPreset?: StudioEnvPreset;
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
  textureUrl?: string | null;
  lightIntensity?: number;
  showDimensions?: boolean;
  materialThickness?: number;
}

function isSoftwareWebGL(): boolean {
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

function resolveSurfacePreset(
  surfacePreset?: SurfacePresetId,
  paperType?: 'coated' | 'kraft' | 'corrugated'
): SurfacePresetId {
  if (surfacePreset) return surfacePreset;
  if (paperType === 'corrugated') return 'corrugated_e';
  if (paperType === 'kraft') return 'kraft_natural';
  return 'glossy_coated';
}

function disposePbrMaps(maps: SurfacePBRMaps | null) {
  if (!maps) return;
  maps.map.dispose();
  maps.bumpMap.dispose();
  maps.roughnessMap.dispose();
  maps.edgeMap.dispose();
  maps.edgeBumpMap.dispose();
}

export const ThreeDPreview: React.FC<ThreeDPreviewProps> = ({
  width = 200,
  height = 150,
  depth = 100,
  color = '#d4a373',
  paperType = 'coated',
  surfacePreset,
  innerBoardStyle = 'auto',
  textureScale = 1,
  grainIntensity = 1,
  studioEnvPreset = 'dark_studio',
  specialEffect = 'none',
  wireframe = false,
  autoRotate = true,
  cameraOrbit = false,
  isOpenRatio = 0,
  isExploded = false,
  flapDirections,
  textureUrl = null,
  viewAngle = 'perspective',
  resetTrigger = 0,
  lightIntensity = 1.1,
  materialThickness = 0.45,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const stateRef = useRef({
    width,
    height,
    depth,
    color,
    paperType,
    surfacePreset,
    innerBoardStyle,
    textureScale,
    grainIntensity,
    studioEnvPreset,
    specialEffect,
    wireframe,
    autoRotate,
    cameraOrbit,
    isOpenRatio,
    isExploded,
    flapDirections,
    textureUrl,
    viewAngle,
    lightIntensity,
    materialThickness,
  });

  stateRef.current = {
    width,
    height,
    depth,
    color,
    paperType,
    surfacePreset,
    innerBoardStyle,
    textureScale,
    grainIntensity,
    studioEnvPreset,
    specialEffect,
    wireframe,
    autoRotate,
    cameraOrbit,
    isOpenRatio,
    isExploded,
    flapDirections,
    textureUrl,
    viewAngle,
    lightIntensity,
    materialThickness,
  };

  const rebuildRef = useRef<(() => void) | null>(null);
  const envUpdateRef = useRef<(() => void) | null>(null);
  const cameraPresetRef = useRef<((angle: ThreeDPreviewProps['viewAngle']) => void) | null>(null);

  useEffect(() => {
    rebuildRef.current?.();
  }, [
    width,
    height,
    depth,
    color,
    paperType,
    surfacePreset,
    innerBoardStyle,
    textureScale,
    grainIntensity,
    specialEffect,
    wireframe,
    materialThickness,
    textureUrl,
  ]);

  useEffect(() => {
    envUpdateRef.current?.();
  }, [studioEnvPreset, lightIntensity]);

  useEffect(() => {
    cameraPresetRef.current?.(viewAngle);
  }, [viewAngle, resetTrigger]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    setRenderError(null);

    const swGl = isSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !swGl,
        alpha: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch (err: any) {
      setRenderError('خطا در راه‌اندازی رندر سه‌بعدی WebGL: ' + (err?.message || 'مشکل در شتاب‌دهنده گرافیکی'));
      return;
    }

    const wPx = mount.clientWidth || 480;
    const hPx = mount.clientHeight || 360;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(swGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(wPx, hPx);
    renderer.shadowMap.enabled = !swGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b14');
    scene.fog = new THREE.FogExp2('#070b14', 0.00085);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, wPx / hPx, 1, 3200);
    camera.position.set(280, 220, 340);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !swGl;
    controls.dampingFactor = 0.06;
    controls.autoRotateSpeed = 1.6;
    controls.target.set(0, 0, 0);

    const hemi = new THREE.HemisphereLight('#c7d9ff', '#1e1b18', 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#fff5e4', 1.8);
    keyLight.position.set(250, 420, 320);
    keyLight.castShadow = !swGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 0.9);
    rimLight.position.set(-240, 140, -240);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight('#e2e8f0', 0.55);
    fillLight.position.set(0, -180, 260);
    scene.add(fillLight);

    const maxAniso =
      typeof renderer.capabilities.getMaxAnisotropy === 'function'
        ? renderer.capabilities.getMaxAnisotropy()
        : 1;
    const shadowTex = createContactShadowTexture();
    const effectOverlayTex = createSpecialEffectOverlayTexture(maxAniso);

    const contactPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 520),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.45, depthWrite: false })
    );
    contactPlane.rotation.x = -Math.PI / 2;
    scene.add(contactPlane);

    const boxRoot = new THREE.Group();
    scene.add(boxRoot);

    let topFlapGroup: THREE.Group | null = null;
    let bottomFlapGroup: THREE.Group | null = null;
    let leftFlapGroup: THREE.Group | null = null;
    let rightFlapGroup: THREE.Group | null = null;
    let frontPanel: THREE.Mesh | null = null;
    let backPanel: THREE.Mesh | null = null;
    let leftPanel: THREE.Mesh | null = null;
    let rightPanel: THREE.Mesh | null = null;
    let baseH = 150;
    let baseW = 200;
    let baseD = 100;

    let activePbrMaps: SurfacePBRMaps | null = null;
    let activeInnerMaps: SurfacePBRMaps | null = null;
    let activeUploadedTex: THREE.Texture | null = null;
    let disposed = false;

    const applyEnvironment = () => {
      const s = stateRef.current;
      const mult = s.lightIntensity || 1;
      if (s.studioEnvPreset === 'warm_atelier') {
        const bg = new THREE.Color('#14100c');
        scene.background = bg;
        (scene.fog as THREE.FogExp2).color.copy(bg);
        hemi.color.set('#ffe5c4');
        hemi.groundColor.set('#2a1d12');
        hemi.intensity = 0.82 * mult;
        keyLight.color.set('#ffebd2');
        keyLight.intensity = 1.95 * mult;
        rimLight.color.set('#f59e0b');
        rimLight.intensity = 0.78 * mult;
        fillLight.intensity = 0.55 * mult;
      } else if (s.studioEnvPreset === 'bright_showroom') {
        const bg = new THREE.Color('#1b2330');
        scene.background = bg;
        (scene.fog as THREE.FogExp2).color.copy(bg);
        hemi.color.set('#f8fafc');
        hemi.groundColor.set('#334155');
        hemi.intensity = 1.15 * mult;
        keyLight.color.set('#ffffff');
        keyLight.intensity = 2.05 * mult;
        rimLight.color.set('#93c5fd');
        rimLight.intensity = 0.95 * mult;
        fillLight.intensity = 0.85 * mult;
      } else {
        const bg = new THREE.Color('#070b14');
        scene.background = bg;
        (scene.fog as THREE.FogExp2).color.copy(bg);
        hemi.color.set('#c7d9ff');
        hemi.groundColor.set('#1e1b18');
        hemi.intensity = 0.85 * mult;
        keyLight.color.set('#fff5e4');
        keyLight.intensity = 1.8 * mult;
        rimLight.color.set('#38bdf8');
        rimLight.intensity = 0.9 * mult;
        fillLight.intensity = 0.55 * mult;
      }
    };
    envUpdateRef.current = applyEnvironment;

    const clearBox = () => {
      while (boxRoot.children.length > 0) {
        const child = boxRoot.children[0];
        boxRoot.remove(child);
        child.traverse((obj) => {
          if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
          const m = (obj as THREE.Mesh).material;
          if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
          else if (m) m.dispose();
        });
      }
      disposePbrMaps(activePbrMaps);
      activePbrMaps = null;
      disposePbrMaps(activeInnerMaps);
      activeInnerMaps = null;
      if (activeUploadedTex) {
        activeUploadedTex.dispose();
        activeUploadedTex = null;
      }
    };

    const buildBox = () => {
      clearBox();
      const s = stateRef.current;
      const bw = Math.max(30, Number(s.width) || 200);
      const bh = Math.max(30, Number(s.height) || 150);
      const bd = Math.max(30, Number(s.depth) || 100);
      const presetId = resolveSurfacePreset(s.surfacePreset, s.paperType);
      const preset = PACKAGING_SURFACE_PRESETS.find((p) => p.id === presetId) || PACKAGING_SURFACE_PRESETS[0];

      // Realistic wall thickness scaled cleanly for visual edge inspection
      const minThick = preset.isCorrugated ? 2.4 : 1.3;
      const th = Math.max(minThick, Math.min(7.5, (Number(s.materialThickness) || 0.45) * (preset.isCorrugated ? 2.2 : 4.2)));
      baseW = bw;
      baseH = bh;
      baseD = bd;

      contactPlane.position.y = -bh / 2 - 5;

      const scale = Math.max(0.4, Math.min(3.0, Number(s.textureScale) || 1));
      const grain = Math.max(0.1, Math.min(2.5, Number(s.grainIntensity) || 1));

      activePbrMaps = createSurfacePBRMaps(presetId, maxAniso, scale);

      const outerColor = new THREE.Color(s.color || preset.defaultColor);
      const outerMat = new THREE.MeshPhysicalMaterial({
        color: outerColor,
        map: activePbrMaps.map,
        bumpMap: activePbrMaps.bumpMap,
        bumpScale: preset.bumpScale * grain,
        roughnessMap: activePbrMaps.roughnessMap,
        roughness: preset.roughness,
        metalness: preset.metalness,
        clearcoat: preset.clearcoat,
        clearcoatRoughness: preset.clearcoatRoughness,
        sheen: preset.sheen,
        sheenRoughness: preset.sheenRoughness,
        sheenColor: outerColor.clone().lerp(new THREE.Color('#ffffff'), 0.25),
        anisotropy: preset.anisotropy,
        envMapIntensity: 1.05,
        wireframe: Boolean(s.wireframe),
      });

      if (s.textureUrl) {
        const loader = new THREE.TextureLoader();
        const uploaded = loader.load(s.textureUrl, () => {
          if (!disposed) {
            uploaded.colorSpace = THREE.SRGBColorSpace;
            uploaded.anisotropy = maxAniso;
            uploaded.wrapS = THREE.ClampToEdgeWrapping;
            uploaded.wrapT = THREE.ClampToEdgeWrapping;
            uploaded.needsUpdate = true;
            outerMat.map = uploaded;
            outerMat.color.set('#ffffff');
            outerMat.needsUpdate = true;
          }
        });
        activeUploadedTex = uploaded;
      }

      // Inner cardboard liner
      let innerHex = preset.innerDefaultColor;
      let innerPresetForFiber: SurfacePresetId = 'kraft_natural';
      if (s.innerBoardStyle === 'kraft') {
        innerHex = '#ad8052';
        innerPresetForFiber = 'kraft_natural';
      } else if (s.innerBoardStyle === 'grey') {
        innerHex = '#94a3b8';
        innerPresetForFiber = 'kraft_white';
      } else if (s.innerBoardStyle === 'white') {
        innerHex = '#f1f5f9';
        innerPresetForFiber = 'matte_laminated';
      } else {
        innerPresetForFiber = preset.isCorrugated || presetId === 'kraft_natural' ? 'kraft_natural' : 'kraft_white';
      }

      activeInnerMaps = createSurfacePBRMaps(innerPresetForFiber, maxAniso, scale);
      const innerMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(innerHex),
        map: activeInnerMaps.map,
        bumpMap: activeInnerMaps.bumpMap,
        bumpScale: 1.1 * grain,
        roughness: 0.88,
        metalness: 0.01,
        wireframe: Boolean(s.wireframe),
      });

      // Cut thickness edge (fluted core for corrugated, fibrous pulp for solid boards)
      const edgeBoardMat = new THREE.MeshStandardMaterial({
        color: preset.isCorrugated ? new THREE.Color('#ffffff') : outerColor.clone().lerp(new THREE.Color('#8c7a66'), 0.35),
        map: activePbrMaps.edgeMap,
        bumpMap: activePbrMaps.edgeBumpMap,
        bumpScale: (preset.isCorrugated ? 2.4 : 0.9) * grain,
        roughness: 0.92,
        metalness: 0.0,
        wireframe: Boolean(s.wireframe),
      });

      const creaseLineMat = new THREE.LineBasicMaterial({
        color: preset.isCorrugated || presetId === 'kraft_natural' ? 0x6b4423 : 0x38bdf8,
        transparent: true,
        opacity: s.wireframe ? 0.85 : 0.35,
      });

      // BoxGeometry face order: [0:+X right, 1:-X left, 2:+Y top, 3:-Y bottom, 4:+Z front, 5:-Z back]
      const makePanel = (
        pw: number,
        ph: number,
        pd: number,
        outerFaceIdx: number,
        innerFaceIdx: number
      ) => {
        const g = new THREE.BoxGeometry(pw, ph, pd);
        const mats: THREE.Material[] = [
          edgeBoardMat,
          edgeBoardMat,
          edgeBoardMat,
          edgeBoardMat,
          edgeBoardMat,
          edgeBoardMat,
        ];
        mats[outerFaceIdx] = outerMat;
        mats[innerFaceIdx] = innerMat;
        const m = new THREE.Mesh(g, mats);
        m.castShadow = true;
        m.receiveShadow = true;
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), creaseLineMat));
        return m;
      };

      // Helper for Gold Foil / Spot UV effect badge on front & top outer faces
      const addSpecialEffectPlate = (targetMesh: THREE.Mesh, w: number, h: number, normalAxis: 'z' | 'y', offsetDist: number) => {
        if (!s.specialEffect || s.specialEffect === 'none' || s.wireframe) return;
        const plateSize = Math.min(w, h) * 0.72;
        if (plateSize < 14) return;
        const isGold = s.specialEffect === 'gold_foil' || s.specialEffect === 'both';
        const isUv = s.specialEffect === 'uv_spot' || s.specialEffect === 'both';

        const effectMat = new THREE.MeshPhysicalMaterial({
          color: isGold ? '#e5b84b' : '#ffffff',
          emissive: isGold ? '#332004' : '#000000',
          alphaMap: effectOverlayTex,
          map: isGold ? effectOverlayTex : null,
          transparent: true,
          opacity: isGold ? 0.98 : 0.38,
          metalness: isGold ? 0.96 : 0.05,
          roughness: isUv ? 0.04 : 0.15,
          clearcoat: isUv ? 1.0 : 0.55,
          clearcoatRoughness: isUv ? 0.03 : 0.12,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });

        const plate = new THREE.Mesh(new THREE.PlaneGeometry(plateSize, plateSize), effectMat);
        if (normalAxis === 'z') {
          plate.position.set(0, 0, offsetDist);
        } else {
          plate.rotation.x = -Math.PI / 2;
          plate.position.set(0, offsetDist, 0);
        }
        targetMesh.add(plate);
      };

      // Main 4 vertical walls (outer facing outward, inner facing box interior)
      frontPanel = makePanel(bw, bh, th, 4, 5);
      frontPanel.position.set(0, 0, bd / 2);
      addSpecialEffectPlate(frontPanel, bw, bh, 'z', th / 2 + 0.25);
      boxRoot.add(frontPanel);

      backPanel = makePanel(bw, bh, th, 5, 4);
      backPanel.position.set(0, 0, -bd / 2);
      boxRoot.add(backPanel);

      leftPanel = makePanel(th, bh, bd, 1, 0);
      leftPanel.position.set(-bw / 2, 0, 0);
      boxRoot.add(leftPanel);

      rightPanel = makePanel(th, bh, bd, 0, 1);
      rightPanel.position.set(bw / 2, 0, 0);
      boxRoot.add(rightPanel);

      // Articulated Top & Bottom lids
      topFlapGroup = new THREE.Group();
      topFlapGroup.position.set(0, bh / 2, -bd / 2);
      const topLid = makePanel(bw, th, bd, 2, 3);
      topLid.position.set(0, 0, bd / 2);
      addSpecialEffectPlate(topLid, bw, bd, 'y', th / 2 + 0.25);
      topFlapGroup.add(topLid);
      boxRoot.add(topFlapGroup);

      bottomFlapGroup = new THREE.Group();
      bottomFlapGroup.position.set(0, -bh / 2, bd / 2);
      const bottomLid = makePanel(bw, th, bd, 3, 2);
      bottomLid.position.set(0, 0, -bd / 2);
      bottomFlapGroup.add(bottomLid);
      boxRoot.add(bottomFlapGroup);

      // Articulated Left & Right Dust Flaps
      const dustFlapLen = Math.min(bd * 0.42, bw * 0.35);
      leftFlapGroup = new THREE.Group();
      leftFlapGroup.position.set(-bw / 2, bh / 2, 0);
      const leftDust = makePanel(dustFlapLen, th, bd * 0.88, 2, 3);
      leftDust.position.set(dustFlapLen / 2, -th * 0.9, 0);
      leftFlapGroup.add(leftDust);
      boxRoot.add(leftFlapGroup);

      rightFlapGroup = new THREE.Group();
      rightFlapGroup.position.set(bw / 2, bh / 2, 0);
      const rightDust = makePanel(dustFlapLen, th, bd * 0.88, 2, 3);
      rightDust.position.set(-dustFlapLen / 2, -th * 0.9, 0);
      rightFlapGroup.add(rightDust);
      boxRoot.add(rightFlapGroup);
    };

    rebuildRef.current = buildBox;
    applyEnvironment();
    buildBox();

    cameraPresetRef.current = (angle) => {
      const s = stateRef.current;
      const dist = Math.max(s.width || 200, s.height || 150, s.depth || 100) * 2.1 + 120;
      if (angle === 'front') camera.position.set(0, 15, dist);
      else if (angle === 'top') camera.position.set(0, dist, 10);
      else if (angle === 'side') camera.position.set(dist, 15, 0);
      else camera.position.set(dist * 0.72, dist * 0.56, dist * 0.85);
      controls.target.set(0, 0, 0);
      controls.update();
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
    window.addEventListener('resize', onResize);

    let reqId = 0;
    let openCurrent = 0;
    let explodeCurrent = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        reqId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) reqId = window.setTimeout(poll, 5);
        else {
          if (sync) gl.deleteSync(sync);
          reqId = window.setTimeout(cb, 80);
        }
      };
      reqId = window.setTimeout(poll, 5);
    }

    const animate = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const s = stateRef.current;
      controls.autoRotate = Boolean(s.cameraOrbit);

      // In DielineGenerator, foldRatio 1.0 = closed box (0 rad), 0.0 = unfolded open (-PI*0.72)
      // Wait: check caller semantics! In DielineGenerator, sliders say "بستن (100%)" -> foldRatio=1, "باز کامل (5%)" -> foldRatio=0.05
      // Keeping backwards compatibility: map isOpenRatio smoothly so 0..1 opens/closes naturally
      openCurrent = THREE.MathUtils.damp(openCurrent, s.isOpenRatio ?? 0, 6, dt);
      explodeCurrent = THREE.MathUtils.damp(explodeCurrent, s.isExploded ? 1 : 0, 6, dt);

      const topSign = s.flapDirections?.top === 'outside' ? 1 : -1;
      const bottomSign = s.flapDirections?.bottom === 'outside' ? -1 : 1;
      const leftSign = s.flapDirections?.left === 'outside' ? -1 : 1;
      const rightSign = s.flapDirections?.right === 'outside' ? 1 : -1;

      if (topFlapGroup) {
        topFlapGroup.rotation.x = topSign * openCurrent * (Math.PI * 0.72);
        topFlapGroup.position.y = baseH / 2 + explodeCurrent * 42;
      }
      if (bottomFlapGroup) {
        bottomFlapGroup.rotation.x = bottomSign * openCurrent * (Math.PI * 0.55);
        bottomFlapGroup.position.y = -baseH / 2 - explodeCurrent * 42;
      }
      if (leftFlapGroup) {
        leftFlapGroup.rotation.z = leftSign * Math.abs(openCurrent) * (Math.PI * 0.45);
        leftFlapGroup.position.x = -baseW / 2 - explodeCurrent * 36;
      }
      if (rightFlapGroup) {
        rightFlapGroup.rotation.z = rightSign * Math.abs(openCurrent) * (Math.PI * 0.45);
        rightFlapGroup.position.x = baseW / 2 + explodeCurrent * 36;
      }
      if (frontPanel) frontPanel.position.z = baseD / 2 + explodeCurrent * 36;
      if (backPanel) backPanel.position.z = -baseD / 2 - explodeCurrent * 36;
      if (leftPanel) leftPanel.position.x = -baseW / 2 - explodeCurrent * 36;
      if (rightPanel) rightPanel.position.x = baseW / 2 + explodeCurrent * 36;

      if (s.autoRotate) {
        boxRoot.rotation.y += dt * 0.45;
      }

      controls.update();
      renderer.render(scene, camera);

      if (swGl) afterDraw(animate);
      else reqId = requestAnimationFrame(animate);
    };

    if (swGl) reqId = window.setTimeout(animate, 20);
    else reqId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(reqId);
      clearTimeout(reqId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      clearBox();
      effectOverlayTex.dispose();
      shadowTex.dispose();
      envRT.dispose();
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, []);

  return (
    <div
      id="three-d-canvas-container"
      className="w-full h-full min-h-[320px] relative rounded-2xl overflow-hidden bg-[#070b14] border border-slate-800 flex items-center justify-center"
    >
      <div ref={mountRef} className="w-full h-full min-h-[320px] cursor-grab active:cursor-grabbing" />
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
