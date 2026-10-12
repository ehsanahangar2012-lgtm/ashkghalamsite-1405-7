const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const publicDownloadsDir = path.join(publicDir, 'downloads');
const distDownloadsDir = path.join(distDir, 'downloads');

if (!fs.existsSync(publicDownloadsDir)) {
  fs.mkdirSync(publicDownloadsDir, { recursive: true });
}
if (!fs.existsSync(distDownloadsDir)) {
  fs.mkdirSync(distDownloadsDir, { recursive: true });
}

// Dynamically read version from package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;

console.log(`[Packager] Starting generation of v${currentVersion} release ZIP archives...`);

// Rule: Clean all previous/existing zip files prior to creating the new release bundle
const cleanExistingZips = () => {
  const targets = [publicDownloadsDir, distDownloadsDir, rootDir];
  
  targets.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.startsWith('ashk_ghalam_') && f.endsWith('.zip')) {
        const filePath = path.join(dir, f);
        try {
          fs.unlinkSync(filePath);
          console.log(`[Packager] Cleaned previous archive: ${f} from ${path.relative(rootDir, dir) || 'root'}`);
        } catch (e) {
          console.error(`[Packager] Failed to remove ${f}: ${e.message}`);
        }
      }
    }
  });
};

cleanExistingZips();

// Helper to recursively add files to zip
function addDirToZip(zip, currentDir, baseDir, ignoreSubDirs = []) {
  if (!fs.existsSync(currentDir)) return;
  const entries = fs.readdirSync(currentDir);
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry);
    const relPath = path.relative(baseDir, fullPath);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!ignoreSubDirs.includes(entry) && !ignoreSubDirs.includes(relPath)) {
        addDirToZip(zip, fullPath, baseDir, ignoreSubDirs);
      }
    } else {
      const zipFolder = path.dirname(relPath);
      const targetFolderInZip = zipFolder === '.' ? '' : zipFolder;
      zip.addLocalFile(fullPath, targetFolderInZip);
    }
  }
}

// Guarantee essential production static files in dist
const ensureDistFile = (filename, sourcePath) => {
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, path.join(distDir, filename));
  }
};

ensureDistFile('.htaccess', fs.existsSync(path.join(rootDir, '.htaccess')) ? path.join(rootDir, '.htaccess') : path.join(publicDir, '.htaccess'));
ensureDistFile('robots.txt', path.join(publicDir, 'robots.txt'));
ensureDistFile('sitemap.xml', path.join(publicDir, 'sitemap.xml'));

// Pre-render static HTML for public services routes to ensure immediate SEO crawler discovery
const preRenderRoutes = [
  {
    path: 'services',
    title: 'خدمات صنعتی و مهندسی چاپ و بسته‌بندی | اشک قلم',
    h1: 'خدمات صنعتی و مهندسی چاپ و بسته‌بندی اشک قلم',
    desc: 'ارائه زنجیره کامل فرآیندهای تولید از مشاوره سازه کارتن و مدل‌سازی سه‌بعدی تا چاپ افست ۵ رنگ، لمینت، ساخت تیغ لیزری و پوشش‌های UV.',
    intro: 'مرکز تخصصی و خطوط مهندسی چاپ و بسته‌بندی اشک قلم ارائه دهنده راهکارهای جامع تولید جعبه و کارتن.'
  },
  {
    path: 'services/printing',
    title: 'خدمات چاپ صنعتی و چاپ افست | صنایع چاپ اشک قلم',
    h1: 'خدمات تخصصی چاپ صنعتی و افست',
    desc: 'خدمات چاپ افست صنعتی، چاپ روی انواع مقوای ایندربرد و گلاسه، فرم‌بندی اختصاصی و کنترل کیفیت رنگ در مجتمع چاپ اشک قلم.',
    intro: 'فرآیند چاپ صنعتی در اشک قلم بر پایه اجرای دقیق فرم‌های چاپی، تفکیک استانداردهای رنگی CMYK و اسپات و پوشش‌های محافظتی پیاده‌سازی می‌شود.'
  },
  {
    path: 'services/packaging',
    title: 'خدمات طراحی و تولید بسته‌بندی | صنایع چاپ اشک قلم',
    h1: 'خدمات طراحی و مهندسی بسته‌بندی',
    desc: 'طراحی سازه، مدل‌سازی سه‌بعدی و تولید انواع بسته‌بندی مقوایی، کارتنی و صادراتی با رعایت استانداردهای محافظت و انبارداری در اشک قلم.',
    intro: 'بسته‌بندی مهندسی‌شده تلفیقی از استحکام ساختاری جهت محافظت از کالا و طراحی کاربردی برای سهولت مصرف‌کننده و تمایز در قفسه بازار است.'
  },
  {
    path: 'services/box-making',
    title: 'خدمات جعبه‌سازی صنعتی و تولید هاردباکس | صنایع چاپ اشک قلم',
    h1: 'خدمات جعبه‌سازی، هاردباکس و جعبه مقوایی',
    desc: 'طراحی و ساخت انواع جعبه‌های مقوایی بهداشتی، جعبه سخت (هاردباکس)، جعبه‌های دارویی، فست‌فودی و کادویی با قالب‌سازی دقیق در اشک قلم.',
    intro: 'جعبه‌سازی صنعتی تلفیق هنر و هندسه سازه است؛ جایی که انتخاب نوع قفل، ضخامت مقوا و دقت خطوط تا، ایستایی و کارایی نهایی محصول را شکل می‌دهد.'
  },
  {
    path: 'services/carton-making',
    title: 'خدمات کارتن‌سازی و تولید کارتن لمینتی | صنایع چاپ اشک قلم',
    h1: 'خدمات کارتن‌سازی، تولید کارتن لمینتی و کنگره‌ای',
    desc: 'تولید کارتن‌های لمینتی، دایکاتی و آمریکایی ۳ لایه و ۵ لایه با فلوت‌های E، B، C و مقاومت فشاری بالا جهت مصارف صنعتی و صادراتی در اشک قلم.',
    intro: 'کارتن‌سازی ستون فقرات بسته‌بندی، انبارداری و صادرات محصولات است. انتخاب ترکیب مناسب فلوتینگ و لاینر تضمین‌کننده مقاومت کارتن در برابر بارهای دینامیکی و استاتیکی حمل‌ونقل است.'
  },
  {
    path: 'services/offset-printing',
    title: 'چاپ افست صنعتی ۵ رنگ همزمان | صنایع چاپ اشک قلم',
    h1: 'چاپ افست صنعتی ۵ رنگ همزمان',
    desc: 'خطوط چاپ افست چندرنگ همزمان با پوشش ورنی آنلاین، مناسب برای تولید انبوه جعبه‌های مقوایی، کاتالوگ و بسته‌بندی در اشک قلم.',
    intro: 'چاپ افست استاندارد اصلی صنعت برای تولید انبوه بسته‌بندی‌های باکیفیت و تصاویر با تفکیک رنگی بالا به شمار می‌رود.'
  },
  {
    path: 'services/laminated-carton',
    title: 'تولید کارتن‌های لمینتی و کنگره‌ای | صنایع چاپ اشک قلم',
    h1: 'تولید کارتن‌های لمینتی و کنگره‌ای',
    desc: 'تولید کارتن‌های لمینتی فلوت‌های E ،B ،C سه‌لایه و پنج‌لایه با پوستر چاپ‌شده افست و استحکام فشاری استاندارد در اشک قلم.',
    intro: 'کارتن لمینتی محصول اتصال یک پوستر مقوایی با چاپ باکیفیت افست بر روی ورق کارتن کنگره‌ای با چسب‌های بهداشتی است.'
  },
  {
    path: 'services/diecut-tooling',
    title: 'قالب‌سازی لیزری و تیغ دایکات | صنایع چاپ اشک قلم',
    h1: 'قالب‌سازی لیزری و تیغ دایکات',
    desc: 'ترسیم وکتور استاندارد دایلاین، برش لیزری تخته قالب و کشیدن تیغ‌های استاندارد خط تا و پرفراژ برای دایکات در اشک قلم.',
    intro: 'دقت در برش و ساخت قالب دایکات، زیربنای تولید جعبه‌هایی با خطوط تای تمیز، بدون ترکیدگی و با قفل‌بندی سریع است.'
  },
  {
    path: 'services/surface-finishing',
    title: 'پوشش‌های محافظتی و تکمیلی چاپ | صنایع چاپ اشک قلم',
    h1: 'پوشش‌های محافظتی و تکمیلی چاپ (UV و سلفون)',
    desc: 'سلفون‌کشی مات و براق، یووی موضعی، طلاکوب گرم و بافت امباس برای محافظت و افزایش ماندگاری جعبه و بسته‌بندی در اشک قلم.',
    intro: 'پوشش‌های تکمیلی علاوه بر محافظت از مرکب چاپ در برابر سایش، رطوبت و نور، ارزش حسی و بصری بسته‌بندی را دوچندان می‌کنند.'
  }
];

const distIndexHtmlPath = path.join(distDir, 'index.html');
if (fs.existsSync(distIndexHtmlPath)) {
  const baseHtml = fs.readFileSync(distIndexHtmlPath, 'utf8');

  for (const r of preRenderRoutes) {
    const routeDir = path.join(distDir, r.path);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    
    const canonicalUrl = `https://ashkghalam.ir/${r.path}`;
    let customizedHtml = baseHtml
      .replace(/<title>.*?<\/title>/, `<title>${r.title}</title>`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${r.desc}" />`)
      .replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${canonicalUrl}" />`)
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${r.title}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${r.desc}" />`)
      .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${canonicalUrl}" />`);

    if (customizedHtml.includes('og:title') && !customizedHtml.includes(r.title)) {
      customizedHtml = customizedHtml.replace(/(property="og:title" content=")[^"]*(")/, `$1${r.title}$2`);
      customizedHtml = customizedHtml.replace(/(property="og:description" content=")[^"]*(")/, `$1${r.desc}$2`);
      customizedHtml = customizedHtml.replace(/(property="og:url" content=")[^"]*(")/, `$1${canonicalUrl}$2`);
    }

    const serviceQuery = r.path.split('/')[1] || 'printing';
    const initialBody = `<div id="root"><main class="max-w-7xl mx-auto p-4 md:p-8 dir-rtl text-right font-sans"><nav aria-label="Breadcrumb" class="text-xs text-gray-500 mb-4"><span>خانه</span> / <span>خدمات صنعتی اشک قلم</span> / <span class="font-bold text-gray-900">${r.title}</span></nav><h1 class="text-2xl md:text-3xl font-black text-gray-900 mb-4">${r.h1}</h1><p class="text-sm text-gray-700 leading-relaxed mb-6 font-medium">${r.intro}</p><p class="text-sm text-gray-600 leading-relaxed mb-6">${r.desc}</p><a href="/inquiry?service=${serviceQuery}" class="inline-block px-5 py-2.5 bg-sky-600 text-white rounded-xl text-xs font-bold">استعلام آنلاین قیمت</a></main></div>`;
    customizedHtml = customizedHtml.replace('<div id="root"></div>', initialBody);

    fs.writeFileSync(path.join(routeDir, 'index.html'), customizedHtml, 'utf8');
  }
  console.log(`[Packager] Pre-rendered ${preRenderRoutes.length} services routes with static SEO HTML.`);
}

// 1. Build Host-Ready ZIP (cPanel deployment - dist folder contents excluding downloads)
const hostZip = new AdmZip();
addDirToZip(hostZip, distDir, distDir, ['downloads', '.git']);

const hostZipPathCpanel = path.join(publicDownloadsDir, `ashk_ghalam_v${currentVersion}_cpanel.zip`);
hostZip.writeZip(hostZipPathCpanel);
fs.copyFileSync(hostZipPathCpanel, path.join(distDownloadsDir, `ashk_ghalam_v${currentVersion}_cpanel.zip`));
fs.copyFileSync(hostZipPathCpanel, path.join(rootDir, `ashk_ghalam_v${currentVersion}_cpanel.zip`));
console.log(`[Packager] cPanel Deployment ZIP v${currentVersion} created: ${(fs.statSync(hostZipPathCpanel).size / 1024 / 1024).toFixed(2)} MB`);

// 2. Build Full Source Project Bundle ZIP (Self-contained, reproducible build bundle)
const projectZip = new AdmZip();

const sourceFolders = [
  'src', 
  'components', 
  'contexts', 
  'services', 
  'utils', 
  'hooks', 
  'store', 
  'db', 
  'dxp', 
  'scripts', 
  'public'
];

for (const folder of sourceFolders) {
  const fPath = path.join(rootDir, folder);
  if (fs.existsSync(fPath)) {
    addDirToZip(projectZip, fPath, rootDir, ['downloads', 'node_modules', '.git']);
  }
}

const rootFiles = [
  'App.tsx',
  'index.tsx',
  'index.css',
  'types.ts',
  'package.json',
  'package-lock.json',
  'bun.lock',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'server.ts',
  'metadata.json',
  'index.html',
  '.htaccess',
  '.env.example',
  'vite-env.d.ts',
  'drizzle.config.ts',
  'firebase-applet-config.json',
  'firestore.rules'
];

for (const f of rootFiles) {
  const filePath = path.join(rootDir, f);
  if (fs.existsSync(filePath)) {
    projectZip.addLocalFile(filePath, '');
  }
}

const projZipPath = path.join(publicDownloadsDir, `ashk_ghalam_v${currentVersion}_source_bundle.zip`);
projectZip.writeZip(projZipPath);
fs.copyFileSync(projZipPath, path.join(distDownloadsDir, `ashk_ghalam_v${currentVersion}_source_bundle.zip`));
fs.copyFileSync(projZipPath, path.join(rootDir, `ashk_ghalam_v${currentVersion}_source_bundle.zip`));
console.log(`[Packager] Full Source Bundle ZIP v${currentVersion} created: ${(fs.statSync(projZipPath).size / 1024 / 1024).toFixed(2)} MB`);
