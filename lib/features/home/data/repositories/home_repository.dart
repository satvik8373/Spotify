import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter/foundation.dart';
import 'dart:convert';

import '../../../../core/services/api_service.dart';
import '../../../../core/services/firestore_service.dart';
import '../../../player/domain/models/song_model.dart';
import '../../../playlist/domain/models/playlist_model.dart';
import '../../domain/models/home_data.dart';

class HomeRepository {
  final Ref _ref;
  static const _cacheExpiry = Duration(minutes: 15);
  
  HomeRepository(this._ref);
  
  ApiService get _api => _ref.read(apiServiceProvider);
  FirestoreService get _firestore => _ref.read(firestoreServiceProvider);
  Box get _cache => Hive.box('cache');
  
  bool _isCacheValid(String key) {
    final timestamp = _cache.get('${key}_timestamp');
    if (timestamp == null) return false;
    final cachedTime = DateTime.fromMillisecondsSinceEpoch(timestamp);
    return DateTime.now().difference(cachedTime) < _cacheExpiry;
  }
  
  List<SongModel>? _getCachedSongs(String key) {
    if (!_isCacheValid(key)) return null;
    final cached = _cache.get(key);
    if (cached == null) return null;
    try {
      final List<dynamic> decoded = jsonDecode(cached);
      return decoded.map((e) => SongModel.fromJson(e)).toList();
    } catch (e) {
      return null;
    }
  }
  
  Future<void> _cacheSongs(String key, List<SongModel> songs) async {
    try {
      await _cache.put(key, jsonEncode(songs.map((s) => s.toJson()).toList()));
      await _cache.put('${key}_timestamp', DateTime.now().millisecondsSinceEpoch);
    } catch (e) {
      debugPrint('Cache error: $e');
    }
  }
  
  Future<HomeData> getHomeData() async {
    try {
      final results = await Future.wait([
        getPublicPlaylists(),
        getFeaturedPlaylists(),
        getTrending(),
        getNewReleases(),
        getBollywoodSongs(),
        getHollywoodSongs(),
        getHindiSongs(),
      ]);
      
      return HomeData(
        publicPlaylists: results[0] as List<PlaylistModel>,
        featuredPlaylists: results[1] as List<PlaylistModel>,
        trending: results[2] as List<SongModel>,
        newReleases: results[3] as List<SongModel>,
        bollywoodSongs: results[4] as List<SongModel>,
        hollywoodSongs: results[5] as List<SongModel>,
        hindiSongs: results[6] as List<SongModel>,
      );
    } catch (e) {
      debugPrint('Error fetching home data: $e');
      rethrow;
    }
  }
  
  Future<List<PlaylistModel>> getPublicPlaylists() async {
    try {
      return await _firestore.getPublicPlaylists();
    } catch (e) {
      debugPrint('Error fetching public playlists: $e');
      return [];
    }
  }
  
  Future<List<PlaylistModel>> getFeaturedPlaylists() async {
    try {
      return await _firestore.getFeaturedPlaylists();
    } catch (e) {
      debugPrint('Error fetching featured playlists: $e');
      return [];
    }
  }
  
  Future<List<SongModel>> getTrending() async {
    const cacheKey = 'trending_songs';
    final cached = _getCachedSongs(cacheKey);
    if (cached != null) return cached;
    
    try {
      final response = await _api.get('/jiosaavn/trending', queryParameters: {'limit': 15});
      final songs = _parseSaavnSongs(response.data);
      await _cacheSongs(cacheKey, songs);
      return songs;
    } catch (e) {
      debugPrint('Error fetching trending: $e');
      return [];
    }
  }
  
  Future<List<SongModel>> getNewReleases() async {
    const cacheKey = 'new_releases';
    final cached = _getCachedSongs(cacheKey);
    if (cached != null) return cached;
    
    try {
      final response = await _api.get('/jiosaavn/new-releases', queryParameters: {'limit': 15});
      final songs = _parseSaavnSongs(response.data);
      await _cacheSongs(cacheKey, songs);
      return songs;
    } catch (e) {
      debugPrint('Error fetching new releases: $e');
      return [];
    }
  }
  
  Future<List<SongModel>> getBollywoodSongs() async {
    const cacheKey = 'bollywood_songs';
    final cached = _getCachedSongs(cacheKey);
    if (cached != null) return cached;
    
    try {
      final response = await _api.get('/jiosaavn/search/songs', queryParameters: {'query': 'bollywood hits', 'limit': 15});
      final songs = _parseSaavnSongs(response.data);
      await _cacheSongs(cacheKey, songs);
      return songs;
    } catch (e) {
      debugPrint('Error fetching bollywood songs: $e');
      return [];
    }
  }
  
  Future<List<SongModel>> getHollywoodSongs() async {
    const cacheKey = 'hollywood_songs';
    final cached = _getCachedSongs(cacheKey);
    if (cached != null) return cached;
    
    try {
      final response = await _api.get('/jiosaavn/search/songs', queryParameters: {'query': 'english top hits', 'limit': 15});
      final songs = _parseSaavnSongs(response.data);
      await _cacheSongs(cacheKey, songs);
      return songs;
    } catch (e) {
      debugPrint('Error fetching hollywood songs: $e');
      return [];
    }
  }
  
  Future<List<SongModel>> getHindiSongs() async {
    const cacheKey = 'hindi_songs';
    final cached = _getCachedSongs(cacheKey);
    if (cached != null) return cached;
    
    try {
      final response = await _api.get('/jiosaavn/search/songs', queryParameters: {'query': 'hindi top songs', 'limit': 15});
      final songs = _parseSaavnSongs(response.data);
      await _cacheSongs(cacheKey, songs);
      return songs;
    } catch (e) {
      debugPrint('Error fetching hindi songs: $e');
      return [];
    }
  }
  
  Future<List<SongModel>> searchSongs(String query) async {
    try {
      final response = await _api.get('/jiosaavn/search/songs', queryParameters: {'query': query, 'limit': 30});
      return _parseSaavnSongs(response.data);
    } catch (e) {
      debugPrint('Error searching songs: $e');
      return [];
    }
  }
  
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
          .map((item) => _convertSaavnToSong(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('Error parsing songs: $e');
      return [];
    }
  }
  
  SongModel _convertSaavnToSong(Map<String, dynamic> item) {
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
      source: 'jiosaavn',
    );
  }
}
