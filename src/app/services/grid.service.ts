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

    // Create a larger pattern canvas to accommodate isometric grid
    // For isometric grid, we need to create a diamond pattern
    // The pattern repeats every 2x gridSize horizontally and vertically
    const patternCanvas = document.createElement('canvas');
    const patternWidth = gridSize * 2;
    const patternHeight = gridSize * 2;
    patternCanvas.width = patternWidth;
    patternCanvas.height = patternHeight;
    const ctx = patternCanvas.getContext('2d')!;

    // Clear canvas
    ctx.clearRect(0, 0, patternWidth, patternHeight);

    // Draw isometric grid lines
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    // Isometric grid has three main directions:
    // 1. Vertical lines (Z-axis)
    // 2. 30° lines going up-right (X-axis)
    // 3. 30° lines going up-left (Y-axis)

    // For 30° angle: rise/run = tan(30°) = 1/√3 ≈ 0.577
    // This means for every 2 pixels horizontal, we go ~1.15 pixels vertical
    // But using the 2:1 rule is simpler: for every 2 units horizontal, 1 unit vertical

    // Vertical line at left edge (Z-axis)
    ctx.moveTo(0, 0);
    ctx.lineTo(0, patternHeight);

    // Vertical line at middle
    ctx.moveTo(gridSize, 0);
    ctx.lineTo(gridSize, patternHeight);

    // 30° line going down-right (from top-left, X-axis direction)
    // Starting from top-left corner
    ctx.moveTo(0, 0);
    ctx.lineTo(patternWidth, gridSize);

    // Parallel 30° line shifted down
    ctx.moveTo(0, gridSize);
    ctx.lineTo(patternWidth, patternHeight);

    // 30° line going down-left (from top-right, Y-axis direction)
    // Starting from top-right corner
    ctx.moveTo(patternWidth, 0);
    ctx.lineTo(0, gridSize);

    // Parallel 30° line shifted down
    ctx.moveTo(patternWidth, gridSize);
    ctx.lineTo(0, patternHeight);

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