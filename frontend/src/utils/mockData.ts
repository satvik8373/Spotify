import { Playlist } from "../types";

// Mock playlists for when API calls fail
export const mockPlaylists: Playlist[] = [
  {
    _id: "mock-playlist-1",
    name: "Today's Hits",
    description: "The most popular songs right now",
    imageUrl: "https://i.scdn.co/image/ab67706f00000002b70e0223f544b1faa2e95ed0",
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: "https://via.placeholder.com/150"
    }
  },
  {
    _id: "mock-playlist-2",
    name: "Chill Vibes",
    description: "Relaxing tracks to unwind",
    imageUrl: "https://i.scdn.co/image/ab67706f00000002ca5a7517156021292e5663a4",
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: "https://via.placeholder.com/150"
    }
  },
  {
    _id: "mock-playlist-3",
    name: "Workout Mix",
    description: "Energetic songs to keep you motivated",
    imageUrl: "https://i.scdn.co/image/ab67706f0000000278b4745cb9ce8ffe32d763bc",
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: "https://via.placeholder.com/150"
    }
  },
  {
    _id: "mock-playlist-4",
    name: "Classic Rock",
    description: "Timeless rock hits from the legends",
    imageUrl: "https://i.scdn.co/image/ab67706f00000002b60db5d0557bcd3ad97a44a7",
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: "https://via.placeholder.com/150"
    }
  },
  {
    _id: "mock-playlist-5",
    name: "Hip-Hop Essentials",
    description: "The best hip-hop tracks of all time",
    imageUrl: "https://i.scdn.co/image/ab67706f00000002ffa215be1a4c64e3cbf59d1e",
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: "https://via.placeholder.com/150"
    }
  }
];

// Mock user playlists
export const mockUserPlaylists: Playlist[] = [
  {
    _id: "mock-user-playlist-1",
    name: "My Favorites",
    description: "All my favorite songs",
    imageUrl: "https://misc.scdn.co/liked-songs/liked-songs-640.png",
    isPublic: true,
    featured: false,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: "https://via.placeholder.com/150"
    }
  },
  {
    _id: "mock-user-playlist-2",
    name: "Road Trip",
    description: "Songs for the long drive",
    imageUrl: "https://i.scdn.co/image/ab67706f00000002bd0e19e810bb4b55ab164a95",
    isPublic: true,
    featured: false,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: "https://via.placeholder.com/150"
    }
  }
]; 