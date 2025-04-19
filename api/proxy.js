// api/proxy.js
export default async function handler(req, res) {
  const { pathname, query } = new URL(req.url, `http://${req.headers.host}`);
  
  // Forward request to backend
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const targetPath = pathname.replace(/^\/api/, '');
    
    // Reconstruct query string
    const queryString = Object.entries(query)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
      
    const targetUrl = `${backendUrl}${targetPath}${queryString ? `?${queryString}` : ''}`;
    
    console.log(`Proxying to: ${targetUrl}`);
    
    // Make the fetch request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    // Get response data
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      res.status(response.status).json(data);
    } else {
      data = await response.text();
      res.status(response.status).send(data);
    }
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 