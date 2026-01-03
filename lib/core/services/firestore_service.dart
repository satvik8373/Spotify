import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';

import '../../features/player/domain/models/song_model.dart';
import '../../features/playlist/domain/models/playlist_model.dart';

final firestoreServiceProvider = Provider<FirestoreService>((ref) {
  return FirestoreService();
});

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Get current user ID
  String? get currentUserId => _auth.currentUser?.uid;

  // ==================== PLAYLISTS ====================

  // Get all public playlists
  Future<List<PlaylistModel>> getPublicPlaylists() async {
    try {
      final snapshot = await _db
          .collection('playlists')
          .where('isPublic', isEqualTo: true)
          .limit(20)
          .get();

      return snapshot.docs.map((doc) => _playlistFromFirestore(doc)).toList();
    } catch (e) {
      debugPrint('Error fetching public playlists: $e');
      try {
        final snapshot = await _db.collection('playlists').limit(50).get();
        final allPlaylists = snapshot.docs.map((doc) => _playlistFromFirestore(doc)).toList();
        return allPlaylists.where((p) => p.isPublic).toList();
      } catch (e2) {
        debugPrint('Error in fallback: $e2');
        return [];
      }
    }
  }

  // Get featured playlists
  Future<List<PlaylistModel>> getFeaturedPlaylists() async {
    try {
      final snapshot = await _db
          .collection('playlists')
          .where('featured', isEqualTo: true)
          .limit(10)
          .get();

      return snapshot.docs.map((doc) => _playlistFromFirestore(doc)).toList();
    } catch (e) {
      debugPrint('Error fetching featured playlists: $e');
      try {
        final snapshot = await _db.collection('playlists').limit(50).get();
        final allPlaylists = snapshot.docs.map((doc) => _playlistFromFirestore(doc)).toList();
        return allPlaylists.where((p) => p.isPublic).take(10).toList();
      } catch (e2) {
        debugPrint('Error in featured fallback: $e2');
        return [];
      }
    }
  }

  // Get user's playlists
  Future<List<PlaylistModel>> getUserPlaylists() async {
    final userId = currentUserId;
    if (userId == null) return [];

    try {
      final snapshot = await _db
          .collection('playlists')
          .where('createdBy.id', isEqualTo: userId)
          .limit(50)
          .get();

      return snapshot.docs.map((doc) => _playlistFromFirestore(doc)).toList();
    } catch (e) {
      debugPrint('Error fetching user playlists: $e');
      try {
        final snapshot = await _db
            .collection('playlists')
            .where('createdBy.uid', isEqualTo: userId)
            .limit(50)
            .get();
        return snapshot.docs.map((doc) => _playlistFromFirestore(doc)).toList();
      } catch (e2) {
        debugPrint('Error in fallback: $e2');
        return [];
      }
    }
  }

  // Get playlist by ID
  Future<PlaylistModel?> getPlaylistById(String playlistId) async {
    try {
      final doc = await _db.collection('playlists').doc(playlistId).get();
      if (!doc.exists) return null;
      return _playlistFromFirestore(doc);
    } catch (e) {
      debugPrint('Error fetching playlist: $e');
      return null;
    }
  }

  // Create playlist
  Future<PlaylistModel?> createPlaylist({
    required String name,
    String? description,
    bool isPublic = true,
  }) async {
    final user = _auth.currentUser;
    if (user == null) return null;

    try {
      final playlistData = {
        'name': name,
        'description': description ?? '',
        'imageUrl': '',
        'isPublic': isPublic,
        'featured': false,
        'songs': [],
        'createdBy': {
          'id': user.uid,
          'uid': user.uid,
          'fullName': user.displayName ?? 'User',
          'imageUrl': user.photoURL ?? '',
        },
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

      final docRef = await _db.collection('playlists').add(playlistData);
      final doc = await docRef.get();
      return _playlistFromFirestore(doc);
    } catch (e) {
      debugPrint('Error creating playlist: $e');
      return null;
    }
  }

  // Add song to playlist
  Future<bool> addSongToPlaylist(String playlistId, SongModel song) async {
    try {
      final songData = {
        'id': song.id,
        'title': song.title,
        'artist': song.artist,
        'album': song.album,
        'imageUrl': song.imageUrl,
        'audioUrl': song.audioUrl,
        'duration': song.duration,
        'source': song.source,
      };

      await _db.collection('playlists').doc(playlistId).update({
        'songs': FieldValue.arrayUnion([songData]),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      debugPrint('Error adding song to playlist: $e');
      return false;
    }
  }

  // Remove song from playlist
  Future<bool> removeSongFromPlaylist(String playlistId, String songId) async {
    try {
      final doc = await _db.collection('playlists').doc(playlistId).get();
      if (!doc.exists) return false;

      final data = doc.data()!;
      final songs = List<Map<String, dynamic>>.from(data['songs'] ?? []);
      songs.removeWhere((s) => s['id'] == songId);

      await _db.collection('playlists').doc(playlistId).update({
        'songs': songs,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      debugPrint('Error removing song from playlist: $e');
      return false;
    }
  }

  // Delete playlist
  Future<bool> deletePlaylist(String playlistId) async {
    try {
      await _db.collection('playlists').doc(playlistId).delete();
      return true;
    } catch (e) {
      debugPrint('Error deleting playlist: $e');
      return false;
    }
  }

  // ==================== LIKED SONGS (Subcollection) ====================

  // Get liked songs from subcollection
  Future<List<SongModel>> getLikedSongs() async {
    final userId = currentUserId;
    if (userId == null) return [];

    try {
      QuerySnapshot snapshot;
      try {
        snapshot = await _db
            .collection('users')
            .doc(userId)
            .collection('likedSongs')
            .orderBy('likedAt', descending: true)
            .get();
      } catch (orderError) {
        snapshot = await _db
            .collection('users')
            .doc(userId)
            .collection('likedSongs')
            .get();
      }
      
      final songs = <SongModel>[];
      for (final doc in snapshot.docs) {
        final data = doc.data() as Map<String, dynamic>;
        
        final audioUrl = data['audioUrl'] ?? data['url'] ?? '';
        if (audioUrl.isEmpty) continue;
        
        int songDuration = 0;
        final durationValue = data['duration'];
        if (durationValue != null) {
          if (durationValue is int) {
            songDuration = durationValue;
          } else if (durationValue is double) {
            songDuration = durationValue.toInt();
          } else if (durationValue is String) {
            songDuration = int.tryParse(durationValue) ?? 0;
          }
        }
        
        songs.add(SongModel(
          id: data['id']?.toString() ?? data['songId']?.toString() ?? doc.id,
          title: data['title']?.toString() ?? 'Unknown',
          artist: data['artist']?.toString() ?? 'Unknown Artist',
          album: data['albumName']?.toString() ?? data['album']?.toString() ?? '',
          imageUrl: data['imageUrl']?.toString() ?? data['image']?.toString() ?? '',
          audioUrl: audioUrl,
          duration: songDuration,
          source: data['source']?.toString() ?? 'firestore',
        ));
      }
      
      return songs;
    } catch (e) {
      debugPrint('Error fetching liked songs: $e');
      return [];
    }
  }

  // Like a song
  Future<bool> likeSong(SongModel song) async {
    final userId = currentUserId;
    if (userId == null) return false;

    try {
      await _db
          .collection('users')
          .doc(userId)
          .collection('likedSongs')
          .doc(song.id)
          .set({
        'id': song.id,
        'songId': song.id,
        'title': song.title,
        'artist': song.artist,
        'albumName': song.album,
        'imageUrl': song.imageUrl,
        'audioUrl': song.audioUrl,
        'duration': song.duration,
        'source': 'mavrixfy',
        'likedAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      debugPrint('Error liking song: $e');
      return false;
    }
  }

  // Unlike a song
  Future<bool> unlikeSong(String songId) async {
    final userId = currentUserId;
    if (userId == null) return false;

    try {
      await _db
          .collection('users')
          .doc(userId)
          .collection('likedSongs')
          .doc(songId)
          .delete();
      return true;
    } catch (e) {
      debugPrint('Error unliking song: $e');
      return false;
    }
  }

  // Check if song is liked
  Future<bool> isSongLiked(String songId) async {
    final userId = currentUserId;
    if (userId == null) return false;

    try {
      final doc = await _db
          .collection('users')
          .doc(userId)
          .collection('likedSongs')
          .doc(songId)
          .get();
      return doc.exists;
    } catch (e) {
      debugPrint('Error checking if song is liked: $e');
      return false;
    }
  }

  // ==================== HELPERS ====================

  PlaylistModel _playlistFromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    final createdBy = data['createdBy'] as Map<String, dynamic>?;
    
    List<SongModel>? songs;
    try {
      final songsData = data['songs'] as List<dynamic>?;
      if (songsData != null) {
        songs = songsData
            .where((s) => s is Map<String, dynamic>)
            .map((s) => _songFromMap(s as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      songs = [];
    }

    return PlaylistModel(
      id: doc.id,
      name: data['name']?.toString() ?? '',
      description: data['description']?.toString(),
      imageUrl: data['imageUrl']?.toString() ?? _generatePlaylistImage(songs),
      ownerId: createdBy?['id']?.toString() ?? createdBy?['uid']?.toString() ?? '',
      ownerName: createdBy?['fullName']?.toString() ?? 'Unknown',
      songCount: songs?.length ?? 0,
      songs: songs,
      isPublic: data['isPublic'] == true,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
    );
  }

  SongModel _songFromMap(Map<String, dynamic> data) {
    int duration = 0;
    if (data['duration'] != null) {
      try {
        if (data['duration'] is int) {
          duration = data['duration'];
        } else if (data['duration'] is double) {
          final d = data['duration'] as double;
          if (d.isFinite) duration = d.toInt();
        } else if (data['duration'] is String) {
          duration = int.tryParse(data['duration']) ?? 0;
        }
      } catch (e) {
        duration = 0;
      }
    }
    
    return SongModel(
      id: data['id']?.toString() ?? '',
      title: data['title']?.toString() ?? 'Unknown',
      artist: data['artist']?.toString() ?? 'Unknown Artist',
      album: data['album']?.toString() ?? data['albumName']?.toString() ?? '',
      imageUrl: data['imageUrl']?.toString() ?? '',
      audioUrl: data['audioUrl']?.toString() ?? '',
      duration: duration,
      source: data['source']?.toString() ?? 'firestore',
    );
  }

  String _generatePlaylistImage(List<SongModel>? songs) {
    if (songs != null && songs.isNotEmpty) {
      return songs.first.imageUrl;
    }
    return '';
  }
}
