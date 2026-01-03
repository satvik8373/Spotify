import admin from 'firebase-admin';

// This is a placeholder model that provides minimal compatibility
// with the MongoDB model while we transition to Firebase

// Create a reference to the songs collection
const db = admin.firestore ? admin.firestore() : null;
const songsRef = db ? db.collection('songs') : null;

// Export a placeholder model with compatible methods
export const Song = {
  find: async (query = {}) => {
    // Return empty array for now
    console.log('Using placeholder Song.find()', query);
    return [];
  },
  
  findById: async (id) => {
    // Return null indicating song not found
    console.log('Using placeholder Song.findById()', id);
    return null;
  },
  
  findOne: async (query = {}) => {
    // Return null indicating song not found
    console.log('Using placeholder Song.findOne()', query);
    return null;
  },
  
  countDocuments: async () => {
    // Return 0 for now
    console.log('Using placeholder Song.countDocuments()');
    return 0;
  },
  
  create: async (songData) => {
    // Log but don't actually create
    console.log('Using placeholder Song.create()', songData);
    return { _id: 'placeholder-id', ...songData };
  },
  
  aggregate: () => {
    // Return empty array for aggregation results
    console.log('Using placeholder Song.aggregate()');
    return {
      $unionWith: () => ({ $group: () => ({ $count: () => [] }) })
    };
  }
};

export default Song; 