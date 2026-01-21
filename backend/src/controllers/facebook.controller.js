import admin from '../config/firebase.js';
import axios from 'axios';

// Facebook App credentials - add these to your environment variables
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

/**
 * Verify Facebook access token and create Firebase custom token
 */
export const authenticateWithFacebook = async (req, res) => {
  try {
    const { accessToken, facebookUser } = req.body;

    if (!accessToken || !facebookUser) {
      return res.status(400).json({
        success: false,
        message: 'Access token and Facebook user data are required'
      });
    }

    // Verify the Facebook access token
    const isValidToken = await verifyFacebookToken(accessToken, facebookUser.id);
    
    if (!isValidToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Facebook access token'
      });
    }

    // Create a unique Firebase UID for Facebook users
    const firebaseUid = `facebook_${facebookUser.id}`;

    // Create custom claims for the user
    const customClaims = {
      provider: 'facebook',
      facebookId: facebookUser.id,
      email: facebookUser.email || null,
      name: facebookUser.name,
      picture: facebookUser.picture?.data?.url || null
    };

    // Create Firebase custom token
    const customToken = await admin.auth().createCustomToken(firebaseUid, customClaims);

    // Check if user exists in Firebase Auth, if not create them
    try {
      await admin.auth().getUser(firebaseUid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create user in Firebase Auth
        await admin.auth().createUser({
          uid: firebaseUid,
          email: facebookUser.email || undefined,
          displayName: facebookUser.name,
          photoURL: facebookUser.picture?.data?.url || undefined,
          provider: 'facebook'
        });
      }
    }

    res.json({
      success: true,
      customToken,
      user: {
        uid: firebaseUid,
        email: facebookUser.email,
        displayName: facebookUser.name,
        photoURL: facebookUser.picture?.data?.url,
        provider: 'facebook'
      }
    });

  } catch (error) {
    console.error('Facebook authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during Facebook authentication',
      error: error.message
    });
  }
};

/**
 * Verify Facebook access token with Facebook's API
 */
const verifyFacebookToken = async (accessToken, userId) => {
  try {
    // Method 1: Verify token with Facebook's debug endpoint
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    
    const debugResponse = await axios.get(debugUrl);
    const debugData = debugResponse.data;

    if (!debugData.data || !debugData.data.is_valid) {
      console.error('Facebook token validation failed:', debugData);
      return false;
    }

    // Check if the token belongs to our app
    if (debugData.data.app_id !== FACEBOOK_APP_ID) {
      console.error('Token does not belong to our app');
      return false;
    }

    // Check if the token belongs to the expected user
    if (debugData.data.user_id !== userId) {
      console.error('Token does not belong to the expected user');
      return false;
    }

    // Method 2: Also verify by making a request to get user data
    const userUrl = `https://graph.facebook.com/me?access_token=${accessToken}`;
    const userResponse = await axios.get(userUrl);
    
    if (userResponse.data.id !== userId) {
      console.error('User ID mismatch');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying Facebook token:', error);
    return false;
  }
};

/**
 * Get Facebook user profile
 */
export const getFacebookProfile = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Get user profile from Facebook
    const profileUrl = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`;
    const response = await axios.get(profileUrl);

    res.json({
      success: true,
      profile: response.data
    });

  } catch (error) {
    console.error('Error getting Facebook profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Facebook profile',
      error: error.message
    });
  }
};

/**
 * Revoke Facebook access token
 */
export const revokeFacebookToken = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Revoke the access token
    const revokeUrl = `https://graph.facebook.com/me/permissions?access_token=${accessToken}`;
    await axios.delete(revokeUrl);

    res.json({
      success: true,
      message: 'Facebook access token revoked successfully'
    });

  } catch (error) {
    console.error('Error revoking Facebook token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke Facebook token',
      error: error.message
    });
  }
};