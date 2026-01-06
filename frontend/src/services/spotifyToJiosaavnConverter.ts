import axiosInstance from '@/lib/axios';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDocs, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import { resolveArtist } from '@/lib/resolveArtist';

export interface ConversionResult {
  total: number;
  converted: number;
  failed: number;
  failedSongs: { title: string; artist: string; reason: string }[];
}

export interface ConversionProgress {
  current: number;
  total: number;
  currentSong: string;
  status: 'idle' | 'converting' | 'completed' | 'error';
}

// Convert JioSaavn API response to our song format
function convertJiosaavnToSong(item: any) {
  // Get the best quality download URL (prefer 320kbps, then 160kbps, then 96kbps)
  let audioUrl = '';
  if (item.downloadUrl && Array.isArray(item.downloadUrl)) {
    const downloadUrl = item.downloadUrl.find((d: any) => d.quality === '320kbps') ||
                       item.downloadUrl.find((d: any) => d.quality === '160kbps') ||
                       item.downloadUrl.find((d: any) => d.quality === '96kbps') ||
                       item.downloadUrl[item.downloadUrl.length - 1];
    audioUrl = downloadUrl?.link || downloadUrl?.url || '';
  }
  
  // Get the best quality image
  let imageUrl = '';
  if (item.image && Array.isArray(item.image)) {
    const image = item.image.find((i: any) => i.quality === '500x500') ||
                 item.image.find((i: any) => i.quality === '150x150') ||
                 item.image[item.image.length - 1];
    imageUrl = image?.link || image?.url || '';
  } else if (typeof item.image === 'string') {
    imageUrl = item.image;
  }

  // Get artist name
  const artist = item.primaryArtists || 
                 item.singers || 
                 (item.artistMap?.primary?.map((a: any) => a?.name).filter(Boolean).join(', ')) || 
                 resolveArtist(item) ||
                 'Unknown Artist';

  return {
    id: item.id,
    title: item.name || item.title || 'Unknown Title',
    artist,
    album: item.album?.name || item.album || '',
    year: item.year || '',
    duration: typeof item.duration === 'string' ? parseInt(item.duration) : (item.duration || 0),
    imageUrl,
    audioUrl,
  };
}

// Search for a song on JioSaavn
async function searchJiosaavn(title: string, artist: string): Promise<any | null> {
  try {
    // Clean up the search query
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const cleanArtist = artist.split(',')[0].trim(); // Use first artist only
    const query = `${cleanTitle} ${cleanArtist}`;
    
    const response = await axiosInstance.get('/api/jiosaavn/search/songs', {
      params: { query, limit: 5 },
      timeout: 10000,
    });

    const results = response.data?.data?.results;
    if (!results || results.length === 0) {
      return null;
    }

    // Find the best match - prioritize exact title match
    const normalizedTitle = cleanTitle.toLowerCase();

    // First try to find exact title match
    let bestMatch = results.find((r: any) => {
      const rTitle = (r.name || r.title || '').toLowerCase();
      return rTitle === normalizedTitle;
    });

    // If no exact match, find closest match
    if (!bestMatch) {
      bestMatch = results.find((r: any) => {
        const rTitle = (r.name || r.title || '').toLowerCase();
        return rTitle.includes(normalizedTitle) || normalizedTitle.includes(rTitle);
      });
    }

    // If still no match, just use the first result
    if (!bestMatch) {
      bestMatch = results[0];
    }

    // Make sure it has a download URL
    if (!bestMatch.downloadUrl || bestMatch.downloadUrl.length === 0) {
      // Try next result with download URL
      bestMatch = results.find((r: any) => r.downloadUrl && r.downloadUrl.length > 0);
    }

    return bestMatch;
  } catch (error) {
    console.error('JioSaavn search error:', error);
    return null;
  }
}

// Get all Spotify synced songs from Firestore
export async function getSpotifySyncedSongs(): Promise<any[]> {
  if (!auth.currentUser) return [];

  try {
    const likedSongsRef = collection(db, 'users', auth.currentUser.uid, 'likedSongs');
    const snapshot = await getDocs(likedSongsRef);
    
    const spotifySongs: any[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      // Check if it's a Spotify song (has Spotify ID format or source is spotify, or no audioUrl)
      const isSpotifySong = data.source === 'spotify' || 
                           !data.audioUrl || 
                           data.audioUrl === '' ||
                           data.audioUrl?.includes('spotify') ||
                           (data.id && data.id.length === 22 && /^[a-zA-Z0-9]+$/.test(data.id));
      
      if (isSpotifySong) {
        spotifySongs.push({
          docId: docSnap.id,
          ...data
        });
      }
    });

    return spotifySongs;
  } catch (error) {
    console.error('Error getting Spotify synced songs:', error);
    return [];
  }
}

// Convert a single Spotify song to JioSaavn
export async function convertSingleSong(
  song: any,
  _onProgress?: (progress: ConversionProgress) => void
): Promise<{ success: boolean; jiosaavnSong?: any; error?: string }> {
  try {
    const jiosaavnResult = await searchJiosaavn(song.title, song.artist);
    
    if (!jiosaavnResult) {
      return { success: false, error: 'No match found on JioSaavn' };
    }

    const convertedSong = convertJiosaavnToSong(jiosaavnResult);
    
    if (!convertedSong.audioUrl) {
      return { success: false, error: 'No playable audio URL found' };
    }

    return { success: true, jiosaavnSong: convertedSong };
  } catch (error: any) {
    return { success: false, error: error.message || 'Conversion failed' };
  }
}

// Convert all Spotify synced songs to JioSaavn
export async function convertAllSpotifySongsToJiosaavn(
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> {
  const result: ConversionResult = {
    total: 0,
    converted: 0,
    failed: 0,
    failedSongs: [],
  };

  if (!auth.currentUser) {
    return result;
  }

  const userId = auth.currentUser.uid;

  try {
    const spotifySongs = await getSpotifySyncedSongs();
    result.total = spotifySongs.length;

    if (spotifySongs.length === 0) {
      onProgress?.({ current: 0, total: 0, currentSong: '', status: 'completed' });
      return result;
    }

    onProgress?.({ current: 0, total: result.total, currentSong: '', status: 'converting' });

    let processedCount = 0;

    for (const song of spotifySongs) {
      processedCount++;
      onProgress?.({
        current: processedCount,
        total: result.total,
        currentSong: `${song.title} - ${song.artist}`,
        status: 'converting',
      });

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));

      const { success, jiosaavnSong, error } = await convertSingleSong(song);

      if (success && jiosaavnSong) {
        try {
          // Delete the old Spotify document
          const oldDocRef = doc(db, 'users', userId, 'likedSongs', song.docId);
          await deleteDoc(oldDocRef);

          // Create new document with JioSaavn ID (same format as manual likes)
          const newDocRef = doc(db, 'users', userId, 'likedSongs', jiosaavnSong.id);
          
          // Store exactly like manual liked songs do
          const likedSongData = {
            id: jiosaavnSong.id,
            songId: jiosaavnSong.id,
            title: jiosaavnSong.title,
            artist: jiosaavnSong.artist,
            albumName: jiosaavnSong.album,
            imageUrl: jiosaavnSong.imageUrl,
            audioUrl: jiosaavnSong.audioUrl,
            duration: jiosaavnSong.duration,
            year: jiosaavnSong.year || '',
            likedAt: song.likedAt || serverTimestamp(), // Preserve original liked time
            source: 'mavrixfy', // Same as manual likes
          };

          await setDoc(newDocRef, likedSongData);
          result.converted++;
        } catch (writeError) {
          console.error('Error writing converted song:', writeError);
          result.failed++;
          result.failedSongs.push({
            title: song.title,
            artist: song.artist,
            reason: 'Failed to save converted song',
          });
        }
      } else {
        result.failed++;
        result.failedSongs.push({
          title: song.title,
          artist: song.artist,
          reason: error || 'Unknown error',
        });
      }
    }

    onProgress?.({
      current: result.total,
      total: result.total,
      currentSong: '',
      status: 'completed',
    });

    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('likedSongsUpdated'));

    return result;
  } catch (error: any) {
    console.error('Error converting Spotify songs:', error);
    onProgress?.({
      current: 0,
      total: result.total,
      currentSong: '',
      status: 'error',
    });
    return result;
  }
}

// Check how many Spotify songs need conversion
export async function getConversionStats(): Promise<{ spotifyCount: number; totalCount: number }> {
  if (!auth.currentUser) {
    return { spotifyCount: 0, totalCount: 0 };
  }

  try {
    const likedSongsRef = collection(db, 'users', auth.currentUser.uid, 'likedSongs');
    const snapshot = await getDocs(likedSongsRef);
    
    let spotifyCount = 0;
    let totalCount = 0;

    snapshot.forEach(docSnap => {
      totalCount++;
      const data = docSnap.data();
      
      // Check if it's a Spotify song that needs conversion
      const isSpotifySong = data.source === 'spotify' || 
                           !data.audioUrl || 
                           data.audioUrl === '' ||
                           data.audioUrl?.includes('spotify');
      
      if (isSpotifySong) {
        spotifyCount++;
      }
    });

    return { spotifyCount, totalCount };
  } catch (error) {
    console.error('Error getting conversion stats:', error);
    return { spotifyCount: 0, totalCount: 0 };
  }
}
