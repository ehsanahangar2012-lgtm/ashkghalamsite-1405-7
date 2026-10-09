const THREE = require('three');

function buildShapeFromDXF(entities, centerX, centerY) {
   const cutLines = entities.filter(e => !e.isCrease);
   let segments = cutLines.map(e => ({
       p1: new THREE.Vector2(e.x1 - centerX, -(e.y1 - centerY)),
       p2: new THREE.Vector2(e.x2 - centerX, -(e.y2 - centerY))
   }));

   let loops = [];
   while (segments.length > 0) {
       let current = segments.shift();
       let loop = [current.p1, current.p2];
       let closed = false;
       while (segments.length > 0) {
           let last = loop[loop.length - 1];
           let foundIdx = -1;
           let reversed = false;
           for (let i = 0; i < segments.length; i++) {
               if (segments[i].p1.distanceTo(last) < 1.0) { foundIdx = i; break; }
               if (segments[i].p2.distanceTo(last) < 1.0) { foundIdx = i; reversed = true; break; }
           }
           if (foundIdx !== -1) {
               let nextSeg = segments.splice(foundIdx, 1)[0];
               loop.push(reversed ? nextSeg.p1 : nextSeg.p2);
               if (loop[0].distanceTo(loop[loop.length - 1]) < 1.0) { closed = true; break; }
           } else {
               if (loop[0].distanceTo(loop[loop.length - 1]) < 1.0) { closed = true; }
               break;
           }
       }
       loops.push(loop);
   }
   
   console.log("LOOPS:", loops.map(l => l.length));

   const mainLoop = loops[0];
   const shape = new THREE.Shape();
   shape.moveTo(mainLoop[0].x, mainLoop[0].y);
   for (let i = 1; i < mainLoop.length; i++) {
       shape.lineTo(mainLoop[i].x, mainLoop[i].y);
   }
   return shape;
}

const entities = [
  { isCrease: false, x1: 0, y1: 0, x2: 10, y2: 0 },
  { isCrease: false, x1: 10, y1: 0, x2: 10, y2: 10 },
  { isCrease: false, x1: 10, y1: 10, x2: 0, y2: 10 },
  { isCrease: false, x1: 0, y1: 10, x2: 0, y2: 0 }
];

buildShapeFromDXF(entities, 5, 5);
