import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      'lucide-react',
      'framer-motion',
      'recharts',
      'jspdf',
      'dxf-parser',
      'page-flip',
      'three',
      'three/addons/controls/OrbitControls.js',
      'three/addons/environments/RoomEnvironment.js',
      'three/addons/geometries/RoundedBoxGeometry.js',
      'three/addons/lights/RectAreaLightUniformsLib.js',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: false,
  },
});
