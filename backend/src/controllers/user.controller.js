import { User } from "../models/user.model.js";
import { clerkClient } from "@clerk/express";

export const getAllUsers = async (req, res, next) => {
	try {
		const users = await User.find().select('-password');
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
			// First check if this is a Clerk user
			const clerkUser = await clerkClient.users.getUser(userId);
			
			// Check if user's email matches admin email from env
			if (clerkUser && clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
				const userEmail = clerkUser.emailAddresses[0].emailAddress;
				isAdmin = process.env.ADMIN_EMAIL === userEmail;
			}
		} catch (clerkError) {
			console.log("Not a Clerk user or Clerk error, trying database lookup:", clerkError.message);
			
			// If Clerk check fails, try database
			try {
				// Try to find the user in the database
				const user = await User.findOne({ clerkId: userId });
				
				if (user) {
					// Check if the user has admin role/flag
					isAdmin = user.role === 'admin' || user.isAdmin === true;
				}
			} catch (dbError) {
				console.error("Database lookup error:", dbError);
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
