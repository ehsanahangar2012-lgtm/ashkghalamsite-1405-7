const fs = require('fs');
let content = fs.readFileSync('components/ThreeDPreview.tsx', 'utf8');

const replacement = `
  current = next;
  if (current.length < 3) return [];

  // Deduplicate points to prevent Earcut triangulation errors
  const deduplicated = [];
  for (let i = 0; i < current.length; i++) {
    const p = current[i];
    if (deduplicated.length === 0 || deduplicated[deduplicated.length - 1].distanceTo(p) > 1e-4) {
      deduplicated.push(p);
    }
  }
  if (deduplicated.length > 1 && deduplicated[deduplicated.length - 1].distanceTo(deduplicated[0]) <= 1e-4) {
    deduplicated.pop();
  }
  
  return deduplicated.length >= 3 ? deduplicated : [];
}
`;

content = content.replace(
  /current = next;\s*if \(current\.length < 3\) return \[\];\s*return current;\s*\}/,
  replacement
);

fs.writeFileSync('components/ThreeDPreview.tsx', content);
