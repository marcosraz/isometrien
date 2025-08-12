import * as fabric from 'fabric';

export function createGateValveFLNew(x: number, y: number, angle: number, mirrored: boolean = false): any {
  // Gate Valve FL variant with flange lines
  
  let triangle1, triangle2, flangeTop, flangeBottom;
  
  // Use same triangles as S variant - less slanted
  if (!mirrored) {
    // Normal orientation
    triangle1 = new fabric.Polygon([
      { x: -14, y: -14 },    // Upper left vertex (scaled to 55%)
      { x: -14, y: -4 },     // Lower left vertex (scaled to 55%)
      { x: 0, y: 0 },       // Tip at center
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
    
    triangle2 = new fabric.Polygon([
      { x: 14, y: 14 },      // Lower right vertex (scaled to 55%)
      { x: 14, y: 4 },       // Upper right vertex (scaled to 55%)
      { x: 0, y: 0 },       // Tip at center
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
    
    // Flange lines - parallel to the outer edges of triangles, shifted back closer
    // Top flange: scaled to 70%
    flangeTop = new fabric.Line([
      -17, -17,   // Top point (scaled to 55%)
      -17, -5     // Bottom point (scaled to 55%)
    ], {
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
    
    // Bottom flange: scaled to 70%
    flangeBottom = new fabric.Line([
      17, 5,      // Top point (scaled to 55%)
      17, 17      // Bottom point (scaled to 55%)
    ], {
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
    
  } else {
    // Mirrored orientation - swap diagonal triangles
    triangle1 = new fabric.Polygon([
      { x: 14, y: -14 },     // Upper right vertex (scaled to 55%)
      { x: 14, y: -4 },      // Lower right vertex (scaled to 55%)
      { x: 0, y: 0 },       // Tip at center
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
    
    triangle2 = new fabric.Polygon([
      { x: -14, y: 14 },     // Lower left vertex (scaled to 55%)
      { x: -14, y: 4 },      // Upper left vertex (scaled to 55%)
      { x: 0, y: 0 },       // Tip at center
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
    
    // Mirrored flange lines - scaled to 70%
    flangeTop = new fabric.Line([
      17, -17,    // Top point (scaled to 55%)
      17, -5      // Bottom point (scaled to 55%)
    ], {
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
    
    flangeBottom = new fabric.Line([
      -17, 5,     // Top point (scaled to 55%)
      -17, 17     // Bottom point (scaled to 55%)
    ], {
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
  }
  
  // Calculate rotation - same as S variant
  let valveAngle = angle - 45 + 15;
  
  // Mirror with Ctrl key - add 240° like S variant
  if (mirrored) {
    valveAngle += 240;
  }
  
  // Create the group with triangles and flange lines - no white background
  const group = new fabric.Group([triangle1, triangle2, flangeTop, flangeBottom], {
    left: x,
    top: y,
    angle: valveAngle,
    selectable: true,
    hasControls: true,
    hasBorders: true,
    originX: 'center',
    originY: 'center'
  });
  
  (group as any).customType = 'gateValveFL';
  (group as any).valveData = {
    position: { x, y },
    angle: angle,
    type: 'gateFL'
  };
  
  // Store anchors for later use - on the flange lines
  const anchor1 = new fabric.Circle({
    left: 0,
    top: -19,  // On the top flange line (adjusted for 55% scale)
    radius: 1,  // Very small anchor points
    fill: 'red',
    stroke: 'darkred',
    strokeWidth: 1,
    opacity: 0.5,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  (anchor1 as any).customType = 'anchorPoint';
  (anchor1 as any).isAnchor = true;
  
  const anchor2 = new fabric.Circle({
    left: 0,
    top: 19,  // On the bottom flange line (adjusted for 55% scale)
    radius: 1,  // Very small anchor points
    fill: 'red',
    stroke: 'darkred',
    strokeWidth: 1,
    opacity: 0.5,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  (anchor2 as any).customType = 'anchorPoint';
  (anchor2 as any).isAnchor = true;
  
  (group as any).anchors = [anchor1, anchor2];
  
  return group;
}

export function createGateValveSNew(x: number, y: number, angle: number, mirrored: boolean = false): any {
  // ALWAYS use the same diagonal triangle configuration
  // Just rotate the entire group to match the line angle
  
  let triangle1, triangle2;
  
  // Always create the same diagonal triangles - almost vertical sides
  if (!mirrored) {
    // Normal orientation - for vertical appearance on 30° lines
    triangle1 = new fabric.Polygon([
      { x: -14, y: -14 },    // Upper left vertex (scaled to 55%)
      { x: -14, y: -4 },     // Lower left vertex (scaled to 55%)  
      { x: 0, y: 0 },       // Tip at center
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
    
    triangle2 = new fabric.Polygon([
      { x: 14, y: 14 },      // Lower right vertex (scaled to 55%)
      { x: 14, y: 4 },       // Upper right vertex (scaled to 55%)
      { x: 0, y: 0 },       // Tip at center
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
  } else {
    // Mirrored orientation - swap diagonal triangles
    triangle1 = new fabric.Polygon([
      { x: 14, y: -14 },     // Upper right vertex (scaled to 55%)
      { x: 14, y: -4 },      // Lower right vertex (scaled to 55%)
      { x: 0, y: 0 },       // Tip at center
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
    
    triangle2 = new fabric.Polygon([
      { x: -14, y: 14 },     // Lower left vertex (scaled to 55%)
      { x: -14, y: 4 },      // Upper left vertex (scaled to 55%)
      { x: 0, y: 0 },       // Tip at center
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
  }
  
  // Calculate rotation based on line angle
  // The valve should be perpendicular to the line (90° to line direction)
  // But the diagonal triangles are already at 45°, so we need to adjust
  
  // For a vertical line (90°), we want the valve at 45° (diagonal)
  // For a horizontal line (0°), we want the valve at -45° (diagonal the other way)
  // For a 30° line, we want the valve at -15° (perpendicular to 30°)
  // For a 150° line, we want the valve at 105° (perpendicular to 150°)
  
  // The pattern is: valve should be at (lineAngle - 45°) for the base orientation
  // Plus additional 15° rotation to the right (clockwise)
  let valveAngle = angle - 45 + 15;
  
  // For mirrored version with Ctrl key: add 240° for proper mirroring
  // The triangle swap above handles the visual mirroring, this rotates to opposite side
  if (mirrored) {
    valveAngle += 240;
  }
  
  // Create the group
  const group = new fabric.Group([triangle1, triangle2], {
    left: x,
    top: y,
    angle: valveAngle,
    selectable: true,
    hasControls: true,
    hasBorders: true,
    originX: 'center',
    originY: 'center'
  });
  
  (group as any).customType = 'gateValveS';
  (group as any).valveData = {
    position: { x, y },
    angle: angle,
    type: 'gateS'
  };
  
  // Store anchors for later use (not added to group)
  // Anchors at the intersection of valve outer edges and pipe line
  const anchor1 = new fabric.Circle({
    left: 0,
    top: -12,  // Moved closer to center
    radius: 1,  // Very small anchor points
    fill: 'red',
    stroke: 'darkred',
    strokeWidth: 1,
    opacity: 0.5,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  (anchor1 as any).customType = 'anchorPoint';
  (anchor1 as any).isAnchor = true;
  
  const anchor2 = new fabric.Circle({
    left: 0,
    top: 12,  // Moved closer to center
    radius: 1,  // Very small anchor points
    fill: 'red',
    stroke: 'darkred',
    strokeWidth: 1,
    opacity: 0.5,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  (anchor2 as any).customType = 'anchorPoint';
  (anchor2 as any).isAnchor = true;
  
  (group as any).anchors = [anchor1, anchor2];
  
  return group;
}