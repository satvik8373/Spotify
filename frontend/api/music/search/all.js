export default async function handler(req, res) {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Proxy the request to the actual backend API
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:5000';
    const response = await fetch(`${apiUrl}/music/search/all?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    return res.status(200).json({ results: data });
  } catch (error) {
    console.error('Error in search API:', error);
    return res.status(500).json({ error: 'Failed to search songs' });
  }
} 