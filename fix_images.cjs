const fs = require('fs');

const svgPlaceholder = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='900' height='600' viewBox='0 0 900 600'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='50%' font-family='sans-serif' font-size='40' fill='%2364748b' text-anchor='middle' dominant-baseline='middle'>Catalog Image</text></svg>";

function replaceInFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+\?auto=format&fit=crop&q=80&w=\d+/g, svgPlaceholder);
  fs.writeFileSync(file, content);
}

replaceInFile('src/services/catalogService.ts');
replaceInFile('src/components/catalog/Admin3DCatalogDashboard.tsx');
console.log('Done!');
