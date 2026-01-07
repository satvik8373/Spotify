import axiosInstance from '@/lib/axios';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';

// Types
export interface ConversionProgress {
  current: number;
  total: number;
  currentSong: string;
  status: 'searching' | 'converting' | 'saving' | 'complete' | 'error';
  message?: string;
}

export interface ConversionResult {
  total: number;
  converted: number;
  failed: number;
  skipped: number;
  errors: Array<{ song: string; error: string }>;
}

export interface ConvertedSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  imageUrl: string;
  audioUrl: string;
  duration: number;
  year: string;
  source: 'jiosaavn';
}

export interface SpotifySyncedSong {
  id: string;
  docId: string;
  title: string;
  artist: string;
  album?: string;
  imageUrl: string;
  audioUrl: string;
  duration: number;
  likedAt?: any;
}

// Convert JioSaavn API response to our song format
function convertJiosaavnToSong(item: any): ConvertedSong | null {
  if (!item) return null;

  // Get the best quality download URL (prefer 320kbps, then 160kbps, then 96kbps)
  let audioUrl = '';
  const downloadUrls = item.downloadUrl || [];
  
  // Try to get highest quality first
  for (const quality of ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps']) {
    const urlObj = downloadUrls.find((u: any) => u.quality === quality);
    if (urlObj?.url) {
      audioUrl = urlObj.url;
      break;
    }
  }

  // Fallback to array index if quality labels not found
  if (!audioUrl && downloadUrls.length > 0) {
    audioUrl = downloadUrls[downloadUrls.length - 1]?.url || downloadUrls[0]?.url || '';
  }

  // Get best quality image
  let imageUrl = '';
  const images = item.image || [];
  if (images.length > 0) {
    // Prefer 500x500, then 150x150, then 50x50
    const highQuality = images.find((img: any) => img.quality === '500x500');
    const medQuality = images.find((img: any) => img.quality === '150x150');
    imageUrl = highQuality?.url || medQuality?.url || images[images.length - 1]?.url || '';
  }

  // Extract artist names
  let artist = '';
  if (item.artists?.primary && Array.isArray(item.artists.primary)) {
    artist = item.artists.primary.map((a: any) => a.name).join(', ');
  } else if (item.primaryArtists) {
    artist = item.primaryArtists;
  } else if (item.artist) {
    artist = item.artist;
  }

  return {
    id: item.id || '',
    title: item.name || item.title || 'Unknown Title',
    artist: artist || 'Unknown Artist',
    album: item.album?.name || item.album || '',
    imageUrl,
    audioUrl,
    duration: parseInt(item.duration) || 0,
    year: item.year || item.releaseDate?.split('-')[0] || '',
    source: 'jiosaavn'
  };
}

// Clean search query for better matching
function cleanSearchQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // Remove parentheses content
    .replace(/\[.*?\]/g, '') // Remove brackets content
    .replace(/feat\.?.*$/i, '') // Remove featuring
    .replace(/ft\.?.*$/i, '')
    .replace(/\s*-\s*remaster.*$/i, '')
    .replace(/\s*-\s*remix.*$/i, '')
    .replace(/\s*-\s*live.*$/i, '')
    .replace(/\s*-\s*acoustic.*$/i, '')
    .replace(/[^\w\s]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate similarity between two strings
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  let matchCount = 0;
  for (const word of words1) {
    if (words2.some(w => w.includes(word) || word.includes(w))) {
      matchCount++;
    }
  }
  
  return matchCount / Math.max(words1.length, words2.length);
}

// Search for a song on JioSaavn
async function searchJiosaavn(title: string, artist: string): Promise<any | null> {
  try {
    const cleanTitle = cleanSearchQuery(title);
    const cleanArtist = cleanSearchQuery(artist.split(',')[0]); // Use first artist only
    const query = `${cleanTitle} ${cleanArtist}`;
    
    console.log(`🔍 Searching JioSaavn for: "${query}"`);
    console.log(`📡 API URL: ${axiosInstance.defaults.baseURL}/jiosaavn/search/songs`);
    
    const response = await axiosInstance.get('/jiosaavn/search/songs', {
      params: { query, limit: 10 },
      timeout: 15000,
    });

    console.log(`📥 JioSaavn API Response:`, response.status, response.data ? 'has data' : 'no data');

    const results = response.data?.data?.results;
    if (!results || results.length === 0) {
      console.log('❌ No results found on JioSaavn for:', query);
      return null;
    }

    console.log(`✅ Found ${results.length} results on JioSaavn`);

    // Find the best match
    let bestMatch = null;
    let bestScore = 0;

    for (const result of results) {
      const resultTitle = (result.name || result.title || '').toLowerCase();
      const resultArtist = (result.primaryArtists || result.artist || '').toLowerCase();
      
      // Calculate match scores
      const titleScore = calculateSimilarity(cleanTitle, resultTitle);
      const artistScore = calculateSimilarity(cleanArtist, resultArtist);
      
      // Combined score with title weighted more
      const combinedScore = (titleScore * 0.7) + (artistScore * 0.3);
      
      // Check if this result has a valid audio URL
      const hasAudio = result.downloadUrl && result.downloadUrl.length > 0;
      
      if (hasAudio && combinedScore > bestScore && combinedScore > 0.3) {
        bestScore = combinedScore;
        bestMatch = result;
      }
    }

    if (bestMatch) {
      console.log(`🎯 Best match: "${bestMatch.name}" by ${bestMatch.primaryArtists} (score: ${bestScore.toFixed(2)})`);
    }

    return bestMatch;
  } catch (error: any) {
    console.error('❌ JioSaavn search error:', error.message);
    return null;
  }
}

// Get all Spotify synced songs that need conversion
export async function getSpotifySyncedSongs(): Promise<SpotifySyncedSong[]> {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  try {
    const likedSongsRef = collection(db, 'users', userId, 'likedSongs');
    const snapshot = await getDocs(likedSongsRef);
    
    const songsNeedingConversion: SpotifySyncedSong[] = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const audioUrl = (data.audioUrl || '').trim();
      
      // Song needs conversion if:
      // 1. audioUrl is empty or missing
      // 2. audioUrl doesn't contain a valid JioSaavn streaming URL (saavncdn)
      // 3. audioUrl is a Spotify preview URL (preview.scdn.co)
      const hasValidJioSaavnUrl = audioUrl.length > 0 && audioUrl.includes('saavncdn');
      const isSpotifyPreview = audioUrl.includes('preview.scdn.co') || audioUrl.includes('spotify');
      
      if (!hasValidJioSaavnUrl || isSpotifyPreview || !audioUrl) {
        console.log(`📝 Song needs conversion: "${data.title}" | audioUrl: ${audioUrl.substring(0, 50)}...`);
        songsNeedingConversion.push({
          id: data.id || data.songId || docSnap.id,
          docId: docSnap.id,
          title: data.title || 'Unknown',
          artist: data.artist || 'Unknown',
          album: data.albumName || data.album || '',
          imageUrl: data.imageUrl || '',
          audioUrl: audioUrl,
          duration: data.duration || 0,
          likedAt: data.likedAt
        });
      }
    });

    console.log(`📊 Found ${songsNeedingConversion.length} songs needing conversion out of ${snapshot.size} total`);
    return songsNeedingConversion;
  } catch (error) {
    console.error('Error getting Spotify synced songs:', error);
    return [];
  }
}

// Convert a single Spotify song to JioSaavn
export async function convertSingleSong(
  song: SpotifySyncedSong,
  onProgress?: (progress: ConversionProgress) => void
): Promise<{ success: boolean; convertedSong?: ConvertedSong; error?: string }> {
  try {
    onProgress?.({
      current: 0,
      total: 1,
      currentSong: song.title,
      status: 'searching',
      message: `Searching for "${song.title}"...`
    });

    const jiosaavnResult = await searchJiosaavn(song.title, song.artist);
    
    if (!jiosaavnResult) {
      return { success: false, error: 'No match found on JioSaavn' };
    }

    onProgress?.({
      current: 0,
      total: 1,
      currentSong: song.title,
      status: 'converting',
      message: `Converting "${song.title}"...`
    });

    const convertedSong = convertJiosaavnToSong(jiosaavnResult);
    
    if (!convertedSong || !convertedSong.audioUrl) {
      return { success: false, error: 'No playable audio URL found' };
    }

    return { success: true, convertedSong };
  } catch (error: any) {
    return { success: false, error: error.message || 'Conversion failed' };
  }
}

// Convert all Spotify synced songs to JioSaavn and save to Firestore
export async function convertAllSpotifySongsToJiosaavn(
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    return { total: 0, converted: 0, failed: 0, skipped: 0, errors: [] };
  }

  const songsToConvert = await getSpotifySyncedSongs();
  
  const result: ConversionResult = {
    total: songsToConvert.length,
    converted: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  if (songsToConvert.length === 0) {
    onProgress?.({
      current: 0,
      total: 0,
      currentSong: '',
      status: 'complete',
      message: 'All songs already have valid audio URLs!'
    });
    return result;
  }

  console.log(`🚀 Starting conversion of ${songsToConvert.length} songs...`);

  for (let i = 0; i < songsToConvert.length; i++) {
    const song = songsToConvert[i];
    
    onProgress?.({
      current: i + 1,
      total: songsToConvert.length,
      currentSong: song.title,
      status: 'searching',
      message: `Searching for "${song.title}" (${i + 1}/${songsToConvert.length})`
    });

    // Add delay to avoid rate limiting
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const { success, convertedSong, error } = await convertSingleSong(song);

    if (success && convertedSong) {
      try {
        onProgress?.({
          current: i + 1,
          total: songsToConvert.length,
          currentSong: song.title,
          status: 'saving',
          message: `Saving "${song.title}"...`
        });

        // Delete old document and create new one with JioSaavn data
        const oldDocRef = doc(db, 'users', userId, 'likedSongs', song.docId);
        await deleteDoc(oldDocRef);

        // Create new document with JioSaavn ID - SAME FORMAT AS PLAYLIST SONGS
        const newDocRef = doc(db, 'users', userId, 'likedSongs', convertedSong.id);
        
        // Use exact same format as FirestoreSong (playlist songs)
        const likedSongData = {
          id: convertedSong.id,
          title: convertedSong.title,
          artist: convertedSong.artist,
          albumId: null, // Same as playlist songs
          imageUrl: convertedSong.imageUrl,
          audioUrl: convertedSong.audioUrl,
          duration: convertedSong.duration,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Extra fields for tracking
          year: convertedSong.year,
          albumName: convertedSong.album,
          likedAt: song.likedAt || new Date().toISOString(),
          source: 'jiosaavn',
          convertedFrom: 'spotify'
        };

        await setDoc(newDocRef, likedSongData);
        
        console.log(`✅ Converted: "${song.title}" -> "${convertedSong.title}"`);
        result.converted++;
      } catch (writeError: any) {
        console.error(`❌ Failed to save "${song.title}":`, writeError);
        result.failed++;
        result.errors.push({ song: song.title, error: writeError.message });
      }
    } else {
      console.log(`❌ Failed to convert "${song.title}": ${error}`);
      result.failed++;
      result.errors.push({ song: song.title, error: error || 'Unknown error' });
    }
  }

  onProgress?.({
    current: songsToConvert.length,
    total: songsToConvert.length,
    currentSong: '',
    status: 'complete',
    message: `Conversion complete! ${result.converted} converted, ${result.failed} failed`
  });

  console.log(`🏁 Conversion complete:`, result);
  
  // Reload the liked songs store to update the UI and heart icons
  if (result.converted > 0) {
    try {
      await useLikedSongsStore.getState().loadLikedSongs();
      console.log('✅ Liked songs store reloaded after conversion');
    } catch (e) {
      console.error('Failed to reload liked songs store:', e);
    }
    
    document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
  }
  
  return result;
}


// Convert and save a batch of Spotify tracks during initial sync
export async function convertAndSaveSpotifyTracks(
  tracks: any[],
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    console.log('❌ No user logged in, cannot convert tracks');
    return { total: 0, converted: 0, failed: 0, skipped: 0, errors: [] };
  }

  const result: ConversionResult = {
    total: tracks.length,
    converted: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  if (tracks.length === 0) {
    console.log('⚠️ No tracks to convert');
    return result;
  }

  console.log(`🚀 Starting JioSaavn conversion for ${tracks.length} Spotify tracks...`);
  console.log(`👤 User ID: ${userId}`);
  console.log(`📋 First track:`, tracks[0]?.title || tracks[0]?.name, 'by', tracks[0]?.artist);

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const title = track.title || track.name || 'Unknown';
    const artist = track.artist || track.artists?.[0]?.name || 'Unknown';
    
    onProgress?.({
      current: i + 1,
      total: tracks.length,
      currentSong: title,
      status: 'searching',
      message: `Converting "${title}" (${i + 1}/${tracks.length})`
    });

    // Add delay to avoid rate limiting
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    try {
      const jiosaavnResult = await searchJiosaavn(title, artist);
      
      if (jiosaavnResult) {
        const convertedSong = convertJiosaavnToSong(jiosaavnResult);
        
        if (convertedSong && convertedSong.audioUrl) {
          onProgress?.({
            current: i + 1,
            total: tracks.length,
            currentSong: title,
            status: 'saving',
            message: `Saving "${title}"...`
          });

          // Save to Firestore with JioSaavn data - SAME FORMAT AS PLAYLIST SONGS
          const docRef = doc(db, 'users', userId, 'likedSongs', convertedSong.id);
          
          // Use exact same format as FirestoreSong (playlist songs)
          const likedSongData = {
            id: convertedSong.id,
            title: convertedSong.title,
            artist: convertedSong.artist,
            albumId: null, // Same as playlist songs
            imageUrl: convertedSong.imageUrl,
            audioUrl: convertedSong.audioUrl,
            duration: convertedSong.duration,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Extra fields for tracking (won't break compatibility)
            year: convertedSong.year,
            albumName: convertedSong.album,
            likedAt: track.addedAt ? new Date(track.addedAt).toISOString() : new Date().toISOString(),
            source: 'jiosaavn',
            convertedFrom: 'spotify',
            spotifyId: track.id
          };

          await setDoc(docRef, likedSongData);
          
          console.log(`✅ Saved: "${convertedSong.title}" with audio: ${convertedSong.audioUrl.substring(0, 50)}...`);
          result.converted++;
        } else {
          // Save with original Spotify data as fallback
          await saveSpotifyTrackAsFallback(userId, track);
          result.skipped++;
          console.log(`⚠️ No JioSaavn audio for "${title}", saved with Spotify data`);
        }
      } else {
        // Save with original Spotify data as fallback
        await saveSpotifyTrackAsFallback(userId, track);
        result.skipped++;
        console.log(`⚠️ No JioSaavn match for "${title}", saved with Spotify data`);
      }
    } catch (error: any) {
      console.error(`❌ Error converting "${title}":`, error);
      result.failed++;
      result.errors.push({ song: title, error: error.message });
      
      // Try to save with Spotify data as fallback
      try {
        await saveSpotifyTrackAsFallback(userId, track);
        result.skipped++;
      } catch {}
    }
  }

  onProgress?.({
    current: tracks.length,
    total: tracks.length,
    currentSong: '',
    status: 'complete',
    message: `Done! ${result.converted} converted, ${result.skipped} saved with Spotify data, ${result.failed} failed`
  });

  console.log(`🏁 Batch conversion complete:`, result);
  
  // Reload the liked songs store to update the UI and heart icons
  if (result.converted > 0 || result.skipped > 0) {
    try {
      // Reload the store from Firestore to get all the new songs
      await useLikedSongsStore.getState().loadLikedSongs();
      console.log('✅ Liked songs store reloaded after sync');
    } catch (e) {
      console.error('Failed to reload liked songs store:', e);
    }
    
    // Also dispatch event to notify UI components
    document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
  }
  
  return result;
}

// Save Spotify track as fallback when JioSaavn conversion fails
async function saveSpotifyTrackAsFallback(userId: string, track: any): Promise<void> {
  const docRef = doc(db, 'users', userId, 'likedSongs', track.id);
  
  // Use exact same format as FirestoreSong (playlist songs)
  const likedSongData = {
    id: track.id,
    title: track.title || track.name || 'Unknown',
    artist: track.artist || track.artists?.[0]?.name || 'Unknown',
    albumId: null, // Same as playlist songs
    imageUrl: track.imageUrl || track.album?.images?.[0]?.url || '',
    audioUrl: track.audioUrl || track.preview_url || '', // Spotify preview URL as fallback
    duration: track.duration || Math.floor((track.duration_ms || 0) / 1000),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Extra fields for tracking
    year: track.year || '',
    albumName: track.album || track.album?.name || '',
    likedAt: track.addedAt ? new Date(track.addedAt).toISOString() : new Date().toISOString(),
    source: 'spotify',
    needsConversion: true
  };

  await setDoc(docRef, likedSongData);
}

// Check how many songs need conversion
export async function getSongsNeedingConversionCount(): Promise<number> {
  const songs = await getSpotifySyncedSongs();
  return songs.length;
}

// Retry conversion for failed songs
export async function retryFailedConversions(
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    return { total: 0, converted: 0, failed: 0, skipped: 0, errors: [] };
  }

  // Get songs marked as needing conversion
  const likedSongsRef = collection(db, 'users', userId, 'likedSongs');
  const snapshot = await getDocs(likedSongsRef);
  
  const songsToRetry: SpotifySyncedSong[] = [];
  
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.needsConversion || data.source === 'spotify') {
      songsToRetry.push({
        id: data.id || data.songId || docSnap.id,
        docId: docSnap.id,
        title: data.title || 'Unknown',
        artist: data.artist || 'Unknown',
        album: data.albumName || data.album || '',
        imageUrl: data.imageUrl || '',
        audioUrl: data.audioUrl || '',
        duration: data.duration || 0,
        likedAt: data.likedAt
      });
    }
  });

  if (songsToRetry.length === 0) {
    return { total: 0, converted: 0, failed: 0, skipped: 0, errors: [] };
  }

  // Use the main conversion function
  const result: ConversionResult = {
    total: songsToRetry.length,
    converted: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  for (let i = 0; i < songsToRetry.length; i++) {
    const song = songsToRetry[i];
    
    onProgress?.({
      current: i + 1,
      total: songsToRetry.length,
      currentSong: song.title,
      status: 'searching',
      message: `Retrying "${song.title}" (${i + 1}/${songsToRetry.length})`
    });

    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const { success, convertedSong, error } = await convertSingleSong(song);

    if (success && convertedSong) {
      try {
        const oldDocRef = doc(db, 'users', userId, 'likedSongs', song.docId);
        await deleteDoc(oldDocRef);

        const newDocRef = doc(db, 'users', userId, 'likedSongs', convertedSong.id);
        
        // Use exact same format as FirestoreSong (playlist songs)
        await setDoc(newDocRef, {
          id: convertedSong.id,
          title: convertedSong.title,
          artist: convertedSong.artist,
          albumId: null, // Same as playlist songs
          imageUrl: convertedSong.imageUrl,
          audioUrl: convertedSong.audioUrl,
          duration: convertedSong.duration,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Extra fields for tracking
          year: convertedSong.year,
          albumName: convertedSong.album,
          likedAt: song.likedAt || new Date().toISOString(),
          source: 'jiosaavn',
          convertedFrom: 'spotify'
        });
        
        result.converted++;
      } catch (writeError: any) {
        result.failed++;
        result.errors.push({ song: song.title, error: writeError.message });
      }
    } else {
      result.failed++;
      result.errors.push({ song: song.title, error: error || 'Unknown error' });
    }
  }

  onProgress?.({
    current: songsToRetry.length,
    total: songsToRetry.length,
    currentSong: '',
    status: 'complete',
    message: `Retry complete! ${result.converted} converted, ${result.failed} still failed`
  });

  return result;
}

export default {
  getSpotifySyncedSongs,
  convertSingleSong,
  convertAllSpotifySongsToJiosaavn,
  convertAndSaveSpotifyTracks,
  getSongsNeedingConversionCount,
  retryFailedConversions
};
