/**
 * Downloads & extracts official offline WebAssembly builds of PhotoCraft & VectorCraft
 * from GitHub Releases into public/studio/{photocraft,vectorcraft}.
 * Usage:
 *   node scripts/install_offline_studios.cjs          # installs missing studios only
 *   node scripts/install_offline_studios.cjs --force  # re-downloads and overwrites
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');

const rootDir = path.resolve(__dirname, '..');
const studioRoot = path.join(rootDir, 'public', 'studio');
const force = process.argv.includes('--force');

const STUDIOS = [
  {
    name: 'photocraft',
    version: '0.23.1',
    url: 'https://github.com/storytold/photocraft/releases/download/v0.23.1/photocraft-web-0.23.1.zip',
  },
  {
    name: 'vectorcraft',
    version: '0.24.1',
    url: 'https://github.com/storytold/vectorcraft/releases/download/v0.24.1/vectorcraft-web-0.24.1.zip',
  },
  {
    name: 'cadcraft',
    version: '0.20.1',
    url: 'https://github.com/storytold/cadcraft/releases/download/v0.20.1/cadcraft-web-0.20.1.zip',
  },
];

function downloadToBuffer(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    if (redirects <= 0) return reject(new Error('Too many redirects'));
    https
      .get(url, { headers: { 'User-Agent': 'ashk-ghalam-studio-installer' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(downloadToBuffer(res.headers.location, redirects - 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function installStudio(studio) {
  const targetDir = path.join(studioRoot, studio.name);
  const indexHtml = path.join(targetDir, 'index.html');
  if (!force && fs.existsSync(indexHtml)) {
    console.log(`[studio:install] ${studio.name} v${studio.version} already installed at ${targetDir}`);
    return;
  }

  console.log(`[studio:install] Downloading ${studio.name} v${studio.version}...`);
  const zipBuf = await downloadToBuffer(studio.url);
  const zip = new AdmZip(zipBuf);

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  const entries = zip.getEntries();
  // Detect single wrapping root folder inside the release archive (if any)
  const topSegments = new Set(
    entries
      .map((e) => e.entryName.replace(/\\/g, '/').split('/')[0])
      .filter(Boolean)
  );
  const stripPrefix = topSegments.size === 1 && entries.some((e) => e.entryName.includes('/'))
    ? `${[...topSegments][0]}/`
    : '';

  for (const entry of entries) {
    const cleanName = entry.entryName.replace(/\\/g, '/');
    const relPath = stripPrefix && cleanName.startsWith(stripPrefix)
      ? cleanName.slice(stripPrefix.length)
      : cleanName;
    if (!relPath) continue;
    const outPath = path.join(targetDir, relPath);
    if (entry.isDirectory) {
      fs.mkdirSync(outPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, entry.getData());
    }
  }

  // Fix upstream PhotoCraft v0.23.1 packaging bug where app/photocraft-web.js imports ./snippets/...
  if (studio.name === 'photocraft') {
    const rootSnippets = path.join(targetDir, 'snippets');
    const appSnippets = path.join(targetDir, 'app', 'snippets');
    if (fs.existsSync(rootSnippets) && !fs.existsSync(appSnippets)) {
      fs.cpSync(rootSnippets, appSnippets, { recursive: true });
    }
  }

  // Strip crossorigin="anonymous" integrity attributes from same-origin preload links so cookie-authenticated proxies work seamlessly
  if (fs.existsSync(indexHtml)) {
    let html = fs.readFileSync(indexHtml, 'utf-8');
    html = html.replace(/\s+crossorigin="anonymous"/g, '').replace(/\s+integrity="sha384-[^"]+"/g, '');
    fs.writeFileSync(indexHtml, html, 'utf-8');
  }

  console.log(`[studio:install] ✅ Installed ${studio.name} v${studio.version} -> public/studio/${studio.name}`);
}

(async () => {
  fs.mkdirSync(studioRoot, { recursive: true });
  for (const studio of STUDIOS) {
    await installStudio(studio);
  }
})().catch((err) => {
  console.error('[studio:install] Failed:', err.message);
  process.exit(1);
});
