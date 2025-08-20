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
import { ZoomPanService } from '../../services/zoom-pan.service';
import { GridService } from '../../services/grid.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';

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
  private _resizeHandler: () => void;
  private redrawSubscription!: Subscription;
  private subscriptions = new Subscription();

  public zoomLevel = 100;
  public isPanning = false;
  public gridEnabled = false;
  public gridSize = 20;

  constructor(
    private drawingService: DrawingService,
    private lineDrawingService: LineDrawingService,
    private dimensionService: DimensionService,
    private weldingService: WeldingService,
    private stateManagement: StateManagementService,
    public zoomPanService: ZoomPanService,
    public gridService: GridService,
    private keyboardShortcutsService: KeyboardShortcutsService
  ) {
    this._resizeHandler = () => {}; // Will be initialized in ngAfterViewInit
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
      } else if (event.key === 'g' || event.key === 'G') {
        // Toggle grid with G key
        this.gridService.toggleGrid();
      } else if (event.key === '+' || event.key === '=') {
        // Zoom in with + key
        this.zoomPanService.zoomIn();
      } else if (event.key === '-' || event.key === '_') {
        // Zoom out with - key
        this.zoomPanService.zoomOut();
      } else if (event.key === '0' && event.ctrlKey) {
        // Reset zoom with Ctrl+0
        event.preventDefault();
        this.zoomPanService.resetZoom();
      } else if (event.key === 'f' || event.key === 'F') {
        // Fit to screen with F key
        this.zoomPanService.zoomToFit();
      } else if (event.key === 'l' || event.key === 'L') {
        // Line drawing mode with L key
        this.drawingService.setDrawingMode('addLine');
      } else if (event.key === 'p' || event.key === 'P') {
        // Pipe drawing mode with P key  
        this.drawingService.setDrawingMode('addPipe');
      } else if (event.key === 'd' || event.key === 'D') {
        // ISO Dimension mode with D key
        this.drawingService.startIsoDimensioning();
      } else if (event.key === 't' || event.key === 'T') {
        // Text mode with T key
        this.drawingService.setDrawingMode('text');
      } else if (event.altKey && event.key === '1') {
        // Drawing color mode with Alt+1
        event.preventDefault();
        this.drawingService.setColorMode('drawing');
      } else if (event.altKey && event.key === '2') {
        // Black/White mode with Alt+2
        event.preventDefault();
        this.drawingService.setColorMode('blackwhite');
      } else if (event.altKey && event.key === '3') {
        // Norm color mode with Alt+3
        event.preventDefault();
        this.drawingService.setColorMode('norm');
      }
    };
  }

  ngOnInit(): void {
    document.addEventListener('keydown', this._keyDownHandler);
    
    // Subscribe to viewport changes
    this.subscriptions.add(
      this.zoomPanService.viewportState.subscribe(state => {
        this.zoomLevel = Math.round(state.zoom * 100);
      })
    );
    
    // Subscribe to pan state
    this.subscriptions.add(
      this.zoomPanService.panState.subscribe((isPanning: boolean) => {
        this.isPanning = isPanning;
      })
    );
    
    // Subscribe to grid state
    this.subscriptions.add(
      this.gridService.gridState.subscribe(state => {
        this.gridEnabled = state.enabled;
        this.gridSize = state.size;
      })
    );
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this._keyDownHandler);
    window.removeEventListener('resize', this._resizeHandler);
    this.subscriptions.unsubscribe();
    this.redrawSubscription?.unsubscribe();
    this.canvas?.dispose(); // Clean up canvas resources
  }

  ngAfterViewInit(): void {
    if (this.htmlCanvas) {
      // Get the actual container dimensions
      const container = this.htmlCanvas.nativeElement.parentElement;
      const width = container?.clientWidth || window.innerWidth - 260;
      const height = container?.clientHeight || window.innerHeight - 60;
      
      this.canvas = new fabric.Canvas(this.htmlCanvas.nativeElement, {
        selection: true,
        width: width,
        height: height,
        backgroundColor: '#f3f3f3',
        perPixelTargetFind: true,   // Enable globally for better line selection
        targetFindTolerance: 5,     // Global tolerance for selection
        renderOnAddRemove: true,
        skipTargetFind: false,
      });
      
      // Resize canvas when window resizes
      this._resizeHandler = () => {
        const newWidth = container?.clientWidth || window.innerWidth - 260;
        const newHeight = container?.clientHeight || window.innerHeight - 60;
        this.canvas.setDimensions({
          width: newWidth,
          height: newHeight
        });
        this.canvas.requestRenderAll();
      };
      window.addEventListener('resize', this._resizeHandler);
      this.drawingService.setCanvas(this.canvas);
      this.stateManagement.setCanvas(this.canvas);
      
      // Initialize zoom-pan service
      this.zoomPanService.initializeCanvas(this.canvas);
      
      // Initialize grid service
      this.gridService.initializeCanvas(this.canvas);
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
