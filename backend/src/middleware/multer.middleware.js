import multer from 'multer';

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// Set file size limit (5MB)
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
};

// File filter to allow only image files
const fileFilter = (req, file, cb) => {
  // Accept image files only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create multer instance for single file uploads
export const uploadSingle = multer({
  storage,
  limits,
  fileFilter,
}).single('file');

// Create multer instance for multiple file uploads
export const uploadMultiple = multer({
  storage,
  limits,
  fileFilter,
}).array('files', 5); // Allow up to 5 files

// Middleware to handle single file upload errors
export const handleSingleUpload = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size too large. Maximum size is 5MB.',
        });
      }
      return res.status(400).json({
        error: `Multer upload error: ${err.message}`,
      });
    } else if (err) {
      // An unknown error occurred
      return res.status(400).json({
        error: err.message,
      });
    }
    
    // Everything went fine, proceed
    next();
  });
};

// Middleware to handle multiple file upload errors
export const handleMultipleUpload = (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size too large. Maximum size is 5MB.',
        });
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          error: 'Too many files. Maximum is 5 files.',
        });
      }
      return res.status(400).json({
        error: `Multer upload error: ${err.message}`,
      });
    } else if (err) {
      // An unknown error occurred
      return res.status(400).json({
        error: err.message,
      });
    }
    
    // Everything went fine, proceed
    next();
  });
}; 