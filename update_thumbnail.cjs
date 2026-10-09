const fs = require('fs');
let content = fs.readFileSync('components/CatalogUploadStudio.tsx', 'utf8');

const overlayCode = `
                      {/* AI Extracted Info Badge/Preview */}
                      {page.text && page.text.length > 50 && !page.text.startsWith('فصل') && (
                        <div className="absolute bottom-6 left-1.5 right-1.5 bg-indigo-900/90 border border-indigo-500/50 backdrop-blur text-indigo-100 text-[8px] font-mono p-1 rounded overflow-hidden max-h-12 leading-tight">
                          {page.text.substring(0, 100)}...
                        </div>
                      )}
`;

content = content.replace('{/* Page Number Overlay */}', overlayCode + '\\n                      {/* Page Number Overlay */}');
fs.writeFileSync('components/CatalogUploadStudio.tsx', content, 'utf8');
