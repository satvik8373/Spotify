import { create } from 'zustand';
//
import { Playlist } from '../types';
import * as playlistService from '../services/playlistService';
import { useMusicStore } from '../stores/useMusicStore';

//

interface PlaylistStore {
  // State
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

  // Actions
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
  // Initial state
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

  // Actions
  fetchPlaylists: async () => {
    try {
      set({ isLoading: true });
      
      try {
        // Try to get all playlists from Firestore
        const playlists = await playlistService.getUserPlaylists();
        set({ playlists, isLoading: false });
      } catch (error) {
        set({ playlists: [], isLoading: false });
      }
    } catch (error: any) {
      set({ isLoading: false });
    }
  },

  fetchUserPlaylists: async () => {
    try {
      set({ isLoading: true });
      
      try {
        // Get user playlists from Firestore
        const userPlaylists = await playlistService.getUserPlaylists();
        set({ userPlaylists, isLoading: false });
      } catch (error) {
        set({ userPlaylists: [], isLoading: false });
      }
    } catch (error: any) {
      set({ isLoading: false });
    }
  },

  fetchFeaturedPlaylists: async () => {
    try {
      set({ isLoading: true });
      
      try {
        // Get featured playlists from Firestore
        const featuredPlaylists = await playlistService.getFeaturedPlaylists();
        set({ featuredPlaylists, isLoading: false });
      } catch (error) {
        set({ featuredPlaylists: [], isLoading: false });
      }
    } catch (error: any) {
      set({ isLoading: false });
    }
  },

  fetchPublicPlaylists: async () => {
    try {
      set({ isLoading: true });
      
      try {
        // Get public playlists from Firestore
        const publicPlaylists = await playlistService.getPublicPlaylists();
        set({ publicPlaylists, isLoading: false });
      } catch (error) {
        set({ publicPlaylists: [], isLoading: false });
      }
    } catch (error: any) {
      set({ isLoading: false });
    }
  },

  fetchPlaylistById: async (id: string) => {
    try {
      set({ isLoading: true });
      
      try {
        // Get playlist by ID from Firestore
        const playlist = await playlistService.getPlaylistById(id);
        set({ currentPlaylist: playlist, isLoading: false });
        return playlist;
      } catch (error) {
      }
      
      set({ isLoading: false });
      return null;
    } catch (error: any) {
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
      
      // Get all playlists we can search through
      const userPlaylists = get().userPlaylists;
      const publicPlaylists = get().publicPlaylists;
      const featuredPlaylists = get().featuredPlaylists;
      
      // Combine all playlists
      let allPlaylists = [...userPlaylists];
      
      // Add public and featured playlists that aren't already in user playlists
      publicPlaylists.forEach(playlist => {
        if (!allPlaylists.some(p => p._id === playlist._id)) {
          allPlaylists.push(playlist);
        }
      });
      
      featuredPlaylists.forEach(playlist => {
        if (!allPlaylists.some(p => p._id === playlist._id)) {
          allPlaylists.push(playlist);
        }
      });
      
      // Filter playlists based on query
      const normalizedQuery = query.toLowerCase();
      const results = allPlaylists.filter(playlist => {
        const nameMatch = playlist.name.toLowerCase().includes(normalizedQuery);
        const descriptionMatch = playlist.description?.toLowerCase().includes(normalizedQuery);
        return nameMatch || descriptionMatch;
      });
      
      set({ searchResults: results, isSearching: false });
      return results;
    } catch (error) {
      set({ isSearching: false });
      return [];
    }
  },

  createPlaylist: async (name: string, description = '', isPublic = true, imageUrl = null) => {
    try {
      set({ isCreating: true });
      
      try {
        // Create playlist in Firestore
        const playlist = await playlistService.createPlaylist(name, description, isPublic, imageUrl);

        // Update the user playlists list
        const userPlaylists = [...get().userPlaylists, playlist];
        set({ userPlaylists, isCreating: false });

        return playlist;
      } catch (firestoreError) {
        set({ isCreating: false });
        return null;
      }
    } catch (error) {
      set({ isCreating: false });
      return null;
    }
  },

  updatePlaylist: async (
    id: string,
    data: { name?: string; description?: string; isPublic?: boolean; imageUrl?: string }
  ) => {
    try {
      set({ isUpdating: true });
      
      // Update playlist in Firestore
      const updatedPlaylist = await playlistService.updatePlaylist(id, data);

      // Update the playlists and userPlaylists lists
      const playlists = get().playlists.map((playlist) =>
        playlist._id === id ? updatedPlaylist : playlist
      );
      const userPlaylists = get().userPlaylists.map((playlist) =>
        playlist._id === id ? updatedPlaylist : playlist
      );
      
      set({
        playlists,
        userPlaylists,
        currentPlaylist: updatedPlaylist,
        isUpdating: false,
      });

    } catch (error: any) {
      set({ isUpdating: false });
    }
  },

  deletePlaylist: async (id: string) => {
    try {
      set({ isDeleting: true });
      
      // Delete playlist from Firestore
      await playlistService.deletePlaylist(id);

      // Remove the playlist from the lists
      const playlists = get().playlists.filter((playlist) => playlist._id !== id);
      const userPlaylists = get().userPlaylists.filter((playlist) => playlist._id !== id);
      const featuredPlaylists = get().featuredPlaylists.filter((playlist) => playlist._id !== id);
      
      set({
        playlists,
        userPlaylists,
        featuredPlaylists,
        currentPlaylist: null,
        isDeleting: false,
      });

    } catch (error: any) {
      set({ isDeleting: false });
    }
  },

  addSongToPlaylist: async (playlistId: string, songIdOrObject: string | any) => {
    try {
      const playlist = get().currentPlaylist;
      
      if (!playlist) {
        return;
      }
      
      // Check if we have a song ID or a song object
      let song;
      
      if (typeof songIdOrObject === 'string') {
        // If it's a string, treat it as an ID and look for the song
        const songId = songIdOrObject;
        
        // Try to find in current playlist or music store
        song = playlist.songs.find((s) => s._id === songId);
        
        if (!song) {
          // If not found in current playlist, try to convert from store
          const storeSongs = useMusicStore.getState().songs;
          song = storeSongs.find(s => s._id === songId);
          
          if (!song) {
            // If still not found, create a placeholder song with the ID
            song = {
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
          }
        }
      } else {
        // If it's an object, use it directly
        song = songIdOrObject;
        
        // Make sure it has an _id
        if (!song._id) {
          song._id = `song-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }
      }
      
      // Add song to playlist in Firestore
      try {
        const updatedPlaylist = await playlistService.addSongToPlaylist(playlistId, song);
        
        // Update the current playlist in state
        set({ currentPlaylist: updatedPlaylist });
        
        // Also update in the user playlists list and playlists list if it exists there
        const userPlaylists = get().userPlaylists.map(p => 
          p._id === playlistId ? updatedPlaylist : p
        );
        
        const playlists = get().playlists.map(p => 
          p._id === playlistId ? updatedPlaylist : p
        );
        
        set({ 
          userPlaylists,
          playlists 
        });
        
      } catch (error) {
        // Fallback: Update locally if Firebase fails
        const updatedSongs = [...playlist.songs, song];
        const updatedPlaylist = { ...playlist, songs: updatedSongs };
        
        set({ currentPlaylist: updatedPlaylist });
        
        // Check if this is the first song being added to the playlist
        // If so, and the playlist has a default/placeholder image, auto-generate a cover
        if (playlist.songs.length === 0) {
          try {
            // Check if current image is a placeholder (data URL) or default
            const currentImageUrl = playlist.imageUrl || '';
            const isPlaceholder = currentImageUrl.startsWith('data:') || 
                                currentImageUrl.includes('default-playlist') ||
                                !currentImageUrl;
            
            if (isPlaceholder && song.imageUrl) {
              // Generate a cover from the first song's image
              const newImageUrl = song.imageUrl;
              
              // Update locally
              const playlistWithCover = { ...updatedPlaylist, imageUrl: newImageUrl };
              set({ currentPlaylist: playlistWithCover });
              
              // Also update in the lists
              const userPlaylistsUpdated = get().userPlaylists.map(p => 
                p._id === playlistId ? playlistWithCover : p
              );
              
              const playlistsUpdated = get().playlists.map(p => 
                p._id === playlistId ? playlistWithCover : p
              );
              
              set({ 
                userPlaylists: userPlaylistsUpdated,
                playlists: playlistsUpdated 
              });
              
              // Try to persist the cover update in the background
              try {
                playlistService.updatePlaylist(playlistId, { imageUrl: newImageUrl });
              } catch (coverUpdateError) {
                // Silent fail - we already have it updated locally
              }
            }
          } catch (coverError) {
            // Silently ignore cover generation errors - the song was still added
          }
        }
      }
    } catch (error: any) {
    }
  },

  removeSongFromPlaylist: async (playlistId: string, songId: string) => {
    try {
      // Remove song from playlist in Firestore
      const updatedPlaylist = await playlistService.removeSongFromPlaylist(playlistId, songId);
      
      // Update the current playlist in state
      set({ currentPlaylist: updatedPlaylist });
      
    } catch (error: any) {
    }
  },
}));
