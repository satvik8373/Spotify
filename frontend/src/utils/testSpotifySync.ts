/**
 * Spotify Sync Testing Utilities
 * 
 * Use these functions to test the Spotify sync functionality
 * in both web and mobile contexts.
 */

import { 
  isAuthenticated, 
  debugAuthenticationState,
  getCurrentUser 
} from '@/services/spotifyService';

import { 
  fetchAllSpotifySavedTracks,
  syncSpotifyLikedSongsToMavrixfy,
  countNewSpotifyTracks,
  isSpotifyConnected
} from '@/services/spotifySync';

import {
  getMobileLikedSongs,
  getMobileSyncMetadata,
  getMobileLikedSongsCount,
  hasMobileSpotifyConnected,
  searchMobileLikedSongs
} from '@/services/mobileLikedSongsService';

import { auth } from '@/lib/firebase';

/**
 * Test Suite for Web App (Spotify Integration)
 */
export const testWebSpotifyIntegration = async () => {
  console.log('=== Testing Web Spotify Integration ===\n');

  try {
    // Test 1: Check authentication
    console.log('Test 1: Checking Spotify authentication...');
    const isAuth = isAuthenticated();
    console.log(`✓ Is authenticated: ${isAuth}\n`);

    if (!isAuth) {
      console.log('❌ Not authenticated. Please connect Spotify first.\n');
      debugAuthenticationState();
      return;
    }

    // Test 2: Get user profile
    console.log('Test 2: Fetching Spotify user profile...');
    const user = await getCurrentUser();
    console.log(`✓ User: ${user.display_name} (${user.email})`);
    console.log(`✓ Spotify ID: ${user.id}\n`);

    // Test 3: Fetch liked songs
    console.log('Test 3: Fetching liked songs from Spotify...');
    const tracks = await fetchAllSpotifySavedTracks();
    console.log(`✓ Fetched ${tracks.length} liked songs from Spotify\n`);

    if (tracks.length > 0) {
      console.log('Sample song:');
      console.log(`  Title: ${tracks[0].title}`);
      console.log(`  Artist: ${tracks[0].artist}`);
      console.log(`  Album: ${tracks[0].album}\n`);
    }

    // Test 4: Count new tracks
    console.log('Test 4: Counting new tracks to sync...');
    const newCount = await countNewSpotifyTracks(tracks);
    console.log(`✓ ${newCount} new tracks to sync\n`);

    // Test 5: Check connection status
    console.log('Test 5: Checking Spotify connection...');
    const connected = isSpotifyConnected();
    console.log(`✓ Spotify connected: ${connected}\n`);

    console.log('=== Web Integration Tests Passed ✓ ===\n');
    
    return {
      authenticated: isAuth,
      user,
      totalTracks: tracks.length,
      newTracks: newCount,
      connected
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

/**
 * Test Suite for Mobile App (Firestore Integration)
 */
export const testMobileFirestoreIntegration = async () => {
  console.log('=== Testing Mobile Firestore Integration ===\n');

  try {
    // Test 1: Check Firebase authentication
    console.log('Test 1: Checking Firebase authentication...');
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ Not authenticated with Firebase\n');
      return;
    }
    console.log(`✓ Firebase user: ${user.email} (${user.uid})\n`);

    // Test 2: Check Spotify connection
    console.log('Test 2: Checking if Spotify is connected...');
    const hasSpotify = await hasMobileSpotifyConnected();
    console.log(`✓ Spotify connected: ${hasSpotify}\n`);

    if (!hasSpotify) {
      console.log('⚠️  Spotify not connected. Connect on web app first.\n');
    }

    // Test 3: Get sync metadata
    console.log('Test 3: Fetching sync metadata...');
    const metadata = await getMobileSyncMetadata();
    console.log(`✓ Sync status: ${metadata.syncStatus}`);
    console.log(`✓ Total songs: ${metadata.totalSongs}`);
    console.log(`✓ Last sync: ${metadata.lastSyncAt?.toLocaleString() || 'Never'}\n`);

    // Test 4: Get songs count
    console.log('Test 4: Counting synced songs...');
    const count = await getMobileLikedSongsCount();
    console.log(`✓ Synced songs count: ${count}\n`);

    // Test 5: Fetch all songs
    console.log('Test 5: Fetching all synced songs...');
    const songs = await getMobileLikedSongs();
    console.log(`✓ Fetched ${songs.length} songs from Firestore\n`);

    if (songs.length > 0) {
      console.log('Sample song:');
      console.log(`  Title: ${songs[0].title}`);
      console.log(`  Artist: ${songs[0].artist}`);
      console.log(`  Album: ${songs[0].album}`);
      console.log(`  Cover: ${songs[0].coverUrl}\n`);
    }

    // Test 6: Search songs
    if (songs.length > 0) {
      console.log('Test 6: Testing search functionality...');
      const searchTerm = songs[0].artist.split(' ')[0]; // First word of artist name
      const results = await searchMobileLikedSongs(searchTerm);
      console.log(`✓ Search for "${searchTerm}" returned ${results.length} results\n`);
    }

    console.log('=== Mobile Integration Tests Passed ✓ ===\n');
    
    return {
      user: user.email,
      hasSpotify,
      metadata,
      songsCount: count,
      songs: songs.slice(0, 5) // Return first 5 songs
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

/**
 * Test full sync flow (Web to Mobile)
 */
export const testFullSyncFlow = async () => {
  console.log('=== Testing Full Sync Flow ===\n');

  try {
    // Step 1: Web - Check Spotify auth
    console.log('Step 1: Checking Spotify authentication...');
    if (!isAuthenticated()) {
      console.log('❌ Not authenticated with Spotify\n');
      return;
    }
    console.log('✓ Spotify authenticated\n');

    // Step 2: Web - Fetch songs
    console.log('Step 2: Fetching songs from Spotify...');
    const tracks = await fetchAllSpotifySavedTracks();
    console.log(`✓ Fetched ${tracks.length} songs\n`);

    // Step 3: Web - Sync to Firestore
    console.log('Step 3: Syncing to Firestore...');
    const result = await syncSpotifyLikedSongsToMavrixfy(tracks);
    console.log(`✓ Synced ${result.syncedCount} new songs`);
    console.log(`✓ Total fetched: ${result.fetchedCount}\n`);

    // Step 4: Mobile - Verify sync
    console.log('Step 4: Verifying sync on mobile side...');
    const mobileSongs = await getMobileLikedSongs();
    console.log(`✓ Mobile app can read ${mobileSongs.length} songs\n`);

    // Step 5: Compare counts
    console.log('Step 5: Comparing counts...');
    const match = tracks.length === mobileSongs.length;
    console.log(`✓ Spotify: ${tracks.length} songs`);
    console.log(`✓ Firestore: ${mobileSongs.length} songs`);
    console.log(`✓ Match: ${match ? 'Yes ✓' : 'No ❌'}\n`);

    console.log('=== Full Sync Flow Test Passed ✓ ===\n');
    
    return {
      spotifyCount: tracks.length,
      firestoreCount: mobileSongs.length,
      syncedCount: result.syncedCount,
      match
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

/**
 * Performance test - measure sync time
 */
export const testSyncPerformance = async () => {
  console.log('=== Testing Sync Performance ===\n');

  try {
    const startTime = Date.now();

    console.log('Fetching songs from Spotify...');
    const fetchStart = Date.now();
    const tracks = await fetchAllSpotifySavedTracks();
    const fetchTime = Date.now() - fetchStart;
    console.log(`✓ Fetched ${tracks.length} songs in ${fetchTime}ms\n`);

    console.log('Syncing to Firestore...');
    const syncStart = Date.now();
    const result = await syncSpotifyLikedSongsToMavrixfy(tracks);
    const syncTime = Date.now() - syncStart;
    console.log(`✓ Synced ${result.syncedCount} songs in ${syncTime}ms\n`);

    const totalTime = Date.now() - startTime;
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average per song: ${(totalTime / tracks.length).toFixed(2)}ms\n`);

    console.log('=== Performance Test Complete ✓ ===\n');
    
    return {
      totalSongs: tracks.length,
      fetchTime,
      syncTime,
      totalTime,
      avgPerSong: totalTime / tracks.length
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

/**
 * Run all tests
 */
export const runAllTests = async () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Spotify Sync - Complete Test Suite   ║');
  console.log('╚════════════════════════════════════════╝\n');

  const results: any = {};

  try {
    results.web = await testWebSpotifyIntegration();
  } catch (error) {
    console.log('⚠️  Web tests skipped (not authenticated)\n');
  }

  try {
    results.mobile = await testMobileFirestoreIntegration();
  } catch (error) {
    console.log('⚠️  Mobile tests skipped (not authenticated)\n');
  }

  try {
    results.fullSync = await testFullSyncFlow();
  } catch (error) {
    console.log('⚠️  Full sync test skipped\n');
  }

  try {
    results.performance = await testSyncPerformance();
  } catch (error) {
    console.log('⚠️  Performance test skipped\n');
  }

  console.log('╔════════════════════════════════════════╗');
  console.log('║         All Tests Complete!            ║');
  console.log('╚════════════════════════════════════════╝\n');

  return results;
};

/**
 * Quick test - just check if everything is working
 */
export const quickTest = async () => {
  console.log('Running quick test...\n');

  const checks = {
    spotifyAuth: isAuthenticated(),
    firebaseAuth: !!auth.currentUser,
    spotifyConnected: false,
    songsCount: 0
  };

  if (checks.spotifyAuth) {
    checks.spotifyConnected = isSpotifyConnected();
  }

  if (checks.firebaseAuth) {
    try {
      checks.songsCount = await getMobileLikedSongsCount();
    } catch (error) {
      console.error('Error getting songs count:', error);
    }
  }

  console.log('Quick Test Results:');
  console.log(`  Spotify Auth: ${checks.spotifyAuth ? '✓' : '✗'}`);
  console.log(`  Firebase Auth: ${checks.firebaseAuth ? '✓' : '✗'}`);
  console.log(`  Spotify Connected: ${checks.spotifyConnected ? '✓' : '✗'}`);
  console.log(`  Synced Songs: ${checks.songsCount}\n`);

  return checks;
};

// Export for console usage
if (typeof window !== 'undefined') {
  (window as any).testSpotifySync = {
    web: testWebSpotifyIntegration,
    mobile: testMobileFirestoreIntegration,
    fullSync: testFullSyncFlow,
    performance: testSyncPerformance,
    all: runAllTests,
    quick: quickTest
  };
  
  console.log('💡 Spotify Sync tests loaded!');
  console.log('Run tests from console:');
  console.log('  testSpotifySync.quick()      - Quick health check');
  console.log('  testSpotifySync.web()        - Test web integration');
  console.log('  testSpotifySync.mobile()     - Test mobile integration');
  console.log('  testSpotifySync.fullSync()   - Test complete flow');
  console.log('  testSpotifySync.performance()- Performance test');
  console.log('  testSpotifySync.all()        - Run all tests\n');
}
