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
