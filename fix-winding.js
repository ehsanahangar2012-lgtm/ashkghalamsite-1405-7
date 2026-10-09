const fs = require('fs');
let content = fs.readFileSync('components/ThreeDPreview.tsx', 'utf8');

const replacement = `
                              const shape = new THREE.Shape();
                              
                              // Ensure CCW winding for solid
                              if (THREE.ShapeUtils.isClockWise(clippedSolid)) {
                                clippedSolid.reverse();
                              }
                              
                              shape.moveTo(clippedSolid[0].x, clippedSolid[0].y);
                              for (let v = 1; v < clippedSolid.length; v++) {
                                  shape.lineTo(clippedSolid[v].x, clippedSolid[v].y);
                              }

                              // Clip and subtract any holes that fall inside this cell and belong to this parent loop
                              classifiedLoops.forEach((holeLoop) => {
                                  if (holeLoop.type === 'hole' && holeLoop.parentIdx === idx) {
                                      // Apply a tiny epsilon inset to the hole's clipping boundary 
                                      // so it never shares an exact mathematical edge with the outer solid boundary.
                                      // Earcut triangulation crashes when holes share edges with the outer shape.
                                      let clippedHole = clipPolygon(holeLoop.pts, cellMinX + 1e-3, cellMaxX - 1e-3, cellMinY + 1e-3, cellMaxY - 1e-3);
                                      if (clippedHole.length >= 3) {
                                          // Ensure CW winding for holes
                                          if (!THREE.ShapeUtils.isClockWise(clippedHole)) {
                                            clippedHole.reverse();
                                          }
                                          
                                          const holePath = new THREE.Path();
                                          holePath.moveTo(clippedHole[0].x, clippedHole[0].y);
                                          for (let v = 1; v < clippedHole.length; v++) {
                                              holePath.lineTo(clippedHole[v].x, clippedHole[v].y);
                                          }
                                          shape.holes.push(holePath);
                                      }
                                  }
                              });`;

content = content.replace(/const shape = new THREE\.Shape\(\);[\s\S]*?shape\.holes\.push\(holePath\);\s*\}\s*\}\s*\}\);/, replacement);

fs.writeFileSync('components/ThreeDPreview.tsx', content);
