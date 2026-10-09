with open('components/DielineGenerator.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "{/* Folding simulation controls */}" in line:
        # Insert a </div> before this line
        lines.insert(i, "                  </div>\n")
        break

with open('components/DielineGenerator.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
