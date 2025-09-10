import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawingService } from '../../services/drawing.service';
import { LineDrawingService } from '../../services/line-drawing.service';
import { DimensionService } from '../../services/dimension.service';
import { ObjectManagementService } from '../../services/object-management.service';
import { GridService } from '../../services/grid.service';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
  public snapToAngle: boolean = false;
  public snapTo15Angle: boolean = false;
  public snapTo45Angle: boolean = false;
  public showWeldingTools: boolean = false;
  public showPipingTools: boolean = false;
  public showValveTools: boolean = false;
  public showGateValveTools: boolean = false;
  public showGlobeValveTools: boolean = false;
  public showBallValveTools: boolean = false;
  public sidebarCollapsed: boolean = false;
  public activeSection: string = 'drawing';
  public colorMode: 'drawing' | 'blackwhite' | 'norm' = 'drawing';
  public freehandColor: string = '#000000';
  public strokeWidth: number = 2;
  private escPressCount: number = 0;
  private escResetTimeout: any = null;
  
  constructor(
    public drawingService: DrawingService,
    private lineDrawingService: LineDrawingService,
    private dimensionService: DimensionService,
    private objectManagementService: ObjectManagementService,
    public gridService: GridService,
    private exportService: ExportService
  ) {
    // Initialize color mode from drawing service
    this.colorMode = this.drawingService.colorMode;
    
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
    
    // Listen for slope mode exit event
    window.addEventListener('exitSlopeMode', () => {
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
  
  public addTestLine(): void {
    this.drawingService.setDrawingMode('testLine');
  }

  public startFreehand(): void {
    this.drawingService.setDrawingMode('freehand');
    // Update stroke width display
    setInterval(() => {
      if (this.drawingService.freehandDrawingService) {
        this.strokeWidth = this.drawingService.freehandDrawingService.getStrokeWidth();
      }
    }, 100);
  }

  public updateFreehandColor(): void {
    if (this.drawingService.freehandDrawingService) {
      this.drawingService.freehandDrawingService.setStrokeColor(this.freehandColor);
    }
  }

  public startPiping(): void {
    this.drawingService.setDrawingMode('addPipe');
    this.drawingService.pipePoints = [];
  }

  public startMovePipe(): void {
    this.drawingService.setDrawingMode('movePipe' as any);
    console.log('Move Pipe Modus aktiviert');
  }
  
  public isMovePipeActive(): boolean {
    return (this.drawingService.drawingMode as string) === 'movePipe';
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
  
  public setIsoDimensionMode(): void {
    this.drawingService.startIsoDimensioning();
  }

  public addText(): void {
    this.drawingService.startTextMode();
  }
  
  public toggleSnapToAngle(): void {
    this.snapToAngle = !this.snapToAngle;
    // Wenn 30° aktiviert wird, deaktiviere andere
    if (this.snapToAngle) {
      this.snapTo15Angle = false;
      this.snapTo45Angle = false;
      this.lineDrawingService.setSnapTo15Angle(false);
      this.lineDrawingService.setSnapTo45Angle(false);
    }
    this.lineDrawingService.setSnapToAngle(this.snapToAngle);
  }
  
  public toggleSnapTo15Angle(): void {
    this.snapTo15Angle = !this.snapTo15Angle;
    // Wenn 15° aktiviert wird, deaktiviere andere
    if (this.snapTo15Angle) {
      this.snapToAngle = false;
      this.snapTo45Angle = false;
      this.lineDrawingService.setSnapToAngle(false);
      this.lineDrawingService.setSnapTo45Angle(false);
    }
    this.lineDrawingService.setSnapTo15Angle(this.snapTo15Angle);
  }
  
  public toggleSnapTo45Angle(): void {
    this.snapTo45Angle = !this.snapTo45Angle;
    // Wenn 45° aktiviert wird, deaktiviere andere
    if (this.snapTo45Angle) {
      this.snapToAngle = false;
      this.snapTo15Angle = false;
      this.lineDrawingService.setSnapToAngle(false);
      this.lineDrawingService.setSnapTo15Angle(false);
    }
    this.lineDrawingService.setSnapTo45Angle(this.snapTo45Angle);
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
  
  public startSlope(): void {
    this.drawingService.setDrawingMode('slope');
  }
  
  public startTeeJoint(): void {
    this.drawingService.setDrawingMode('teeJoint');
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

  // New UI Methods
  public toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  public toggleSection(section: string): void {
    if (this.activeSection === section) {
      this.activeSection = '';
    } else {
      this.activeSection = section;
      // Close other sections
      if (section === 'welding') {
        this.showPipingTools = false;
        this.showValveTools = false;
      } else if (section === 'piping') {
        this.showWeldingTools = false;
      } else if (section === 'isometry') {
        this.showWeldingTools = false;
        this.showPipingTools = false;
        this.showValveTools = false;
      }
    }
  }

  public getCurrentModeLabel(): string {
    const modeLabels: { [key: string]: string } = {
      'idle': 'Bereit',
      'addLine': 'Linie zeichnen',
      'addPipe': 'Rohrleitung zeichnen',
      'text': 'Text hinzufügen',
      'dimension': 'Bemaßung',
      'addAnchors': 'Ankerpunkte setzen',
      'weldstamp': 'Schweißstempel',
      'welderstamp': 'Schweißer Stempel',
      'welderstampempty': 'Schweißer leer',
      'welderstampas': 'Schweißer AS',
      'weld': 'Schweißnaht',
      'fluidstamp': 'Flansch Stempel',
      'spool': 'Spool',
      'flow': 'Fließrichtung',
      'gateValveS': 'Gate Ventil S',
      'gateValveFL': 'Gate Ventil FL',
      'globeValveS': 'Globe Ventil S',
      'globeValveFL': 'Globe Ventil FL',
      'ballValveS': 'Ball Ventil S',
      'ballValveFL': 'Ball Ventil FL',
      'slope': 'Gefälle markieren'
    };
    return modeLabels[this.drawingService.drawingMode] || this.drawingService.drawingMode;
  }

  public getContextualHelp(): string {
    const helpTexts: { [key: string]: string } = {
      'addLine': 'Klicken Sie für Startpunkt, dann für Endpunkt. Shift = 15° Snap, Strg = Ankerpunkt-Snap',
      'addPipe': 'Klicken Sie für Punkte entlang der Rohrleitung. Doppelklick oder ESC zum Beenden',
      'text': 'Klicken Sie auf die Position für den Text',
      'dimension': 'Wählen Sie zwei Ankerpunkte, dann die Position für die Bemaßung',
      'addAnchors': 'Klicken Sie um Ankerpunkte zu setzen. Shift = Snap zu Linien',
      'weldstamp': 'Klicken Sie auf zwei Punkte für die Schweißnaht-Position',
      'welderstamp': 'Klicken Sie auf zwei Punkte für den Schweißer-Stempel',
      'welderstampempty': 'Klicken Sie auf zwei Punkte für den leeren Schweißer-Stempel',
      'welderstampas': 'Klicken Sie auf zwei Punkte für den AS Schweißer-Stempel',
      'weld': 'Klicken Sie auf zwei Punkte für die Schweißnaht',
      'fluidstamp': 'Klicken Sie auf zwei Punkte für den Flansch-Stempel',
      'spool': 'Klicken Sie auf die Position für die Spool-Nummer',
      'flow': 'Klicken Sie auf Start- und Endpunkt für die Fließrichtung',
      'gateValveS': 'Klicken Sie auf zwei Punkte für das Gate Ventil (S)',
      'gateValveFL': 'Klicken Sie auf zwei Punkte für das Gate Ventil (FL)',
      'globeValveS': 'Klicken Sie auf zwei Punkte für das Globe Ventil (S)',
      'globeValveFL': 'Klicken Sie auf zwei Punkte für das Globe Ventil (FL)',
      'ballValveS': 'Klicken Sie auf zwei Punkte für das Ball Ventil (S)',
      'ballValveFL': 'Klicken Sie auf zwei Punkte für das Ball Ventil (FL)',
      'slope': 'Bewegen Sie über eine Linie. Strg = Richtung ändern, Shift = Seite wechseln'
    };
    return helpTexts[this.drawingService.drawingMode] || 'Wählen Sie ein Werkzeug aus der Seitenleiste';
  }

  public showHelp(): void {
    alert('Hilfe\n\n' +
          'Willkommen zur Isometrie-Zeichenanwendung!\n\n' +
          'Diese Anwendung ermöglicht das Erstellen von isometrischen technischen Zeichnungen.\n\n' +
          'Hauptfunktionen:\n' +
          '• Linien und Rohrleitungen zeichnen\n' +
          '• ISO-Bemaßungen hinzufügen\n' +
          '• Schweißsymbole platzieren\n' +
          '• Text-Annotationen erstellen\n' +
          '• Export als PNG, SVG oder JSON\n\n' +
          'Verwenden Sie die Werkzeuge in der Seitenleiste oder\n' +
          'klicken Sie auf das Tastatur-Symbol für Shortcuts.\n\n' +
          'Weitere Hilfe finden Sie in der Dokumentation.');
  }
  
  public showKeyboardShortcuts(): void {
    alert('⌨️ Tastenkürzel\n\n' +
          '📝 ZEICHNEN:\n' +
          '• L - Linie zeichnen\n' +
          '• P - Pipe/Rohrleitung zeichnen\n' +
          '• D - ISO-Bemaßung (TAB für Ausrichtung)\n' +
          '• T - Text einfügen\n' +
          '• ESC - Aktuellen Modus beenden\n\n' +
          '✏️ BEARBEITEN:\n' +
          '• Strg+Z - Rückgängig\n' +
          '• Strg+Y - Wiederholen\n' +
          '• Delete/Backspace - Objekte löschen\n' +
          '• Shift - 15° Snap beim Zeichnen\n' +
          '• Strg - Snap zu Ankerpunkten\n\n' +
          '👁️ ANSICHT:\n' +
          '• G - Grid ein/ausschalten\n' +
          '• F - An Bildschirm anpassen\n' +
          '• + / - - Zoom rein/raus\n' +
          '• Strg+0 - Zoom zurücksetzen\n' +
          '• Space+Drag - Pan (verschieben)\n' +
          '• Mausrad - Zoom\n' +
          '• Alt+Mausrad - Grid-Größe ändern\n\n' +
          '🎨 FARBMODI:\n' +
          '• Alt+1 - Zeichnungsmodus (Farbe)\n' +
          '• Alt+2 - Schwarz/Weiß Modus\n' +
          '• Alt+3 - DIN ISO Norm\n\n' +
          '💾 EXPORT:\n' +
          '• Strg+S - Als PNG exportieren\n' +
          '• Strg+Shift+S - Als SVG exportieren\n' +
          '• Strg+P - Drucken');
  }

  public showSettings(): void {
    alert('Einstellungen:\n\nDiese Funktion wird in einer zukünftigen Version verfügbar sein.');
  }
  
  public setColorMode(mode: 'drawing' | 'blackwhite' | 'norm'): void {
    this.colorMode = mode;
    this.drawingService.setColorMode(mode);
  }
  
  public toggleGrid(): void {
    this.gridService.toggleGrid();
  }
  
  public setGridSize(event: Event): void {
    const input = event.target as HTMLInputElement;
    const size = parseInt(input.value, 10);
    this.gridService.setGridSize(size);
  }
  
  public exportAsPNG(): void {
    this.exportService.exportAsPNG();
  }
  
  public exportAsSVG(): void {
    this.exportService.exportAsSVG();
  }
  
  public exportAsJSON(): void {
    this.exportService.exportAsJSON();
  }
  
  public printCanvas(): void {
    this.exportService.printCanvas();
  }
}
