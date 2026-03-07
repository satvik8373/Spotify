import admin from 'firebase-admin';

// This is a placeholder model that provides minimal compatibility
// with the MongoDB model while we transition to Firebase

// Create a reference to the playlists collection
const db = admin.firestore ? admin.firestore() : null;
const playlistsRef = db ? db.collection('playlists') : null;

/**
 * Playlist Schema (Firestore)
 * 
 * @typedef {Object} Playlist
 * @property {string} _id - Playlist ID
 * @property {string} name - Playlist name
 * @property {string} description - Playlist description
 * @property {boolean} isPublic - Whether the playlist is public
 * @property {string[]} songs - Array of song IDs
 * @property {Object} createdBy - Creator information
 * @property {string} createdBy.uid - User ID
 * @property {string} createdBy.fullName - User's full name
 * @property {string} createdBy.imageUrl - User's profile image URL
 * @property {FirebaseFirestore.Timestamp} createdAt - Creation timestamp
 * @property {boolean} [moodGenerated] - Whether this playlist was generated from mood input
 * @property {string} [emotion] - Detected emotion (sadness|joy|anger|love|fear|surprise)
 * @property {string} [moodText] - Original mood text input from user
 * @property {FirebaseFirestore.Timestamp} [generatedAt] - Timestamp when mood playlist was generated
 */

// Export a placeholder model with compatible methods
export const Playlist = {
  find: async (query = {}) => {
    // Return empty array for now
    console.log('Using placeholder Playlist.find()', query);
    return {
      populate: () => ({
        populate: () => ({
          sort: () => []
        })
      })
    };
  },
  
  findById: async (id) => {
    // Return null indicating playlist not found
    console.log('Using placeholder Playlist.findById()', id);
    return {
      populate: () => ({
        populate: () => null
      })
    };
  },
  
  findOne: async (query = {}) => {
    // Return null indicating playlist not found
    console.log('Using placeholder Playlist.findOne()', query);
    return {
      populate: () => null
    };
  },
  
  findByIdAndUpdate: async (id, data, options) => {
    // Log but don't actually update
    console.log('Using placeholder Playlist.findByIdAndUpdate()', id, data, options);
    return {
      populate: () => ({
        populate: () => ({ ...data, _id: id })
      })
    };
  },
  
  create: async (playlistData) => {
    // Log but don't actually create
    console.log('Using placeholder Playlist.create()', playlistData);
    return { 
      _id: 'placeholder-id', 
      ...playlistData,
      save: async () => console.log('Using placeholder save method')
    };
  }
};

export default Playlist; 