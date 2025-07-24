import axiosInstance from '../lib/axios';
import { Album, Song, Stats } from '@/types';
import { create } from 'zustand';

interface IndianSong {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  year?: string;
  duration?: string;
  image: string;
  url?: string;
}

interface MusicStore {
  songs: Song[];
  albums: Album[];
  isLoading: boolean;
  error: string | null;
  currentAlbum: Album | null;
  featuredSongs: Song[];
  madeForYouSongs: Song[];
  trendingSongs: Song[];
  indianTrendingSongs: IndianSong[];
  indianNewReleases: IndianSong[];
  indianSearchResults: IndianSong[];
  bollywoodSongs: IndianSong[];
  hollywoodSongs: IndianSong[];
  officialTrendingSongs: IndianSong[];
  hindiSongs: IndianSong[];
  isIndianMusicLoading: boolean;
  stats: Stats;

  fetchAlbums: () => Promise<void>;
  fetchAlbumById: (id: string) => Promise<void>;
  fetchFeaturedSongs: () => Promise<void>;
  fetchMadeForYouSongs: () => Promise<void>;
  fetchTrendingSongs: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchSongs: () => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;

  // Indian music methods
  fetchIndianTrendingSongs: () => Promise<void>;
  fetchIndianNewReleases: () => Promise<void>;
  fetchBollywoodSongs: () => Promise<void>;
  fetchHollywoodSongs: () => Promise<void>;
  fetchOfficialTrendingSongs: () => Promise<void>;
  fetchHindiSongs: () => Promise<void>;
  searchIndianSongs: (query: string) => Promise<void>;
  convertIndianSongToAppSong: (song: IndianSong) => Song;
  fetchSongById: (id: string) => Promise<Song | null>;
}

// Generate SVG data URL for song thumbnails
const generateSongImage = (title: string, color: string = "#1DB954"): string => {
  const safeText = title.replace(/['&<>]/g, ''); // Basic sanitization
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="300" fill="${color}"/>
      <text x="150" y="150" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${safeText}</text>
      <path d="M200,150 C200,177.614 177.614,200 150,200 C122.386,200 100,177.614 100,150 C100,122.386 122.386,100 150,100 C177.614,100 200,122.386 200,150 Z" fill="rgba(255,255,255,0.2)"/>
      <path d="M165,140 L140,125 L140,175 L165,160 Z" fill="white"/>
    </svg>
  `)}`;
};

// Mock data for testing and fallback
const mockTrendingSongs = [
  {
    id: "mock_trending_1",
    title: "Bewafa",
    artist: "Imran Khan",
    album: "Unforgettable",
    year: "2020",
    duration: "4:25",
    image: generateSongImage("Bewafa"),
    url: "https://aac.saavncdn.com/532/9a6c47cac1eb5823f5a989fdd7d1c513_320.mp4"
  },
  {
    id: "mock_trending_2",
    title: "Kaise Hua",
    artist: "Vishal Mishra",
    album: "Kabir Singh",
    year: "2019",
    duration: "3:54",
    image: generateSongImage("Kaise Hua", "#3D91F4"),
    url: "https://aac.saavncdn.com/807/94f54b6e5292b6a0a3936e7465cba9ba_320.mp4"
  },
  {
    id: "mock_trending_3",
    title: "Tera Ban Jaunga",
    artist: "Akhil Sachdeva, Tulsi Kumar",
    album: "Kabir Singh",
    year: "2019",
    duration: "3:56",
    image: generateSongImage("Tera Ban Jaunga", "#E13300"),
    url: "https://aac.saavncdn.com/570/a16bb2ea6875145bf94cee3846abb701_320.mp4"
  },
  {
    id: "mock_trending_4",
    title: "Tujhe Kitna Chahne Lage",
    artist: "Arijit Singh",
    album: "Kabir Singh",
    year: "2019",
    duration: "4:45",
    image: generateSongImage("Tujhe Kitna Chahne Lage", "#FFA42B"),
    url: "https://aac.saavncdn.com/389/3978da62df331ad10f95e4ad7e8d6435_320.mp4"
  },
  {
    id: "mock_trending_5",
    title: "Duniyaa",
    artist: "Abhijit Vaghani, Akhil, Dhvani Bhanushali",
    album: "Luka Chuppi",
    year: "2019",
    duration: "3:42",
    image: generateSongImage("Duniyaa", "#8B2AC2"),
    url: "https://aac.saavncdn.com/904/a9a98c04d89b124259d9bcf56cefb0a4_320.mp4"
  }
];

export const useMusicStore = create<MusicStore>((set, get) => ({
  albums: [],
  songs: [],
  isLoading: false,
  error: null,
  currentAlbum: null,
  madeForYouSongs: [],
  featuredSongs: [],
  trendingSongs: [],
  indianTrendingSongs: [],
  indianNewReleases: [],
  indianSearchResults: [],
  bollywoodSongs: [],
  hollywoodSongs: [],
  officialTrendingSongs: [],
  hindiSongs: [],
  isIndianMusicLoading: false,
  stats: {
    totalSongs: 0,
    totalAlbums: 0,
    totalUsers: 0,
    totalArtists: 0,
  },

  deleteSong: async id => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`/admin/songs/${id}`);

      set(state => ({
        songs: state.songs.filter(song => song._id !== id),
      }));
    } catch (error: any) {
      // Silent error handling
    } finally {
      set({ isLoading: false });
    }
  },

  deleteAlbum: async id => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`/admin/albums/${id}`);
      set(state => ({
        albums: state.albums.filter(album => album._id !== id),
        songs: state.songs.map(song =>
          song.albumId === state.albums.find(a => a._id === id)?.title
            ? { ...song, album: null }
            : song
        ),
      }));
    } catch (error: any) {
      // Silent error handling
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSongs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get('/songs');
      set({ songs: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get('/stats');
      set({ stats: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAlbums: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await axiosInstance.get('/albums');
      set({ albums: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAlbumById: async id => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(`/albums/${id}`);
      set({ currentAlbum: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFeaturedSongs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get('/songs/featured');
      set({ featuredSongs: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMadeForYouSongs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get('/songs/made-for-you');
      set({ madeForYouSongs: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTrendingSongs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get('/songs/trending');
      set({ trendingSongs: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Indian Music API Methods
  fetchIndianTrendingSongs: async () => {
    set({ isIndianMusicLoading: true });
    try {
      // Use mock data first to ensure immediate content display
      set({ indianTrendingSongs: mockTrendingSongs });
      
      try {
        // Call JioSaavn API directly
        const response = await fetch(
          'https://saavn.dev/api/search/songs?query=latest%20hits&page=1&limit=10'
        );
        if (!response.ok) throw new Error('Failed to fetch trending songs');
        const data = await response.json();
        
        // Process API data
        if (data.data && data.data.results && data.data.results.length > 0) {
          const formattedResults = data.data.results
            .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
            .map((item: any) => ({
              id: item.id,
              title: item.name,
              artist: item.primaryArtists,
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));
            
          if (formattedResults.length > 0) {
            set({ indianTrendingSongs: formattedResults });
          }
        }
      } catch (error) {
        // Already set mock data, no need to set again
      }
    } catch (error: any) {
      // Ensure we have fallback data
      set({ indianTrendingSongs: mockTrendingSongs });
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  fetchBollywoodSongs: async () => {
    set({ isIndianMusicLoading: true });
    try {
      try {
        // Call JioSaavn API directly
        const response = await fetch(
          'https://saavn.dev/api/search/songs?query=bollywood%20hits&page=1&limit=15'
        );
        if (!response.ok) throw new Error('Failed to fetch bollywood songs');
        const data = await response.json();
        
        // Process API data
        if (data.data && data.data.results) {
          const formattedResults = data.data.results
            .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
            .map((item: any) => ({
              id: item.id,
              title: item.name,
              artist: item.primaryArtists,
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ bollywoodSongs: formattedResults });
        }
      } catch (error) {
        // Silent error handling
      }
    } catch (error: any) {
      // Silent error handling
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  fetchHollywoodSongs: async () => {
    set({ isIndianMusicLoading: true });
    try {
      try {
        // Call JioSaavn API directly
        const response = await fetch(
          'https://saavn.dev/api/search/songs?query=english%20top%20hits&page=1&limit=15'
        );
        if (!response.ok) throw new Error('Failed to fetch hollywood songs');
        const data = await response.json();
        
        // Process API data
        if (data.data && data.data.results) {
          const formattedResults = data.data.results
            .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
            .map((item: any) => ({
              id: item.id,
              title: item.name,
              artist: item.primaryArtists,
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ hollywoodSongs: formattedResults });
        }
      } catch (error) {
        // Silent error handling
      }
    } catch (error: any) {
      // Silent error handling
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  fetchOfficialTrendingSongs: async () => {
    set({ isIndianMusicLoading: true });
    try {
      try {
        // Call JioSaavn API directly
        const response = await fetch(
          'https://saavn.dev/api/search/songs?query=trending%20songs&page=1&limit=15'
        );
        if (!response.ok) throw new Error('Failed to fetch trending songs');
        const data = await response.json();
        
        // Process API data
        if (data.data && data.data.results) {
          const formattedResults = data.data.results
            .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
            .map((item: any) => ({
              id: item.id,
              title: item.name,
              artist: item.primaryArtists,
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ officialTrendingSongs: formattedResults });
        }
      } catch (error) {
        // Silent error handling
      }
    } catch (error: any) {
      // Silent error handling
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  fetchHindiSongs: async () => {
    set({ isIndianMusicLoading: true });
    try {
      try {
        // Call JioSaavn API directly
        const response = await fetch(
          'https://saavn.dev/api/search/songs?query=hindi%20top%20songs&page=1&limit=15'
        );
        if (!response.ok) throw new Error('Failed to fetch hindi songs');
        const data = await response.json();
        
        // Process API data
        if (data.data && data.data.results) {
          const formattedResults = data.data.results
            .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
            .map((item: any) => ({
              id: item.id,
              title: item.name,
              artist: item.primaryArtists,
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ hindiSongs: formattedResults });
        }
      } catch (error) {
        // Silent error handling
      }
    } catch (error: any) {
      // Silent error handling
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  fetchIndianNewReleases: async () => {
    set({ isIndianMusicLoading: true });
    try {
      try {
        // Call JioSaavn API directly
        const response = await fetch(
          'https://saavn.dev/api/search/songs?query=new%20releases&page=1&limit=10'
        );
        if (!response.ok) throw new Error('Failed to fetch new releases');
        const data = await response.json();
        
        // Process API data
        if (data.data && data.data.results) {
          const formattedResults = data.data.results
            .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
            .map((item: any) => ({
              id: item.id,
              title: item.name,
              artist: item.primaryArtists,
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ indianNewReleases: formattedResults });
        }
      } catch (error) {
        // Silent error handling
      }
    } catch (error: any) {
      // Silent error handling
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  searchIndianSongs: async query => {
    if (!query || query.trim() === '') return;

    set({ isIndianMusicLoading: true });
    try {
      try {
        // Call JioSaavn API directly
        const response = await fetch(
          `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&page=1&limit=20`
        );
        if (!response.ok) throw new Error('Failed to search songs');
        const data = await response.json();
        
        // Process API data
        if (data.data && data.data.results) {
          const formattedResults = data.data.results
            .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
            .map((item: any) => ({
              id: item.id,
              title: item.name,
              artist: item.primaryArtists,
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ indianSearchResults: formattedResults });
        }
      } catch (error) {
        // Silent error handling
      }
    } catch (error: any) {
      // Silent error handling
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  convertIndianSongToAppSong: (song) => {
    return {
      _id: song.id || `indian-song-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: song.title || 'Unknown Title',
      artist: song.artist || 'Unknown Artist',
      albumId: null,
      imageUrl: song.image || '',
      audioUrl: song.url || '',
      duration: parseInt(song.duration || '0'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  // Fetch a single song by ID for sharing
  fetchSongById: async (id: string): Promise<Song | null> => {
    try {
      // First check if it's in our current songs
      const currentSongs = get().songs;
      const foundSong = currentSongs.find(song => song._id === id);
      if (foundSong) return foundSong;

      // Check in Indian songs collections
      const allIndianSongs = [
        ...get().indianTrendingSongs,
        ...get().indianNewReleases,
        ...get().bollywoodSongs,
        ...get().hollywoodSongs,
        ...get().officialTrendingSongs,
        ...get().hindiSongs,
        ...get().indianSearchResults,
      ];
      
      const foundIndianSong = allIndianSongs.find(song => song.id === id);
      if (foundIndianSong) {
        return get().convertIndianSongToAppSong(foundIndianSong);
      }

      // Try to fetch from JioSaavn API by ID
      try {
        const response = await fetch(`https://saavn.dev/api/songs/${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const songData = data.data[0];
            return get().convertIndianSongToAppSong({
              id: songData.id,
              title: songData.name,
              artist: songData.primaryArtists,
              album: songData.album?.name,
              year: songData.year,
              duration: songData.duration,
              image: songData.image?.[2]?.url,
              url: songData.downloadUrl?.[4]?.url,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching song from JioSaavn:', error);
      }

      // Try backend API as fallback
      try {
        const response = await axiosInstance.get(`/songs/${id}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching song from backend:', error);
      }

      return null;
    } catch (error) {
      console.error('Error in fetchSongById:', error);
      return null;
    }
  },
}));
