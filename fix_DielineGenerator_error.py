import re
with open('components/DielineGenerator.tsx', 'r') as f:
    c = f.read()
# Remove the console.log from the JSX which caused TS1345
c = c.replace("(console.log('Rendering labels:', dieline.labels) || true) && ", "")
with open('components/DielineGenerator.tsx', 'w') as f:
    f.write(c)
