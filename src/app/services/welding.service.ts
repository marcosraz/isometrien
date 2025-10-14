import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { StateManagementService } from './state-management.service';

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
  private isWelderStampActive: boolean = false;
  private isWelderStampEmptyActive: boolean = false;
  private isWelderStampASActive: boolean = false;
  private isWeldActive: boolean = false;
  private isFluidStampActive: boolean = false;
  private currentWeldNumber: number = 1;
  private currentWelderNumber: number = 1;
  private currentFluidNumber: number = 1;
  private weldStamps: WeldStamp[] = [];
  private tempLine: fabric.Line | null = null;
  private startPoint: { x: number; y: number } | null = null;
  private highlightedAnchor: fabric.Circle | fabric.Group | null = null;
  private originalAnchorColor: string | null = null;
  private stateManagement: StateManagementService | null = null;

  public setCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
  }
  
  public setStateManagement(stateManagement: StateManagementService): void {
    this.stateManagement = stateManagement;
  }

  public stopAllWeldingModes(): void {
    // Stop all active modes
    if (this.isWeldstampActive) this.stopWeldstamp();
    if (this.isWelderStampActive) this.stopWelderStamp();
    if (this.isWelderStampEmptyActive) this.stopWelderStampEmpty();
    if (this.isWelderStampASActive) this.stopWelderStampAS();
    if (this.isWeldActive) this.stopWeld();
    if (this.isFluidStampActive) this.stopFluidStamp();
  }

  public startWeldstamp(): void {
    this.stopAllWeldingModes();
    this.isWeldstampActive = true;
    this.startPoint = null;
    this.tempLine = null;
  }

  public stopWeldstamp(): void {
    this.isWeldstampActive = false;
    this.startPoint = null;
    
    // Reset anchor highlight
    if (this.highlightedAnchor && this.originalAnchorColor !== null) {
      // Check if it's a weld point (group) or regular anchor
      if (this.highlightedAnchor.type === 'group' && (this.highlightedAnchor as any).isWeldPoint) {
        // For weld points, change the line colors back
        const objects = (this.highlightedAnchor as fabric.Group).getObjects();
        objects.forEach((obj: any) => {
          if (obj.type === 'line') {
            obj.set('stroke', 'red');
          }
        });
      } else {
        // Regular anchor point
        this.highlightedAnchor.set('fill', this.originalAnchorColor);
      }
      this.highlightedAnchor = null;
      this.originalAnchorColor = null;
    }
    
    if (this.tempLine && this.canvas) {
      this.canvas.remove(this.tempLine);
      this.tempLine = null;
      this.canvas.renderAll();
    }
  }

  public startWelderStamp(): void {
    this.stopAllWeldingModes();
    this.isWelderStampActive = true;
    this.startPoint = null;
    this.tempLine = null;
  }

  public stopWelderStamp(): void {
    this.isWelderStampActive = false;
    this.startPoint = null;
    
    // Reset anchor highlight
    if (this.highlightedAnchor && this.originalAnchorColor !== null) {
      // Check if it's a weld point (group) or regular anchor
      if (this.highlightedAnchor.type === 'group' && (this.highlightedAnchor as any).isWeldPoint) {
        // For weld points, change the line colors back
        const objects = (this.highlightedAnchor as fabric.Group).getObjects();
        objects.forEach((obj: any) => {
          if (obj.type === 'line') {
            obj.set('stroke', 'red');
          }
        });
      } else {
        // Regular anchor point
        this.highlightedAnchor.set('fill', this.originalAnchorColor);
      }
      this.highlightedAnchor = null;
      this.originalAnchorColor = null;
    }
    
    if (this.tempLine && this.canvas) {
      this.canvas.remove(this.tempLine);
      this.tempLine = null;
      this.canvas.renderAll();
    }
  }

  public startWelderStampEmpty(): void {
    this.stopAllWeldingModes();
    this.isWelderStampEmptyActive = true;
    this.startPoint = null;
    this.tempLine = null;
  }

  public stopWelderStampEmpty(): void {
    this.isWelderStampEmptyActive = false;
    this.startPoint = null;
    
    // Reset anchor highlight
    if (this.highlightedAnchor && this.originalAnchorColor !== null) {
      // Check if it's a weld point (group) or regular anchor
      if (this.highlightedAnchor.type === 'group' && (this.highlightedAnchor as any).isWeldPoint) {
        // For weld points, change the line colors back
        const objects = (this.highlightedAnchor as fabric.Group).getObjects();
        objects.forEach((obj: any) => {
          if (obj.type === 'line') {
            obj.set('stroke', 'red');
          }
        });
      } else {
        // Regular anchor point
        this.highlightedAnchor.set('fill', this.originalAnchorColor);
      }
      this.highlightedAnchor = null;
      this.originalAnchorColor = null;
    }
    
    if (this.tempLine && this.canvas) {
      this.canvas.remove(this.tempLine);
      this.tempLine = null;
      this.canvas.renderAll();
    }
  }

  public startWelderStampAS(): void {
    this.stopAllWeldingModes();
    this.isWelderStampASActive = true;
    this.startPoint = null;
    this.tempLine = null;
  }

  public stopWelderStampAS(): void {
    this.isWelderStampASActive = false;
    this.startPoint = null;
    
    // Reset anchor highlight
    if (this.highlightedAnchor && this.originalAnchorColor !== null) {
      // Check if it's a weld point (group) or regular anchor
      if (this.highlightedAnchor.type === 'group' && (this.highlightedAnchor as any).isWeldPoint) {
        // For weld points, change the line colors back
        const objects = (this.highlightedAnchor as fabric.Group).getObjects();
        objects.forEach((obj: any) => {
          if (obj.type === 'line') {
            obj.set('stroke', 'red');
          }
        });
      } else {
        // Regular anchor point
        this.highlightedAnchor.set('fill', this.originalAnchorColor);
      }
      this.highlightedAnchor = null;
      this.originalAnchorColor = null;
    }
    
    if (this.tempLine && this.canvas) {
      this.canvas.remove(this.tempLine);
      this.tempLine = null;
      this.canvas.renderAll();
    }
  }

  public startWeld(): void {
    this.stopAllWeldingModes();
    this.isWeldActive = true;
  }

  public stopWeld(): void {
    this.isWeldActive = false;
    
    // Clean up preview
    if (this.weldPreview && this.canvas) {
      this.canvas.remove(this.weldPreview);
      this.weldPreview = null;
    }
    
    // Reset any highlighted lines to their original color
    if (this.canvas) {
      this.canvas.getObjects().forEach((obj: any) => {
        if (obj.type === 'line' && obj._originalStroke) {
          obj.set('stroke', obj._originalStroke);
          obj.set('strokeWidth', obj._originalStrokeWidth || 2);
          delete obj._originalStroke;
          delete obj._originalStrokeWidth;
        }
      });
      this.canvas.renderAll();
    }
  }

  public startFluidStamp(): void {
    this.stopAllWeldingModes();
    this.isFluidStampActive = true;
    this.startPoint = null;
    this.tempLine = null;
  }

  public stopFluidStamp(): void {
    this.isFluidStampActive = false;
    this.startPoint = null;
    
    // Reset anchor highlight
    if (this.highlightedAnchor && this.originalAnchorColor !== null) {
      // Check if it's a weld point (circle with associated lines)
      if ((this.highlightedAnchor as any).isWeldPoint && (this.highlightedAnchor as any).associatedLines) {
        // For weld points, change the line colors back
        const lines = (this.highlightedAnchor as any).associatedLines;
        lines.forEach((line: fabric.Line) => {
          line.set('stroke', 'red');
        });
      } else {
        // Regular anchor point
        this.highlightedAnchor.set({
          fill: this.originalAnchorColor,
          dirty: true
        });
      }
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
    if (!this.canvas) return;
    
    if (this.isWeldstampActive) {
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
    } else if (this.isWelderStampActive) {
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
        // Second click - create welder stamp
        this.createWelderStamp(this.startPoint, clickPoint);
        this.startPoint = null;
        if (this.tempLine) {
          this.canvas.remove(this.tempLine);
          this.tempLine = null;
        }
      }
    } else if (this.isWelderStampEmptyActive) {
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
        // Second click - create welder stamp empty
        this.createWelderStampEmpty(this.startPoint, clickPoint);
        this.startPoint = null;
        if (this.tempLine) {
          this.canvas.remove(this.tempLine);
          this.tempLine = null;
        }
      }
    } else if (this.isWelderStampASActive) {
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
        // Second click - create welder stamp AS with prompts
        this.createWelderStampAS(this.startPoint, clickPoint);
        this.startPoint = null;
        if (this.tempLine) {
          this.canvas.remove(this.tempLine);
          this.tempLine = null;
        }
      }
    } else if (this.isWeldActive) {
      const pointer = this.canvas.getPointer(e.e);
      let clickPoint = { x: pointer.x, y: pointer.y };
      
      // Check if shift is held for line snapping ONLY (not anchor points)
      if (e.e.shiftKey) {
        const nearest = this.findNearestLine(pointer);
        if (nearest) {
          clickPoint = { x: nearest.x, y: nearest.y };
        }
      }
      
      // Clean up preview
      if (this.weldPreview) {
        this.canvas.remove(this.weldPreview);
        this.weldPreview = null;
      }
      
      // Reset any highlighted lines to their original color
      this.canvas.getObjects().forEach((obj: any) => {
        if (obj.type === 'line' && obj._originalStroke) {
          obj.set('stroke', obj._originalStroke);
          obj.set('strokeWidth', obj._originalStrokeWidth || 2);
          delete obj._originalStroke;
          delete obj._originalStrokeWidth;
        }
      });
      
      // Create weld X mark
      this.createWeld(clickPoint);
    } else if (this.isFluidStampActive) {
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
        // Second click - create fluid stamp
        this.createFluidStamp(this.startPoint, clickPoint);
        this.startPoint = null;
        if (this.tempLine) {
          this.canvas.remove(this.tempLine);
          this.tempLine = null;
        }
      }
    }
  }

  private weldPreview: fabric.Group | null = null;

  public handleMouseMove(e: any): void {
    if (!this.canvas) return;
    
    // Handle weld preview
    if (this.isWeldActive) {
      const pointer = this.canvas.getPointer(e.e);
      
      // Remove previous preview
      if (this.weldPreview) {
        this.canvas.remove(this.weldPreview);
        this.weldPreview = null;
      }
      
      // Reset any previously highlighted lines
      this.canvas.getObjects().forEach((obj: any) => {
        if (obj.type === 'line' && obj._originalStroke) {
          obj.set('stroke', obj._originalStroke);
          obj.set('strokeWidth', obj._originalStrokeWidth || 2);
          delete obj._originalStroke;
          delete obj._originalStrokeWidth;
        }
      });
      
      // Check for nearby lines ONLY when shift is held (not anchor points)
      if (e.e.shiftKey) {
        const nearest = this.findNearestLine(pointer);
        if (nearest) {
          // Create preview at snap point
          const size = 8;
          const line1 = new fabric.Line([
            -size, -size,
            size, size
          ], {
            stroke: 'green',
            strokeWidth: 3,
            selectable: false,
            evented: false
          });
          
          const line2 = new fabric.Line([
            size, -size,
            -size, size
          ], {
            stroke: 'green',
            strokeWidth: 3,
            selectable: false,
            evented: false
          });
          
          this.weldPreview = new fabric.Group([line1, line2], {
            left: nearest.x,
            top: nearest.y,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            opacity: 0.7
          });
          
          this.canvas.add(this.weldPreview);
          
          // Highlight the line if snapping to line
          if ((nearest as any).isLine && nearest.object) {
            // Store original properties before highlighting
            if (!(nearest.object as any)._originalStroke) {
              (nearest.object as any)._originalStroke = nearest.object.get('stroke');
              (nearest.object as any)._originalStrokeWidth = nearest.object.get('strokeWidth');
            }
            nearest.object.set('stroke', 'green');
            nearest.object.set('strokeWidth', 3);
          }
        }
      }
      
      this.canvas.renderAll();
      return;
    }
    
    if (!this.isWeldstampActive && !this.isWelderStampActive && !this.isWelderStampEmptyActive && !this.isWelderStampASActive && !this.isFluidStampActive) return;

    const pointer = this.canvas.getPointer(e.e);
    let endPoint = { x: pointer.x, y: pointer.y };
    
    // Reset previous anchor highlight
    if (this.highlightedAnchor && this.originalAnchorColor !== null) {
      // Check if it's a weld point (circle with associated lines)
      if ((this.highlightedAnchor as any).isWeldPoint && (this.highlightedAnchor as any).associatedLines) {
        // For weld points, change the line colors back
        const lines = (this.highlightedAnchor as any).associatedLines;
        lines.forEach((line: fabric.Line) => {
          line.set('stroke', 'red');
        });
      } else {
        // Regular anchor point
        this.highlightedAnchor.set({
          fill: this.originalAnchorColor,
          dirty: true
        });
      }
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
          
          // Check if it's a weld point (circle with associated lines)
          if ((nearestAnchor.object as any).isWeldPoint && (nearestAnchor.object as any).associatedLines) {
            // For weld points, change the line colors to green
            this.originalAnchorColor = 'red'; // Store original color
            const lines = (nearestAnchor.object as any).associatedLines;
            lines.forEach((line: fabric.Line) => {
              line.set('stroke', 'green');
            });
          } else {
            // Regular anchor point
            this.originalAnchorColor = nearestAnchor.object.fill as string;
            nearestAnchor.object.set({
              fill: 'green',
              dirty: true
            });
          }
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

    // Wrap in state management
    if (this.stateManagement) {
      this.stateManagement.executeOperation('Add Weld Stamp', () => {
        this.createWeldStampInternal(start, end);
      });
    } else {
      this.createWeldStampInternal(start, end);
    }
  }
  
  private createWeldStampInternal(start: { x: number; y: number }, end: { x: number; y: number }): void {
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

  private createWelderStamp(start: { x: number; y: number }, end: { x: number; y: number }): void {
    if (!this.canvas) return;
    
    // Wrap in state management
    if (this.stateManagement) {
      this.stateManagement.executeOperation('Add Welder Stamp', () => {
        this.createWelderStampInternal(start, end);
      });
    } else {
      this.createWelderStampInternal(start, end);
    }
  }
  
  private createWelderStampInternal(start: { x: number; y: number }, end: { x: number; y: number }): void {
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

    // Create horizontal line in circle (from edge to edge)
    const horizontalLine = new fabric.Line([
      end.x - 15, end.y, 
      end.x + 15, end.y
    ], {
      stroke: 'black',
      strokeWidth: 2,
      selectable: false,
      evented: false
    });

    // Create text with number above circle
    const text = new fabric.Text(this.currentWelderNumber.toString(), {
      left: end.x,
      top: end.y - 25, // Position above circle
      fontSize: 12, // Smaller font
      fontFamily: 'Arial',
      fill: 'black',
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      textAlign: 'center'
    });

    // Group all elements
    const group = new fabric.Group([line, circle, horizontalLine, text], {
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
      type: 'welderstamp', 
      number: this.currentWelderNumber,
      startPoint: start,
      endPoint: end,
      lineObj: line,
      circleObj: circle,
      horizontalLineObj: horizontalLine,
      textObj: text
    };

    // Store reference to text in group data for easy access
    // @ts-ignore
    group.data.textObject = text;

    // Set up double-click handler for editing
    group.on('mousedblclick', () => {
      console.log('Welder stamp double-clicked');
      this.editWelderNumber(group);
    });

    // Set up drag handler for moving end point
    group.on('moving', (e: any) => {
      this.handleWelderStampDrag(group, e);
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
      number: this.currentWelderNumber,
      anchorPoint: start
    });

    this.currentWelderNumber++;
  }

  private createWelderStampEmpty(start: { x: number; y: number }, end: { x: number; y: number }): void {
    if (!this.canvas) return;
    
    // Wrap in state management
    if (this.stateManagement) {
      this.stateManagement.executeOperation('Add Welder Stamp Empty', () => {
        this.createWelderStampEmptyInternal(start, end);
      });
    } else {
      this.createWelderStampEmptyInternal(start, end);
    }
  }
  
  private createWelderStampEmptyInternal(start: { x: number; y: number }, end: { x: number; y: number }): void {
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

    // Create horizontal line in circle (from edge to edge)
    const horizontalLine = new fabric.Line([
      end.x - 15, end.y, 
      end.x + 15, end.y
    ], {
      stroke: 'black',
      strokeWidth: 2,
      selectable: false,
      evented: false
    });

    // Group all elements (without text)
    const group = new fabric.Group([line, circle, horizontalLine], {
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
      type: 'welderstampempty', 
      startPoint: start,
      endPoint: end,
      lineObj: line,
      circleObj: circle,
      horizontalLineObj: horizontalLine
    };

    // Set up drag handler for moving end point
    group.on('moving', (e: any) => {
      this.handleWelderStampEmptyDrag(group, e);
    });

    this.canvas.add(group);
    
    // Deselect immediately to prevent accidental movement
    this.canvas.discardActiveObject();
  }

  private createWelderStampAS(start: { x: number; y: number }, end: { x: number; y: number }): void {
    if (!this.canvas) return;
    
    // Wrap in state management
    if (this.stateManagement) {
      this.stateManagement.executeOperation('Add Welder Stamp AS', () => {
        this.createWelderStampASInternal(start, end);
      });
    } else {
      this.createWelderStampASInternal(start, end);
    }
  }
  
  private createWelderStampASInternal(start: { x: number; y: number }, end: { x: number; y: number }): void {
    if (!this.canvas) return;

    // Get three numbers from user
    const number1 = prompt('Enter first number (above circle):');
    if (!number1) return;
    
    const number2 = prompt('Enter second number (upper half of circle):');
    if (!number2) return;
    
    const number3 = prompt('Enter third number (lower half of circle):');
    if (!number3) return;

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

    // Create horizontal line in circle (from edge to edge)
    const horizontalLine = new fabric.Line([
      end.x - 15, end.y, 
      end.x + 15, end.y
    ], {
      stroke: 'black',
      strokeWidth: 2,
      selectable: false,
      evented: false
    });

    // Create text above circle
    const text1 = new fabric.Text(number1, {
      left: end.x,
      top: end.y - 25, // Position above circle
      fontSize: 10, // Same size as numbers in circle
      fontFamily: 'Arial',
      fill: 'black',
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      textAlign: 'center'
    });

    // Create text in upper half of circle
    const text2 = new fabric.Text(number2, {
      left: end.x,
      top: end.y - 7, // Upper half position
      fontSize: 10, // Even smaller font
      fontFamily: 'Arial',
      fill: 'black',
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      textAlign: 'center'
    });

    // Create text in lower half of circle
    const text3 = new fabric.Text(number3, {
      left: end.x,
      top: end.y + 7, // Lower half position
      fontSize: 10, // Even smaller font
      fontFamily: 'Arial',
      fill: 'black',
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      textAlign: 'center'
    });

    // Group all elements
    const group = new fabric.Group([line, circle, horizontalLine, text1, text2, text3], {
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
      type: 'welderstampas', 
      number1: number1,
      number2: number2,
      number3: number3,
      startPoint: start,
      endPoint: end,
      lineObj: line,
      circleObj: circle,
      horizontalLineObj: horizontalLine,
      text1Obj: text1,
      text2Obj: text2,
      text3Obj: text3
    };

    // Set up double-click handler for editing
    group.on('mousedblclick', () => {
      console.log('Welder stamp AS double-clicked');
      this.editWelderStampAS(group);
    });

    // Set up drag handler for moving end point
    group.on('moving', (e: any) => {
      this.handleWelderStampASDrag(group, e);
    });

    this.canvas.add(group);
    
    // Force complete deselection and clear selection
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    
    // Disable and re-enable selection to clear any lingering selection state
    this.canvas.selection = false;
    this.canvas.forEachObject((obj) => {
      obj.selectable = false;
    });
    
    // Re-enable everything after a short delay
    setTimeout(() => {
      if (this.canvas) {
        this.canvas.selection = true;
        this.canvas.forEachObject((obj) => {
          // Re-enable selectability based on object type
          if (obj.type !== 'line' || !(obj as any).customType?.includes('dimension')) {
            obj.selectable = true;
          }
        });
        this.canvas.discardActiveObject();
        this.canvas.requestRenderAll();
      }
    }, 200);
  }

  private findNearestPointOnLine(line: fabric.Line, point: { x: number; y: number }): { x: number; y: number; distance: number } {
    // The line coordinates are already absolute, not relative!
    // This is confirmed by the console output showing x1, y1, x2, y2 as absolute positions
    const x1 = line.x1 || 0;
    const y1 = line.y1 || 0;
    const x2 = line.x2 || 0;
    const y2 = line.y2 || 0;
    
    // Calculate line vector
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // Calculate squared length of line
    const lineLengthSquared = dx * dx + dy * dy;
    
    if (lineLengthSquared === 0) {
      // Line has zero length, return start point
      return { x: x1, y: y1, distance: Math.sqrt((point.x - x1) ** 2 + (point.y - y1) ** 2) };
    }
    
    // Calculate parameter t for closest point on line
    let t = ((point.x - x1) * dx + (point.y - y1) * dy) / lineLengthSquared;
    
    // Clamp t to [0, 1] to stay within line segment
    t = Math.max(0, Math.min(1, t));
    
    // Calculate closest point on line
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    // Calculate distance
    const distance = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
    
    return { x: closestX, y: closestY, distance };
  }

  private findNearestLine(point: { x: number; y: number }): { x: number; y: number; object?: fabric.Object } | null {
    if (!this.canvas) return null;

    let nearestPoint: { x: number; y: number; object?: fabric.Object } | null = null;
    let minDistance = 30; // Maximum distance to snap

    // Only check for lines for weld tool
    this.canvas.getObjects().forEach((obj: any) => {
      if (obj.type === 'line' && obj.visible && !obj.isBackground) {
        const linePoint = this.findNearestPointOnLine(obj, point);
        if (linePoint.distance < minDistance) {
          minDistance = linePoint.distance;
          nearestPoint = {
            x: linePoint.x,
            y: linePoint.y,
            object: obj
          };
        }
      }
    });

    return nearestPoint;
  }

  private findNearestLineOrAnchor(point: { x: number; y: number }): { x: number; y: number; object?: fabric.Object; isLine?: boolean } | null {
    if (!this.canvas) return null;

    let nearestPoint: { x: number; y: number; object?: fabric.Object; isLine?: boolean } | null = null;
    let minDistance = 30; // Maximum distance to snap

    // First check for lines
    this.canvas.getObjects().forEach((obj: any) => {
      if (obj.type === 'line' && obj.visible && !obj.isBackground) {
        const linePoint = this.findNearestPointOnLine(obj, point);
        if (linePoint.distance < minDistance) {
          minDistance = linePoint.distance;
          nearestPoint = {
            x: linePoint.x,
            y: linePoint.y,
            object: obj,
            isLine: true
          };
        }
      }
    });

    // Then check for anchor points (they have priority if closer)
    this.canvas.getObjects().forEach((obj: any) => {
      if (obj.type === 'circle' && obj.customType === 'anchorPoint') {
        const centerX = obj.left!;
        const centerY = obj.top!;
        
        const distance = Math.sqrt(
          Math.pow(centerX - point.x, 2) + 
          Math.pow(centerY - point.y, 2)
        );
        
        // Anchors have priority - use slightly larger threshold
        if (distance < minDistance + 5) {
          minDistance = distance;
          nearestPoint = { 
            x: centerX, 
            y: centerY,
            object: obj,
            isLine: false
          };
        }
      }
    });

    return nearestPoint;
  }

  private findNearestAnchor(point: { x: number; y: number }): { x: number; y: number; object?: fabric.Circle | fabric.Group } | null {
    if (!this.canvas) return null;

    let nearestAnchor: { x: number; y: number; object?: fabric.Circle | fabric.Group } | null = null;
    let minDistance = 30; // Maximum distance to snap to anchor

    this.canvas.getObjects().forEach((obj: any) => {
      // Check for anchor points (including weld points)
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
      // Wrap edit in state management
      if (this.stateManagement) {
        this.stateManagement.executeOperation('Edit Weld Number', () => {
          this.editWeldNumberInternal(group, input);
        });
      } else {
        this.editWeldNumberInternal(group, input);
      }
    }
  }
  
  private editWeldNumberInternal(group: fabric.Group, input: string): void {
    if (!this.canvas) return;
    
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

  private handleWeldStampDrag(group: fabric.Group, e: any): void {
    // Dragging is disabled for now to avoid coordinate issues
    // The group can be moved as a whole unit
    return;
  }

  private editWelderNumber(group: fabric.Group): void {
    if (!this.canvas) return;

    // @ts-ignore
    const currentNumber = group.data?.number || '1';
    const input = prompt('Enter welder number:', currentNumber.toString());
    
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

  private handleWelderStampDrag(group: fabric.Group, e: any): void {
    // Dragging is disabled for now to avoid coordinate issues
    // The group can be moved as a whole unit
    return;
  }

  private handleWelderStampEmptyDrag(group: fabric.Group, e: any): void {
    // Dragging is disabled for now to avoid coordinate issues
    // The group can be moved as a whole unit
    return;
  }

  private editWelderStampAS(group: fabric.Group): void {
    if (!this.canvas) return;

    // @ts-ignore
    const data = group.data;
    if (!data) return;

    // Get three numbers from user
    const number1 = prompt('Enter first number (above circle):', data.number1 || '');
    if (!number1) return;
    
    const number2 = prompt('Enter second number (upper half of circle):', data.number2 || '');
    if (!number2) return;
    
    const number3 = prompt('Enter third number (lower half of circle):', data.number3 || '');
    if (!number3) return;

    // Get objects from group
    const objects = group.getObjects();
    const texts = objects.filter((obj: any) => obj instanceof fabric.Text) as fabric.Text[];
    
    if (texts.length >= 3) {
      // Save current position
      const currentLeft = group.left;
      const currentTop = group.top;
      
      // Update texts
      texts[0].set('text', number1); // Text above circle
      texts[1].set('text', number2); // Text in upper half
      texts[2].set('text', number3); // Text in lower half
      
      // Update data
      // @ts-ignore
      group.data.number1 = number1;
      // @ts-ignore
      group.data.number2 = number2;
      // @ts-ignore
      group.data.number3 = number3;
      
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

  private handleWelderStampASDrag(group: fabric.Group, e: any): void {
    // Dragging is disabled for now to avoid coordinate issues
    // The group can be moved as a whole unit
    return;
  }

  private createWeld(point: { x: number; y: number }): void {
    if (!this.canvas) return;
    
    // Wrap in state management
    if (this.stateManagement) {
      this.stateManagement.executeOperation('Add Weld', () => {
        this.createWeldInternal(point);
      });
    } else {
      this.createWeldInternal(point);
    }
  }
  
  private createWeldInternal(point: { x: number; y: number }): void {
    if (!this.canvas) return;

    // Create X mark directly at the specified point WITHOUT grouping
    const size = 8; // Half size of the X
    
    // First diagonal line (top-left to bottom-right)
    const line1 = new fabric.Line([
      point.x - size, point.y - size,
      point.x + size, point.y + size
    ], {
      stroke: 'red',
      strokeWidth: 3,
      selectable: false,
      evented: false
    });

    // Second diagonal line (top-right to bottom-left)
    const line2 = new fabric.Line([
      point.x + size, point.y - size,
      point.x - size, point.y + size
    ], {
      stroke: 'red',
      strokeWidth: 3,
      selectable: false,
      evented: false
    });

    // Add lines directly to canvas
    this.canvas.add(line1);
    this.canvas.add(line2);
    
    // Create an invisible circle for anchor functionality
    const anchorCircle = new fabric.Circle({
      left: point.x,
      top: point.y,
      radius: 10,
      fill: 'transparent',
      stroke: 'transparent',
      strokeWidth: 0,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true
    });
    
    // Add custom properties for anchor functionality
    // @ts-ignore
    anchorCircle.customType = 'anchorPoint';
    // @ts-ignore
    anchorCircle.isWeldPoint = true;
    // @ts-ignore
    anchorCircle.associatedLines = [line1, line2];
    
    // When the invisible circle moves, move the X lines with it
    anchorCircle.on('moving', (e: any) => {
      const obj = e.target;
      if (!obj) return;
      const newX = obj.left || 0;
      const newY = obj.top || 0;
      
      line1.set({
        x1: newX - size,
        y1: newY - size,
        x2: newX + size,
        y2: newY + size
      });
      
      line2.set({
        x1: newX + size,
        y1: newY - size,
        x2: newX - size,
        y2: newY + size
      });
      
      if (this.canvas) {
        this.canvas.renderAll();
      }
    });
    
    this.canvas.add(anchorCircle);
    this.canvas.renderAll();
  }

  public handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.stopAllWeldingModes();
    }
  }

  private createFluidStamp(start: { x: number; y: number }, end: { x: number; y: number }): void {
    if (!this.canvas) return;
    
    // Wrap in state management
    if (this.stateManagement) {
      this.stateManagement.executeOperation('Add Flange Stamp', () => {
        this.createFluidStampInternal(start, end);
      });
    } else {
      this.createFluidStampInternal(start, end);
    }
  }
  
  private createFluidStampInternal(start: { x: number; y: number }, end: { x: number; y: number }): void {
    if (!this.canvas) return;

    // Create line
    const line = new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke: 'black',
      strokeWidth: 2,
      selectable: false,
      evented: false
    });

    // Create diamond shape (rotated square)
    const diamondSize = 20; // Size of the diamond
    const diamond = new fabric.Polygon([
      { x: 0, y: -diamondSize },     // Top
      { x: diamondSize, y: 0 },       // Right
      { x: 0, y: diamondSize },       // Bottom
      { x: -diamondSize, y: 0 }       // Left
    ], {
      left: end.x,
      top: end.y,
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center'
    });

    // Create text with FL number
    const text = new fabric.Text(`FL${this.currentFluidNumber}`, {
      left: end.x,
      top: end.y,
      fontSize: 10,
      fontFamily: 'Arial',
      fill: 'black',
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      textAlign: 'center'
    });

    // Group all elements
    const group = new fabric.Group([line, diamond, text], {
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
      type: 'fluidstamp', 
      number: this.currentFluidNumber,
      startPoint: start,
      endPoint: end,
      lineObj: line,
      diamondObj: diamond,
      textObj: text
    };

    // Set up double-click handler for editing
    group.on('mousedblclick', () => {
      console.log('Fluid stamp double-clicked');
      this.editFluidNumber(group);
    });

    // Set up drag handler for moving end point
    group.on('moving', (e: any) => {
      this.handleFluidStampDrag(group, e);
    });

    this.canvas.add(group);
    
    // Deselect immediately to prevent accidental movement
    this.canvas.discardActiveObject();

    this.currentFluidNumber++;
  }

  private editFluidNumber(group: fabric.Group): void {
    if (!this.canvas) return;

    // @ts-ignore
    const currentNumber = group.data?.number || '1';
    const input = prompt('Enter fluid number:', `FL${currentNumber}`);
    
    if (input) {
      // Get objects from group
      const objects = group.getObjects();
      const text = objects.find((obj: any) => obj instanceof fabric.Text) as fabric.Text;
      
      if (text) {
        // Save current position
        const currentLeft = group.left;
        const currentTop = group.top;
        
        // Update text
        text.set('text', input);
        
        // Extract number if user entered FL prefix
        const numberMatch = input.match(/FL(\d+)/);
        if (numberMatch) {
          // @ts-ignore
          group.data.number = Number(numberMatch[1]);
        }
        
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

  private handleFluidStampDrag(group: fabric.Group, e: any): void {
    // Dragging is disabled for now to avoid coordinate issues
    // The group can be moved as a whole unit
    return;
  }

  public isActive(): boolean {
    return this.isWeldstampActive || this.isWelderStampActive || this.isWelderStampEmptyActive || this.isWelderStampASActive || this.isWeldActive || this.isFluidStampActive;
  }

  public getActiveMode(): 'weldstamp' | 'welderstamp' | 'welderstampempty' | 'welderstampas' | 'weld' | 'fluidstamp' | null {
    if (this.isWeldstampActive) return 'weldstamp';
    if (this.isWelderStampActive) return 'welderstamp';
    if (this.isWelderStampEmptyActive) return 'welderstampempty';
    if (this.isWelderStampASActive) return 'welderstampas';
    if (this.isWeldActive) return 'weld';
    if (this.isFluidStampActive) return 'fluidstamp';
    return null;
  }

  public resetNumbering(): void {
    this.currentWeldNumber = 1;
  }

  /**
   * Reset all welding counters to initial state
   */
  public resetCounters(): void {
    this.currentWeldNumber = 1;
    this.currentWelderNumber = 1;
    this.currentFluidNumber = 1;
    this.weldStamps = [];
  }
}