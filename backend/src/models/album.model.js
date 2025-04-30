import admin from 'firebase-admin';

// This is a placeholder model that provides minimal compatibility
// with the MongoDB model while we transition to Firebase

// Create a reference to the albums collection
const db = admin.firestore ? admin.firestore() : null;
const albumsRef = db ? db.collection('albums') : null;

// Export a placeholder model with compatible methods
export const Album = {
  find: async (query = {}) => {
    // Return empty array for now
    console.log('Using placeholder Album.find()', query);
    return [];
  },
  
  findById: async (id) => {
    // Return null indicating album not found
    console.log('Using placeholder Album.findById()', id);
    return null;
  },
  
  findOne: async (query = {}) => {
    // Return null indicating album not found
    console.log('Using placeholder Album.findOne()', query);
    return null;
  },
  
  countDocuments: async () => {
    // Return 0 for now
    console.log('Using placeholder Album.countDocuments()');
    return 0;
  },
  
  create: async (albumData) => {
    // Log but don't actually create
    console.log('Using placeholder Album.create()', albumData);
    return { _id: 'placeholder-id', ...albumData };
  }
};

export default Album; 