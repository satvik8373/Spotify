import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import admin from "firebase-admin";

// Register a new user
export const register = async (req, res) => {
	try {
		// Firebase implementation would go here
		res.status(201).json({ 
			message: "This endpoint now uses Firebase. Please use the frontend Firebase implementation."
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Login a user
export const login = async (req, res) => {
	try {
		// Firebase implementation would go here
		res.json({ 
			message: "This endpoint now uses Firebase. Please use the frontend Firebase implementation."
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Process Firebase authentication
export const firebaseAuth = async (req, res) => {
	try {
		// The Firebase ID token will be verified by middleware
		// Just return the user info from the request
		res.json({
			user: req.auth || { message: "Firebase authentication successful" }
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};



// Verify JWT token and get user info
export const verifyToken = async (req, res, next) => {
	try {
		const token = req.headers.authorization?.split(' ')[1];
		
		if (!token) {
			return res.status(401).json({
				success: false,
				message: "No token provided",
			});
		}
		
		try {
			// Verify Firebase token
			const decodedToken = await admin.auth().verifyIdToken(token);
			const uid = decodedToken.uid;
			
			// Get user from Firebase
			const userRecord = await admin.auth().getUser(uid);
			
			if (!userRecord) {
				return res.status(404).json({
					success: false,
					message: "User not found",
				});
			}
		 
			// Return user info
			return res.status(200).json({
				success: true,
				user: {
					uid: userRecord.uid,
					email: userRecord.email,
					displayName: userRecord.displayName,
					photoURL: userRecord.photoURL,
				},
			});
		} catch (firebaseError) {
			// If Firebase fails, try standard JWT as fallback
			const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
			
			return res.status(200).json({
				success: true,
				user: decoded,
				authType: "jwt"
			});
		}
	} catch (error) {
		if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
			return res.status(401).json({
				success: false,
				message: "Invalid or expired token",
			});
		}
		
		next(error);
	}
};

// Logout endpoint (no-op for Firebase, kept for compatibility)
export const logout = async (req, res) => {
  try {
    // For Firebase client-side sign out, nothing to do on server.
    // Optionally we could revoke tokens:
    const { uid } = req.body || {};
    if (uid) {
      try {
        await admin.auth().revokeRefreshTokens(uid);
      } catch {}
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(200).json({ success: true });
  }
};
