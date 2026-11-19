const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const downloadsDir = path.join(publicDir, 'downloads');

const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const version = pkg.version || '3.14.0';

const zipFileName = `ashk-ghalam-v${version}-cpanel.zip`;
const outputZipPath = path.join(downloadsDir, zipFileName);

// Clean any legacy or old zip files from public/, public/downloads/, and dist/
const legacyPublicZip = path.join(publicDir, 'ashk-ghalam-erp-cpanel-release.zip');
if (fs.existsSync(legacyPublicZip)) {
  fs.unlinkSync(legacyPublicZip);
}
if (fs.existsSync(distDir)) {
  for (const entry of fs.readdirSync(distDir)) {
    if (entry.endsWith('.zip')) {
      fs.unlinkSync(path.join(distDir, entry));
    }
  }
}
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
} else {
  for (const entry of fs.readdirSync(downloadsDir)) {
    if (entry.endsWith('.zip')) {
      fs.unlinkSync(path.join(downloadsDir, entry));
    }
  }
}

console.log(`Packing flat cPanel production ZIP (${zipFileName})...`);

const zip = new AdmZip();

// Add compiled client + server + worker files directly at ZIP root (no nested dist/ wrapper folder)
if (fs.existsSync(distDir)) {
  zip.addLocalFolder(distDir, '', (filename) => {
    const normalized = filename.replace(/\\/g, '/');
    if (normalized.endsWith('.zip') || normalized.endsWith('.map')) return false;
    if (normalized.startsWith('downloads/')) return false;
    return true;
  });
}

// Add cPanel-ready package.json at ZIP root with "start": "node server.js"
const cpanelPkg = {
  ...pkg,
  scripts: {
    ...(pkg.scripts || {}),
    start: 'node server.js',
  },
};
zip.addFile('package.json', Buffer.from(JSON.stringify(cpanelPkg, null, 2), 'utf-8'));

// Add Apache/cPanel .htaccess for clean SPA routing if deployed to static public_html
const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_URI} !^/api/
  RewriteRule . /index.html [L]
</IfModule>
`;
zip.addFile('.htaccess', Buffer.from(htaccessContent, 'utf-8'));

const essentialFiles = ['.env.example', 'catalogs.json', 'flipbooks.json', 'posts.json', 'settings.json'];
for (const file of essentialFiles) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    zip.addLocalFile(filePath);
  }
}

zip.writeZip(outputZipPath);

// Mirror built release ZIP into dist/downloads AFTER writeZip so dist-only production servers also serve it
const distDownloadsDir = path.join(distDir, 'downloads');
if (!fs.existsSync(distDownloadsDir)) {
  fs.mkdirSync(distDownloadsDir, { recursive: true });
}
fs.copyFileSync(outputZipPath, path.join(distDownloadsDir, zipFileName));

const sizeMb = (fs.statSync(outputZipPath).size / (1024 * 1024)).toFixed(2);
console.log(`✅ Standalone flat cPanel release created: ${outputZipPath} (${sizeMb} MB)`);

