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

export const deleteUserAccount = async (req, res, next) => {
	try {
		const userId = req.auth?.uid;

		if (!userId) {
			return res.status(401).json({ 
				message: 'Unauthorized - User ID not found',
				success: false
			});
		}

		const db = admin.firestore();

		// Helper function to delete documents in batches
		const deleteCollection = async (collectionName, whereField, whereValue) => {
			const snapshot = await db.collection(collectionName)
				.where(whereField, '==', whereValue)
				.get();
			
			if (snapshot.empty) {
				return 0;
			}

			// Delete in batches of 500 (Firestore limit)
			const batchSize = 500;
			let deletedCount = 0;

			for (let i = 0; i < snapshot.docs.length; i += batchSize) {
				const batch = db.batch();
				const batchDocs = snapshot.docs.slice(i, i + batchSize);
				
				batchDocs.forEach(doc => {
					batch.delete(doc.ref);
				});

				await batch.commit();
				deletedCount += batchDocs.length;
			}

			return deletedCount;
		};

		// Delete user data from Firestore collections
		console.log(`Starting account deletion for user: ${userId}`);

		// Delete user document
		try {
			await db.collection('users').doc(userId).delete();
			console.log('User document deleted');
		} catch (error) {
			console.log('No user document to delete or error:', error.message);
		}

		// Delete all user playlists
		try {
			const playlistsDeleted = await deleteCollection('playlists', 'createdBy.uid', userId);
			console.log(`Deleted ${playlistsDeleted} playlists`);
		} catch (error) {
			console.log('Error deleting playlists:', error.message);
		}

		// Delete all liked songs
		try {
			const likedSongsDeleted = await deleteCollection('likedSongs', 'userId', userId);
			console.log(`Deleted ${likedSongsDeleted} liked songs`);
		} catch (error) {
			console.log('Error deleting liked songs:', error.message);
		}

		// Delete mood playlist data
		try {
			const moodPlaylistsDeleted = await deleteCollection('moodPlaylists', 'userId', userId);
			console.log(`Deleted ${moodPlaylistsDeleted} mood playlists`);
		} catch (error) {
			console.log('Error deleting mood playlists:', error.message);
		}

		// Delete mood analytics
		try {
			const moodAnalyticsDeleted = await deleteCollection('moodAnalytics', 'userId', userId);
			console.log(`Deleted ${moodAnalyticsDeleted} mood analytics`);
		} catch (error) {
			console.log('Error deleting mood analytics:', error.message);
		}

		// Delete user from Firebase Auth (do this last)
		try {
			await admin.auth().deleteUser(userId);
			console.log('User deleted from Firebase Auth');
		} catch (error) {
			console.error('Error deleting user from Firebase Auth:', error.message);
			// Continue anyway - data is already deleted
		}

		res.status(200).json({ 
			message: 'Account and all associated data deleted successfully',
			deletedAt: new Date().toISOString(),
			success: true
		});
	} catch (error) {
		console.error('Error deleting user account:', error);
		res.status(500).json({
			message: 'Failed to delete account',
			error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
			success: false
		});
	}
};



