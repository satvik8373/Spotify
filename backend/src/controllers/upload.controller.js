import cloudinary from "../lib/cloudinary.js";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload an image to Cloudinary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Response with uploaded image URL
 */
export const uploadImage = async (req, res, next) => {
  try {
    console.log("Upload image request received", {
      files: req.files ? Object.keys(req.files) : 'none',
      contentType: req.headers['content-type']
    });
    
    // Check if image file is provided
    if (!req.files || !req.files.image) {
      console.log("No image file found in request", req.files);
      return res.status(400).json({
        success: false,
        message: "No image file uploaded"
      });
    }

    const imageFile = req.files.image;
    console.log("Image file received:", {
      name: imageFile.name,
      size: imageFile.size,
      mimetype: imageFile.mimetype
    });
    
    // Validate file type
    if (!imageFile.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file"
      });
    }
    
    // Check if we're in production and Cloudinary is configured
    if (process.env.NODE_ENV === "production" && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        // Upload to Cloudinary
        console.log("Uploading to Cloudinary...");
        const result = await cloudinary.v2.uploader.upload(imageFile.tempFilePath, {
          folder: "spotify_playlist_covers",
          resource_type: "image",
          quality: "auto",
          fetch_format: "auto",
        });
        
        console.log("Cloudinary upload successful", {
          url: result.secure_url,
          publicId: result.public_id
        });
        
        // Return the image URL
        return res.status(200).json({
          success: true,
          imageUrl: result.secure_url,
          public_id: result.public_id
        });
      } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", cloudinaryError);
        return res.status(500).json({
          success: false,
          message: "Error uploading to Cloudinary",
          error: cloudinaryError.message
        });
      }
    } else {
      // For development, save locally
      console.log("Saving image locally (development mode)");
      const fileName = `${uuidv4()}-${imageFile.name}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      const uploadPath = path.join(uploadDir, fileName);
      
      // Make sure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Move the file
      await imageFile.mv(uploadPath);
      
      // Return URL to access the file
      const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
      const imageUrl = `${baseUrl}/uploads/${fileName}`;
      
      console.log("Local upload successful", { imageUrl });
      
      return res.status(200).json({
        success: true,
        imageUrl: imageUrl
      });
    }
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading image",
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack
    });
  }
}; 