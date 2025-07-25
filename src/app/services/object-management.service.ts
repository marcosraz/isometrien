import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

@Injectable({
  providedIn: 'root',
})
export class ObjectManagementService {
  constructor() {}

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
    if (activeObject) {
      if (activeObject.type === 'activeSelection') {
        (activeObject as fabric.ActiveSelection).forEachObject((obj) => {
          canvas.remove(obj);
        });
      }
      canvas.remove(activeObject);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  }

  public isEditingText(canvas: fabric.Canvas): boolean {
    const activeObject = canvas.getActiveObject();
    return activeObject instanceof fabric.IText && activeObject.isEditing;
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