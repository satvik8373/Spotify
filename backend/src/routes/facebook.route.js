import express from 'express';
import {
  authenticateWithFacebook,
  getFacebookProfile,
  revokeFacebookToken
} from '../controllers/facebook.controller.js';

const router = express.Router();

// Facebook authentication routes
router.post('/auth', authenticateWithFacebook);
router.post('/profile', getFacebookProfile);
router.post('/revoke', revokeFacebookToken);

export default router;