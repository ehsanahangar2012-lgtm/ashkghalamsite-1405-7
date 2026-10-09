const fs = require('fs');
let content = fs.readFileSync('components/ThreeDPreview.tsx', 'utf8');
const lines = content.split('\n');

const insertIdx = lines.findIndex(l => l.includes('if (customEntities && customEntities.length > 0) {'));

const missingCode = `
    const boxRoot = new THREE.Group();
    scene.add(boxRoot);

    let updateFolds = () => {};
    let isTelescopic = selectedModelId.includes('0300') || selectedModelId.includes('telescopic');
    let isMailer = selectedModelId.includes('0427') || selectedModelId.includes('mailer');
    let isRsc = selectedModelId.includes('0201') || selectedModelId.includes('rsc');
`;

lines.splice(insertIdx, 0, missingCode);
fs.writeFileSync('components/ThreeDPreview.tsx', lines.join('\n'));
