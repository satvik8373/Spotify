import axios from 'axios';

// Spotify API credentials
const CLIENT_ID = '7f22a495ad7e4587acf6cc2f82e41748';
const CLIENT_SECRET = '6bba9755ba50486cb299448e011b55e3';
const REDIRECT_URI = 'https://mavrixfilms.live/spotify-callback';
// const REDIRECT_URI = window.location.origin + '/spotify-callback'; // Old dynamic URI that was causing INVALID_CLIENT error

// Spotify API URLs
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Token storage keys
const TOKEN_STORAGE_KEY = 'spotify_access_token';
const TOKEN_EXPIRY_KEY = 'spotify_token_expiry';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';

// Scopes needed for your app
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
];

/**
 * Generate Spotify authorization URL
 */
export const getAuthorizationUrl = (): string => {
  const state = generateRandomString(16);
  localStorage.setItem('spotify_auth_state', state);

  const queryParams = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    state: state,
    scope: SCOPES.join(' '),
  });

  return `${SPOTIFY_AUTH_URL}?${queryParams.toString()}`;
};

/**
 * Generate a random string for state verification
 */
const generateRandomString = (length: number): string => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

/**
 * Exchange authorization code for access token
 */
export const getAccessToken = async (code: string): Promise<boolean> => {
  try {
    const response = await axios.post(
      SPOTIFY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data) {
      const { access_token, refresh_token, expires_in } = response.data;
      const expiryTime = new Date().getTime() + expires_in * 1000;
      
      localStorage.setItem(TOKEN_STORAGE_KEY, access_token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
      
      if (refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error getting access token:', error);
    return false;
  }
};

/**
 * Check if token is expired and refresh if needed
 */
export const getValidToken = async (): Promise<string | null> => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  if (!token || !expiryTime) {
    return null;
  }
  
  const now = new Date().getTime();
  
  // If token is expired or will expire in the next 5 minutes
  if (now >= parseInt(expiryTime) - 300000) {
    const refreshed = await refreshToken();
    if (!refreshed) {
      return null;
    }
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  
  return token;
};

/**
 * Refresh the access token using refresh token
 */
export const refreshToken = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  
  if (!refreshToken) {
    return false;
  }
  
  try {
    const response = await axios.post(
      SPOTIFY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    if (response.data) {
      const { access_token, expires_in, refresh_token } = response.data;
      const expiryTime = new Date().getTime() + expires_in * 1000;
      
      localStorage.setItem(TOKEN_STORAGE_KEY, access_token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
      
      if (refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
};

/**
 * Check if user is authenticated with Spotify
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  if (!token || !expiryTime) {
    return false;
  }
  
  const now = new Date().getTime();
  return now < parseInt(expiryTime);
};

/**
 * Create an axios instance with auth headers
 */
const createAuthenticatedClient = async () => {
  const token = await getValidToken();
  
  if (!token) {
    throw new Error('No valid token available');
  }
  
  return axios.create({
    baseURL: SPOTIFY_API_BASE,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

/**
 * Get current user's profile
 */
export const getCurrentUserProfile = async () => {
  try {
    const apiClient = await createAuthenticatedClient();
    const response = await apiClient.get('/me');
    return response.data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Get user's playlists
 */
export const getUserPlaylists = async (limit = 20, offset = 0) => {
  try {
    const apiClient = await createAuthenticatedClient();
    const response = await apiClient.get(`/me/playlists`, {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting user playlists:', error);
    throw error;
  }
};

/**
 * Get a specific playlist by ID
 */
export const getPlaylist = async (playlistId: string) => {
  try {
    const apiClient = await createAuthenticatedClient();
    const response = await apiClient.get(`/playlists/${playlistId}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting playlist with ID ${playlistId}:`, error);
    throw error;
  }
};

/**
 * Get playlist tracks
 */
export const getPlaylistTracks = async (playlistId: string, limit = 100, offset = 0) => {
  try {
    const apiClient = await createAuthenticatedClient();
    const response = await apiClient.get(`/playlists/${playlistId}/tracks`, {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error(`Error getting tracks for playlist ${playlistId}:`, error);
    throw error;
  }
};

/**
 * Logout from Spotify (clear tokens)
 */
export const logout = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Format track data to be consistent with the app's Song model
 */
export const formatSpotifyTrack = (track: any) => {
  if (!track || !track.track) return null;
  const trackData = track.track;
  
  return {
    id: trackData.id,
    title: trackData.name,
    artist: trackData.artists.map((artist: any) => artist.name).join(', '),
    imageUrl: trackData.album?.images[0]?.url || '',
    audioUrl: trackData.preview_url || '',
    duration: Math.floor(trackData.duration_ms / 1000),
    album: trackData.album?.name || '',
    year: trackData.album?.release_date ? trackData.album.release_date.substring(0, 4) : '',
    source: 'spotify'
  };
};

/**
 * Format playlist data to match app's playlist model
 */
export const formatSpotifyPlaylist = (playlist: any) => {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description || '',
    imageUrl: playlist.images && playlist.images[0] ? playlist.images[0].url : '',
    owner: playlist.owner?.display_name || 'Spotify User',
    tracksCount: playlist.tracks?.total || 0,
    source: 'spotify',
    externalUrl: playlist.external_urls?.spotify || '',
  };
}; 