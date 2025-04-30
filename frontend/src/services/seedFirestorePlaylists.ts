import { auth, db, storage } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { mockPlaylists } from '@/utils/mockData';
import { playlistsService } from './firestore';
import { FirestorePlaylist, FirestoreSong, songToFirestore } from '@/types/firebase';

/**
 * Seeds initial featured playlists in Firestore if they don't exist.
 * This should be called once during app initialization.
 */
export const seedFeaturedPlaylists = async (): Promise<void> => {
  try {
    console.log('Checking for existing featured playlists...');
    
    // Check if we already have featured playlists
    const featuredPlaylists = await playlistsService.getFeaturedPlaylists();
    
    if (featuredPlaylists.length > 0) {
      console.log(`Found ${featuredPlaylists.length} existing featured playlists. Skipping seed.`);
      return;
    }
    
    console.log('No featured playlists found. Seeding initial playlists...');
    
    // Use the mock playlists as seed data
    const featuredMockPlaylists = mockPlaylists.filter(playlist => playlist.featured);
    
    // Create demo user for playlists if none exists
    let userId = 'demo-user';
    let userName = 'Spotify Demo';
    let userImage = 'https://firebasestorage.googleapis.com/v0/b/spotify-8fefc.appspot.com/o/profile-images%2Fdefault-avatar.png?alt=media';
    
    // Use current user if available
    if (auth.currentUser) {
      userId = auth.currentUser.uid;
      userName = auth.currentUser.displayName || 'User';
      userImage = auth.currentUser.photoURL || userImage;
    }
    
    // Convert mock playlists to FirestorePlaylist format
    for (const mockPlaylist of featuredMockPlaylists) {
      // Convert songs to FirestoreSong format
      const firestoreSongs: FirestoreSong[] = mockPlaylist.songs.map(song => songToFirestore(song));
      
      // Create the playlist
      const playlistData = {
        name: mockPlaylist.name,
        description: mockPlaylist.description,
        imageUrl: mockPlaylist.imageUrl,
        isPublic: true,
        featured: true,
        songs: firestoreSongs,
        createdBy: {
          id: userId,
          clerkId: userId,
          fullName: userName,
          imageUrl: userImage
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await playlistsService.create(playlistData);
      console.log(`Created featured playlist: ${mockPlaylist.name}`);
    }
    
    console.log('Successfully seeded featured playlists!');
  } catch (error) {
    console.error('Error seeding featured playlists:', error);
  }
}; 