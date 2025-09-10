#!/usr/bin/env python3
import re

# Read the current file
with open('src/app/services/line-drawing.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add tracking variables after line with "associatedComponents: fabric.Group[] = [];"
tracking_vars = """  // Associated valves and T-pieces that need to move with segments
  private associatedComponents: fabric.Group[] = [];
  // Tracking-Variablen für smooth Component-Movement
  private mouseStartT: number = 0;  // Position der Maus auf der Linie beim Start des Ziehens
  private componentInitialT: number = 0;  // Initiale Position der Komponente auf der Linie"""

content = content.replace(
    "  // Associated valves and T-pieces that need to move with segments\n  private associatedComponents: fabric.Group[] = [];",
    tracking_vars
)

# Fix 2: Update the updateMovingComponent method - fix the t calculation
old_t_calc = """    // Vektor vom Linienanfang zur Mausposition
    const toMouse = {
      x: pointer.x - line.x1!,
      y: pointer.y - line.y1!
    };
    
    // Projiziere auf die Linie (begrenzt auf 0-1)
    const t = Math.max(0, Math.min(1, 
      (toMouse.x * lineVector.x + toMouse.y * lineVector.y) / (lineLength * lineLength)
    ));"""

new_t_calc = """    // Vektor vom Linienanfang zur aktuellen Mausposition
    const toMouse = {
      x: pointer.x - line.x1!,
      y: pointer.y - line.y1!
    };
    
    // Berechne die aktuelle Mausposition auf der Linie
    const currentMouseT = (toMouse.x * lineVector.x + toMouse.y * lineVector.y) / (lineLength * lineLength);
    
    // Berechne das Delta zwischen aktueller und Start-Mausposition
    const deltaT = currentMouseT - this.mouseStartT;
    
    // Neue Position = initiale Position + Delta (begrenzt auf 0-1)
    const t = Math.max(0, Math.min(1, this.componentInitialT + deltaT));"""

content = content.replace(old_t_calc, new_t_calc)

# Fix 3: Fix T-piece anchor positioning (around line 1736)
# Find and replace the T-piece anchor positioning block
old_tpiece_block = """      if (customType === 'teeJoint') {
        // T-Stück hat 3 Ankerpunkte entlang der Linie
        let offsetX = 0;
        let offsetY = 0;
        
        if (index === 0) {
          // Erster Ankerpunkt: Entlang der Linie nach hinten
          const lineAngle = angle * Math.PI / 180;
          offsetX = Math.cos(lineAngle) * distance * -1;
          offsetY = Math.sin(lineAngle) * distance * -1;
        } else if (index === 1) {
          // Zweiter Ankerpunkt: Entlang der Linie nach vorne
          const lineAngle = angle * Math.PI / 180;
          offsetX = Math.cos(lineAngle) * distance;
          offsetY = Math.sin(lineAngle) * distance;
        } else if (index === 2) {
          // Dritter Ankerpunkt: Auch entlang der Linie (weiter vorne)
          const lineAngle = angle * Math.PI / 180;
          offsetX = Math.cos(lineAngle) * distance * 2;
          offsetY = Math.sin(lineAngle) * distance * 2;
        }
        
        anchor.set({
          left: newX + offsetX,
          top: newY + offsetY
        });
      }"""

new_tpiece_block = """      if (customType === 'teeJoint') {
        // T-Stück hat 3 Ankerpunkte:
        // Index 0 und 1: An den Enden der Linie entlang
        // Index 2: Senkrecht zur Linie (das eigentliche T)
        let offsetX = 0;
        let offsetY = 0;
        
        if (index === 0) {
          // Erster Ankerpunkt: Entlang der Linie nach hinten
          const lineAngle = angle * Math.PI / 180;
          offsetX = Math.cos(lineAngle) * distance * -1;
          offsetY = Math.sin(lineAngle) * distance * -1;
        } else if (index === 1) {
          // Zweiter Ankerpunkt: Entlang der Linie nach vorne
          const lineAngle = angle * Math.PI / 180;
          offsetX = Math.cos(lineAngle) * distance;
          offsetY = Math.sin(lineAngle) * distance;
        } else if (index === 2) {
          // Dritter Ankerpunkt: Senkrecht zur Linie (das T)
          const perpAngle = (angle + 90) * Math.PI / 180;
          offsetX = Math.cos(perpAngle) * distance;
          offsetY = Math.sin(perpAngle) * distance;
        }
        
        anchor.set({
          left: newX + offsetX,
          top: newY + offsetY
        });
      }"""

content = content.replace(old_tpiece_block, new_tpiece_block)

# Fix 4: Add tracking initialization in handleMovePipeMouseDown
# Find the line after "this.moveStartPoint = { x: pointer.x, y: pointer.y };"
old_mouse_down = """    this.moveStartPoint = { x: pointer.x, y: pointer.y };
    
    // Start moving the component"""

new_mouse_down = """    this.moveStartPoint = { x: pointer.x, y: pointer.y };
    
    // Initialize tracking variables for smooth movement
    const hostLine = (this.movingComponent as any).hostLine;
    const linePosition = (this.movingComponent as any).linePosition;
    
    if (hostLine && linePosition !== undefined) {
      const line = hostLine as fabric.Line;
      const lineVector = {
        x: line.x2! - line.x1!,
        y: line.y2! - line.y1!
      };
      const lineLength = Math.sqrt(lineVector.x * lineVector.x + lineVector.y * lineVector.y);
      
      if (lineLength > 0) {
        // Speichere initiale Position der Komponente
        this.componentInitialT = linePosition;
        
        // Berechne die aktuelle Mausposition auf der Linie
        const toMouse = {
          x: pointer.x - line.x1!,
          y: pointer.y - line.y1!
        };
        this.mouseStartT = (toMouse.x * lineVector.x + toMouse.y * lineVector.y) / (lineLength * lineLength);
        
        console.log(`Start moving component - Initial t: ${this.componentInitialT}, Mouse start t: ${this.mouseStartT}`);
      }
    }
    
    // Start moving the component"""

content = content.replace(old_mouse_down, new_mouse_down)

# Write the updated content
with open('src/app/services/line-drawing.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("All fixes applied successfully!")
print("- Added tracking variables")
print("- Fixed delta-based movement calculation")
print("- Fixed T-piece anchor positioning (3 anchors: 2 along line, 1 perpendicular)")
print("- Added mouse down initialization for tracking")