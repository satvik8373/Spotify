/**
 * Migration Script: Initialize Mood Playlist Collections
 * 
 * This script creates the necessary Firestore collections for the AI Mood Playlist Generator feature.
 * Collections created:
 * - mood_playlist_cache: Stores cached playlist generations
 * - mood_playlist_rate_limits: Tracks user rate limits
 * - mood_playlist_analytics: Stores analytics events
 * - playlist_shares: Manages shareable playlist links
 * 
 * Run this script once to set up the database schema.
 */

import admin from '../config/firebase.js';

const db = admin.firestore();

async function initializeCollections() {
  console.log('Starting Firestore collections initialization...');

  try {
    // 1. Initialize mood_playlist_cache collection
    console.log('Creating mood_playlist_cache collection...');
    const cacheRef = db.collection('mood_playlist_cache');
    await cacheRef.doc('_init').set({
      _initialized: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Stores cached mood playlist generations with 24-hour TTL'
    });
    console.log('✓ mood_playlist_cache collection created');

    // 2. Initialize mood_playlist_rate_limits collection
    console.log('Creating mood_playlist_rate_limits collection...');
    const rateLimitRef = db.collection('mood_playlist_rate_limits');
    await rateLimitRef.doc('_init').set({
      _initialized: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Tracks user rate limits for mood playlist generation'
    });
    console.log('✓ mood_playlist_rate_limits collection created');

    // 3. Initialize mood_playlist_analytics collection
    console.log('Creating mood_playlist_analytics collection...');
    const analyticsRef = db.collection('mood_playlist_analytics');
    await analyticsRef.doc('_init').set({
      _initialized: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Stores analytics events for mood playlist feature'
    });
    console.log('✓ mood_playlist_analytics collection created');

    // 4. Initialize playlist_shares collection
    console.log('Creating playlist_shares collection...');
    const sharesRef = db.collection('playlist_shares');
    await sharesRef.doc('_init').set({
      _initialized: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Manages shareable playlist links'
    });
    console.log('✓ playlist_shares collection created');

    console.log('\n✅ All collections initialized successfully!');
    console.log('\nNext steps:');
    console.log('1. Deploy firestore.indexes.json to create indexes:');
    console.log('   firebase deploy --only firestore:indexes');
    console.log('2. Run the moodTags migration script to update existing songs');
    console.log('3. Verify indexes in Firebase Console');

  } catch (error) {
    console.error('❌ Error initializing collections:', error);
    throw error;
  }
}

// Run the migration
initializeCollections()
  .then(() => {
    console.log('\nMigration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
