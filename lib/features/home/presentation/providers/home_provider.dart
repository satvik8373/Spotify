import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/models/home_data.dart';
import '../../data/repositories/home_repository.dart';
import '../../../playlist/domain/models/playlist_model.dart';
import '../../../player/domain/models/song_model.dart';

final homeRepositoryProvider = Provider<HomeRepository>((ref) {
  return HomeRepository(ref);
});

final homeDataProvider = FutureProvider<HomeData>((ref) async {
  final repository = ref.watch(homeRepositoryProvider);
  return repository.getHomeData();
});

// Playlist Providers
final publicPlaylistsProvider = FutureProvider<List<PlaylistModel>>((ref) async {
  final repository = ref.watch(homeRepositoryProvider);
  return repository.getPublicPlaylists();
});

final featuredPlaylistsProvider = FutureProvider<List<PlaylistModel>>((ref) async {
  final repository = ref.watch(homeRepositoryProvider);
  return repository.getFeaturedPlaylists();
});

// Song Providers
final trendingProvider = FutureProvider<List<SongModel>>((ref) async {
  final repository = ref.watch(homeRepositoryProvider);
  return repository.getTrending();
});

final newReleasesProvider = FutureProvider<List<SongModel>>((ref) async {
  final repository = ref.watch(homeRepositoryProvider);
  return repository.getNewReleases();
});

final bollywoodProvider = FutureProvider<List<SongModel>>((ref) async {
  final repository = ref.watch(homeRepositoryProvider);
  return repository.getBollywoodSongs();
});

final hollywoodProvider = FutureProvider<List<SongModel>>((ref) async {
  final repository = ref.watch(homeRepositoryProvider);
  return repository.getHollywoodSongs();
});

final hindiProvider = FutureProvider<List<SongModel>>((ref) async {
  final repository = ref.watch(homeRepositoryProvider);
  return repository.getHindiSongs();
});

// Search Provider
final searchSongsProvider = FutureProvider.family<List<SongModel>, String>((ref, query) async {
  if (query.isEmpty) return [];
  final repository = ref.watch(homeRepositoryProvider);
  return repository.searchSongs(query);
});
