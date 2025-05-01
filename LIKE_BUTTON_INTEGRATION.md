# LikeButton Component Integration

## Overview

We've implemented a consistent LikeButton component that standardizes the "like song" functionality across the entire application. This improves user experience by ensuring the liked state of songs is always properly reflected across different components.

## Key Improvements

1. **Consistent UI**: The same button appearance and behavior across all parts of the app
2. **Cached State**: Uses local caching to prevent UI flickering between liked/unliked states
3. **Error Handling**: Better error recovery if the like operation fails
4. **Login Prompts**: Properly prompts unauthenticated users to log in
5. **Improved Performance**: Reduces unnecessary re-renders and network calls
6. **Event Broadcasting**: Uses a custom event system to notify other components of changes

## Components Updated

The following components now use the unified LikeButton:

- `PlaybackControls.tsx`: The player controls at the bottom of the screen
- `SongDetailsView.tsx`: The full-screen song details page
- `IndianMusicPlayer.tsx`: The song cards, rows and details dialog

## Implementation Details

The new component:

1. Uses the `useLikedSongsStore` Zustand store for state management
2. Maintains a local copy of the like state for immediate UI feedback
3. Syncs with the server via the store's methods
4. Broadcasts events that other components can listen for
5. Configurable visual styles through props
6. Handles authentication status automatically

## How to Use

```tsx
<LikeButton
  songId={song._id} // Required: The unique ID of the song
  song={song}       // Required: The song object
  variant="ghost"   // Optional: Button variant (ghost, default, outline)
  size="icon"       // Optional: Button size (icon, sm, default, lg)
  className="..."   // Optional: Additional CSS classes
  fillColor="..."   // Optional: Custom fill color when liked
  showToasts={true} // Optional: Show toast notifications
  showLoginPrompt={true} // Optional: Show login prompt for unauthenticated users
/>
```

## Technical Notes

The central store `useLikedSongsStore` manages:
- Loading liked songs from local storage and the server
- Adding/removing songs from liked collection
- Maintaining a Set of liked song IDs for efficient lookups
- Dispatching events when changes occur

This improvement helps solve the issue where liked songs weren't properly showing up in the LikedSongs page and ensures a consistent experience across the application. 