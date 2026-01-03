import '../../../player/domain/models/song_model.dart';
import '../../../playlist/domain/models/playlist_model.dart';

class HomeData {
  final List<PlaylistModel> publicPlaylists;
  final List<PlaylistModel> featuredPlaylists;
  final List<PlaylistModel> userPlaylists;
  final List<SongModel> trending;
  final List<SongModel> newReleases;
  final List<SongModel> bollywoodSongs;
  final List<SongModel> hollywoodSongs;
  final List<SongModel> hindiSongs;
  
  HomeData({
    this.publicPlaylists = const [],
    this.featuredPlaylists = const [],
    this.userPlaylists = const [],
    this.trending = const [],
    this.newReleases = const [],
    this.bollywoodSongs = const [],
    this.hollywoodSongs = const [],
    this.hindiSongs = const [],
  });
  
  bool get hasPlaylists => publicPlaylists.isNotEmpty || featuredPlaylists.isNotEmpty;
  bool get hasSongs => trending.isNotEmpty || bollywoodSongs.isNotEmpty || hollywoodSongs.isNotEmpty;
}
