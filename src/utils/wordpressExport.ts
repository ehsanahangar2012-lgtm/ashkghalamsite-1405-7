import { CatalogProject } from '../types/flipbook';
import { resolveAbsoluteAssetUrl } from './catalogAssets';

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateIframeEmbedCode(
  embedUrl: string,
  options: { width?: string; height?: string; title?: string } = {}
): string {
  const width = options.width || '100%';
  const height = options.height || '680px';
  const title = escapeHtml(options.title || 'کاتالوگ دیجیتال محصول');
  const safeUrl = escapeHtml(embedUrl);

  return `<!-- کاتالوگ دیجیتال سه‌بعدی (ورق‌نگار) -->
<div style="width:${escapeHtml(width)};max-width:100%;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 20px 45px rgba(0,0,0,0.14);background:#111318;">
  <iframe
    src="${safeUrl}"
    title="${title}"
    width="100%"
    height="${escapeHtml(height)}"
    style="width:100%;height:${escapeHtml(height)};border:0;display:block;"
    loading="lazy"
    allowfullscreen
  ></iframe>
</div>`;
}

export function generateWordpressShortcodePhp(embedUrl: string, project: CatalogProject): string {
  const safeTitle = (project.cover.title || 'کاتالوگ دیجیتال').replace(/'/g, "\\'");
  const safeUrl = embedUrl.replace(/'/g, "\\'");

  return `<?php
/**
 * کد شورتکد کاتالوگ دیجیتال سه‌بعدی برای فایل functions.php قالب وردپرس
 * استفاده در نوشته‌ها و برگه‌ها: [digital_catalog]
 */
function varaghnegar_digital_catalog_shortcode( $atts ) {
    $a = shortcode_atts( array(
        'url'    => '${safeUrl}',
        'height' => '680px',
        'title'  => '${safeTitle}',
    ), $atts );

    return sprintf(
        '<div class="varaghnegar-flipbook-wrap" style="width:100%%;max-width:100%%;margin:24px auto;border-radius:16px;overflow:hidden;box-shadow:0 20px 45px rgba(0,0,0,0.14);background:#111318;"><iframe src="%s" title="%s" style="width:100%%;height:%s;border:0;display:block;" loading="lazy" allowfullscreen></iframe></div>',
        esc_url( $a['url'] ),
        esc_attr( $a['title'] ),
        esc_attr( $a['height'] )
    );
}
add_shortcode( 'digital_catalog', 'varaghnegar_digital_catalog_shortcode' );`;
}

/**
 * Generates a fully self-contained single-file HTML5 + CSS 3D Flipbook widget
 * that runs natively inside any WordPress Custom HTML block or standalone page.
 */
export function generateStandaloneHtml(project: CatalogProject): string {
  const landscapeCount = project.pages.filter(
    (p) => (p.width || p.originalWidth) > (p.height || p.originalHeight) * 1.05
  ).length;
  const portraitCount = project.pages.length - landscapeCount;
  const isLandscapeBook =
    project.pageOrientation === 'landscape' ||
    (project.pageOrientation !== 'portrait' && landscapeCount > portraitCount);

  const pageCssWidth = isLandscapeBook ? '540px' : '400px';
  const pageCssHeight = isLandscapeBook ? '405px' : '545px';

  const safeData = {
    title: project.cover.title,
    subtitle: project.cover.subtitle,
    brandName: project.cover.brandName,
    editionLabel: project.cover.editionLabel,
    yearLabel: project.cover.yearLabel,
    primaryColor: project.cover.primaryColor,
    accentColor: project.cover.accentColor,
    textColor: project.cover.textColor,
    logoDataUrl: resolveAbsoluteAssetUrl(project.cover.logoDataUrl),
    frontCustomImageUrl: resolveAbsoluteAssetUrl(project.cover.frontCustomImageUrl),
    backCustomImageUrl: resolveAbsoluteAssetUrl(project.cover.backCustomImageUrl),
    backHeadline: project.cover.backHeadline,
    backDescription: project.cover.backDescription,
    backContactInfo: project.cover.backContactInfo,
    backWebsite: project.cover.backWebsite,
    flipDirection: project.flipDirection,
    pages: project.pages.map((p) => ({
      title: p.title,
      description: p.description,
      category: p.category,
      tags: p.tags,
      sku: p.sku || '',
      priceLabel: p.priceLabel || '',
      img: resolveAbsoluteAssetUrl(p.optimizedDataUrl || p.originalDataUrl),
    })),
  };

  // Prevent closing script tags in embedded JSON
  const serializedJson = JSON.stringify(safeData).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(project.cover.title || 'کاتالوگ دیجیتال محصول')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Vazirmatn', Tahoma, sans-serif;
      background: #111318;
      color: #f4f4f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    .vn-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      max-height: 100vh;
      width: 100%;
    }
    .vn-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      background: #181a20;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-wrap: wrap;
    }
    .vn-brand { font-size: 14px; font-weight: 700; color: #fafafa; }
    .vn-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .vn-btn {
      background: #27272a;
      color: #f4f4f5;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      padding: 6px 12px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .vn-btn:hover:not(:disabled) { background: #3f3f46; }
    .vn-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .vn-btn.muted { color: #a1a1aa; }
    .vn-stage {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow: auto;
      perspective: 2200px;
    }
    .vn-book {
      display: flex;
      gap: 2px;
      transform-origin: center center;
      transition: transform 0.25s ease;
      box-shadow: 0 28px 65px rgba(0,0,0,0.6);
      border-radius: 8px;
      overflow: hidden;
      background: #1f2229;
    }
    .vn-page {
      width: ${pageCssWidth};
      max-width: 90vw;
      height: ${pageCssHeight};
      max-height: 76vh;
      background: #ffffff;
      color: #18181b;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      animation: vnFlipIn 0.36s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes vnFlipIn {
      from { opacity: 0.45; transform: rotateY(-12deg) scale(0.985); }
      to { opacity: 1; transform: rotateY(0deg) scale(1); }
    }
    .vn-page-img-wrap {
      width: 100%;
      height: ${isLandscapeBook ? '62%' : '60%'};
      background: #f4f4f5;
      border-bottom: 1px solid #e4e4e7;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      flex-shrink: 0;
    }
    .vn-page-img { max-width: 100%; max-height: 100%; width: 100%; height: 100%; object-fit: contain; }
    .vn-page-body { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; justify-content: space-between; min-height: 0; }
    .vn-meta { font-size: 11px; color: #b45309; font-weight: 700; }
    .vn-title { font-size: 14px; font-weight: 800; color: #18181b; line-height: 1.4; }
    .vn-desc { font-size: 11.5px; color: #52525b; line-height: 1.65; overflow: hidden; }
    .vn-footer { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 6px; }
    .vn-cover {
      width: 100%;
      height: 100%;
      padding: 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      background-size: cover;
      background-position: center;
    }
    .vn-jump {
      width: 52px;
      background: #27272a;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      color: #fff;
      text-align: center;
      padding: 5px;
      font-family: inherit;
      font-size: 12px;
    }
    @media (max-width: 768px) {
      .vn-page { width: 92vw; height: ${isLandscapeBook ? '54vh' : '68vh'}; }
    }
  </style>
</head>
<body>
  <div class="vn-shell" id="vn-app">
    <div class="vn-toolbar">
      <div class="vn-brand">${escapeHtml(project.cover.title || 'کاتالوگ دیجیتال')}</div>
      <div class="vn-controls">
        <button class="vn-btn" id="vn-prev">صفحه قبلی</button>
        <input class="vn-jump" id="vn-jump" type="number" min="1" value="1" aria-label="شماره صفحه" />
        <span id="vn-counter" style="font-size:12px;color:#a1a1aa;"></span>
        <button class="vn-btn" id="vn-next">صفحه بعدی</button>
        <button class="vn-btn" id="vn-zoom-out">کوچک‌نمایی</button>
        <button class="vn-btn" id="vn-zoom-in">بزرگ‌نمایی</button>
        <button class="vn-btn" id="vn-sound">صدا روشن</button>
        <button class="vn-btn" id="vn-fs">تمام‌صفحه</button>
      </div>
    </div>
    <div class="vn-stage" id="vn-stage">
      <div class="vn-book" id="vn-book"></div>
    </div>
  </div>
  <script>
    (function() {
      var data = ${serializedJson};
      var items = [{ type: 'front' }].concat(
        data.pages.map(function(p, idx) { return { type: 'page', page: p, num: idx + 1 }; }),
        [{ type: 'back' }]
      );
      var current = 0;
      var zoom = 1;
      var isMuted = false;
      var audioCtx = null;
      var isMobile = window.innerWidth < 768;
      var bookEl = document.getElementById('vn-book');
      var counterEl = document.getElementById('vn-counter');
      var jumpEl = document.getElementById('vn-jump');
      var prevBtn = document.getElementById('vn-prev');
      var nextBtn = document.getElementById('vn-next');
      var soundBtn = document.getElementById('vn-sound');

      function playFlipSound() {
        if (isMuted) return;
        try {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return;
          if (!audioCtx) audioCtx = new Ctx();
          if (audioCtx.state === 'suspended') audioCtx.resume();
          var dur = 0.14;
          var len = Math.floor(audioCtx.sampleRate * dur);
          var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
          var ch = buf.getChannelData(0);
          for (var i = 0; i < len; i++) {
            ch[i] = (Math.random() * 2 - 1) * 0.25 * Math.sin((i / len) * Math.PI);
          }
          var src = audioCtx.createBufferSource();
          src.buffer = buf;
          var flt = audioCtx.createBiquadFilter();
          flt.type = 'bandpass';
          flt.frequency.value = 1400;
          var g = audioCtx.createGain();
          g.gain.value = 0.18;
          src.connect(flt); flt.connect(g); g.connect(audioCtx.destination);
          src.start();
        } catch(e) {}
      }

      soundBtn.onclick = function() {
        isMuted = !isMuted;
        soundBtn.textContent = isMuted ? 'حالت سایلنت' : 'صدا روشن';
        soundBtn.className = isMuted ? 'vn-btn muted' : 'vn-btn';
        if (!isMuted) playFlipSound();
      };

      function esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      }

      function renderCard(entry) {
        if (entry.type === 'front') {
          var bg = data.frontCustomImageUrl
            ? 'background-image:linear-gradient(to top,rgba(0,0,0,0.78),rgba(0,0,0,0.25)),url(' + esc(data.frontCustomImageUrl) + ');color:#fff;'
            : 'background:' + esc(data.primaryColor) + ';color:' + esc(data.textColor) + ';';
          return '<div class="vn-page"><div class="vn-cover" style="' + bg + '">' +
            '<div style="font-size:12px;opacity:0.85;">' + esc(data.brandName) + ' · ' + esc(data.yearLabel) + '</div>' +
            '<div>' +
              (data.logoDataUrl ? '<img src="' + esc(data.logoDataUrl) + '" style="max-height:54px;margin:0 auto 14px;display:block;" alt="لوگو"/>' : '') +
              '<h1 style="font-size:22px;font-weight:800;margin-bottom:10px;line-height:1.4;">' + esc(data.title) + '</h1>' +
              '<p style="font-size:13px;opacity:0.85;line-height:1.7;">' + esc(data.subtitle) + '</p>' +
            '</div>' +
            '<div style="font-size:11px;color:' + esc(data.accentColor) + ';font-weight:700;">' + esc(data.editionLabel) + '</div>' +
          '</div></div>';
        }
        if (entry.type === 'back') {
          var bBg = data.backCustomImageUrl
            ? 'background-image:linear-gradient(to top,rgba(0,0,0,0.82),rgba(0,0,0,0.35)),url(' + esc(data.backCustomImageUrl) + ');color:#fff;'
            : 'background:' + esc(data.primaryColor) + ';color:' + esc(data.textColor) + ';';
          return '<div class="vn-page"><div class="vn-cover" style="' + bBg + '">' +
            '<div style="font-size:12px;opacity:0.8;">' + esc(data.brandName) + '</div>' +
            '<div>' +
              '<h2 style="font-size:18px;font-weight:800;margin-bottom:10px;">' + esc(data.backHeadline) + '</h2>' +
              '<p style="font-size:12px;opacity:0.85;line-height:1.8;">' + esc(data.backDescription) + '</p>' +
            '</div>' +
            '<div style="font-size:11px;opacity:0.85;line-height:1.8;">' + esc(data.backContactInfo) + '<br/>' + esc(data.backWebsite) + '</div>' +
          '</div></div>';
        }
        var p = entry.page;
        var tagsHtml = (p.tags || []).slice(0, 4).map(esc).join(' · ');
        return '<div class="vn-page">' +
          '<div class="vn-page-img-wrap"><img class="vn-page-img" src="' + esc(p.img) + '" alt="' + esc(p.title) + '" loading="lazy" /></div>' +
          '<div class="vn-page-body">' +
            '<div>' +
              '<div class="vn-meta">' + esc(p.category) + (p.sku ? ' · کد ' + esc(p.sku) : '') + '</div>' +
              '<h3 class="vn-title">' + esc(p.title) + '</h3>' +
              '<p class="vn-desc">' + esc(p.description) + '</p>' +
            '</div>' +
            '<div class="vn-footer">' +
              '<span>' + tagsHtml + '</span>' +
              '<span style="font-weight:700;color:#18181b;">' + (p.priceLabel ? esc(p.priceLabel) : 'صفحه ' + entry.num) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      function render() {
        isMobile = window.innerWidth < 768;
        var html = '';
        if (isMobile || current === 0 || current >= items.length - 1) {
          html = renderCard(items[current]);
        } else {
          var first = items[current];
          var second = items[current + 1];
          html = data.flipDirection === 'rtl'
            ? renderCard(first) + (second ? renderCard(second) : '')
            : (second ? renderCard(second) : '') + renderCard(first);
        }
        bookEl.innerHTML = html;
        bookEl.style.transform = 'scale(' + zoom + ')';
        counterEl.textContent = 'از ' + items.length;
        jumpEl.max = items.length;
        jumpEl.value = current + 1;
        prevBtn.disabled = current <= 0;
        nextBtn.disabled = current >= items.length - 1;
      }

      function stepNext() {
        if (current >= items.length - 1) return;
        var step = (!isMobile && current > 0 && current + 2 < items.length) ? 2 : 1;
        current = Math.min(items.length - 1, current + step);
        playFlipSound();
        render();
      }
      function stepPrev() {
        if (current <= 0) return;
        var step = (!isMobile && current > 2 && current < items.length - 1) ? 2 : 1;
        current = Math.max(0, current - step);
        playFlipSound();
        render();
      }

      prevBtn.onclick = stepPrev;
      nextBtn.onclick = stepNext;
      jumpEl.onchange = function() {
        var val = parseInt(jumpEl.value, 10) || 1;
        current = Math.max(0, Math.min(items.length - 1, val - 1));
        playFlipSound();
        render();
      };
      document.getElementById('vn-zoom-in').onclick = function() { zoom = Math.min(1.8, +(zoom + 0.15).toFixed(2)); render(); };
      document.getElementById('vn-zoom-out').onclick = function() { zoom = Math.max(0.7, +(zoom - 0.15).toFixed(2)); render(); };
      document.getElementById('vn-fs').onclick = function() {
        var el = document.getElementById('vn-app');
        if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen();
        else if (document.exitFullscreen) document.exitFullscreen();
      };
      window.addEventListener('keydown', function(e) {
        if (data.flipDirection === 'rtl') {
          if (e.key === 'ArrowLeft') stepNext();
          if (e.key === 'ArrowRight') stepPrev();
        } else {
          if (e.key === 'ArrowRight') stepNext();
          if (e.key === 'ArrowLeft') stepPrev();
        }
      });
      var touchX = 0;
      bookEl.addEventListener('touchstart', function(e) { touchX = e.touches[0].clientX; }, { passive: true });
      bookEl.addEventListener('touchend', function(e) {
        var dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) < 40) return;
        if (data.flipDirection === 'rtl') {
          if (dx > 0) stepNext(); else stepPrev();
        } else {
          if (dx < 0) stepNext(); else stepPrev();
        }
      }, { passive: true });
      window.addEventListener('resize', render);
      render();
    })();
  </script>
</body>
</html>`;
}
