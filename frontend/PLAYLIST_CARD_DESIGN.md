# Spotify Playlist Card Design Specifications

## Overview
This document details the exact design specifications for the PlaylistCard component, matching the official Spotify design from Figma.

## Design Reference
- **Figma File**: Spotify Music UI Design - Prototype
- **Node ID**: 124:2952 (Frame 7 - Your top mixes section)
- **Design System**: Spotify Dark Theme

## Component Specifications

### Card Container
- **Dimensions**: 224px width (flexible height based on content)
- **Background**: `#181818` (default), `#282828` (hover)
- **Border Radius**: 8px
- **Padding**: 16px (all sides)
- **Transition**: 300ms ease-in-out
- **Hover Effect**: Background color change + play button reveal

### Album Art
- **Dimensions**: 182px × 182px (aspect-square, responsive)
- **Border Radius**: 4px
- **Shadow**: Large shadow on image
- **Position**: Top of card with 16px bottom margin

### Play Button
- **Size**: 48px × 48px circle
- **Background**: `#1ed760` (Spotify green)
- **Hover Background**: `#1fdf64` (lighter green)
- **Position**: Absolute, bottom-right of album art (8px from edges)
- **Icon**: Play triangle (black, filled)
- **Icon Size**: 20px × 20px
- **Shadow**: 2xl shadow
- **Animation**: 
  - Opacity: 0 → 100 on card hover
  - Transform: translateY(8px) → translateY(0) on card hover
  - Scale: 1 → 1.05 on button hover
- **Transition**: 300ms ease-in-out

### Title
- **Font Family**: Circular Std Bold (fallback: system font-bold)
- **Font Size**: 16px (1rem)
- **Font Weight**: 700 (bold)
- **Color**: `#ffffff` (white)
- **Letter Spacing**: -0.02em (tight tracking)
- **Line Height**: 1.2
- **Max Lines**: 1 (line-clamp-1)
- **Hover Effect**: Underline
- **Margin**: 8px top spacing

### Description
- **Font Family**: Circular Std Book (fallback: system font-normal)
- **Font Size**: 14px (0.875rem)
- **Font Weight**: 400 (normal)
- **Color**: `#b3b3b3` (gray)
- **Letter Spacing**: 0
- **Line Height**: 1.5 (relaxed)
- **Max Lines**: 2 (line-clamp-2)
- **Margin**: 8px top spacing

## Color Palette

### Background Colors
```css
--card-bg: #181818;
--card-bg-hover: #282828;
--card-bg-active: #282828;
```

### Text Colors
```css
--text-primary: #ffffff;
--text-secondary: #b3b3b3;
--text-tertiary: #6a6a6a;
```

### Accent Colors
```css
--spotify-green: #1ed760;
--spotify-green-hover: #1fdf64;
--spotify-green-active: #169c46;
```

## Interaction States

### Default State
- Background: `#181818`
- Play button: Hidden (opacity: 0)
- Title: White
- Description: Gray

### Hover State
- Background: `#282828`
- Play button: Visible with slide-up animation
- Title: White with underline on hover
- Cursor: Pointer

### Active/Playing State
- Play button: Visible
- Optional: Add playing indicator (animated bars)

## Responsive Behavior

### Desktop (1024px+)
- Full 224px width
- All features enabled
- Smooth animations

### Tablet (768px - 1023px)
- Flexible width (maintains aspect ratio)
- All features enabled

### Mobile (< 768px)
- Flexible width (maintains aspect ratio)
- Play button always visible (no hover state)
- Reduced padding (12px)

## Grid Layout Recommendations

### Home Page Grid
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
  {playlists.map(playlist => (
    <PlaylistCard key={playlist._id} playlist={playlist} />
  ))}
</div>
```

### Search Results Grid
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
  {playlists.map(playlist => (
    <PlaylistCard key={playlist._id} playlist={playlist} />
  ))}
</div>
```

## Accessibility

- **ARIA Labels**: Play button has `aria-label="Play playlist"`
- **Keyboard Navigation**: Card is focusable and clickable
- **Alt Text**: Album images have descriptive alt text
- **Color Contrast**: Text meets WCAG AA standards
- **Focus Indicators**: Visible focus ring on keyboard navigation

## Implementation Notes

1. **Image Loading**: Uses lazy loading for performance
2. **Error Handling**: Fallback to default image on load error
3. **Click Handling**: 
   - Card click → Navigate to playlist page
   - Play button click → Start playing playlist
4. **State Management**: Uses Zustand for player state
5. **Animations**: CSS transitions for smooth interactions

## Component Props

```typescript
interface PlaylistCardProps {
  playlist: Playlist;           // Required: Playlist data
  showDescription?: boolean;    // Optional: Show/hide description (default: true)
  className?: string;           // Optional: Additional CSS classes
}
```

## Usage Example

```tsx
import { PlaylistCard } from '@/components/playlist/PlaylistCard';

function PlaylistGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {playlists.map(playlist => (
        <PlaylistCard 
          key={playlist._id} 
          playlist={playlist}
          showDescription={true}
        />
      ))}
    </div>
  );
}
```

## Design Comparison

### Before (Generic Card)
- Variable sizes (small/medium/large)
- Generic styling
- Inconsistent spacing
- Basic hover effects

### After (Spotify Design)
- Fixed Spotify dimensions (224px)
- Exact color matching (#181818, #1ed760)
- Precise spacing (16px padding)
- Smooth animations with slide-up play button
- Professional Spotify aesthetic

## References

- [Spotify Design System](https://spotify.design/)
- [Figma Community File](https://www.figma.com/design/VNrtpsglB9zlh3Zsmizahf/)
- [Spotify Web Player](https://open.spotify.com/)
