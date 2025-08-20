import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

@Injectable({
  providedIn: 'root'
})
export class RenderSchedulerService {
  private pendingRender = false;
  private renderDebounceTimer: any = null;
  private batchedOperations: (() => void)[] = [];
  private batchTimer: any = null;

  /**
   * Schedule a render using requestAnimationFrame
   * This ensures renders happen at the optimal time for smooth animation
   */
  scheduleRender(canvas: fabric.Canvas): void {
    if (!this.pendingRender) {
      this.pendingRender = true;
      requestAnimationFrame(() => {
        canvas.requestRenderAll();
        this.pendingRender = false;
      });
    }
  }

  /**
   * Debounced render - useful for rapid updates like mouse moves
   * @param canvas The fabric canvas
   * @param delay Debounce delay in milliseconds (default 16ms for ~60fps)
   */
  debouncedRender(canvas: fabric.Canvas, delay: number = 16): void {
    if (this.renderDebounceTimer) {
      clearTimeout(this.renderDebounceTimer);
    }
    
    this.renderDebounceTimer = setTimeout(() => {
      canvas.requestRenderAll();
      this.renderDebounceTimer = null;
    }, delay);
  }

  /**
   * Batch multiple canvas operations and render once
   * @param operation Function containing canvas operations
   */
  batchOperation(operation: () => void): void {
    this.batchedOperations.push(operation);
    
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.executeBatch();
      }, 0);
    }
  }

  /**
   * Execute all batched operations and render once
   */
  private executeBatch(): void {
    const operations = [...this.batchedOperations];
    this.batchedOperations = [];
    this.batchTimer = null;
    
    operations.forEach(op => op());
  }

  /**
   * Cancel any pending renders
   */
  cancelPendingRenders(): void {
    if (this.renderDebounceTimer) {
      clearTimeout(this.renderDebounceTimer);
      this.renderDebounceTimer = null;
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    this.pendingRender = false;
    this.batchedOperations = [];
  }

  /**
   * Check if there are pending renders
   */
  hasPendingRenders(): boolean {
    return this.pendingRender || 
           this.renderDebounceTimer !== null || 
           this.batchTimer !== null ||
           this.batchedOperations.length > 0;
  }
}