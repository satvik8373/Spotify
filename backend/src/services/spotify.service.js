import axios from 'axios';

// Spotify API configuration
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

// Spotify API endpoints
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Scopes for Spotify API access (add more as needed)
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-library-read',
  'user-top-read',
  'user-read-recently-played',
  'playlist-read-private',
  'streaming',
];

// Generate a random string for state parameter
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Get authorization URL for Spotify login
export const getAuthorizationUrl = () => {
  const state = generateRandomString(16);
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    state: state,
    scope: SCOPES.join(' '),
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
};

// Exchange authorization code for access token
export const getAccessToken = async (clientId, clientSecret, code = null) => {
  try {
    // If code is provided, use authorization code flow
    if (code) {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      });

      const response = await axios.post(SPOTIFY_TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
      });

      return response.data;
    } 
    // Otherwise use client credentials flow
    else {
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
      });

      const response = await axios.post(SPOTIFY_TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
      });

      return response.data;
    }
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
    throw error;
  }
};

// Refresh access token
export const refreshAccessToken = async (refreshToken) => {
  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await axios.post(SPOTIFY_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    throw error;
  }
};

// Get user's profile
export const getUserProfile = async (accessToken) => {
  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting user profile:', error.response?.data || error.message);
    throw error;
  }
};

// Get user's playlists
export const getUserPlaylists = async (accessToken) => {
  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/me/playlists`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting user playlists:', error.response?.data || error.message);
    throw error;
  }
};

// Get tracks from playlist
export const getPlaylistTracks = async (accessToken, playlistId) => {
  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting playlist tracks:', error.response?.data || error.message);
    throw error;
  }
};

// Get playlist details
export const getPlaylist = async (accessToken, playlistId) => {
  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/playlists/${playlistId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting playlist:', error.response?.data || error.message);
    throw error;
  }
};

// Search for tracks, albums, artists, etc.
export const search = async (accessToken, query, type = 'track,artist,album', limit = 20) => {
  try {
    const params = new URLSearchParams({
      q: query,
      type,
      limit,
    });
    
    const response = await axios.get(`${SPOTIFY_API_BASE}/search?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error searching:', error.response?.data || error.message);
    throw error;
  }
};

// Get track details
export const getTrack = async (accessToken, trackId) => {
  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting track:', error.response?.data || error.message);
    throw error;
  }
};

// Get album details
export const getAlbum = async (accessToken, albumId) => {
  try {
    const response = await axios.get(`${SPOTIFY_API_BASE}/albums/${albumId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting album:', error.response?.data || error.message);
    throw error;
  }
};

// Get new releases
export const getNewReleases = async (accessToken, limit = 20, country = 'US') => {
  try {
    const params = new URLSearchParams({
      limit,
      country,
    });
    
    const response = await axios.get(`${SPOTIFY_API_BASE}/browse/new-releases?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting new releases:', error.response?.data || error.message);
    throw error;
  }
};

// Format Spotify song data to a consistent format
export const formatSongData = (track) => {
  if (!track) return null;
  
  return {
    id: track.id,
    title: track.name,
    artist: track.artists.map(artist => artist.name).join(", "),
    album: track.album?.name || '',
    year: track.album?.release_date ? track.album.release_date.substring(0, 4) : '',
    duration: Math.floor(track.duration_ms / 1000),
    image: track.album?.images.length > 0 ? track.album.images[1].url : '',
    preview_url: track.preview_url,
    source: 'spotify'
  };
}; 