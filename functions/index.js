const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// Cron job to sync Spotify liked songs every 6 hours
exports.syncSpotifyLikedSongs = functions.pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    try {
      console.log('Starting scheduled Spotify sync...');
      
      // Get all users with Spotify tokens
      const usersSnapshot = await db.collection('users').get();
      const syncPromises = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Check if user has Spotify tokens
        const tokenDoc = await userDoc.ref.collection('spotifyTokens').doc('current').get();
        
        if (tokenDoc.exists) {
          console.log(`Scheduling sync for user: ${userId}`);
          
          // Schedule sync for this user
          syncPromises.push(
            syncUserSpotifyLikedSongs(userId).catch(error => {
              console.error(`Sync failed for user ${userId}:`, error);
              return { userId, error: error.message };
            })
          );
        }
      }
      
      // Wait for all syncs to complete
      const results = await Promise.allSettled(syncPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Scheduled sync completed. Successful: ${successful}, Failed: ${failed}`);
      
      return { success: true, successful, failed };
    } catch (error) {
      console.error('Scheduled sync error:', error);
      throw error;
    }
  });

// Function to sync a single user's Spotify liked songs
async function syncUserSpotifyLikedSongs(userId) {
  try {
    // Get user's Spotify tokens
    const tokenDoc = await db.collection('users').doc(userId).collection('spotifyTokens').doc('current').get();
    
    if (!tokenDoc.exists) {
      throw new Error('No Spotify tokens found');
    }
    
    const tokenData = tokenDoc.data();
    
    // Check if token is expired
    if (Date.now() > tokenData.expires_at) {
      // Refresh token
      const refreshedTokens = await refreshSpotifyTokens(userId, tokenData.refresh_token);
      if (!refreshedTokens) {
        throw new Error('Failed to refresh tokens');
      }
    }
    
    // Fetch liked songs from Spotify
    const likedSongs = await fetchSpotifyLikedSongs(userId);
    
    // Get existing songs from Firestore
    const existingRef = db.collection('users').doc(userId).collection('spotifyLikedSongs');
    const existingSnapshot = await existingRef.get();
    const existingSongs = new Map();
    
    existingSnapshot.forEach(doc => {
      existingSongs.set(doc.id, doc.data());
    });
    
    // Process songs
    const batch = db.batch();
    let addedCount = 0;
    let updatedCount = 0;
    let removedCount = 0;
    
    // Add/update songs from Spotify
    for (const item of likedSongs) {
      const trackData = mapSpotifyTrack(item);
      const trackRef = existingRef.doc(trackData.trackId);
      
      if (existingSongs.has(trackData.trackId)) {
        batch.update(trackRef, {
          ...trackData,
          syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updatedCount++;
      } else {
        batch.set(trackRef, trackData);
        addedCount++;
      }
      
      existingSongs.delete(trackData.trackId);
    }
    
    // Remove songs that are no longer liked
    for (const [trackId] of existingSongs) {
      batch.delete(existingRef.doc(trackId));
      removedCount++;
    }
    
    // Commit changes
    await batch.commit();
    
    // Update sync metadata
    const syncMetadataRef = db.collection('users').doc(userId).collection('spotifySync').doc('metadata');
    await syncMetadataRef.set({
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      totalSongs: likedSongs.length,
      addedCount,
      updatedCount,
      removedCount,
      syncStatus: 'completed',
      syncType: 'scheduled'
    });
    
    console.log(`Scheduled sync completed for user: ${userId}`, {
      total: likedSongs.length,
      added: addedCount,
      updated: updatedCount,
      removed: removedCount
    });
    
    return {
      userId,
      total: likedSongs.length,
      added: addedCount,
      updated: updatedCount,
      removed: removedCount
    };
  } catch (error) {
    console.error(`Scheduled sync failed for user ${userId}:`, error);
    
    // Update sync metadata with error
    const syncMetadataRef = db.collection('users').doc(userId).collection('spotifySync').doc('metadata');
    await syncMetadataRef.set({
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      syncStatus: 'failed',
      error: error.message,
      syncType: 'scheduled'
    });
    
    throw error;
  }
}

// Helper function to refresh Spotify tokens
async function refreshSpotifyTokens(userId, refreshToken) {
  try {
    const axios = require('axios');
    
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: functions.config().spotify.client_id,
        client_secret: functions.config().spotify.client_secret,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    const tokens = response.data;
    
    // Store the new tokens
    const tokenRef = db.collection('users').doc(userId).collection('spotifyTokens').doc('current');
    await tokenRef.set({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      expires_at: Date.now() + (tokens.expires_in * 1000)
    };
  } catch (error) {
    console.error('Error refreshing Spotify tokens:', error);
    return null;
  }
}

// Helper function to fetch Spotify liked songs
async function fetchSpotifyLikedSongs(userId) {
  try {
    const axios = require('axios');
    
    // Get fresh tokens
    const tokenDoc = await db.collection('users').doc(userId).collection('spotifyTokens').doc('current').get();
    const tokenData = tokenDoc.data();
    
    const likedSongs = [];
    let offset = 0;
    const limit = 50;
    
    // Paginate through all liked songs
    while (true) {
      const response = await axios.get('https://api.spotify.com/v1/me/tracks', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
        params: {
          limit,
          offset,
        },
      });
      
      const items = response.data.items;
      if (!items || items.length === 0) break;
      
      likedSongs.push(...items);
      offset += items.length;
      
      if (items.length < limit) break;
    }
    
    return likedSongs;
  } catch (error) {
    console.error('Error fetching Spotify liked songs:', error);
    throw error;
  }
}

// Helper function to map Spotify track data
function mapSpotifyTrack(item) {
  const track = item.track;
  return {
    trackId: track.id,
    title: track.name,
    artist: track.artists.map(artist => artist.name).join(', '),
    album: track.album?.name || '',
    coverUrl: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
    spotifyUrl: track.external_urls?.spotify || '',
    duration: Math.floor(track.duration_ms / 1000),
    addedAt: item.added_at,
    albumId: track.album?.id,
    artistIds: track.artists.map(artist => artist.id),
    popularity: track.popularity,
    previewUrl: track.preview_url,
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}
