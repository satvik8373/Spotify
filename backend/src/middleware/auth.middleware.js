export const protectRoute = async (req, res, next) => {
	// Check for Firebase uid
	if (!req.auth || !req.auth.uid) {
		return res.status(401).json({ message: "Unauthorized - you must be logged in" });
	}
	next();
};



export const isAuthenticated = async (req, res, next) => {
	// Consider authenticated if we have a Firebase UID
	if (req.auth?.uid) {
		return next();
	}
	
	return res.status(401).json({ 
		message: "Unauthorized - Authentication required" 
	});
};
