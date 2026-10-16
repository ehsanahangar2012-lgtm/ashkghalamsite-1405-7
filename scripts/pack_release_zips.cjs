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

// Single Source of Truth: Import genuine products data
const { PRODUCTS_CATEGORIES } = require('../src/data/productsData.ts');

// Pre-render static HTML for public services and overview routes
const serviceRoutes = [
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
    intro: 'پوشش‌های تکمیلی علاوه بر محافظت از مرکب چاپ در برابر سایش، رطوبت و نور، ارزش حسی و بصری بسته‌بندی را دوچندان می‌کنند.',
    breadcrumbParent: 'خدمات صنعتی اشک قلم',
    ctaUrl: '/inquiry?service=surface-finishing'
  },
  {
    path: 'products',
    title: 'محصولات و رده‌های بسته‌بندی صنعتی | اشک قلم',
    h1: 'محصولات و تولیدات صنعتی اشک قلم',
    desc: 'انواع ساختارهای استاندارد کارتن لمینتی، جعبه‌های مقوایی دارویی، هاردباکس لوکس و کارتن‌های کیبوردی صادراتی با بالاترین کیفیت مهندسی.',
    intro: 'سبد محصولات کارتن، جعبه و هاردباکس اشک قلم شامل انواع ساختارهای استاندارد صادراتی و بهداشتی است.',
    breadcrumbParent: 'محصولات و رده‌های بسته‌بندی',
    ctaUrl: '/inquiry?category=box'
  }
];

const distIndexHtmlPath = path.join(distDir, 'index.html');
if (fs.existsSync(distIndexHtmlPath)) {
  const baseHtml = fs.readFileSync(distIndexHtmlPath, 'utf8');

  // Helper to replace or inject meta tags cleanly
  const applySeoTags = (html, meta) => {
    let res = html
      .replace(/<title>.*?<\/title>/, `<title>${meta.title}</title>`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${meta.desc}" />`)
      .replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${meta.canonicalUrl}" />`)
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${meta.title}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${meta.desc}" />`)
      .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${meta.canonicalUrl}" />`);

    if (res.includes('og:title') && !res.includes(meta.title)) {
      res = res.replace(/(property="og:title" content=")[^"]*(")/, `$1${meta.title}$2`);
      res = res.replace(/(property="og:description" content=")[^"]*(")/, `$1${meta.desc}$2`);
      res = res.replace(/(property="og:url" content=")[^"]*(")/, `$1${meta.canonicalUrl}$2`);
    }

    if (meta.schemaJson) {
      const schemaScript = `<script type="application/ld+json">${JSON.stringify(meta.schemaJson)}</script>`;
      res = res.replace('</head>', `  ${schemaScript}\n</head>`);
    }

    return res;
  };

  // 1. Pre-render Service and Hub Routes
  for (const r of serviceRoutes) {
    const routeDir = path.join(distDir, r.path);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    
    const canonicalUrl = `https://ashkghalam.ir/${r.path}`;
    let customizedHtml = applySeoTags(baseHtml, {
      title: r.title,
      desc: r.desc,
      canonicalUrl
    });

    const ctaLink = r.ctaUrl || (r.path.startsWith('products') ? '/inquiry?category=box' : `/inquiry?service=${r.path.split('/')[1] || 'printing'}`);
    const parentNav = r.breadcrumbParent || (r.path.startsWith('products') ? 'محصولات و رده‌های بسته‌بندی' : 'خدمات صنعتی اشک قلم');
    const initialBody = `<div id="root"><main class="max-w-7xl mx-auto p-4 md:p-8 dir-rtl text-right font-sans"><nav aria-label="Breadcrumb" class="text-xs text-gray-500 mb-4"><span>خانه</span> / <span>${parentNav}</span> / <span class="font-bold text-gray-900">${r.title}</span></nav><h1 class="text-2xl md:text-3xl font-black text-gray-900 mb-4">${r.h1}</h1><p class="text-sm text-gray-700 leading-relaxed mb-6 font-medium">${r.intro}</p><p class="text-sm text-gray-600 leading-relaxed mb-6">${r.desc}</p><a href="${ctaLink}" class="inline-block px-5 py-2.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold">استعلام آنلاین قیمت</a></main></div>`;
    customizedHtml = customizedHtml.replace('<div id="root"></div>', initialBody);

    fs.writeFileSync(path.join(routeDir, 'index.html'), customizedHtml, 'utf8');
  }

  // 2. Pre-render 4 Dedicated Product Pages directly from PRODUCTS_CATEGORIES
  for (const prod of PRODUCTS_CATEGORIES) {
    const prodRouteDir = path.join(distDir, 'products', prod.slug);
    if (!fs.existsSync(prodRouteDir)) {
      fs.mkdirSync(prodRouteDir, { recursive: true });
    }

    const canonicalUrl = `https://ashkghalam.ir/products/${prod.slug}`;
    const pageTitle = `${prod.title} | محصولات بسته‌بندی اشک قلم`;

    // Verified Schema.org Product + FAQPage JSON-LD
    const productSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Product",
          "@id": `${canonicalUrl}#product`,
          "name": prod.title,
          "description": prod.metaDescription,
          "category": prod.category,
          "brand": {
            "@type": "Brand",
            "name": "صنایع چاپ و بسته‌بندی اشک قلم"
          }
        },
        ...(prod.faq && prod.faq.length > 0 ? [{
          "@type": "FAQPage",
          "@id": `${canonicalUrl}#faq`,
          "mainEntity": prod.faq.map(f => ({
            "@type": "Question",
            "name": f.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": f.answer
            }
          }))
        }] : [])
      ]
    };

    let prodHtml = applySeoTags(baseHtml, {
      title: pageTitle,
      desc: prod.metaDescription,
      canonicalUrl,
      schemaJson: productSchema
    });

    // Rich genuine body content matching verified product specs & FAQ
    const materialsHtml = prod.structureAndMaterials.map(m => `<li class="py-1">• ${m}</li>`).join('');
    const specsHtml = prod.specifications.map(s => `<li class="py-1">✔ ${s}</li>`).join('');
    const faqHtml = (prod.faq || []).map(f => `
      <div class="mb-4 pb-3 border-b border-gray-100">
        <h3 class="font-bold text-sm text-gray-900 mb-1">پرسش: ${f.question}</h3>
        <p class="text-xs text-gray-700 leading-relaxed">${f.answer}</p>
      </div>
    `).join('');

    const productInitialBody = `
      <div id="root">
        <main class="max-w-7xl mx-auto p-4 md:p-8 dir-rtl text-right font-sans">
          <nav aria-label="Breadcrumb" class="text-xs text-gray-500 mb-4">
            <a href="/" class="hover:underline">خانه</a> / 
            <a href="/products" class="hover:underline">محصولات و رده‌های بسته‌بندی</a> / 
            <span class="font-bold text-gray-900">${prod.title}</span>
          </nav>
          
          <header class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm mb-6">
            <span class="text-xs font-black text-amber-600 block mb-2">${prod.category}</span>
            <h1 class="text-2xl md:text-3xl font-black text-gray-950 mb-4">${prod.h1}</h1>
            <p class="text-sm text-gray-700 leading-relaxed font-medium bg-amber-50 p-4 rounded-xl border border-amber-200 mb-4">${prod.intro}</p>
            <p class="text-sm text-gray-600 leading-relaxed mb-6">${prod.description}</p>
            <a href="${prod.actionRoute}" class="inline-block px-6 py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-md hover:bg-amber-600 transition-all">${prod.actionText}</a>
          </header>

          <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="bg-white rounded-2xl p-6 border border-gray-150">
              <h2 class="text-base font-black text-gray-900 mb-3">ساختار و متریال مهندسی:</h2>
              <ul class="text-xs text-gray-700 leading-relaxed space-y-1">${materialsHtml}</ul>
            </div>
            <div class="bg-white rounded-2xl p-6 border border-gray-150">
              <h2 class="text-base font-black text-gray-900 mb-3">مشخصات فنی و استانداردها:</h2>
              <ul class="text-xs text-gray-700 leading-relaxed space-y-1">${specsHtml}</ul>
            </div>
          </section>

          ${faqHtml ? `
            <section class="bg-white rounded-2xl p-6 border border-gray-150 mb-6">
              <h2 class="text-base font-black text-gray-900 mb-4">پرسش‌های متداول فنی:</h2>
              <div class="space-y-3">${faqHtml}</div>
            </section>
          ` : ''}

          <div class="pt-4 text-center">
            <a href="${prod.actionRoute}" class="inline-block px-8 py-3.5 bg-amber-500 text-slate-950 rounded-xl text-sm font-black shadow-lg hover:bg-amber-600 transition-all">ثبت آنلاین استعلام قیمت ${prod.title}</a>
          </div>
        </main>
      </div>
    `;

    prodHtml = prodHtml.replace('<div id="root"></div>', productInitialBody);
    fs.writeFileSync(path.join(prodRouteDir, 'index.html'), prodHtml, 'utf8');
  }

  // 3. Pre-render Published Catalogs (if genuine custom_catalogs.json exists in server uploads)
  const serverCatalogsPath = path.join(publicDir, 'uploads', 'custom_catalogs.json');
  let publishedCatalogsCount = 0;
  if (fs.existsSync(serverCatalogsPath)) {
    try {
      const rawCats = JSON.parse(fs.readFileSync(serverCatalogsPath, 'utf8'));
      if (Array.isArray(rawCats)) {
        const publishedCats = rawCats.filter(c => c && c.id && c.isPublished === true);
        for (const cat of publishedCats) {
          const catSlug = cat.slug || cat.id;
          const catDir = path.join(distDir, 'catalog', catSlug);
          if (!fs.existsSync(catDir)) {
            fs.mkdirSync(catDir, { recursive: true });
          }

          const catCanonical = `https://ashkghalam.ir/catalog/${catSlug}`;
          const catTitle = `${cat.title} | کاتالوگ اشک قلم`;
          const catDesc = cat.description || cat.seoDescription || `کاتالوگ رسمی ${cat.title} صنایع چاپ و بسته‌بندی اشک قلم`;
          const catCoverUrl = cat.coverImage && typeof cat.coverImage === 'string' && !cat.coverImage.startsWith('data:')
            ? (cat.coverImage.startsWith('http') ? cat.coverImage : `https://ashkghalam.ir${cat.coverImage.startsWith('/') ? '' : '/'}${cat.coverImage}`)
            : undefined;

          const catSchema = {
            "@context": "https://schema.org",
            "@type": "DigitalDocument",
            "@id": `${catCanonical}#document`,
            "name": cat.title,
            "description": catDesc,
            "publisher": {
              "@type": "Organization",
              "name": cat.publisher || "صنایع چاپ و بسته‌بندی اشک قلم",
              "url": "https://ashkghalam.ir"
            },
            "inLanguage": "fa-IR",
            ...(catCoverUrl ? { "image": catCoverUrl } : {})
          };

          let catHtml = applySeoTags(baseHtml, {
            title: catTitle,
            desc: catDesc,
            canonicalUrl: catCanonical,
            schemaJson: catSchema
          });

          const catBody = `
            <div id="root">
              <main class="max-w-7xl mx-auto p-4 md:p-8 dir-rtl text-right font-sans">
                <nav aria-label="Breadcrumb" class="text-xs text-gray-500 mb-4">
                  <a href="/">خانه</a> / 
                  <a href="/catalog">ژورنال و کاتالوگ‌های تخصصی</a> / 
                  <span class="font-bold text-gray-900">${cat.title}</span>
                </nav>
                <article class="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm">
                  <h1 class="text-2xl md:text-3xl font-black text-gray-900 mb-4">${cat.title}</h1>
                  <p class="text-sm text-gray-700 leading-relaxed mb-6 font-medium">${catDesc}</p>
                  <div class="flex flex-wrap gap-3">
                    <a href="/inquiry?category=box&service=packaging&catalog=${catSlug}" class="px-5 py-2.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold">استعلام قیمت بر اساس این کاتالوگ</a>
                    ${cat.pdfUrl ? `<a href="${cat.pdfUrl}" class="px-5 py-2.5 bg-gray-100 text-gray-800 rounded-xl text-xs font-bold" target="_blank" rel="noopener">دانلود PDF</a>` : ''}
                  </div>
                </article>
              </main>
            </div>
          `;
          catHtml = catHtml.replace('<div id="root"></div>', catBody);
          fs.writeFileSync(path.join(catDir, 'index.html'), catHtml, 'utf8');
          publishedCatalogsCount++;
        }
        // 4. Update dist sitemap.xml if any genuine published catalogs exist
        if (publishedCats.length > 0) {
          const sitemapDistPath = path.join(distDir, 'sitemap.xml');
          if (fs.existsSync(sitemapDistPath)) {
            let sm = fs.readFileSync(sitemapDistPath, 'utf8');
            for (const cat of publishedCats) {
              const catSlug = cat.slug || cat.id;
              const catUrl = `https://ashkghalam.ir/catalog/${catSlug}`;
              if (!sm.includes(catUrl)) {
                const lastmodTag = cat.updatedAt ? `\n    <lastmod>${cat.updatedAt.split('T')[0]}</lastmod>` : '';
                const urlEntry = `  <url>\n    <loc>${catUrl}</loc>${lastmodTag}\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n</urlset>`;
                sm = sm.replace('</urlset>', urlEntry);
              }
            }
            fs.writeFileSync(sitemapDistPath, sm, 'utf8');
            console.log(`[Packager] Appended ${publishedCats.length} genuine published catalogs to dist/sitemap.xml`);
          }
        }
      }
    } catch (e) {
      console.warn('[Packager] Failed reading server catalogs for pre-render:', e.message);
    }
  }

  console.log(`[Packager] Pre-rendered ${serviceRoutes.length} service/hub routes, ${PRODUCTS_CATEGORIES.length} verified product pages, and ${publishedCatalogsCount} published catalogs.`);
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
