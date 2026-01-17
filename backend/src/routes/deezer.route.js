import { Router } from 'express';
import { searchTracks, getChartTracks, getTrack } from '../controllers/deezer.controller.js';

const router = Router();

router.get('/search/track', searchTracks);
router.get('/chart/tracks', getChartTracks);
router.get('/track/:id', getTrack);

export default router;
