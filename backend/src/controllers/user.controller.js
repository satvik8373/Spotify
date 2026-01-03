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


