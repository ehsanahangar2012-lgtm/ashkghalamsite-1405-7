const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const downloadsDir = path.join(publicDir, 'downloads');

const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const version = pkg.version || '3.26.6';

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
      normalized.startsWith('downloads/') ||
      normalized.startsWith('assets/aistudio/') ||
      normalized.startsWith('studio/')
    ) {
      return false;
    }
    return true;
  });
}

// Ensure pure-PHP backend & smart cron scripts are present at ZIP root (zero Node.js)
for (const phpFile of ['api.php', 'seo-autopilot.php', 'cron-seo.php']) {
  const phpSrc = path.join(publicDir, phpFile);
  if (fs.existsSync(phpSrc) && !zip.getEntry(phpFile)) {
    zip.addLocalFile(phpSrc, '');
  }
}

// Standard Apache / LiteSpeed .htaccess for cPanel public_html + Gzip/Brotli + Long-Term Caching + PHP /api/* routing
const htaccessContent = `DirectoryIndex index.html

<IfModule mod_mime.c>
  AddType application/wasm .wasm
  AddType image/webp .webp
  AddType image/avif .avif
  AddType image/svg+xml .svg .svgz
  AddType image/png .png
  AddType image/jpeg .jpg .jpeg
  AddType image/gif .gif
  AddType font/woff2 .woff2
  AddType font/woff .woff
  AddType font/ttf .ttf
</IfModule>

# Enable Brotli compression (LiteSpeed / Apache 2.4+)
<IfModule mod_brotli.c>
  AddOutputFilterByType BROTLI_COMPRESS text/html text/plain text/xml text/css text/javascript application/javascript application/x-javascript application/json application/xml application/wasm image/svg+xml font/ttf font/otf
</IfModule>

# Enable Gzip compression for 3x-4x faster asset & API delivery on cPanel
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/x-javascript application/json application/xml application/wasm image/svg+xml font/ttf font/otf
</IfModule>

# Long-term browser caching for hashed Vite assets, offline WASM studios & uploaded images
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType application/json "access plus 0 seconds"
  ExpiresByType application/wasm "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/javascript "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType font/woff "access plus 1 year"
  ExpiresByType font/ttf "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/avif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
  # Always revalidate HTML, SW, manifest, and PhotoCraft loader index
  <FilesMatch "\\.(html|htm)$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
  <FilesMatch "^(sw\\.js|manifest\\.json|photocraft-web\\.js|parts\\.txt)$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
  # Immutable cache for hashed static assets & offline WASM modules
  <FilesMatch "\\.(js|css|wasm|woff2|woff|ttf|webp|avif|png|jpg|jpeg|svg|gif|part-[a-z]+)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

# Protect internal JSON stores, cron tokens, and lock files from direct HTTP access
<FilesMatch "^(seo-autopilot-config\.json|seo-autopilot-state\.json|inquiries\.json|settings\.json|.*\.lock)$">
  <IfModule mod_authz_core.c>
    Require all denied
  </IfModule>
  <IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
  </IfModule>
</FilesMatch>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Route all /api/* requests to pure PHP backend (api.php)
  RewriteRule ^api/?(.*)$ api.php?r=$1 [QSA,L]

  # Serve existing static files and directories directly
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Missing uploads and optional studio assets must return strict 404
  RewriteRule ^uploads/ - [R=404,L]
  RewriteRule ^studio/ - [R=404,L]

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
