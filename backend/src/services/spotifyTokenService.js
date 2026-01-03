import admin from '../config/firebase.js';

const db = admin.firestore();

// Store Spotify tokens in Firestore
export const storeSpotifyTokens = async (userId, tokens) => {
  try {
    const tokenRef = db.collection('users').doc(userId).collection('spotifyTokens').doc('current');
    
    await tokenRef.set({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Stored Spotify tokens for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('Error storing Spotify tokens:', error);
    throw error;
  }
};

// Get Spotify tokens from Firestore
export const getSpotifyTokens = async (userId) => {
  try {
    const tokenRef = db.collection('users').doc(userId).collection('spotifyTokens').doc('current');
    const tokenDoc = await tokenRef.get();
    
    if (!tokenDoc.exists) {
      return null;
    }
    
    const tokenData = tokenDoc.data();
    
    // Check if token is expired
    if (Date.now() > tokenData.expires_at) {
      console.log(`Token expired for user: ${userId}, attempting refresh`);
      return await refreshSpotifyTokens(userId, tokenData.refresh_token);
    }
    
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at
    };
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    return null;
  }
};

// Refresh Spotify tokens
export const refreshSpotifyTokens = async (userId, refreshToken) => {
  try {
    const axios = (await import('axios')).default;
    
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    const tokens = response.data;
    
    // Store the new tokens
    await storeSpotifyTokens(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken, // Keep old refresh token if not provided
      expires_in: tokens.expires_in
    });
    
    console.log(`Refreshed Spotify tokens for user: ${userId}`);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      expires_at: Date.now() + (tokens.expires_in * 1000)
    };
  } catch (error) {
    console.error('Error refreshing Spotify tokens:', error);
    // Remove invalid tokens
    await removeSpotifyTokens(userId);
    throw error;
  }
};

// Remove Spotify tokens
export const removeSpotifyTokens = async (userId) => {
  try {
    const tokenRef = db.collection('users').doc(userId).collection('spotifyTokens').doc('current');
    await tokenRef.delete();
    console.log(`Removed Spotify tokens for user: ${userId}`);
  } catch (error) {
    console.error('Error removing Spotify tokens:', error);
  }
};

// Check if user has valid Spotify tokens
export const hasValidSpotifyTokens = async (userId) => {
  const tokens = await getSpotifyTokens(userId);
  return tokens !== null;
};
