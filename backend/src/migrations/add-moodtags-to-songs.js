/**
 * Migration Script: Add moodTags Field to Songs Collection
 * 
 * This script adds an empty moodTags array field to all existing song documents
 * in the Firestore songs collection. The moodTags field will be used for
 * mood-based playlist generation.
 * 
 * Run this script once to update the existing songs schema.
 */

import admin from '../config/firebase.js';

const db = admin.firestore();

async function addMoodTagsToSongs() {
  console.log('Starting moodTags migration for songs collection...');

  try {
    const songsRef = db.collection('songs');
    
    // Get all songs
    console.log('Fetching all songs...');
    const snapshot = await songsRef.get();
    
    if (snapshot.empty) {
      console.log('No songs found in the collection.');
      return;
    }

    console.log(`Found ${snapshot.size} songs to update`);

    // Process songs in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;
    let totalUpdated = 0;

    for (const doc of snapshot.docs) {
      const songData = doc.data();
      
      // Only update if moodTags field doesn't exist
      if (!songData.hasOwnProperty('moodTags')) {
        batch.update(doc.ref, {
          moodTags: []
        });
        batchCount++;
        totalUpdated++;

        // Commit batch when it reaches the limit
        if (batchCount === batchSize) {
          console.log(`Committing batch of ${batchCount} updates...`);
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    // Commit any remaining updates
    if (batchCount > 0) {
      console.log(`Committing final batch of ${batchCount} updates...`);
      await batch.commit();
    }

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`Total songs updated: ${totalUpdated}`);
    console.log(`Total songs skipped (already had moodTags): ${snapshot.size - totalUpdated}`);

    console.log('\nNext steps:');
    console.log('1. Populate moodTags for songs based on genre and characteristics');
    console.log('2. Consider using ML or manual curation to add meaningful mood tags');
    console.log('3. Example mood tags: ["happy", "energetic", "calm", "melancholic", "romantic"]');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Run the migration
addMoodTagsToSongs()
  .then(() => {
    console.log('\nMigration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
