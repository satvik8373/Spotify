import admin from '../config/firebase.js';
import { getSpotifyTokens } from './spotifyTokenService.js';

const db = admin.firestore();

// Delay helper for handling Spotify's server-side caching
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch all liked songs from Spotify with cache-busting
export const fetchSpotifyLikedSongs = async (userId, options = {}) => {
  const { 
    initialDelay = 0,  // Delay before first fetch (for post-OAuth sync)
    retryCount = 3,    // Number of retries on failure
    retryDelay = 2000  // Delay between retries
  } = options;

  try {
    const tokens = await getSpotifyTokens(userId);
    if (!tokens) {
      throw new Error('No valid Spotify tokens found');
    }

    // Apply initial delay if specified (helps with Spotify's server-side caching)
    if (initialDelay > 0) {
      console.log(`⏳ Waiting ${initialDelay}ms before fetching liked songs (Spotify cache delay)...`);
      await delay(initialDelay);
    }

    const axios = (await import('axios')).default;
    const likedSongs = [];
    let offset = 0;
    const limit = 50;
    let attempt = 0;

    // Paginate through all liked songs with retry logic
    while (true) {
      let response;
      let lastError;

      // Retry logic for each page
      for (attempt = 0; attempt < retryCount; attempt++) {
        try {
          // Add cache-busting timestamp to prevent stale responses
          const timestamp = Date.now();
          
          response = await axios.get('https://api.spotify.com/v1/me/tracks', {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
            params: {
              limit,
              offset,
              _t: timestamp, // Cache-busting parameter
            },
          });
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          console.warn(`⚠️ Fetch attempt ${attempt + 1}/${retryCount} failed for offset ${offset}:`, error.message);
          
          if (attempt < retryCount - 1) {
            await delay(retryDelay);
          }
        }
      }

      if (!response) {
        throw lastError || new Error('Failed to fetch liked songs after retries');
      }

      const items = response.data.items;
      if (!items || items.length === 0) break;

      likedSongs.push(...items);
      offset += items.length;

      // Check if we've reached the end using the 'next' field (more reliable)
      if (!response.data.next) {
        console.log(`📄 Reached end of liked songs (next is null)`);
        break;
      }

      // Also break if we got fewer items than requested (fallback check)
      if (items.length < limit) break;

      // Small delay between pages to avoid rate limiting
      await delay(100);
    }

    console.log(`✅ Fetched ${likedSongs.length} liked songs for user: ${userId}`);
    return likedSongs;
  } catch (error) {
    console.error('❌ Error fetching Spotify liked songs:', error);
    throw error;
  }
};

// Fetch liked songs with initial delay (for post-OAuth sync)
export const fetchSpotifyLikedSongsWithDelay = async (userId, delayMs = 4000) => {
  return fetchSpotifyLikedSongs(userId, { initialDelay: delayMs });
};

// Map Spotify track data to our format
const mapSpotifyTrack = (item) => {
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
    // Additional metadata
    albumId: track.album?.id,
    artistIds: track.artists.map(artist => artist.id),
    popularity: track.popularity,
    previewUrl: track.preview_url,
    // Timestamps
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
};

// Sync liked songs to Firestore
export const syncSpotifyLikedSongs = async (userId, options = {}) => {
  const { isInitialSync = false } = options;
  
  try {
    console.log(`🔄 Starting Spotify sync for user: ${userId} (initial: ${isInitialSync})`);
    
    // For initial sync after OAuth, add delay to handle Spotify's server-side caching
    const fetchOptions = isInitialSync ? { initialDelay: 4000 } : {};
    const spotifyLikedSongs = await fetchSpotifyLikedSongs(userId, fetchOptions);
    
    // Get existing liked songs from Firestore (new nested structure)
    const existingRef = admin.firestore().collection('users').doc(userId).collection('likedSongs');
    const existingSnapshot = await existingRef.get();
    const existingSongs = new Map();
    
    existingSnapshot.forEach(doc => {
      existingSongs.set(doc.id, doc.data());
    });

    // Process new songs
    const batch = admin.firestore().batch();
    let addedCount = 0;
    let updatedCount = 0;
    let removedCount = 0;

    // Add/update songs from Spotify
    for (const item of spotifyLikedSongs) {
      const trackData = mapSpotifyTrack(item);
      // No need to add userId since it's now in the path
      
      const trackRef = existingRef.doc(trackData.trackId);
      
      if (existingSongs.has(trackData.trackId)) {
        // Update existing song
        batch.update(trackRef, {
          ...trackData,
          syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updatedCount++;
      } else {
        // Add new song
        batch.set(trackRef, trackData);
        addedCount++;
      }
      
      // Remove from existing songs map
      existingSongs.delete(trackData.trackId);
    }

    // Remove songs that are no longer liked
    for (const [trackId, songData] of existingSongs) {
      batch.delete(existingRef.doc(trackId));
      removedCount++;
    }

    // Commit the batch
    await batch.commit();

    // Update sync metadata
    const syncMetadataRef = admin.firestore().collection('users').doc(userId).collection('spotifySync').doc('metadata');
    await syncMetadataRef.set({
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      totalSongs: spotifyLikedSongs.length,
      addedCount,
      updatedCount,
      removedCount,
      syncStatus: 'completed'
    });

    console.log(`✅ Spotify sync completed for user: ${userId}`, {
      total: spotifyLikedSongs.length,
      added: addedCount,
      updated: updatedCount,
      removed: removedCount
    });

    return {
      total: spotifyLikedSongs.length,
      added: addedCount,
      updated: updatedCount,
      removed: removedCount,
      isInitialSync
    };
  } catch (error) {
    console.error('❌ Error syncing Spotify liked songs:', error);
    
    // Update sync metadata with error
    const syncMetadataRef = admin.firestore().collection('users').doc(userId).collection('spotifySync').doc('metadata');
    await syncMetadataRef.set({
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      syncStatus: 'failed',
      error: error.message
    });
    
    throw error;
  }
};

// Handle real-time like/unlike operations
export const handleSpotifyLikeUnlike = async (userId, trackId, action) => {
  try {
    console.log(`Handling Spotify ${action} for user: ${userId}, track: ${trackId}`);
    
    const tokens = await getSpotifyTokens(userId);
    if (!tokens) {
      throw new Error('No valid Spotify tokens found');
    }

    const axios = (await import('axios')).default;
    
    if (action === 'like') {
      // Add track to Spotify liked songs
      await axios.put(`https://api.spotify.com/v1/me/tracks`, {
        ids: [trackId]
      }, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Add to Firestore (new nested structure)
      const trackRef = admin.firestore().collection('users').doc(userId).collection('likedSongs').doc(trackId);
      await trackRef.set({
        trackId,
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        action: 'liked',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
    } else if (action === 'unlike') {
      // Remove track from Spotify liked songs
      await axios.delete(`https://api.spotify.com/v1/me/tracks`, {
        data: { ids: [trackId] },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Remove from Firestore (new nested structure)
      const trackRef = admin.firestore().collection('users').doc(userId).collection('likedSongs').doc(trackId);
      await trackRef.delete();
    }
    
    // Update sync metadata
    const syncMetadataRef = admin.firestore().collection('users').doc(userId).collection('spotifySync').doc('metadata');
    await syncMetadataRef.set({
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      lastAction: action,
      lastTrackId: trackId,
      syncStatus: 'completed'
    }, { merge: true });
    
    console.log(`Spotify ${action} completed for user: ${userId}, track: ${trackId}`);
    return { success: true, action, trackId };
    
  } catch (error) {
    console.error(`Error handling Spotify ${action}:`, error);
    
    // Update sync metadata with error
    const syncMetadataRef = admin.firestore().collection('users').doc(userId).collection('spotifySync').doc('metadata');
    await syncMetadataRef.set({
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      syncStatus: 'failed',
      lastAction: action,
      lastTrackId: trackId,
      error: error.message
    }, { merge: true });
    
    throw error;
  }
};

// Get user's synced liked songs from Firestore with real-time updates
export const getSyncedLikedSongs = async (userId) => {
  try {
    const songsRef = admin.firestore().collection('users').doc(userId).collection('likedSongs');
    const snapshot = await songsRef.orderBy('addedAt', 'desc').get();
    
    const songs = [];
    snapshot.forEach(doc => {
      songs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return songs;
  } catch (error) {
    console.error('Error getting synced liked songs:', error);
    throw error;
  }
};

// Get sync status for a user
export const getSyncStatus = async (userId) => {
  try {
    const metadataRef = admin.firestore().collection('users').doc(userId).collection('spotifySync').doc('metadata');
    const metadataDoc = await metadataRef.get();
    
    if (!metadataDoc.exists) {
      return {
        hasSynced: false,
        lastSyncAt: null,
        syncStatus: 'never'
      };
    }
    
    const data = metadataDoc.data();
    return {
      hasSynced: true,
      lastSyncAt: data.lastSyncAt?.toDate(),
      syncStatus: data.syncStatus,
      totalSongs: data.totalSongs || 0,
      error: data.error
    };
  } catch (error) {
    console.error('Error getting sync status:', error);
    return {
      hasSynced: false,
      lastSyncAt: null,
      syncStatus: 'error',
      error: error.message
    };
  }
};

// Migration function to move data from old structure to new structure
export const migrateLikedSongsStructure = async (userId) => {
  try {
    console.log(`Starting migration for user: ${userId}`);
    
    // Get songs from old structure (global likedSongs collection)
    const oldStructureRef = admin.firestore().collection('likedSongs');
    const oldSnapshot = await oldStructureRef.where('userId', '==', userId).get();
    
    if (oldSnapshot.empty) {
      console.log("✅ No data to migrate from global collection");
      
      // Check if user already has data in new structure
      const newStructureRef = admin.firestore().collection('users').doc(userId).collection('likedSongs');
      const newSnapshot = await newStructureRef.get();
      
      if (!newSnapshot.empty) {
        console.log("✅ User already has data in new structure");
        return { migrated: 0, message: "User already has data in new structure" };
      }
      
      return { migrated: 0, message: "No data to migrate" };
    }
    
    // Get songs from new structure to avoid duplicates
    const newStructureRef = admin.firestore().collection('users').doc(userId).collection('likedSongs');
    const newSnapshot = await newStructureRef.get();
    const existingSongs = new Set();
    newSnapshot.forEach(doc => {
      existingSongs.add(doc.data().trackId);
    });
    
    // Migrate songs to new structure
    const batch = admin.firestore().batch();
    let migratedCount = 0;
    
    oldSnapshot.forEach(doc => {
      const songData = doc.data();
      
      // Skip if already exists in new structure
      if (existingSongs.has(songData.trackId)) {
        console.log(`Skipping duplicate: ${songData.trackId}`);
        return;
      }
      
      // Create in new structure (no need for userId field)
      const newSongRef = newStructureRef.doc(songData.trackId);
      batch.set(newSongRef, songData);
      migratedCount++;
    });
    
    // Commit the migration
    if (migratedCount > 0) {
      await batch.commit();
      console.log(`✅ Migrated ${migratedCount} songs to new structure`);
      
      // Clean up old structure
      const cleanupBatch = admin.firestore().batch();
      oldSnapshot.forEach(doc => {
        cleanupBatch.delete(doc.ref);
      });
      await cleanupBatch.commit();
      console.log("✅ Cleaned up old structure");
    }
    
    return {
      migrated: migratedCount,
      message: `Successfully migrated ${migratedCount} songs`
    };
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
};
