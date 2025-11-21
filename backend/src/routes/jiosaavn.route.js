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

export default router;
