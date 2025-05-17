import { clerkClient } from "@clerk/express";

export const protectRoute = async (req, res, next) => {
	// Check for either Clerk userId or Firebase uid
	if (!req.auth || (!req.auth.userId && !req.auth.uid)) {
		return res.status(401).json({ message: "Unauthorized - you must be logged in" });
	}
	next();
};

export const requireAdmin = async (req, res, next) => {
	try {
		// Check if req.auth exists first
		if (!req.auth || (!req.auth.userId && !req.auth.uid)) {
			return res.status(401).json({ message: "Unauthorized - you must be logged in" });
		}

		// Use Clerk userId if available, otherwise try Firebase uid
		const userId = req.auth.userId || req.auth.uid;
		
		// For Firebase users, check admin status differently
		if (req.auth.uid && !req.auth.userId) {
			// Check if the user's email matches the admin email
			const isAdmin = process.env.ADMIN_EMAIL === req.auth.email;
			
			if (!isAdmin) {
				return res.status(403).json({ message: "Unauthorized - you must be an admin" });
			}
			
			return next();
		}

		// For Clerk users
		const currentUser = await clerkClient.users.getUser(userId);
		const isAdmin = process.env.ADMIN_EMAIL === currentUser.primaryEmailAddress?.emailAddress;

		if (!isAdmin) {
			return res.status(403).json({ message: "Unauthorized - you must be an admin" });
		}

		next();
	} catch (error) {
		console.error("Admin auth error:", error);
		next(error);
	}
};

export const isAuthenticated = async (req, res, next) => {
	// Consider authenticated if we have a Firebase UID or Clerk user ID
	if (req.auth?.uid || req.auth?.userId) {
		return next();
	}
	
	return res.status(401).json({ 
		message: "Unauthorized - Authentication required" 
	});
};
