import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface FlapDirections {
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
}

export const ThreeDPreview: React.FC<ThreeDPreviewProps> = ({
  width = 200,
  height = 150,
  depth = 100,
  color = '#d4a373',
  wireframe = false,
  autoRotate = true,
  isOpenRatio = 0,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const widthPx = mountRef.current.clientWidth || 400;
    const heightPx = mountRef.current.clientHeight || 300;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, widthPx / heightPx, 0.1, 2000);
    camera.position.set(300, 250, 400);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(widthPx, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(200, 400, 300);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight2.position.set(-200, -200, -200);
    scene.add(dirLight2);

    // Box mesh
    const w = (width || 200) * 0.8;
    const h = (height || 150) * 0.8;
    const d = (depth || 100) * 0.8;

    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.6,
      metalness: 0.1,
      wireframe: !!wireframe,
    });

    const box = new THREE.Mesh(geometry, material);
    scene.add(box);

    // Edges
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x444444 });
    const edgeLines = new THREE.LineSegments(edges, lineMat);
    box.add(edgeLines);

    camera.lookAt(0, 0, 0);

    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      if (autoRotate) {
        box.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, [width, height, depth, color, wireframe, autoRotate, isOpenRatio]);

  return (
    <div className="w-full h-full min-h-[300px] relative rounded-2xl overflow-hidden bg-slate-950/60 border border-slate-800">
      <div ref={mountRef} className="w-full h-full min-h-[300px]" />
    </div>
  );
};
