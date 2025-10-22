import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

/**
 * TouchEventService
 *
 * Manages touch interactions for mobile devices and converts them to canvas operations.
 * Handles:
 * - Single tap (equivalent to click)
 * - Double tap (equivalent to double-click)
 * - Long press (alternative to right-click/modifier keys)
 * - Pinch to zoom
 * - Two-finger pan
 */
@Injectable({
  providedIn: 'root'
})
export class TouchEventService {
  private canvas: fabric.Canvas | null = null;

  // Touch gesture detection
  private lastTapTime = 0;
  private doubleTapDelay = 300; // ms
  private longPressDelay = 500; // ms
  private longPressTimer: any = null;

  // Pinch zoom state
  private isPinching = false;
  private lastPinchDistance = 0;
  private initialZoom = 1;

  // Two-finger pan state
  private isPanning = false;
  private lastPanPoint: { x: number; y: number } | null = null;

  // Modifier state (simulated via long-press or UI toggles)
  private shiftKeySimulated = false;
  private ctrlKeySimulated = false;

  constructor() {}

  /**
   * Initialize touch event handlers on the canvas
   */
  initializeTouchEvents(canvas: fabric.Canvas): void {
    this.canvas = canvas;

    const canvasElement = canvas.getElement();

    // Add touch event listeners
    canvasElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    canvasElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    canvasElement.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    canvasElement.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }

  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();

    if (!this.canvas) return;

    const touches = event.touches;

    // Single touch - potential tap or drag
    if (touches.length === 1) {
      this.handleSingleTouchStart(touches[0]);
    }
    // Two fingers - pinch zoom or pan
    else if (touches.length === 2) {
      this.handleTwoFingerStart(touches);
    }
  }

  /**
   * Handle single touch start
   */
  private handleSingleTouchStart(touch: Touch): void {
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - this.lastTapTime;

    // Check for double tap
    if (timeSinceLastTap < this.doubleTapDelay) {
      this.handleDoubleTap(touch);
      this.lastTapTime = 0; // Reset to prevent triple tap detection
    } else {
      this.lastTapTime = currentTime;

      // Start long press timer
      this.longPressTimer = setTimeout(() => {
        this.handleLongPress(touch);
      }, this.longPressDelay);
    }

    // Convert touch to mouse event for Fabric.js
    this.dispatchMouseEvent('mousedown', touch);
  }

  /**
   * Handle two-finger touch start (pinch/pan)
   */
  private handleTwoFingerStart(touches: TouchList): void {
    this.cancelLongPress();

    // Calculate initial distance for pinch detection
    const distance = this.getTouchDistance(touches[0], touches[1]);
    this.lastPinchDistance = distance;
    this.isPinching = true;

    if (this.canvas) {
      this.initialZoom = this.canvas.getZoom();
    }

    // Calculate midpoint for panning
    const midpoint = this.getTouchMidpoint(touches[0], touches[1]);
    this.lastPanPoint = midpoint;
    this.isPanning = true;
  }

  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();

    if (!this.canvas) return;

    const touches = event.touches;

    if (touches.length === 1) {
      // Cancel long press if finger moves
      this.cancelLongPress();

      // Dispatch mouse move
      this.dispatchMouseEvent('mousemove', touches[0]);
    }
    else if (touches.length === 2 && this.isPinching) {
      this.handlePinchZoom(touches);
      this.handleTwoFingerPan(touches);
    }
  }

  /**
   * Handle pinch to zoom
   */
  private handlePinchZoom(touches: TouchList): void {
    if (!this.canvas) return;

    const currentDistance = this.getTouchDistance(touches[0], touches[1]);
    const scale = currentDistance / this.lastPinchDistance;

    // Calculate new zoom level
    let newZoom = this.canvas.getZoom() * scale;

    // Limit zoom levels
    newZoom = Math.max(0.5, Math.min(5, newZoom));

    // Get midpoint as zoom center
    const midpoint = this.getTouchMidpoint(touches[0], touches[1]);
    const canvasRect = this.canvas.getElement().getBoundingClientRect();
    const zoomPoint = new fabric.Point(
      midpoint.x - canvasRect.left,
      midpoint.y - canvasRect.top
    );

    this.canvas.zoomToPoint(zoomPoint, newZoom);
    this.lastPinchDistance = currentDistance;
  }

  /**
   * Handle two-finger pan
   */
  private handleTwoFingerPan(touches: TouchList): void {
    if (!this.canvas || !this.lastPanPoint) return;

    const currentMidpoint = this.getTouchMidpoint(touches[0], touches[1]);
    const deltaX = currentMidpoint.x - this.lastPanPoint.x;
    const deltaY = currentMidpoint.y - this.lastPanPoint.y;

    // Pan the canvas
    const vpt = this.canvas.viewportTransform;
    if (vpt) {
      vpt[4] += deltaX;
      vpt[5] += deltaY;
      this.canvas.requestRenderAll();
    }

    this.lastPanPoint = currentMidpoint;
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();

    this.cancelLongPress();

    if (event.touches.length === 0) {
      // All fingers lifted
      this.isPinching = false;
      this.isPanning = false;
      this.lastPanPoint = null;

      // Dispatch mouse up
      if (event.changedTouches.length > 0) {
        this.dispatchMouseEvent('mouseup', event.changedTouches[0]);
      }
    }
  }

  /**
   * Handle touch cancel events
   */
  private handleTouchCancel(event: TouchEvent): void {
    this.cancelLongPress();
    this.isPinching = false;
    this.isPanning = false;
    this.lastPanPoint = null;
  }

  /**
   * Handle double tap (equivalent to double-click)
   */
  private handleDoubleTap(touch: Touch): void {
    console.log('Double tap detected');
    this.cancelLongPress();
    this.dispatchMouseEvent('dblclick', touch);
  }

  /**
   * Handle long press (can simulate modifier keys or show context menu)
   */
  private handleLongPress(touch: Touch): void {
    console.log('Long press detected');

    // Option 1: Show context menu or tool selector
    // Option 2: Toggle modifier key simulation
    // For now, we'll toggle shift key simulation
    this.shiftKeySimulated = !this.shiftKeySimulated;

    // Visual feedback (vibration if available)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // You could emit an event here to show UI feedback
  }

  /**
   * Cancel long press timer
   */
  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * Calculate distance between two touches
   */
  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate midpoint between two touches
   */
  private getTouchMidpoint(touch1: Touch, touch2: Touch): { x: number; y: number } {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }

  /**
   * Dispatch synthetic mouse event from touch
   */
  private dispatchMouseEvent(type: string, touch: Touch): void {
    if (!this.canvas) return;

    const canvasElement = this.canvas.getElement();
    const rect = canvasElement.getBoundingClientRect();

    // Create synthetic mouse event
    const mouseEvent = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      shiftKey: this.shiftKeySimulated,
      ctrlKey: this.ctrlKeySimulated,
      button: 0
    });

    // Dispatch to canvas element
    canvasElement.dispatchEvent(mouseEvent);
  }

  /**
   * Public methods for UI to control modifier key simulation
   */
  setShiftKeySimulation(enabled: boolean): void {
    this.shiftKeySimulated = enabled;
  }

  setCtrlKeySimulation(enabled: boolean): void {
    this.ctrlKeySimulated = enabled;
  }

  getShiftKeySimulation(): boolean {
    return this.shiftKeySimulated;
  }

  getCtrlKeySimulation(): boolean {
    return this.ctrlKeySimulated;
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.cancelLongPress();
    this.canvas = null;
  }
}
