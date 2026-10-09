const fs = require('fs');
let content = fs.readFileSync('components/ThreeDPreview.tsx', 'utf8');

const replacement = `
  const deduplicated = [];
  for (let i = 0; i < next.length; i++) {
    const p1 = next[i];
    const p2 = next[(i + 1) % next.length];
    if (p1.distanceTo(p2) > 1e-4) {
      deduplicated.push(p1);
    }
  }
  
  if (deduplicated.length < 3) return [];

  // Remove collinear points
  const cleaned = [];
  for (let i = 0; i < deduplicated.length; i++) {
    const prev = deduplicated[(i - 1 + deduplicated.length) % deduplicated.length];
    const curr = deduplicated[i];
    const nextPt = deduplicated[(i + 1) % deduplicated.length];
    
    // Check if curr is collinear with prev and next
    const crossProduct = (curr.x - prev.x) * (nextPt.y - prev.y) - (curr.y - prev.y) * (nextPt.x - prev.x);
    if (Math.abs(crossProduct) > 1e-4) {
       cleaned.push(curr);
    }
  }
  
  if (cleaned.length < 3) return [];
  return cleaned;
}
`;

content = content.replace(
  /const deduplicated: THREE\.Vector2\[\] = \[\];[\s\S]*?if \(deduplicated\.length < 3\) return \[\];\s*return deduplicated;\s*\}/,
  replacement
);

fs.writeFileSync('components/ThreeDPreview.tsx', content);
