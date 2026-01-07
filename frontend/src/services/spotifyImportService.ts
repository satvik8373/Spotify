import axiosInstance from '@/lib/axios';
import { getSavedTracks, isAuthenticated as isSpotifyAuthenticated } from '@/services/spotifyService';
import { resolveArtist } from '@/lib/resolveArtist';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';

export interface ImportProgress {
  current: number;
  total: number;
  currentSong: string;
  status: 'searching' | 'converting' | 'saving' | 'complete' | 'error';
  message?: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ song: string; error: string }>;
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

// Search for a song on JioSaavn (same logic as playlist songs)
async function searchJiosaavn(title: string, artist: string): Promise<any | null> {
  try {
    const cleanTitle = cleanSearchQuery(title);
    const cleanArtist = cleanSearchQuery(artist.split(',')[0]); // Use first artist only
    const query = `${cleanTitle} ${cleanArtist}`;
    
    console.log(`🔍 Searching JioSaavn for: "${query}"`);
    
    const response = await axiosInstance.get('/jiosaavn/search/songs', {
      params: { query, limit: 10 },
      timeout: 15000,
    });

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

// Convert JioSaavn API response to our song format (same as playlist logic)
function convertJiosaavnToSong(item: any): any | null {
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

  // Return in the same format as playlist songs
  return {
    _id: item.id || '',
    title: item.name || item.title || 'Unknown Title',
    artist: artist || 'Unknown Artist',
    albumId: null,
    imageUrl,
    audioUrl,
    duration: parseInt(item.duration) || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Get all Spotify liked songs
export async function fetchSpotifyLikedSongs(): Promise<any[]> {
  if (!isSpotifyAuthenticated()) {
    throw new Error('Not authenticated with Spotify');
  }

  const pageSize = 50;
  let offset = 0;
  const songs: any[] = [];

  // Paginate until no items returned
  while (true) {
    const items = await getSavedTracks(pageSize, offset);
    if (!items || items.length === 0) break;
    
    for (const item of items) {
      const track = item?.track || item;
      if (track?.id) {
        songs.push({
          _id: track.id,
          title: track.name || 'Unknown Title',
          artist: resolveArtist(track),
          albumId: null,
          imageUrl: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
          audioUrl: track.preview_url || '',
          duration: track.duration_ms ? Math.floor(track.duration_ms / 1000) : 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          addedAt: item.added_at
        });
      }
    }
    
    offset += items.length;
    if (items.length < pageSize) break;
  }

  // Sort by added date (most recent first)
  return songs.sort((a, b) => {
    const aTs = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const bTs = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return bTs - aTs;
  });
}

// Import selected Spotify songs to liked songs (same logic as playlist add)
export async function importSpotifySongsToLiked(
  spotifyTracks: any[],
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    total: spotifyTracks.length,
    imported: 0,
    failed: 0,
    errors: []
  };

  if (spotifyTracks.length === 0) {
    return result;
  }

  console.log(`🚀 Starting import of ${spotifyTracks.length} Spotify songs to liked songs...`);

  for (let i = 0; i < spotifyTracks.length; i++) {
    const track = spotifyTracks[i];
    const title = track.title || track.name || 'Unknown';
    const artist = track.artist || 'Unknown';
    
    onProgress?.({
      current: i + 1,
      total: spotifyTracks.length,
      currentSong: title,
      status: 'searching',
      message: `Searching for "${title}" (${i + 1}/${spotifyTracks.length})`
    });

    // Add delay to avoid rate limiting
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    try {
      // Search JioSaavn for the song
      const jiosaavnResult = await searchJiosaavn(title, artist);
      
      if (jiosaavnResult) {
        const convertedSong = convertJiosaavnToSong(jiosaavnResult);
        
        if (convertedSong && convertedSong.audioUrl) {
          onProgress?.({
            current: i + 1,
            total: spotifyTracks.length,
            currentSong: title,
            status: 'saving',
            message: `Adding "${title}" to liked songs...`
          });

          // Add to liked songs using the store (same method as manual adds)
          await useLikedSongsStore.getState().addLikedSong(convertedSong);
          
          console.log(`✅ Imported: "${convertedSong.title}"`);
          result.imported++;
        } else {
          // Save with original Spotify data as fallback
          const fallbackSong = {
            _id: track._id,
            title: track.title,
            artist: track.artist,
            albumId: null,
            imageUrl: track.imageUrl,
            audioUrl: track.audioUrl, // Spotify preview URL
            duration: track.duration,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await useLikedSongsStore.getState().addLikedSong(fallbackSong);
          result.imported++;
          console.log(`⚠️ No JioSaavn audio for "${title}", saved with Spotify data`);
        }
      } else {
        // Save with original Spotify data as fallback
        const fallbackSong = {
          _id: track._id,
          title: track.title,
          artist: track.artist,
          albumId: null,
          imageUrl: track.imageUrl,
          audioUrl: track.audioUrl, // Spotify preview URL
          duration: track.duration,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await useLikedSongsStore.getState().addLikedSong(fallbackSong);
        result.imported++;
        console.log(`⚠️ No JioSaavn match for "${title}", saved with Spotify data`);
      }
    } catch (error: any) {
      console.error(`❌ Error importing "${title}":`, error);
      result.failed++;
      result.errors.push({ song: title, error: error.message });
    }
  }

  onProgress?.({
    current: spotifyTracks.length,
    total: spotifyTracks.length,
    currentSong: '',
    status: 'complete',
    message: `Import complete! ${result.imported} imported, ${result.failed} failed`
  });

  console.log(`🏁 Import complete:`, result);
  return result;
}