import { clerkClient } from "@clerk/express";

export const protectRoute = async (req, res, next) => {
	console.log('[AUTH] Checking authentication:', {
		authHeader: req.headers.authorization ? 'Present' : 'Missing',
		authObject: req.auth ? 'Present' : 'Missing',
		userId: req.auth?.userId || 'None',
		uid: req.auth?.uid || 'None',
		email: req.auth?.email || 'None',
		path: req.path
	});
	
	// Check for either Clerk userId or Firebase uid
	if (!req.auth || (!req.auth.userId && !req.auth.uid)) {
		console.log('[AUTH] Authentication failed for path:', req.path);
		return res.status(401).json({ message: "Unauthorized - you must be logged in" });
	}
	
	console.log('[AUTH] Authentication successful for path:', req.path);
	next();
};

export const requireAdmin = async (req, res, next) => {
	try {
		console.log('[ADMIN AUTH] Checking admin status:', {
			authHeader: req.headers.authorization ? 'Present' : 'Missing',
			authObject: req.auth ? 'Present' : 'Missing',
			userId: req.auth?.userId || 'None',
			uid: req.auth?.uid || 'None',
			email: req.auth?.email || 'None',
			path: req.path,
			adminEmail: process.env.ADMIN_EMAIL || 'Not set'
		});
		
		// Check if req.auth exists first
		if (!req.auth || (!req.auth.userId && !req.auth.uid)) {
			console.log('[ADMIN AUTH] Authentication failed for path:', req.path);
			return res.status(401).json({ message: "Unauthorized - you must be logged in" });
		}

		// Use Clerk userId if available, otherwise try Firebase uid
		const userId = req.auth.userId || req.auth.uid;
		
		// For Firebase users, check admin status differently
		if (req.auth.uid && !req.auth.userId) {
			// Check if the user's email matches the admin email
			const isAdmin = process.env.ADMIN_EMAIL === req.auth.email;
			
			console.log('[ADMIN AUTH] Firebase admin check:', {
				userEmail: req.auth.email || 'None',
				adminEmail: process.env.ADMIN_EMAIL || 'Not set',
				isAdmin
			});
			
			if (!isAdmin) {
				console.log('[ADMIN AUTH] Admin access denied for Firebase user:', req.auth.email);
				return res.status(403).json({ message: "Unauthorized - you must be an admin" });
			}
			
			console.log('[ADMIN AUTH] Admin access granted for Firebase user:', req.auth.email);
			return next();
		}

		// For Clerk users
		const currentUser = await clerkClient.users.getUser(userId);
		const userEmail = currentUser.primaryEmailAddress?.emailAddress;
		const isAdmin = process.env.ADMIN_EMAIL === userEmail;
		
		console.log('[ADMIN AUTH] Clerk admin check:', {
			userEmail: userEmail || 'None',
			adminEmail: process.env.ADMIN_EMAIL || 'Not set',
			isAdmin
		});

		if (!isAdmin) {
			console.log('[ADMIN AUTH] Admin access denied for Clerk user:', userEmail);
			return res.status(403).json({ message: "Unauthorized - you must be an admin" });
		}

		console.log('[ADMIN AUTH] Admin access granted for Clerk user:', userEmail);
		next();
	} catch (error) {
		console.error("[ADMIN AUTH] Admin auth error:", error);
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
