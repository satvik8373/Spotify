import { Router } from 'express';
import { connectDB } from '../lib/db.js';
import { clerkClient } from '@clerk/express';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const db = await connectDB();
    const dbStatus = db.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? 'set' : 'missing',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? 'set' : 'missing',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL ? 'set' : 'missing'
    };
    
    // Check Clerk connection
    let clerkStatus = 'unknown';
    try {
      await clerkClient.users.getUserList();
      clerkStatus = 'connected';
    } catch (error) {
      clerkStatus = 'error';
    }
    
    res.status(200).json({
      status: 'ok',
      database: dbStatus,
      clerk: clerkStatus,
      environment: envVars
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

export default router; 