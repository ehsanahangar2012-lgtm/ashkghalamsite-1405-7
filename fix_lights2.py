with open('components/ThreeDPreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const fillLight = new THREE.PointLight(0x6366f1, 0.4);", "const fillLight = new THREE.PointLight(0x6366f1, 0.4 * lightIntensity);")

with open('components/ThreeDPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
