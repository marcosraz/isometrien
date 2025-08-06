import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { IsometryService } from './isometry.service';
import { LineDrawingService } from './line-drawing.service';
import { DimensionService } from './dimension.service';
import { ObjectManagementService } from './object-management.service';
import { WeldingService } from './welding.service';
import { StateManagementService } from './state-management.service';
import { PipingService } from './piping.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DrawingService {
  private redrawRequest = new BehaviorSubject<void>(undefined);
  redraw$ = this.redrawRequest.asObservable();
  private canvas!: fabric.Canvas;

  constructor(
    private isometryService: IsometryService,
    private lineDrawingService: LineDrawingService,
    private dimensionService: DimensionService,
    private objectManagementService: ObjectManagementService,
    private weldingService: WeldingService,
    private stateManagementService: StateManagementService,
    private pipingService: PipingService
  ) {
    // Connect state management to services
    this.lineDrawingService.setStateManagement(this.stateManagementService);
    this.dimensionService.setStateManagement(this.stateManagementService);
    this.weldingService.setStateManagement(this.stateManagementService);
    this.objectManagementService.setStateManagement(this.stateManagementService);
    this.pipingService.setStateManagement(this.stateManagementService);
  }

  public setCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
    this.lineDrawingService.setCanvas(canvas);
    this.weldingService.setCanvas(canvas);
    this.pipingService.setCanvas(canvas);
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

  public startTextMode(): void {
    this.lineDrawingService.setDrawingMode('text');
  }

  public setDrawingMode(
    mode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'weldstamp' | 'welderstamp' | 'welderstampempty' | 'welderstampas' | 'weld' | 'fluidstamp' | 'spool' | 'flow' | 'gateValve' | 'gateValveS' | 'gateValveFL' | 'globeValveS' | 'globeValveFL' | 'ballValveS' | 'ballValveFL'
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
    
    // Prüfe, ob ein Bemaßungstext doppelgeklickt wurde
    const target = (options as any).target;
    if (target) {
      // Prüfe direkt auf Bemaßungstext
      if (target.type === 'i-text' && (target as any).customType === 'dimensionText') {
        const textObject = target as fabric.IText;
        // Aktiviere den Text zum Bearbeiten
        this.canvas.setActiveObject(textObject);
        textObject.enterEditing();
        textObject.selectAll();
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
  public get drawingMode(): 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'weldstamp' | 'welderstamp' | 'welderstampempty' | 'welderstampas' | 'weld' | 'fluidstamp' | 'spool' | 'flow' | 'gateValve' | 'gateValveS' | 'gateValveFL' | 'globeValveS' | 'globeValveFL' | 'ballValveS' | 'ballValveFL' {
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
    return this.lineDrawingService.drawingMode;
  }

  public set drawingMode(mode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'weldstamp' | 'welderstamp' | 'welderstampempty' | 'welderstampas' | 'weld' | 'fluidstamp' | 'spool' | 'flow' | 'gateValve' | 'gateValveS' | 'gateValveFL' | 'globeValveS' | 'globeValveFL' | 'ballValveS' | 'ballValveFL') {
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
      this.lineDrawingService.setDrawingMode(mode);
    }
  }

  // Getters for other properties to maintain compatibility
  public get pipePoints(): { x: number; y: number }[] {
    return this.lineDrawingService['pipePoints'];
  }

  public set pipePoints(points: { x: number; y: number }[]) {
    this.lineDrawingService['pipePoints'] = points;
  }
}
