# HomePage Playlist Layout

## Overview
The HomePage now displays multiple playlist sections, each showing 6 playlists per row in a responsive grid.

## Playlist Sections

### 1. Your Top Mixes (Public Playlists)
**Title:** "Your top mixes"  
**Source:** `publicPlaylists` (first 6)  
**Limit:** 6 playlists  
**Swipe:** Disabled  
**Condition:** `isOnline && publicPlaylists.length > 0`

```tsx
<PlaylistSection
  title="Your top mixes"
  playlists={publicPlaylists.filter(playlist => playlist.isPublic !== false)}
  limit={6}
  showSeeAll={true}
  onSeeAllClick={() => navigate('/library')}
  enableSwipe={false}
/>
```

### 2. Your Playlists (User's Own Playlists)
**Title:** "Your Playlists"  
**Source:** `userPlaylists`  
**Limit:** 6 playlists  
**Swipe:** Enabled (for quick actions)  
**Condition:** `isAuthenticated && userPlaylists.length > 0`

```tsx
<PlaylistSection
  title="Your Playlists"
  playlists={userPlaylists}
  limit={6}
  showSeeAll={true}
  onSeeAllClick={() => navigate('/library')}
  enableSwipe={true}  // Swipe enabled for user's own playlists
/>
```

### 3. Made For You (Featured Playlists)
**Title:** "Made For You"  
**Source:** `featuredPlaylists`  
**Limit:** 6 playlists  
**Swipe:** Disabled  
**Condition:** `featuredPlaylists.length > 0`

```tsx
<PlaylistSection
  title="Made For You"
  playlists={featuredPlaylists}
  limit={6}
  showSeeAll={true}
  onSeeAllClick={() => navigate('/library')}
  enableSwipe={false}
/>
```

### 4. Popular Playlists (More Public Playlists)
**Title:** "Popular Playlists"  
**Source:** `publicPlaylists` (after first 6)  
**Limit:** 6 playlists  
**Swipe:** Disabled  
**Condition:** `isOnline && publicPlaylists.length > 6`

```tsx
<PlaylistSection
  title="Popular Playlists"
  playlists={publicPlaylists.slice(6)}
  limit={6}
  showSeeAll={true}
  onSeeAllClick={() => navigate('/library')}
  enableSwipe={false}
/>
```

## Visual Layout

### Desktop View (1920px+)
```
┌────────────────────────────────────────────────────────────────┐
│  Your top mixes                                    SEE ALL     │
├────────────────────────────────────────────────────────────────┤
│  [Card 1]  [Card 2]  [Card 3]  [Card 4]  [Card 5]  [Card 6]  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Your Playlists                                    SEE ALL     │
├────────────────────────────────────────────────────────────────┤
│  [Card 1]  [Card 2]  [Card 3]  [Card 4]  [Card 5]  [Card 6]  │
│  (Swipe enabled)                                               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Made For You                                      SEE ALL     │
├────────────────────────────────────────────────────────────────┤
│  [Card 1]  [Card 2]  [Card 3]  [Card 4]  [Card 5]  [Card 6]  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Popular Playlists                                 SEE ALL     │
├────────────────────────────────────────────────────────────────┤
│  [Card 1]  [Card 2]  [Card 3]  [Card 4]  [Card 5]  [Card 6]  │
└────────────────────────────────────────────────────────────────┘
```

## Responsive Grid Breakpoints

### 2xl (1536px+) - 6 columns
```
[Card 1] [Card 2] [Card 3] [Card 4] [Card 5] [Card 6]
```

### xl (1280px+) - 6 columns
```
[Card 1] [Card 2] [Card 3] [Card 4] [Card 5] [Card 6]
```

### lg (1024px+) - 5 columns
```
[Card 1] [Card 2] [Card 3] [Card 4] [Card 5]
[Card 6]
```

### md (768px+) - 4 columns
```
[Card 1] [Card 2] [Card 3] [Card 4]
[Card 5] [Card 6]
```

### sm (640px+) - 3 columns
```
[Card 1] [Card 2] [Card 3]
[Card 4] [Card 5] [Card 6]
```

### Mobile (<640px) - 2 columns
```
[Card 1] [Card 2]
[Card 3] [Card 4]
[Card 5] [Card 6]
```

## Section Order

1. **Recently Played** (8 cards in 2x4 grid)
2. **Your top mixes** (6 playlists)
3. **Your Playlists** (6 playlists, if authenticated)
4. **Made For You** (6 playlists)
5. **Popular Playlists** (6 more playlists)
6. **Today's Hits** (Indian trending songs)
7. **Indian Music Player** (bottom)

## Features

### All Sections
- ✅ 6 playlists per row (limit: 6)
- ✅ "SEE ALL" button in header
- ✅ Responsive grid layout
- ✅ Hover effects on cards
- ✅ Play button on hover
- ✅ Click to navigate to playlist

### Your Playlists Section Only
- ✅ Swipe gestures enabled
- ✅ Swipe left/right for actions
- ✅ User's own playlists only

## Playlist Card Specifications

### Card Design
- **Width**: Responsive (fits grid)
- **Padding**: 16px
- **Border Radius**: 8px
- **Background**: #181818 → #282828 on hover
- **Image**: Square, 4px border radius
- **Title**: Bold, 16px, white, no underline
- **Description**: Normal, 14px, #a7a7a7

### Grid Spacing
- **Desktop**: 24px gap
- **Mobile**: 16px gap

## Data Flow

```typescript
// Fetch playlists on mount
useEffect(() => {
  fetchFeaturedPlaylists();
  fetchPublicPlaylists();
  if (isAuthenticated) {
    fetchUserPlaylists();
  }
}, [isAuthenticated]);

// Display sections
{publicPlaylists.length > 0 && (
  <PlaylistSection title="Your top mixes" playlists={publicPlaylists} limit={6} />
)}

{userPlaylists.length > 0 && (
  <PlaylistSection title="Your Playlists" playlists={userPlaylists} limit={6} />
)}

{featuredPlaylists.length > 0 && (
  <PlaylistSection title="Made For You" playlists={featuredPlaylists} limit={6} />
)}
```

## User Experience

### Authenticated User
1. Sees "Your top mixes" (public playlists)
2. Sees "Your Playlists" (their own playlists with swipe)
3. Sees "Made For You" (featured playlists)
4. Sees "Popular Playlists" (more public playlists)

### Guest User
1. Sees "Your top mixes" (public playlists)
2. Sees "Made For You" (featured playlists)
3. Sees "Popular Playlists" (more public playlists)
4. No "Your Playlists" section

## Benefits

✅ **Organized**: Clear sections with descriptive titles  
✅ **Consistent**: 6 playlists per row across all sections  
✅ **Responsive**: Adapts to all screen sizes  
✅ **Discoverable**: Multiple sections for exploration  
✅ **Interactive**: Swipe on user's own playlists  
✅ **Scalable**: Easy to add more sections  

## Performance

- **Lazy Loading**: Images load on demand
- **Limit**: Only 6 playlists per section (fast render)
- **Conditional Rendering**: Sections only show if data exists
- **Optimized Grid**: CSS Grid for efficient layout

## Accessibility

- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Focus indicators
- ✅ ARIA labels
- ✅ Semantic HTML

## Future Enhancements

- [ ] Infinite scroll for more playlists
- [ ] Drag and drop reordering
- [ ] Playlist filtering
- [ ] Sort options
- [ ] Personalized recommendations
- [ ] Recently played playlists section
