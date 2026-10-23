import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '3.10.0' });
  });

  app.get('/api/catalogs', (req, res) => {
    res.json([
      {
        id: 1,
        slug: 'fefco-standard-catalog',
        title: 'کاتالوگ جامع استانداردهای ففکو و کارتن‌سازی',
        category: 'کاتالوگ مرجع',
        description: 'مجموعه نقشه‌های مهندسی کارتن چهار درب، کیبوردی و جعبه‌های دایکاتی.',
        coverImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
        isPublished: true,
        pageCount: 24,
      },
      {
        id: 2,
        slug: 'luxury-packaging-catalog',
        title: 'کاتالوگ بسته‌بندی لوکس و لمینتی',
        category: 'جعبه‌های صادراتی',
        description: 'راهنمای جعبه‌های آرایشی، دارویی و هدایای شرکتی با پوشش UV و طلاکوب.',
        coverImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
        isPublished: true,
        pageCount: 18,
      }
    ]);
  });

  const isProduction = process.env.NODE_ENV === 'production';
  // Ensure dev server strictly binds to port 3000 as required by the preview environment
  const PORT = isProduction ? (Number(process.env.PORT) || 3000) : 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ashk Ghalam ERP Server v3.10.0 running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
