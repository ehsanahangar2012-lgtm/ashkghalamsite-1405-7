import fs from 'fs';
import path from 'path';

const OUTPUT = 'DIELINE_ARCHITECTURE_EXPORT.md';
const FOLDERS = ['components', 'services', 'store', 'types.ts', 'server.ts', 'src'];

let outputContent = `# Dieline Module Architecture Export\nGenerated for Architecture Review\n\n`;

function processPath(targetPath: string) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    if (targetPath.endsWith('.ts') || targetPath.endsWith('.tsx')) {
      const content = fs.readFileSync(targetPath, 'utf-8');
      outputContent += `## File: /${targetPath}\n\n\`\`\`typescript\n${content}\n\`\`\`\n\n`;
    }
  } else if (stat.isDirectory()) {
    const files = fs.readdirSync(targetPath);
    for (const file of files) {
      processPath(path.join(targetPath, file));
    }
  }
}

for (const folder of FOLDERS) {
  processPath(folder);
}

fs.writeFileSync(OUTPUT, outputContent);
console.log('Export generated successfully at ' + OUTPUT);
