export default async function handler(req, res) {
  try {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Call the JioSaavn API directly
    const response = await fetch(
      'https://saavn.dev/api/search/songs?query=english%20top%20hits&page=1&limit=15'
    );
    
    if (!response.ok) {
      throw new Error(`JioSaavn API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process and filter the data to ensure only valid entries are returned
    const processedResults = data.data.results
      .filter(item => item.downloadUrl && item.downloadUrl.length > 0)
      .map(item => ({
        id: item.id,
        title: item.name,
        artist: item.primaryArtists,
        album: item.album.name,
        year: item.year,
        duration: item.duration,
        image: item.image[2].url,
        url: item.downloadUrl[4].url,
      }));
    
    return res.status(200).json({ 
      status: 'success',
      message: 'Hollywood songs fetched successfully',
      timestamp: new Date().toISOString(),
      data: { results: processedResults }
    });
  } catch (error) {
    console.error('Error in hollywood API:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch hollywood songs',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 