import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { IsometryService } from './isometry.service';
import { LineDrawingService } from './line-drawing.service';
import { DimensionService } from './dimension.service';
import { ObjectManagementService } from './object-management.service';
import { WeldingService } from './welding.service';
import { StateManagementService } from './state-management.service';
import { PipingService } from './piping.service';
import { IsometryToolsService } from './isometry-tools.service';
import { FreehandDrawingService } from './freehand-drawing.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DrawingService {
  private redrawRequest = new BehaviorSubject<void>(undefined);
  redraw$ = this.redrawRequest.asObservable();
  private canvas!: fabric.Canvas;
  
  // Color mode management
  public colorMode: 'drawing' | 'blackwhite' | 'norm' = 'drawing';
  
  // Color schemes for different modes
  private colorSchemes = {
    drawing: {
      line: 'black',
      pipe: 'green',
      dimension: 'blue',
      text: 'black',
      weld: 'red',
      anchor: 'rgba(128, 128, 128, 0.5)',
      valve: '#2563eb'
    },
    blackwhite: {
      line: 'black',
      pipe: 'black',
      dimension: 'black',
      text: 'black',
      weld: 'black',
      anchor: 'rgba(0, 0, 0, 0.5)',
      valve: 'black'
    },
    norm: {
      // DIN ISO 6412-2 standard colors for isometric piping
      line: '#000000',      // Black for general lines
      pipe: '#00A050',      // Green for process pipes
      dimension: '#0000FF', // Blue for dimensions
      text: '#000000',      // Black for text
      weld: '#FF0000',      // Red for welds
      anchor: 'rgba(128, 128, 128, 0.3)',
      valve: '#800080'      // Purple for valves
    }
  };

  constructor(
    private isometryService: IsometryService,
    private lineDrawingService: LineDrawingService,
    public dimensionService: DimensionService,
    private objectManagementService: ObjectManagementService,
    private weldingService: WeldingService,
    private stateManagementService: StateManagementService,
    private pipingService: PipingService,
    private isometryToolsService: IsometryToolsService,
    public freehandDrawingService: FreehandDrawingService
  ) {
    // Connect state management to services
    this.lineDrawingService.setStateManagement(this.stateManagementService);
    this.dimensionService.setStateManagement(this.stateManagementService);
    this.weldingService.setStateManagement(this.stateManagementService);
    this.objectManagementService.setStateManagement(this.stateManagementService);
    this.pipingService.setStateManagement(this.stateManagementService);
    this.isometryToolsService.setStateManagement(this.stateManagementService);
    this.freehandDrawingService.setStateManagement(this.stateManagementService);
    
    // Connect drawing service for color management
    this.lineDrawingService.setDrawingService(this);
    this.isometryToolsService.setDrawingService(this);
  }

  public setCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
    this.lineDrawingService.setCanvas(canvas);
    this.weldingService.setCanvas(canvas);
    this.pipingService.setCanvas(canvas);
    this.isometryToolsService.setCanvas(canvas);
    this.freehandDrawingService.setCanvas(canvas);
  }

  public requestRedraw(): void {
    this.redrawRequest.next();
  }

  public getCanvas(): fabric.Canvas {
    return this.canvas;
  }

  public isEditingText(): boolean {
    return this.objectManagementService.isEditingText(this.canvas);
  }

  public isTextEditingInGroup(): boolean {
    const activeObject = this.canvas?.getActiveObject();
    if (activeObject && activeObject.type === 'group') {
      const group = activeObject as fabric.Group;
      let isEditing = false;
      group.forEachObject((obj: fabric.Object) => {
        if (obj.type === 'i-text' && (obj as fabric.IText).isEditing) {
          isEditing = true;
        }
      });
      return isEditing;
    }
    return false;
  }

  public startDimensioning(): void {
    this.lineDrawingService.setDrawingMode('dimension');
    this.dimensionService.startDimensioning();
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();

    // Prepare dimensionable anchors from editable pipes and lines
    const editablePipes = this.lineDrawingService.getEditablePipes();
    const editableLines = this.lineDrawingService.getEditableLines();
    this.dimensionService.prepareDimensionableAnchors(this.canvas, editablePipes, editableLines);
    
    // Stelle sicher, dass alle Ankerpunkte sichtbar bleiben
    this.dimensionService.ensureAnchorsAlwaysVisible(this.canvas);
  }
  
  public startIsoDimensioning(): void {
    this.lineDrawingService.setDrawingMode('dimension');
    this.dimensionService.startIsoDimensioning();
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();

    // Prepare dimensionable anchors from editable pipes and lines
    const editablePipes = this.lineDrawingService.getEditablePipes();
    const editableLines = this.lineDrawingService.getEditableLines();
    this.dimensionService.prepareDimensionableAnchors(this.canvas, editablePipes, editableLines);
    
    // Stelle sicher, dass alle Ankerpunkte sichtbar bleiben
    this.dimensionService.ensureAnchorsAlwaysVisible(this.canvas);
  }

  public startTextMode(): void {
    this.lineDrawingService.setDrawingMode('text');
  }

  public setDrawingMode(
    mode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'weldstamp' | 'welderstamp' | 'welderstampempty' | 'welderstampas' | 'weld' | 'fluidstamp' | 'spool' | 'flow' | 'gateValve' | 'gateValveS' | 'gateValveFL' | 'globeValveS' | 'globeValveFL' | 'ballValveS' | 'ballValveFL' | 'slope' | 'freehand'
  ): void {
    // Stop dimension mode if it was active and we're switching to a different mode
    if (this.lineDrawingService.drawingMode === 'dimension' && mode !== 'dimension') {
      this.dimensionService.resetAnchorHighlights(this.canvas);
      this.dimensionService.stopDimensioning();
    }
    
    if (mode === 'weldstamp') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startWeldstamp();
    } else if (mode === 'welderstamp') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startWelderStamp();
    } else if (mode === 'welderstampempty') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startWelderStampEmpty();
    } else if (mode === 'welderstampas') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startWelderStampAS();
    } else if (mode === 'weld') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startWeld();
    } else if (mode === 'fluidstamp') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startFluidStamp();
    } else if (mode === 'spool') {
      this.lineDrawingService.setDrawingMode('spool');
      this.objectManagementService.startSpoolMode();
    } else if (mode === 'flow') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startFlowMode();
    } else if (mode === 'gateValve') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startGateValveMode();
    } else if (mode === 'gateValveS') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startGateValveSMode();
    } else if (mode === 'gateValveFL') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startGateValveFLMode();
    } else if (mode === 'globeValveS') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startGlobeValveSMode();
    } else if (mode === 'globeValveFL') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startGlobeValveFLMode();
    } else if (mode === 'ballValveS') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startBallValveSMode();
    } else if (mode === 'ballValveFL') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startBallValveFLMode();
    } else if (mode === 'slope') {
      this.lineDrawingService.setDrawingMode('idle');
      this.isometryToolsService.startSlopeMode();
    } else if (mode === 'freehand') {
      this.lineDrawingService.setDrawingMode('idle');
      this.freehandDrawingService.startFreehandDrawing();
    } else {
      this.weldingService.stopWeldstamp();
      this.weldingService.stopWelderStamp();
      this.weldingService.stopWelderStampEmpty();
      this.weldingService.stopWelderStampAS();
      this.weldingService.stopWeld();
      this.weldingService.stopFluidStamp();
      this.objectManagementService.stopSpoolMode();
      this.pipingService.stopFlowMode();
      this.pipingService.stopGateValveMode();
      this.pipingService.stopGateValveSMode();
      this.pipingService.stopGateValveFLMode();
      this.pipingService.stopGlobeValveSMode();
      this.pipingService.stopGlobeValveFLMode();
      this.pipingService.stopBallValveSMode();
      this.pipingService.stopBallValveFLMode();
      this.isometryToolsService.stopSlopeMode();
      this.freehandDrawingService.stopFreehandDrawing();
      this.lineDrawingService.setDrawingMode(mode);
    }
  }

  public handleMouseDown(options: any): void {
    if (this.weldingService.isActive()) {
      this.weldingService.handleMouseDown(options);
      return;
    }

    if (this.pipingService.isActive()) {
      this.pipingService.handleMouseDown(options);
      return;
    }
    
    if (this.isometryToolsService.isSlopeModeActive()) {
      this.isometryToolsService.handleMouseDown(this.canvas, options);
      return;
    }

    // Check if freehand mode is active
    if (this.freehandDrawingService && this.freehandDrawingService.isActive()) {
      // Freehand drawing is handled separately by its own service
      return;
    }

    const drawingMode = this.lineDrawingService.drawingMode;

    if (drawingMode === 'dimension') {
      const editablePipes = this.lineDrawingService.getEditablePipes();
      const editableLines = this.lineDrawingService.getEditableLines();
      this.dimensionService.handleDimensionMouseDown(this.canvas, options, editablePipes, editableLines);
      return;
    }

    if (drawingMode === 'text') {
      this.objectManagementService.addText(this.canvas, options);
      this.lineDrawingService.setDrawingMode('idle');
      return;
    }

    if (drawingMode === 'spool') {
      this.objectManagementService.addSpoolText(this.canvas, options);
      return;
    }

    this.lineDrawingService.handleLineMouseDown(this.canvas, options);
    this.lineDrawingService.handlePipeMouseDown(this.canvas, options);
  }

  public handleMouseMove(options: any): void {
    if (this.weldingService.isActive()) {
      this.weldingService.handleMouseMove(options);
      return;
    }

    if (this.pipingService.isActive()) {
      this.pipingService.handleMouseMove(options);
      return;
    }
    
    if (this.isometryToolsService.isSlopeModeActive()) {
      this.isometryToolsService.handleMouseMove(this.canvas, options);
      return;
    }

    // Check if freehand mode is active
    if (this.freehandDrawingService && this.freehandDrawingService.isActive()) {
      // Freehand drawing is handled separately by its own service
      return;
    }

    const drawingMode = this.lineDrawingService.drawingMode;

    if (drawingMode === 'dimension') {
      this.dimensionService.handleDimensionMouseMove(this.canvas, options);
      return;
    }

    this.lineDrawingService.handleLineMouseMove(this.canvas, options);
    this.lineDrawingService.handlePipeMouseMove(this.canvas, options);
    this.canvas.requestRenderAll();
  }

  public handleDoubleClick(options: fabric.TEvent<MouseEvent>): void {
    this.lineDrawingService.handlePipeDoubleClick(this.canvas, options);
    
    // Prüfe, ob ein Bemaßungstext oder Gefälle-Text doppelgeklickt wurde
    const target = (options as any).target;
    if (target) {
      // Prüfe direkt auf Bemaßungstext oder Gefälle-Text
      if (target.type === 'i-text' && ((target as any).customType === 'dimensionText' || (target as any).customType === 'slopeText')) {
        const textObject = target as fabric.IText;
        // Aktiviere den Text zum Bearbeiten
        this.canvas.setActiveObject(textObject);
        textObject.enterEditing();
        textObject.selectAll();
      }
      // Prüfe auch Gruppen für Gefälle-Marker - Bearbeite Text direkt ohne Entgruppierung
      else if (target.type === 'group' && (target as any).customType === 'slopeMarker') {
        // Zeige Dialog zum Bearbeiten des Gefälle-Werts
        const currentValue = (target as any).slopeData?.percent || '0.50';
        const newValue = prompt('Gefälle in % ändern:', currentValue);
        
        if (newValue !== null && newValue !== currentValue) {
          // Aktualisiere den Text in der Gruppe
          const group = target as fabric.Group;
          const objects = group.getObjects();
          const textObj = objects.find((obj: any) => obj.type === 'i-text' && obj.customType === 'slopeText');
          
          if (textObj) {
            (textObj as fabric.IText).set('text', `Gefälle ${newValue}%`);
            (target as any).slopeData.percent = newValue;
            this.canvas.requestRenderAll();
          }
        }
      }
    }
  }

  public handleSelectionCreated(e: any): void {
    // Handle selection events if needed
  }

  public handleSelectionCleared(): void {
    // Handle selection cleared events if needed
  }

  public handleObjectMoving(e: any) {
    this.lineDrawingService.handleObjectMoving(this.canvas, e);
  }

  public cancelDrawing(): void {
    this.lineDrawingService.cancelDrawing(this.canvas);
    // Stop dimension mode if active
    if (this.dimensionService.getDimensionStep()) {
      this.dimensionService.resetAnchorHighlights(this.canvas);
      this.dimensionService.stopDimensioning();
      this.dimensionService.clearTemporaryDimensionAnchors(this.canvas);
    }
  }

  public groupSelectedObjects(): void {
    this.objectManagementService.groupSelectedObjects(this.canvas);
  }

  public ungroupObjects(): void {
    this.objectManagementService.ungroupObjects(this.canvas);
  }

  public deleteSelectedObjects(): void {
    this.objectManagementService.deleteSelectedObjects(this.canvas);
  }


  public addAnchors(): void {
    this.setDrawingMode('addAnchors');
  }

  // Getter for drawing mode to maintain compatibility
  public get drawingMode(): 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'weldstamp' | 'welderstamp' | 'welderstampempty' | 'welderstampas' | 'weld' | 'fluidstamp' | 'spool' | 'flow' | 'gateValve' | 'gateValveS' | 'gateValveFL' | 'globeValveS' | 'globeValveFL' | 'ballValveS' | 'ballValveFL' | 'slope' | 'freehand' {
    const weldingMode = this.weldingService.getActiveMode();
    if (weldingMode) {
      return weldingMode;
    }
    if (this.pipingService.isFlowModeActive()) {
      return 'flow';
    }
    if (this.pipingService.isGateValveModeActive()) {
      return 'gateValve';
    }
    if (this.pipingService.isGateValveSModeActive()) {
      return 'gateValveS';
    }
    if (this.pipingService.isGateValveFLModeActive()) {
      return 'gateValveFL';
    }
    if (this.pipingService.isGlobeValveSModeActive()) {
      return 'globeValveS';
    }
    if (this.pipingService.isGlobeValveFLModeActive()) {
      return 'globeValveFL';
    }
    if (this.pipingService.isBallValveSModeActive()) {
      return 'ballValveS';
    }
    if (this.pipingService.isBallValveFLModeActive()) {
      return 'ballValveFL';
    }
    if (this.isometryToolsService.isSlopeModeActive()) {
      return 'slope';
    }
    if (this.freehandDrawingService && this.freehandDrawingService.isActive()) {
      return 'freehand';
    }
    return this.lineDrawingService.drawingMode;
  }

  public set drawingMode(mode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'weldstamp' | 'welderstamp' | 'welderstampempty' | 'welderstampas' | 'weld' | 'fluidstamp' | 'spool' | 'flow' | 'gateValve' | 'gateValveS' | 'gateValveFL' | 'globeValveS' | 'globeValveFL' | 'ballValveS' | 'ballValveFL' | 'slope' | 'freehand') {
    if (mode === 'weldstamp') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startWeldstamp();
    } else if (mode === 'welderstamp') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startWelderStamp();
    } else if (mode === 'welderstampempty') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startWelderStampEmpty();
    } else if (mode === 'welderstampas') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startWelderStampAS();
    } else if (mode === 'weld') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startWeld();
    } else if (mode === 'fluidstamp') {
      this.lineDrawingService.setDrawingMode('idle');
      this.weldingService.startFluidStamp();
    } else if (mode === 'flow') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startFlowMode();
    } else if (mode === 'gateValve') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startGateValveMode();
    } else if (mode === 'gateValveS') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startGateValveSMode();
    } else if (mode === 'gateValveFL') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startGateValveFLMode();
    } else if (mode === 'globeValveS') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startGlobeValveSMode();
    } else if (mode === 'globeValveFL') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startGlobeValveFLMode();
    } else if (mode === 'ballValveS') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startBallValveSMode();
    } else if (mode === 'ballValveFL') {
      this.lineDrawingService.setDrawingMode('idle');
      this.pipingService.startBallValveFLMode();
    } else if (mode === 'slope') {
      this.lineDrawingService.setDrawingMode('idle');
      this.isometryToolsService.startSlopeMode();
    } else if (mode === 'freehand') {
      this.lineDrawingService.setDrawingMode('idle');
      this.freehandDrawingService.startFreehandDrawing();
    } else {
      this.weldingService.stopWeldstamp();
      this.weldingService.stopWelderStamp();
      this.weldingService.stopWelderStampEmpty();
      this.weldingService.stopWelderStampAS();
      this.weldingService.stopWeld();
      this.weldingService.stopFluidStamp();
      this.pipingService.stopFlowMode();
      this.pipingService.stopGateValveMode();
      this.pipingService.stopGateValveSMode();
      this.pipingService.stopGateValveFLMode();
      this.pipingService.stopGlobeValveSMode();
      this.pipingService.stopGlobeValveFLMode();
      this.pipingService.stopBallValveSMode();
      this.pipingService.stopBallValveFLMode();
      this.isometryToolsService.stopSlopeMode();
      this.freehandDrawingService.stopFreehandDrawing();
      this.lineDrawingService.setDrawingMode(mode);
    }
  }

  public get pipePoints(): { x: number; y: number }[] {
    return this.lineDrawingService['pipePoints'];
  }

  public set pipePoints(points: { x: number; y: number }[]) {
    this.lineDrawingService['pipePoints'] = points;
  }
  
  // Color mode methods
  public setColorMode(mode: 'drawing' | 'blackwhite' | 'norm'): void {
    console.log('Setting color mode to:', mode);
    this.colorMode = mode;
    this.updateCanvasColors();
  }
  
  public getColor(element: 'line' | 'pipe' | 'dimension' | 'text' | 'weld' | 'anchor' | 'valve'): string {
    return this.colorSchemes[this.colorMode][element];
  }
  
  private updateCanvasColors(): void {
    if (!this.canvas) return;
    
    const objects = this.canvas.getObjects();
    objects.forEach(obj => {
      // Update line colors
      if (obj instanceof fabric.Line) {
        // Store original type if not already stored
        if ((obj as any).isPipe === undefined && obj.stroke === 'green') {
          (obj as any).isPipe = true;
        }
        
        if ((obj as any).isPipe) {
          obj.set('stroke', this.getColor('pipe'));
        } else if ((obj as any).isDimensionPart) {
          obj.set('stroke', this.getColor('dimension'));
        } else {
          obj.set('stroke', this.getColor('line'));
        }
      }
      // Update path colors (for pipes)
      else if (obj instanceof fabric.Path) {
        if ((obj as any).isPipe || obj.stroke === 'green' || obj.stroke === '#00A050' || obj.stroke === 'black') {
          // Always update pipe colors based on current mode
          if ((obj as any).isPipe !== false) {  // Check if it's a pipe
            obj.set('stroke', this.getColor('pipe'));
          }
        }
      }
      // Update circle colors (anchors)
      else if (obj instanceof fabric.Circle) {
        if ((obj as any).customType === 'anchorPoint') {
          // Store original colors if not already stored
          if (!(obj as any).originalFill) {
            (obj as any).originalFill = obj.fill;
            (obj as any).originalStroke = obj.stroke;
          }
          
          // Check original colors to determine point type
          const origFill = (obj as any).originalFill;
          const origStroke = (obj as any).originalStroke;
          
          if (origFill === 'blue' || origStroke === 'blue' || origStroke === 'darkblue' || 
              (typeof origFill === 'string' && origFill.includes('rgba(0, 0, 255')) ||
              (typeof origStroke === 'string' && origStroke.includes('rgba(0, 0, 139'))) {
            // Blue anchor points
            if (this.colorMode === 'blackwhite') {
              obj.set({
                'fill': 'black',
                'stroke': 'black'
              });
            } else if (this.colorMode === 'norm') {
              obj.set({
                'fill': '#0000FF',
                'stroke': '#00008B'
              });
            } else {
              // Drawing mode - restore original transparent blue
              if (typeof origFill === 'string' && origFill.includes('rgba')) {
                obj.set({
                  'fill': 'rgba(0, 0, 255, 0.2)',
                  'stroke': 'rgba(0, 0, 139, 0.4)'
                });
              } else {
                obj.set({
                  'fill': 'blue',
                  'stroke': 'darkblue'
                });
              }
            }
          } else if (origFill === 'red' || origStroke === 'red' || origStroke === 'darkred') {
            // Red anchor points
            if (this.colorMode === 'blackwhite') {
              obj.set({
                'fill': 'black',
                'stroke': 'black'
              });
            } else {
              // Restore original red colors
              obj.set({
                'fill': origFill || 'red',
                'stroke': origStroke || 'darkred'
              });
            }
          } else if (origFill === 'transparent' || !origFill) {
            // Transparent anchor points
            obj.set({
              'fill': 'transparent',
              'stroke': this.getColor('anchor')
            });
          }
        }
      }
      // Update text colors
      else if (obj instanceof fabric.IText || obj instanceof fabric.Text) {
        if (!(obj as any).isDimensionPart) {
          obj.set('fill', this.getColor('text'));
        } else {
          obj.set('fill', this.getColor('dimension'));
        }
      }
      // Update group colors
      else if (obj instanceof fabric.Group) {
        if ((obj as any).isWeldPoint || (obj as any).customType?.includes('weld')) {
          obj.getObjects().forEach((subObj: any) => {
            if (subObj.type === 'line') {
              subObj.set('stroke', this.getColor('weld'));
            }
          });
        } else if ((obj as any).customType?.includes('valve')) {
          obj.getObjects().forEach((subObj: any) => {
            if (subObj.type === 'line' || subObj.type === 'path') {
              subObj.set('stroke', this.getColor('valve'));
            }
          });
        }
      }
    });
    
    this.canvas.requestRenderAll();
  }
}
