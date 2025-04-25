import axiosInstance from '../lib/axios';
import { Album, Song, Stats } from '@/types';
import toast from 'react-hot-toast';
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
}

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
      toast.success('Song deleted successfully');
    } catch (error: any) {
      console.log('Error in deleteSong', error);
      toast.error('Error deleting song');
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
      toast.success('Album deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete album: ' + error.message);
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
      // First try backend proxy
      let response;
      let data;

      try {
        response = await fetch('/api/music/search?query=latest%20hits');
        if (!response.ok) throw new Error('Backend proxy failed');
        data = await response.json();
      } catch (backendError) {
        // Fallback to direct API
        console.log('Trying direct JioSaavn API...');
        response = await fetch(
          'https://saavn.dev/api/search/songs?query=latest%20hits&page=1&limit=10'
        );
        if (!response.ok) throw new Error('Failed to fetch trending songs');
        data = await response.json();
      }

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

        set({ indianTrendingSongs: formattedResults });
      }
    } catch (error: any) {
      console.error('Error fetching Indian trending songs:', error);
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  fetchBollywoodSongs: async () => {
    set({ isIndianMusicLoading: true });
    try {
      // First try backend proxy
      let response;
      let data;

      try {
        response = await fetch('/api/music/bollywood');
        if (!response.ok) throw new Error('Backend proxy failed');
        data = await response.json();
      } catch (backendError) {
        // Fallback to direct API
        console.log('Trying direct JioSaavn API...');
        response = await fetch(
          'https://saavn.dev/api/search/songs?query=bollywood%20hits&page=1&limit=15'
        );
        if (!response.ok) throw new Error('Failed to fetch bollywood songs');
        data = await response.json();
      }

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
    } catch (error: any) {
      console.error('Error fetching Bollywood songs:', error);
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  fetchHollywoodSongs: async () => {
    set({ isIndianMusicLoading: true });
    try {
      // First try backend proxy
      let response;
      let data;

      try {
        response = await fetch('/api/music/hollywood');
        if (!response.ok) throw new Error('Backend proxy failed');
        data = await response.json();
      } catch (backendError) {
        // Fallback to direct API
        console.log('Trying direct JioSaavn API...');
        response = await fetch(
          'https://saavn.dev/api/search/songs?query=english%20top%20hits&page=1&limit=15'
        );
        if (!response.ok) throw new Error('Failed to fetch hollywood songs');
        data = await response.json();
      }

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
    } catch (error: any) {
      console.error('Error fetching Hollywood songs:', error);
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  fetchOfficialTrendingSongs: async () => {
    set({ isIndianMusicLoading: true });
    try {
      // First try backend proxy
      let response;
      let data;

      try {
        response = await fetch('/api/music/trending');
        if (!response.ok) throw new Error('Backend proxy failed');
        data = await response.json();
      } catch (backendError) {
        // Fallback to direct API
        console.log('Trying direct JioSaavn API...');
        response = await fetch(
          'https://saavn.dev/api/search/songs?query=trending%20songs&page=1&limit=15'
        );
        if (!response.ok) throw new Error('Failed to fetch trending songs');
        data = await response.json();
      }

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
    } catch (error: any) {
      console.error('Error fetching official trending songs:', error);
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  fetchHindiSongs: async () => {
    set({ isIndianMusicLoading: true });
    try {
      // First try backend proxy
      let response;
      let data;

      try {
        response = await fetch('/api/music/hindi');
        if (!response.ok) throw new Error('Backend proxy failed');
        data = await response.json();
      } catch (backendError) {
        // Fallback to direct API
        console.log('Trying direct JioSaavn API...');
        response = await fetch(
          'https://saavn.dev/api/search/songs?query=hindi%20top%20songs&page=1&limit=15'
        );
        if (!response.ok) throw new Error('Failed to fetch hindi songs');
        data = await response.json();
      }

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
    } catch (error: any) {
      console.error('Error fetching Hindi songs:', error);
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  fetchIndianNewReleases: async () => {
    set({ isIndianMusicLoading: true });
    try {
      // First try backend proxy
      let response;
      let data;

      try {
        response = await fetch('/api/music/search?query=new%20releases');
        if (!response.ok) throw new Error('Backend proxy failed');
        data = await response.json();
      } catch (backendError) {
        // Fallback to direct API
        console.log('Trying direct JioSaavn API...');
        response = await fetch(
          'https://saavn.dev/api/search/songs?query=new%20releases&page=1&limit=10'
        );
        if (!response.ok) throw new Error('Failed to fetch new releases');
        data = await response.json();
      }

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
    } catch (error: any) {
      console.error('Error fetching Indian new releases:', error);
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  searchIndianSongs: async query => {
    if (!query || query.trim() === '') return;

    set({ isIndianMusicLoading: true });
    try {
      // First try backend proxy
      let response;
      let data;

      try {
        response = await fetch(`/api/music/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Backend proxy failed');
        data = await response.json();
      } catch (backendError) {
        // Fallback to direct API
        console.log('Trying direct JioSaavn API...');
        response = await fetch(
          `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&page=1&limit=20`
        );
        if (!response.ok) throw new Error('Failed to search songs');
        data = await response.json();
      }

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
    } catch (error: any) {
      console.error('Error searching Indian songs:', error);
    } finally {
      set({ isIndianMusicLoading: false });
    }
  },

  convertIndianSongToAppSong: song => {
    return {
      _id: song.id,
      title: song.title,
      artist: song.artist || 'Unknown Artist',
      albumId: null,
      imageUrl: song.image,
      audioUrl: song.url || '',
      duration: parseInt(song.duration || '0'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
}));
