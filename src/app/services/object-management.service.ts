import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { StateManagementService } from './state-management.service';

@Injectable({
  providedIn: 'root',
})
export class ObjectManagementService {
  private stateManagement: StateManagementService | null = null;
  private spoolMode: boolean = false;
  private spoolCounter: number = 1;
  
  constructor() {}
  
  public setStateManagement(stateManagement: StateManagementService): void {
    this.stateManagement = stateManagement;
  }

  public startSpoolMode(): void {
    this.spoolMode = true;
  }

  public stopSpoolMode(): void {
    this.spoolMode = false;
  }

  public isSpoolMode(): boolean {
    return this.spoolMode;
  }

  public addSpoolText(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);
    const text = new fabric.IText(`Spool ${this.spoolCounter}`, {
      left: pointer.x,
      top: pointer.y,
      fontSize: 20,
      fill: 'black',
    });
    
    if (this.stateManagement) {
      this.stateManagement.executeOperation('Add Spool Text', () => {
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        canvas.requestRenderAll();
      });
    } else {
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
      canvas.requestRenderAll();
    }
    
    this.spoolCounter++;
  }

  public addText(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);
    const text = new fabric.IText('Your Text Here', {
      left: pointer.x,
      top: pointer.y,
      fontSize: 20,
      fill: 'black',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
  }

  public groupSelectedObjects(canvas: fabric.Canvas): void {
    const activeObj = canvas?.getActiveObject();
    if (!activeObj || activeObj.type !== 'activeSelection') return;

    const activeSelection = activeObj as fabric.ActiveSelection;
    const group = new fabric.Group(activeSelection.getObjects());

    canvas.discardActiveObject();
    canvas.add(group);
    canvas.requestRenderAll();
  }

  public ungroupObjects(canvas: fabric.Canvas): void {
    const activeObj = canvas?.getActiveObject();
    if (!activeObj || activeObj.type !== 'group') return;

    const group = activeObj as fabric.Group;
    const items = group.getObjects();
    canvas.discardActiveObject();
    items.forEach((item: fabric.Object) => {
      canvas.add(item);
    });
    canvas.remove(group);
    canvas.requestRenderAll();
  }

  public deleteSelectedObjects(canvas: fabric.Canvas): void {
    const activeObject = canvas.getActiveObject();
    
    // Check if text is being edited within the active object (group or direct text)
    let isTextEditing = false;
    if (activeObject) {
      if ((activeObject as fabric.IText)?.isEditing) {
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
    
    // Don't delete if text is being edited
    if (isTextEditing) {
      return;
    }
    
    if (activeObject) {
      // Prüfe ob es Teil einer Dimension ist
      if ((activeObject as any).isDimensionPart && (activeObject as any).dimensionId) {
        const dimensionId = (activeObject as any).dimensionId;
        
        // Finde alle Objekte mit dieser Dimension ID
        const objectsToRemove = canvas.getObjects().filter(obj => 
          (obj as any).dimensionId === dimensionId
        );
        
        // Entferne alle gefundenen Objekte
        objectsToRemove.forEach(obj => canvas.remove(obj));
      } else if (activeObject.type === 'activeSelection') {
        (activeObject as fabric.ActiveSelection).forEachObject((obj) => {
          // Prüfe ob ein Objekt in der Auswahl Teil einer Dimension ist
          if ((obj as any).isDimensionPart && (obj as any).dimensionId) {
            const dimensionId = (obj as any).dimensionId;
            const dimObjects = canvas.getObjects().filter(o => 
              (o as any).dimensionId === dimensionId
            );
            dimObjects.forEach(o => canvas.remove(o));
          } else {
            canvas.remove(obj);
          }
        });
      } else {
        canvas.remove(activeObject);
      }
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  }

  public isEditingText(canvas: fabric.Canvas): boolean {
    const activeObject = canvas.getActiveObject();
    
    if (!activeObject) {
      return false;
    }
    
    // Check if direct text object is editing
    if (activeObject instanceof fabric.IText && activeObject.isEditing) {
      return true;
    }
    
    // Check if text is being edited within a group
    if (activeObject.type === 'group') {
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

  public addIsometricLine(canvas: fabric.Canvas): void {
    const isoLine = new fabric.Line([100, 100, 300, 200], {
      stroke: 'blue',
      strokeWidth: 3,
    });
    canvas.add(isoLine);
  }

  public addArc(canvas: fabric.Canvas): void {
    const arc = new fabric.Path('M 100 100 A 50 50 0 0 1 200 100', {
      left: 150,
      top: 150,
      stroke: 'red',
      strokeWidth: 2,
      fill: '',
    });
    canvas.add(arc);
  }

  public addValve(canvas: fabric.Canvas): void {
    const triangle1 = new fabric.Triangle({
      width: 20,
      height: 30,
      fill: 'black',
      angle: -90,
    });
    const triangle2 = new fabric.Triangle({
      width: 20,
      height: 30,
      fill: 'black',
      angle: 90,
    });

    const width1 = triangle1.get('width') as number;
    triangle1.set('left', -width1);
    triangle2.set('left', 0);

    const valve = new fabric.Group([triangle1, triangle2], {
      left: 250,
      top: 250,
    });

    canvas.add(valve);
  }
}