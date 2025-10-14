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

    // MATHEMATISCH KORREKTE 30° WINKEL:
    // tan(30°) = 1/√3 ≈ 0.57735
    // Das bedeutet: für "gridSize" Einheiten horizontal → gridSize * tan(30°) Einheiten vertikal

    // Für ein sich wiederholendes Pattern brauchen wir:
    // - Horizontale Breite: 2 * gridSize (für beide schrägen Achsen)
    // - Vertikale Höhe: 2 * gridSize * tan(30°) für die volle Raute

    const tan30 = Math.tan(30 * Math.PI / 180); // = 1/√3 ≈ 0.57735

    const patternCanvas = document.createElement('canvas');
    const patternWidth = gridSize * 2;
    const patternHeight = gridSize * 2 * tan30; // Exakte 30° Höhe

    patternCanvas.width = patternWidth;
    patternCanvas.height = patternHeight;
    const ctx = patternCanvas.getContext('2d')!;

    // Clear canvas
    ctx.clearRect(0, 0, patternWidth, patternHeight);

    // Draw isometric grid lines
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    // KORREKTE ISOMETRISCHE PROJEKTION MIT EXAKTEN 30° WINKELN:
    // 1. Z-Achse: Vertikal (senkrecht)
    // 2. X-Achse: Exakt 30° zur Horizontalen nach RECHTS OBEN
    // 3. Y-Achse: Exakt 30° zur Horizontalen nach LINKS OBEN

    // VERTIKALE LINIEN (Z-Achse - senkrecht nach oben)
    // Diese laufen durch, aber wir zeichnen sie nur im Pattern-Bereich
    ctx.moveTo(0, 0);
    ctx.lineTo(0, patternHeight);

    ctx.moveTo(gridSize, 0);
    ctx.lineTo(gridSize, patternHeight);

    // X-ACHSE LINIEN (exakt 30° nach RECHTS OBEN)
    // Von unten-links nach oben-rechts
    // Steigung: -tan(30°) (negativ weil Y nach unten wächst)
    ctx.moveTo(0, patternHeight);
    ctx.lineTo(patternWidth, 0);

    // Parallele X-Achse Linie (eine Einheit nach oben versetzt)
    ctx.moveTo(0, 0);
    ctx.lineTo(patternWidth, -patternHeight);

    // Zusätzliche Linie für nahtloses Pattern
    ctx.moveTo(-patternWidth, patternHeight);
    ctx.lineTo(0, 0);

    // Y-ACHSE LINIEN (exakt 30° nach LINKS OBEN)
    // Von unten-rechts nach oben-links
    // Steigung: +tan(30°) in negativer X-Richtung
    ctx.moveTo(patternWidth, patternHeight);
    ctx.lineTo(0, 0);

    // Parallele Y-Achse Linie
    ctx.moveTo(patternWidth, 0);
    ctx.lineTo(0, -patternHeight);

    // Zusätzliche Linie für nahtloses Pattern
    ctx.moveTo(patternWidth * 2, patternHeight);
    ctx.lineTo(patternWidth, 0);

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