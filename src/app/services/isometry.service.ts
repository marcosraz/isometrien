import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

@Injectable({
  providedIn: 'root',
})
export class IsometryService {
  constructor() {}

  public generateRoundedPathData(
    points: fabric.Point[],
    cornerRadius: number
  ): string {
    if (points.length < 2) return '';

    let pathData = `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) {
      pathData += ` L ${points[1].x} ${points[1].y}`;
      return pathData;
    }

    for (let i = 1; i < points.length - 1; i++) {
      const pPrev = points[i - 1];
      const pCurr = points[i];
      const pNext = points[i + 1];

      const v1 = pPrev.subtract(pCurr);
      const v2 = pNext.subtract(pCurr);
      const lenV1 = Math.hypot(v1.x, v1.y);
      const lenV2 = Math.hypot(v2.x, v2.y);

      if (lenV1 === 0 || lenV2 === 0) continue;

      const angle = Math.acos((v1.x * v2.x + v1.y * v2.y) / (lenV1 * lenV2));

      if (isNaN(angle)) continue;

      let tangentDist = cornerRadius / Math.tan(angle / 2);
      tangentDist = Math.min(tangentDist, lenV1 / 2, lenV2 / 2);

      const radius = tangentDist * Math.tan(angle / 2);

      const t1 = pCurr.add(
        new fabric.Point(
          (v1.x * tangentDist) / lenV1,
          (v1.y * tangentDist) / lenV1
        )
      );
      const t2 = pCurr.add(
        new fabric.Point(
          (v2.x * tangentDist) / lenV2,
          (v2.y * tangentDist) / lenV2
        )
      );

      const sweepFlag = v1.x * v2.y - v1.y * v2.x < 0 ? 1 : 0;

      pathData += ` L ${t1.x} ${t1.y}`;
      pathData += ` A ${radius} ${radius} 0 0 ${sweepFlag} ${t2.x} ${t2.y}`;
    }

    pathData += ` L ${points[points.length - 1].x} ${
      points[points.length - 1].y
    }`;
    return pathData;
  }
}
