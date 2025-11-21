import deezerService from '../services/deezer.service.js';

export const searchTracks = async (req, res) => {
  try {
    const { q, index = 0, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const data = await deezerService.searchTracks(q, parseInt(index), parseInt(limit));
    res.json(data);
  } catch (error) {
    console.error('Search tracks error:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
};

export const getChartTracks = async (req, res) => {
  try {
    const { index = 0, limit = 15 } = req.query;
    const data = await deezerService.getChartTracks(parseInt(index), parseInt(limit));
    res.json(data);
  } catch (error) {
    console.error('Get chart tracks error:', error);
    res.status(500).json({ error: 'Failed to get chart tracks' });
  }
};

export const getTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await deezerService.getTrack(id);
    res.json(data);
  } catch (error) {
    console.error('Get track error:', error);
    res.status(500).json({ error: 'Failed to get track' });
  }
};
