import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/firestore_service.dart';
import '../../domain/models/playlist_model.dart';
import '../../../player/domain/models/song_model.dart';

final playlistDetailProvider = FutureProvider.family<PlaylistModel, String>((ref, playlistId) async {
  final firestore = ref.read(firestoreServiceProvider);
  
  try {
    final playlist = await firestore.getPlaylistById(playlistId);
    if (playlist == null) {
      throw Exception('Playlist not found');
    }
    return playlist;
  } catch (e) {
    rethrow;
  }
});

final userPlaylistsProvider = FutureProvider<List<PlaylistModel>>((ref) async {
  final firestore = ref.read(firestoreServiceProvider);
  
  try {
    return await firestore.getUserPlaylists();
  } catch (e) {
    return [];
  }
});

class PlaylistActionsNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  
  PlaylistActionsNotifier(this._ref) : super(const AsyncValue.data(null));
  
  FirestoreService get _firestore => _ref.read(firestoreServiceProvider);
  
  Future<void> addSongToPlaylist(String playlistId, SongModel song) async {
    state = const AsyncValue.loading();
    
    try {
      await _firestore.addSongToPlaylist(playlistId, song);
      state = const AsyncValue.data(null);
      
      // Invalidate playlist detail to refresh
      _ref.invalidate(playlistDetailProvider(playlistId));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
  
  Future<void> removeSongFromPlaylist(String playlistId, String songId) async {
    state = const AsyncValue.loading();
    
    try {
      await _firestore.removeSongFromPlaylist(playlistId, songId);
      state = const AsyncValue.data(null);
      
      _ref.invalidate(playlistDetailProvider(playlistId));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
  
  Future<PlaylistModel?> createPlaylist(String name, {String? description}) async {
    state = const AsyncValue.loading();
    
    try {
      final playlist = await _firestore.createPlaylist(
        name: name,
        description: description,
      );
      state = const AsyncValue.data(null);
      
      _ref.invalidate(userPlaylistsProvider);
      
      return playlist;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return null;
    }
  }
  
  Future<void> deletePlaylist(String playlistId) async {
    state = const AsyncValue.loading();
    
    try {
      await _firestore.deletePlaylist(playlistId);
      state = const AsyncValue.data(null);
      
      _ref.invalidate(userPlaylistsProvider);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final playlistActionsProvider = StateNotifierProvider<PlaylistActionsNotifier, AsyncValue<void>>((ref) {
  return PlaylistActionsNotifier(ref);
});
