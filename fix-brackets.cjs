const fs = require('fs');
let content = fs.readFileSync('components/ThreeDPreview.tsx', 'utf8');
const lines = content.split('\n');

console.log(lines.slice(975, 990).join('\n'));
