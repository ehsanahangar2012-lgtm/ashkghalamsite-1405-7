const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

const currentVersion = pkg.version || '3.26.0';
const arg = process.argv[2] || 'patch';

function toPersianDigits(str) {
  const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/\d/g, (d) => map[Number(d)]);
}

function computeNextVersion(cur, mode) {
  if (/^\d+\.\d+\.\d+$/.test(mode)) return mode;
  const parts = cur.split('.').map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  if (mode === 'major') return `${parts[0] + 1}.0.0`;
  if (mode === 'minor') return `${parts[0]}.${parts[1] + 1}.0`;
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

const nextVersion = computeNextVersion(currentVersion, arg);
const curFa = toPersianDigits(currentVersion);
const nextFa = toPersianDigits(nextVersion);

function updateFile(relPath, replacer) {
  const full = path.join(rootDir, relPath);
  if (!fs.existsSync(full)) return;
  const before = fs.readFileSync(full, 'utf-8');
  const after = replacer(before);
  if (after !== before) {
    fs.writeFileSync(full, after, 'utf-8');
    console.log(`  updated ${relPath}`);
  }
}

console.log(`Bumping Ashk Ghalam version: ${currentVersion} -> ${nextVersion} (${nextFa})`);

// 1. package.json
updateFile('package.json', (c) =>
  c.replace(/"version":\s*"\d+\.\d+\.\d+"/, `"version": "${nextVersion}"`)
);

// 2. server.ts
updateFile('server.ts', (c) =>
  c.replace(/const APP_VERSION = '\d+\.\d+\.\d+';/, `const APP_VERSION = '${nextVersion}';`)
);

// 3. public/api.php
updateFile('public/api.php', (c) =>
  c.replace(/define\('APP_VERSION',\s*'\d+\.\d+\.\d+'\);/, `define('APP_VERSION', '${nextVersion}');`)
);

// 4. index.html
updateFile('index.html', (c) => c.replace(/v\d+\.\d+\.\d+/g, `v${nextVersion}`));

// 5. public/manifest.json
updateFile('public/manifest.json', (c) => c.replace(/v\d+\.\d+\.\d+/g, `v${nextVersion}`));

// 6. public/sw.js
updateFile('public/sw.js', (c) => c.replace(/v\d+\.\d+\.\d+/g, `v${nextVersion}`));

// 7. scripts/pack_release_zips.cjs
updateFile('scripts/pack_release_zips.cjs', (c) =>
  c.replace(/const version = pkg\.version \|\| '\d+\.\d+\.\d+';/, `const version = pkg.version || '${nextVersion}';`)
);

// 8. AdminPanel.tsx
updateFile('src/components/AdminPanel.tsx', (c) =>
  c
    .replace(new RegExp(`v${currentVersion.replace(/\./g, '\\.')}`, 'g'), `v${nextVersion}`)
    .replace(new RegExp(`نسخه ${curFa.replace(/\./g, '\\.')}`, 'g'), `نسخه ${nextFa}`)
);

// 9. BackupManager.tsx
updateFile('src/components/BackupManager.tsx', (c) =>
  c
    .replace(new RegExp(`ashk-ghalam-v${currentVersion.replace(/\./g, '\\.')}-cpanel\\.zip`, 'g'), `ashk-ghalam-v${nextVersion}-cpanel.zip`)
    .replace(new RegExp(`'${currentVersion.replace(/\./g, '\\.')}'`, 'g'), `'${nextVersion}'`)
    .replace(new RegExp(`v${currentVersion.replace(/\./g, '\\.')}`, 'g'), `v${nextVersion}`)
);

// 10. DownloadReleasePage.tsx
updateFile('src/components/DownloadReleasePage.tsx', (c) =>
  c
    .replace(new RegExp(`ashk-ghalam-v${currentVersion.replace(/\./g, '\\.')}-cpanel\\.zip`, 'g'), `ashk-ghalam-v${nextVersion}-cpanel.zip`)
    .replace(new RegExp(`'${currentVersion.replace(/\./g, '\\.')}'`, 'g'), `'${nextVersion}'`)
);

// 11. Login.tsx
updateFile('src/components/Login.tsx', (c) =>
  c.replace(/PORTAL SECURITY v\d+\.\d+\.\d+/, `PORTAL SECURITY v${nextVersion}`)
);

// 12. SoftwareMarketplace.tsx
updateFile('src/components/SoftwareMarketplace.tsx', (c) =>
  c
    .replace(new RegExp(`ashk-ghalam-v${currentVersion.replace(/\./g, '\\.')}-cpanel\\.zip`, 'g'), `ashk-ghalam-v${nextVersion}-cpanel.zip`)
    .replace(new RegExp(`ashk-packaging-rules-v${currentVersion.replace(/\./g, '\\.')}\\.json`, 'g'), `ashk-packaging-rules-v${nextVersion}.json`)
    .replace(new RegExp(`v${currentVersion.replace(/\./g, '\\.')}`, 'g'), `v${nextVersion}`)
    .replace(new RegExp(`version:\\s*'${currentVersion.replace(/\./g, '\\.')}'`, 'g'), `version: '${nextVersion}'`)
);

// 13. ContentContext.tsx
updateFile('src/contexts/ContentContext.tsx', (c) =>
  c
    .replace(/heroBadge:\s*'نسخه [۰-۹.]+\s*-/, `heroBadge: 'نسخه ${nextFa} -`)
    .replace(/\.replace\(\/۳\\\.\([^)]+\)\\\.۰\/g,\s*'[^']+'\)/, `.replace(/۳\\.(۲۰|۲۱|۲۲|۲۳|۲۴|۲۵|۲۶)\\.۰/g, '${nextFa}')`)
);

console.log(`✅ Version bumped to ${nextVersion} across all project files.`);
