import '../../../player/domain/models/song_model.dart';

class AlbumModel {
  final String id;
  final String title;
  final String artist;
  final String? artistId;
  final String imageUrl;
  final int songCount;
  final String? releaseDate;
  final List<SongModel>? songs;
  
  AlbumModel({
    required this.id,
    required this.title,
    required this.artist,
    this.artistId,
    required this.imageUrl,
    required this.songCount,
    this.releaseDate,
    this.songs,
  });
  
  factory AlbumModel.fromJson(Map<String, dynamic> json) {
    return AlbumModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      title: json['title'] ?? json['name'] ?? '',
      artist: json['artist'] ?? json['artist_name'] ?? '',
      artistId: json['artistId']?.toString(),
      imageUrl: json['imageUrl'] ?? json['image'] ?? json['cover_medium'] ?? '',
      songCount: json['songCount'] ?? json['nb_tracks'] ?? 0,
      releaseDate: json['releaseDate'] ?? json['release_date'],
      songs: json['songs'] != null
          ? (json['songs'] as List).map((s) => SongModel.fromJson(s)).toList()
          : null,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'artist': artist,
      'artistId': artistId,
      'imageUrl': imageUrl,
      'songCount': songCount,
      'releaseDate': releaseDate,
    };
  }
}
