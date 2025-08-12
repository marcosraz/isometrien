import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { StateManagementService } from './state-management.service';

@Injectable({
  providedIn: 'root',
})
export class IsometryToolsService {
  private canvas!: fabric.Canvas;
  private stateManagement: StateManagementService | null = null;
  private drawingService: any = null;
  
  // Slope tool properties
  private slopeMode: boolean = false;
  private slopePreview: fabric.Group | null = null;
  private isShiftPressed: boolean = false;
  private isCtrlPressed: boolean = false;
  private slopeCounter: number = 1;
  private slopeFirstClick: any = null;
  private slopeTextPreview: fabric.Text | null = null;
  private slopeLeaderPreview: fabric.Line | null = null;
  
  constructor() {
    // Listen for keyboard events
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') {
        this.isShiftPressed = true;
        this.updateSlopePreview();
      }
      if (e.key === 'Control') {
        this.isCtrlPressed = true;
        this.updateSlopePreview();
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        this.isShiftPressed = false;
        this.updateSlopePreview();
      }
      if (e.key === 'Control') {
        this.isCtrlPressed = false;
        this.updateSlopePreview();
      }
    });
  }
  
  public setCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
  }
  
  public setStateManagement(stateManagement: StateManagementService): void {
    this.stateManagement = stateManagement;
  }
  
  public setDrawingService(drawingService: any): void {
    this.drawingService = drawingService;
  }
  
  private getColor(element: string): string {
    if (this.drawingService && this.drawingService.getColor) {
      return this.drawingService.getColor(element);
    }
    return 'black';
  }
  
  // Start slope drawing mode
  public startSlopeMode(): void {
    this.slopeMode = true;
  }
  
  public stopSlopeMode(): void {
    this.slopeMode = false;
    this.slopeFirstClick = null;
    this.clearSlopePreview();
    this.clearTextPreview();
  }
  
  public isSlopeModeActive(): boolean {
    return this.slopeMode;
  }
  
  // Handle mouse move for slope preview
  public handleMouseMove(canvas: fabric.Canvas, options: any): void {
    if (!this.slopeMode) return;
    
    const pointer = canvas.getPointer(options.e);
    
    if (!this.slopeFirstClick) {
      // First phase: show triangle preview on line
      const linePoint = this.findNearestLinePoint(canvas, pointer);
      if (linePoint) {
        this.showSlopePreview(canvas, linePoint);
      } else {
        this.clearSlopePreview();
      }
    } else {
      // Second phase: show text position preview
      this.showTextPreview(canvas, pointer);
    }
  }
  
  // Handle mouse down for placing slope marker
  public handleMouseDown(canvas: fabric.Canvas, options: any): void {
    if (!this.slopeMode) return;
    
    const pointer = canvas.getPointer(options.e);
    
    if (!this.slopeFirstClick) {
      // First click: place triangle on line
      const linePoint = this.findNearestLinePoint(canvas, pointer);
      if (linePoint) {
        this.slopeFirstClick = {
          linePoint: linePoint,
          isCtrlPressed: this.isCtrlPressed,
          isShiftPressed: this.isShiftPressed
        };
        // Clear the preview and show text placement preview
        this.clearSlopePreview();
      }
    } else {
      // Second click: place text and complete
      const slopePercent = prompt('Gefälle in % eingeben (z.B. 0.50):', '0.50');
      if (slopePercent === null) {
        // Cancel - reset
        this.slopeFirstClick = null;
        this.clearTextPreview();
        return;
      }
      
      // Adjust text position to be further away from line/triangle
      const trianglePos = this.slopeFirstClick.linePoint.point;
      const angle = Math.atan2(pointer.y - trianglePos.y, pointer.x - trianglePos.x);
      const minDistance = 60; // Minimum distance from triangle to text
      const currentDistance = Math.sqrt(Math.pow(pointer.x - trianglePos.x, 2) + Math.pow(pointer.y - trianglePos.y, 2));
      
      let adjustedPointer: { x: number; y: number };
      if (currentDistance < minDistance) {
        // Push text further away if too close
        adjustedPointer = {
          x: trianglePos.x + Math.cos(angle) * minDistance,
          y: trianglePos.y + Math.sin(angle) * minDistance
        };
      } else {
        adjustedPointer = { x: pointer.x, y: pointer.y };
      }
      
      // Create slope marker with adjusted text position
      this.createSlopeMarker(canvas, this.slopeFirstClick, adjustedPointer, slopePercent);
      
      // Reset
      this.slopeFirstClick = null;
      this.clearTextPreview();
      
      // Stop slope mode after placing
      this.stopSlopeMode();
      
      // Dispatch event to update UI
      window.dispatchEvent(new CustomEvent('exitSlopeMode'));
    }
  }
  
  private createSlopeMarker(canvas: fabric.Canvas, firstClick: any, textPosition: any, slopePercent: string): void {
    if (this.stateManagement) {
      this.stateManagement.executeOperation('Add Slope Marker', () => {
        this.createSlopeMarkerInternal(canvas, firstClick, textPosition, slopePercent);
      });
    } else {
      this.createSlopeMarkerInternal(canvas, firstClick, textPosition, slopePercent);
    }
  }
  
  private createSlopeMarkerInternal(canvas: fabric.Canvas, firstClick: any, textPosition: any, slopePercent: string): void {
    const position = firstClick.linePoint.point;
    const angle = firstClick.linePoint.angle;
    
    // Determine triangle direction based on saved state from first click
    const triangleDirection = firstClick.isCtrlPressed ? -1 : 1;
    
    // Determine side based on saved state from first click
    // Default is above the line (negative offset), Shift for below
    const sideOffset = firstClick.isShiftPressed ? 1 : -1;
    
    // Triangle dimensions
    const triangleBase = 22;    // Length along the line direction
    const triangleHeight = 10;   // Height perpendicular to line
    
    // Calculate perpendicular offset from line
    const perpAngle = angle + 90;
    const offsetDistance = 10;  // Distance from line to triangle base
    
    // Calculate triangle position offset from line
    const offsetX = Math.cos(perpAngle * Math.PI / 180) * offsetDistance * sideOffset;
    const offsetY = Math.sin(perpAngle * Math.PI / 180) * offsetDistance * sideOffset;
    
    const triangleX = position.x + offsetX;
    const triangleY = position.y + offsetY;
    
    // Create triangle - base parallel to line, right angle triangle
    // Points defined with base along x-axis, then rotated to match line angle
    const triangle = new fabric.Polygon([
      { x: -triangleBase/2, y: 0 },                              // Base start point
      { x: triangleBase/2, y: 0 },                               // Base end point
      { x: triangleBase/2 * triangleDirection, y: triangleHeight * sideOffset }  // Apex (90° from base)
    ], {
      fill: 'transparent',  // Empty inside
      stroke: this.getColor('line'),
      strokeWidth: 1,
      left: triangleX,
      top: triangleY,
      angle: angle,  // Align with line direction
      originX: 'center',
      originY: 'center',
      selectable: true
    } as any);
    (triangle as any).customType = 'slopeTriangle';
    
    // Position text at the end point but shifted UP significantly
    // Simple approach: just move the text up from where user clicked
    const textVerticalOffset = -10; // Move text 10px UP (negative Y)
    const offsetTextX = textPosition.x;
    const offsetTextY = textPosition.y + textVerticalOffset; // Simply move up
    
    // Create leader line from text anchor point (not the text itself) to triangle
    // The line should end slightly below the text
    const lineEndY = textPosition.y; // Original click position
    const leaderLine = new fabric.Line([
      textPosition.x, lineEndY,  // Start from below the text
      triangleX, triangleY        // End at triangle
    ], {
      stroke: this.getColor('line'),
      strokeWidth: 1,
      selectable: false,
      evented: false
    } as any);
    (leaderLine as any).customType = 'slopeLeader';
    
    // Create filled arrowhead pointing to triangle
    const arrowAngle = Math.atan2(triangleY - textPosition.y, triangleX - textPosition.x);
    const arrowLength = 5;  // Smaller arrow
    const arrowWidth = Math.PI / 8; // Narrower angle (22.5 degrees)
    
    // Create filled arrow as a polygon
    const arrowHead = new fabric.Polygon([
      { x: triangleX, y: triangleY },  // Tip at triangle
      { x: triangleX - arrowLength * Math.cos(arrowAngle - arrowWidth), 
        y: triangleY - arrowLength * Math.sin(arrowAngle - arrowWidth) },
      { x: triangleX - arrowLength * Math.cos(arrowAngle + arrowWidth), 
        y: triangleY - arrowLength * Math.sin(arrowAngle + arrowWidth) }
    ], {
      fill: this.getColor('line'),  // Filled arrow
      stroke: this.getColor('line'),
      strokeWidth: 0,
      selectable: false,
      evented: false
    } as any);
    
    // Use IText to make it editable - position ABOVE the line
    const text = new fabric.IText(`Gefälle ${slopePercent}%`, {
      left: offsetTextX,
      top: offsetTextY,
      fontSize: 12,
      fill: this.getColor('text'),
      selectable: true,
      editable: true,  // Make it editable
      originX: 'center',
      originY: 'center'
    } as any);
    (text as any).customType = 'slopeText';
    (text as any).slopePercent = slopePercent;  // Store the value for later editing
    
    // Group all elements including arrow
    const slopeGroup = new fabric.Group([triangle, leaderLine, arrowHead, text], {
      selectable: true
    } as any);
    (slopeGroup as any).customType = 'slopeMarker';
    (slopeGroup as any).slopeData = {
      percent: slopePercent,
      number: this.slopeCounter++
    };
    
    canvas.add(slopeGroup);
    canvas.requestRenderAll();
  }
  
  private showSlopePreview(canvas: fabric.Canvas, linePoint: any): void {
    this.clearSlopePreview();
    
    const position = linePoint.point;
    const angle = linePoint.angle;
    
    // Determine triangle direction based on Ctrl key
    const triangleDirection = this.isCtrlPressed ? -1 : 1;
    
    // Determine side based on Shift key
    // Default is above the line (negative offset), Shift for below
    const sideOffset = this.isShiftPressed ? 1 : -1;
    
    // Triangle dimensions
    const triangleBase = 22;    // Length along the line direction
    const triangleHeight = 10;   // Height perpendicular to line
    
    // Calculate perpendicular offset from line
    const perpAngle = angle + 90;
    const offsetDistance = 10;  // Distance from line to triangle base
    
    // Calculate triangle position offset from line
    const offsetX = Math.cos(perpAngle * Math.PI / 180) * offsetDistance * sideOffset;
    const offsetY = Math.sin(perpAngle * Math.PI / 180) * offsetDistance * sideOffset;
    
    const triangleX = position.x + offsetX;
    const triangleY = position.y + offsetY;
    
    // Create preview triangle - base parallel to line, right angle triangle
    const triangle = new fabric.Polygon([
      { x: -triangleBase/2, y: 0 },                              // Base start point
      { x: triangleBase/2, y: 0 },                               // Base end point  
      { x: triangleBase/2 * triangleDirection, y: triangleHeight * sideOffset }  // Apex (90° from base)
    ], {
      fill: 'transparent',  // Empty inside for preview too
      stroke: 'rgba(128, 128, 128, 0.8)',
      strokeWidth: 1,
      left: triangleX,
      top: triangleY,
      angle: angle,  // Align with line direction
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      opacity: 0.7
    });
    
    this.slopePreview = new fabric.Group([triangle], {
      selectable: false,
      evented: false
    });
    
    canvas.add(this.slopePreview);
    canvas.requestRenderAll();
  }
  
  private clearSlopePreview(): void {
    if (this.slopePreview && this.canvas) {
      this.canvas.remove(this.slopePreview);
      this.slopePreview = null;
      this.canvas.requestRenderAll();
    }
  }
  
  private showTextPreview(canvas: fabric.Canvas, pointer: any): void {
    this.clearTextPreview();
    
    if (!this.slopeFirstClick) return;
    
    const position = this.slopeFirstClick.linePoint.point;
    
    // Create preview leader line from text to triangle
    this.slopeLeaderPreview = new fabric.Line([
      pointer.x, pointer.y,  // Start from text position
      position.x, position.y  // End at triangle
    ], {
      stroke: 'rgba(128, 128, 128, 0.5)',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false
    });
    
    // Create preview text
    this.slopeTextPreview = new fabric.Text('Gefälle 0.00%', {
      left: pointer.x,
      top: pointer.y,
      fontSize: 12,
      fill: 'rgba(128, 128, 128, 0.8)',
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center'
    });
    
    canvas.add(this.slopeLeaderPreview);
    canvas.add(this.slopeTextPreview);
    canvas.requestRenderAll();
  }
  
  private clearTextPreview(): void {
    if (this.canvas) {
      if (this.slopeLeaderPreview) {
        this.canvas.remove(this.slopeLeaderPreview);
        this.slopeLeaderPreview = null;
      }
      if (this.slopeTextPreview) {
        this.canvas.remove(this.slopeTextPreview);
        this.slopeTextPreview = null;
      }
      this.canvas.requestRenderAll();
    }
  }
  
  private updateSlopePreview(): void {
    if (this.slopePreview && this.canvas) {
      // Re-calculate preview position with new key states
      const pointer = this.canvas.getPointer(this.canvas.getPointer as any);
      const linePoint = this.findNearestLinePoint(this.canvas, pointer);
      if (linePoint) {
        this.showSlopePreview(this.canvas, linePoint);
      }
    }
  }
  
  private findNearestLinePoint(canvas: fabric.Canvas, pointer: { x: number; y: number }): any {
    let nearestPoint: any = null;
    let minDistance = 30; // Maximum snap distance
    let bestAngle = 0;
    
    canvas.getObjects().forEach(obj => {
      if (obj instanceof fabric.Line && !((obj as any).isDimensionPart)) {
        const point = this.getClosestPointOnLine(
          { x: obj.x1!, y: obj.y1! },
          { x: obj.x2!, y: obj.y2! },
          pointer
        );
        
        const distance = Math.sqrt(
          Math.pow(point.x - pointer.x, 2) + 
          Math.pow(point.y - pointer.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = point;
          // Calculate line angle
          bestAngle = Math.atan2(obj.y2! - obj.y1!, obj.x2! - obj.x1!) * 180 / Math.PI;
        }
      }
      // Check paths (for curved pipes)
      else if (obj instanceof fabric.Path && (obj.stroke === this.getColor('pipe') || (obj as any).isPipe)) {
        // For paths, approximate with bounding box center
        const bounds = obj.getBoundingRect();
        const center = {
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2
        };
        
        const distance = Math.sqrt(
          Math.pow(center.x - pointer.x, 2) + 
          Math.pow(center.y - pointer.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = center;
          bestAngle = 0; // Default angle for paths
        }
      }
    });
    
    return nearestPoint ? { point: nearestPoint, angle: bestAngle } : null;
  }
  
  private getClosestPointOnLine(p1: { x: number; y: number }, p2: { x: number; y: number }, point: { x: number; y: number }): { x: number; y: number } {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return p1;
    
    let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (length * length);
    t = Math.max(0, Math.min(1, t));
    
    return {
      x: p1.x + t * dx,
      y: p1.y + t * dy
    };
  }
}