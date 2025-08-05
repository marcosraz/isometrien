import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as fabric from 'fabric';
import { Subscription } from 'rxjs';
import { DrawingService } from '../../services/drawing.service';
import { LineDrawingService } from '../../services/line-drawing.service';
import { DimensionService } from '../../services/dimension.service';
import { WeldingService } from '../../services/welding.service';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
})
export class CanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('htmlCanvas') htmlCanvas!: ElementRef<HTMLCanvasElement>;
  private canvas!: fabric.Canvas;
  private _keyDownHandler: (event: KeyboardEvent) => void;
  private redrawSubscription!: Subscription;
  private canvasStates: string[] = [];
  private currentStateIndex: number = -1;
  private isRedoing: boolean = false;

  constructor(
    private drawingService: DrawingService,
    private lineDrawingService: LineDrawingService,
    private dimensionService: DimensionService,
    private weldingService: WeldingService
  ) {
    this._keyDownHandler = (event: KeyboardEvent) => {
      const activeObject = this.canvas?.getActiveObject();

      // Check if text is being edited (either directly or within a group)
      let isTextEditing = false;
      if (activeObject) {
        if (activeObject.type === 'i-text' && (activeObject as fabric.IText).isEditing) {
          isTextEditing = true;
        } else if (activeObject.type === 'group') {
          // Check if any text object within the group is being edited
          const group = activeObject as fabric.Group;
          group.forEachObject((obj: fabric.Object) => {
            if (obj.type === 'i-text' && (obj as fabric.IText).isEditing) {
              isTextEditing = true;
            }
          });
        }
      }

      if (isTextEditing) {
        if (event.key === 'Backspace' || event.key === 'Delete') {
          // Prevent the event from bubbling up to the global handler
          event.stopPropagation();
        }
        return;
      }

      if (event.key === 'Escape') {
        this.drawingService.cancelDrawing();
        this.weldingService.handleKeyDown(event);
        // Stelle sicher, dass Ankerpunkte nach ESC sichtbar bleiben
        this.dimensionService.ensureAnchorsAlwaysVisible(this.canvas);
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        this.drawingService.deleteSelectedObjects();
        this.saveCanvasState();
      } else if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        this.undo();
      } else if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        this.redo();
      }
    };
  }

  ngOnInit(): void {
    document.addEventListener('keydown', this._keyDownHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this._keyDownHandler);
    this.redrawSubscription?.unsubscribe();
    this.canvas?.dispose(); // Clean up canvas resources
  }

  ngAfterViewInit(): void {
    if (this.htmlCanvas) {
      this.canvas = new fabric.Canvas(this.htmlCanvas.nativeElement, {
        selection: true,
        width: 1200,
        height: 800,
        backgroundColor: '#f3f3f3',
      });
      this.drawingService.setCanvas(this.canvas);
      this.canvas.on('mouse:down', (options) => {
        this.drawingService.handleMouseDown(options);
      });
      this.canvas.on('mouse:move', (options) => {
        this.drawingService.handleMouseMove(options);
      });
      this.canvas.on('mouse:dblclick', (options) => {
        this.drawingService.handleDoubleClick(
          options as fabric.TEvent<MouseEvent>
        );
      });

      this.canvas.on('text:editing:exited', ({ target }) => {
        if (target && target.text?.trim() === '') {
          this.canvas.remove(target);
        }
        this.saveCanvasState();
      });

      // Save state after objects are added
      this.canvas.on('path:created', () => {
        this.saveCanvasState();
      });
      
      this.canvas.on('object:added', () => {
        if (!this.isRedoing) {
          setTimeout(() => {
            this.saveCanvasState();
            // Stelle sicher, dass Ankerpunkte immer sichtbar sind
            this.dimensionService.ensureAnchorsAlwaysVisible(this.canvas);
          }, 100);
        }
      });
      
      this.canvas.on('object:removed', () => {
        if (!this.isRedoing) {
          this.saveCanvasState();
        }
      });
      
      this.canvas.on('object:modified', (e) => {
        // Stelle sicher, dass Dimension-Teile ihre Lock-Eigenschaften behalten
        const obj = e.target;
        if (obj && (obj as any).isDimensionPart) {
          if (obj.type === 'i-text') {
            obj.set({
              lockMovementX: true,
              lockMovementY: true,
              hasControls: false
            });
          } else if (obj.type === 'line' || obj.type === 'path') {
            obj.set({
              selectable: false,
              evented: false,
              lockMovementX: true,
              lockMovementY: true,
              hasControls: false,
              hasBorders: false
            });
          }
          this.canvas.requestRenderAll();
        }
        this.saveCanvasState();
      });

      this.canvas.on('selection:created', (e) =>
        this.drawingService.handleSelectionCreated(e)
      );
      this.canvas.on('selection:updated', (e) =>
        this.drawingService.handleSelectionCreated(e)
      );
      this.canvas.on('selection:cleared', () =>
        this.drawingService.handleSelectionCleared()
      );

      this.canvas.on('object:moving', (e) => {
        this.drawingService.handleObjectMoving(e);
      });
      
      // Add double-click functionality
      this.setupDoubleClick();
      
      // Stelle sicher, dass Ankerpunkte nach jedem Render sichtbar sind
      this.canvas.on('after:render', () => {
        this.dimensionService.ensureAnchorsAlwaysVisible(this.canvas);
      });

      this.redrawSubscription = this.drawingService.redraw$.subscribe(() => {
        if (this.canvas) {
          this.canvas.requestRenderAll();
        }
      });

      // Save initial canvas state
      setTimeout(() => {
        this.saveCanvasState();
      }, 100);
    } else {
      console.error('Canvas element not found!');
    }
  }

  private saveCanvasState(): void {
    if (this.isRedoing) return;
    
    // Speichere nur wenn Canvas Objekte hat
    if (this.canvas.getObjects().length === 0 && this.canvasStates.length > 0) {
      return; // Verhindere leere States
    }
    
    // Speichere custom properties mit
    const canvasJson = JSON.stringify(this.canvas.toJSON());
    
    // Remove any states after the current index
    this.canvasStates = this.canvasStates.slice(0, this.currentStateIndex + 1);
    
    // Add the new state
    this.canvasStates.push(canvasJson);
    this.currentStateIndex++;
    
    // Limit the number of states to prevent memory issues
    const maxStates = 50;
    if (this.canvasStates.length > maxStates) {
      this.canvasStates.shift();
      this.currentStateIndex--;
    }
  }

  private undo(): void {
    console.log('Undo called, currentIndex:', this.currentStateIndex, 'states:', this.canvasStates.length);
    if (this.currentStateIndex > 0) {
      this.currentStateIndex--;
      this.isRedoing = true;
      console.log('Loading state at index:', this.currentStateIndex);
      this.loadCanvasState(this.canvasStates[this.currentStateIndex]);
    }
  }

  private redo(): void {
    if (this.currentStateIndex < this.canvasStates.length - 1) {
      this.currentStateIndex++;
      this.isRedoing = true;
      this.loadCanvasState(this.canvasStates[this.currentStateIndex]);
    }
  }

  private loadCanvasState(state: string): void {
    try {
      const parsedState = JSON.parse(state);
      
      this.canvas.loadFromJSON(parsedState, () => {
        this.canvas.renderAll();
        this.isRedoing = false;
        
        // Stelle sicher, dass custom properties erhalten bleiben
        this.canvas.getObjects().forEach((obj) => {
          // Wiederherstellen von custom properties aus dem gespeicherten Zustand
          const savedObj = parsedState.objects.find((o: any) => 
            o.left === obj.left && o.top === obj.top && o.type === obj.type
          );
          
          if (savedObj) {
            // Kopiere custom properties zurück
            (obj as any).customType = savedObj.customType;
            (obj as any).isDimensionPart = savedObj.isDimensionPart;
            (obj as any).dimensionId = savedObj.dimensionId;
          }
          
          // Für Ankerpunkte
          if (obj.type === 'circle' && (obj.fill === 'red' || obj.fill === 'blue')) {
            obj.set({
              selectable: true,
              evented: true,
              visible: true
            });
            (obj as any).customType = 'anchorPoint';
          }
          
          // Für Dimensionen
          if ((obj as any).isDimensionPart) {
            this.reestablishDimensionHandlers(obj);
          }
        });
      });
    } catch (error) {
      console.error('Error loading canvas state:', error);
    }
  }
  
  private reconstructServiceStates(): void {
    // Rekonstruiere EditablePipes
    const pipes: any[] = [];
    const lines: any[] = [];
    
    // Sammle alle Objekte nach Typ
    const objects = this.canvas.getObjects();
    
    // Hier könnten wir die Pipes und Lines rekonstruieren
    // Für jetzt setzen wir nur die Ankerpunkte richtig
    objects.forEach(obj => {
      if ((obj as any).customType === 'anchorPoint') {
        obj.set({
          selectable: true,
          evented: true
        });
      }
    });
  }

  private reestablishDimensionHandlers(obj: fabric.Object): void {
    // Re-establish handlers für Dimension-Objekte
    if ((obj as any).customType === 'dimensionText') {
      // Text bleibt editierbar
      obj.set({
        editable: true,
        lockMovementX: true,
        lockMovementY: true
      });
    } else if ((obj as any).customType === 'dimensionControl') {
      // Control Button
      obj.set({
        selectable: true,
        evented: true
      });
    } else if ((obj as any).isDimensionPart && obj.type !== 'i-text') {
      // Andere Dimension-Teile
      obj.set({
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true
      });
    }
  }
  
  private setupDoubleClick(): void {
    let lastClickTime = 0;
    let lastClickObject: fabric.Object | null = null;
    
    this.canvas.on('mouse:down', (options) => {
      const currentTime = Date.now();
      const target = options.target;
      
      if (target && target === lastClickObject && currentTime - lastClickTime < 500) {
        // Double click detected
        target.fire('mousedblclick', options);
        lastClickObject = null;
      } else {
        lastClickObject = target || null;
      }
      
      lastClickTime = currentTime;
    });
  }
}
