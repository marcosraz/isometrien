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
  private isEnabled = true;

  constructor(
    private drawingService: DrawingService,
    private stateManagementService: StateManagementService,
    private gridService: GridService,
    private exportService: ExportService,
    private zoomPanService: ZoomPanService
  ) {
    this.registerShortcuts();
    this.setupKeyboardListener();
  }

  private registerShortcuts(): void {
    // Drawing shortcuts
    this.shortcuts = [
      {
        key: 'Escape',
        description: 'Exit current mode',
        handler: () => this.drawingService.setDrawingMode('idle')
      },
      {
        key: 'l',
        description: 'Line drawing mode',
        handler: () => this.drawingService.setDrawingMode('addLine')
      },
      {
        key: 'p',
        description: 'Pipe drawing mode',
        handler: () => this.drawingService.setDrawingMode('addPipe')
      },
      {
        key: 'd',
        description: 'Dimension mode',
        handler: () => this.drawingService.setDrawingMode('dimension')
      },
      {
        key: 't',
        description: 'Text mode',
        handler: () => this.drawingService.setDrawingMode('text')
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
    document.addEventListener('keydown', (event: KeyboardEvent) => {
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
      
      // Find matching shortcut
      const shortcut = this.shortcuts.find(s => {
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = s.ctrl === undefined || s.ctrl === event.ctrlKey;
        const shiftMatch = s.shift === undefined || s.shift === event.shiftKey;
        const altMatch = s.alt === undefined || s.alt === event.altKey;
        
        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });
      
      if (shortcut) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.handler();
      }
    });
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
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
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