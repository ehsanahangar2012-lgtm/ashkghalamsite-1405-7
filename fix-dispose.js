const fs = require('fs');
let content = fs.readFileSync('components/ThreeDPreview.tsx', 'utf8');
content = content.replace(
  /renderer\.dispose\(\);[\s\S]*?composer\.dispose\(\);/g,
  `// Clean up all scene geometries and materials
      scene.traverse((object) => {
        if (!object.isMesh) return;
        
        object.geometry.dispose();
        
        if (object.material.isMaterial) {
          cleanMaterial(object.material);
        } else {
          for (const material of object.material) cleanMaterial(material);
        }
      });
      
      function cleanMaterial(material) {
        material.dispose();
        // dispose textures
        for (const key of Object.keys(material)) {
          const value = material[key];
          if (value && typeof value === 'object' && 'minFilter' in value) {
            value.dispose();
          }
        }
      }
      
      renderer.dispose();
      composer.dispose();`
);
fs.writeFileSync('components/ThreeDPreview.tsx', content);
