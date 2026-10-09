import re

with open('services/dielineMath.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# I used patch_fix_0427_labels.py before, but it didn't match. 
# Let's fix line 1016 and 1017.
lines = content.split('\\n')
new_lines = []
for line in lines:
    if "labels.push({ x: (x1+x2)/2" in line and "W:" in line:
        pass # Skip
    elif "labels.push({ x: (x3+x4)/2" in line and "W:" in line:
        pass # Skip
    else:
        new_lines.append(line)

with open('services/dielineMath.ts', 'w', encoding='utf-8') as f:
    f.write('\\n'.join(new_lines))
