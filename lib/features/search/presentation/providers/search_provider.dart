import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/api_service.dart';
import '../../../player/domain/models/song_model.dart';
import '../../../playlist/domain/models/playlist_model.dart';
import '../../../album/domain/models/album_model.dart';

final searchQueryProvider = StateProvider<String>((ref) => '');

final searchResultsProvider = FutureProvider<SearchResults>((ref) async {
  final query = ref.watch(searchQueryProvider);
  
  if (query.isEmpty) {
    return SearchResults.empty();
  }
  
  // Debounce
  await Future.delayed(const Duration(milliseconds: 500));
  
  // Check if query changed during debounce
  if (ref.read(searchQueryProvider) != query) {
    throw Exception('Query changed');
  }
  
  final api = ref.read(apiServiceProvider);
  
  try {
    final response = await api.get(
      '/jiosaavn/search/songs',
      queryParameters: {'query': query, 'limit': 20},
    );
    
    final songs = _parseSaavnSongs(response.data);
    
    return SearchResults(
      songs: songs,
      albums: [],
      playlists: [],
    );
  } catch (e) {
    print('Search error: $e');
    return SearchResults.empty();
  }
});

List<SongModel> _parseSaavnSongs(dynamic responseData) {
  try {
    List<dynamic> results = [];
    
    if (responseData is Map) {
      if (responseData['data'] != null && responseData['data']['results'] != null) {
        results = responseData['data']['results'] as List<dynamic>;
      } else if (responseData['results'] != null) {
        results = responseData['results'] as List<dynamic>;
      }
    } else if (responseData is List) {
      results = responseData;
    }
    
    return results
        .where((item) => item['downloadUrl'] != null && (item['downloadUrl'] as List).isNotEmpty)
        .map((item) => _convertSaavnToSong(item))
        .toList();
  } catch (e) {
    print('Error parsing songs: $e');
    return [];
  }
}

SongModel _convertSaavnToSong(Map<String, dynamic> item) {
  // Get best quality audio URL
  String audioUrl = '';
  if (item['downloadUrl'] != null && item['downloadUrl'] is List) {
    final downloads = item['downloadUrl'] as List;
    final highQuality = downloads.firstWhere(
      (d) => d['quality'] == '320kbps',
      orElse: () => downloads.firstWhere(
        (d) => d['quality'] == '160kbps',
        orElse: () => downloads.isNotEmpty ? downloads.last : {'link': ''},
      ),
    );
    audioUrl = highQuality['link'] ?? '';
  }
  
  // Get best quality image
  String imageUrl = '';
  if (item['image'] != null) {
    if (item['image'] is List) {
      final images = item['image'] as List;
      final highQualityImg = images.firstWhere(
        (i) => i['quality'] == '500x500',
        orElse: () => images.firstWhere(
          (i) => i['quality'] == '150x150',
          orElse: () => images.isNotEmpty ? images.last : {'link': ''},
        ),
      );
      imageUrl = highQualityImg['link'] ?? '';
    } else if (item['image'] is String) {
      imageUrl = item['image'];
    }
  }
  
  // Get artist name
  String artist = '';
  if (item['primaryArtists'] != null) {
    artist = item['primaryArtists'];
  } else if (item['singers'] != null) {
    artist = item['singers'];
  } else if (item['artistMap'] != null && item['artistMap']['primary'] != null) {
    final primaryArtists = item['artistMap']['primary'] as List;
    artist = primaryArtists.map((a) => a['name'] ?? '').join(', ');
  }
  
  return SongModel(
    id: item['id'] ?? '',
    title: item['name'] ?? item['title'] ?? 'Unknown',
    artist: artist.isNotEmpty ? artist : 'Unknown Artist',
    album: item['album']?['name'] ?? item['album'] ?? '',
    imageUrl: imageUrl,
    audioUrl: audioUrl,
    duration: int.tryParse(item['duration']?.toString() ?? '0') ?? 0,
  );
}

final browseCategoriesProvider = FutureProvider<List<BrowseCategory>>((ref) async {
  return [
    BrowseCategory(id: '1', name: 'Pop', color: const Color(0xFF8D67AB), imageUrl: '', searchQuery: 'pop hits'),
    BrowseCategory(id: '2', name: 'Hip-Hop', color: const Color(0xFFBA5D07), imageUrl: '', searchQuery: 'hip hop'),
    BrowseCategory(id: '3', name: 'Rock', color: const Color(0xFFE61E32), imageUrl: '', searchQuery: 'rock music'),
    BrowseCategory(id: '4', name: 'Latin', color: const Color(0xFFE13300), imageUrl: '', searchQuery: 'latin music'),
    BrowseCategory(id: '5', name: 'Dance/Electronic', color: const Color(0xFFDC148C), imageUrl: '', searchQuery: 'edm'),
    BrowseCategory(id: '6', name: 'Indie', color: const Color(0xFF608108), imageUrl: '', searchQuery: 'indie music'),
    BrowseCategory(id: '7', name: 'R&B', color: const Color(0xFFDC148C), imageUrl: '', searchQuery: 'r&b'),
    BrowseCategory(id: '8', name: 'K-Pop', color: const Color(0xFF148A08), imageUrl: '', searchQuery: 'kpop'),
    BrowseCategory(id: '9', name: 'Bollywood', color: const Color(0xFFE1118B), imageUrl: '', searchQuery: 'bollywood'),
    BrowseCategory(id: '10', name: 'Punjabi', color: const Color(0xFF509BF5), imageUrl: '', searchQuery: 'punjabi songs'),
    BrowseCategory(id: '11', name: 'Chill', color: const Color(0xFF477D95), imageUrl: '', searchQuery: 'chill vibes'),
    BrowseCategory(id: '12', name: 'Workout', color: const Color(0xFF777777), imageUrl: '', searchQuery: 'workout music'),
    BrowseCategory(id: '13', name: 'Romantic', color: const Color(0xFFE91E63), imageUrl: '', searchQuery: 'romantic songs'),
    BrowseCategory(id: '14', name: 'Party', color: const Color(0xFF9C27B0), imageUrl: '', searchQuery: 'party songs'),
    BrowseCategory(id: '15', name: 'Devotional', color: const Color(0xFFFF9800), imageUrl: '', searchQuery: 'devotional'),
    BrowseCategory(id: '16', name: 'Sad Songs', color: const Color(0xFF607D8B), imageUrl: '', searchQuery: 'sad songs'),
  ];
});

class SearchResults {
  final List<SongModel> songs;
  final List<AlbumModel> albums;
  final List<PlaylistModel> playlists;
  
  SearchResults({
    required this.songs,
    required this.albums,
    required this.playlists,
  });
  
  factory SearchResults.empty() {
    return SearchResults(songs: [], albums: [], playlists: []);
  }
}

class BrowseCategory {
  final String id;
  final String name;
  final Color color;
  final String imageUrl;
  final String searchQuery;
  
  BrowseCategory({
    required this.id,
    required this.name,
    required this.color,
    required this.imageUrl,
    required this.searchQuery,
  });
}
