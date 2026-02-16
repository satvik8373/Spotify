import { Playlist } from '../models/playlist.model.js';
import { Song } from '../models/song.model.js';
import admin from 'firebase-admin';

// Create a new playlist
export const createPlaylist = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    
    // Get the Firebase user ID
    const userId = req.auth?.uid;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'Authentication required', 
        error: 'No user ID found in request'
      });
    }
    
    // Get user information from Firebase
    try {
      const userRecord = await admin.auth().getUser(userId);
      
      // Create the playlist with Firebase user info
      const playlist = {
        _id: `playlist_${Date.now()}`,
        name: name || 'My Playlist',
        description: description || '',
        isPublic: isPublic !== undefined ? isPublic : true,
        songs: [],
        createdAt: new Date(),
        createdBy: {
          uid: userRecord.uid,
          fullName: userRecord.displayName || 'User',
          imageUrl: userRecord.photoURL || 'https://via.placeholder.com/150',
        }
      };
      
      // Create playlist in Firestore if available
      if (admin.firestore) {
        const playlistsRef = admin.firestore().collection('playlists');
        await playlistsRef.doc(playlist._id).set(playlist);
      }
      
      res.status(201).json(playlist);
    } catch (error) {
      return res.status(500).json({ 
        message: 'Error creating playlist', 
        error: error.message
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating playlist', 
      error: error.message 
    });
  }
};

// Get all playlists (with filters for public/private)
export const getAllPlaylists = async (req, res) => {
  try {
    const { featured, public: isPublic } = req.query;
    const query = {};
    
    if (featured === 'true') {
      query.featured = true;
    }
    
    if (isPublic === 'true') {
      query.isPublic = true;
    }

    const playlists = await Playlist.find(query)
      .populate('createdBy', 'fullName imageUrl')
      .populate('songs')
      .sort({ createdAt: -1 });
    
    res.status(200).json(playlists);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving playlists', error: error.message });
  }
};

// Get user's playlists
export const getUserPlaylists = async (req, res) => {
  try {
    // Check if authentication is present
    if (!req.auth || (!req.auth.userId && !req.auth.uid)) {
      return res.status(401).json({ 
        message: 'Authentication required', 
        error: 'No user ID found in request', 
        authPresent: !!req.auth 
      });
    }
    
    // Use Firebase UID
    const userId = req.auth.uid;
    const targetUserId = req.params.userId || userId;
    
    try {
      // Try to get Firebase user to confirm it exists
      await admin.auth().getUser(targetUserId);
    } catch (error) {
      return res.status(404).json({ 
        message: 'User not found', 
        userId: targetUserId,
        authUserId: userId,
        error: error.message
      });
    }
    
    // Query playlists by Firebase UID
    const playlists = await Playlist.find({ 
      "createdBy.uid": targetUserId
    })
    .populate('songs')
    .sort({ createdAt: -1 });
    
    res.status(200).json(playlists);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving user playlists', 
      error: error.message,
              authInfo: {
          hasAuth: !!req.auth,
          userId: req.auth?.uid || 'Not available'
        }
    });
  }
};

// Get a single playlist by ID
export const getPlaylistById = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('createdBy', 'fullName imageUrl uid')
      .populate('songs');
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    // Check if playlist is private and not owned by requestor
    if (!playlist.isPublic && playlist.createdBy.uid !== req.auth.uid) {
      return res.status(403).json({ message: 'You do not have permission to view this playlist' });
    }
    
    res.status(200).json(playlist);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving playlist', error: error.message });
  }
};

// Update a playlist
export const updatePlaylist = async (req, res) => {
  try {
    const { name, description, isPublic, featured, imageUrl } = req.body;
    const playlistId = req.params.id;
    
    const playlist = await Playlist.findById(playlistId).populate('createdBy', 'uid');
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    // Check if user is the owner of the playlist
    if (playlist.createdBy.uid !== req.auth.uid) {
      return res.status(403).json({ message: 'You do not have permission to update this playlist' });
    }
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      { 
        name: name || playlist.name,
        description: description !== undefined ? description : playlist.description,
        isPublic: isPublic !== undefined ? isPublic : playlist.isPublic,
        featured: featured !== undefined ? featured : playlist.featured,
        imageUrl: imageUrl || playlist.imageUrl
      },
      { new: true }
    ).populate('createdBy', 'fullName imageUrl').populate('songs');
    
    res.status(200).json(updatedPlaylist);
  } catch (error) {
    res.status(500).json({ message: 'Error updating playlist', error: error.message });
  }
};

// Add a song to a playlist
export const addSongToPlaylist = async (req, res) => {
  try {
    const { songId } = req.body;
    const playlistId = req.params.id;
    
    // Check if playlist exists
    const playlist = await Playlist.findById(playlistId).populate('createdBy', 'uid');
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    // Check if user is the owner of the playlist
    if (playlist.createdBy.uid !== req.auth.uid) {
      return res.status(403).json({ message: 'You do not have permission to modify this playlist' });
    }
    
    // Check if song exists
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    
    // Check if song is already in the playlist
    if (playlist.songs.includes(songId)) {
      return res.status(400).json({ message: 'Song already in playlist' });
    }
    
    // Add song to playlist
    playlist.songs.push(songId);
    await playlist.save();
    
    const updatedPlaylist = await Playlist.findById(playlistId)
      .populate('createdBy', 'fullName imageUrl')
      .populate('songs');
    
    res.status(200).json(updatedPlaylist);
  } catch (error) {
    res.status(500).json({ message: 'Error adding song to playlist', error: error.message });
  }
};

// Remove a song from a playlist
export const removeSongFromPlaylist = async (req, res) => {
  try {
    const { songId } = req.body;
    const playlistId = req.params.id;
    
    // Check if playlist exists
    const playlist = await Playlist.findById(playlistId).populate('createdBy', 'uid');
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    // Check if user is the owner of the playlist
    if (playlist.createdBy.uid !== req.auth.uid) {
      return res.status(403).json({ message: 'You do not have permission to modify this playlist' });
    }
    
    // Remove song from playlist
    playlist.songs = playlist.songs.filter(id => id.toString() !== songId);
    await playlist.save();
    
    const updatedPlaylist = await Playlist.findById(playlistId)
      .populate('createdBy', 'fullName imageUrl')
      .populate('songs');
    
    res.status(200).json(updatedPlaylist);
  } catch (error) {
    res.status(500).json({ message: 'Error removing song from playlist', error: error.message });
  }
};

// Delete a playlist
export const deletePlaylist = async (req, res) => {
  try {
    const playlistId = req.params.id;
    
    // Check if playlist exists
    const playlist = await Playlist.findById(playlistId).populate('createdBy', 'uid');
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    // Check if user is the owner of the playlist
    if (playlist.createdBy.uid !== req.auth.uid) {
      return res.status(403).json({ message: 'You do not have permission to delete this playlist' });
    }
    
    await Playlist.findByIdAndDelete(playlistId);
    
    res.status(200).json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting playlist', error: error.message });
  }
};

// Toggle featured status (admin only)
export const toggleFeatured = async (req, res) => {
  try {
    const playlistId = req.params.id;
    
    // Check if playlist exists
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    // Toggle featured status
    playlist.featured = !playlist.featured;
    await playlist.save();
    
    res.status(200).json({ featured: playlist.featured });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling featured status', error: error.message });
  }
};

// Helper function to extract keywords from playlist title
const extractKeywords = (title) => {
  const keywords = title.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  return keywords;
};

// Helper function to calculate relevance score
const calculateRelevanceScore = (song, keywords, category) => {
  let score = 0;
  const songTitle = (song.title || '').toLowerCase();
  const songArtist = (song.artist || '').toLowerCase();
  const songAlbum = (song.album || '').toLowerCase();
  const songGenre = (song.genre || '').toLowerCase();
  
  // Match category
  if (category && songGenre.includes(category.toLowerCase())) {
    score += 10;
  }
  
  // Match keywords in title
  keywords.forEach(keyword => {
    if (songTitle.includes(keyword)) score += 5;
    if (songArtist.includes(keyword)) score += 3;
    if (songAlbum.includes(keyword)) score += 2;
    if (songGenre.includes(keyword)) score += 4;
  });
  
  return score;
};

// Auto-populate playlist with relevant songs
export const autoPopulatePlaylist = async (req, res) => {
  try {
    const playlistId = req.params.id;
    const { category, maxSongs = 50, batchSize = 10, delayMs = 1000 } = req.body;
    
    // Check if playlist exists
    const db = admin.firestore();
    const playlistRef = db.collection('playlists').doc(playlistId);
    const playlistDoc = await playlistRef.get();
    
    if (!playlistDoc.exists) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    const playlist = playlistDoc.data();
    
    // Check if user is the owner
    if (playlist.createdBy.uid !== req.auth.uid) {
      return res.status(403).json({ message: 'You do not have permission to modify this playlist' });
    }
    
    // Extract keywords from playlist title
    const keywords = extractKeywords(playlist.name);
    
    // Query songs from Firestore
    let songsQuery = db.collection('songs');
    
    // Filter by category if provided
    if (category) {
      songsQuery = songsQuery.where('genre', '==', category);
    }
    
    const songsSnapshot = await songsQuery.limit(200).get();
    const allSongs = [];
    
    songsSnapshot.forEach(doc => {
      allSongs.push({ id: doc.id, ...doc.data() });
    });
    
    // Calculate relevance scores and sort
    const scoredSongs = allSongs
      .map(song => ({
        ...song,
        relevanceScore: calculateRelevanceScore(song, keywords, category)
      }))
      .filter(song => song.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Get existing song IDs
    const existingSongIds = new Set(playlist.songs || []);
    
    // Filter out already added songs
    const songsToAdd = scoredSongs
      .filter(song => !existingSongIds.has(song.id))
      .slice(0, maxSongs);
    
    if (songsToAdd.length === 0) {
      return res.status(200).json({ 
        message: 'No relevant songs found to add',
        addedCount: 0,
        playlist
      });
    }
    
    // Add songs in batches to respect rate limits
    const addedSongs = [];
    for (let i = 0; i < songsToAdd.length; i += batchSize) {
      const batch = songsToAdd.slice(i, i + batchSize);
      const songIds = batch.map(song => song.id);
      
      // Update playlist with new songs
      await playlistRef.update({
        songs: admin.firestore.FieldValue.arrayUnion(...songIds)
      });
      
      addedSongs.push(...songIds);
      
      // Delay between batches to respect rate limits
      if (i + batchSize < songsToAdd.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Get updated playlist
    const updatedPlaylistDoc = await playlistRef.get();
    const updatedPlaylist = updatedPlaylistDoc.data();
    
    res.status(200).json({
      message: 'Playlist auto-populated successfully',
      addedCount: addedSongs.length,
      totalSongs: updatedPlaylist.songs.length,
      playlist: updatedPlaylist
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: 'Error auto-populating playlist', 
      error: error.message 
    });
  }
};

// Bulk add songs to playlist with rate limit handling
export const bulkAddSongsToPlaylist = async (req, res) => {
  try {
    const playlistId = req.params.id;
    const { songIds, batchSize = 10, delayMs = 1000 } = req.body;
    
    if (!Array.isArray(songIds) || songIds.length === 0) {
      return res.status(400).json({ message: 'songIds must be a non-empty array' });
    }
    
    // Check if playlist exists
    const db = admin.firestore();
    const playlistRef = db.collection('playlists').doc(playlistId);
    const playlistDoc = await playlistRef.get();
    
    if (!playlistDoc.exists) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    const playlist = playlistDoc.data();
    
    // Check if user is the owner
    if (playlist.createdBy.uid !== req.auth.uid) {
      return res.status(403).json({ message: 'You do not have permission to modify this playlist' });
    }
    
    // Get existing song IDs
    const existingSongIds = new Set(playlist.songs || []);
    
    // Filter out duplicates
    const newSongIds = songIds.filter(id => !existingSongIds.has(id));
    
    if (newSongIds.length === 0) {
      return res.status(200).json({ 
        message: 'All songs already in playlist',
        addedCount: 0,
        playlist
      });
    }
    
    // Add songs in batches
    const addedSongs = [];
    for (let i = 0; i < newSongIds.length; i += batchSize) {
      const batch = newSongIds.slice(i, i + batchSize);
      
      await playlistRef.update({
        songs: admin.firestore.FieldValue.arrayUnion(...batch)
      });
      
      addedSongs.push(...batch);
      
      // Delay between batches
      if (i + batchSize < newSongIds.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Get updated playlist
    const updatedPlaylistDoc = await playlistRef.get();
    const updatedPlaylist = updatedPlaylistDoc.data();
    
    res.status(200).json({
      message: 'Songs added successfully',
      addedCount: addedSongs.length,
      totalSongs: updatedPlaylist.songs.length,
      playlist: updatedPlaylist
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: 'Error adding songs to playlist', 
      error: error.message 
    });
  }
};

// Import JioSaavn playlist to user's library
export const importJioSaavnPlaylist = async (req, res) => {
  try {
    const { jiosaavnPlaylistId, name, description, isPublic = true } = req.body;
    
    if (!jiosaavnPlaylistId) {
      return res.status(400).json({ message: 'JioSaavn playlist ID is required' });
    }
    
    // Get the Firebase user ID
    const userId = req.auth?.uid;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'Authentication required', 
        error: 'No user ID found in request'
      });
    }
    
    // Import JioSaavn service
    const jiosaavnService = await import('../services/jiosaavn.service.js');
    
    // Fetch JioSaavn playlist details using comprehensive method
    console.log(`Importing JioSaavn playlist: ${jiosaavnPlaylistId}`);
    const jiosaavnPlaylist = await jiosaavnService.getPlaylistAllSongs(jiosaavnPlaylistId);
    
    if (!jiosaavnPlaylist || !jiosaavnPlaylist.data) {
      return res.status(404).json({ message: 'JioSaavn playlist not found' });
    }
    
    const playlistData = jiosaavnPlaylist.data;
    let jiosaavnSongs = playlistData.songs || [];
    
    // If still only got 10 songs, try the search method as last resort
    const totalSongs = playlistData.songCount || playlistData.list_count || jiosaavnSongs.length;
    if (jiosaavnSongs.length < totalSongs && jiosaavnSongs.length <= 10) {
      console.log(`Attempting search method to get more songs...`);
      try {
        const searchSongs = await jiosaavnService.getPlaylistSongsBySearch(
          jiosaavnPlaylistId, 
          playlistData.name || name || 'playlist'
        );
        if (searchSongs.length > jiosaavnSongs.length) {
          jiosaavnSongs = searchSongs;
          console.log(`Search method improved results: ${jiosaavnSongs.length} songs`);
        }
      } catch (searchError) {
        console.warn('Search method failed:', searchError.message);
      }
    }
    
    console.log(`Final import: ${jiosaavnSongs.length} songs`);
    
    // Get user information from Firebase
    const userRecord = await admin.auth().getUser(userId);
    const db = admin.firestore();
    
    // Create the playlist
    const playlist = {
      _id: `playlist_${Date.now()}`,
      name: name || playlistData.name || 'Imported Playlist',
      description: description || playlistData.description || `Imported from JioSaavn`,
      isPublic: isPublic,
      songs: [],
      jiosaavnSource: {
        playlistId: jiosaavnPlaylistId,
        originalName: playlistData.name,
        importedAt: new Date(),
        totalSongs: jiosaavnSongs.length
      },
      imageUrl: playlistData.image || (playlistData.images && playlistData.images[2]?.url),
      createdAt: new Date(),
      createdBy: {
        uid: userRecord.uid,
        fullName: userRecord.displayName || 'User',
        imageUrl: userRecord.photoURL || 'https://via.placeholder.com/150',
      }
    };
    
    // Create playlist in Firestore
    const playlistsRef = db.collection('playlists');
    await playlistsRef.doc(playlist._id).set(playlist);
    
    // Store JioSaavn songs in a separate collection for reference
    const jiosaavnSongsRef = db.collection('jiosaavn_songs');
    const songIds = [];
    
    for (const song of jiosaavnSongs) {
      const songId = `jiosaavn_${song.id}`;
      songIds.push(songId);
      
      const songData = {
        _id: songId,
        jiosaavnId: song.id,
        title: song.name || song.title,
        artist: song.primaryArtists || song.artist,
        album: song.album?.name || song.album,
        duration: song.duration,
        imageUrl: song.image?.[2]?.url || song.image,
        streamUrl: song.downloadUrl?.[4]?.url || song.url,
        year: song.year,
        source: 'jiosaavn',
        importedAt: new Date()
      };
      
      // Use set with merge to avoid overwriting if song already exists
      await jiosaavnSongsRef.doc(songId).set(songData, { merge: true });
    }
    
    // Update playlist with song IDs
    await playlistsRef.doc(playlist._id).update({
      songs: songIds
    });
    
    playlist.songs = songIds;
    
    res.status(201).json({
      message: 'JioSaavn playlist imported successfully',
      playlist,
      importedSongsCount: songIds.length
    });
    
  } catch (error) {
    console.error('Import JioSaavn playlist error:', error);
    res.status(500).json({ 
      message: 'Error importing JioSaavn playlist', 
      error: error.message 
    });
  }
};

// Auto-populate playlist from JioSaavn based on category/query
export const autoPopulateFromJioSaavn = async (req, res) => {
  try {
    const playlistId = req.params.id;
    const { 
      searchQuery, 
      category, 
      maxSongs = 50, 
      batchSize = 10, 
      delayMs = 1000 
    } = req.body;
    
    // Check if playlist exists
    const db = admin.firestore();
    const playlistRef = db.collection('playlists').doc(playlistId);
    const playlistDoc = await playlistRef.get();
    
    if (!playlistDoc.exists) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    const playlist = playlistDoc.data();
    
    // Check if user is the owner
    if (playlist.createdBy.uid !== req.auth.uid) {
      return res.status(403).json({ message: 'You do not have permission to modify this playlist' });
    }
    
    // Import JioSaavn service
    const jiosaavnService = await import('../services/jiosaavn.service.js');
    
    // Determine search query
    let query = searchQuery;
    if (!query && category) {
      query = category;
    }
    if (!query) {
      // Extract from playlist name
      query = playlist.name;
    }
    
    // Search for songs on JioSaavn
    const searchResults = await jiosaavnService.searchSongs(query, maxSongs);
    
    if (!searchResults || !searchResults.data || !searchResults.data.results) {
      return res.status(404).json({ message: 'No songs found on JioSaavn' });
    }
    
    const jiosaavnSongs = searchResults.data.results.slice(0, maxSongs);
    
    // Store songs and collect IDs
    const jiosaavnSongsRef = db.collection('jiosaavn_songs');
    const songIds = [];
    const existingSongIds = new Set(playlist.songs || []);
    
    for (const song of jiosaavnSongs) {
      const songId = `jiosaavn_${song.id}`;
      
      // Skip if already in playlist
      if (existingSongIds.has(songId)) {
        continue;
      }
      
      songIds.push(songId);
      
      const songData = {
        _id: songId,
        jiosaavnId: song.id,
        title: song.name || song.title,
        artist: song.primaryArtists || song.artist,
        album: song.album?.name || song.album,
        duration: song.duration,
        imageUrl: song.image?.[2]?.url || song.image,
        streamUrl: song.downloadUrl?.[4]?.url || song.url,
        year: song.year,
        source: 'jiosaavn',
        importedAt: new Date()
      };
      
      await jiosaavnSongsRef.doc(songId).set(songData, { merge: true });
    }
    
    if (songIds.length === 0) {
      return res.status(200).json({ 
        message: 'No new songs to add',
        addedCount: 0,
        playlist
      });
    }
    
    // Add songs in batches
    const addedSongs = [];
    for (let i = 0; i < songIds.length; i += batchSize) {
      const batch = songIds.slice(i, i + batchSize);
      
      await playlistRef.update({
        songs: admin.firestore.FieldValue.arrayUnion(...batch)
      });
      
      addedSongs.push(...batch);
      
      // Delay between batches
      if (i + batchSize < songIds.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Get updated playlist
    const updatedPlaylistDoc = await playlistRef.get();
    const updatedPlaylist = updatedPlaylistDoc.data();
    
    res.status(200).json({
      message: 'Playlist auto-populated from JioSaavn successfully',
      addedCount: addedSongs.length,
      totalSongs: updatedPlaylist.songs.length,
      searchQuery: query,
      playlist: updatedPlaylist
    });
    
  } catch (error) {
    console.error('Auto-populate from JioSaavn error:', error);
    res.status(500).json({ 
      message: 'Error auto-populating from JioSaavn', 
      error: error.message 
    });
  }
};

// Get JioSaavn playlists by category for web
export const getJioSaavnPlaylistsByCategory = async (req, res) => {
  try {
    const { category, limit = 10 } = req.query;
    
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }
    
    // Import JioSaavn service
    const jiosaavnService = await import('../services/jiosaavn.service.js');
    
    // Search for playlists by category
    const searchResults = await jiosaavnService.searchPlaylists(category, parseInt(limit));
    
    res.status(200).json(searchResults);
    
  } catch (error) {
    console.error('Get JioSaavn playlists error:', error);
    res.status(500).json({ 
      message: 'Error fetching JioSaavn playlists', 
      error: error.message 
    });
  }
};

// Search JioSaavn playlists
export const searchJioSaavnPlaylists = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Import JioSaavn service
    const jiosaavnService = await import('../services/jiosaavn.service.js');
    
    // Search for playlists
    const searchResults = await jiosaavnService.searchPlaylists(query, parseInt(limit));
    
    res.status(200).json(searchResults);
    
  } catch (error) {
    console.error('Search JioSaavn playlists error:', error);
    res.status(500).json({ 
      message: 'Error searching JioSaavn playlists', 
      error: error.message 
    });
  }
};
