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

// Clerk authentication callback
export const authCallback = async (req, res, next) => {
	try {
		const { id, firstName, lastName, imageUrl } = req.body;

		// Check if user exists in Firebase
		try {
			// Try to get the user
			await admin.auth().getUser(id);
			// User exists, no need to create
		} catch (error) {
			if (error.code === 'auth/user-not-found') {
				// Create user in Firebase if not exists
				await admin.auth().createUser({
					uid: id, // Use Clerk ID as Firebase UID
					displayName: `${firstName || ""} ${lastName || ""}`.trim(),
					photoURL: imageUrl || "https://res.cloudinary.com/djqq8kba8/image/upload/v1/spotify-clone/defaults/user_default.png",
					// No password needed since we're using external auth
					disabled: false
				});
			} else {
				throw error;
			}
		}

		res.status(200).json({ success: true });
	} catch (error) {
		console.log("Error in auth callback", error);
		next(error);
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
			console.log("Firebase token verification failed, trying JWT:", firebaseError);
			
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
		
		console.log("Error in verify token:", error);
		next(error);
	}
};

// Check if user is authenticated and return user info
export const checkAuth = async (req, res) => {
	try {
		// If we got here, the user is authenticated (protectRoute middleware passed)
		const userId = req.auth?.userId || req.auth?.uid;
		const email = req.auth?.email;
		
		// Check if this is an admin
		const isAdmin = email && process.env.ADMIN_EMAIL === email;
		
		res.json({
			success: true,
			authenticated: true,
			userId,
			email,
			isAdmin,
			authType: req.auth?.userId ? 'clerk' : 'firebase'
		});
	} catch (error) {
		console.error("Error in checkAuth:", error);
		res.status(500).json({ 
			success: false,
			message: error.message 
		});
	}
};
