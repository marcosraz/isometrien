import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as fabric from 'fabric';

export interface BOMItem {
  id: string;
  type: string;
  name: string;
  count: number;
  length: number; // in mm
  dn: number; // Diameter nominal
  weightPerUnit: number; // kg per unit or kg per meter for pipes
  totalWeight: number;
  category: 'pipe' | 'valve' | 'fitting' | 'weld' | 'other';
  customProperties?: any;
}

export interface BOMData {
  items: BOMItem[];
  totalWeight: number;
  lastUpdated: Date;
  metadata: {
    pipeLengthsByDN: Record<number, number>;
    valveCountsByType: Record<string, number>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BOMService {
  // Standard DN values according to DIN/EN standards
  public readonly standardDN = [25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];

  // Standard weight per meter for steel pipes by DN (approximated values in kg/m)
  private readonly standardWeights: Record<number, number> = {
    25: 2.5,
    32: 3.2,
    40: 4.0,
    50: 5.0,
    65: 6.5,
    80: 8.0,
    100: 10.0,
    125: 12.5,
    150: 15.0,
    200: 20.0,
    250: 25.0,
    300: 30.0
  };

  // Standard valve weights by type and DN (approximated values in kg)
  private readonly valveWeights: Record<string, Record<number, number>> = {
    'gateValveS': { 25: 5, 32: 6, 40: 7, 50: 9, 65: 12, 80: 15, 100: 20, 125: 25, 150: 30, 200: 40, 250: 50, 300: 60 },
    'gateValveFL': { 25: 6, 32: 7, 40: 8, 50: 10, 65: 13, 80: 16, 100: 22, 125: 27, 150: 32, 200: 42, 250: 52, 300: 62 },
    'globeValveS': { 25: 6, 32: 7, 40: 8, 50: 11, 65: 14, 80: 17, 100: 23, 125: 28, 150: 33, 200: 43, 250: 53, 300: 63 },
    'globeValveFL': { 25: 7, 32: 8, 40: 9, 50: 12, 65: 15, 80: 18, 100: 24, 125: 29, 150: 34, 200: 44, 250: 54, 300: 64 },
    'ballValveS': { 25: 4, 32: 5, 40: 6, 50: 8, 65: 10, 80: 13, 100: 18, 125: 22, 150: 27, 200: 37, 250: 47, 300: 57 },
    'ballValveFL': { 25: 5, 32: 6, 40: 7, 50: 9, 65: 11, 80: 14, 100: 19, 125: 23, 150: 28, 200: 38, 250: 48, 300: 58 }
  };

  private bomDataSubject = new BehaviorSubject<BOMData>({
    items: [],
    totalWeight: 0,
    lastUpdated: new Date(),
    metadata: {
      pipeLengthsByDN: {},
      valveCountsByType: {}
    }
  });

  // Custom settings for user modifications
  private customDNSettings: Record<string, number> = {};
  private customWeightSettings: Record<string, number> = {};

  constructor() {}

  public getBOMData(): Observable<BOMData> {
    return this.bomDataSubject.asObservable();
  }

  public getCurrentBOMData(): BOMData {
    return this.bomDataSubject.value;
  }

  public updateFromCanvas(canvas: fabric.Canvas): void {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const items: BOMItem[] = [];
    const pipeLengthsByDN: Record<number, number> = {};
    const valveCountsByType: Record<string, number> = {};

    // Group objects by type and calculate quantities
    const objectGroups: Record<string, any[]> = {};

    // Debug: Log all objects for analysis
    console.log('📋 BOM: Analyzing', objects.length, 'objects from canvas');

    objects.forEach(obj => {
      // Skip temporary highlight lines and non-relevant objects
      if (this.shouldIgnoreObject(obj)) return;

      // Check both customType and fabric.js type
      const customType = (obj as any).customType;
      const fabricType = obj.type;

      // Use customType if available, otherwise fall back to fabricType
      let objectType = customType || fabricType;

      // Special handling for fabric.js Line objects without customType
      if (!customType && fabricType === 'line') {
        objectType = 'CustomLine'; // Treat regular lines as pipes
      }

      // Filter out dimension parts, anchors, and other helper objects
      const isHelperObject = (obj as any).isDimensionPart ||
                            (obj as any).isAnchor ||
                            (obj as any).isWeldPoint ||
                            (obj as any).isDimension ||
                            (obj as any).isSelection ||
                            (obj as any).isHelper;

      if (isHelperObject) {
        console.log('📋 BOM: Skipping helper object:', {
          type: fabricType,
          customType: customType,
          isDimensionPart: (obj as any).isDimensionPart,
          isAnchor: (obj as any).isAnchor,
          isWeldPoint: (obj as any).isWeldPoint
        });
        return;
      }

      // Debug: Log object types
      console.log('📋 BOM: Object type=', fabricType, 'customType=', customType, 'using=', objectType);

      if (!objectType) return;

      if (!objectGroups[objectType]) {
        objectGroups[objectType] = [];
      }
      objectGroups[objectType].push(obj);
    });

    // Debug: Log grouped objects with details
    console.log('📋 BOM: Grouped objects:', Object.keys(objectGroups));
    Object.entries(objectGroups).forEach(([type, objs]) => {
      console.log(`📋 BOM: Type "${type}": ${objs.length} objects`, {
        sampleObject: objs[0] ? {
          type: objs[0].type,
          customType: (objs[0] as any).customType,
          stroke: objs[0].stroke,
          fill: objs[0].fill,
          path: objs[0].type === 'path' ? (objs[0] as any).path?.slice(0, 2) : undefined
        } : null
      });
    });

    // Process each object type
    Object.entries(objectGroups).forEach(([type, objs]) => {
      console.log('📋 BOM: Processing', objs.length, 'objects of type', type);

      if (this.isPipeType(type)) {
        this.processPipes(objs, items, pipeLengthsByDN);
      } else if (this.isValveType(type)) {
        this.processValves(type, objs, items, valveCountsByType);
      } else if (this.isFittingType(type)) {
        this.processFittings(type, objs, items);
      } else if (this.isArcType(type)) {
        this.processArcs(type, objs, items);
      } else if (type === 'path') {
        // Check if any path objects are pipe arcs
        console.log('📋 BOM: Found path objects, analyzing for pipe arcs...');
        this.processPathObjects(objs, items);
      } else {
        console.log('📋 BOM: Unknown object type:', type, '- skipping');
      }
    });

    // Process welds after all other objects (requires anchor analysis)
    this.processWelds(canvas, items);

    console.log('📋 BOM: Generated', items.length, 'BOM items');

    const totalWeight = items.reduce((sum, item) => sum + item.totalWeight, 0);

    const bomData: BOMData = {
      items,
      totalWeight,
      lastUpdated: new Date(),
      metadata: {
        pipeLengthsByDN,
        valveCountsByType
      }
    };

    this.bomDataSubject.next(bomData);
  }

  private shouldIgnoreObject(obj: fabric.Object): boolean {
    // Ignore temporary highlights, anchors, dimensions, text, etc.
    const customType = (obj as any).customType;
    const isAnchor = (obj as any).isAnchor;
    const isDimensionPart = (obj as any).isDimensionPart;
    const isWeldPoint = (obj as any).isWeldPoint;

    if (isAnchor || isDimensionPart || isWeldPoint) return true;

    // Ignore green highlight lines (temporary visual feedback)
    if (obj.stroke === 'green' && obj.opacity && obj.opacity < 1) return true;

    // Ignore text objects
    if (obj.type === 'i-text' || obj.type === 'text') return true;

    return false;
  }

  private isPipeType(type: string): boolean {
    // Be more specific about what constitutes a pipe type
    const validPipeTypes = ['pipe', 'line', 'CustomLine'];

    // Exclude common non-pipe objects that might be misidentified
    const excludedTypes = ['anchor', 'dimension', 'text', 'welding', 'valve', 'tee', 'circle', 'rect'];

    return validPipeTypes.includes(type) && !excludedTypes.includes(type);
  }

  private isValveType(type: string): boolean {
    return ['gateValveS', 'gateValveFL', 'globeValveS', 'globeValveFL', 'ballValveS', 'ballValveFL'].includes(type);
  }

  private isFittingType(type: string): boolean {
    return ['teeJoint', 'flowArrow'].includes(type);
  }

  private isArcType(type: string): boolean {
    // Detect arc/elbow types - common names for pipe elbows/bends
    return ['arc', 'elbow', 'bend', 'curve', 'bogen', 'krümmer', 'winkel'].includes(type.toLowerCase()) ||
           type.includes('arc') || type.includes('Arc') ||
           type.includes('elbow') || type.includes('Elbow') ||
           type.includes('bend') || type.includes('Bend');
  }

  private processPipes(objs: any[], items: BOMItem[], pipeLengthsByDN: Record<number, number>): void {
    console.log('🔧 BOM: Processing', objs.length, 'pipe objects');

    // Analyze pipe segments individually instead of grouping by DN
    const pipeSegments: Array<{
      pipe: any;
      dn: number;
      length: number;
      segmentId: string;
      isInterrupted: boolean;
    }> = [];

    objs.forEach((pipe, index) => {
      const dn = this.getObjectDN(pipe);
      const length = this.calculatePipeLength(pipe);

      // Filter out very short segments that are likely not real pipes
      const MIN_PIPE_LENGTH = 50; // Minimum 50mm for a real pipe segment

      if (length > MIN_PIPE_LENGTH) {
        // Check if this pipe segment is interrupted by valves or T-pieces
        const isInterrupted = this.isPipeInterrupted(pipe);

        const segment = {
          pipe,
          dn,
          length,
          segmentId: `pipe-segment-${index}`,
          isInterrupted
        };

        console.log('🔧 BOM: Valid pipe segment:', {
          id: segment.segmentId,
          dn: segment.dn,
          length: Math.round(segment.length),
          interrupted: segment.isInterrupted,
          type: pipe.type,
          customType: pipe.customType
        });

        pipeSegments.push(segment);
      } else {
        console.log('🚫 BOM: Skipping too short segment:', {
          length: Math.round(length),
          type: pipe.type,
          customType: pipe.customType,
          reason: 'Below minimum length of ' + MIN_PIPE_LENGTH + 'mm'
        });
      }
    });

    // Create individual BOM items for each pipe segment instead of grouping
    pipeSegments.forEach((segment, index) => {
      // Add to total length tracking by DN
      if (!pipeLengthsByDN[segment.dn]) {
        pipeLengthsByDN[segment.dn] = 0;
      }
      pipeLengthsByDN[segment.dn] += segment.length;

      const weightPerMeter = this.getWeightPerMeter(segment.dn);

      // Create individual pipe segment item
      const item: BOMItem = {
        id: segment.segmentId,
        type: 'Rohr',
        name: `Rohr DN${segment.dn} - Segment ${index + 1}${segment.isInterrupted ? ' (unterbrochen)' : ''}`,
        count: 1, // Each segment is count 1
        length: Math.round(segment.length),
        dn: segment.dn,
        weightPerUnit: weightPerMeter,
        totalWeight: (segment.length / 1000) * weightPerMeter, // Convert mm to m
        category: 'pipe',
        customProperties: {
          segmentNumber: index + 1,
          isInterrupted: segment.isInterrupted,
          originalPipe: segment.pipe
        }
      };

      console.log('🔧 BOM: Created individual pipe segment item:', {
        name: item.name,
        length: item.length,
        weight: item.totalWeight.toFixed(2) + 'kg',
        interrupted: segment.isInterrupted
      });

      items.push(item);
    });

    console.log('🔧 BOM: Total pipe segments created:', pipeSegments.length);
    console.log('🔧 BOM: Pipe lengths by DN:', pipeLengthsByDN);
  }

  private processValves(type: string, objs: any[], items: BOMItem[], valveCountsByType: Record<string, number>): void {
    const count = objs.length;
    valveCountsByType[type] = count;

    if (count > 0) {
      const dn = this.getObjectDN(objs[0]); // Use first valve's DN as default
      const weightPerUnit = this.getValveWeight(type, dn);

      const item: BOMItem = {
        id: `valve-${type}`,
        type: 'Ventil',
        name: this.getValveName(type),
        count: count,
        length: 0,
        dn: dn,
        weightPerUnit: weightPerUnit,
        totalWeight: count * weightPerUnit,
        category: 'valve'
      };

      items.push(item);
    }
  }

  private processFittings(type: string, objs: any[], items: BOMItem[]): void {
    const count = objs.length;

    if (count > 0) {
      const dn = this.getObjectDN(objs[0]);
      const weightPerUnit = this.getFittingWeight(type, dn);

      const item: BOMItem = {
        id: `fitting-${type}`,
        type: 'Formstück',
        name: this.getFittingName(type),
        count: count,
        length: 0,
        dn: dn,
        weightPerUnit: weightPerUnit,
        totalWeight: count * weightPerUnit,
        category: 'fitting'
      };

      items.push(item);
    }
  }

  private processArcs(type: string, objs: any[], items: BOMItem[]): void {
    console.log('🔧 BOM: Processing', objs.length, 'arc objects of type', type);

    // Group arcs by DN for counting
    const arcsByDN: Record<number, any[]> = {};

    objs.forEach(arc => {
      const dn = this.getObjectDN(arc);
      if (!arcsByDN[dn]) {
        arcsByDN[dn] = [];
      }
      arcsByDN[dn].push(arc);
    });

    // Create BOM items for each DN group
    Object.entries(arcsByDN).forEach(([dnStr, arcs]) => {
      const dn = parseInt(dnStr);
      const count = arcs.length;
      const weightPerUnit = this.getArcWeight(dn);

      const item: BOMItem = {
        id: `arc-dn${dn}`,
        type: 'Bogen',
        name: `Bogen DN${dn} (90°)`,
        count: count,
        length: 0, // Arcs don't have length, just count
        dn: dn,
        weightPerUnit: weightPerUnit,
        totalWeight: count * weightPerUnit,
        category: 'fitting',
        customProperties: {
          arcType: type,
          isStandardElbow: true
        }
      };

      console.log('🔧 BOM: Created arc item:', {
        name: item.name,
        count: item.count,
        dn: item.dn,
        weight: item.totalWeight.toFixed(2) + 'kg'
      });

      items.push(item);
    });

    console.log('🔧 BOM: Total arc groups created:', Object.keys(arcsByDN).length);
  }

  private processPathObjects(objs: any[], items: BOMItem[]): void {
    console.log('🔧 BOM: Processing', objs.length, 'path objects');

    // Filter path objects that are pipe arcs (curved paths with quadratic curves)
    const pipeArcs = objs.filter(obj => {
      // Check if this is a pipe arc by looking at the path data
      const pathData = obj.path;
      if (!pathData || !Array.isArray(pathData)) return false;

      // Look for quadratic curve commands (Q) which indicate arcs
      const hasQuadraticCurve = pathData.some(command =>
        Array.isArray(command) && command[0] === 'Q'
      );

      // Also check if it has pipe-like stroke color/properties
      const isPipeStyled = obj.stroke && obj.fill === '';

      console.log('🔧 BOM: Path object analysis:', {
        hasQuadraticCurve,
        isPipeStyled,
        pathData: pathData?.slice(0, 2), // Log first 2 commands for debugging
        stroke: obj.stroke
      });

      return hasQuadraticCurve && isPipeStyled;
    });

    console.log('🔧 BOM: Found', pipeArcs.length, 'pipe arcs in path objects');

    if (pipeArcs.length > 0) {
      // Process the pipe arcs like regular arcs
      this.processArcs('path', pipeArcs, items);
    }
  }

  private processWelds(canvas: fabric.Canvas, items: BOMItem[]): void {
    console.log('🔥 BOM: Processing welds at pipe junction points...');

    // Find all anchor points
    const allObjects = canvas.getObjects();
    const anchors = allObjects.filter(obj => {
      return (obj as any).isAnchor === true ||
             (obj as any).customType === 'anchorPoint';
    }) as fabric.Circle[];

    console.log('🔥 BOM: Found', anchors.length, 'total anchor points');

    // Find all pipe objects to determine start/end points
    const pipeObjects = allObjects.filter(obj => {
      const type = (obj as any).customType || obj.type;
      return this.isPipeType(type) || type === 'path';
    });

    console.log('🔥 BOM: Found', pipeObjects.length, 'pipe objects for analysis');

    // Identify junction welds (anchors that connect multiple pipe segments)
    const junctionWelds: fabric.Circle[] = [];

    anchors.forEach(anchor => {
      // Count how many pipes/paths this anchor is connected to
      const connectedPipes = this.findConnectedPipes(anchor, pipeObjects);

      console.log('🔥 BOM: Anchor at', {
        x: Math.round(anchor.left || 0),
        y: Math.round(anchor.top || 0),
        connectedPipes: connectedPipes.length
      });

      // A weld point exists where 2 or more pipe segments meet
      // But exclude single-pipe start/end points
      if (connectedPipes.length >= 2) {
        junctionWelds.push(anchor);
        console.log('🔥 BOM: ✅ Weld point identified');
      }
    });

    console.log('🔥 BOM: Found', junctionWelds.length, 'junction welds');

    if (junctionWelds.length > 0) {
      // Create BOM entry for welds
      const weldItem: BOMItem = {
        id: 'welds-junction',
        type: 'Schweißnaht',
        name: 'Schweißnähte (Rohrverbindungen)',
        count: junctionWelds.length,
        length: 0, // Welds don't have length
        dn: 50, // Average DN for weight calculation
        weightPerUnit: 0.1, // Minimal weight for welding material
        totalWeight: junctionWelds.length * 0.1,
        category: 'weld',
        customProperties: {
          weldType: 'junction',
          locations: junctionWelds.map(weld => ({
            x: Math.round(weld.left || 0),
            y: Math.round(weld.top || 0)
          }))
        }
      };

      items.push(weldItem);
      console.log('🔥 BOM: Added weld item:', weldItem.name, '- Count:', weldItem.count);
    }
  }

  private findConnectedPipes(anchor: fabric.Circle, pipeObjects: fabric.Object[]): fabric.Object[] {
    const anchorX = anchor.left || 0;
    const anchorY = anchor.top || 0;
    const tolerance = 5; // Tolerance for connection detection

    return pipeObjects.filter(pipe => {
      // Check if this pipe connects to the anchor point
      return this.isPipeConnectedToPoint(pipe, anchorX, anchorY, tolerance);
    });
  }

  private isPipeConnectedToPoint(pipe: fabric.Object, x: number, y: number, tolerance: number): boolean {
    if (pipe.type === 'line') {
      // For line objects, check start and end points
      const line = pipe as fabric.Line;
      const x1 = line.x1 || 0;
      const y1 = line.y1 || 0;
      const x2 = line.x2 || 0;
      const y2 = line.y2 || 0;

      // Transform to global coordinates
      const matrix = pipe.calcTransformMatrix();
      const point1 = fabric.util.transformPoint({ x: x1, y: y1 }, matrix);
      const point2 = fabric.util.transformPoint({ x: x2, y: y2 }, matrix);

      const dist1 = Math.sqrt((point1.x - x) ** 2 + (point1.y - y) ** 2);
      const dist2 = Math.sqrt((point2.x - x) ** 2 + (point2.y - y) ** 2);

      return dist1 <= tolerance || dist2 <= tolerance;
    } else if (pipe.type === 'path') {
      // For path objects (arcs), check if any part is near the point
      const pathBounds = pipe.getBoundingRect();
      const centerX = pathBounds.left + pathBounds.width / 2;
      const centerY = pathBounds.top + pathBounds.height / 2;

      // Simplified check: if anchor is near the path bounding area
      const dist = Math.sqrt((centerX - x) ** 2 + (centerY - y) ** 2);
      return dist <= tolerance + Math.max(pathBounds.width, pathBounds.height) / 2;
    }

    return false;
  }

  private calculatePipeLength(pipe: any): number {
    // Handle both regular lines and CustomLine objects
    if (pipe.type === 'line' || pipe.customType === 'CustomLine') {
      let x1, y1, x2, y2;

      // For CustomLine objects, use calcLinePoints method if available
      if (pipe.calcLinePoints && typeof pipe.calcLinePoints === 'function') {
        const coords = pipe.calcLinePoints();
        x1 = coords.x1 || 0;
        y1 = coords.y1 || 0;
        x2 = coords.x2 || 0;
        y2 = coords.y2 || 0;
      } else {
        // Fallback to direct properties
        x1 = pipe.x1 || 0;
        y1 = pipe.y1 || 0;
        x2 = pipe.x2 || 0;
        y2 = pipe.y2 || 0;
      }

      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      console.log('📏 BOM: Calculated line length:', length, 'for coords:', { x1, y1, x2, y2 });
      return length;
    } else if (pipe.type === 'path') {
      // For complex pipe paths, estimate length from path data
      return this.estimatePathLength(pipe);
    }
    console.log('📏 BOM: Unknown pipe type for length calculation:', pipe.type, pipe.customType);
    return 0;
  }

  private estimatePathLength(path: any): number {
    // Simplified path length calculation
    // In a real implementation, you'd parse the SVG path and calculate actual length
    const bounds = path.getBoundingRect();
    return Math.sqrt(Math.pow(bounds.width, 2) + Math.pow(bounds.height, 2));
  }

  public isPipeInterrupted(pipe: any): boolean {
    // Enhanced pipe interruption analysis with topology detection
    const length = this.calculatePipeLength(pipe);

    // Check for explicit interruption markers from pipe creation
    const hasAssociatedComponents = (pipe as any).associatedLines ||
                                   (pipe as any).associatedComponents ||
                                   (pipe as any).isInterrupted;

    // Check pipe length - only very short segments indicate interruption by components
    const isVeryShort = length < 80; // Only pipes less than 80mm indicate likely interruption

    // Check for component markers
    const hasInterruptionMarkers = (pipe as any).hasValve ||
                                  (pipe as any).hasTee ||
                                  (pipe as any).isSplit ||
                                  (pipe as any).splitByComponent;

    // Additional heuristics based on pipe properties
    const pipePosition = { x: pipe.left || 0, y: pipe.top || 0 };

    // Check if pipe name or ID suggests it's a segment
    const nameIndicatesSegment = pipe.name && (
      pipe.name.includes('segment') ||
      pipe.name.includes('teil') ||
      pipe.name.includes('abschnitt')
    );

    // For CustomLine types, check for specific splitting indicators
    const isCustomLineSegment = pipe.customType === 'CustomLine' && (
      pipe.lineId !== undefined ||
      pipe.pipeId !== undefined ||
      pipe.segmentId !== undefined
    );

    // Determine interruption based on multiple factors - be more conservative
    // Only mark as interrupted if there are strong indicators
    const strongIndicators = hasAssociatedComponents || hasInterruptionMarkers;
    const weakIndicators = isVeryShort || nameIndicatesSegment || isCustomLineSegment;

    // Require strong indicators OR multiple weak indicators for interruption
    const isInterrupted = strongIndicators || (weakIndicators && (isVeryShort && nameIndicatesSegment));

    console.log('🔍 BOM: Enhanced pipe interruption analysis:', {
      id: pipe.id || 'unnamed',
      customType: pipe.customType,
      length: Math.round(length),
      strongIndicators,
      weakIndicators,
      hasAssociatedComponents,
      hasInterruptionMarkers,
      isVeryShort,
      nameIndicatesSegment,
      isCustomLineSegment,
      result: isInterrupted
    });

    return isInterrupted;
  }

  private analyzeCanvasTopology(canvas: fabric.Canvas): {
    pipeConnections: Map<any, any[]>;
    componentLocations: Array<{ component: any; type: string; position: { x: number; y: number } }>;
  } {
    // Analyze the entire canvas to understand how pipes are connected and interrupted
    const objects = canvas.getObjects();
    const pipeConnections = new Map();
    const componentLocations: Array<{ component: any; type: string; position: { x: number; y: number } }> = [];

    // Find all valves and T-pieces
    objects.forEach(obj => {
      const customType = (obj as any).customType;

      if (this.isValveType(customType) || this.isFittingType(customType)) {
        componentLocations.push({
          component: obj,
          type: customType,
          position: { x: obj.left || 0, y: obj.top || 0 }
        });
      }
    });

    console.log('🗺️ BOM: Found components on canvas:', componentLocations.length);

    return { pipeConnections, componentLocations };
  }

  private getObjectDN(obj: any): number {
    // Check for custom DN setting first
    const objectId = this.getObjectId(obj);
    if (this.customDNSettings[objectId]) {
      return this.customDNSettings[objectId];
    }

    // Default DN based on object properties or standard value
    return obj.dn || 50; // Default to DN50
  }

  private getObjectId(obj: any): string {
    return obj.id || `${obj.type}-${obj.left}-${obj.top}`;
  }

  private getWeightPerMeter(dn: number): number {
    const objectKey = `pipe-dn${dn}`;
    if (this.customWeightSettings[objectKey]) {
      return this.customWeightSettings[objectKey];
    }
    return this.standardWeights[dn] || 10; // Default weight
  }

  private getValveWeight(type: string, dn: number): number {
    const objectKey = `valve-${type}-dn${dn}`;
    if (this.customWeightSettings[objectKey]) {
      return this.customWeightSettings[objectKey];
    }
    return this.valveWeights[type]?.[dn] || 20; // Default valve weight
  }

  private getFittingWeight(type: string, dn: number): number {
    const objectKey = `fitting-${type}-dn${dn}`;
    if (this.customWeightSettings[objectKey]) {
      return this.customWeightSettings[objectKey];
    }
    // Simplified fitting weights
    return Math.max(5, dn * 0.1); // Basic calculation
  }

  private getArcWeight(dn: number): number {
    const objectKey = `arc-dn${dn}`;
    if (this.customWeightSettings[objectKey]) {
      return this.customWeightSettings[objectKey];
    }

    // Standard arc/elbow weights based on DN
    const standardArcWeights: Record<number, number> = {
      15: 0.3,   // DN15 elbow ~0.3kg
      20: 0.4,   // DN20 elbow ~0.4kg
      25: 0.6,   // DN25 elbow ~0.6kg
      32: 0.8,   // DN32 elbow ~0.8kg
      40: 1.2,   // DN40 elbow ~1.2kg
      50: 1.8,   // DN50 elbow ~1.8kg
      65: 2.5,   // DN65 elbow ~2.5kg
      80: 3.2,   // DN80 elbow ~3.2kg
      100: 4.5,  // DN100 elbow ~4.5kg
      125: 6.8,  // DN125 elbow ~6.8kg
      150: 9.5,  // DN150 elbow ~9.5kg
      200: 16.0, // DN200 elbow ~16kg
      250: 25.0, // DN250 elbow ~25kg
      300: 35.0  // DN300 elbow ~35kg
    };

    return standardArcWeights[dn] || (dn / 50) * 1.8; // Fallback formula based on DN
  }

  private getValveName(type: string): string {
    const names: Record<string, string> = {
      'gateValveS': 'Gate Valve S',
      'gateValveFL': 'Gate Valve FL',
      'globeValveS': 'Globe Valve S',
      'globeValveFL': 'Globe Valve FL',
      'ballValveS': 'Ball Valve S',
      'ballValveFL': 'Ball Valve FL'
    };
    return names[type] || type;
  }

  private getFittingName(type: string): string {
    const names: Record<string, string> = {
      'teeJoint': 'T-Stück',
      'flowArrow': 'Fließrichtung'
    };
    return names[type] || type;
  }

  // Public methods for updating custom settings
  public updateItemDN(itemId: string, newDN: number): void {
    this.customDNSettings[itemId] = newDN;
    // Trigger recalculation
    this.recalculateWeights();
  }

  public updateItemWeight(itemId: string, newWeight: number): void {
    this.customWeightSettings[itemId] = newWeight;
    this.recalculateWeights();
  }

  private recalculateWeights(): void {
    const currentData = this.bomDataSubject.value;
    const updatedItems = currentData.items.map(item => {
      const newWeightPerUnit = this.getUpdatedWeight(item);
      return {
        ...item,
        weightPerUnit: newWeightPerUnit,
        totalWeight: item.category === 'pipe'
          ? (item.length / 1000) * newWeightPerUnit
          : item.count * newWeightPerUnit
      };
    });

    const totalWeight = updatedItems.reduce((sum, item) => sum + item.totalWeight, 0);

    this.bomDataSubject.next({
      ...currentData,
      items: updatedItems,
      totalWeight,
      lastUpdated: new Date()
    });
  }

  private getUpdatedWeight(item: BOMItem): number {
    const objectKey = `${item.category}-${item.type.toLowerCase()}-dn${item.dn}`;
    if (this.customWeightSettings[objectKey]) {
      return this.customWeightSettings[objectKey];
    }
    return item.weightPerUnit;
  }

  // Export functionality
  public exportToCSV(): string {
    const data = this.bomDataSubject.value;
    const headers = ['Typ', 'Name', 'Anzahl', 'Länge (mm)', 'DN', 'Gewicht/Einheit (kg)', 'Gesamtgewicht (kg)'];

    let csv = headers.join(',') + '\n';

    data.items.forEach(item => {
      const row = [
        item.type,
        item.name,
        item.count,
        item.length,
        item.dn,
        item.weightPerUnit.toFixed(2),
        item.totalWeight.toFixed(2)
      ];
      csv += row.join(',') + '\n';
    });

    csv += `\nGesamtgewicht:,${data.totalWeight.toFixed(2)} kg\n`;
    csv += `Erstellt am:,${data.lastUpdated.toLocaleDateString('de-DE')}\n`;

    return csv;
  }

  public exportToJSON(): string {
    return JSON.stringify(this.bomDataSubject.value, null, 2);
  }

  public downloadCSV(): void {
    const csv = this.exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `BOM_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public downloadJSON(): void {
    const json = this.exportToJSON();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `BOM_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}