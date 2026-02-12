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

// Google OAuth for mobile (Expo)
export const googleMobileAuth = async (req, res) => {
  try {
    const { returnUrl } = req.query;
    
    if (!returnUrl) {
      return res.status(400).json({ 
        success: false, 
        message: "returnUrl parameter is required" 
      });
    }

    // For mobile, we need to redirect to Google OAuth with proper configuration
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    
    if (!googleClientId) {
      return res.status(500).json({ 
        success: false, 
        message: "Google OAuth not configured. Please set GOOGLE_CLIENT_ID in environment variables." 
      });
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google-mobile/callback`;
    const scope = 'openid email profile';
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(googleClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(returnUrl)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    res.redirect(googleAuthUrl);
  } catch (error) {
    console.error("Google mobile auth error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Debug endpoint to check OAuth configuration
export const googleMobileDebug = async (req, res) => {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google-mobile/callback`;
    
    res.json({
      success: true,
      config: {
        clientIdConfigured: !!googleClientId,
        clientIdPrefix: googleClientId ? googleClientId.substring(0, 20) + '...' : 'NOT SET',
        redirectUri: redirectUri,
        host: req.get('host'),
        protocol: req.protocol
      },
      instructions: {
        step1: 'Verify GOOGLE_CLIENT_ID is set in Vercel environment variables',
        step2: 'Verify GOOGLE_CLIENT_SECRET is set in Vercel environment variables',
        step3: `Add this redirect URI to Google Cloud Console: ${redirectUri}`,
        step4: 'Add yourself as a test user in Google OAuth Consent Screen',
        googleCloudConsole: 'https://console.cloud.google.com/apis/credentials'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Google OAuth callback for mobile
export const googleMobileCallback = async (req, res) => {
  try {
    const { code, state: returnUrl } = req.query;

    if (!code) {
      return res.status(400).send("Authorization code not provided");
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!googleClientId || !googleClientSecret) {
      return res.status(500).send("Google OAuth not properly configured");
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google-mobile/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.id_token) {
      console.error("Token exchange failed:", tokenData);
      return res.status(500).send("Failed to get ID token from Google");
    }

    // Redirect back to app with the ID token
    const finalUrl = `${returnUrl}?id_token=${encodeURIComponent(tokenData.id_token)}`;
    res.redirect(finalUrl);
  } catch (error) {
    console.error("Google callback error:", error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
};
