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
import { StateManagementService } from '../../services/state-management.service';

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

  constructor(
    private drawingService: DrawingService,
    private lineDrawingService: LineDrawingService,
    private dimensionService: DimensionService,
    private weldingService: WeldingService,
    private stateManagement: StateManagementService
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
        this.stateManagement.executeOperation('Delete Objects', () => {
          this.drawingService.deleteSelectedObjects();
        });
      } else if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        this.stateManagement.undo();
      } else if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        this.stateManagement.redo();
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
      this.stateManagement.setCanvas(this.canvas);
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
        } else if (target) {
          this.stateManagement.executeOperation('Edit Text', () => {
            // Text edit already completed
          });
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
        } else if (!((obj as any).isDimensionPart)) {
          // Only save state for non-dimension object modifications
          this.stateManagement.executeOperation('Modify Object', () => {
            // Modification already completed
          });
        }
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
        this.stateManagement.saveState('Initial State');
      }, 100);
    } else {
      console.error('Canvas element not found!');
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
