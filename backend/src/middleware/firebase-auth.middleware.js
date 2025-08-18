import admin from '../config/firebase.js';

// Middleware to verify Firebase token
export const firebaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Unauthorized - No token provided',
        success: false
      });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Add verified user data to request
      req.auth = {
        uid: decodedToken.uid,
        email: decodedToken.email, 
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name,
        picture: decodedToken.picture,
        firebase: decodedToken
      };
      
      next();
    } catch (error) {
      console.error('Firebase auth error:', error.message);
      
      // Check if it's a Firebase initialization error
      if (error.message.includes('Unable to detect a Project Id')) {
        console.error('Firebase Project ID not configured properly. Please check your environment variables.');
        return res.status(500).json({
          message: 'Authentication service temporarily unavailable',
          success: false,
          error: process.env.NODE_ENV === 'development' ? 'Firebase Project ID not configured' : undefined
        });
      }
      
      return res.status(401).json({
        message: 'Invalid or expired token',
        success: false,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } catch (error) {
    console.error('Firebase auth middleware error:', error);
    next(error);
  }
};

// Middleware that tries Firebase auth but continues if not available
export const optionalFirebaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without auth
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Add verified user data to request
      req.auth = {
        uid: decodedToken.uid,
        email: decodedToken.email, 
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name,
        picture: decodedToken.picture,
        firebase: decodedToken
      };
    } catch (error) {
      // Don't fail on invalid token, just log and continue
      if (error.message.includes('Unable to detect a Project Id')) {
        console.error('Firebase Project ID not configured properly. Please check your environment variables.');
      } else {
        console.log('Optional Firebase auth failed:', error.message);
      }
    }
    
    next();
  } catch (error) {
    console.error('Firebase auth middleware error:', error);
    next(error);
  }
}; 