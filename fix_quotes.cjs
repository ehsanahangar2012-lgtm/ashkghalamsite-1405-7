const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/'data:image\/svg\+xml;utf8,<svg xmlns='http:\/\/www\.w3\.org\/2000\/svg' width='900' height='600' viewBox='0 0 900 600'><rect width='100%' height='100%' fill='%231e293b'\/><text x='50%' y='50%' font-family='sans-serif' font-size='40' fill='%2364748b' text-anchor='middle' dominant-baseline='middle'>Catalog Image<\/text><\/svg>'/g, 
  '"data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"900\\" height=\\"600\\" viewBox=\\"0 0 900 600\\"><rect width=\\"100%\\" height=\\"100%\\" fill=\\"%231e293b\\"/><text x=\\"50%\\" y=\\"50%\\" font-family=\\"sans-serif\\" font-size=\\"40\\" fill=\\"%2364748b\\" text-anchor=\\"middle\\" dominant-baseline=\\"middle\\">Catalog Image</text></svg>"');
  fs.writeFileSync(file, content);
}

fixFile('src/services/catalogService.ts');
fixFile('src/components/catalog/Admin3DCatalogDashboard.tsx');
console.log('Fixed quotes!');
