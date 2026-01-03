import axios from 'axios';

const DEEZER_API_BASE = 'https://api.deezer.com';

class DeezerService {
  async searchTracks(query, index = 0, limit = 20) {
    try {
      const response = await axios.get(`${DEEZER_API_BASE}/search/track`, {
        params: { q: query, index, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Deezer search error:', error.message);
      throw error;
    }
  }

  async getChartTracks(index = 0, limit = 15) {
    try {
      const response = await axios.get(`${DEEZER_API_BASE}/chart/0/tracks`, {
        params: { index, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Deezer chart error:', error.message);
      throw error;
    }
  }

  async getTrack(trackId) {
    try {
      const response = await axios.get(`${DEEZER_API_BASE}/track/${trackId}`);
      return response.data;
    } catch (error) {
      console.error('Deezer track error:', error.message);
      throw error;
    }
  }
}

export default new DeezerService();
