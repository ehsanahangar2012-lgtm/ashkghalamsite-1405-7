import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface FlapDirections {
  top?: 'inside' | 'outside';
  bottom?: 'inside' | 'outside';
  left?: 'inside' | 'outside';
  right?: 'inside' | 'outside';
  topFlap?: number;
  bottomFlap?: number;
  leftFlap?: number;
  rightFlap?: number;
}

export interface ThreeDPreviewProps {
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  specialEffect?: string;
  isOpenRatio?: number;
  wireframe?: boolean;
  autoRotate?: boolean;
  selectedModelId?: string;
  customEntities?: any[];
  customAnchors?: any[];
  textureUrl?: string;
  paperType?: string;
  materialThickness?: number;
  cameraOrbit?: unknown;
  resetTrigger?: number;
  viewAngle?: 'front' | 'top' | 'side' | 'perspective';
  isExploded?: boolean;
  flapDirections?: FlapDirections;
  hasDieCut?: boolean;
  lightIntensity?: number;
  showDimensions?: boolean;
}

export const ThreeDPreview: React.FC<ThreeDPreviewProps> = ({
  width = 200,
  height = 150,
  depth = 100,
  color = '#d4a373',
  wireframe = false,
  autoRotate = true,
  isOpenRatio = 0,
  materialThickness = 0.45,
  paperType = 'coated',
  specialEffect = 'none',
  viewAngle = 'perspective',
  flapDirections,
  isExploded = false,
  lightIntensity = 1,
  showDimensions = true,
  resetTrigger = 0,
  cameraOrbit,
  textureUrl,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const viewportWidth = Math.max(1, mount.clientWidth || 400);
    const viewportHeight = Math.max(1, mount.clientHeight || 300);
    const w = Math.max(10, Number.isFinite(width) ? width : 200) * 0.8;
    const h = Math.max(10, Number.isFinite(height) ? height : 150) * 0.8;
    const d = Math.max(10, Number.isFinite(depth) ? depth : 100) * 0.8;
    const scale = Math.max(w, h, d, 100);
    const open = THREE.MathUtils.clamp(Number.isFinite(isOpenRatio) ? isOpenRatio : 0, 0, 1);
    const board = Math.max(
      Number.isFinite(materialThickness) ? Math.max(0, materialThickness) * 0.8 : 0,
      scale * 0.006,
      0.7
    );
    const explodeOffset = isExploded ? scale * 0.08 : 0;
    const safeLightIntensity = THREE.MathUtils.clamp(Number.isFinite(lightIntensity) ? lightIntensity : 1, 0.25, 2.5);
    const foldSign = (side: keyof FlapDirections, defaultSign: number) =>
      flapDirections?.[side] === 'outside' ? -defaultSign : defaultSign;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1220');
    const camera = new THREE.PerspectiveCamera(38, viewportWidth / viewportHeight, 0.1, scale * 20);
    const cameraPresets: Record<string, [number, number, number]> = {
      front: [0, scale * 0.15, scale * 3.1],
      top: [0, scale * 3.1, 0.001],
      side: [scale * 3.1, scale * 0.15, 0],
      perspective: [scale * 1.65, scale * 1.25, scale * 2.1],
    };
    const selectedCamera = cameraPresets[viewAngle] || cameraPresets.perspective;
    camera.position.set(...selectedCamera);
    let hasCameraOrbit = false;
    if (cameraOrbit && typeof cameraOrbit === 'object') {
      const orbit = cameraOrbit as { x?: number; y?: number; z?: number };
      if ([orbit.x, orbit.y, orbit.z].every(value => typeof value === 'number' && Number.isFinite(value))) {
        camera.position.set(orbit.x as number, orbit.y as number, orbit.z as number);
        hasCameraOrbit = true;
      }
    }
    if (viewAngle === 'top' && !hasCameraOrbit) camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(viewportWidth, viewportHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x5a4937, 2.0 * safeLightIntensity));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1 * safeLightIntensity);
    keyLight.position.set(scale * 1.2, scale * 2.2, scale * 1.5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x8ec5ff, 0.7 * safeLightIntensity);
    rimLight.position.set(-scale, scale * 0.5, -scale);
    scene.add(rimLight);

    const carton = new THREE.Group();
    scene.add(carton);
    const disposables: { dispose: () => void }[] = [];
    const surfaceTexture = textureUrl
      ? new THREE.TextureLoader().load(textureUrl, loaded => {
          loaded.colorSpace = THREE.SRGBColorSpace;
          loaded.wrapS = THREE.RepeatWrapping;
          loaded.wrapT = THREE.RepeatWrapping;
          loaded.needsUpdate = true;
        })
      : null;
    if (surfaceTexture) disposables.push(surfaceTexture);

    const panelMaterial = (tint: string) => {
      const hasGoldFoil = specialEffect === 'gold_foil' || specialEffect === 'both';
      const hasSpotUv = specialEffect === 'uv_spot' || specialEffect === 'both';
      const material = new THREE.MeshStandardMaterial({
        color: hasGoldFoil ? 0xd6ad42 : tint,
        roughness: hasSpotUv ? 0.26 : hasGoldFoil ? 0.24 : paperType === 'kraft' || paperType === 'corrugated' ? 0.92 : 0.82,
        metalness: hasGoldFoil ? 0.72 : 0,
        map: surfaceTexture,
        side: THREE.DoubleSide,
        wireframe: !!wireframe,
      });
      disposables.push(material);
      return material;
    };

    const createPanel = (parent: THREE.Object3D, pw: number, ph: number, pd: number, position: THREE.Vector3, tint: string) => {
      const geometry = new THREE.BoxGeometry(Math.max(pw, board), Math.max(ph, board), Math.max(pd, board));
      disposables.push(geometry);
      const mesh = new THREE.Mesh(geometry, panelMaterial(tint));
      mesh.position.copy(position);
      parent.add(mesh);

      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      disposables.push(edgeGeometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x40372e, transparent: true, opacity: 0.8 });
      disposables.push(edgeMaterial);
      mesh.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));
      return mesh;
    };

    const baseY = -h / 2;
    const topY = h / 2;
    const paper = color || (paperType === 'kraft' ? '#c99a60' : paperType === 'corrugated' ? '#b89771' : '#d4a373');
    const shade = (hex: string, factor: number) => {
      const c = new THREE.Color(hex);
      c.multiplyScalar(factor);
      return '#' + c.getHexString();
    };

    // Base and four upright walls form a real, foldable open carton rather than a solid cube.
    createPanel(carton, w, board, d, new THREE.Vector3(0, baseY, 0), shade(paper, 0.9));
    createPanel(carton, w, h, board, new THREE.Vector3(0, 0, d / 2 + explodeOffset), shade(paper, 0.94));
    createPanel(carton, w, h, board, new THREE.Vector3(0, 0, -d / 2 - explodeOffset), shade(paper, 0.78));
    createPanel(carton, board, h, d, new THREE.Vector3(w / 2 + explodeOffset, 0, 0), shade(paper, 0.84));
    createPanel(carton, board, h, d, new THREE.Vector3(-w / 2 - explodeOffset, 0, 0), shade(paper, 0.88));

    // Four hinged flaps rotate about the upper wall edges. 0 = folded closed, 1 = open.
    const frontHinge = new THREE.Group();
    frontHinge.position.set(0, topY, d / 2 + explodeOffset);
    frontHinge.rotation.x = foldSign('top', 1) * open * Math.PI / 2;
    carton.add(frontHinge);
    createPanel(frontHinge, w, board, d / 2, new THREE.Vector3(0, 0, d / 4), shade(paper, 1.03));

    const rearHinge = new THREE.Group();
    rearHinge.position.set(0, topY, -d / 2 - explodeOffset);
    rearHinge.rotation.x = foldSign('bottom', -1) * open * Math.PI / 2;
    carton.add(rearHinge);
    createPanel(rearHinge, w, board, d / 2, new THREE.Vector3(0, 0, -d / 4), shade(paper, 0.8));

    const rightHinge = new THREE.Group();
    rightHinge.position.set(w / 2 + explodeOffset, topY, 0);
    rightHinge.rotation.z = foldSign('right', -1) * open * Math.PI / 2;
    carton.add(rightHinge);
    createPanel(rightHinge, w / 2, board, d, new THREE.Vector3(w / 4, 0, 0), shade(paper, 0.9));

    const leftHinge = new THREE.Group();
    leftHinge.position.set(-w / 2 - explodeOffset, topY, 0);
    leftHinge.rotation.z = foldSign('left', 1) * open * Math.PI / 2;
    carton.add(leftHinge);
    createPanel(leftHinge, w / 2, board, d, new THREE.Vector3(-w / 4, 0, 0), shade(paper, 0.86));

    const ground = new THREE.GridHelper(scale * 3.5, 28, 0x334155, 0x1e293b);
    ground.position.y = baseY - board * 2;
    scene.add(ground);

    let animationFrame = 0;
    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      if (autoRotate) carton.rotation.y += 0.004;
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!mount.isConnected) return;
      const nextWidth = Math.max(1, mount.clientWidth);
      const nextHeight = Math.max(1, mount.clientHeight);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    });
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.dispose();
      disposables.forEach(resource => resource.dispose());
      scene.clear();
      mount.replaceChildren();
    };
  }, [
    width, height, depth, color, wireframe, autoRotate, isOpenRatio,
    materialThickness, paperType, specialEffect, viewAngle, flapDirections,
    isExploded, lightIntensity, showDimensions, resetTrigger, cameraOrbit, textureUrl,
  ]);

  return (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <div ref={mountRef} className="h-full min-h-[300px] w-full" />
      {showDimensions && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-slate-200">
          {Math.round(width)} × {Math.round(depth)} × {Math.round(height)} mm · {Math.round(Math.min(1, Math.max(0, isOpenRatio)) * 100)}% بازشدگی
        </div>
      )}
    </div>
  );
};
