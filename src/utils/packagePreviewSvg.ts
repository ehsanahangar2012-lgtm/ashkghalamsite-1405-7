export type PreviewStyle = 'fefco0201' | 'fefco0427' | 'hardbox' | 'stand' | 'pharma';

export function createPackageSvgDataUrl(
  title: string,
  subtitle: string,
  style: PreviewStyle = 'fefco0201',
  accentColor = '#f59e0b'
): string {
  const safeTitle = title.replace(/[<>&"']/g, '');
  const safeSub = subtitle.replace(/[<>&"']/g, '');

  const blueprintPath =
    style === 'fefco0201'
      ? `<g stroke="${accentColor}" stroke-width="2" fill="none" opacity="0.9">
           <rect x="130" y="135" width="340" height="130" rx="2"/>
           <line x1="215" y1="135" x2="215" y2="265"/>
           <line x1="300" y1="135" x2="300" y2="265"/>
           <line x1="385" y1="135" x2="385" y2="265"/>
           <rect x="130" y="95" width="85" height="40"/>
           <rect x="215" y="95" width="85" height="40"/>
           <rect x="300" y="95" width="85" height="40"/>
           <rect x="385" y="95" width="85" height="40"/>
           <rect x="130" y="265" width="85" height="40"/>
           <rect x="215" y="265" width="85" height="40"/>
           <rect x="300" y="265" width="85" height="40"/>
           <rect x="385" y="265" width="85" height="40"/>
         </g>`
      : style === 'fefco0427'
      ? `<g stroke="${accentColor}" stroke-width="2" fill="none" opacity="0.9">
           <rect x="190" y="95" width="220" height="210" rx="4"/>
           <rect x="220" y="135" width="160" height="130" stroke-dasharray="6 4"/>
           <path d="M190,135 L145,145 L145,255 L190,265"/>
           <path d="M410,135 L455,145 L455,255 L410,265"/>
           <path d="M220,95 L235,60 L365,60 L380,95"/>
         </g>`
      : style === 'hardbox'
      ? `<g stroke="${accentColor}" stroke-width="2" fill="none" opacity="0.95">
           <polygon points="300,75 430,135 300,195 170,135" fill="${accentColor}" fill-opacity="0.12"/>
           <polygon points="170,135 300,195 300,305 170,245" fill="#1e293b" fill-opacity="0.8"/>
           <polygon points="430,135 300,195 300,305 430,245" fill="#0f172a" fill-opacity="0.9"/>
           <line x1="210" y1="154" x2="340" y2="94" stroke="#fde68a" stroke-width="1.5"/>
         </g>`
      : `<g stroke="${accentColor}" stroke-width="2" fill="none" opacity="0.9">
           <rect x="180" y="85" width="240" height="230" rx="6"/>
           <line x1="180" y1="150" x2="420" y2="150" stroke-dasharray="5 5"/>
           <line x1="180" y1="250" x2="420" y2="250" stroke-dasharray="5 5"/>
           <circle cx="300" cy="200" r="34" stroke="#38bdf8" stroke-width="1.5"/>
         </g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#020617"/>
        <stop offset="55%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e1b4b"/>
      </linearGradient>
      <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#334155" stroke-width="0.6" opacity="0.35"/>
      </pattern>
    </defs>
    <rect width="600" height="400" fill="url(#bg)"/>
    <rect width="600" height="400" fill="url(#grid)"/>
    ${blueprintPath}
    <rect x="28" y="328" width="544" height="52" rx="12" fill="#020617" fill-opacity="0.82" stroke="#1e293b"/>
    <text x="552" y="352" text-anchor="end" fill="#f8fafc" font-family="Vazirmatn, Tahoma, sans-serif" font-size="15" font-weight="700">${safeTitle}</text>
    <text x="552" y="370" text-anchor="end" fill="${accentColor}" font-family="Vazirmatn, Tahoma, sans-serif" font-size="11">${safeSub}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
