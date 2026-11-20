const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const downloadsDir = path.join(publicDir, 'downloads');

const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const version = pkg.version || '3.23.0';

const zipFileName = `ashk-ghalam-v${version}-cpanel.zip`;
const outputZipPath = path.join(downloadsDir, zipFileName);
const rootDownloadsDir = path.join(rootDir, 'downloads');

// Clean any legacy or old zip files from public/, public/downloads/, downloads/, and dist/
const legacyPublicZip = path.join(publicDir, 'ashk-ghalam-erp-cpanel-release.zip');
if (fs.existsSync(legacyPublicZip)) {
  fs.unlinkSync(legacyPublicZip);
}
for (const dirToClean of [distDir, downloadsDir, rootDownloadsDir]) {
  if (!fs.existsSync(dirToClean)) continue;
  for (const entry of fs.readdirSync(dirToClean)) {
    if (entry.endsWith('.zip')) {
      fs.unlinkSync(path.join(dirToClean, entry));
    }
  }
}
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}
if (!fs.existsSync(rootDownloadsDir)) {
  fs.mkdirSync(rootDownloadsDir, { recursive: true });
}

console.log(`Packing pure PHP standard cPanel ZIP (${zipFileName})...`);

const zip = new AdmZip();

// Add compiled static frontend assets + public files directly at ZIP root
// Strictly EXCLUDE any Node.js artifacts (server.js, agent-worker.js, maps, zips)
if (fs.existsSync(distDir)) {
  zip.addLocalFolder(distDir, '', (filename) => {
    const normalized = filename.replace(/\\/g, '/');
    const base = path.basename(normalized);
    if (
      base === 'server.js' ||
      base === 'agent-worker.js' ||
      normalized.endsWith('.zip') ||
      normalized.endsWith('.map') ||
      normalized.startsWith('downloads/')
    ) {
      return false;
    }
    return true;
  });
}

// Ensure api.php is present at ZIP root
const apiPhpSrc = path.join(publicDir, 'api.php');
if (fs.existsSync(apiPhpSrc) && !zip.getEntry('api.php')) {
  zip.addLocalFile(apiPhpSrc, '');
}

// Standard Apache / LiteSpeed .htaccess for cPanel public_html + PHP /api/* routing + image MIME types + SPA fallback
const htaccessContent = `DirectoryIndex index.html

<IfModule mod_mime.c>
  AddType image/webp .webp
  AddType image/svg+xml .svg .svgz
  AddType image/png .png
  AddType image/jpeg .jpg .jpeg
  AddType image/gif .gif
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Route all /api/* requests to pure PHP backend (api.php)
  RewriteRule ^api/?(.*)$ api.php?r=$1 [QSA,L]

  # Serve existing static files and directories directly
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Fallback all frontend SPA routes to index.html
  RewriteRule ^ index.html [L]
</IfModule>
`;
zip.addFile('.htaccess', Buffer.from(htaccessContent, 'utf-8'));

// Ensure writable JSON stores exist at ZIP root (no package.json or .env.example)
const jsonStores = [
  { name: 'catalogs.json', fallback: '[]' },
  { name: 'flipbooks.json', fallback: '[]' },
  { name: 'posts.json', fallback: '[]' },
  { name: 'inquiries.json', fallback: '[]' },
  { name: 'settings.json', fallback: '{}' },
  { name: 'media-meta.json', fallback: '[]' },
];

for (const store of jsonStores) {
  const filePath = path.join(rootDir, store.name);
  if (fs.existsSync(filePath)) {
    zip.addLocalFile(filePath, '');
  } else {
    zip.addFile(store.name, Buffer.from(store.fallback, 'utf-8'));
  }
}

// Ensure uploads directories exist inside ZIP with index protection
zip.addFile('uploads/flipbooks/index.html', Buffer.from('<!doctype html><title></title>', 'utf-8'));
zip.addFile('uploads/media/index.html', Buffer.from('<!doctype html><title></title>', 'utf-8'));

zip.writeZip(outputZipPath);

// Mirror built release ZIP into root downloads/ (visible in Code tree) and dist/downloads/
fs.copyFileSync(outputZipPath, path.join(rootDownloadsDir, zipFileName));
const distDownloadsDir = path.join(distDir, 'downloads');
if (!fs.existsSync(distDownloadsDir)) {
  fs.mkdirSync(distDownloadsDir, { recursive: true });
}
fs.copyFileSync(outputZipPath, path.join(distDownloadsDir, zipFileName));

const sizeMb = (fs.statSync(outputZipPath).size / (1024 * 1024)).toFixed(2);
console.log(`✅ Standard cPanel PHP release created (zero Node.js): ${outputZipPath} & ${path.join(rootDownloadsDir, zipFileName)} (${sizeMb} MB)`);
