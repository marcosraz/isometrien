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
import { TouchEventService } from '../../services/touch-event.service';
import { PlatformDetectionService, DeviceType } from '../../services/platform-detection.service';

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
  private _resizeHandler: () => void;
  private redrawSubscription!: Subscription;
  private subscriptions = new Subscription();

  public zoomLevel = 100;
  public isPanning = false;
  public gridEnabled = false;
  public gridSize = 20;
  public deviceType: DeviceType = 'desktop';
  public isPhone = false;
  public isTablet = false;

  constructor(
    private drawingService: DrawingService,
    private lineDrawingService: LineDrawingService,
    private dimensionService: DimensionService,
    private weldingService: WeldingService,
    private stateManagement: StateManagementService,
    public zoomPanService: ZoomPanService,
    public gridService: GridService,
    private keyboardShortcutsService: KeyboardShortcutsService,
    private touchEventService: TouchEventService,
    private platformService: PlatformDetectionService
  ) {
    this._resizeHandler = () => {}; // Will be initialized in ngAfterViewInit
  }

  ngOnInit(): void {
    // Note: KeyboardShortcutsService will be enabled after canvas initialization in ngAfterViewInit

    // Subscribe to device type changes
    this.subscriptions.add(
      this.platformService.deviceType$.subscribe(deviceType => {
        this.deviceType = deviceType;
        this.isPhone = deviceType === 'phone';
        this.isTablet = deviceType === 'tablet';

        // Resize canvas when device type changes
        if (this.canvas) {
          this.resizeCanvas();
        }
      })
    );

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
    // Disable keyboard shortcuts service when component is destroyed
    this.keyboardShortcutsService.disable();
    // Clean up touch event service
    this.touchEventService.destroy();
    window.removeEventListener('resize', this._resizeHandler);
    this.subscriptions.unsubscribe();
    this.redrawSubscription?.unsubscribe();
    this.canvas?.dispose(); // Clean up canvas resources
  }

  ngAfterViewInit(): void {
    if (this.htmlCanvas) {
      // Get initial device type
      this.deviceType = this.platformService.getDeviceType();
      this.isPhone = this.deviceType === 'phone';
      this.isTablet = this.deviceType === 'tablet';

      // Calculate initial canvas dimensions based on device type
      const dimensions = this.getCanvasDimensions();

      this.canvas = new fabric.Canvas(this.htmlCanvas.nativeElement, {
        selection: true,
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: '#f3f3f3',
        perPixelTargetFind: true,   // Enable globally for better line selection
        targetFindTolerance: 15,     // Increased global tolerance for easier selection
        renderOnAddRemove: true,
        skipTargetFind: false,
      });

      console.log('Canvas created:', !!this.canvas);

      // Resize canvas when window resizes or orientation changes
      this._resizeHandler = () => {
        this.resizeCanvas();
      };
      window.addEventListener('resize', this._resizeHandler);
      
      console.log('About to set canvas in DrawingService, canvas exists:', !!this.canvas);
      this.drawingService.setCanvas(this.canvas);
      this.stateManagement.setCanvas(this.canvas);
      
      // Initialize zoom-pan service
      this.zoomPanService.initializeCanvas(this.canvas);
      
      // Initialize grid service
      this.gridService.initializeCanvas(this.canvas);

      // Initialize touch event service for mobile support
      this.touchEventService.initializeTouchEvents(this.canvas);
      console.log('TouchEventService initialized for mobile support');

      // Enable keyboard shortcuts AFTER canvas is initialized
      // The service will now handle canvas availability checks internally
      this.keyboardShortcutsService.enable();
      console.log('KeyboardShortcutsService enabled after canvas initialization');
      
      this.canvas.on('mouse:down', (options) => {
        this.drawingService.handleMouseDown(options);
      });
      this.canvas.on('mouse:move', (options) => {
        this.drawingService.handleMouseMove(options);
      });
      this.canvas.on('mouse:up', (options) => {
        this.drawingService.handleMouseUp(options);
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
          // Aktualisiere finale Positionen für T-Stücke und Ventile mit Ankerpunkten
          if (obj && (obj as any).customType) {
            const customObjType = (obj as any).customType;
            if (customObjType === 'teeJoint' || customObjType === 'gateValveS' || customObjType === 'gateValveFL') {
              // Ankerpunkte werden automatisch mit der Komponente bewegt
              // Keine zusätzliche Aktualisierung erforderlich
            }
          }
          
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

  /**
   * Calculate canvas dimensions based on device type
   * - Phone: Full width, minus bottom navigation (60px) and top bar (60px)
   * - Tablet: Full width minus side navigation (80px), full height minus top bar (60px)
   * - Desktop: Full width minus sidebar (260px), full height minus top bar (60px)
   */
  private getCanvasDimensions(): { width: number; height: number } {
    const container = this.htmlCanvas.nativeElement.parentElement;
    const topBarHeight = 60; // Top toolbar height

    switch (this.deviceType) {
      case 'phone':
        // Full width, account for top bar and bottom mobile nav
        const bottomNavHeight = 60;
        return {
          width: container?.clientWidth || window.innerWidth,
          height: (container?.clientHeight || window.innerHeight) - topBarHeight - bottomNavHeight
        };

      case 'tablet':
        // Full width minus side navigation, full height minus top bar
        const tabletSideNavWidth = 80;
        return {
          width: (container?.clientWidth || window.innerWidth) - tabletSideNavWidth,
          height: (container?.clientHeight || window.innerHeight) - topBarHeight
        };

      case 'desktop':
      default:
        // Standard desktop layout with left sidebar
        const desktopSidebarWidth = 260;
        return {
          width: (container?.clientWidth || window.innerWidth) - desktopSidebarWidth,
          height: (container?.clientHeight || window.innerHeight) - topBarHeight
        };
    }
  }

  /**
   * Resize canvas to fit current device dimensions
   */
  private resizeCanvas(): void {
    if (!this.canvas) return;

    const dimensions = this.getCanvasDimensions();
    this.canvas.setDimensions({
      width: dimensions.width,
      height: dimensions.height
    });
    this.canvas.requestRenderAll();
  }
}
