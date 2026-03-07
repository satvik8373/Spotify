# FloatingLines Component Setup Guide

## Installation

1. Install three.js dependency:
```bash
cd frontend
npm install three @types/three
```

## What Was Created

The AI Mood Playlist page has been updated with the FloatingLines animated background component matching your design theme.

### Files Created/Updated

1. **frontend/src/components/ui/FloatingLines.tsx** - Main animated background component
2. **frontend/src/components/ui/FloatingLines.css** - Component styles
3. **frontend/src/pages/MoodPlaylistPage.tsx** - Updated to integrate FloatingLines with MoodPlaylistGenerator
4. **frontend/src/pages/MoodPlaylistPage.css** - Updated with purple/pink gradient theme

### Integration

The page now includes:
- Animated wave background with interactive mouse tracking
- Purple/pink gradient theme (#e947f5, #a855f7, #6366f1)
- Dark gradient background (#0a0a1f to #2d1b4e)
- Full integration with existing MoodPlaylistGenerator component
- Parallax and bend effects on mouse movement

## Theme Colors Used

Based on your design image:

- Primary Pink: `#e947f5`
- Purple: `#a855f7`
- Blue: `#6366f1`
- Dark Background: `#0a0a1f` to `#2d1b4e` (gradient)

## FloatingLines Props

```tsx
<FloatingLines
  enabledWaves={['top', 'middle', 'bottom']}  // Which wave layers to show
  lineCount={5}                                // Number of lines per wave
  lineDistance={5}                             // Distance between lines
  bendRadius={5}                               // Radius of mouse bend effect
  bendStrength={-0.5}                          // Strength of bend effect
  interactive={true}                           // Enable mouse interaction
  parallax={true}                              // Enable parallax effect
  linesGradient={['#e947f5', '#a855f7', '#6366f1']}  // Gradient colors
  mixBlendMode="screen"                        // CSS blend mode
/>
```

## Next Steps

1. Run `npm install three @types/three` in the frontend directory
2. The page is already integrated and ready to use at `/mood-playlist`
3. The existing MoodPlaylistGenerator component works seamlessly with the new background
4. Navigate to the AI Mood Generator from the sidebar to see it in action

## Route

The page is accessible at: `/mood-playlist`

It's already registered in the app routes and linked from the sidebar as "AI Mood Generator".
