const fs = require('fs');

// App.tsx
let appContent = fs.readFileSync('App.tsx', 'utf8');
appContent = appContent.replace(/import \{ ThreeDProductSlider \} from '\.\/components\/ThreeDProductSlider';\n/, '');
appContent = appContent.replace(/<ThreeDProductSlider onNavigate=\{toggleView\} \/>\n/, '');
fs.writeFileSync('App.tsx', appContent);

// AdminTools.tsx
let adminTools = fs.readFileSync('components/AdminTools.tsx', 'utf8');
adminTools = adminTools.replace(/<ProductionSimulator \/>/, '');
fs.writeFileSync('components/AdminTools.tsx', adminTools);

try { fs.unlinkSync('components/ThreeDProductSlider.tsx'); } catch (e) {}

