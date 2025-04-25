export default async function handler(req, res) {
  res.status(200).json({
    message: 'Spotify Clone API is running',
    endpoints: [
      '/api/music/trending/all',
      '/api/music/new-releases/all',
      '/api/music/search/all?query=your_search_term'
    ]
  });
} 