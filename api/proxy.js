// api/proxy.js - Vercel serverless function to proxy API requests
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    // Get the path from the request URL
    const path = req.url.replace(/^\/api/, '');
    
    // Construct the backend URL
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const targetUrl = `${backendUrl}${path}`;
    
    console.log(`Proxying request to: ${targetUrl}`);
    
    // Forward the request to the backend
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers,
        // Remove headers that might cause issues
        host: undefined,
        'x-forwarded-host': req.headers.host || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' && req.body 
        ? JSON.stringify(req.body) 
        : undefined,
    });
    
    // Get content type to determine how to handle the response
    const contentType = response.headers.get('content-type');
    
    // Set status code
    res.status(response.status);
    
    // Forward relevant headers
    for (const [key, value] of Object.entries(response.headers.raw())) {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        try {
          res.setHeader(key, value);
        } catch (e) {
          console.warn(`Could not set header ${key}: ${e.message}`);
        }
      }
    }
    
    // Return the response based on content type
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return res.json(data);
    } else {
      const text = await response.text();
      return res.send(text);
    }
  } catch (error) {
    console.error('API proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
} 