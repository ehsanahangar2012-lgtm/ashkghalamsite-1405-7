    if (customEntities && customEntities.length > 0 && customAnchors && customAnchors.creaseX && customAnchors.creaseX.length >= 2) {
      // --- CUSTOM DXF FOLDING SIMULATOR ---
      const cx = customAnchors.creaseX;
      const cy = customAnchors.creaseY;
      
      const lineMatCut = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
      const lineMatCrease = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 1 });
      
      // We will create a hierarchy of groups based on X creases.
      // Panel 0: x < cx[0] (Glue Tab)
      // Panel 1: cx[0] <= x < cx[1]
      // Panel 2: cx[1] <= x < cx[2] (Base)
      // Panel 3: cx[2] <= x < cx[3]
      // Panel 4: cx[3] <= x < cx[4]
      // Panel 5: x >= cx[4]
      
      const pGroups = [];
      for (let i = 0; i <= cx.length; i++) {
         pGroups.push(new THREE.Group());
      }
      
      // The base is typically the largest panel, let's assume it's Panel 2 (between cx[1] and cx[2])
      // Or Panel 1 (between cx[0] and cx[1]). Let's assume Panel 2 is Base if cx.length >= 3, else Panel 1.
      const baseIdx = cx.length >= 3 ? 2 : 1;
      
      // Build hierarchy
      boxRoot.add(pGroups[baseIdx]);
      
      // Connect to the left
      for (let i = baseIdx - 1; i >= 0; i--) {
         pGroups[i + 1].add(pGroups[i]);
         // The hinge is at cx[i]
         // Actually, to make rotation easy, we should position the group AT the hinge, 
         // and offset its contents.
         // Let's create hinges!
      }
      // Connect to the right
      for (let i = baseIdx + 1; i <= cx.length; i++) {
         pGroups[i - 1].add(pGroups[i]);
      }
      
      // Better approach: Since we just want to render lines, we can create a single geometry 
      // or group, and in `updateFolds`, we iterate over all customEntities, calculate their folded 
      // start/end positions based on the angles, and update a BufferGeometry!
      // This avoids creating 1000 Three.js Groups and is much more mathematically robust!
    }
