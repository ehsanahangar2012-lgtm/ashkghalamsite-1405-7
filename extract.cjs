const fs = require('fs');
const content = fs.readFileSync('dist/assets/index-DUjQUU81.js', 'utf8');
const idx = content.indexOf('Clipped panel cell extrusion skipped');
if (idx !== -1) {
    console.log(content.substring(Math.max(0, idx - 4000), idx + 2000));
} else {
    console.log("NOT FOUND");
}
