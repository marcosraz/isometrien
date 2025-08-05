# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular-based isometric drawing application that allows users to create technical drawings with isometric lines, pipes, dimensions, and text annotations. The application uses Fabric.js as the canvas library for rendering and interaction.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:4200/)
npm start

# Start with hot-reload - EMPFOHLEN für Entwicklung!
npm run dev

# Build for production
npm run build

# Run unit tests with Karma
npm run test

# Watch mode for development builds
npm run watch
```

### Hot-Reload für Entwicklung
**WICHTIG**: Verwende `npm run dev` anstatt `npm start` für automatisches Neuladen bei Code-Änderungen. Dies vermeidet manuelles Neustarten des Servers.

## Architecture Overview

### Service Architecture

The application follows a service-oriented architecture with clear separation of concerns:

1. **DrawingService** (`src/app/services/drawing.service.ts`): Main orchestrator that manages the Fabric.js canvas and coordinates all drawing operations. Routes user interactions to specialized services based on the current drawing mode.

2. **LineDrawingService** (`src/app/services/line-drawing.service.ts`): Handles creation and editing of lines and pipes with sophisticated anchor point management and automatic corner rounding for pipe joints.

3. **DimensionService** (`src/app/services/dimension.service.ts`): Manages dimension annotations with a three-step process (start → end → position) and automatic distance calculations.

4. **ObjectManagementService** (`src/app/services/object-management.service.ts`): Handles general object operations including text creation/editing, grouping/ungrouping, and predefined object templates (valves, arcs).

5. **IsometryService** (`src/app/services/isometry.service.ts`): Mathematical utility service providing geometric calculations for rounded pipe corners and SVG path generation.

### Drawing Modes

The application operates in different modes managed by DrawingService:
- `idle`: Default selection/interaction mode
- `addLine`: Straight line drawing mode
- `addPipe`: Multi-point pipe drawing with rounded corners
- `dimension`: Dimensioning mode for adding measurements
- `text`: Text annotation mode

### Key Technical Details

- Uses Angular 20 with standalone components
- Fabric.js 6.7.1 for canvas manipulation
- SCSS for styling with component-scoped styles
- TypeScript with strict type checking
- Karma/Jasmine for unit testing

## Testing

Run unit tests for specific services:
```bash
# Run all tests
ng test

# Run tests in watch mode (automatically re-runs on changes)
ng test --watch
```