# Anchor Point Connection Test Guide

## What's New
The anchor point connection system has been enhanced to make it easier to connect pipelines and lines to existing anchor points.

### Key Improvements:

1. **Automatic Snapping** - Lines and pipes now automatically snap to anchor points when you get within 20 pixels of them (no need to hold Ctrl)

2. **Visual Feedback**:
   - Anchor points turn **green** when you're about to snap to them
   - A dashed green circle appears around the anchor point showing the snap zone
   - Preview lines turn green when snapping is active

3. **Increased Snap Distance** - The snap detection radius has been increased from 30px to 50px for easier targeting

4. **Support for Valve Anchors** - The system now also recognizes anchor points created by valves (marked with `isAnchor` property)

### How to Test:

1. **Test Line Snapping**:
   - Click the "Line" tool in the toolbar
   - Move your cursor near an existing anchor point
   - You should see the anchor turn green and a dashed circle appear
   - Click to start the line - it should snap to the anchor
   - Move to another anchor point and click to complete the line

2. **Test Pipe Snapping**:
   - Click the "Pipe" tool in the toolbar
   - Move near an anchor point - you should see the visual feedback
   - Click to start the pipe at the anchor
   - Add intermediate points as needed
   - Move to another anchor to connect the end
   - Press ESC or double-click to finish the pipe

3. **Test with Valves**:
   - Place a valve on a line (this creates anchor points)
   - Try connecting new lines/pipes to the valve's anchor points

4. **Test Mixed Mode**:
   - Hold **Shift** for angle snapping (15°/30°/45° depending on settings)
   - Hold **Ctrl** to force anchor snapping even from further away
   - Both modes can work together

### Visual Indicators:
- **Green anchor point** = Ready to snap
- **Green dashed circle** = Snap zone indicator  
- **Green preview line** = Will snap when you click

The application is running on port 4207: http://localhost:4207