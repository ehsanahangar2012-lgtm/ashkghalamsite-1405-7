import re
with open('components/ThreeDPreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "wireframe = false,\n  lightIntensity = 1, customAnchors]);",
    "wireframe, lightIntensity, customAnchors]);"
)

content = content.replace(
    "const rimLight = new THREE.PointLight(0xffffff, 0.6);",
    "const rimLight = new THREE.PointLight(0xffffff, 0.6 * lightIntensity);"
)

content = content.replace(
    "const envLight = new THREE.DirectionalLight(0xffffff, 1);",
    "const envLight = new THREE.DirectionalLight(0xffffff, 1 * lightIntensity);"
)

with open('components/ThreeDPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
