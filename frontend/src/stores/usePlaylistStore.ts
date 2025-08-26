import { create } from 'zustand';
import { Playlist } from '../types';
import * as playlistService from '../services/playlistService';
import { useMusicStore } from '../stores/useMusicStore';

interface PlaylistStore {
  playlists: Playlist[];
  userPlaylists: Playlist[];
  featuredPlaylists: Playlist[];
  publicPlaylists: Playlist[];
  currentPlaylist: Playlist | null;
  searchResults: Playlist[];
  isLoading: boolean;
  isSearching: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  fetchPlaylists: () => Promise<void>;
  fetchUserPlaylists: () => Promise<void>;
  fetchFeaturedPlaylists: () => Promise<void>;
  fetchPublicPlaylists: () => Promise<void>;
  fetchPlaylistById: (id: string) => Promise<Playlist | null>;
  searchPlaylists: (query: string) => Promise<Playlist[]>;
  createPlaylist: (
    name: string,
    description?: string,
    isPublic?: boolean,
    imageUrl?: string | null
  ) => Promise<Playlist | null>;
  updatePlaylist: (
    id: string,
    data: { name?: string; description?: string; isPublic?: boolean; imageUrl?: string }
  ) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, songIdOrObject: string | any) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [],
  userPlaylists: [],
  featuredPlaylists: [],
  publicPlaylists: [],
  currentPlaylist: null,
  searchResults: [],
  isLoading: false,
  isSearching: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,

  fetchPlaylists: async () => {
    try {
      set({ isLoading: true });
      try {
        const [userPlaylists, publicPlaylists] = await Promise.all([
          playlistService.getUserPlaylists({ limit: 50, page: 1 }),
          playlistService.getPublicPlaylists({ limit: 50, page: 1 })
        ]);
        const map = new Map<string, Playlist>();
        publicPlaylists.forEach(p => map.set(p._id, p));
        userPlaylists.forEach(p => map.set(p._id, p));
        set({ playlists: Array.from(map.values()), userPlaylists, publicPlaylists, isLoading: false });
      } catch {
        set({ playlists: [], isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUserPlaylists: async () => {
    try {
      set({ isLoading: true });
      try {
        console.log('usePlaylistStore: Calling playlistService.getUserPlaylists');
        const userPlaylists = await playlistService.getUserPlaylists({ limit: 50, page: 1 });
        console.log('usePlaylistStore: Received userPlaylists:', userPlaylists.length);
        
        const merged = new Map<string, Playlist>();
        get().publicPlaylists.forEach(p => merged.set(p._id, p));
        userPlaylists.forEach(p => merged.set(p._id, p));
        
        console.log('usePlaylistStore: Setting userPlaylists, total count:', userPlaylists.length);
        set({ userPlaylists, playlists: Array.from(merged.values()), isLoading: false });
      } catch (error) {
        console.error('usePlaylistStore: Error in fetchUserPlaylists:', error);
        set({ userPlaylists: [], isLoading: false });
      }
    } catch (error) {
      console.error('usePlaylistStore: Outer error in fetchUserPlaylists:', error);
      set({ isLoading: false });
    }
  },

  fetchFeaturedPlaylists: async () => {
    try {
      set({ isLoading: true });
      try {
        const featuredPlaylists = await playlistService.getFeaturedPlaylists();
        set({ featuredPlaylists, isLoading: false });
      } catch {
        set({ featuredPlaylists: [], isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  fetchPublicPlaylists: async () => {
    try {
      set({ isLoading: true });
      try {
        const publicPlaylists = await playlistService.getPublicPlaylists({ limit: 50, page: 1 });
        const merged = new Map<string, Playlist>();
        publicPlaylists.forEach(p => merged.set(p._id, p));
        get().userPlaylists.forEach(p => merged.set(p._id, p));
        set({ publicPlaylists, playlists: Array.from(merged.values()), isLoading: false });
      } catch {
        set({ publicPlaylists: [], isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  fetchPlaylistById: async (id: string) => {
    try {
      set({ isLoading: true });
      try {
        const playlist = await playlistService.getPlaylistById(id);
        set({ currentPlaylist: playlist, isLoading: false });
        return playlist;
      } catch {}
      set({ isLoading: false });
      return null;
    } catch {
      set({ isLoading: false });
      return null;
    }
  },

  searchPlaylists: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return [];
    }
    try {
      set({ isSearching: true });
      const userPlaylists = get().userPlaylists;
      const publicPlaylists = get().publicPlaylists;
      const featuredPlaylists = get().featuredPlaylists;
      const map = new Map<string, Playlist>();
      userPlaylists.forEach(p => map.set(p._id, p));
      publicPlaylists.forEach(p => map.set(p._id, p));
      featuredPlaylists.forEach(p => map.set(p._id, p));
      const all = Array.from(map.values());
      const q = query.toLowerCase();
      const results = all.filter(p => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
      set({ searchResults: results, isSearching: false });
      return results;
    } catch {
      set({ isSearching: false });
      return [];
    }
  },

  createPlaylist: async (name: string, description = '', isPublic = true, imageUrl = null) => {
    try {
      set({ isCreating: true });
      try {
        const playlist = await playlistService.createPlaylist(name, description, isPublic, imageUrl);
        const userPlaylists = [...get().userPlaylists, playlist];
        set({ userPlaylists, isCreating: false });
        return playlist;
      } catch {
        set({ isCreating: false });
        return null;
      }
    } catch {
      set({ isCreating: false });
      return null;
    }
  },

  updatePlaylist: async (id: string, data: { name?: string; description?: string; isPublic?: boolean; imageUrl?: string }) => {
    try {
      set({ isUpdating: true });
      const updatedPlaylist = await playlistService.updatePlaylist(id, data);
      const playlists = get().playlists.map(p => (p._id === id ? updatedPlaylist : p));
      const userPlaylists = get().userPlaylists.map(p => (p._id === id ? updatedPlaylist : p));
      set({ playlists, userPlaylists, currentPlaylist: updatedPlaylist, isUpdating: false });
    } catch {
      set({ isUpdating: false });
    }
  },

  deletePlaylist: async (id: string) => {
    try {
      set({ isDeleting: true });
      await playlistService.deletePlaylist(id);
      const playlists = get().playlists.filter(p => p._id !== id);
      const userPlaylists = get().userPlaylists.filter(p => p._id !== id);
      const featuredPlaylists = get().featuredPlaylists.filter(p => p._id !== id);
      set({ playlists, userPlaylists, featuredPlaylists, currentPlaylist: null, isDeleting: false });
    } catch {
      set({ isDeleting: false });
    }
  },

  addSongToPlaylist: async (playlistId: string, songIdOrObject: string | any) => {
    try {
      const playlist = get().currentPlaylist;
      if (!playlist) return;

      let song: any;
      if (typeof songIdOrObject === 'string') {
        const songId = songIdOrObject;
        song = playlist.songs.find(s => s._id === songId) || useMusicStore.getState().songs.find(s => s._id === songId) || {
          _id: songId,
          title: 'Unknown Song',
          artist: 'Unknown Artist',
          imageUrl: '',
          audioUrl: '',
          duration: 0,
          albumId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        song = songIdOrObject;
        if (!song._id) song._id = `song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      }

      try {
        const updatedPlaylist = await playlistService.addSongToPlaylist(playlistId, song);
        set({ currentPlaylist: updatedPlaylist });
        const userPlaylists = get().userPlaylists.map(p => (p._id === playlistId ? updatedPlaylist : p));
        const playlists = get().playlists.map(p => (p._id === playlistId ? updatedPlaylist : p));
        set({ userPlaylists, playlists });
      } catch {
        const updatedSongs = [...playlist.songs, song];
        const updatedPlaylist = { ...playlist, songs: updatedSongs } as Playlist;
        set({ currentPlaylist: updatedPlaylist });
        const userPlaylistsUpdated = get().userPlaylists.map(p => (p._id === playlistId ? updatedPlaylist : p));
        const playlistsUpdated = get().playlists.map(p => (p._id === playlistId ? updatedPlaylist : p));
        set({ userPlaylists: userPlaylistsUpdated, playlists: playlistsUpdated });
        try { playlistService.updatePlaylist(playlistId, { imageUrl: song.imageUrl }); } catch {}
      }
    } catch {}
  },

  removeSongFromPlaylist: async (playlistId: string, songId: string) => {
    try {
      const updatedPlaylist = await playlistService.removeSongFromPlaylist(playlistId, songId);
      set({ currentPlaylist: updatedPlaylist });
    } catch {}
  }
}));


