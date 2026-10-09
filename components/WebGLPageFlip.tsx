import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface WebGLPageFlipProps {
  frontPageUrl: string;
  backPageUrl: string;
  isDragging: boolean;
  dragProgress: number;
  direction: 'next' | 'prev';
  width: number;
  height: number;
  isDarkMode?: boolean;
}

// Global GPU texture cache to keep decoded Three.js textures in memory
const glTextureCache = new Map<string, THREE.Texture>();

export const WebGLPageFlip: React.FC<WebGLPageFlipProps> = ({
  frontPageUrl,
  backPageUrl,
  isDragging,
  dragProgress,
  direction,
  width,
  height,
  isDarkMode = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Store transition state so we can smoothly animate on requestAnimationFrame
  const progressRef = useRef(0);
  const velocityRef = useRef(0);
  const targetProgressRef = useRef(0);

  const isDraggingRef = useRef(isDragging);
  const directionRef = useRef(direction);
  const isDarkModeRef = useRef(isDarkMode);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Keep references to values fresh so animation loop doesn't restart
  useEffect(() => {
    targetProgressRef.current = dragProgress;
  }, [dragProgress]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
  }, [isDarkMode]);

  // Handle Texture Loading and dynamic uniform mapping
  const loadTextureCustom = (url: string, isFront: boolean, material: THREE.ShaderMaterial) => {
    if (!url) return;

    // Check GPU cache first for instantaneous texture assignment
    if (glTextureCache.has(url)) {
      const cachedTex = glTextureCache.get(url)!;
      if (isFront) {
        material.uniforms.mapFront.value = cachedTex;
        setIsLoaded(true);
      } else {
        material.uniforms.mapBack.value = cachedTex;
      }
      material.needsUpdate = true;
      return;
    }

    const img = new Image();
    if (!url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;

      // Add to global GPU cache
      glTextureCache.set(url, tex);

      if (isFront) {
        material.uniforms.mapFront.value = tex;
        setIsLoaded(true);
      } else {
        material.uniforms.mapBack.value = tex;
      }
      material.needsUpdate = true;
    };

    img.onerror = (err) => {
      console.warn(`Failed to load ${isFront ? 'front' : 'back'} page image in WebGL custom loader`, err);
    };

    img.src = url;
  };

  // Dedicated useEffect to load textures when URLs change (No rebuild of Three.js context)
  useEffect(() => {
    const material = materialRef.current;
    if (material && frontPageUrl) {
      loadTextureCustom(frontPageUrl, true, material);
    }
  }, [frontPageUrl]);

  useEffect(() => {
    const material = materialRef.current;
    if (material && backPageUrl) {
      loadTextureCustom(backPageUrl, false, material);
    }
  }, [backPageUrl]);

  // Main canvas context setup - Only runs on physical container dimension changes
  useEffect(() => {
    if (!containerRef.current || !width || !height) return;

    const container = containerRef.current;
    const pageW = width / 2;
    const pageH = height;

    // 1. Create Scene & Camera
    const scene = new THREE.Scene();

    const camera = new THREE.OrthographicCamera(
      -width / 2, width / 2,
      height / 2, -height / 2,
      0.1, 2000
    );
    camera.position.z = 1000;

    // 2. Create WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          premultipliedAlpha: false,
          failIfMajorPerformanceCaveat: false
        });
      } catch (_) {
        renderer = new THREE.WebGLRenderer({
          antialias: false,
          alpha: true,
          premultipliedAlpha: false,
          failIfMajorPerformanceCaveat: false
        });
      }
    } catch (e) {
      console.warn("WebGL context could not be created in WebGLPageFlip:", e);
      return () => {
        materialRef.current = null;
      };
    }

    renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn("WebGL context lost in WebGLPageFlip");
    }, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // transparent background
    container.appendChild(renderer.domElement);

    // Initial placeholder textures (blank white)
    const createPlaceholderTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#faf9f6';
        ctx.fillRect(0, 0, 128, 128);
      }
      return new THREE.CanvasTexture(canvas);
    };

    let frontTex = createPlaceholderTexture();
    let backTex = createPlaceholderTexture();
    frontTex.colorSpace = THREE.SRGBColorSpace;
    backTex.colorSpace = THREE.SRGBColorSpace;

    // Custom Vertex Shader for precise inextensible page curl physics deformation
    const vertexShader = `
      uniform float progress;
      uniform float direction; // 1.0 for next (R to L), -1.0 for prev (L to R)
      uniform float pageWidth;
      uniform float pageHeight;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;

        float x_loc = uv.x;
        float y_loc = uv.y - 0.5; // [-0.5, 0.5]

        float pi = 3.14159265359;

        // Crease location sweeps smoothly across the page width
        float foldCenter = 1.05 - progress * 1.10;

        // Subtle diagonal bending slant to peel corners first like real paper
        float diagonalTilt = 0.08 * y_loc * sin(progress * pi);
        foldCenter += diagonalTilt;

        // Curvature width reaches maximum at progress = 0.5
        float W = 0.06 + 0.28 * sin(progress * pi);

        float steps = 32.0;
        float ds = x_loc / steps;

        float currentX = 0.0;
        float currentZ = 0.0;
        float finalTheta = 0.0;

        for (int i = 0; i < 32; i++) {
          float s = (float(i) + 0.5) * ds;
          
          float theta = 0.0;
          if (s > foldCenter) {
            if (s < foldCenter + W) {
              float t = (s - foldCenter) / W;
              theta = smoothstep(0.0, 1.0, t) * pi;
            } else {
              theta = pi;
            }
          }

          currentX += cos(theta) * ds;
          currentZ += sin(theta) * ds;
          
          if (i == 31) {
            finalTheta = theta;
          }
        }

        vec3 localPos = vec3(currentX, y_loc, currentZ);
        vec3 normalLocal = vec3(-sin(finalTheta), 0.0, cos(finalTheta));

        // Apply page-turn direction multiplier
        float sideSign = direction > 0.0 ? 1.0 : -1.0;
        localPos.x *= sideSign;
        normalLocal.x *= sideSign;

        vec3 physicalPos;
        physicalPos.x = localPos.x * pageWidth;
        physicalPos.y = localPos.y * pageHeight;
        // Lift in Z space for dramatic realistic 3D arching
        float liftZ = sin(progress * pi) * 0.35 * sin(uv.x * pi);
        physicalPos.z = (localPos.z + liftZ) * pageWidth * 0.85;

        vec4 mvPosition = modelViewMatrix * vec4(physicalPos, 1.0);
        vViewPosition = -mvPosition.xyz;
        vNormal = normalize(normalMatrix * normalLocal);

        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    // Custom Fragment Shader for photo-realistic paper sheen, specular gloss, and soft fold shadows
    const fragmentShader = `
      uniform sampler2D mapFront;
      uniform sampler2D mapBack;
      uniform float isDarkMode;
      uniform float progress;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec4 texColor;
        vec3 normal = normalize(vNormal);

        // Determine facing side of the page using transformed face normal in view space
        bool isFront = normal.z >= 0.0;

        if (isFront) {
          texColor = texture2D(mapFront, vUv);
        } else {
          // Flip back UV horizontally so contents display in correct text alignment
          vec2 backUv = vec2(1.0 - vUv.x, vUv.y);
          texColor = texture2D(mapBack, backUv);
        }

        // Blending texture with a solid ivory/white premium paper background
        vec3 paperColor = mix(vec3(0.99, 0.98, 0.96), texColor.rgb, texColor.a);

        // Realistic directional light for paper specular sheen & soft ambient occlusion
        vec3 lightDir = normalize(vec3(0.3, 0.5, 1.0));
        float diff = max(dot(normal, lightDir), 0.0);

        // Specular highlight on glossy paper curve
        vec3 viewDir = normalize(vViewPosition);
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 16.0) * 0.12 * sin(progress * 3.14159);

        // Soft crease occlusion and paper fold shading
        float pi = 3.14159265;
        float centerFactor = sin(progress * pi);
        float creaseShadow = 1.0 - 0.08 * centerFactor * smoothstep(0.0, 0.3, vUv.x);

        vec3 finalLight = vec3(0.88 + 0.12 * diff + spec) * creaseShadow;

        gl_FragColor = vec4(paperColor * finalLight, 1.0);
      }
    `;

    const customMaterial = new THREE.ShaderMaterial({
      uniforms: {
        mapFront: { value: frontTex },
        mapBack: { value: backTex },
        progress: { value: 0.0 },
        direction: { value: direction === 'next' ? 1.0 : -1.0 },
        pageWidth: { value: pageW },
        pageHeight: { value: pageH },
        isDarkMode: { value: isDarkMode ? 1.0 : 0.0 }
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: false
    });

    materialRef.current = customMaterial;

    // Load actual textures if available upon initialization
    if (frontPageUrl) {
      loadTextureCustom(frontPageUrl, true, customMaterial);
    }
    if (backPageUrl) {
      loadTextureCustom(backPageUrl, false, customMaterial);
    }

    const geometry = new THREE.PlaneGeometry(1, 1, 80, 80);
    const mesh = new THREE.Mesh(geometry, customMaterial);
    scene.add(mesh);

    let isDisposed = false;
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      let dt = (now - lastTime) / 1000;
      lastTime = now;
      if (dt > 0.1) dt = 0.1;

      // Update uniforms that can change mid-motion
      customMaterial.uniforms.direction.value = directionRef.current === 'next' ? 1.0 : -1.0;
      customMaterial.uniforms.isDarkMode.value = isDarkModeRef.current ? 1.0 : 0.0;

      const stiffness = isDraggingRef.current ? 320.0 : 120.0;
      const damping = isDraggingRef.current ? 35.0 : 12.0;
      const mass = 1.0;

      const error = progressRef.current - targetProgressRef.current;
      const springForce = -stiffness * error;
      const dampingForce = -damping * velocityRef.current;
      const acceleration = (springForce + dampingForce) / mass;

      velocityRef.current += acceleration * dt;
      progressRef.current += velocityRef.current * dt;

      const progressValue = Math.min(Math.max(progressRef.current, 0.0), 1.0);
      customMaterial.uniforms.progress.value = progressValue;

      if (!isDisposed && renderer && renderer.info) {
        try {
          renderer.render(scene, camera);
        } catch (_) {}
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      isDisposed = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (container && renderer && renderer.domElement && container.contains(renderer.domElement)) {
        try { container.removeChild(renderer.domElement); } catch (_) {}
      }
      try { geometry.dispose(); } catch (_) {}
      try { customMaterial.dispose(); } catch (_) {}
      try { frontTex.dispose(); } catch (_) {}
      try { backTex.dispose(); } catch (_) {}
      if (renderer) {
        try {
          renderer.forceContextLoss();
          renderer.dispose();
        } catch (_) {}
      }
      materialRef.current = null;
    };
  }, [width, height]); // Recreate ONLY when chassis dimensions change!

  return (
    <div 
      ref={containerRef} 
      id="webgl-page-flip-stage"
      className="absolute inset-0 w-full h-full pointer-events-none z-30 transition-opacity duration-300 transform-gpu"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
};
