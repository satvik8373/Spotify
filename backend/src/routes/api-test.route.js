import express from 'express';
import { clerkMiddleware } from "@clerk/express";

const router = express.Router();

// Basic health check
router.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: process.env.VERCEL ? 'yes' : 'no' 
  });
});

// Test route to check database connection
router.get('/db-status', async (req, res) => {
  try {
    // Check if mongoose is connected
    const isConnected = req.app.get('mongoose') ? 
      req.app.get('mongoose').connection.readyState === 1 : 
      false;
    
    res.status(200).json({
      status: 'success',
      database: {
        connected: isConnected,
        status: isConnected ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to check database status',
      error: error.message
    });
  }
});

// Test all routes
router.get('/routes', (req, res) => {
  const routes = [
    '/api/users',
    '/api/admin',
    '/api/auth',
    '/api/songs',
    '/api/albums',
    '/api/stats',
    '/api/spotify',
    '/api/music',
    '/api/playlists',
    '/api/upload'
  ];
  
  res.status(200).json({
    status: 'success',
    routes,
    message: 'All available API routes'
  });
});

// Path-to-regexp error diagnostic
router.get('/path-regexp-test', (req, res) => {
  try {
    // Import path-to-regexp
    const { pathToRegexp } = require('path-to-regexp');
    
    // Test valid paths
    const validPath = pathToRegexp('/test/:id');
    
    // Test problematic paths
    let errorPaths = [];
    try {
      const path1 = pathToRegexp('/{*path}');
      errorPaths.push('Path /{*path} is valid');
    } catch (e) {
      errorPaths.push(`Path /{*path} error: ${e.message}`);
    }
    
    try {
      const path2 = pathToRegexp('*');
      errorPaths.push('Path * is valid');
    } catch (e) {
      errorPaths.push(`Path * error: ${e.message}`);
    }
    
    res.status(200).json({
      status: 'success',
      validPath: true,
      errorTests: errorPaths,
      message: 'Path-to-regexp diagnostic test'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to run path-to-regexp diagnostic',
      error: error.message
    });
  }
});

// Auth debug endpoint
router.get("/auth-debug", clerkMiddleware(), (req, res) => {
  res.status(200).json({
    auth: req.auth ? {
      userId: req.auth.userId,
      sessionId: req.auth.sessionId,
      isAuthenticated: !!req.auth.userId
    } : null,
    headers: {
      authorization: req.headers.authorization ? 'Present (not shown)' : 'Missing',
      cookie: req.headers.cookie ? 'Present (not shown)' : 'Missing',
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'Not set'
  });
});

// Debug endpoint for playlists route
router.get("/playlists-debug", (req, res) => {
  res.status(200).json({
    message: "This endpoint can be accessed without authentication",
    endpoints: {
      allPlaylists: "/api/playlists",
      userPlaylists: "/api/playlists/user",
      playlistById: "/api/playlists/:id"
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    corsConfig: {
      origin: '*',
      credentialsSupported: true
    }
  });
});

// Test connection between frontend and backend
router.post("/connection-test", (req, res) => {
  const { testId, timestamp } = req.body;
  
  res.status(200).json({
    status: 'success',
    message: 'Connection test successful',
    echo: {
      testId,
      timestamp,
      received: new Date().toISOString()
    },
    server: {
      environment: process.env.NODE_ENV || 'development',
      vercel: process.env.VERCEL ? 'yes' : 'no'
    }
  });
});

export default router; 