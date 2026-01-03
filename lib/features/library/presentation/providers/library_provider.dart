import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/firestore_service.dart';

enum LibraryItemType { playlist, album, artist }

class LibraryItem {
  final String id;
  final String name;
  final String imageUrl;
  final String subtitle;
  final LibraryItemType type;
  final DateTime? addedAt;
  
  LibraryItem({
    required this.id,
    required this.name,
    required this.imageUrl,
    required this.subtitle,
    required this.type,
    this.addedAt,
  });
  
  factory LibraryItem.fromJson(Map<String, dynamic> json, LibraryItemType type) {
    return LibraryItem(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? json['title'] ?? '',
      imageUrl: json['imageUrl'] ?? json['image'] ?? '',
      subtitle: json['subtitle'] ?? json['description'] ?? '',
      type: type,
      addedAt: json['addedAt'] != null ? DateTime.parse(json['addedAt']) : null,
    );
  }
}

class LibraryNotifier extends StateNotifier<AsyncValue<List<LibraryItem>>> {
  final Ref _ref;
  
  LibraryNotifier(this._ref) : super(const AsyncValue.loading()) {
    loadLibrary();
  }
  
  FirestoreService get _firestore => _ref.read(firestoreServiceProvider);
  
  Future<void> loadLibrary() async {
    state = const AsyncValue.loading();
    
    try {
      // Load user playlists from Firestore
      final playlists = await _firestore.getUserPlaylists();
      
      final items = playlists.map((p) => LibraryItem(
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        subtitle: '${p.songCount} songs • ${p.ownerName ?? 'You'}',
        type: LibraryItemType.playlist,
        addedAt: p.createdAt,
      )).toList();
      
      // Sort by added date
      items.sort((a, b) {
        if (a.addedAt == null || b.addedAt == null) return 0;
        return b.addedAt!.compareTo(a.addedAt!);
      });
      
      state = AsyncValue.data(items);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
  
  Future<void> createPlaylist(String name) async {
    try {
      final newPlaylist = await _firestore.createPlaylist(name: name);
      
      if (newPlaylist != null) {
        final newItem = LibraryItem(
          id: newPlaylist.id,
          name: newPlaylist.name,
          imageUrl: newPlaylist.imageUrl,
          subtitle: '0 songs • You',
          type: LibraryItemType.playlist,
          addedAt: DateTime.now(),
        );
        
        state.whenData((items) {
          state = AsyncValue.data([newItem, ...items]);
        });
      }
    } catch (e) {
      print('Error creating playlist: $e');
    }
  }
  
  Future<void> deletePlaylist(String id) async {
    try {
      final success = await _firestore.deletePlaylist(id);
      
      if (success) {
        state.whenData((items) {
          state = AsyncValue.data(items.where((item) => item.id != id).toList());
        });
      }
    } catch (e) {
      print('Error deleting playlist: $e');
    }
  }
}

final libraryItemsProvider = StateNotifierProvider<LibraryNotifier, AsyncValue<List<LibraryItem>>>((ref) {
  return LibraryNotifier(ref);
});
