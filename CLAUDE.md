# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Angular-based isometric technical drawing application using Fabric.js for canvas rendering. Enables creation of isometric pipes, lines, dimensions, welding symbols, and text annotations with comprehensive state management.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot-reload (RECOMMENDED)
npm run dev

# Start dev server on specific port
npm run dev -- --port 4206

# Production build
npm run build

# Run unit tests
npm run test

# Run tests in watch mode
npm run test --watch
```

**Important**: Always use `npm run dev` for development to enable hot-reload with HMR (Hot Module Replacement).

## Architecture Overview

### Core Service Architecture

The application uses a service-oriented architecture with clear separation of concerns:

1. **DrawingService** (`src/app/services/drawing.service.ts`)
   - Central orchestrator for all drawing operations
   - Routes mouse events to appropriate specialized services based on drawing mode
   - Manages mode transitions and cleanup between different drawing tools
   - Drawing modes: `idle`, `addLine`, `addPipe`, `dimension`, `text`, `addAnchors`, `weldstamp`, `welderstamp`, `welderstampempty`, `welderstampas`, `weld`, `fluidstamp`, `spool`

2. **LineDrawingService** (`src/app/services/line-drawing.service.ts`)
   - Handles line and pipe creation with anchor points
   - Implements sophisticated pipe routing with automatic corner rounding
   - Manages editable lines/pipes with draggable anchor points
   - Shift key for 30° angle snapping, Ctrl for orthogonal constraints

3. **StateManagementService** (`src/app/services/state-management.service.ts`)
   - Implements comprehensive undo/redo system (50 state limit)
   - Wraps all drawing operations with `executeOperation()` for automatic state saving
   - Serializes both canvas state and service-specific metadata
   - Restores complex object relationships and event handlers after state changes

4. **WeldingService** (`src/app/services/welding.service.ts`)
   - Manages 6 types of welding symbols with two-click placement
   - Implements anchor point snapping with visual feedback
   - Double-click editing for all symbol numbers/text
   - Maintains persistent counters for each symbol type

5. **DimensionService** (`src/app/services/dimension.service.ts`)
   - Three-step dimension creation: start point → end point → label position
   - Automatic distance calculation with unit display
   - Editable dimension text via double-click
   - Smart anchor highlighting during dimension mode

6. **ObjectManagementService** (`src/app/services/object-management.service.ts`)
   - Text creation and editing with IText objects
   - Group/ungroup operations
   - Predefined shapes (valves, arcs)
   - Spool numbering system with auto-increment

7. **IsometryService** (`src/app/services/isometry.service.ts`)
   - Mathematical calculations for isometric projections
   - SVG path generation for rounded pipe corners
   - Geometric utilities for angle calculations

### Key Architectural Patterns

#### State Management Pattern
All modifying operations follow this pattern:
```typescript
this.stateManagement.executeOperation('Operation Name', () => {
  // Perform canvas modifications
});
```

#### Service Initialization Chain
Services are connected through dependency injection with explicit state management setup:
```typescript
// In DrawingService constructor
this.lineDrawingService.setStateManagement(this.stateManagementService);
this.dimensionService.setStateManagement(this.stateManagementService);
// ... etc
```

#### Two-Phase Object Creation
Welding stamps and complex objects use a consistent pattern:
1. Public method with state management wrapper
2. Private internal method with actual implementation
3. Automatic state saving after creation

### Canvas Event Flow

1. **Mouse Events**: Canvas → DrawingService → Specialized Service
2. **Keyboard Events**: Document listeners in individual services
3. **Object Events**: Direct Fabric.js event handlers with state management hooks

### Important Implementation Details

#### Fabric.js Custom Properties
The following custom properties must be included in serialization:
- `customType`, `isDimensionPart`, `dimensionId`, `isWeldPoint`
- `data`, `reusable`, `originalFill`, `associatedLines`
- `isAnchor`, `lineId`, `anchorIndex`, `pipeId`

#### Anchor Point System
- Circles with `isAnchor: true` property serve as connection points
- Highlighted in green when hovering during dimension/welding modes
- Shift key enables snapping to nearest anchor during drawing

#### Object Relationships
- Lines/pipes maintain references to their anchor points
- Dimensions reference their anchor points and label
- Welding symbols can reference connection lines
- Groups preserve internal object relationships

## Technical Stack

- **Angular 20** with standalone components
- **Fabric.js 6.7.1** for canvas manipulation
- **TypeScript** with strict type checking
- **RxJS** for reactive patterns
- **SCSS** with component-scoped styling
- **Karma/Jasmine** for unit testing

## Common Development Tasks

### Adding a New Drawing Mode
1. Add mode to type definitions in DrawingService and LineDrawingService
2. Implement mode handling in DrawingService.setDrawingMode()
3. Add mouse event handlers in appropriate service
4. Create toolbar button in ToolbarComponent
5. Wrap creation operations with StateManagementService.executeOperation()

### Testing on Different Ports
When port conflicts occur:
```bash
# Kill process on Windows
taskkill //F //PID [process_id]

# Find process using port
netstat -ano | findstr :4206
```

### State Management Integration
For any new feature that modifies canvas:
1. Add service reference to StateManagementService
2. Implement serialization methods if needed
3. Use executeOperation() wrapper for all modifications
4. Test undo/redo functionality thoroughly