const fs = require('fs');
const content = fs.readFileSync('components/ThreeDPreview.tsx', 'utf8');

// I know that the original isMailer is around line 826, and the original isTelescopic is around 747.
// Actually, let's just find the blocks using Regex or indexOf with proper searching.

// Let's first extract the original parts we need.
// We need the part before the FIRST isTelescopic.
const firstTelescopic = content.indexOf('} else if (isTelescopic) {');
const part1 = content.substring(0, firstTelescopic);

// We need the original isTelescopic block.
const secondTelescopic = content.indexOf('} else if (isTelescopic) {', firstTelescopic + 1);
const originalMailer = content.indexOf('} else if (isMailer) {', secondTelescopic);
const isTelescopicBlock = content.substring(secondTelescopic, originalMailer);

// We need the new mailer block I wrote. It starts at the first isMailer.
const firstMailer = content.indexOf('    } else if (isMailer) {\n      // --- MAILER (KIBORDI) BOX ---');
// Wait, my new mailer block ends before '} else if (isTelescopic) {'.
const myNewMailerBlock = content.substring(firstMailer, secondTelescopic);

// We need the original isRsc and everything after.
const originalRsc = content.indexOf('} else if (isRsc) {');
const part4 = content.substring(originalRsc);

// So the new content should be: part1 + isTelescopicBlock + myNewMailerBlock + part4
const newContent = part1 + isTelescopicBlock + myNewMailerBlock + part4;

fs.writeFileSync('components/ThreeDPreview.tsx', newContent);
console.log("Fixed!");
