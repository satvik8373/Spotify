#!/usr/bin/env node

import crypto from 'crypto';
import admin from '../backend/src/config/firebase.js';

const db = admin.firestore();
const WRITE = process.argv.includes('--write');
const DELETE_LEGACY = process.argv.includes('--delete-legacy');
const BATCH_SIZE = 400;

const stats = {
  legacyLikedSongDocs: 0,
  likedSongsMigrated: 0,
  legacyLikedSongDocsDeleted: 0,
  playlistsChecked: 0,
  playlistsUpdated: 0,
  cacheDocsChecked: 0,
  cacheDocsMoved: 0,
};

class BatchWriter {
  constructor(enabled) {
    this.enabled = enabled;
    this.batch = db.batch();
    this.pending = 0;
  }

  async set(ref, data, options) {
    if (!this.enabled) return;
    this.batch.set(ref, data, options);
    await this.bump();
  }

  async update(ref, data) {
    if (!this.enabled) return;
    this.batch.update(ref, data);
    await this.bump();
  }

  async delete(ref) {
    if (!this.enabled) return;
    this.batch.delete(ref);
    await this.bump();
  }

  async bump() {
    this.pending += 1;
    if (this.pending >= BATCH_SIZE) {
      await this.flush();
    }
  }

  async flush() {
    if (!this.enabled || this.pending === 0) return;
    await this.batch.commit();
    this.batch = db.batch();
    this.pending = 0;
  }
}

const writer = new BatchWriter(WRITE);

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeForDedupe(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, ' ');
}

function cleanObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeDocId(value) {
  const docId = normalizeText(value).replace(/\//g, '_');
  return docId || hash(String(Date.now()));
}

function toTimestamp(value) {
  if (!value) return admin.firestore.FieldValue.serverTimestamp();
  if (typeof value?.toDate === 'function') return value;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? admin.firestore.FieldValue.serverTimestamp()
      : admin.firestore.Timestamp.fromDate(value);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? admin.firestore.FieldValue.serverTimestamp()
      : admin.firestore.Timestamp.fromDate(date);
  }
  if (typeof value === 'object') {
    const seconds = typeof value.seconds === 'number' ? value.seconds : value._seconds;
    if (typeof seconds === 'number') {
      return admin.firestore.Timestamp.fromMillis(seconds * 1000);
    }
  }
  return admin.firestore.FieldValue.serverTimestamp();
}

function buildLikedSongDocument(song) {
  const title = normalizeText(song.title || song.name);
  const artist = normalizeText(song.artist || song.artists);
  const normalizedTitle = normalizeForDedupe(title);
  const normalizedArtist = normalizeForDedupe(artist);
  const dedupeKey = `${normalizedTitle}|${normalizedArtist}`;
  const source = normalizeText(song.source) || 'mavrixfy';
  const likedAt = toTimestamp(song.likedAt || song.addedAt || song.createdAt || song.updatedAt);

  return cleanObject({
    id: normalizeText(song.id || song._id || song.songId || song.trackId || song.spotifyId),
    title,
    normalizedTitle,
    titleLower: normalizedTitle,
    artist,
    normalizedArtist,
    artistLower: normalizedArtist,
    albumName: normalizeText(song.albumName || song.album),
    albumId: song.albumId || null,
    imageUrl: normalizeText(song.imageUrl || song.coverUrl || song.image),
    audioUrl: normalizeText(song.audioUrl || song.url || song.previewUrl),
    duration: typeof song.duration === 'number' ? song.duration : 0,
    year: normalizeText(song.year),
    source,
    spotifyId: song.spotifyId,
    spotifyUrl: song.spotifyUrl,
    trackId: song.trackId,
    dedupeKey,
    likedAt,
    createdAt: likedAt,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    migratedFrom: 'legacy_root_likedSongs',
  });
}

async function migrateLegacyLikedSongs() {
  const legacySnapshot = await db.collection('likedSongs').get();

  for (const legacyDoc of legacySnapshot.docs) {
    const userId = legacyDoc.id;
    const songs = legacyDoc.data()?.songs;
    if (!Array.isArray(songs) || songs.length === 0) continue;

    stats.legacyLikedSongDocs += 1;

    for (const song of songs) {
      const title = normalizeText(song.title || song.name);
      const artist = normalizeText(song.artist || song.artists);
      if (!title || !artist) continue;

      const normalizedTitle = normalizeForDedupe(title);
      const normalizedArtist = normalizeForDedupe(artist);
      const fallbackId = hash(`${normalizedTitle}|${normalizedArtist}`);
      const songId = safeDocId(song.id || song._id || song.songId || song.trackId || song.spotifyId || fallbackId);
      const targetRef = db.collection('users').doc(userId).collection('likedSongs').doc(songId);

      await writer.set(targetRef, {
        ...buildLikedSongDocument(song),
        id: normalizeText(song.id || song._id || song.songId || song.trackId || song.spotifyId || songId),
      }, { merge: true });
      stats.likedSongsMigrated += 1;
    }

    if (DELETE_LEGACY) {
      await writer.delete(legacyDoc.ref);
      stats.legacyLikedSongDocsDeleted += 1;
    }
  }
}

async function normalizePlaylists() {
  const snapshot = await db.collection('playlists').get();

  for (const playlistDoc of snapshot.docs) {
    stats.playlistsChecked += 1;
    const data = playlistDoc.data();
    const createdBy = data.createdBy || {};
    const ownerId = createdBy.uid || createdBy.id || createdBy._id;
    const songs = Array.isArray(data.songs) ? data.songs : [];
    const updates = {};

    if (ownerId) {
      updates.createdBy = {
        ...createdBy,
        id: createdBy.id || ownerId,
        _id: createdBy._id || ownerId,
        uid: createdBy.uid || ownerId,
        name: createdBy.name || createdBy.displayName || createdBy.fullName || 'Unknown User',
        fullName: createdBy.fullName || createdBy.displayName || createdBy.name || 'Unknown User',
        imageUrl: createdBy.imageUrl || createdBy.photoURL || '',
      };
    }

    if (data.songCount !== songs.length) updates.songCount = songs.length;
    if (data.schemaVersion !== 2) updates.schemaVersion = 2;
    if (!data.source) updates.source = data.moodGenerated ? 'mood_playlist_generator' : 'mavrixfy_web';
    if (!data.searchableName && data.name) updates.searchableName = normalizeForDedupe(data.name);
    if (!data.updatedAt) updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    if (Object.keys(updates).length > 0) {
      await writer.update(playlistDoc.ref, updates);
      stats.playlistsUpdated += 1;
    }
  }
}

async function normalizeMoodCache() {
  const snapshot = await db.collection('mood_playlist_cache').get();

  for (const cacheDoc of snapshot.docs) {
    stats.cacheDocsChecked += 1;
    const data = cacheDoc.data();
    const normalizedKey = normalizeForDedupe(data.cacheKey || data.moodText);
    if (!normalizedKey) continue;

    const targetId = hash(normalizedKey);
    if (cacheDoc.id === targetId) continue;

    await writer.set(db.collection('mood_playlist_cache').doc(targetId), {
      ...data,
      moodText: normalizedKey,
      cacheKey: normalizedKey,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    if (DELETE_LEGACY) {
      await writer.delete(cacheDoc.ref);
    }

    stats.cacheDocsMoved += 1;
  }
}

async function main() {
  console.log(`[Firestore Maintenance] Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  if (!WRITE) {
    console.log('[Firestore Maintenance] Add --write to apply changes. Add --delete-legacy with --write after verifying migration.');
  }

  await migrateLegacyLikedSongs();
  await normalizePlaylists();
  await normalizeMoodCache();
  await writer.flush();

  console.table(stats);
}

main()
  .catch((error) => {
    console.error('[Firestore Maintenance] Failed:', error);
    process.exitCode = 1;
  });
