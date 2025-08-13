## Welding Issues
- Problem with welding points snapping to points instead of lines when using Shift key

## Server Setup
- To start the Angular development server: `cd isometrien && npm start`
- Default port: 4200 (accessible at http://localhost:4200/)
- To use alternative port: `npm start -- --port=4201`
- SCSS Warnings: The project uses deprecated Sass functions (lighten()) that should be replaced with color.adjust() or color.scale()
- Server starts successfully in ~5 seconds with watch mode enabled