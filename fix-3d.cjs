const fs = require('fs');
let content = fs.readFileSync('components/ThreeDPreview.tsx', 'utf8');
const lines = content.split('\n');

// Find the start of `} else {` in `createPanel` around line 760
let startIdx = 759;
while (startIdx < 800 && lines[startIdx].trim() !== '} else {') {
    startIdx++;
}

// Find the end where `} else if (isTelescopic) {` is around line 984
let endIdx = startIdx;
while (endIdx < 1100 && !lines[endIdx].includes('} else if (isTelescopic) {')) {
    endIdx++;
}

console.log('Replacing from', startIdx, 'to', endIdx);

const newCode = `      } else {
        const shape = new THREE.Shape();
        const radius = Math.min(pw, ph) * 0.05;
        const x = -pw/2;
        const y = -ph/2;
        shape.moveTo(x + radius, y);
        shape.lineTo(x + pw - radius, y);
        shape.quadraticCurveTo(x + pw, y, x + pw, y + radius);
        shape.lineTo(x + pw, y + ph - radius);
        shape.quadraticCurveTo(x + pw, y + ph, x + pw - radius, y + ph);
        shape.lineTo(x + radius, y + ph);
        shape.quadraticCurveTo(x, y + ph, x, y + ph - radius);
        shape.lineTo(x, y + radius);
        shape.quadraticCurveTo(x, y, x + radius, y);

        const extrudeSettings = { depth: t, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 };
        geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.translate(0, 0, -t/2); 
        
        geo.computeBoundingBox();
        const bbox = geo.boundingBox!;
        const posAttribute = geo.attributes.position;
        const uvAttribute = geo.attributes.uv;
        for (let i = 0; i < posAttribute.count; i++) {
          const x = posAttribute.getX(i);
          const y = posAttribute.getY(i);
          const u = (x - bbox.min.x) / (bbox.max.x - bbox.min.x);
          const v = (y - bbox.min.y) / (bbox.max.y - bbox.min.y);
          uvAttribute.setXY(i, u, v);
        }
        meshMaterials = [material, sideMaterial];
      }
      
      const mesh = new THREE.Mesh(geo, meshMaterials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      return mesh;
    };

    if (customEntities && customEntities.length > 0) {
      // SVG Flat Renderer for Custom Layouts
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      customEntities.forEach(e => {
         if (e.type === 'ARC') {
            minX = Math.min(minX, e.x1 - e.r);
            maxX = Math.max(maxX, e.x1 + e.r);
            minY = Math.min(minY, e.y1 - e.r);
            maxY = Math.max(maxY, e.y1 + e.r);
         } else {
            minX = Math.min(minX, e.x1, e.x2);
            maxX = Math.max(maxX, e.x1, e.x2);
            minY = Math.min(minY, e.y1, e.y2);
            maxY = Math.max(maxY, e.y1, e.y2);
         }
      });
      if (minX === Infinity) { minX = 0; maxX = 100; minY = 0; maxY = 100; }
      
      const pw = maxX - minX;
      const ph = maxY - minY;
      
      const planePanel = createPanel(pw, ph);
      boxRoot.add(planePanel);
      
      const cutGeo = new THREE.BufferGeometry();
      const creaseGeo = new THREE.BufferGeometry();
      const cutPos = [];
      const creasePos = [];
      const cx = minX + pw/2;
      const cy = minY + ph/2;
      
      customEntities.forEach(e => {
        if (e.type === 'LINE') {
          if (e.isCrease) {
            creasePos.push(e.x1 - cx, -(e.y1 - cy), 0.015);
            creasePos.push(e.x2 - cx, -(e.y2 - cy), 0.015);
          } else {
            cutPos.push(e.x1 - cx, -(e.y1 - cy), 0.015);
            cutPos.push(e.x2 - cx, -(e.y2 - cy), 0.015);
          }
        }
      });
      
      if (cutPos.length > 0) {
         cutGeo.setAttribute('position', new THREE.Float32BufferAttribute(cutPos, 3));
         const cutMat = new THREE.LineBasicMaterial({ color: 0xff3333, linewidth: 2 });
         boxRoot.add(new THREE.LineSegments(cutGeo, cutMat));
      }
      if (creasePos.length > 0) {
         creaseGeo.setAttribute('position', new THREE.Float32BufferAttribute(creasePos, 3));
         const creaseMat = new THREE.LineBasicMaterial({ color: 0x33ff33, linewidth: 2 });
         boxRoot.add(new THREE.LineSegments(creaseGeo, creaseMat));
      }
      
      updateFolds = () => {};
`;

lines.splice(startIdx, endIdx - startIdx, newCode);
fs.writeFileSync('components/ThreeDPreview.tsx', lines.join('\n'));
