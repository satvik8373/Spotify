import axios from 'axios';

// Use the same API as the website for better reliability
const JIOSAAVN_API_BASE_URL = 'https://saavn.sumit.co/api';
const FALLBACK_API_BASE_URL = 'https://jiosaavn-api-privatecvc2.vercel.app';
const BACKUP_API_BASE_URL = 'https://saavn.me';

/**
 * Search for songs, albums, artists on JioSaavn
 * @param {string} query - Search query
 * @param {number} limit - Number of results to return
 * @returns {Promise<Object>} - Search results
 */
export const searchSongs = async (query, limit = 20) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs`, {
      params: {
        query,
        page: 1,
        limit
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching JioSaavn songs:', error.message);
    throw error;
  }
};

/**
 * Search for playlists on JioSaavn with fallback APIs
 * @param {string} query - Search query
 * @param {number} limit - Number of results to return
 * @returns {Promise<Object>} - Search results
 */
export const searchPlaylists = async (query, limit = 10) => {
  const apis = [JIOSAAVN_API_BASE_URL, FALLBACK_API_BASE_URL, BACKUP_API_BASE_URL];
  
  for (const apiUrl of apis) {
    try {
      console.log(`Trying JioSaavn API: ${apiUrl}/search/playlists`);
      const response = await axios.get(`${apiUrl}/search/playlists`, {
        params: {
          query,
          page: 1,
          limit
        },
        timeout: 10000
      });
      
      console.log(`API ${apiUrl} response:`, response.data);
      
      // Check if we got valid data
      if (response.data && (response.data.success !== false)) {
        return response.data;
      }
    } catch (error) {
      console.warn(`JioSaavn API ${apiUrl} failed:`, error.message);
      // Try next API
    }
  }
  
  // If all APIs failed, return empty result
  console.error('All JioSaavn APIs failed for playlist search');
  return {
    success: true,
    data: {
      total: 0,
      start: 0,
      results: []
    }
  };
};

/**
 * Get trending songs from JioSaavn with 2026 focus
 * @param {number} limit - Number of results to return
 * @returns {Promise<Object>} - Trending songs
 */
export const getTrendingSongs = async (limit = 20) => {
  try {
    // Try 2026-specific trending terms first
    const trending2026Terms = [
      'trending songs 2026',
      'top hits 2026', 
      'latest bollywood 2026',
      'superhits 2026',
      'viral songs 2026'
    ];

    for (const term of trending2026Terms) {
      try {
        const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs`, {
          params: {
            query: term,
            page: 1,
            limit
          }
        });
        
        if (response.data && response.data.results && response.data.results.length > 0) {
          return response.data;
        }
      } catch (error) {
        console.warn(`Failed to fetch with term: ${term}`, error.message);
      }
    }

    // Fallback to general trending
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs`, {
      params: {
        query: 'trending songs',
        page: 1,
        limit
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching JioSaavn trending songs:', error.message);
    throw error;
  }
};

/**
 * Get new releases from JioSaavn with 2026 focus
 * @param {number} limit - Number of results to return
 * @returns {Promise<Object>} - New releases
 */
export const getNewReleases = async (limit = 20) => {
  try {
    // Try 2026-specific new release terms first
    const newRelease2026Terms = [
      'new releases 2026',
      'latest songs 2026',
      'fresh bollywood 2026',
      'new hindi songs 2026',
      'latest hits 2026'
    ];

    for (const term of newRelease2026Terms) {
      try {
        const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs`, {
          params: {
            query: term,
            page: 1,
            limit
          }
        });
        
        if (response.data && response.data.results && response.data.results.length > 0) {
          return response.data;
        }
      } catch (error) {
        console.warn(`Failed to fetch with term: ${term}`, error.message);
      }
    }

    // Fallback to general new releases
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs`, {
      params: {
        query: 'new releases',
        page: 1,
        limit
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching JioSaavn new releases:', error.message);
    throw error;
  }
};

/**
 * Get song details from JioSaavn
 * @param {string} id - Song ID
 * @returns {Promise<Object>} - Song details
 */
export const getSongDetails = async (id) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/songs`, {
      params: { id }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching JioSaavn song details:', error.message);
    throw error;
  }
};

/**
 * Get album details from JioSaavn
 * @param {string} id - Album ID
 * @returns {Promise<Object>} - Album details
 */
export const getAlbumDetails = async (id) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/albums`, {
      params: { id }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching JioSaavn album details:', error.message);
    throw error;
  }
};

/**
 * Get playlist details from JioSaavn with fallback APIs
 * @param {string} id - Playlist ID
 * @returns {Promise<Object>} - Playlist details
 */
export const getPlaylistDetails = async (id) => {
  const apis = [JIOSAAVN_API_BASE_URL, FALLBACK_API_BASE_URL, BACKUP_API_BASE_URL];
  
  for (const apiUrl of apis) {
    try {
      console.log(`Trying JioSaavn API: ${apiUrl}/playlists`);
      const response = await axios.get(`${apiUrl}/playlists`, {
        params: { id },
        timeout: 10000
      });
      
      console.log(`API ${apiUrl} playlist details response:`, response.data);
      
      // Check if we got valid data
      if (response.data && (response.data.success !== false)) {
        return response.data;
      }
    } catch (error) {
      console.warn(`JioSaavn API ${apiUrl} failed for playlist details:`, error.message);
      // Try next API
    }
  }
  
  // If all APIs failed, throw error
  console.error('All JioSaavn APIs failed for playlist details');
  throw new Error('Failed to get playlist details from all APIs');
};

/**
 * Get lyrics for a song from JioSaavn
 * @param {string} id - Song ID
 * @returns {Promise<Object>} - Lyrics
 */
export const getLyrics = async (id) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/lyrics`, {
      params: { id }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching JioSaavn lyrics:', error.message);
    throw error;
  }
};

/**
 * Format JioSaavn song data to a consistent format
 * @param {Object} song - JioSaavn song object
 * @returns {Object} - Formatted song object
 */
export const formatSongData = (song) => {
  if (!song) return null;

  return {
    id: song.id,
    title: song.name,
    artist: song.primaryArtists,
    album: song.album ? song.album.name : '',
    year: song.year,
    duration: song.duration,
    image: song.image && song.image.length > 2 ? song.image[2].url : '',
    url: song.downloadUrl && song.downloadUrl.length > 4 ? song.downloadUrl[4].url : '',
    source: 'jiosaavn'
  };
}; 