const fs = require('fs');
let content = fs.readFileSync('components/DielineGenerator.tsx', 'utf8');

// Replace customEntities={(selectedModel as any).entities || ((selectedModel.id !== 'fefco-0300' && selectedModel.id !== 'ecma-c1020' && dieline?.cuts) ? svgPathsToEntities(dieline.cuts || [], dieline.creases || []) : undefined)}
// With: customEntities={(selectedModel as any).entities || (selectedModel.id.startsWith('custom-') && dieline?.cuts ? svgPathsToEntities(dieline.cuts || [], dieline.creases || []) : undefined)}

const original = "((selectedModel.id !== 'fefco-0300' && selectedModel.id !== 'ecma-c1020' && dieline?.cuts) ? svgPathsToEntities(dieline.cuts || [], dieline.creases || []) : undefined)";
const replacement = "(selectedModel.id.startsWith('custom-') && dieline?.cuts ? svgPathsToEntities(dieline.cuts || [], dieline.creases || []) : undefined)";

content = content.split(original).join(replacement);

fs.writeFileSync('components/DielineGenerator.tsx', content);
console.log('Replaced in DielineGenerator.tsx');
