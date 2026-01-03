import '../../../player/domain/models/song_model.dart';

class PlaylistModel {
  final String id;
  final String name;
  final String? description;
  final String imageUrl;
  final String ownerId;
  final String? ownerName;
  final int songCount;
  final List<SongModel>? songs;
  final bool isPublic;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  
  PlaylistModel({
    required this.id,
    required this.name,
    this.description,
    required this.imageUrl,
    required this.ownerId,
    this.ownerName,
    required this.songCount,
    this.songs,
    this.isPublic = true,
    this.createdAt,
    this.updatedAt,
  });
  
  factory PlaylistModel.fromJson(Map<String, dynamic> json) {
    return PlaylistModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name'] ?? json['title'] ?? '',
      description: json['description'],
      imageUrl: json['imageUrl'] ?? json['image'] ?? json['cover'] ?? '',
      ownerId: json['ownerId']?.toString() ?? json['userId']?.toString() ?? '',
      ownerName: json['ownerName'] ?? json['owner']?['name'],
      songCount: json['songCount'] ?? json['songs']?.length ?? 0,
      songs: json['songs'] != null
          ? (json['songs'] as List).map((s) => SongModel.fromJson(s)).toList()
          : null,
      isPublic: json['isPublic'] ?? json['public'] ?? true,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'imageUrl': imageUrl,
      'ownerId': ownerId,
      'ownerName': ownerName,
      'songCount': songCount,
      'isPublic': isPublic,
    };
  }
  
  PlaylistModel copyWith({
    String? id,
    String? name,
    String? description,
    String? imageUrl,
    String? ownerId,
    String? ownerName,
    int? songCount,
    List<SongModel>? songs,
    bool? isPublic,
  }) {
    return PlaylistModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      ownerId: ownerId ?? this.ownerId,
      ownerName: ownerName ?? this.ownerName,
      songCount: songCount ?? this.songCount,
      songs: songs ?? this.songs,
      isPublic: isPublic ?? this.isPublic,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}
