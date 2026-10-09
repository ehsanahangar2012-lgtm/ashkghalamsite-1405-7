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

// Clean/Rename zip files based on version
const processExistingZips = () => {
  const targets = [publicDownloadsDir, distDownloadsDir, rootDir];
  
  targets.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.startsWith('ashk_ghalam_v') && f.endsWith('.zip')) {
        const filePath = path.join(dir, f);
        
        // Extract version using regex
        const match = f.match(/^ashk_ghalam_v([0-9.]+)(_.*)?\.zip$/);
        if (match) {
          const fileVersion = match[1];
          const isSameVersion = fileVersion === currentVersion;
          
          if (!isSameVersion) {
            // Delete previous versions
            try {
              fs.unlinkSync(filePath);
              console.log(`[Packager] Deleted previous version file: ${f}`);
            } catch (e) {
              console.error(`[Packager] Failed to delete previous version ${f}: ${e.message}`);
            }
          } else {
            // If same version, rename with suffix to preserve it
            if (f.includes('_old')) {
              continue; // Skip already backed up files
            }
            
            const ext = '.zip';
            const base = f.slice(0, -ext.length);
            
            let suffix = '_old';
            let counter = 1;
            let targetName = `${base}${suffix}${ext}`;
            let targetPath = path.join(dir, targetName);
            
            while (fs.existsSync(targetPath)) {
              suffix = `_old${counter}`;
              targetName = `${base}${suffix}${ext}`;
              targetPath = path.join(dir, targetName);
              counter++;
            }
            
            try {
              fs.renameSync(filePath, targetPath);
              console.log(`[Packager] Renamed existing same-version file ${f} to: ${targetName}`);
            } catch (e) {
              console.error(`[Packager] Failed to rename same-version file ${f}: ${e.message}`);
            }
          }
        }
      }
    }
  });
};

// Process existing zips before creating new ones
processExistingZips();

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

// Ensure .htaccess exists in dist
const htaccessPath = path.join(rootDir, '.htaccess');
if (fs.existsSync(htaccessPath)) {
  fs.copyFileSync(htaccessPath, path.join(distDir, '.htaccess'));
}

// 1. Build Host-Ready ZIP (dist folder contents except downloads itself)
const hostZip = new AdmZip();
addDirToZip(hostZip, distDir, distDir, ['downloads', '.git']);

const hostZipPathCpanel = path.join(publicDownloadsDir, `ashk_ghalam_v${currentVersion}_cpanel.zip`);
hostZip.writeZip(hostZipPathCpanel);
fs.copyFileSync(hostZipPathCpanel, path.join(distDownloadsDir, `ashk_ghalam_v${currentVersion}_cpanel.zip`));
fs.copyFileSync(hostZipPathCpanel, path.join(rootDir, `ashk_ghalam_v${currentVersion}_cpanel.zip`));
console.log(`[Packager] cPanel Deployment ZIP v${currentVersion} created: ${(fs.statSync(hostZipPathCpanel).size / 1024 / 1024).toFixed(2)} MB`);

// 2. Build Full Source Project Bundle ZIP
const projectZip = new AdmZip();

const sourceFolders = ['src', 'components', 'contexts', 'services', 'utils', 'styles', 'public'];
for (const folder of sourceFolders) {
  const fPath = path.join(rootDir, folder);
  if (fs.existsSync(fPath)) {
    addDirToZip(projectZip, fPath, rootDir, ['downloads', 'node_modules', '.git']);
  }
}

if (fs.existsSync(distDir)) {
  addDirToZip(projectZip, distDir, rootDir, ['downloads']);
}

const rootFiles = [
  'package.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'server.ts',
  'metadata.json',
  'index.html',
  '.htaccess',
  '.env.example',
  'firebase-applet-config.json',
  'firestore.rules'
];

for (const f of rootFiles) {
  const filePath = path.join(rootDir, f);
  if (fs.existsSync(filePath)) {
    projectZip.addLocalFile(filePath, '');
  }
}

const projZipPathV35 = path.join(publicDownloadsDir, `ashk_ghalam_v${currentVersion}_source_bundle.zip`);
projectZip.writeZip(projZipPathV35);
fs.copyFileSync(projZipPathV35, path.join(distDownloadsDir, `ashk_ghalam_v${currentVersion}_source_bundle.zip`));
fs.copyFileSync(projZipPathV35, path.join(rootDir, `ashk_ghalam_v${currentVersion}_source_bundle.zip`));
console.log(`[Packager] Full Source Bundle ZIP v${currentVersion} created: ${(fs.statSync(projZipPathV35).size / 1024 / 1024).toFixed(2)} MB`);
