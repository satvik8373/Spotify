import { Router } from 'express';
import { sendOTP, verifyOTP } from '../controllers/otp.controller.js';

const router = Router();

// Send OTP to email
router.post('/send', sendOTP);

// Verify OTP
router.post('/verify', verifyOTP);

export default router;
