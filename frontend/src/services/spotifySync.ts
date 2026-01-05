import { getSavedTracks, isAuthenticated as isSpotifyAuthenticated, triggerSpotifySync, getSpotifySyncStatus } from '@/services/spotifyService';
import { resolveArtist } from '@/lib/resolveArtist';
import { addLikedSong as addFirestoreLikedSong, Song as FirestoreSong, getLikedSongsCount } from '@/services/likedSongsService';
import { auth, db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export interface SpotifySyncResult {
  fetchedCount: number;
  syncedCount: number;
}

const SPOTIFY_LAST_SYNC_TS = 'spotify-liked-songs-last-sync';

const toFirestoreSong = (item: any): FirestoreSong => {
  const track = item?.track || item; // support raw track or saved item
  const trackId = track?.id;
  return {
    id: trackId,
    songId: trackId, // Add songId for consistency
    title: track?.name || 'Unknown Title',
    artist: resolveArtist(track),
    imageUrl: track?.album?.images?.[1]?.url || track?.album?.images?.[0]?.url || '',
    audioUrl: track?.preview_url || '',
    duration: track?.duration_ms ? Math.floor(track.duration_ms / 1000) : 0,
    album: track?.album?.name || '',
    year: track?.album?.release_date ? String(track.album.release_date).slice(0, 4) : ''
  } as FirestoreSong;
};

export const fetchAllSpotifySavedTracks = async (): Promise<FirestoreSong[]> => {
  if (!isSpotifyAuthenticated()) return [];

  const pageSize = 50;
  let offset = 0;
  const songs: FirestoreSong[] = [];

  // Paginate until no items returned
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const items = await getSavedTracks(pageSize, offset);
    if (!items || items.length === 0) break;
    for (const it of items) {
      const song = toFirestoreSong(it);
      // Preserve Spotify added_at to support date-wise ordering identical to Spotify
      if ((it as any)?.added_at) {
        try {
          (song as any).addedAt = (it as any).added_at;
        } catch { }
      }
      if (song?.id) songs.push(song);
    }
    offset += items.length;
    if (items.length < pageSize) break;
  }

  // Sort by Spotify addedAt if available, most recent first
  try {
    return songs.sort((a: any, b: any) => {
      const aTs = a?.addedAt ? new Date(a.addedAt).getTime() : 0;
      const bTs = b?.addedAt ? new Date(b.addedAt).getTime() : 0;
      return bTs - aTs;
    });
  } catch {
    return songs;
  }
};

// Get existing song IDs from Firestore
const getExistingSongIds = async (): Promise<Set<string>> => {
  const existingIds = new Set<string>();

  try {
    if (!auth.currentUser) return existingIds;

    const likedSongsRef = collection(db, 'users', auth.currentUser.uid, 'likedSongs');
    const snapshot = await getDocs(likedSongsRef);

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.songId) {
        existingIds.add(data.songId);
      }
    });
  } catch (error) {
    console.error('Error getting existing song IDs from Firestore:', error);
  }

  return existingIds;
};

export const syncSpotifyLikedSongsToMavrixfy = async (tracks: FirestoreSong[]): Promise<SpotifySyncResult> => {
  const existingIds = await getExistingSongIds();
  const fetchedCount = tracks.length;
  let syncedCount = 0;

  // Add to global liked songs
  for (const track of tracks) {
    const id = track.id;
    if (!id || existingIds.has(id)) continue;

    await addFirestoreLikedSong({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || '',
      imageUrl: track.imageUrl || '',
      audioUrl: track.audioUrl || '',
      duration: track.duration || 0,
    });
    syncedCount += 1;
    existingIds.add(id);
  }

  try {
    localStorage.setItem(SPOTIFY_LAST_SYNC_TS, Date.now().toString());
  } catch { }

  return { fetchedCount, syncedCount };
};

export const countNewSpotifyTracks = async (tracks: FirestoreSong[]): Promise<number> => {
  const existingIds = await getExistingSongIds();
  let newCount = 0;

  for (const t of tracks) {
    if (t?.id && !existingIds.has(t.id)) newCount += 1;
  }

  return newCount;
};

// Filter only new/unscanned Spotify tracks that aren't already in Mavrixfy
export const filterOnlyNewSpotifyTracks = async (tracks: FirestoreSong[]): Promise<FirestoreSong[]> => {
  const existingIds = await getExistingSongIds();

  return tracks.filter(track => track?.id && !existingIds.has(track.id));
};

export const shouldBackgroundSync = (minMinutes: number = 10): boolean => {
  try {
    const last = parseInt(localStorage.getItem(SPOTIFY_LAST_SYNC_TS) || '0', 10);
    if (!last) return true;
    const diffMs = Date.now() - last;
    return diffMs > minMinutes * 60 * 1000;
  } catch {
    return true;
  }
};

export const backgroundAutoSyncOnce = async (): Promise<SpotifySyncResult | null> => {
  if (!isSpotifyAuthenticated()) return null;
  if (!shouldBackgroundSync()) return null;
  const tracks = await fetchAllSpotifySavedTracks();
  return syncSpotifyLikedSongsToMavrixfy(tracks);
};

export const isSpotifyConnected = (): boolean => isSpotifyAuthenticated();

// Trigger backend sync (recommended for full sync)
export const triggerBackendSync = async (): Promise<SpotifySyncResult | null> => {
  if (!auth.currentUser) return null;
  
  try {
    const result = await triggerSpotifySync(auth.currentUser.uid);
    if (result.success) {
      // Update local sync timestamp
      localStorage.setItem(SPOTIFY_LAST_SYNC_TS, Date.now().toString());
      return {
        fetchedCount: result.total || 0,
        syncedCount: result.added || 0
      };
    }
    return null;
  } catch (error) {
    console.error('Backend sync failed:', error);
    return null;
  }
};

// Get sync status from backend
export const getSyncStatus = async (): Promise<{
  hasSynced: boolean;
  lastSyncAt?: Date;
  totalSongs?: number;
}> => {
  if (!auth.currentUser) return { hasSynced: false };
  
  try {
    return await getSpotifySyncStatus(auth.currentUser.uid);
  } catch (error) {
    console.error('Error getting sync status:', error);
    return { hasSynced: false };
  }
};