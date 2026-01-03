class SongModel {
  final String id;
  final String title;
  final String artist;
  final String album;
  final String imageUrl;
  final String audioUrl;
  final int duration; // in seconds
  final String? artistId;
  final String? albumId;
  final bool isLiked;
  final String? source; // deezer, jiosaavn, spotify, etc.
  
  SongModel({
    required this.id,
    required this.title,
    required this.artist,
    required this.album,
    required this.imageUrl,
    required this.audioUrl,
    required this.duration,
    this.artistId,
    this.albumId,
    this.isLiked = false,
    this.source,
  });
  
  factory SongModel.fromJson(Map<String, dynamic> json) {
    return SongModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? json['name'] ?? '',
      artist: json['artist'] ?? json['artist_name'] ?? json['primary_artists'] ?? '',
      album: json['album'] ?? json['album_name'] ?? '',
      imageUrl: json['image'] ?? json['imageUrl'] ?? json['cover_medium'] ?? '',
      audioUrl: json['audioUrl'] ?? json['preview'] ?? json['media_url'] ?? '',
      duration: json['duration'] ?? 0,
      artistId: json['artistId']?.toString(),
      albumId: json['albumId']?.toString(),
      isLiked: json['isLiked'] ?? false,
      source: json['source'],
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'artist': artist,
      'album': album,
      'imageUrl': imageUrl,
      'audioUrl': audioUrl,
      'duration': duration,
      'artistId': artistId,
      'albumId': albumId,
      'isLiked': isLiked,
      'source': source,
    };
  }
  
  SongModel copyWith({
    String? id,
    String? title,
    String? artist,
    String? album,
    String? imageUrl,
    String? audioUrl,
    int? duration,
    String? artistId,
    String? albumId,
    bool? isLiked,
    String? source,
  }) {
    return SongModel(
      id: id ?? this.id,
      title: title ?? this.title,
      artist: artist ?? this.artist,
      album: album ?? this.album,
      imageUrl: imageUrl ?? this.imageUrl,
      audioUrl: audioUrl ?? this.audioUrl,
      duration: duration ?? this.duration,
      artistId: artistId ?? this.artistId,
      albumId: albumId ?? this.albumId,
      isLiked: isLiked ?? this.isLiked,
      source: source ?? this.source,
    );
  }
  
  String get formattedDuration {
    final minutes = duration ~/ 60;
    final seconds = duration % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }
}
