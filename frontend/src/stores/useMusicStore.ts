import axiosInstance from '../lib/axios';
import { resolveArtist } from '@/lib/resolveArtist';
import { Album, Song, Stats } from '@/types';
import { create } from 'zustand';
import { requestManager } from '@/services/requestManager';

interface IndianSong {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  year?: string;
  duration?: string;
  image: string;
  url?: string;
  likedAt?: string | Date; // For preserving original liked date (e.g., from Spotify)
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
  indianNewReleases: IndianSong[];
  indianSearchResults: IndianSong[];
  bollywoodSongs: IndianSong[];
  hollywoodSongs: IndianSong[];
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
  fetchIndianNewReleases: () => Promise<void>;
  fetchBollywoodSongs: () => Promise<void>;
  fetchHollywoodSongs: () => Promise<void>;
  fetchHindiSongs: () => Promise<void>;
  searchIndianSongs: (query: string) => Promise<void>;
  convertIndianSongToAppSong: (song: IndianSong) => Song;
}

// Optimized request manager for music API calls
class MusicRequestManager {
  private activeRequests = new Set<string>();
  private requestQueue: Array<{ key: string; fn: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private isProcessing = false;
  private maxConcurrent = 2; // Limit concurrent music API requests
  private requestDelay = 200; // Delay between requests to prevent rate limiting

  async executeRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already active, wait for it
    if (this.activeRequests.has(key)) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ key, fn: requestFn, resolve, reject });
      });
    }

    return this.processRequest(key, requestFn);
  }

  private async processRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    this.activeRequests.add(key);
    
    try {
      const result = await requestFn();
      return result;
    } finally {
      this.activeRequests.delete(key);
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.activeRequests.size >= this.maxConcurrent) return;
    
    const nextRequest = this.requestQueue.shift();
    if (!nextRequest) return;

    this.isProcessing = true;
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, this.requestDelay));
    
    try {
      const result = await this.processRequest(nextRequest.key, nextRequest.fn);
      nextRequest.resolve(result);
    } catch (error) {
      nextRequest.reject(error);
    } finally {
      this.isProcessing = false;
      // Continue processing queue
      setTimeout(() => this.processQueue(), this.requestDelay);
    }
  }

  isActive(key: string): boolean {
    return this.activeRequests.has(key);
  }

  getStats() {
    return {
      activeRequests: this.activeRequests.size,
      queueLength: this.requestQueue.length
    };
  }
}

const musicRequestManager = new MusicRequestManager();

// Optimized music API request function using request manager
async function fetchMusicJson(endpoint: string, params: Record<string, any> = {}, cacheTTL: number = 5 * 60 * 1000): Promise<any> {
  return requestManager.request({
    url: endpoint, // Don't add /api prefix since axiosInstance already has the correct baseURL
    method: 'GET',
    params
  }, {
    cache: true,
    cacheTTL,
    deduplicate: true,
    priority: endpoint.includes('search') ? 'high' : 'normal'
  });
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
  indianNewReleases: [],
  indianSearchResults: [],
  bollywoodSongs: [],
  hollywoodSongs: [],
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

  // Indian Music API Methods (optimized with request manager)
  fetchBollywoodSongs: async () => {
    const key = 'bollywood-songs';
    return musicRequestManager.executeRequest(key, async () => {
      set({ isIndianMusicLoading: true });
      try {
        const data = await fetchMusicJson('/jiosaavn/search/songs', { query: 'bollywood hits', limit: 15 });
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
        set({ isIndianMusicLoading: false });
      }
    });
  },

  fetchHollywoodSongs: async () => {
    const key = 'hollywood-songs';
    return musicRequestManager.executeRequest(key, async () => {
      set({ isIndianMusicLoading: true });
      try {
        const data = await fetchMusicJson('/jiosaavn/search/songs', { query: 'english top hits', limit: 15 });
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
        set({ isIndianMusicLoading: false });
      }
    });
  },

  fetchHindiSongs: async () => {
    const key = 'hindi-songs';
    return musicRequestManager.executeRequest(key, async () => {
      set({ isIndianMusicLoading: true });
      try {
        const data = await fetchMusicJson('/jiosaavn/search/songs', { query: 'hindi top songs', limit: 15 });
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
        set({ isIndianMusicLoading: false });
      }
    });
  },

  fetchIndianNewReleases: async () => {
    const key = 'new-releases';
    return musicRequestManager.executeRequest(key, async () => {
      set({ isIndianMusicLoading: true });
      try {
        const data = await fetchMusicJson('/jiosaavn/new-releases', { limit: 10 });
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
        set({ isIndianMusicLoading: false });
      }
    });
  },

  searchIndianSongs: async query => {
    if (!query || query.trim() === '') return;

    const key = `search-${query.trim()}`;
    return musicRequestManager.executeRequest(key, async () => {
      set({ isIndianMusicLoading: true });
      try {
        const data = await fetchMusicJson('/jiosaavn/search/songs', { query: query.trim(), limit: 20 }, 60 * 1000);
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
        set({ isIndianMusicLoading: false });
      }
    });
  },

  convertIndianSongToAppSong: (song) => {
    const now = new Date().toISOString();
    const likedAtDate = song.likedAt ? 
      (song.likedAt instanceof Date ? song.likedAt.toISOString() : song.likedAt) : 
      now;
    
    return {
      _id: song.id || `indian-song-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: song.title || 'Unknown Title',
      artist: resolveArtist(song),
      albumId: null,
      imageUrl: song.image || '',
      audioUrl: song.url || '',
      duration: parseInt(song.duration || '0'),
      createdAt: now,
      updatedAt: now,
      likedAt: likedAtDate, // Use custom likedAt or current time
    };
  },
}));
