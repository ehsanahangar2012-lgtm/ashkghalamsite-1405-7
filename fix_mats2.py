with open('components/ThreeDPreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("matsRef.current.main = material;\n    matsRef.current.side = sideMaterial;", "")
content = content.replace("const sideMaterial = new THREE.MeshPhysicalMaterial({\n      color: new THREE.Color(color),\n      wireframe: wireframe,", "const sideMaterial = new THREE.MeshPhysicalMaterial({\n      color: new THREE.Color(color),\n      wireframe: wireframe,")

# We should add the assignment after sideMaterial is created
# Find where sideMaterial is defined:
import re
pattern = r"(const sideMaterial = new THREE\.MeshPhysicalMaterial\(\{.*?\}\);)"
content = re.sub(pattern, r"\1\n\n    matsRef.current.main = material;\n    matsRef.current.side = sideMaterial;", content, flags=re.DOTALL)

with open('components/ThreeDPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
