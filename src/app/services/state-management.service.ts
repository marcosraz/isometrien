import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { LineDrawingService } from './line-drawing.service';
import { WeldingService } from './welding.service';
import { DimensionService } from './dimension.service';
import { ObjectManagementService } from './object-management.service';

interface ServiceState {
  lineDrawing?: {
    editableLines: any[];
    editablePipes: any[];
  };
  welding?: {
    weldStamps: any[];
    currentWeldNumber: number;
    currentFluidNumber: number;
  };
  dimension?: {
    dimensions: any[];
  };
}

interface CanvasState {
  canvasJSON: string;
  serviceStates: ServiceState;
  timestamp: number;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class StateManagementService {
  private states: CanvasState[] = [];
  private currentStateIndex: number = -1;
  private maxStates: number = 50;
  private canvas: fabric.Canvas | null = null;
  private isExecutingOperation: boolean = false;
  private operationObjects: fabric.Object[] = [];
  
  constructor(
    private lineDrawingService: LineDrawingService,
    private weldingService: WeldingService,
    private dimensionService: DimensionService,
    private objectManagementService: ObjectManagementService
  ) {
    // Register custom properties to be included in toJSON
    this.registerCustomProperties();
  }
  
  public setCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
    this.setupCanvasListeners();
  }
  
  private registerCustomProperties(): void {
    // Extend toObject to include custom properties
    const toObjectOriginal = fabric.Object.prototype.toObject;
    fabric.Object.prototype.toObject = function(propertiesToInclude: string[] = []) {
      const customProps = [
        'customType', 'isDimensionPart', 'dimensionId', 'isWeldPoint',
        'data', 'reusable', 'originalFill', 'associatedLines',
        '_originalStroke', '_originalStrokeWidth', 'perPixelTargetFind', 'targetFindTolerance'
      ];
      return toObjectOriginal.call(this, [...propertiesToInclude, ...customProps]);
    };
  }
  
  private setupCanvasListeners(): void {
    if (!this.canvas) return;
    
    // Track objects added during operations
    this.canvas.on('object:added', (e) => {
      if (this.isExecutingOperation && e.target) {
        this.operationObjects.push(e.target);
      }
    });
  }
  
  /**
   * Execute an operation with automatic state management
   */
  public executeOperation(description: string, operation: () => void | Promise<void>): void {
    if (!this.canvas) {
      console.error('Canvas not set in StateManagementService');
      return;
    }
    
    // Start operation tracking
    this.isExecutingOperation = true;
    this.operationObjects = [];
    
    try {
      // Execute the operation
      const result = operation();
      
      // Handle async operations
      if (result instanceof Promise) {
        result.then(() => {
          this.completeOperation(description);
        }).catch((error) => {
          console.error('Operation failed:', error);
          this.isExecutingOperation = false;
          this.operationObjects = [];
        });
      } else {
        // Sync operation completed
        this.completeOperation(description);
      }
    } catch (error) {
      console.error('Operation failed:', error);
      this.isExecutingOperation = false;
      this.operationObjects = [];
    }
  }
  
  private completeOperation(description: string): void {
    // Use setTimeout to ensure all canvas operations are complete
    setTimeout(() => {
      this.saveState(description);
      this.isExecutingOperation = false;
      this.operationObjects = [];
    }, 50);
  }
  
  /**
   * Save current state
   */
  public saveState(description: string = 'Manual Save'): void {
    if (!this.canvas) return;
    
    // Collect service states
    const serviceStates: ServiceState = {
      lineDrawing: {
        editableLines: this.serializeEditableLines(),
        editablePipes: this.serializeEditablePipes()
      },
      welding: {
        weldStamps: this.serializeWeldStamps(),
        currentWeldNumber: (this.weldingService as any).currentWeldNumber || 1,
        currentFluidNumber: (this.weldingService as any).currentFluidNumber || 1
      },
      dimension: {
        dimensions: this.serializeDimensions()
      }
    };
    
    // Create state object
    const state: CanvasState = {
      canvasJSON: JSON.stringify(this.canvas.toJSON()),
      serviceStates: serviceStates,
      timestamp: Date.now(),
      description: description
    };
    
    // Remove any states after current index (for redo functionality)
    this.states = this.states.slice(0, this.currentStateIndex + 1);
    
    // Add new state
    this.states.push(state);
    this.currentStateIndex++;
    
    // Limit number of states
    if (this.states.length > this.maxStates) {
      this.states.shift();
      this.currentStateIndex--;
    }
    
    console.log(`State saved: ${description} (Index: ${this.currentStateIndex})`);
  }
  
  /**
   * Undo last operation
   */
  public undo(): void {
    if (!this.canUndo() || !this.canvas) return;
    
    this.currentStateIndex--;
    this.restoreState(this.states[this.currentStateIndex]);
    console.log(`Undo to index: ${this.currentStateIndex}`);
  }
  
  /**
   * Redo operation
   */
  public redo(): void {
    if (!this.canRedo() || !this.canvas) return;
    
    this.currentStateIndex++;
    this.restoreState(this.states[this.currentStateIndex]);
    console.log(`Redo to index: ${this.currentStateIndex}`);
  }
  
  /**
   * Check if undo is possible
   */
  public canUndo(): boolean {
    return this.currentStateIndex > 0;
  }
  
  /**
   * Check if redo is possible
   */
  public canRedo(): boolean {
    return this.currentStateIndex < this.states.length - 1;
  }
  
  /**
   * Restore a saved state
   */
  private restoreState(state: CanvasState): void {
    if (!this.canvas) return;
    
    // Temporarily disable operation tracking
    const wasExecuting = this.isExecutingOperation;
    this.isExecutingOperation = false;
    
    try {
      // Load canvas state
      this.canvas.loadFromJSON(JSON.parse(state.canvasJSON), () => {
        // Fix line selection properties for all lines and paths
        if (this.canvas) {
          const objects = this.canvas.getObjects();
          objects.forEach(obj => {
            // Fix lines - but skip dimension lines
            if (obj.type === 'line' && !(obj as any).isDimensionPart) {
              obj.set({
                perPixelTargetFind: true,
                targetFindTolerance: 5,
                selectable: true,
                evented: true,
                hasControls: true,
                hasBorders: true,
              });
            }
            // Fix paths (for curved pipe segments)
            else if (obj.type === 'path' && !(obj as any).isDimensionPart) {
              obj.set({
                perPixelTargetFind: true,
                targetFindTolerance: 5,
                selectable: true,
                evented: true,
                hasControls: false,
                hasBorders: true,
              });
            }
          });
        }
        
        // Restore service states
        this.restoreServiceStates(state.serviceStates);
        
        // Re-establish event handlers and connections
        this.reestablishConnections();
        
        this.canvas!.renderAll();
        this.isExecutingOperation = wasExecuting;
      });
    } catch (error) {
      console.error('Error restoring state:', error);
      this.isExecutingOperation = wasExecuting;
    }
  }
  
  /**
   * Serialize editable lines
   */
  private serializeEditableLines(): any[] {
    const lines = (this.lineDrawingService as any).editableLines || [];
    return lines.filter((line: any) => line && line.line).map((line: any) => ({
      lineId: line.line.id || this.generateId(line.line),
      anchorIds: line.anchors ? line.anchors.map((a: fabric.Object) => (a as any).id || this.generateId(a)) : []
    }));
  }
  
  /**
   * Serialize editable pipes
   */
  private serializeEditablePipes(): any[] {
    const pipes = (this.lineDrawingService as any).editablePipes || [];
    return pipes.filter((pipe: any) => pipe && pipe.path).map((pipe: any) => ({
      pathId: pipe.path.id || this.generateId(pipe.path),
      anchorIds: pipe.anchors ? pipe.anchors.map((a: fabric.Object) => (a as any).id || this.generateId(a)) : []
    }));
  }
  
  /**
   * Serialize weld stamps
   */
  private serializeWeldStamps(): any[] {
    const stamps = (this.weldingService as any).weldStamps || [];
    return stamps.map((stamp: any) => ({
      groupId: stamp.group.id || this.generateId(stamp.group),
      number: stamp.number,
      anchorPoint: stamp.anchorPoint
    }));
  }
  
  /**
   * Serialize dimensions
   */
  private serializeDimensions(): any[] {
    const dimensions = this.dimensionService.getDimensions() || [];
    return dimensions.map((dim: any) => ({
      dimensionId: dim.dimensionId,
      offset: dim.offset,
      startAnchorId: dim.startAnchor.id || this.generateId(dim.startAnchor),
      endAnchorId: dim.endAnchor.id || this.generateId(dim.endAnchor)
    }));
  }
  
  /**
   * Generate unique ID for object
   */
  private generateId(obj: fabric.Object): string {
    const id = `${obj.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    (obj as any).id = id;
    return id;
  }
  
  /**
   * Restore service states from saved data
   */
  private restoreServiceStates(states: ServiceState): void {
    // This will be implemented to restore the internal states of each service
    // For now, we'll rely on services reconstructing from canvas objects
    this.reconstructLineService();
    this.reconstructWeldingService(states.welding);
    this.reconstructDimensionService();
  }
  
  /**
   * Reconstruct line drawing service state
   */
  private reconstructLineService(): void {
    if (!this.canvas) return;
    
    // Clear existing arrays
    (this.lineDrawingService as any).editableLines = [];
    (this.lineDrawingService as any).editablePipes = [];
    
    // Group objects by type
    const objects = this.canvas.getObjects();
    const anchors = objects.filter(obj => 
      obj.type === 'circle' && (obj as any).customType === 'anchorPoint'
    );
    
    // Reconstruct editable lines
    objects.forEach(obj => {
      if (obj.type === 'line' && !((obj as any).isDimensionPart)) {
        const line = obj as fabric.Line;
        const associatedAnchors = anchors.filter(anchor => {
          const tolerance = 5;
          return (
            (Math.abs(anchor.left! - line.x1!) < tolerance && 
             Math.abs(anchor.top! - line.y1!) < tolerance) ||
            (Math.abs(anchor.left! - line.x2!) < tolerance && 
             Math.abs(anchor.top! - line.y2!) < tolerance)
          );
        });
        
        if (associatedAnchors.length === 2) {
          (this.lineDrawingService as any).editableLines.push({
            line: line,
            anchors: associatedAnchors
          });
        }
      }
    });
  }
  
  /**
   * Reconstruct welding service state
   */
  private reconstructWeldingService(weldingState?: any): void {
    if (!this.canvas) return;
    
    // Restore counters
    if (weldingState) {
      (this.weldingService as any).currentWeldNumber = weldingState.currentWeldNumber || 1;
      (this.weldingService as any).currentFluidNumber = weldingState.currentFluidNumber || 1;
    }
    
    // Clear and reconstruct weld stamps array
    (this.weldingService as any).weldStamps = [];
    
    const objects = this.canvas.getObjects();
    objects.forEach(obj => {
      if (obj.type === 'group' && (obj as any).data) {
        const data = (obj as any).data;
        if (data.type === 'weldstamp' || data.type === 'welderstamp' || 
            data.type === 'fluidstamp') {
          // Re-add event handlers
          this.reattachWeldingHandlers(obj as fabric.Group);
        }
      }
    });
  }
  
  /**
   * Reconstruct dimension service state
   */
  private reconstructDimensionService(): void {
    // Dimensions will reconstruct themselves from canvas objects
    // The dimension service maintains its own internal array
  }
  
  /**
   * Re-establish connections and event handlers
   */
  private reestablishConnections(): void {
    if (!this.canvas) return;
    
    this.canvas.getObjects().forEach(obj => {
      // Re-establish dimension text editing handlers
      if ((obj as any).customType === 'dimensionText') {
        this.reattachDimensionHandlers(obj as fabric.IText);
      }
      
      // Re-establish welding group handlers
      if (obj.type === 'group' && (obj as any).data) {
        this.reattachWeldingHandlers(obj as fabric.Group);
      }
    });
  }
  
  /**
   * Reattach dimension handlers
   */
  private reattachDimensionHandlers(text: fabric.IText): void {
    text.on('editing:exited', () => {
      text.set({
        lockMovementX: true,
        lockMovementY: true
      });
      this.canvas?.renderAll();
    });
  }
  
  /**
   * Reattach welding handlers
   */
  private reattachWeldingHandlers(group: fabric.Group): void {
    group.on('mousedblclick', () => {
      const data = (group as any).data;
      if (data.type === 'weldstamp' || data.type === 'welderstamp') {
        (this.weldingService as any).editWeldNumber(group);
      } else if (data.type === 'welderstampas') {
        (this.weldingService as any).editWelderStampAS(group);
      } else if (data.type === 'fluidstamp') {
        (this.weldingService as any).editFluidNumber(group);
      }
    });
  }
  
  /**
   * Clear all states
   */
  public clearStates(): void {
    this.states = [];
    this.currentStateIndex = -1;
  }

  /**
   * Clear history (alias for clearStates)
   */
  public clearHistory(): void {
    this.clearStates();
  }
}