import axiosInstance from '../lib/axios';
import { resolveArtist } from '@/lib/resolveArtist';
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

  // Indian music methods
  fetchIndianTrendingSongs: () => Promise<void>;
  fetchIndianNewReleases: () => Promise<void>;
  fetchBollywoodSongs: () => Promise<void>;
  fetchHollywoodSongs: () => Promise<void>;
  fetchOfficialTrendingSongs: () => Promise<void>;
  fetchHindiSongs: () => Promise<void>;
  searchIndianSongs: (query: string) => Promise<void>;
  convertIndianSongToAppSong: (song: IndianSong) => Song;
}

//

// JioSaavn API - using backend proxy
const musicRequestState = {
  inFlight: new Map<string, Promise<any>>(),
  cache: new Map<string, { ts: number; data: any }>(),
  activeKeys: new Set<string>(),
};

async function fetchMusicJson(endpoint: string, params: Record<string, any> = {}, ttlMs: number = 5 * 60 * 1000): Promise<any> {
  const cacheKey = `${endpoint}?${JSON.stringify(params)}`;
  
  const cached = musicRequestState.cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < ttlMs) {
    return cached.data;
  }

  const existing = musicRequestState.inFlight.get(cacheKey);
  if (existing) {
    return existing;
  }

  const doFetch = async () => {
    try {
      const response = await axiosInstance.get(endpoint, { 
        params,
        timeout: 15000, // Increase timeout to 15 seconds
      });
      const data = response.data;
      musicRequestState.cache.set(cacheKey, { ts: Date.now(), data });
      return data;
    } catch (error: any) {
      // Only log errors that aren't network timeouts or 504s
      if (error.response?.status !== 504 && error.code !== 'ECONNABORTED') {
        console.error('Music API request failed:', error.message || error);
      }
      // Return empty data structure instead of throwing to prevent UI breaks
      return { data: { results: [] } };
    }
  };

  const promise = doFetch();
  musicRequestState.inFlight.set(cacheKey, promise);
  try {
    const data = await promise;
    return data;
  } finally {
    musicRequestState.inFlight.delete(cacheKey);
  }
}

// Convert JioSaavn track to IndianSong format
function convertSaavnTrack(item: any): IndianSong {
  // Get the best quality download URL (prefer 320kbps, then 160kbps, then 96kbps)
  let audioUrl = '';
  if (item.downloadUrl && Array.isArray(item.downloadUrl)) {
    // Try to get the highest quality available
    const downloadUrl = item.downloadUrl.find((d: any) => d.quality === '320kbps') ||
                       item.downloadUrl.find((d: any) => d.quality === '160kbps') ||
                       item.downloadUrl.find((d: any) => d.quality === '96kbps') ||
                       item.downloadUrl[item.downloadUrl.length - 1];
    audioUrl = downloadUrl?.link || '';
  }
  
  // Get the best quality image
  let imageUrl = '';
  if (item.image && Array.isArray(item.image)) {
    const image = item.image.find((i: any) => i.quality === '500x500') ||
                 item.image.find((i: any) => i.quality === '150x150') ||
                 item.image[item.image.length - 1];
    imageUrl = image?.link || '';
  } else if (typeof item.image === 'string') {
    imageUrl = item.image;
  }
  
  return {
    id: item.id,
    title: item.name || item.title,
    artist: item.primaryArtists || item.singers || (item.artistMap?.primary?.map((a: any) => a?.name).filter(Boolean).join(', ')) || resolveArtist(item),
    album: item.album?.name || item.album,
    year: item.year,
    duration: item.duration,
    image: imageUrl,
    url: audioUrl,
  };
}

export const useMusicStore = create<MusicStore>((set) => ({
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
      set({ error: (error?.response?.data?.message) || 'Failed to load songs' });
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
      set({ error: (error?.response?.data?.message) || 'Failed to load trending songs' });
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

  // Indian Music API Methods (using JioSaavn via backend proxy)
  fetchIndianTrendingSongs: async () => {
    const key = 'trending-10';
    if (musicRequestState.activeKeys.has(key)) return;
    musicRequestState.activeKeys.add(key);
    set({ isIndianMusicLoading: true });
    try {
      const data = await fetchMusicJson('/api/jiosaavn/trending', { limit: 10 });
      if (data?.data?.results && data.data.results.length > 0) {
        const formattedResults = data.data.results
          .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
          .map((item: any) => convertSaavnTrack(item));
        set({ indianTrendingSongs: formattedResults });
      } else {
        set({ indianTrendingSongs: [] });
      }
    } catch (error) {
      set({ indianTrendingSongs: [] });
    } finally {
      musicRequestState.activeKeys.delete(key);
      set({ isIndianMusicLoading: false });
    }
  },

  fetchBollywoodSongs: async () => {
    const key = 'search-bollywood';
    if (musicRequestState.activeKeys.has(key)) return;
    musicRequestState.activeKeys.add(key);
    set({ isIndianMusicLoading: true });
    try {
      const data = await fetchMusicJson('/api/jiosaavn/search/songs', { query: 'bollywood hits', limit: 15 });
      if (data?.data?.results) {
        const formattedResults = data.data.results
          .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
          .map((item: any) => convertSaavnTrack(item));
        set({ bollywoodSongs: formattedResults });
      } else {
        set({ bollywoodSongs: [] });
      }
    } catch (error) {
      set({ bollywoodSongs: [] });
    } finally {
      musicRequestState.activeKeys.delete(key);
      set({ isIndianMusicLoading: false });
    }
  },

  fetchHollywoodSongs: async () => {
    const key = 'search-hollywood';
    if (musicRequestState.activeKeys.has(key)) return;
    musicRequestState.activeKeys.add(key);
    set({ isIndianMusicLoading: true });
    try {
      const data = await fetchMusicJson('/api/jiosaavn/search/songs', { query: 'english top hits', limit: 15 });
      if (data?.data?.results) {
        const formattedResults = data.data.results
          .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
          .map((item: any) => convertSaavnTrack(item));
        set({ hollywoodSongs: formattedResults });
      } else {
        set({ hollywoodSongs: [] });
      }
    } catch (error) {
      set({ hollywoodSongs: [] });
    } finally {
      musicRequestState.activeKeys.delete(key);
      set({ isIndianMusicLoading: false });
    }
  },

  fetchOfficialTrendingSongs: async () => {
    const key = 'trending-15';
    if (musicRequestState.activeKeys.has(key)) return;
    musicRequestState.activeKeys.add(key);
    set({ isIndianMusicLoading: true });
    try {
      const data = await fetchMusicJson('/api/jiosaavn/trending', { limit: 15 });
      if (data?.data?.results) {
        const formattedResults = data.data.results
          .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
          .map((item: any) => convertSaavnTrack(item));
        set({ officialTrendingSongs: formattedResults });
      } else {
        set({ officialTrendingSongs: [] });
      }
    } catch (error) {
      set({ officialTrendingSongs: [] });
    } finally {
      musicRequestState.activeKeys.delete(key);
      set({ isIndianMusicLoading: false });
    }
  },

  fetchHindiSongs: async () => {
    const key = 'search-hindi';
    if (musicRequestState.activeKeys.has(key)) return;
    musicRequestState.activeKeys.add(key);
    set({ isIndianMusicLoading: true });
    try {
      const data = await fetchMusicJson('/api/jiosaavn/search/songs', { query: 'hindi top songs', limit: 15 });
      if (data?.data?.results) {
        const formattedResults = data.data.results
          .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
          .map((item: any) => convertSaavnTrack(item));
        set({ hindiSongs: formattedResults });
      } else {
        set({ hindiSongs: [] });
      }
    } catch (error) {
      set({ hindiSongs: [] });
    } finally {
      musicRequestState.activeKeys.delete(key);
      set({ isIndianMusicLoading: false });
    }
  },

  fetchIndianNewReleases: async () => {
    const key = 'new-releases';
    if (musicRequestState.activeKeys.has(key)) return;
    musicRequestState.activeKeys.add(key);
    set({ isIndianMusicLoading: true });
    try {
      const data = await fetchMusicJson('/api/jiosaavn/new-releases', { limit: 10 });
      if (data?.data?.results) {
        const formattedResults = data.data.results
          .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
          .map((item: any) => convertSaavnTrack(item));
        set({ indianNewReleases: formattedResults });
      } else {
        set({ indianNewReleases: [] });
      }
    } catch (error) {
      set({ indianNewReleases: [] });
    } finally {
      musicRequestState.activeKeys.delete(key);
      set({ isIndianMusicLoading: false });
    }
  },

  searchIndianSongs: async query => {
    if (!query || query.trim() === '') return;

    const key = `search-${query}`;
    if (musicRequestState.activeKeys.has(key)) return;
    musicRequestState.activeKeys.add(key);
    set({ isIndianMusicLoading: true });
    try {
      const data = await fetchMusicJson('/api/jiosaavn/search/songs', { query, limit: 20 }, 60 * 1000);
      if (data?.data?.results) {
        const formattedResults = data.data.results
          .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
          .map((item: any) => convertSaavnTrack(item));
        set({ indianSearchResults: formattedResults });
      } else {
        set({ indianSearchResults: [] });
      }
    } catch (error) {
      set({ indianSearchResults: [] });
    } finally {
      musicRequestState.activeKeys.delete(key);
      set({ isIndianMusicLoading: false });
    }
  },

  convertIndianSongToAppSong: (song) => {
    return {
      _id: song.id || `indian-song-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: song.title || 'Unknown Title',
      artist: resolveArtist(song),
      albumId: null,
      imageUrl: song.image || '',
      audioUrl: song.url || '',
      duration: parseInt(song.duration || '0'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
}));
