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
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('/three/') || id.includes('/@react-three/')) {
            return 'vendor-three';
          }
          if (id.includes('/framer-motion/') || id.includes('/motion-')) {
            return 'vendor-motion';
          }
          if (id.includes('/recharts/') || id.includes('/d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('/page-flip/') || id.includes('/react-pageflip/')) {
            return 'vendor-flipbook';
          }
          if (id.includes('/lucide-react/')) {
            return 'vendor-icons';
          }
          if (id.includes('/dxf-parser/')) {
            return 'vendor-dxf';
          }
          if (id.includes('/firebase/') || id.includes('/@firebase/')) {
            return 'vendor-firebase';
          }
          return undefined;
        },
      },
    },
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
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: false,
  },
});
