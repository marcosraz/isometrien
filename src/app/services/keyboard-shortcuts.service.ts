import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { DrawingService } from './drawing.service';
import { StateManagementService } from './state-management.service';
import { GridService } from './grid.service';
import { ExportService } from './export.service';
import { ZoomPanService } from './zoom-pan.service';

interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  handler: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService {
  private shortcuts: ShortcutHandler[] = [];
  private isEnabled = false;
  private keydownListener: ((event: KeyboardEvent) => void) | null = null;

  constructor(
    private drawingService: DrawingService,
    private stateManagementService: StateManagementService,
    private gridService: GridService,
    private exportService: ExportService,
    private zoomPanService: ZoomPanService
  ) {
    // Don't setup listeners in constructor - wait for enable() to be called
    this.registerShortcuts();
  }

  private registerShortcuts(): void {
    // Drawing shortcuts
    this.shortcuts = [
      {
        key: 'Escape',
        description: 'Exit current mode and clear selection',
        handler: () => {
          this.drawingService.setDrawingMode('idle');
          // Clear any active selection
          const canvas = this.drawingService.getCanvas();
          if (canvas) {
            // Clear selection first - use both methods to ensure it works
            canvas.discardActiveObject();
            canvas.selection = true; // Re-enable selection
            
            // Clear the selection layer explicitly
            if ((canvas as any).contextTop) {
              const ctx = (canvas as any).contextTop as CanvasRenderingContext2D;
              ctx.clearRect(0, 0, canvas.getWidth(), canvas.getHeight());
            }
            
            // Ensure anchor points remain visible after ESC
            canvas.getObjects().forEach(obj => {
              if ((obj as any).isAnchor) {
                obj.set({ visible: true });
              }
            });
            canvas.requestRenderAll();
          }
        }
      },
      {
        key: 'l',
        description: 'Line drawing mode',
        handler: () => {
          // Don't check canvas here - let DrawingService handle it
          this.drawingService.setDrawingMode('addLine');
        }
      },
      {
        key: 'p',
        description: 'Pipe drawing mode',
        handler: () => {
          // Don't check canvas here - let DrawingService handle it
          this.drawingService.setDrawingMode('addPipe');
        }
      },
      {
        key: 'r',
        description: 'Rohrleitungen-Menü (Öffnet Auswahl-Dialog)',
        handler: () => {
          console.log('Shortcut R: Öffne Rohrleitungen-Menü');
          // Verwende die Toolbar-Methode um das Menü zu zeigen
          // Da wir hier keinen direkten Zugriff auf die Toolbar haben,
          // erstelle ich das Menü direkt hier
          const choice = prompt(
            'ROHRLEITUNGEN-MENÜ (Shortcut R):\n\n' +
            '1 - Rohrleitungen zeichnen (P)\n' +
            '2 - Rohrleitungen verschieben (M)\n' +
            '3 - T-Stück/Ventil verschieben (Verschieben-B)\n' +
            '4 - T-Stück einfügen\n' +
            '5 - Ventile einfügen\n\n' +
            'Wähle eine Option (1-5):'
          );
          
          switch(choice) {
            case '1':
              this.drawingService.setDrawingMode('addPipe');
              console.log('⚙️ Rohrleitungen zeichnen aktiviert');
              break;
            case '2':
              this.drawingService.setDrawingMode('movePipe' as any);
              console.log('⚙️ Rohrleitungen verschieben aktiviert');
              break;
            case '3':
              this.drawingService.setDrawingMode('moveComponent' as any);
              console.log('⚙️ T-Stück/Ventil verschieben aktiviert (Shortcut: B)');
              break;
            case '4':
              alert('T-Stück einfügen wird in einer zukünftigen Version verfügbar sein.');
              break;
            case '5':
              alert('Ventile einfügen wird in einer zukünftigen Version verfügbar sein.');
              break;
            default:
              if (choice !== null) {
                alert('Ungültige Auswahl. Bitte wähle 1-5.');
              }
              break;
          }
        }
      },
      {
        key: 'd',
        description: 'Dimension mode',
        handler: () => this.drawingService.startIsoDimensioning()
      },
      {
        key: 't',
        description: 'Text mode',
        handler: () => this.drawingService.setDrawingMode('text')
      },
      {
        key: 'm',
        description: 'Move mode (pipes and anchors)',
        handler: () => this.drawingService.setDrawingMode('movePipe' as any)
      },
      {
        key: 'b',
        description: 'Move T-pieces and valves along pipes',
        handler: () => this.drawingService.setDrawingMode('moveComponent' as any)
      },
      
      // Undo/Redo
      {
        key: 'z',
        ctrl: true,
        description: 'Undo',
        handler: () => this.stateManagementService.undo()
      },
      {
        key: 'y',
        ctrl: true,
        description: 'Redo',
        handler: () => this.stateManagementService.redo()
      },
      
      // View controls
      {
        key: 'g',
        description: 'Toggle grid',
        handler: () => this.gridService.toggleGrid()
      },
      {
        key: 'f',
        description: 'Fit to canvas',
        handler: () => this.zoomPanService.zoomToFit()
      },
      {
        key: '0',
        ctrl: true,
        description: 'Reset zoom',
        handler: () => this.zoomPanService.resetZoom()
      },
      {
        key: '+',
        description: 'Zoom in',
        handler: () => this.zoomPanService.zoomIn()
      },
      {
        key: '-',
        description: 'Zoom out',
        handler: () => this.zoomPanService.zoomOut()
      },
      
      // Export shortcuts
      {
        key: 's',
        ctrl: true,
        description: 'Export as PNG',
        handler: () => {
          this.exportService.exportAsPNG();
          return false; // Prevent browser save
        }
      },
      {
        key: 's',
        ctrl: true,
        shift: true,
        description: 'Export as SVG',
        handler: () => {
          this.exportService.exportAsSVG();
          return false;
        }
      },
      {
        key: 'p',
        ctrl: true,
        description: 'Print',
        handler: () => {
          this.exportService.printCanvas();
          return false; // Prevent browser print
        }
      },
      {
        key: 'c',
        ctrl: true,
        alt: true,
        description: 'Copy to clipboard',
        handler: () => {
          this.exportService.copyToClipboard()
            .then(() => console.log('Copied to clipboard'))
            .catch(err => console.error('Failed to copy:', err));
        }
      },
      
      // Color modes
      {
        key: '1',
        alt: true,
        description: 'Drawing color mode',
        handler: () => this.drawingService.setColorMode('drawing')
      },
      {
        key: '2',
        alt: true,
        description: 'Black/White mode',
        handler: () => this.drawingService.setColorMode('blackwhite')
      },
      {
        key: '3',
        alt: true,
        description: 'Norm color mode',
        handler: () => this.drawingService.setColorMode('norm')
      },
      
      // Delete
      {
        key: 'Delete',
        description: 'Delete selected objects',
        handler: () => this.deleteSelectedObjects()
      },
      {
        key: 'Backspace',
        description: 'Delete selected objects',
        handler: () => this.deleteSelectedObjects()
      },
      
      // Select all
      {
        key: 'a',
        ctrl: true,
        description: 'Select all',
        handler: () => this.selectAll()
      }
    ];
  }

  private setupKeyboardListener(): void {
    // Create the event listener function
    this.keydownListener = (event: KeyboardEvent) => {
      if (!this.isEnabled) return;
      
      // Skip if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Skip if editing text in canvas
      if (this.drawingService.isEditingText()) {
        return;
      }
      
      // Debug logging
      console.log('Key pressed:', event.key, 'Ctrl:', event.ctrlKey, 'Shift:', event.shiftKey, 'Alt:', event.altKey);
      
      // Find matching shortcut
      const shortcut = this.shortcuts.find(s => {
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
        // Only check modifiers if they are explicitly required
        const ctrlMatch = !s.ctrl || (s.ctrl === event.ctrlKey);
        const shiftMatch = !s.shift || (s.shift === event.shiftKey);
        const altMatch = !s.alt || (s.alt === event.altKey);
        
        // For shortcuts without modifiers, ensure no modifiers are pressed
        const noUnwantedModifiers = s.ctrl || s.shift || s.alt || 
          (!event.ctrlKey && !event.shiftKey && !event.altKey);
        
        return keyMatch && ctrlMatch && shiftMatch && altMatch && noUnwantedModifiers;
      });
      
      if (shortcut) {
        console.log('Executing shortcut:', shortcut.description);
        event.preventDefault();
        event.stopPropagation();
        shortcut.handler();
      } else {
        console.log('No matching shortcut found for key:', event.key);
      }
    };
    
    // Add the event listener
    document.addEventListener('keydown', this.keydownListener);
  }

  private deleteSelectedObjects(): void {
    const canvas = this.drawingService.getCanvas();
    const activeObjects = canvas.getActiveObjects();
    
    if (activeObjects.length > 0) {
      this.stateManagementService.executeOperation('Delete Objects', () => {
        activeObjects.forEach(obj => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      });
    }
  }

  private selectAll(): void {
    const canvas = this.drawingService.getCanvas();
    const objects = canvas.getObjects().filter(obj => 
      obj.selectable !== false
    );
    
    if (objects.length > 0) {
      const selection = new fabric.ActiveSelection(objects, { canvas });
      canvas.setActiveObject(selection);
      canvas.requestRenderAll();
    }
  }

  public enable(): void {
    console.log('Enabling KeyboardShortcutsService');
    
    // Don't check canvas here - it might not be ready yet
    // Instead, check when shortcuts are actually executed
    this.isEnabled = true;
    
    // Setup listener if not already setup
    if (!this.keydownListener) {
      this.setupKeyboardListener();
      console.log('Keyboard shortcuts listener registered');
    }
  }

  public disable(): void {
    console.log('Disabling KeyboardShortcutsService');
    this.isEnabled = false;
    
    // Remove event listener if it exists
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
      console.log('Keyboard shortcuts listener removed');
    }
  }

  public getShortcuts(): ShortcutHandler[] {
    return this.shortcuts;
  }

  public getShortcutsHelp(): string {
    const groups = {
      'Drawing': ['l', 'p', 'd', 't', 'Escape'],
      'Edit': ['z', 'y', 'Delete', 'Backspace', 'a'],
      'View': ['g', 'f', '0', '+', '-'],
      'Export': ['s', 'p', 'c'],
      'Color': ['1', '2', '3']
    };

    let help = 'Keyboard Shortcuts:\n\n';
    
    for (const [group, keys] of Object.entries(groups)) {
      help += `${group}:\n`;
      keys.forEach(key => {
        const shortcut = this.shortcuts.find(s => s.key === key || 
          (s.key === key && s.ctrl) || 
          (s.key === key && s.alt));
        if (shortcut) {
          let keyCombo = '';
          if (shortcut.ctrl) keyCombo += 'Ctrl+';
          if (shortcut.shift) keyCombo += 'Shift+';
          if (shortcut.alt) keyCombo += 'Alt+';
          keyCombo += shortcut.key;
          help += `  ${keyCombo.padEnd(15)} - ${shortcut.description}\n`;
        }
      });
      help += '\n';
    }
    
    return help;
  }
}