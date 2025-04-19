import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Forward API requests to the backend
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    
    // Build the target URL by extracting the path from the request
    const targetPath = req.url.replace(/^\/api/, '');
    const targetUrl = `${backendUrl}${targetPath}`;
    
    console.log(`Proxying request to: ${targetUrl}`);
    
    // Forward method, headers, and body
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        'x-forwarded-host': req.headers.host,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    // Get response data
    const data = await response.text();
    
    // Forward response status and headers
    res.status(response.status);
    
    // Set response headers
    for (const [key, value] of Object.entries(response.headers)) {
      if (key !== 'transfer-encoding' && key !== 'connection') {
        res.setHeader(key, value);
      }
    }
    
    // Send response data
    res.send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
} 