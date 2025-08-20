import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { StateManagementService } from './state-management.service';

@Injectable({
  providedIn: 'root'
})
export class FreehandDrawingService {
  private canvas: fabric.Canvas | null = null;
  private stateManagement: StateManagementService | null = null;
  private isDrawing = false;
  private isFreehandModeActive = false;
  private currentPath: fabric.Path | null = null;
  private pathPoints: any[] = [];
  private lastPoint: { x: number; y: number } | null = null;
  private currentStrokeWidth = 2;
  private currentStrokeColor = '#000000';
  private minStrokeWidth = 1;
  private maxStrokeWidth = 20;
  private isShiftPressed = false;
  private boundHandleMouseDown: any;
  private boundHandleMouseMove: any;
  private boundHandleMouseUp: any;
  private boundHandleKeyDown: any;
  private boundHandleKeyUp: any;
  private boundHandleWheel: any;

  constructor() {
    // Bind event handlers once in constructor
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);
  }

  setCanvas(canvas: fabric.Canvas | null) {
    this.canvas = canvas;
  }

  setStateManagement(stateManagement: StateManagementService) {
    this.stateManagement = stateManagement;
  }

  startFreehandDrawing() {
    if (!this.canvas) return;

    this.isFreehandModeActive = true;
    this.canvas.isDrawingMode = false;
    this.canvas.selection = false;
    this.addEventListeners();
  }

  stopFreehandDrawing() {
    if (!this.canvas) return;

    this.isFreehandModeActive = false;
    this.canvas.isDrawingMode = false;
    this.canvas.selection = true;
    this.removeEventListeners();
  }

  setStrokeColor(color: string) {
    this.currentStrokeColor = color;
  }

  getStrokeColor(): string {
    return this.currentStrokeColor;
  }

  getStrokeWidth(): number {
    return this.currentStrokeWidth;
  }

  private addEventListeners() {
    if (!this.canvas) return;

    this.canvas.on('mouse:down', this.boundHandleMouseDown);
    this.canvas.on('mouse:move', this.boundHandleMouseMove);
    this.canvas.on('mouse:up', this.boundHandleMouseUp);
    
    document.addEventListener('keydown', this.boundHandleKeyDown);
    document.addEventListener('keyup', this.boundHandleKeyUp);
    document.addEventListener('wheel', this.boundHandleWheel, { passive: false });
  }

  private removeEventListeners() {
    if (!this.canvas) return;

    this.canvas.off('mouse:down', this.boundHandleMouseDown);
    this.canvas.off('mouse:move', this.boundHandleMouseMove);
    this.canvas.off('mouse:up', this.boundHandleMouseUp);
    
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    document.removeEventListener('keyup', this.boundHandleKeyUp);
    document.removeEventListener('wheel', this.boundHandleWheel);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Shift') {
      this.isShiftPressed = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (e.key === 'Shift') {
      this.isShiftPressed = false;
    }
  }

  private handleWheel(e: WheelEvent) {
    if (e.ctrlKey) {
      e.preventDefault();
      
      const delta = e.deltaY > 0 ? -1 : 1;
      this.currentStrokeWidth = Math.max(
        this.minStrokeWidth,
        Math.min(this.maxStrokeWidth, this.currentStrokeWidth + delta)
      );
      
      // Visual feedback for stroke width change
      if (this.canvas) {
        const pointer = this.canvas.getPointer(e);
        this.showStrokeWidthIndicator(pointer.x, pointer.y);
      }
    }
  }

  private showStrokeWidthIndicator(x: number, y: number) {
    if (!this.canvas) return;

    // Create temporary circle to show stroke width
    const indicator = new fabric.Circle({
      left: x - this.currentStrokeWidth / 2,
      top: y - this.currentStrokeWidth / 2,
      radius: this.currentStrokeWidth / 2,
      fill: this.currentStrokeColor,
      opacity: 0.5,
      selectable: false,
      evented: false
    });

    this.canvas.add(indicator);
    
    // Remove indicator after 500ms
    setTimeout(() => {
      this.canvas?.remove(indicator);
      this.canvas?.renderAll();
    }, 500);
  }

  private handleMouseDown(options: fabric.TPointerEventInfo) {
    if (!this.canvas) return;

    const pointer = this.canvas.getPointer(options.e);
    this.isDrawing = true;
    this.pathPoints = [`M ${pointer.x} ${pointer.y}`];
    this.lastPoint = { x: pointer.x, y: pointer.y };
  }

  private handleMouseMove(options: fabric.TPointerEventInfo) {
    if (!this.canvas || !this.isDrawing || !this.lastPoint) return;

    const pointer = this.canvas.getPointer(options.e);
    
    if (this.isShiftPressed) {
      // Snap to 15° angles
      const angle = Math.atan2(pointer.y - this.lastPoint.y, pointer.x - this.lastPoint.x);
      const snappedAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
      const distance = Math.sqrt(
        Math.pow(pointer.x - this.lastPoint.x, 2) + 
        Math.pow(pointer.y - this.lastPoint.y, 2)
      );
      
      pointer.x = this.lastPoint.x + Math.cos(snappedAngle) * distance;
      pointer.y = this.lastPoint.y + Math.sin(snappedAngle) * distance;
    }

    this.pathPoints.push(`L ${pointer.x} ${pointer.y}`);
    
    // Remove old path if exists
    if (this.currentPath) {
      this.canvas.remove(this.currentPath);
    }

    // Create new path
    this.currentPath = new fabric.Path(this.pathPoints.join(' '), {
      stroke: this.currentStrokeColor,
      strokeWidth: this.currentStrokeWidth,
      fill: '',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      selectable: true,
      evented: true
    });

    this.canvas.add(this.currentPath);
    this.canvas.renderAll();

    if (!this.isShiftPressed) {
      this.lastPoint = { x: pointer.x, y: pointer.y };
    }
  }

  private handleMouseUp() {
    if (!this.canvas || !this.currentPath) return;

    this.isDrawing = false;

    // Save the final path with state management
    if (this.stateManagement && this.currentPath) {
      this.stateManagement.executeOperation('Freihand zeichnen', () => {
        // Path is already added to canvas
      });
    }

    this.currentPath = null;
    this.pathPoints = [];
    this.lastPoint = null;
  }

  cleanup() {
    this.stopFreehandDrawing();
    this.isDrawing = false;
    this.currentPath = null;
    this.pathPoints = [];
    this.lastPoint = null;
  }

  isActive(): boolean {
    return this.isFreehandModeActive;
  }
}