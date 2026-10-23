import * as THREE from 'three';

/**
 * Creates a THREE.WebGLRenderer instance safely, checking for WebGL support first.
 * If WebGL is not supported, or if initialization throws an error, it gracefully
 * returns a fully functional robust mock renderer to prevent downstream crashes.
 */
export function createSafeWebGLRenderer(parameters?: THREE.WebGLRendererParameters): THREE.WebGLRenderer {
  try {
    // 1. Verify that canvas and WebGL context can actually be obtained
    const canvas = parameters?.canvas || document.createElement('canvas');
    const gl = (canvas as any).getContext('webgl2') || (canvas as any).getContext('webgl') || (canvas as any).getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL context is not supported or is disabled in this environment.');
    }
    
    // 2. Try to instantiate WebGLRenderer
    return new THREE.WebGLRenderer(parameters);
  } catch (err) {
    console.error("SafeWebGLRenderer: Failed to create WebGLRenderer. Returning robust mock renderer fallback.", err);
    
    // 3. Create a robust mock renderer that conforms to THREE.WebGLRenderer interface
    const dummyCanvas = parameters?.canvas || document.createElement('canvas');
    
    const mockRenderer = {
      domElement: dummyCanvas,
      setPixelRatio: () => {},
      setSize: () => {},
      setClearColor: () => {},
      render: () => {},
      dispose: () => {},
      shadowMap: {
        enabled: false,
        type: THREE.PCFShadowMap,
        autoUpdate: true,
        needsUpdate: false,
      },
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.0,
      capabilities: {
        isHTML5: true,
        logarithmicDepthBuffer: false,
        maxAnisotropy: 1,
        maxPrecision: 'highp',
        precision: 'highp',
        floatFragmentTextures: false,
        floatVertexTextures: false,
        reversedDepthBuffer: false,
        getMaxAnisotropy: () => 1,
      },
      info: {
        reset: () => {},
        render: { frame: 0, calls: 0, triangles: 0, points: 0, lines: 0 },
        memory: { geometries: 0, textures: 0 },
        programs: null,
        autoReset: true,
        update: () => {}
      }
    };
    
    return mockRenderer as unknown as THREE.WebGLRenderer;
  }
}
