/**
 * Smart Search API Route
 * GET /api/search/smart?q=<query>
 */

import express from 'express';
import { smartSearch } from '../services/smartSearch.service.js';

const router = express.Router();

router.get('/smart', async (req, res) => {
    const { q } = req.query;

    if (!q || !q.trim()) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
        const result = await smartSearch(q.trim());
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('[SmartSearchRoute] Error:', error.message);
        return res.status(500).json({ error: 'Search failed. Please try again.' });
    }
});

export default router;
