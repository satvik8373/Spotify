import admin from 'firebase-admin';

// This is a placeholder model that provides minimal compatibility
// with the MongoDB model while we transition to Firebase

// Create a reference to the likedSongs collection
const db = admin.firestore ? admin.firestore() : null;
const likedSongsRef = db ? db.collection('likedSongs') : null;

// Export a placeholder model with compatible methods
export const LikedSong = {
  find: async (query = {}) => {
    // Return empty array for now
    console.log('Using placeholder LikedSong.find()', query);
    return [];
  },
  
  findById: async (id) => {
    // Return null indicating song not found
    console.log('Using placeholder LikedSong.findById()', id);
    return null;
  },
  
  findOne: async (query = {}) => {
    // Return null indicating song not found
    console.log('Using placeholder LikedSong.findOne()', query);
    return null;
  },
  
  create: async (likedSongData) => {
    // Log but don't actually create
    console.log('Using placeholder LikedSong.create()', likedSongData);
    return { _id: 'placeholder-id', ...likedSongData };
  },
  
  deleteOne: async (query = {}) => {
    // Log but don't actually delete
    console.log('Using placeholder LikedSong.deleteOne()', query);
    return { deletedCount: 1 };
  }
};

export default LikedSong; 