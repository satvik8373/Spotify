import { Playlist } from "../types";

// Generate color-based SVG data URLs instead of using external placeholders
const generateImageUrl = (text: string, bgColor: string = "#1DB954"): string => {
  const safeText = text.replace(/['&<>]/g, ''); // Basic sanitization
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="300" fill="${bgColor}"/>
      <text x="150" y="150" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${safeText}</text>
    </svg>
  `)}`;
};

// User profile image
const userImageUrl = generateImageUrl("User", "#555555");

// Mock playlists for when API calls fail
export const mockPlaylists: Playlist[] = [
  {
    _id: "mock-playlist-1",
    name: "Today's Hits",
    description: "The most popular songs right now",
    imageUrl: generateImageUrl("Today's Hits"),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userImageUrl
    }
  },
  {
    _id: "mock-playlist-2",
    name: "Chill Vibes",
    description: "Relaxing tracks to unwind",
    imageUrl: generateImageUrl("Chill Vibes", "#3D91F4"),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userImageUrl
    }
  },
  {
    _id: "mock-playlist-3",
    name: "Workout Mix",
    description: "Energetic songs to keep you motivated",
    imageUrl: generateImageUrl("Workout Mix", "#E13300"),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userImageUrl
    }
  },
  {
    _id: "mock-playlist-4",
    name: "Classic Rock",
    description: "Timeless rock hits from the legends",
    imageUrl: generateImageUrl("Classic Rock", "#FFA42B"),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userImageUrl
    }
  },
  {
    _id: "mock-playlist-5",
    name: "Hip-Hop Essentials",
    description: "The best hip-hop tracks of all time",
    imageUrl: generateImageUrl("Hip-Hop Essentials", "#8B2AC2"),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userImageUrl
    }
  }
];

// Mock user playlists
export const mockUserPlaylists: Playlist[] = [
  {
    _id: "mock-user-playlist-1",
    name: "My Favorites",
    description: "All my favorite songs",
    imageUrl: generateImageUrl("My Favorites", "#E91429"),
    isPublic: true,
    featured: false,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userImageUrl
    }
  },
  {
    _id: "mock-user-playlist-2",
    name: "Road Trip",
    description: "Songs for the long drive",
    imageUrl: generateImageUrl("Road Trip", "#1DB954"),
    isPublic: true,
    featured: false,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userImageUrl
    }
  }
]; 