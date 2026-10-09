const { analyzeTopology } = require('./dist/server.cjs');

const entities = [
    {type: 'LINE', isCrease: true, x1: 30, y1: 160, x2: 430, y2: 160},
    {type: 'LINE', isCrease: true, x1: 30, y1: 260, x2: 430, y2: 260},
    {type: 'LINE', isCrease: true, x1: 130, y1: 160, x2: 130, y2: 260},
    {type: 'LINE', isCrease: true, x1: 230, y1: 160, x2: 230, y2: 260},
    {type: 'LINE', isCrease: true, x1: 330, y1: 160, x2: 330, y2: 260}
];

const anchors = analyzeTopology(entities, {L: 100, W: 100, H: 100});
console.log(anchors);
