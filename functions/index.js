const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// ─── Push Notification Sender ────────────────────────────────────────────────
// Triggers when admin creates a new doc in `notifications` collection
exports.sendPushNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data) return;

    const { title, message, imageUrl, route } = data;
    const notificationId = context.params.notificationId;

    try {
      // Collect all push tokens from all users
      const usersSnap = await db.collection('users').get();
      const tokens = [];

      for (const userDoc of usersSnap.docs) {
        const tokensSnap = await userDoc.ref.collection('pushTokens').get();
        for (const tokenDoc of tokensSnap.docs) {
          const t = tokenDoc.data();
          if (t.enabled && t.nativePushToken) {
            tokens.push({ token: t.nativePushToken, platform: t.platform });
          }
        }
      }

      if (tokens.length === 0) {
        console.log('No push tokens found');
        await snap.ref.update({ delivered: 0, status: 'no_tokens' });
        return;
      }

      // Build FCM messages per token
      const messages = tokens.map(({ token, platform }) => ({
        token,
        notification: {
          title: title || 'Mavrixfy',
          body: message || '',
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: {
          ...(route ? { route } : {}),
          notificationId,
        },
        ...(platform === 'android' ? {
          android: {
            priority: 'high',
            notification: {
              channelId: 'mavrixfy-default',
              sound: 'default',
            },
          },
        } : {}),
        ...(platform === 'ios' ? {
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        } : {}),
      }));

      // Send in batches of 500 (FCM limit)
      let delivered = 0;
      const batchSize = 500;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const response = await admin.messaging().sendEach(batch);
        delivered += response.successCount;

        // Clean up invalid tokens
        response.responses.forEach(async (res, idx) => {
          if (!res.success) {
            const err = res.error?.code;
            if (
              err === 'messaging/invalid-registration-token' ||
              err === 'messaging/registration-token-not-registered'
            ) {
              // Mark token as disabled
              const badToken = batch[idx].token;
              const usersSnap2 = await db.collection('users').get();
              for (const userDoc of usersSnap2.docs) {
                const tSnap = await userDoc.ref
                  .collection('pushTokens')
                  .where('nativePushToken', '==', badToken)
                  .get();
                tSnap.forEach(d => d.ref.update({ enabled: false }));
              }
            }
          }
        });
      }

      // Update delivered count
      await snap.ref.update({ delivered, status: 'sent' });
      console.log(`Notification sent to ${delivered}/${tokens.length} devices`);

    } catch (err) {
      console.error('sendPushNotification error:', err);
      await snap.ref.update({ status: 'error', error: err.message });
    }
  });


// ─── Spotify Sync (existing) ─────────────────────────────────────────────────
exports.syncSpotifyLikedSongs = functions.pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    try {
      const usersSnapshot = await db.collection('users').get();
      const syncPromises = [];

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const tokenDoc = await userDoc.ref.collection('spotifyTokens').doc('current').get();
        if (tokenDoc.exists) {
          syncPromises.push(
            syncUserSpotifyLikedSongs(userId).catch(error => ({
              userId, error: error.message,
            }))
          );
        }
      }

      const results = await Promise.allSettled(syncPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      console.log(`Sync completed. Successful: ${successful}, Failed: ${failed}`);
      return { success: true, successful, failed };
    } catch (error) {
      console.error('Scheduled sync error:', error);
      throw error;
    }
  });

async function syncUserSpotifyLikedSongs(userId) {
  const tokenDoc = await db.collection('users').doc(userId).collection('spotifyTokens').doc('current').get();
  if (!tokenDoc.exists) throw new Error('No Spotify tokens found');
  const tokenData = tokenDoc.data();
  if (Date.now() > tokenData.expires_at) {
    const refreshed = await refreshSpotifyTokens(userId, tokenData.refresh_token);
    if (!refreshed) throw new Error('Failed to refresh tokens');
  }
  const likedSongs = await fetchSpotifyLikedSongs(userId);
  const existingRef = db.collection('users').doc(userId).collection('spotifyLikedSongs');
  const existingSnapshot = await existingRef.get();
  const existingSongs = new Map();
  existingSnapshot.forEach(doc => existingSongs.set(doc.id, doc.data()));
  const batch = db.batch();
  let addedCount = 0, updatedCount = 0, removedCount = 0;
  for (const item of likedSongs) {
    const trackData = mapSpotifyTrack(item);
    const trackRef = existingRef.doc(trackData.trackId);
    if (existingSongs.has(trackData.trackId)) {
      batch.update(trackRef, { ...trackData, syncedAt: admin.firestore.FieldValue.serverTimestamp() });
      updatedCount++;
    } else {
      batch.set(trackRef, trackData);
      addedCount++;
    }
    existingSongs.delete(trackData.trackId);
  }
  for (const [trackId] of existingSongs) {
    batch.delete(existingRef.doc(trackId));
    removedCount++;
  }
  await batch.commit();
  await db.collection('users').doc(userId).collection('spotifySync').doc('metadata').set({
    lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
    totalSongs: likedSongs.length,
    addedCount, updatedCount, removedCount,
    syncStatus: 'completed', syncType: 'scheduled',
  });
  return { userId, total: likedSongs.length, added: addedCount, updated: updatedCount, removed: removedCount };
}

async function refreshSpotifyTokens(userId, refreshToken) {
  try {
    const axios = require('axios');
    const response = await axios.post('https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: functions.config().spotify?.client_id,
        client_secret: functions.config().spotify?.client_secret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const tokens = response.data;
    await db.collection('users').doc(userId).collection('spotifyTokens').doc('current').set({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return tokens;
  } catch (error) {
    console.error('Error refreshing Spotify tokens:', error);
    return null;
  }
}

async function fetchSpotifyLikedSongs(userId) {
  const axios = require('axios');
  const tokenDoc = await db.collection('users').doc(userId).collection('spotifyTokens').doc('current').get();
  const tokenData = tokenDoc.data();
  const likedSongs = [];
  let offset = 0;
  while (true) {
    const response = await axios.get('https://api.spotify.com/v1/me/tracks', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      params: { limit: 50, offset },
    });
    const items = response.data.items;
    if (!items || items.length === 0) break;
    likedSongs.push(...items);
    offset += items.length;
    if (items.length < 50) break;
  }
  return likedSongs;
}

function mapSpotifyTrack(item) {
  const track = item.track;
  return {
    trackId: track.id,
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album?.name || '',
    coverUrl: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
    spotifyUrl: track.external_urls?.spotify || '',
    duration: Math.floor(track.duration_ms / 1000),
    addedAt: item.added_at,
    albumId: track.album?.id,
    artistIds: track.artists.map(a => a.id),
    popularity: track.popularity,
    previewUrl: track.preview_url,
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}
