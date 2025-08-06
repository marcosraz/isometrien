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
  public showPipingTools: boolean = false;
  public showValveTools: boolean = false;
  public showGateValveTools: boolean = false;
  public showGlobeValveTools: boolean = false;
  public showBallValveTools: boolean = false;
  private escPressCount: number = 0;
  private escResetTimeout: any = null;
  
  constructor(
    public drawingService: DrawingService,
    private lineDrawingService: LineDrawingService,
    private dimensionService: DimensionService,
    private objectManagementService: ObjectManagementService
  ) {
    // Listen for ESC key and custom events
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleEscapeKey();
      }
    });
    
    // Listen for flow mode exit event
    window.addEventListener('exitFlowMode', () => {
      this.drawingService.setDrawingMode('idle');
    });
    
    // Listen for gate valve mode exit events
    window.addEventListener('exitGateValveMode', () => {
      this.drawingService.setDrawingMode('idle');
    });
    
    window.addEventListener('exitGateValveSMode', () => {
      this.drawingService.setDrawingMode('idle');
    });
    
    window.addEventListener('exitGateValveFLMode', () => {
      this.drawingService.setDrawingMode('idle');
    });
    
    window.addEventListener('exitGlobeValveSMode', () => {
      this.drawingService.setDrawingMode('idle');
    });
    
    window.addEventListener('exitGlobeValveFLMode', () => {
      this.drawingService.setDrawingMode('idle');
    });
    
    window.addEventListener('exitBallValveSMode', () => {
      this.drawingService.setDrawingMode('idle');
    });
    
    window.addEventListener('exitBallValveFLMode', () => {
      this.drawingService.setDrawingMode('idle');
    });
  }
  
  private handleEscapeKey(): void {
    // Clear previous timeout if exists
    if (this.escResetTimeout) {
      clearTimeout(this.escResetTimeout);
    }
    
    this.escPressCount++;
    
    if (this.escPressCount === 1) {
      // First ESC - exit current mode to idle
      if (this.drawingService.drawingMode !== 'idle') {
        this.drawingService.setDrawingMode('idle');
      }
    } else if (this.escPressCount === 2) {
      // Second ESC - close tool categories
      if (this.showValveTools) {
        this.showValveTools = false;
      } else if (this.showPipingTools) {
        this.showPipingTools = false;
      }
      if (this.showWeldingTools) {
        this.showWeldingTools = false;
      }
      this.escPressCount = 0;
    }
    
    // Reset counter after 1 second
    this.escResetTimeout = setTimeout(() => {
      this.escPressCount = 0;
    }, 1000);
  }

  public addLine(): void {
    this.drawingService.setDrawingMode('addLine');
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

  public togglePiping(): void {
    this.showPipingTools = !this.showPipingTools;
  }

  public startFlow(): void {
    this.drawingService.setDrawingMode('flow');
  }

  public toggleValves(): void {
    this.showValveTools = !this.showValveTools;
    if (!this.showValveTools) {
      this.showGateValveTools = false;
      this.showGlobeValveTools = false;
      this.showBallValveTools = false;
    }
  }

  public toggleGateValve(): void {
    this.showGateValveTools = !this.showGateValveTools;
    if (this.showGateValveTools) {
      this.showGlobeValveTools = false;
      this.showBallValveTools = false;
    }
    // When closing Gate valve tools, reset drawing mode
    if (!this.showGateValveTools && (this.drawingService.drawingMode === 'gateValveS' || this.drawingService.drawingMode === 'gateValveFL')) {
      this.drawingService.setDrawingMode('idle');
    }
  }

  public toggleGlobeValve(): void {
    this.showGlobeValveTools = !this.showGlobeValveTools;
    if (this.showGlobeValveTools) {
      this.showGateValveTools = false;
      this.showBallValveTools = false;
    }
    // When closing Globe valve tools, reset drawing mode
    if (!this.showGlobeValveTools && (this.drawingService.drawingMode === 'globeValveS' || this.drawingService.drawingMode === 'globeValveFL')) {
      this.drawingService.setDrawingMode('idle');
    }
  }

  public toggleBallValve(): void {
    this.showBallValveTools = !this.showBallValveTools;
    if (this.showBallValveTools) {
      this.showGateValveTools = false;
      this.showGlobeValveTools = false;
    }
    // When closing Ball valve tools, reset drawing mode
    if (!this.showBallValveTools && (this.drawingService.drawingMode === 'ballValveS' || this.drawingService.drawingMode === 'ballValveFL')) {
      this.drawingService.setDrawingMode('idle');
    }
  }

  public startGateValveS(): void {
    // Stop any other valve modes first
    if (this.drawingService.drawingMode === 'gateValveFL') {
      this.drawingService.setDrawingMode('idle');
    }
    this.drawingService.setDrawingMode('gateValveS');
  }

  public startGateValveFL(): void {
    // Stop any other valve modes first
    if (this.drawingService.drawingMode === 'gateValveS') {
      this.drawingService.setDrawingMode('idle');
    }
    this.drawingService.setDrawingMode('gateValveFL');
  }

  public startGlobeValveS(): void {
    // Stop any other valve modes first
    if (this.drawingService.drawingMode === 'globeValveFL') {
      this.drawingService.setDrawingMode('idle');
    }
    this.drawingService.setDrawingMode('globeValveS');
  }

  public startGlobeValveFL(): void {
    // Stop any other valve modes first
    if (this.drawingService.drawingMode === 'globeValveS') {
      this.drawingService.setDrawingMode('idle');
    }
    this.drawingService.setDrawingMode('globeValveFL');
  }

  public startBallValveS(): void {
    // Stop any other valve modes first
    if (this.drawingService.drawingMode === 'ballValveFL') {
      this.drawingService.setDrawingMode('idle');
    }
    this.drawingService.setDrawingMode('ballValveS');
  }

  public startBallValveFL(): void {
    // Stop any other valve modes first
    if (this.drawingService.drawingMode === 'ballValveS') {
      this.drawingService.setDrawingMode('idle');
    }
    this.drawingService.setDrawingMode('ballValveFL');
  }
}
