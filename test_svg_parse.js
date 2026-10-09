function parseSVGPaths(cuts, creases) {
    const entities = [];
    
    const parsePath = (pathStr, isCrease) => {
        const cmds = pathStr.split(/(?=[M|L|A])/);
        let currX = 0, currY = 0;
        
        cmds.forEach(cmdStr => {
            const cmd = cmdStr.trim().charAt(0);
            const args = cmdStr.trim().substring(1).trim().split(/[\s,]+/).map(Number);
            
            if (cmd === 'M') {
                currX = args[0];
                currY = args[1];
            } else if (cmd === 'L') {
                entities.push({
                    type: 'LINE',
                    x1: currX,
                    y1: currY,
                    x2: args[0],
                    y2: args[1],
                    isCrease
                });
                currX = args[0];
                currY = args[1];
            } else if (cmd === 'A') {
                // Approximate arc with line for 3D simulator
                entities.push({
                    type: 'LINE',
                    x1: currX,
                    y1: currY,
                    x2: args[5],
                    y2: args[6],
                    isCrease
                });
                currX = args[5];
                currY = args[6];
            }
        });
    };
    
    cuts.forEach(p => parsePath(p, false));
    creases.forEach(p => parsePath(p, true));
    
    return entities;
}
console.log("Helper works!");
