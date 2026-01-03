export default async function handler(req, res) {
  try {
    // Proxy the request to the actual backend API
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:5000';
    const response = await fetch(`${apiUrl}/music/new-releases/all`);
    const data = await response.json();
    
    return res.status(200).json({ results: data });
  } catch (error) {
    console.error('Error in new releases API:', error);
    return res.status(500).json({ error: 'Failed to fetch new releases' });
  }
} 