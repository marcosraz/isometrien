import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { BehaviorSubject } from 'rxjs';

export interface GridState {
  enabled: boolean;
  size: number;
  visible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GridService {
  private canvas!: fabric.Canvas;
  private gridPattern: fabric.Pattern | null = null;
  
  private _gridState = new BehaviorSubject<GridState>({
    enabled: false,
    size: 20,
    visible: false
  });
  
  public gridState = this._gridState.asObservable();
  
  initializeCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
    this.createGridPattern();
    this.setupGridSizeControls();
  }
  
  toggleGrid(): void {
    const currentState = this._gridState.value;
    const newState = { ...currentState, enabled: !currentState.enabled, visible: !currentState.enabled };
    this._gridState.next(newState);
    this.updateCanvasGrid();
  }
  
  setGridSize(size: number): void {
    const currentState = this._gridState.value;
    this._gridState.next({ ...currentState, size });
    this.createGridPattern();
    if (currentState.enabled) {
      this.updateCanvasGrid();
    }
  }
  
  private createGridPattern(): void {
    const gridSize = this._gridState.value.size;
    
    // Create grid pattern canvas
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = gridSize;
    patternCanvas.height = gridSize;
    const ctx = patternCanvas.getContext('2d')!;
    
    // Draw grid lines
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(gridSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, gridSize);
    ctx.stroke();
    
    // Create fabric pattern
    this.gridPattern = new fabric.Pattern({
      source: patternCanvas,
      repeat: 'repeat'
    });
  }
  
  private setupGridSizeControls(): void {
    this.canvas.on('mouse:wheel', (opt) => {
      const event = opt.e as WheelEvent;
      
      // Only handle Alt+Scroll for grid size adjustment
      if (event.altKey) {
        const currentState = this._gridState.value;
        const delta = event.deltaY;
        let newSize = currentState.size;
        
        // Adjust grid size based on scroll direction
        if (delta > 0) {
          newSize = Math.max(5, newSize - 5); // Decrease size, minimum 5px
        } else {
          newSize = Math.min(100, newSize + 5); // Increase size, maximum 100px
        }
        
        if (newSize !== currentState.size) {
          this.setGridSize(newSize);
        }
        
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }
  
  private updateCanvasGrid(): void {
    if (!this.canvas) return;
    
    if (this._gridState.value.enabled && this.gridPattern) {
      this.canvas.backgroundColor = this.gridPattern;
    } else {
      this.canvas.backgroundColor = '#f3f3f3';
    }
    
    this.canvas.requestRenderAll();
  }
}