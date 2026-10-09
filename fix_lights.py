import re

with open('components/ThreeDPreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "scene.add(new THREE.AmbientLight(0xffffff, 0.6 * lightIntensity));",
    "const amb = new THREE.AmbientLight(0xffffff, 0.6 * lightIntensity);\n    lightsRef.current.ambient = amb;\n    scene.add(amb);"
)

content = content.replace(
    "const mainLight = new THREE.DirectionalLight(0xffffff, 1.2 * lightIntensity);\n    mainLight.position.set(20, 40, 20);\n    mainLight.castShadow = true;",
    "const mainLight = new THREE.DirectionalLight(0xffffff, 1.2 * lightIntensity);\n    lightsRef.current.main = mainLight;\n    mainLight.position.set(20, 40, 20);\n    mainLight.castShadow = true;"
)

content = content.replace(
    "const fillLight = new THREE.PointLight(0x6366f1, 0.4 * lightIntensity);\n    fillLight.position.set(-30, 10, 20);\n    scene.add(fillLight);",
    "const fillLight = new THREE.PointLight(0x6366f1, 0.4 * lightIntensity);\n    lightsRef.current.fill = fillLight;\n    fillLight.position.set(-30, 10, 20);\n    scene.add(fillLight);"
)

content = content.replace(
    "const rimLight = new THREE.PointLight(0xffffff, 0.6 * lightIntensity);\n    rimLight.position.set(0, 20, -40);\n    scene.add(rimLight);",
    "const rimLight = new THREE.PointLight(0xffffff, 0.6 * lightIntensity);\n    lightsRef.current.rim = rimLight;\n    rimLight.position.set(0, 20, -40);\n    scene.add(rimLight);"
)

content = content.replace(
    "const envLight = new THREE.DirectionalLight(0xffffff, 1 * lightIntensity);\n    envScene.add(envLight);",
    "const envLight = new THREE.DirectionalLight(0xffffff, 1 * lightIntensity);\n    lightsRef.current.env = envLight;\n    envScene.add(envLight);"
)

with open('components/ThreeDPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
