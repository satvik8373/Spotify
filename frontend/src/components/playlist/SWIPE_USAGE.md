# Swipe Card Usage Guide

## Overview
The SwipeCard component adds swipe gesture support to playlist cards, allowing users to swipe left or right to trigger actions.

## Components

### SwipeCard
A wrapper component that detects swipe gestures on touch and mouse devices.

**Props:**
- `onSwipeLeft?: () => void` - Callback when user swipes left
- `onSwipeRight?: () => void` - Callback when user swipes right
- `children: ReactNode` - The content to wrap (usually a PlaylistCard)

**Features:**
- ✅ Touch device support (mobile/tablet)
- ✅ Mouse support (desktop)
- ✅ 60px swipe threshold
- ✅ No visual effects (clean swipe detection)
- ✅ User-select disabled during swipe

## Usage Examples

### 1. Basic Usage with PlaylistCard

```tsx
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { SwipeCard } from '@/components/playlist/SwipeCard';

function MyComponent() {
  const handleSwipeLeft = () => {
    console.log('Swiped left - maybe remove from favorites');
  };

  const handleSwipeRight = () => {
    console.log('Swiped right - maybe add to queue');
  };

  return (
    <SwipeCard 
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
    >
      <PlaylistCard playlist={myPlaylist} />
    </SwipeCard>
  );
}
```

### 2. Using PlaylistSection with Swipe

```tsx
import { PlaylistSection } from '@/components/playlist/PlaylistSection';

function HomePage() {
  return (
    <PlaylistSection
      title="Your top mixes"
      playlists={playlists}
      limit={6}
      enableSwipe={true}  // Enable swipe on all cards
      showSeeAll={true}
      onSeeAllClick={() => navigate('/library')}
    />
  );
}
```

### 3. Custom Swipe Actions

```tsx
import { SwipeCard } from '@/components/playlist/SwipeCard';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { toast } from 'sonner';

function PlaylistGrid({ playlists }) {
  const handleAddToQueue = (playlist) => {
    // Add playlist to queue
    addToQueue(playlist);
    toast.success(`Added ${playlist.name} to queue`);
  };

  const handleRemoveFromLibrary = (playlist) => {
    // Remove from library
    removeFromLibrary(playlist);
    toast.success(`Removed ${playlist.name} from library`);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {playlists.map(playlist => (
        <SwipeCard
          key={playlist._id}
          onSwipeRight={() => handleAddToQueue(playlist)}
          onSwipeLeft={() => handleRemoveFromLibrary(playlist)}
        >
          <PlaylistCard playlist={playlist} />
        </SwipeCard>
      ))}
    </div>
  );
}
```

## Swipe Gestures

### Swipe Right (→)
**Threshold:** 60px to the right  
**Common Actions:**
- Add to queue
- Add to favorites
- Like playlist
- Save for later

### Swipe Left (←)
**Threshold:** 60px to the left  
**Common Actions:**
- Remove from library
- Hide playlist
- Unlike
- Skip

## Design Specifications

### PlaylistCard with Swipe
```
┌─────────────────────────┐
│  ┌───────────────────┐  │ ← 16px padding
│  │                   │  │
│  │       Image       │  │
│  │                   │  │
│  │         ▶         │  │ ← Play button
│  └───────────────────┘  │
│                         │
│  Title                  │ ← Bottom aligned
│  Description            │ ← Tight spacing
│                         │
└─────────────────────────┘
   ← Swipe →
```

### Card Specifications
- **Padding**: 16px (p-4)
- **Border Radius**: 8px (rounded-lg)
- **Background**: #181818 → #282828 on hover
- **Image**: Full width, 4px border radius
- **Title**: Bottom aligned, no underline
- **Description**: Tight spacing below title

## Implementation Details

### Swipe Detection
```typescript
const SWIPE_THRESHOLD = 60; // pixels

// Detect swipe direction
if (deltaX > SWIPE_THRESHOLD) {
  // Swiped right
  onSwipeRight();
} else if (deltaX < -SWIPE_THRESHOLD) {
  // Swiped left
  onSwipeLeft();
}
```

### Touch Events
- `onTouchStart` - Record start position
- `onTouchEnd` - Calculate swipe distance and direction

### Mouse Events
- `onMouseDown` - Record start position
- `onMouseUp` - Calculate swipe distance and direction

## Best Practices

### 1. Provide Visual Feedback
```tsx
const [swiping, setSwiping] = useState(false);

<SwipeCard
  onSwipeLeft={() => {
    setSwiping(true);
    // Perform action
    setTimeout(() => setSwiping(false), 300);
  }}
>
  <PlaylistCard 
    playlist={playlist}
    className={swiping ? 'opacity-50' : ''}
  />
</SwipeCard>
```

### 2. Confirm Destructive Actions
```tsx
const handleRemove = (playlist) => {
  if (confirm(`Remove ${playlist.name}?`)) {
    removePlaylist(playlist._id);
  }
};

<SwipeCard onSwipeLeft={() => handleRemove(playlist)}>
  <PlaylistCard playlist={playlist} />
</SwipeCard>
```

### 3. Show Toast Notifications
```tsx
import { toast } from 'sonner';

<SwipeCard
  onSwipeRight={() => {
    addToFavorites(playlist);
    toast.success('Added to favorites');
  }}
  onSwipeLeft={() => {
    removeFromFavorites(playlist);
    toast.error('Removed from favorites');
  }}
>
  <PlaylistCard playlist={playlist} />
</SwipeCard>
```

## Mobile Optimization

### Touch-Friendly
- ✅ 60px threshold (easy to trigger)
- ✅ No accidental swipes
- ✅ Works with scrolling
- ✅ Smooth gesture detection

### Performance
- ✅ No re-renders during swipe
- ✅ Lightweight event handlers
- ✅ No visual effects (no lag)
- ✅ Fast response time

## Accessibility

### Keyboard Support
Swipe actions should also be accessible via keyboard:

```tsx
<div
  onKeyDown={(e) => {
    if (e.key === 'ArrowRight') handleSwipeRight();
    if (e.key === 'ArrowLeft') handleSwipeLeft();
  }}
  tabIndex={0}
>
  <SwipeCard onSwipeLeft={...} onSwipeRight={...}>
    <PlaylistCard playlist={playlist} />
  </SwipeCard>
</div>
```

## Common Use Cases

### 1. Queue Management
```tsx
// Swipe right to add to queue
<SwipeCard onSwipeRight={() => addToQueue(playlist)}>
  <PlaylistCard playlist={playlist} />
</SwipeCard>
```

### 2. Favorites
```tsx
// Swipe right to favorite, left to unfavorite
<SwipeCard
  onSwipeRight={() => addToFavorites(playlist)}
  onSwipeLeft={() => removeFromFavorites(playlist)}
>
  <PlaylistCard playlist={playlist} />
</SwipeCard>
```

### 3. Library Management
```tsx
// Swipe left to remove from library
<SwipeCard onSwipeLeft={() => removeFromLibrary(playlist)}>
  <PlaylistCard playlist={playlist} />
</SwipeCard>
```

### 4. Playlist Reordering
```tsx
// Swipe to change order
<SwipeCard
  onSwipeRight={() => moveUp(playlist)}
  onSwipeLeft={() => moveDown(playlist)}
>
  <PlaylistCard playlist={playlist} />
</SwipeCard>
```

## Testing

### Desktop (Mouse)
1. Click and hold on card
2. Drag left or right > 60px
3. Release mouse button
4. Action should trigger

### Mobile (Touch)
1. Touch and hold on card
2. Swipe left or right > 60px
3. Release touch
4. Action should trigger

## Troubleshooting

### Swipe Not Working
- Check threshold (default 60px)
- Verify callbacks are provided
- Check for conflicting event handlers
- Ensure user-select is disabled

### Accidental Swipes
- Increase threshold value
- Add debouncing
- Require faster swipe velocity

### Conflicts with Scrolling
- SwipeCard only triggers on horizontal swipes
- Vertical scrolling should work normally
- Test on actual mobile devices

## Files

- `SwipeCard.tsx` - Swipe detection component
- `PlaylistCard.tsx` - Card with proper positioning
- `PlaylistSection.tsx` - Section with optional swipe support
- `SWIPE_USAGE.md` - This documentation

## Future Enhancements

- [ ] Visual swipe indicator
- [ ] Swipe velocity detection
- [ ] Configurable threshold
- [ ] Swipe animation
- [ ] Undo action support
- [ ] Haptic feedback (mobile)
