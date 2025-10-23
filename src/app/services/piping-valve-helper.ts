import * as fabric from 'fabric';
import { CustomLine } from './custom-line.class';

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
  
  // Create the group with centered origin for consistent rotation behavior
  // Valve rotation logic
  // The valve should be at -30° offset from the line direction
  // For a horizontal line (0°), the valve should be at -30°
  // When mirrored (Ctrl pressed), flip the rotation to the opposite side

  const valveAngle = mirrored ? angle + 30 : angle - 30; // Mirror flips the rotation

  const group = new fabric.Group([triangle1, triangle2, flangeTop, flangeBottom], {
    left: x,
    top: y,
    angle: valveAngle,
    originX: 'center',
    originY: 'center',
    selectable: true,
    hasControls: true,
    hasBorders: true
  });
  
  (group as any).customType = 'gateValveFL';
  
  // Calculate anchor positions based on the valve angle and position
  const angleRad = (angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const anchorDistance = 30; // Distance from center to anchors
  
  // Calculate anchor positions
  const anchor1X = x - anchorDistance * cos;
  const anchor1Y = y - anchorDistance * sin;
  const anchor2X = x + anchorDistance * cos;
  const anchor2Y = y + anchorDistance * sin;
  
  // Create anchor points
  const anchor1 = new fabric.Circle({
    left: anchor1X,
    top: anchor1Y,
    radius: 3,
    fill: 'blue',
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.8,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  (anchor1 as any).customType = 'anchorPoint';
  (anchor1 as any).isAnchor = true;
  
  const anchor2 = new fabric.Circle({
    left: anchor2X,
    top: anchor2Y,
    radius: 3,
    fill: 'blue',
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.8,
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

export function createTeeJoint(x: number, y: number, angle: number, orientation: number = 0): any {
  // T-Stück OHNE Group für exakte Positionierung
  // orientation: 0, 1, 2, 3 für 4 verschiedene Ausrichtungen (isometrische Winkel)

  // Länge der Liniensegmente - reduced to match valve size
  const segmentLength = 18;
  const branchLength = 22;

  // Normalisiere den Hauptlinien-Winkel
  const normalizedAngle = ((angle % 360) + 360) % 360;

  // Berechne den Branch-Winkel basierend auf der Hauptlinien-Richtung und der Orientierung
  // Die isometrischen Winkel sind: 30°, 90°, 150°, 210°, 270°, 330°
  let branchAngle: number;

  // Finde heraus, welche isometrische Richtung die Hauptlinie hat
  if ((normalizedAngle >= 20 && normalizedAngle <= 40)) {
    // Hauptlinie ist bei 30° (rechts-unten)
    // Mögliche Branch-Richtungen: 90°, 150°, 270°, 330°
    const branchAngles = [90, 150, 270, 330];
    branchAngle = branchAngles[orientation % 4];
  } else if ((normalizedAngle >= 140 && normalizedAngle <= 160)) {
    // Hauptlinie ist bei 150° (links-unten)
    // Mögliche Branch-Richtungen: 30°, 90°, 210°, 270°
    const branchAngles = [90, 210, 270, 30];
    branchAngle = branchAngles[orientation % 4];
  } else if ((normalizedAngle >= 80 && normalizedAngle <= 100)) {
    // Hauptlinie ist bei 90° (vertikal nach unten)
    // Mögliche Branch-Richtungen: 30°, 150°, 210°, 330°
    const branchAngles = [30, 150, 210, 330];
    branchAngle = branchAngles[orientation % 4];
  } else if ((normalizedAngle >= 200 && normalizedAngle <= 220)) {
    // Hauptlinie ist bei 210° (links-oben)
    // Mögliche Branch-Richtungen: 90°, 150°, 270°, 330°
    const branchAngles = [90, 150, 270, 330];
    branchAngle = branchAngles[orientation % 4];
  } else if ((normalizedAngle >= 260 && normalizedAngle <= 280)) {
    // Hauptlinie ist bei 270° (vertikal nach oben)
    // Mögliche Branch-Richtungen: 30°, 150°, 210°, 330°
    const branchAngles = [30, 150, 210, 330];
    branchAngle = branchAngles[orientation % 4];
  } else if ((normalizedAngle >= 320 && normalizedAngle <= 340)) {
    // Hauptlinie ist bei 330° (rechts-oben)
    // Mögliche Branch-Richtungen: 30°, 90°, 210°, 270°
    const branchAngles = [90, 210, 270, 30];
    branchAngle = branchAngles[orientation % 4];
  } else {
    // Fallback für andere Winkel
    const branchAngles = [30, 150, 210, 330];
    branchAngle = branchAngles[orientation % 4];
  }

  // Konvertiere zu Radians für Berechnungen
  const angleRad = (angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Berechne Abzweig-Endpunkt mit absolutem isometrischem Winkel
  const branchRad = (branchAngle * Math.PI) / 180;
  const branchEndXLocal = branchLength * Math.cos(branchRad);
  const branchEndYLocal = branchLength * Math.sin(branchRad);
  
  // Berechne alle Punkte in Weltkoordinaten
  // Links auf der Hauptlinie
  const leftPoint = {
    x: x - segmentLength * cos,
    y: y - segmentLength * sin
  };

  // Rechts auf der Hauptlinie
  const rightPoint = {
    x: x + segmentLength * cos,
    y: y + segmentLength * sin
  };

  // Ende des Abzweigs (mit absolutem isometrischem Winkel)
  const branchEndPoint = {
    x: x + branchEndXLocal,
    y: y + branchEndYLocal
  };
  
  // Erstelle eine eindeutige ID für dieses T-Stück
  const teeId = `tee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Erstelle die drei Linien mit absoluten Koordinaten
  const leftLine = new CustomLine([leftPoint.x, leftPoint.y, x, y], {
    stroke: 'black',
    strokeWidth: 1,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false
  });
  (leftLine as any).teeId = teeId;
  (leftLine as any).teePart = 'left';
  
  const rightLine = new CustomLine([x, y, rightPoint.x, rightPoint.y], {
    stroke: 'black',
    strokeWidth: 1,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false
  });
  (rightLine as any).teeId = teeId;
  (rightLine as any).teePart = 'right';
  
  const branchLine = new CustomLine([x, y, branchEndPoint.x, branchEndPoint.y], {
    stroke: 'black',
    strokeWidth: 1,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false
  });
  (branchLine as any).teeId = teeId;
  (branchLine as any).teePart = 'branch';
  
  // Erstelle ein unsichtbares Rechteck als Selektionsbereich
  const selectionRect = new fabric.Rect({
    left: x,
    top: y,
    width: 52,
    height: 52,
    fill: 'transparent',
    stroke: 'transparent',
    strokeWidth: 0,
    originX: 'center',
    originY: 'center',
    selectable: true,
    hasControls: true,
    hasBorders: true,
    evented: true,  // Ermöglicht Hover-Events
    opacity: 0.1  // Leicht sichtbar für bessere Interaktion
  });
  
  (selectionRect as any).customType = 'teeJoint';
  (selectionRect as any).teeId = teeId;
  (selectionRect as any).teeData = {
    position: { x, y },
    angle: angle,
    orientation: orientation,
    branchAngle: branchAngle
  };
  (selectionRect as any).teeLines = [leftLine, rightLine, branchLine];
  
  // Erstelle Ankerpunkte an den berechneten Weltkoordinaten
  const anchor1 = new fabric.Circle({
    left: leftPoint.x,
    top: leftPoint.y,
    radius: 2,
    fill: 'blue',
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.8,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  (anchor1 as any).customType = 'anchorPoint';
  (anchor1 as any).isAnchor = true;
  
  const anchor2 = new fabric.Circle({
    left: rightPoint.x,
    top: rightPoint.y,
    radius: 2,
    fill: 'blue',
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.8,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  (anchor2 as any).customType = 'anchorPoint';
  (anchor2 as any).isAnchor = true;
  
  const anchor3 = new fabric.Circle({
    left: branchEndPoint.x,
    top: branchEndPoint.y,
    radius: 2,
    fill: 'blue',
    stroke: 'darkblue',
    strokeWidth: 1,
    opacity: 0.8,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  (anchor3 as any).customType = 'anchorPoint';
  (anchor3 as any).isAnchor = true;
  
  // Verknüpfe Ankerpunkte mit der T-Stück ID
  (anchor1 as any).teeId = teeId;
  (anchor2 as any).teeId = teeId;
  (anchor3 as any).teeId = teeId;
  
  // Speichere Ankerpunkte auf der selectionRect
  (selectionRect as any).anchors = [anchor1, anchor2, anchor3];
  
  // Erstelle ein Rückgabe-Objekt mit allen Komponenten
  const teeJoint = {
    selectionRect: selectionRect,
    lines: [leftLine, rightLine, branchLine],
    anchors: [anchor1, anchor2, anchor3],
    teeId: teeId,
    customType: 'teeJoint',
    customId: teeId,
    teeData: (selectionRect as any).teeData
  };
  
  // Für Kompatibilität mit vorhandenem Code
  Object.assign(selectionRect, teeJoint);
  
  return selectionRect;
}

export function createGateValveSNew(x: number, y: number, angle: number, mirrored: boolean = false): any {
  // ALWAYS use the same diagonal triangle configuration
  // Triangles meet at the center, forming the valve shape
  
  let triangle1, triangle2;
  
  // Use same triangles as FL variant - smaller, less slanted triangles
  // These form a more compact valve representation
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
  
  // Create the group with centered origin for consistent rotation behavior
  // Valve rotation logic
  // The valve should be at -30° offset from the line direction
  // For a horizontal line (0°), the valve should be at -30°
  // When mirrored (Ctrl pressed), flip the rotation to the opposite side

  const valveAngle = mirrored ? angle + 30 : angle - 30; // Mirror flips the rotation

  const group = new fabric.Group([triangle1, triangle2], {
    left: x,
    top: y,
    angle: valveAngle,
    originX: 'center',
    originY: 'center',
    selectable: true,
    hasControls: true,
    hasBorders: true
  });
  
  (group as any).customType = 'gateValveS';
  
  // Calculate anchor positions based on the valve angle and position
  const angleRad = (angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const anchorDistance = 30; // Distance from center to anchors
  
  // Calculate anchor positions
  const anchor1X = x - anchorDistance * cos;
  const anchor1Y = y - anchorDistance * sin;
  const anchor2X = x + anchorDistance * cos;
  const anchor2Y = y + anchorDistance * sin;
  
  // Create anchor points
  const anchor1 = new fabric.Circle({
    left: anchor1X,
    top: anchor1Y,
    radius: 3,
    fill: 'blue',
    stroke: 'darkblue',
    strokeWidth: 1,
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center'
  });
  (anchor1 as any).customType = 'anchorPoint';
  (anchor1 as any).isAnchor = true;
  
  const anchor2 = new fabric.Circle({
    left: anchor2X,
    top: anchor2Y,
    radius: 3,
    fill: 'blue',
    stroke: 'darkblue',
    strokeWidth: 1,
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center'
  });
  (anchor2 as any).customType = 'anchorPoint';
  (anchor2 as any).isAnchor = true;
  
  (group as any).anchors = [anchor1, anchor2];
  
  return group;
}