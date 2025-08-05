import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

export interface WeldStamp {
  line: fabric.Line;
  circle: fabric.Circle;
  text: fabric.Text;
  group: fabric.Group;
  number: number;
  anchorPoint: { x: number; y: number };
}

@Injectable({
  providedIn: 'root'
})
export class WeldingService {
  private canvas: fabric.Canvas | null = null;
  private isWeldstampActive: boolean = false;
  private currentWeldNumber: number = 1;
  private weldStamps: WeldStamp[] = [];
  private tempLine: fabric.Line | null = null;
  private startPoint: { x: number; y: number } | null = null;
  private highlightedAnchor: fabric.Circle | null = null;
  private originalAnchorColor: string | null = null;

  public setCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
  }

  public startWeldstamp(): void {
    this.isWeldstampActive = true;
    this.startPoint = null;
    this.tempLine = null;
  }

  public stopWeldstamp(): void {
    this.isWeldstampActive = false;
    this.startPoint = null;
    
    // Reset anchor highlight
    if (this.highlightedAnchor && this.originalAnchorColor !== null) {
      this.highlightedAnchor.set('fill', this.originalAnchorColor);
      this.highlightedAnchor = null;
      this.originalAnchorColor = null;
    }
    
    if (this.tempLine && this.canvas) {
      this.canvas.remove(this.tempLine);
      this.tempLine = null;
      this.canvas.renderAll();
    }
  }

  public handleMouseDown(e: any): void {
    if (!this.canvas || !this.isWeldstampActive) return;

    const pointer = this.canvas.getPointer(e.e);
    let clickPoint = { x: pointer.x, y: pointer.y };
    
    // Check if shift is held for anchor snapping
    if (e.e.shiftKey) {
      const nearestAnchor = this.findNearestAnchor(pointer);
      if (nearestAnchor) {
        clickPoint = nearestAnchor;
      }
    }
    
    if (!this.startPoint) {
      // First click - start line at clicked position
      this.startPoint = clickPoint;
      this.createTempLine(this.startPoint, pointer);
    } else {
      // Second click - create weld stamp
      this.createWeldStamp(this.startPoint, clickPoint);
      this.startPoint = null;
      if (this.tempLine) {
        this.canvas.remove(this.tempLine);
        this.tempLine = null;
      }
    }
  }

  public handleMouseMove(e: any): void {
    if (!this.canvas || !this.isWeldstampActive) return;

    const pointer = this.canvas.getPointer(e.e);
    let endPoint = { x: pointer.x, y: pointer.y };
    
    // Reset previous anchor highlight
    if (this.highlightedAnchor && this.originalAnchorColor !== null) {
      this.highlightedAnchor.set({
        fill: this.originalAnchorColor,
        dirty: true
      });
      this.highlightedAnchor = null;
      this.originalAnchorColor = null;
    }
    
    // Check if shift is held for anchor snapping
    if (e.e.shiftKey) {
      const nearestAnchor = this.findNearestAnchor(pointer);
      if (nearestAnchor && nearestAnchor.object) {
        endPoint = { x: nearestAnchor.x, y: nearestAnchor.y };
        
        // Highlight the anchor point without moving it
        if (this.highlightedAnchor !== nearestAnchor.object) {
          this.highlightedAnchor = nearestAnchor.object;
          this.originalAnchorColor = nearestAnchor.object.fill as string;
          nearestAnchor.object.set({
            fill: 'green',
            dirty: true
          });
        }
        
        // Update line style for visual feedback
        if (this.tempLine) {
          this.tempLine.set({
            stroke: 'green',
            strokeWidth: 3
          });
        }
      } else if (this.tempLine) {
        this.tempLine.set({
          stroke: 'red',
          strokeWidth: 2
        });
      }
    } else if (this.tempLine) {
      this.tempLine.set({
        stroke: 'red',
        strokeWidth: 2
      });
    }
    
    if (this.tempLine) {
      this.tempLine.set({ x2: endPoint.x, y2: endPoint.y });
    }
    
    this.canvas.renderAll();
  }

  private createTempLine(start: { x: number; y: number }, end: { x: number; y: number }): void {
    if (!this.canvas) return;

    this.tempLine = new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke: 'red',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false
    });

    this.canvas.add(this.tempLine);
  }

  private createWeldStamp(start: { x: number; y: number }, end: { x: number; y: number }): void {
    if (!this.canvas) return;

    // Create line
    const line = new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke: 'black',
      strokeWidth: 2,
      selectable: false,
      evented: false
    });

    // Create circle at end point
    const circle = new fabric.Circle({
      left: end.x,
      top: end.y,
      radius: 15,
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center'
    });

    // Create text with number
    const text = new fabric.Text(this.currentWeldNumber.toString(), {
      left: end.x,
      top: end.y,
      fontSize: 16,
      fontFamily: 'Arial',
      fill: 'black',
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      textAlign: 'center'
    });

    // Group all elements
    const group = new fabric.Group([line, circle, text], {
      selectable: true,
      hasControls: false,
      hasBorders: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      lockMovementX: false,
      lockMovementY: false,
      subTargetCheck: true
    });
    
    // Store custom data
    // @ts-ignore
    group.data = { 
      type: 'weldstamp', 
      number: this.currentWeldNumber,
      startPoint: start,
      endPoint: end,
      lineObj: line,
      circleObj: circle,
      textObj: text
    };

    // Store reference to text in group data for easy access
    // @ts-ignore
    group.data.textObject = text;

    // Set up double-click handler for editing
    group.on('mousedblclick', () => {
      console.log('Weldstamp double-clicked');
      this.editWeldNumber(group);
    });

    // Set up drag handler for moving end point
    group.on('moving', (e: any) => {
      this.handleWeldStampDrag(group, e);
    });

    this.canvas.add(group);
    
    // Deselect immediately to prevent accidental movement
    this.canvas.discardActiveObject();

    // Store weld stamp
    this.weldStamps.push({
      line,
      circle,
      text,
      group,
      number: this.currentWeldNumber,
      anchorPoint: start
    });

    this.currentWeldNumber++;
  }

  private findNearestAnchor(point: { x: number; y: number }): { x: number; y: number; object?: fabric.Circle } | null {
    if (!this.canvas) return null;

    let nearestAnchor: { x: number; y: number; object?: fabric.Circle } | null = null;
    let minDistance = 30; // Maximum distance to snap to anchor

    this.canvas.getObjects().forEach((obj: any) => {
      // Check for anchor points
      if (obj.type === 'circle' && obj.customType === 'anchorPoint') {
        // Since originX and originY are 'center', left and top already represent the center
        const centerX = obj.left!;
        const centerY = obj.top!;
        
        const distance = Math.sqrt(
          Math.pow(centerX - point.x, 2) + 
          Math.pow(centerY - point.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestAnchor = { 
            x: centerX, 
            y: centerY,
            object: obj
          };
        }
      }
    });

    return nearestAnchor;
  }

  private editWeldNumber(group: fabric.Group): void {
    if (!this.canvas) return;

    // @ts-ignore
    const currentNumber = group.data?.number || '1';
    const input = prompt('Enter weld number:', currentNumber.toString());
    
    if (input && !isNaN(Number(input))) {
      // Get objects from group
      const objects = group.getObjects();
      const text = objects.find((obj: any) => obj instanceof fabric.Text) as fabric.Text;
      
      if (text) {
        // Save current position
        const currentLeft = group.left;
        const currentTop = group.top;
        
        // Update text
        text.set('text', input);
        
        // @ts-ignore
        group.data.number = Number(input);
        
        // Ensure group stays at same position
        group.set({
          left: currentLeft,
          top: currentTop
        });
        
        // Update the group
        group.dirty = true;
        group.setCoords();
        
        // Deselect the group to prevent accidental movement
        this.canvas.discardActiveObject();
        
        this.canvas.renderAll();
      }
    }
  }

  private handleWeldStampDrag(group: fabric.Group, e: any): void {
    // Dragging is disabled for now to avoid coordinate issues
    // The group can be moved as a whole unit
    return;
  }

  public handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isWeldstampActive) {
      this.stopWeldstamp();
    }
  }

  public isActive(): boolean {
    return this.isWeldstampActive;
  }

  public resetNumbering(): void {
    this.currentWeldNumber = 1;
  }
}