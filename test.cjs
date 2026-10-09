const fs = require('fs');
const content = fs.readFileSync('components/ThreeDPreview.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 400; i < 900; i++) {
  if (lines[i].includes('boxRoot')) {
    console.log(i, lines[i]);
  }
}
