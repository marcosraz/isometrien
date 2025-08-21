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
    radius: 2,  // Etwas größer für bessere Sichtbarkeit
    fill: 'blue',  // Blaue Farbe
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.7,  // Etwas sichtbarer
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
    radius: 2,  // Etwas größer für bessere Sichtbarkeit
    fill: 'blue',  // Blaue Farbe
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.7,  // Etwas sichtbarer
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

export function createTeeJoint(x: number, y: number, angle: number, mirrored: boolean = false, flipped: boolean = false): any {
  // T-Stück direkt auf der Linie platzieren
  
  // Länge der Liniensegmente
  const segmentLength = 20;
  const branchLength = 25;
  
  // Berechne Abzweig-Winkel (60° oder -60° je nach Seite)
  const branchAngle = flipped ? -60 : 60;
  
  // Berechne Endpunkt des Abzweigs (60° Winkel von der Vertikalen)
  const radians = ((90 + branchAngle) * Math.PI) / 180;
  const branchEndX = branchLength * Math.cos(radians);
  const branchEndY = branchLength * Math.sin(radians);
  
  // Berechne die richtige Rotation basierend auf dem Linienwinkel
  let teeAngle = angle;
  
  // Mit Strg-Taste: 180° drehen (Seite wechseln in der Linie)
  if (mirrored) {
    teeAngle += 180;
  }
  
  // Erstelle einzelne Linien OHNE Gruppe, direkt positioniert
  const angleRad = (teeAngle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  // Transformiere die Linien-Endpunkte basierend auf der Rotation
  // Linke Linie
  const leftStart = {
    x: x + (-segmentLength * cos),
    y: y + (-segmentLength * sin)
  };
  const leftEnd = { x: x, y: y };
  
  const leftLine = new fabric.Line([leftStart.x, leftStart.y, leftEnd.x, leftEnd.y], {
    stroke: 'black',
    strokeWidth: 2,
    selectable: false,
    evented: false
  });
  
  // Rechte Linie
  const rightStart = { x: x, y: y };
  const rightEnd = {
    x: x + (segmentLength * cos),
    y: y + (segmentLength * sin)
  };
  
  const rightLine = new fabric.Line([rightStart.x, rightStart.y, rightEnd.x, rightEnd.y], {
    stroke: 'black',
    strokeWidth: 2,
    selectable: false,
    evented: false
  });
  
  // Abzweiglinie - transformiere den Endpunkt
  const branchStart = { x: x, y: y };
  const rotatedBranchEnd = {
    x: x + (branchEndX * cos - branchEndY * sin),
    y: y + (branchEndX * sin + branchEndY * cos)
  };
  
  const branchLine = new fabric.Line([branchStart.x, branchStart.y, rotatedBranchEnd.x, rotatedBranchEnd.y], {
    stroke: 'black',
    strokeWidth: 2,
    selectable: false,
    evented: false
  });
  
  // Erstelle eine Gruppe nur für die Selektion
  const group = new fabric.Group([leftLine, rightLine, branchLine], {
    selectable: true,
    hasControls: true,
    hasBorders: true
  });
  
  (group as any).customType = 'teeJoint';
  (group as any).teeData = {
    position: { x, y },
    angle: angle,
    mirrored: mirrored,
    flipped: flipped
  };
  
  // Ankerpunkte für die drei Enden - korrekt rotiert und mit blauer Farbe
  // Berechne rotierte Positionen für die Ankerpunkte
  
  // Links auf der Hauptlinie - rotiert
  const leftAnchorPos = {
    x: x + (-segmentLength * cos),
    y: y + (-segmentLength * sin)
  };
  const anchor1 = new fabric.Circle({
    left: leftAnchorPos.x,
    top: leftAnchorPos.y,
    radius: 2,  // Etwas größer für bessere Sichtbarkeit
    fill: 'blue',  // Blaue Farbe
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.7,  // Etwas sichtbarer
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  (anchor1 as any).customType = 'anchorPoint';
  (anchor1 as any).isAnchor = true;
  
  // Rechts auf der Hauptlinie - rotiert
  const rightAnchorPos = {
    x: x + (segmentLength * cos),
    y: y + (segmentLength * sin)
  };
  const anchor2 = new fabric.Circle({
    left: rightAnchorPos.x,
    top: rightAnchorPos.y,
    radius: 2,  // Etwas größer für bessere Sichtbarkeit
    fill: 'blue',  // Blaue Farbe
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.7,  // Etwas sichtbarer
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  (anchor2 as any).customType = 'anchorPoint';
  (anchor2 as any).isAnchor = true;
  
  // Am Ende des Abzweigs - bereits korrekt rotiert
  const anchor3 = new fabric.Circle({
    left: rotatedBranchEnd.x,
    top: rotatedBranchEnd.y,
    radius: 2,  // Etwas größer für bessere Sichtbarkeit
    fill: 'blue',  // Blaue Farbe
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.7,  // Etwas sichtbarer
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  (anchor3 as any).customType = 'anchorPoint';
  (anchor3 as any).isAnchor = true;
  
  (group as any).anchors = [anchor1, anchor2, anchor3];
  
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
    radius: 2,  // Etwas größer für bessere Sichtbarkeit
    fill: 'blue',  // Blaue Farbe
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.7,  // Etwas sichtbarer
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
    radius: 2,  // Etwas größer für bessere Sichtbarkeit
    fill: 'blue',  // Blaue Farbe
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.7,  // Etwas sichtbarer
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