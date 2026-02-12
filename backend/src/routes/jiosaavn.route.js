import { Router } from 'express';
import * as jiosaavnService from '../services/jiosaavn.service.js';

const router = Router();

// Search songs
router.get('/search/songs', async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const data = await jiosaavnService.searchSongs(query, parseInt(limit));
    res.json(data);
  } catch (error) {
    console.error('Search songs error:', error);
    res.status(500).json({ error: 'Failed to search songs' });
  }
});

// Search playlists
router.get('/search/playlists', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const data = await jiosaavnService.searchPlaylists(query, parseInt(limit));
    res.json(data);
  } catch (error) {
    console.error('Search playlists error:', error);
    res.status(500).json({ error: 'Failed to search playlists' });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { id: 'trending', name: 'Trending Now', icon: '🔥', query: 'trending now 2026', priority: 10 },
      { id: 'bollywood', name: 'Bollywood', icon: '🎬', query: 'bollywood hits', priority: 9 },
      { id: 'romantic', name: 'Romantic', icon: '💕', query: 'romantic songs', priority: 8 },
      { id: 'punjabi', name: 'Punjabi', icon: '🎵', query: 'punjabi hits', priority: 7 },
      { id: 'party', name: 'Party', icon: '🎉', query: 'party songs 2026', priority: 6 },
      { id: 'workout', name: 'Workout', icon: '💪', query: 'workout songs 2026', priority: 5 },
      { id: 'devotional', name: 'Devotional', icon: '🙏', query: 'devotional songs 2026', priority: 4 },
      { id: 'retro', name: 'Retro Hits', icon: '📻', query: '90s hits', priority: 3 },
      { id: 'regional', name: 'Regional', icon: '🌍', query: 'tamil hits 2026', priority: 2 },
      { id: 'international', name: 'International', icon: '🌎', query: 'english songs 2026', priority: 1 },
    ];
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Get trending songs
router.get('/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const data = await jiosaavnService.getTrendingSongs(parseInt(limit));
    res.json(data);
  } catch (error) {
    console.error('Get trending songs error:', error);
    res.status(500).json({ error: 'Failed to get trending songs' });
  }
});

// Get new releases
router.get('/new-releases', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const data = await jiosaavnService.getNewReleases(parseInt(limit));
    res.json(data);
  } catch (error) {
    console.error('Get new releases error:', error);
    res.status(500).json({ error: 'Failed to get new releases' });
  }
});

// Get song details
router.get('/songs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await jiosaavnService.getSongDetails(id);
    res.json(data);
  } catch (error) {
    console.error('Get song details error:', error);
    res.status(500).json({ error: 'Failed to get song details' });
  }
});

// Get playlist details (supports both query param and path param)
router.get('/playlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await jiosaavnService.getPlaylistDetails(id);
    res.json(data);
  } catch (error) {
    console.error('Get playlist details error:', error);
    res.status(500).json({ error: 'Failed to get playlist details' });
  }
});

// Get playlist details with query parameter (for mobile app compatibility)
router.get('/playlists', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }
    
    const data = await jiosaavnService.getPlaylistDetails(id);
    res.json(data);
  } catch (error) {
    console.error('Get playlist details error:', error);
    res.status(500).json({ error: 'Failed to get playlist details' });
  }
});

export default router;
