import axios from 'axios';

// Base URL for JioSaavn unofficial API - using working alternative
const JIOSAAVN_API_BASE_URL = 'https://jiosaavn-api-privatecvc2.vercel.app';

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
 * Get trending songs from JioSaavn
 * @param {number} limit - Number of results to return
 * @returns {Promise<Object>} - Trending songs
 */
export const getTrendingSongs = async (limit = 20) => {
  try {
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
 * Get new releases from JioSaavn
 * @param {number} limit - Number of results to return
 * @returns {Promise<Object>} - New releases
 */
export const getNewReleases = async (limit = 20) => {
  try {
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
 * Get playlist details from JioSaavn
 * @param {string} id - Playlist ID
 * @returns {Promise<Object>} - Playlist details
 */
export const getPlaylistDetails = async (id) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/playlists`, {
      params: { id }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching JioSaavn playlist details:', error.message);
    throw error;
  }
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
    image: song.image && song.image.length > 0 ? song.image[song.image.length - 1].url : '',
    url: song.downloadUrl && song.downloadUrl.length > 0 ? song.downloadUrl[song.downloadUrl.length - 1].url : '',
    source: 'jiosaavn'
  };
}; 