import admin from 'firebase-admin';

// This is a placeholder model that provides minimal compatibility
// with the MongoDB model while we transition to Firebase

// Create a reference to the users collection
const db = admin.firestore ? admin.firestore() : null;
const usersRef = db ? db.collection('users') : null;

// Export a placeholder model with compatible methods
export const User = {
  find: async (query = {}) => {
    // Return empty array for now
    console.log('Using placeholder User.find()', query);
    return {
      select: () => []
    };
  },
  
  findById: async (id) => {
    // Return null indicating user not found
    console.log('Using placeholder User.findById()', id);
    return null;
  },
  
  findOne: async (query = {}) => {
    // Return null indicating user not found
    console.log('Using placeholder User.findOne()', query);
    return null;
  },
  
  countDocuments: async () => {
    // Return 0 for now
    console.log('Using placeholder User.countDocuments()');
    return 0;
  },
  
  create: async (userData) => {
    // Log but don't actually create
    console.log('Using placeholder User.create()', userData);
    return { _id: 'placeholder-id', ...userData };
  }
};

export default User; 