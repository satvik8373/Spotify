import { clerkClient } from "@clerk/express";

export const protectRoute = async (req, res, next) => {
	if (!req.auth.userId) {
		return res.status(401).json({ message: "Unauthorized - you must be logged in" });
	}
	next();
};

export const requireAdmin = async (req, res, next) => {
	try {
		const currentUser = await clerkClient.users.getUser(req.auth.userId);
		const isAdmin = process.env.ADMIN_EMAIL === currentUser.primaryEmailAddress?.emailAddress;

		if (!isAdmin) {
			return res.status(403).json({ message: "Unauthorized - you must be an admin" });
		}

		next();
	} catch (error) {
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
