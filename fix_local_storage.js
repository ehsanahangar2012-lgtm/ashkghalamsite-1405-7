const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace localStorage.setItem('ashk_custom_catalogs_v2', ...)
  // with try { localStorage.setItem('ashk_custom_catalogs_v2', ...) } catch (e) { console.warn('localStorage quota error'); }
  // Only if it's not already in a try-catch block!

  // A simple regex replacement:
  content = content.replace(/localStorage\.setItem\('ashk_custom_catalogs_v2',\s*(.+?)\);/g, (match, p1) => {
    // Check if it's already in a try block. Simple heuristic: look backwards.
    // Better just unconditionally replace it but we must be careful with formatting.
    return `try { localStorage.setItem('ashk_custom_catalogs_v2', ${p1}); } catch (e) { console.warn('localStorage quota exceeded', e); }`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
}

fixFile('components/AdminCatalogManager.tsx');
fixFile('components/Flipbook.tsx');
// CatalogUploadStudio.tsx was already manually fixed.
