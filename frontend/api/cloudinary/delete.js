import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'djqq8kba8',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the public ID from the query parameters
    const { publicId } = req.query;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    // Use Cloudinary API to delete the image
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });

    return res.status(200).json({
      success: true,
      result: result.result,
    });
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return res.status(500).json({ 
      error: 'Failed to delete image', 
      details: error.message 
    });
  }
} 