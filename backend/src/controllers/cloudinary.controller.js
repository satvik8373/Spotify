import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'djqq8kba8',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Helper function to convert buffer to stream for Cloudinary upload
 */
const bufferToStream = (buffer) => {
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    }
  });
  return readable;
};

/**
 * Upload an image to Cloudinary
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get folder from query or use default
    const folder = req.query.folder || 'spotify_clone/playlists';

    // Create upload stream
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 500, height: 500, crop: 'fill' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      // Pipe buffer to upload stream
      bufferToStream(req.file.buffer).pipe(uploadStream);
    });

    const result = await uploadPromise;

    // Return success response
    return res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      version: result.version
    });
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
};

/**
 * Delete an image from Cloudinary
 */
export const deleteImage = async (req, res) => {
  try {
    const { public_id } = req.params;

    if (!public_id) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'image'
    });

    return res.status(200).json({
      success: true,
      result: result.result
    });
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
};

/**
 * Generate a text-based image placeholder for playlists without images
 */
export const createTextPlaceholder = async (req, res) => {
  try {
    const { text, background } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Use first letter of text for simplicity
    const letter = text.charAt(0).toUpperCase();
    
    // Generate a random color if not provided
    const bgColor = background || '#' + Math.floor(Math.random() * 16777215).toString(16);

    // Create a text overlay image
    const result = await cloudinary.uploader.upload(
      'data:image/svg+xml;base64,' + Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
          <rect width="100%" height="100%" fill="${bgColor}" />
          <text x="50%" y="50%" font-family="Arial" font-size="240" fill="white" text-anchor="middle" dominant-baseline="middle">${letter}</text>
        </svg>
      `).toString('base64'),
      {
        folder: 'spotify_clone/placeholders',
        public_id: `placeholder_${Date.now()}`,
        resource_type: 'image',
        format: 'png'
      }
    );

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error('Error creating placeholder:', error);
    return res.status(500).json({ error: 'Failed to create placeholder image' });
  }
}; 