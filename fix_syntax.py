import re

with open('components/DielineGenerator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("                    {/* Folding simulation controls */}", "                  </div>\n                  {/* Folding simulation controls */}")

with open('components/DielineGenerator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

