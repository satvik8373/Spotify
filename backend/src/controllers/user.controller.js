import { clerkClient } from "@clerk/express";
import admin from "firebase-admin";

export const getAllUsers = async (req, res, next) => {
	try {
		// List users from Firebase Auth instead of MongoDB
		const listUsersResult = await admin.auth().listUsers();
		const users = listUsersResult.users.map(user => ({
			uid: user.uid,
			email: user.email,
			displayName: user.displayName,
			photoURL: user.photoURL,
			// Don't include sensitive info like password
		}));
		
		res.status(200).json(users);
	} catch (error) {
		console.error('Error getting users:', error);
		next(error);
	}
};

export const checkAdminStatus = async (req, res, next) => {
	try {
		// The user is already authenticated and available in req.auth
		const userId = req.auth?.userId;
		
		if (!userId) {
			return res.status(401).json({ isAdmin: false, message: 'Unauthorized' });
		}
		
		let isAdmin = false;
		
		try {
			// Check if this is a Firebase user
			const userRecord = await admin.auth().getUser(userId);
			
			// Check if user's email matches admin email from env
			if (userRecord && userRecord.email) {
				isAdmin = process.env.ADMIN_EMAIL === userRecord.email;
				
				// You could also check custom claims if you've set them
				const customClaims = userRecord.customClaims || {};
				if (customClaims.admin === true) {
					isAdmin = true;
				}
			}
		} catch (firebaseError) {
			console.log("Not a Firebase user or Firebase error:", firebaseError.message);
			
			// If Firebase check fails, try Clerk
			try {
				// First check if this is a Clerk user
				const clerkUser = await clerkClient.users.getUser(userId);
				
				// Check if user's email matches admin email from env
				if (clerkUser && clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
					const userEmail = clerkUser.emailAddresses[0].emailAddress;
					isAdmin = process.env.ADMIN_EMAIL === userEmail;
				}
			} catch (clerkError) {
				console.log("Not a Clerk user or Clerk error:", clerkError.message);
				// Continue with isAdmin = false
			}
		}
		
		// Respond with admin status
		return res.status(200).json({ isAdmin });
		
	} catch (error) {
		console.error('Error checking admin status:', error);
		next(error);
	}
};
