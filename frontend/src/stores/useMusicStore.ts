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

  // Indian Music API Methods
  fetchIndianTrendingSongs: async () => {
    set({ isIndianMusicLoading: true });
    try {
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
              artist: item.primaryArtists || item.singers || (item.artistMap?.primary?.map((a: any) => a?.name).filter(Boolean).join(', ')) || resolveArtist(item),
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ indianTrendingSongs: formattedResults });
        } else {
          set({ indianTrendingSongs: [] });
        }
      } catch (error) {
        set({ indianTrendingSongs: [] });
      }
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
              artist: item.primaryArtists || item.singers || (item.artistMap?.primary?.map((a: any) => a?.name).filter(Boolean).join(', ')) || resolveArtist(item),
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ bollywoodSongs: formattedResults });
        }
      } catch (error) {
        // network error -> ensure array set
        set({ bollywoodSongs: [] });
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
              artist: item.primaryArtists || item.singers || (item.artistMap?.primary?.map((a: any) => a?.name).filter(Boolean).join(', ')) || resolveArtist(item),
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ hollywoodSongs: formattedResults });
        }
      } catch (error) {
        set({ hollywoodSongs: [] });
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
              artist: item.primaryArtists || item.singers || (item.artistMap?.primary?.map((a: any) => a?.name).filter(Boolean).join(', ')) || resolveArtist(item),
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ officialTrendingSongs: formattedResults });
        }
      } catch (error) {
        set({ officialTrendingSongs: [] });
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
              artist: item.primaryArtists || item.singers || (item.artistMap?.primary?.map((a: any) => a?.name).filter(Boolean).join(', ')) || resolveArtist(item),
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ hindiSongs: formattedResults });
        }
      } catch (error) {
        set({ hindiSongs: [] });
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
              artist: item.primaryArtists || item.singers || (item.artistMap?.primary?.map((a: any) => a?.name).filter(Boolean).join(', ')) || resolveArtist(item),
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }));

          set({ indianNewReleases: formattedResults });
        }
      } catch (error) {
        set({ indianNewReleases: [] });
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
          const penaltyWords = ['unknown', 'various', 'tribute', 'cover', 'karaoke', 'hits', 'best of', 'playlist', 'compilation'];
          const remixWords = ['remix', 'sped up', 'slowed', 'reverb', 'mashup'];
          const q = query.toLowerCase().trim();
          const qTokens = q.split(/\s+/).filter(Boolean);

          const score = (item: any): number => {
            const title = (item?.name || '').toLowerCase();
            const artist = (item?.primaryArtists || item?.singers || (item?.artistMap?.primary?.map((a: any) => a?.name).filter(Boolean).join(', ')) || '').toLowerCase();
            const album = (item?.album?.name || '').toLowerCase();
            let s = 0;

            if (artist === q) s += 120;
            if (artist.includes(q)) s += 80;
            if (title === q) s += 60;
            if (title.includes(q)) s += 30;
            const covered = qTokens.filter(t => title.includes(t)).length;
            s += covered * 15;
            if (covered >= Math.max(1, Math.ceil(qTokens.length * 0.7))) s += 25;

            if (penaltyWords.some(w => artist.includes(w))) s -= 60;
            if (penaltyWords.some(w => title.includes(w))) s -= 30;
            if (penaltyWords.some(w => album.includes(w))) s -= 30;
            if (remixWords.some(w => title.includes(w))) s -= 25;

            const artistCovered = qTokens.filter(t => artist.includes(t)).length;
            if (covered === 0 && artistCovered === 0) s -= 100;
            return s;
          };

          const formattedResults = data.data.results
            .filter((item: any) => item.downloadUrl && item.downloadUrl.length > 0)
            .map((item: any) => ({
              id: item.id,
              title: item.name,
              artist: item.primaryArtists || item.singers || (item.artistMap?.primary?.map((a: any) => a?.name).filter(Boolean).join(', ')) || resolveArtist(item),
              album: item.album.name,
              year: item.year,
              duration: item.duration,
              image: item.image[2].url,
              url: item.downloadUrl[4].url,
            }))
            // Sort by score and remove low-quality mismatches
            .sort((a: any, b: any) => score(b) - score(a))
            .filter((item: any, idx: number) => {
              const t = (item.title || '').toLowerCase();
              const a = (item.artist || '').toLowerCase();
              const album = (item.album || '').toLowerCase();
              const covered = qTokens.filter(token => t.includes(token)).length;
              const artistCovered = qTokens.filter(token => a.includes(token)).length;
              const goodMatch = covered > 0 || artistCovered > 0;
              const notCompilation = !penaltyWords.some(w => t.includes(w) || album.includes(w));
              return goodMatch && notCompilation;
            });

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
