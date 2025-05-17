import cloudinary from "../lib/cloudinary.js";

/**
 * Upload an image to Cloudinary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with uploaded image URL
 */
export const uploadImage = async (req, res, next) => {
  try {
    // Check if image file is provided
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded"
      });
    }

    const imageFile = req.files.image;
    
    // Validate file type
    if (!imageFile.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file"
      });
    }
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(imageFile.tempFilePath, {
      folder: "spotify_playlist_covers",
      resource_type: "image",
      quality: "auto",
      fetch_format: "auto",
    });
    
    // Return the image URL
    res.status(200).json({
      success: true,
      imageUrl: result.secure_url,
      public_id: result.public_id
    });
    
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading image",
      error: error.message
    });
  }
}; 