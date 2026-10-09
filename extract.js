const fs = require('fs');
const content = fs.readFileSync('dist/assets/index-DUjQUU81.js', 'utf8');
const idx = content.indexOf('fefco-0300');
console.log(content.substring(Math.max(0, idx - 500), idx + 2000));
