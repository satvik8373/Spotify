# Spotify Playlist Card - Minimal Design

## Design Changes (Based on Reference Image)

### Key Updates
✅ **Wider image** - Image goes closer to card edges  
✅ **Minimal padding** - Reduced from 16px to 12px  
✅ **No underline** - Title doesn't underline on hover  
✅ **Tighter spacing** - Less space between title and description  
✅ **Cleaner look** - No extra borders or decorations  

## Visual Comparison

### Before (Old Design)
```
┌─────────────────────┐
│  ┌───────────────┐  │ ← 16px padding
│  │               │  │
│  │     Image     │  │
│  │               │  │
│  └───────────────┘  │
│                     │
│  Title (underline)  │ ← Hover underline
│  Description text   │
│                     │
└─────────────────────┘
```

### After (New Minimal Design)
```
┌─────────────────────┐
│ ┌─────────────────┐ │ ← 12px padding
│ │                 │ │
│ │      Image      │ │ ← Wider
│ │                 │ │
│ └─────────────────┘ │
│                     │
│ Title               │ ← No underline
│ Description         │ ← Tighter spacing
└─────────────────────┘
```

## Exact Specifications

### Card Container
- **Padding**: `12px` (was 16px)
- **Border Radius**: `6px` (rounded-md)
- **Background**: `#181818` → `#282828` on hover
- **Transition**: 300ms ease-in-out

### Album Image
- **Width**: Full width minus padding
- **Aspect Ratio**: 1:1 (square)
- **Border Radius**: `6px` (rounded-md)
- **Shadow**: `shadow-2xl` for depth
- **Object Fit**: cover

### Play Button
- **Size**: 48px × 48px
- **Position**: Bottom-right, 8px from edges
- **Background**: `#1ed760` (Spotify green)
- **Hover**: `#1fdf64` + scale(1.05)
- **Animation**: Slide up on card hover
- **Shadow**: `shadow-2xl`

### Title
- **Font**: Bold, 16px
- **Color**: `#ffffff` (white)
- **Line Clamp**: 1 line
- **Tracking**: Tight
- **Hover**: NO underline (removed)

### Description
- **Font**: Normal, 14px
- **Color**: `#a7a7a7` (lighter gray)
- **Line Clamp**: 2 lines
- **Line Height**: Snug (tighter)
- **Spacing**: 4px from title (was 8px)

## Color Palette

```css
/* Card */
--card-bg: #181818;
--card-bg-hover: #282828;

/* Text */
--title-color: #ffffff;
--description-color: #a7a7a7;

/* Accent */
--play-button: #1ed760;
--play-button-hover: #1fdf64;
```

## Code Changes

### Main Changes in PlaylistCard.tsx

1. **Reduced padding**: `p-4` → `p-3` (16px → 12px)
2. **Removed underline**: Removed `hover:underline` from title
3. **Tighter spacing**: `space-y-2` → `space-y-1` (8px → 4px)
4. **Updated text color**: `#b3b3b3` → `#a7a7a7`
5. **Snug line height**: `leading-relaxed` → `leading-snug`
6. **Rounded corners**: `rounded-lg` → `rounded-md` (8px → 6px)

## Grid Layout (6 Playlists)

### Desktop View
```
┌────────────────────────────────────────────────────────────┐
│  Your top mixes                              SEE ALL       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐   │
│  │ IMG │  │ IMG │  │ IMG │  │ IMG │  │ IMG │  │ IMG │   │
│  │  ▶  │  │  ▶  │  │  ▶  │  │  ▶  │  │  ▶  │  │  ▶  │   │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘   │
│  Title    Title    Title    Title    Title    Title      │
│  Artist   Artist   Artist   Artist   Artist   Artist     │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Responsive Grid
- **2xl (1536px+)**: 6 columns
- **xl (1280px+)**: 6 columns
- **lg (1024px+)**: 5 columns
- **md (768px+)**: 4 columns
- **sm (640px+)**: 3 columns
- **mobile (<640px)**: 2 columns

## Usage Example

```tsx
import { PlaylistSection } from '@/components/playlist/PlaylistSection';

// Show 6 playlists in a section
<PlaylistSection
  title="Your top mixes"
  playlists={playlists}
  limit={6}
  showSeeAll={true}
  onSeeAllClick={() => navigate('/library')}
/>
```

## Benefits of Minimal Design

✅ **Cleaner look** - Less visual clutter  
✅ **More focus on images** - Wider album art  
✅ **Better spacing** - Tighter, more professional  
✅ **Matches Spotify** - Exact reference image style  
✅ **No distractions** - No underlines or borders  
✅ **Modern aesthetic** - Minimal and sleek  

## Comparison with Reference Image

### Reference Image Features
- ✅ Wide image to edges
- ✅ Minimal padding
- ✅ Title at bottom (no underline)
- ✅ Description below title
- ✅ Play button on hover
- ✅ Dark background
- ✅ Clean, minimal look

### Our Implementation
- ✅ All features matched
- ✅ Responsive grid layout
- ✅ Smooth animations
- ✅ Spotify green play button
- ✅ Proper typography
- ✅ Hover effects

## Files Updated

1. ✅ `PlaylistCard.tsx` - Main card component
2. ✅ `PlaylistSection.tsx` - Section with 6 cards
3. ✅ `HomePage.tsx` - Using new sections
4. ✅ `SearchPage.tsx` - Updated usage

## Result

The playlist cards now match the exact minimal design from the reference image with:
- Wider images
- Minimal padding
- No underlines
- Tighter spacing
- Clean, professional look
- Perfect 6-card grid layout
