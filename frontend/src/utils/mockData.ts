import { Playlist } from "../types";

// Define reusable variables for all placeholder images
const userPlaceholderImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzU1NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPlVzZXI8L3RleHQ+PC9zdmc+";
const playlistPlaceholderImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzI0MjQyNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzYiIGZpbGw9IiM4ODg4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPlBsYXlsaXN0PC90ZXh0Pjwvc3ZnPg==";
const likedSongsImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM0NTA4YWEiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwMDAwMDAiLz48L2xpbmVhckdyYWRpZW50PjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSJ1cmwoI2cpIi8+PHBhdGggZD0iTTE1MCAxMDBjMTYuNTcgMCAzMCAxMy40MyAzMCAzMCAwIDExLjc4LTYuNzcgMjEuOTYtMTYuNjIgMjYuODMtLjIxLjEtLjM5LjA5LS4zOC0uMTh2LTUuNjVjMC0yLjkzLTEuNjgtNS40NS00LjEyLTYuNjYtMi4wOC0xLjAzLTMuNjYtMi44Ny00LjUtNS4yLS41LTEuMzktLjY0LTIuNzYtLjQzLTQuMTkuNS0zLjQgMi43Mi02LjEgNS44NS03LjE4IDQtMS4zNiA4LjI2LjkgOS42MiA1Ljc3Ljg4IDMuMTYtLjE3IDYuMzYtMi4xMiA4LjQ4LTEuMzggMS41NC0yLjA3IDMuODMtMi41NyA2LjEzLTEuMS4wMy0yLjEuMDYtMy4xLjA2YTE2LjY5IDE2LjY5IDAgMDEtMTEuNy01QzE0My4zNyAxNDAuMjMgMTQwIDEzNS42OCAxNDAgMTMwYzAtMTYuNTcgMTMuNDMtMzAgMzAtMzB6IiBmaWxsPSIjZmZmIi8+PC9zdmc+";
const roadTripImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwMGEzNjQiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwMDYyM2IiLz48L2xpbmVhckdyYWRpZW50PjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSJ1cmwoI2cpIi8+PHBhdGggZD0iTTg3IDIxMGgxMjZjNS41MiAwIDEwLTQuNDggMTAtMTB2LTY1YzAtNS41Mi00LjQ4LTEwLTEwLTEwSDg3Yy01LjUyIDAtMTAgNC40OC0xMCAxMHY2NWMwIDUuNTIgNC40OCAxMCAxMCAxMHptMTktMjBjLTguMjggMC0xNS02LjcyLTE1LTE1IDAtOC4yOCA2LjcyLTE1IDE1LTE1IDguMjggMCAxNSA2LjcyIDE1IDE1IDAgOC4yOC02LjcyIDE1LTE1IDE1em04OCAwYy04LjI4IDAtMTUtNi43Mi0xNS0xNSAwLTguMjggNi43Mi0xNSAxNS0xNSA4LjI4IDAgMTUgNi43MiAxNSAxNSAwIDguMjgtNi43MiAxNS0xNSAxNXptLTQ0LTYwYy04LjI4IDAtMTUtNi43Mi0xNS0xNSAwLTguMjggNi43Mi0xNSAxNS0xNSA4LjI4IDAgMTUgNi43MiAxNSAxNSAwIDguMjgtNi43MiAxNS0xNSAxNXoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=";

// Generate different playlist placeholders for visual variety
const generatePlaylistImage = (index: number, primaryColor: string = "#1E1E1E"): string => {
  const colors = [
    "#1DB954", // Spotify green
    "#3D91F4", // Blue
    "#E13300", // Red
    "#FFA42B", // Orange
    "#8B2AC2"  // Purple
  ];
  
  const color = colors[index % colors.length];
  const bgColor = primaryColor;
  
  return `data:image/svg+xml;base64,${btoa(`<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="300" fill="${bgColor}"/>
    <rect x="50" y="50" width="200" height="200" fill="${color}" rx="10" ry="10"/>
    <path d="M100 120h100v15h-100z M100 150h100v15h-100z M100 180h80v15h-80z" fill="#ffffff"/>
  </svg>`)}`;
};

// Mock playlists for when API calls fail
export const mockPlaylists: Playlist[] = [
  {
    _id: "mock-playlist-1",
    name: "Today's Hits",
    description: "The most popular songs right now",
    imageUrl: generatePlaylistImage(0),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  },
  {
    _id: "mock-playlist-2",
    name: "Chill Vibes",
    description: "Relaxing tracks to unwind",
    imageUrl: generatePlaylistImage(1),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  },
  {
    _id: "mock-playlist-3",
    name: "Workout Mix",
    description: "Energetic songs to keep you motivated",
    imageUrl: generatePlaylistImage(2),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  },
  {
    _id: "mock-playlist-4",
    name: "Classic Rock",
    description: "Timeless rock hits from the legends",
    imageUrl: generatePlaylistImage(3),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  },
  {
    _id: "mock-playlist-5",
    name: "Hip-Hop Essentials",
    description: "The best hip-hop tracks of all time",
    imageUrl: generatePlaylistImage(4),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  }
];

// Mock user playlists
export const mockUserPlaylists: Playlist[] = [
  {
    _id: "mock-user-playlist-1",
    name: "My Favorites",
    description: "All my favorite songs",
    imageUrl: likedSongsImage,
    isPublic: true,
    featured: false,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  },
  {
    _id: "mock-user-playlist-2",
    name: "Road Trip",
    description: "Songs for the long drive",
    imageUrl: roadTripImage,
    isPublic: true,
    featured: false,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  }
];

// Updated mock playlists
export const updatedMockPlaylists: Playlist[] = [
  {
    _id: "mock-playlist-1",
    name: "Today's Hits",
    description: "The most popular songs right now",
    imageUrl: generatePlaylistImage(0),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  },
  {
    _id: "mock-playlist-2",
    name: "Chill Vibes",
    description: "Relaxing tracks to unwind",
    imageUrl: generatePlaylistImage(1),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  },
  {
    _id: "mock-playlist-3",
    name: "Workout Mix",
    description: "Energetic songs to keep you motivated",
    imageUrl: generatePlaylistImage(2),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  },
  {
    _id: "mock-playlist-4",
    name: "Classic Rock",
    description: "Timeless rock hits from the legends",
    imageUrl: generatePlaylistImage(3),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  },
  {
    _id: "mock-playlist-5",
    name: "Hip-Hop Essentials",
    description: "The best hip-hop tracks of all time",
    imageUrl: generatePlaylistImage(4),
    isPublic: true,
    featured: true,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  },
  {
    _id: "mock-playlist-6",
    name: "Rock Classics",
    description: "The greatest rock songs of all time",
    imageUrl: generatePlaylistImage(5),
    isPublic: true,
    featured: false,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  },
  {
    _id: "mock-playlist-7",
    name: "Chill Vibes",
    description: "Relaxing music for your downtime",
    imageUrl: generatePlaylistImage(6),
    isPublic: true,
    featured: false,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      _id: "mock-user-1",
      clerkId: "mock-clerk-id-1",
      fullName: "Demo User",
      imageUrl: userPlaceholderImage
    }
  }
]; 