import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawingService } from '../../services/drawing.service';
import { LineDrawingService } from '../../services/line-drawing.service';
import { DimensionService } from '../../services/dimension.service';
import { ObjectManagementService } from '../../services/object-management.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
  public snapToAngle: boolean = false;
  public showWeldingTools: boolean = false;
  
  constructor(
    public drawingService: DrawingService,
    private lineDrawingService: LineDrawingService,
    private dimensionService: DimensionService,
    private objectManagementService: ObjectManagementService
  ) {}

  public addLine(): void {
    this.drawingService.setDrawingMode('addLine');
  }

  public addIsometricLine(): void {
    this.drawingService.addIsometricLine();
    this.drawingService.requestRedraw();
  }

  public addArc(): void {
    this.drawingService.addArc();
    this.drawingService.requestRedraw();
  }

  public addValve(): void {
    this.drawingService.addValve();
    this.drawingService.requestRedraw();
  }

  public startPiping(): void {
    this.drawingService.setDrawingMode('addPipe');
    this.drawingService.pipePoints = [];
  }

  public groupSelectedObjects(): void {
    this.drawingService.groupSelectedObjects();
    this.drawingService.requestRedraw();
  }

  public ungroupObjects(): void {
    this.drawingService.ungroupObjects();
    this.drawingService.requestRedraw();
  }

  public addAnchors(): void {
    this.drawingService.addAnchors();
  }

  public applyDimension(): void {
    this.drawingService.requestRedraw();
  }

  public setDimensionMode(): void {
    this.drawingService.startDimensioning();
  }

  public addText(): void {
    this.drawingService.startTextMode();
  }
  
  public toggleSnapToAngle(): void {
    this.snapToAngle = !this.snapToAngle;
    this.lineDrawingService.setSnapToAngle(this.snapToAngle);
  }
  
  public toggleWelding(): void {
    this.showWeldingTools = !this.showWeldingTools;
    if (!this.showWeldingTools && (this.drawingService.drawingMode === 'weldstamp' || 
        this.drawingService.drawingMode === 'welderstamp' || 
        this.drawingService.drawingMode === 'welderstampempty' ||
        this.drawingService.drawingMode === 'welderstampas' ||
        this.drawingService.drawingMode === 'weld' ||
        this.drawingService.drawingMode === 'fluidstamp')) {
      this.drawingService.setDrawingMode('idle');
    }
  }
  
  public startWeldstamp(): void {
    this.drawingService.setDrawingMode('weldstamp');
  }
  
  public startWelderStamp(): void {
    this.drawingService.setDrawingMode('welderstamp');
  }
  
  public startWelderStampEmpty(): void {
    this.drawingService.setDrawingMode('welderstampempty');
  }
  
  public startWelderStampAS(): void {
    this.drawingService.setDrawingMode('welderstampas');
  }
  
  public startWeld(): void {
    this.drawingService.setDrawingMode('weld');
  }
  
  public startFluidStamp(): void {
    this.drawingService.setDrawingMode('fluidstamp');
  }

  public startSpool(): void {
    this.drawingService.setDrawingMode('spool');
  }
}
