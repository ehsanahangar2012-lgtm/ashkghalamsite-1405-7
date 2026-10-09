with open('components/ThreeDPreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# For material:
content = content.replace("scene.add(floor);", "scene.add(floor);\n\n    matsRef.current.main = material;\n    matsRef.current.side = sideMaterial;")

# Add the two useEffects right after the first useEffect:
hooks = """
  // Update light intensity dynamically
  useEffect(() => {
    if (lightsRef.current.ambient) lightsRef.current.ambient.intensity = 0.6 * lightIntensity;
    if (lightsRef.current.main) lightsRef.current.main.intensity = 1.2 * lightIntensity;
    if (lightsRef.current.fill) lightsRef.current.fill.intensity = 0.4 * lightIntensity;
    if (lightsRef.current.rim) lightsRef.current.rim.intensity = 0.6 * lightIntensity;
    if (lightsRef.current.env) lightsRef.current.env.intensity = 1.0 * lightIntensity;
  }, [lightIntensity]);

  // Update wireframe dynamically
  useEffect(() => {
    if (matsRef.current.main) matsRef.current.main.wireframe = wireframe;
    if (matsRef.current.side) matsRef.current.side.wireframe = wireframe;
  }, [wireframe]);
"""

content = content.replace(
    "  wireframe, lightIntensity, customAnchors]);",
    "  customAnchors]);" + hooks
)

with open('components/ThreeDPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
