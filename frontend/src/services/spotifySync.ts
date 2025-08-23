import { getSavedTracks, isAuthenticated as isSpotifyAuthenticated } from '@/services/spotifyService';
import { addLikedSong as addFirestoreLikedSong, Song as FirestoreSong } from '@/services/likedSongsService';
import { auth, db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface SpotifySyncResult {
  fetchedCount: number;
  syncedCount: number;
}

const SPOTIFY_LAST_SYNC_TS = 'spotify-liked-songs-last-sync';

const toFirestoreSong = (item: any): FirestoreSong => {
  const track = item?.track || item; // support raw track or saved item
  return {
    id: track?.id,
    title: track?.name || 'Unknown Title',
    artist: Array.isArray(track?.artists) ? track.artists.map((a: any) => a.name).join(', ') : (track?.artists?.name || 'Unknown Artist'),
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
        } catch {}
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

export const syncSpotifyLikedSongsToMavrixfy = async (tracks: FirestoreSong[]): Promise<SpotifySyncResult> => {
  const existingIds = new Set<string>();
  const fetchedCount = tracks.length;
  let syncedCount = 0;

  // Build set from local storage to avoid duplicates quickly
  try {
    const localRaw = localStorage.getItem('liked-songs-storage');
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      const songs: any[] = parsed?.state?.likedSongs || [];
      songs.forEach((s: any) => {
        const id = s?._id || s?.id;
        if (id) existingIds.add(id);
      });
    }
  } catch {}

  // Add to global liked songs and also record provenance under users/{uid}/spotifyLikedSongs
  const user = auth.currentUser;
  const provenanceCol = user ? collection(db, 'users', user.uid, 'spotifyLikedSongs') : null;

  for (const track of tracks) {
    const id = track.id;
    if (!id || existingIds.has(id)) continue;

    await addFirestoreLikedSong({
      id: track.id,
      title: track.title,
      artist: track.artist,
      albumName: track.album || '',
      imageUrl: track.imageUrl || '',
      audioUrl: track.audioUrl || '',
      duration: track.duration || 0,
    });
    syncedCount += 1;
    existingIds.add(id);

    if (provenanceCol) {
      try {
        const docRef = doc(provenanceCol, id);
        await setDoc(docRef, {
          trackId: id,
          // Store Spotify's original addedAt if available; fallback to server time
          addedAt: (track as any)?.addedAt ? new Date((track as any).addedAt) : serverTimestamp(),
        }, { merge: true });
      } catch {}
    }
  }

  try {
    localStorage.setItem(SPOTIFY_LAST_SYNC_TS, Date.now().toString());
  } catch {}

  return { fetchedCount, syncedCount };
};

export const countNewSpotifyTracks = (tracks: FirestoreSong[]): number => {
  const existingIds = new Set<string>();
  try {
    const localRaw = localStorage.getItem('liked-songs-storage');
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      const songs: any[] = parsed?.state?.likedSongs || [];
      songs.forEach((s: any) => {
        const id = s?._id || s?.id;
        if (id) existingIds.add(id);
      });
    }
  } catch {}
  let newCount = 0;
  for (const t of tracks) {
    if (t?.id && !existingIds.has(t.id)) newCount += 1;
  }
  return newCount;
};

// Filter only new/unscanned Spotify tracks that aren't already in Mavrixfy
export const filterOnlyNewSpotifyTracks = (tracks: FirestoreSong[]): FirestoreSong[] => {
  const existingIds = new Set<string>();
  try {
    const localRaw = localStorage.getItem('liked-songs-storage');
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      const songs: any[] = parsed?.state?.likedSongs || [];
      songs.forEach((s: any) => {
        const id = s?._id || s?.id;
        if (id) existingIds.add(id);
      });
    }
  } catch {}
  
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


