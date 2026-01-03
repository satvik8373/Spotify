// Simple test endpoint for Vercel
export default function handler(req, res) {
  res.status(200).json({
    message: 'Mavrixfy API Test - Working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
}