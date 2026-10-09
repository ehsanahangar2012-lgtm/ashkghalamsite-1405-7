import re

with open('components/ThreeDPreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add refs
refs_str = """
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  const lightsRef = useRef<{
    ambient?: THREE.AmbientLight;
    main?: THREE.DirectionalLight;
    fill?: THREE.PointLight;
    rim?: THREE.PointLight;
    env?: THREE.DirectionalLight;
  }>({});

  const matsRef = useRef<{
    main?: THREE.MeshPhysicalMaterial;
    side?: THREE.MeshPhysicalMaterial;
  }>({});
"""
content = re.sub(
    r"const mountRef = useRef<HTMLDivElement>\(null\);\n  const controlsRef = useRef<any>\(null\);\n  const cameraRef = useRef<THREE\.PerspectiveCamera \| null>\(null\);",
    refs_str,
    content
)

# Replace lights and materials to store in refs
content = content.replace(
    "scene.add(new THREE.AmbientLight(0xffffff, 0.6 * lightIntensity));",
    "const amb = new THREE.AmbientLight(0xffffff, 0.6 * lightIntensity); lightsRef.current.ambient = amb; scene.add(amb);"
)
content = content.replace(
    "const mainLight = new THREE.DirectionalLight(0xffffff, 1.2 * lightIntensity);",
    "const mainLight = new THREE.DirectionalLight(0xffffff, 1.2 * lightIntensity); lightsRef.current.main = mainLight;"
)
content = content.replace(
    "const fillLight = new THREE.PointLight(0x6366f1, 0.4 * lightIntensity);",
    "const fillLight = new THREE.PointLight(0x6366f1, 0.4 * lightIntensity); lightsRef.current.fill = fillLight;"
)
content = content.replace(
    "const rimLight = new THREE.PointLight(0xffffff, 0.6 * lightIntensity);",
    "const rimLight = new THREE.PointLight(0xffffff, 0.6 * lightIntensity); lightsRef.current.rim = rimLight;"
)
content = content.replace(
    "const envLight = new THREE.DirectionalLight(0xffffff, 1 * lightIntensity);",
    "const envLight = new THREE.DirectionalLight(0xffffff, 1 * lightIntensity); lightsRef.current.env = envLight;"
)
content = content.replace(
    "const material = new THREE.MeshPhysicalMaterial({",
    "const material = new THREE.MeshPhysicalMaterial({\n      // @ts-ignore\n      wireframe,"
)
content = content.replace(
    "const sideMaterial = new THREE.MeshPhysicalMaterial({",
    "const sideMaterial = new THREE.MeshPhysicalMaterial({\n      // @ts-ignore\n      wireframe,"
)

# Actually, the materials might already have wireframe inside them. Let's find exactly how they are initialized.
