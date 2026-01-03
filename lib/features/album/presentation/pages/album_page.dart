import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:palette_generator/palette_generator.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/audio_service.dart';
import '../../../../core/services/api_service.dart';
import '../../../../core/config/api_config.dart';
import '../../domain/models/album_model.dart';
import '../../../../shared/widgets/song_tile.dart';

final albumDetailProvider = FutureProvider.family<AlbumModel, String>((ref, albumId) async {
  final api = ref.read(apiServiceProvider);
  final response = await api.get('${ApiConfig.albums}/$albumId');
  return AlbumModel.fromJson(response.data['album']);
});

class AlbumPage extends ConsumerStatefulWidget {
  final String albumId;
  
  const AlbumPage({super.key, required this.albumId});

  @override
  ConsumerState<AlbumPage> createState() => _AlbumPageState();
}

class _AlbumPageState extends ConsumerState<AlbumPage> {
  Color _dominantColor = AppColors.surface;

  @override
  Widget build(BuildContext context) {
    final albumAsync = ref.watch(albumDetailProvider(widget.albumId));
    final currentSong = ref.watch(currentSongProvider);
    
    return albumAsync.when(
      data: (album) {
        _extractColors(album.imageUrl);
        
        return Scaffold(
          body: CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 300,
                pinned: true,
                backgroundColor: _dominantColor.withOpacity(0.8),
                flexibleSpace: FlexibleSpaceBar(
                  background: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [_dominantColor, AppColors.background],
                      ),
                    ),
                    child: SafeArea(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(height: 40),
                          Container(
                            width: 180,
                            height: 180,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.3),
                                  blurRadius: 20,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: CachedNetworkImage(
                                imageUrl: album.imageUrl,
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        album.title,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        album.artist,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Album • ${album.releaseDate ?? ''} • ${album.songCount} songs',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          IconButton(icon: const Icon(Icons.favorite_border), onPressed: () {}),
                          IconButton(icon: const Icon(Icons.download_outlined), onPressed: () {}),
                          IconButton(icon: const Icon(Icons.more_vert), onPressed: () {}),
                          const Spacer(),
                          IconButton(
                            icon: const Icon(Icons.shuffle),
                            onPressed: () => _shufflePlay(album.songs ?? []),
                          ),
                          FloatingActionButton(
                            onPressed: () => _playAll(album.songs ?? []),
                            backgroundColor: AppColors.primary,
                            child: const Icon(Icons.play_arrow, color: Colors.black, size: 32),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              
              if (album.songs != null)
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final song = album.songs![index];
                      return SongTile(
                        song: song,
                        index: index + 1,
                        showImage: false,
                        onTap: () {
                          ref.read(currentSongProvider.notifier).state = song;
                          ref.read(queueProvider.notifier).state = album.songs!;
                          ref.read(currentIndexProvider.notifier).state = index;
                          ref.read(audioServiceProvider).playQueue(album.songs!, initialIndex: index);
                        },
                      );
                    },
                    childCount: album.songs!.length,
                  ),
                ),
              
              // Bottom padding for mini player and nav
              SliverToBoxAdapter(child: SizedBox(height: currentSong != null ? 160 : 100)),
            ],
          ),
        );
      },
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, _) => Scaffold(appBar: AppBar(), body: Center(child: Text('Error: $error'))),
    );
  }
  
  Future<void> _extractColors(String imageUrl) async {
    if (imageUrl.isEmpty) return;
    try {
      final paletteGenerator = await PaletteGenerator.fromImageProvider(CachedNetworkImageProvider(imageUrl));
      if (mounted) {
        setState(() {
          _dominantColor = paletteGenerator.dominantColor?.color ?? AppColors.surface;
        });
      }
    } catch (_) {}
  }
  
  void _playAll(List songs) {
    if (songs.isEmpty) return;
    ref.read(currentSongProvider.notifier).state = songs.first;
    ref.read(queueProvider.notifier).state = songs.cast();
    ref.read(currentIndexProvider.notifier).state = 0;
    ref.read(audioServiceProvider).playQueue(songs.cast(), initialIndex: 0);
  }
  
  void _shufflePlay(List songs) {
    if (songs.isEmpty) return;
    final shuffled = List.from(songs)..shuffle();
    ref.read(currentSongProvider.notifier).state = shuffled.first;
    ref.read(queueProvider.notifier).state = shuffled.cast();
    ref.read(currentIndexProvider.notifier).state = 0;
    ref.read(audioServiceProvider).playQueue(shuffled.cast(), initialIndex: 0);
  }
}
