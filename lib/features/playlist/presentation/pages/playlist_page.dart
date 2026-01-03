import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:palette_generator/palette_generator.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/audio_service.dart';
import '../providers/playlist_provider.dart';
import '../../../../shared/widgets/song_tile.dart';

class PlaylistPage extends ConsumerStatefulWidget {
  final String playlistId;
  
  const PlaylistPage({super.key, required this.playlistId});

  @override
  ConsumerState<PlaylistPage> createState() => _PlaylistPageState();
}

class _PlaylistPageState extends ConsumerState<PlaylistPage> {
  Color _dominantColor = const Color(0xFF282828);
  
  @override
  void initState() {
    super.initState();
    _loadPlaylist();
  }
  
  void _loadPlaylist() {
    ref.read(playlistDetailProvider(widget.playlistId));
  }
  
  Future<void> _extractColors(String imageUrl) async {
    if (imageUrl.isEmpty) return;
    
    try {
      final paletteGenerator = await PaletteGenerator.fromImageProvider(
        CachedNetworkImageProvider(imageUrl),
      );
      if (mounted) {
        setState(() {
          _dominantColor = paletteGenerator.dominantColor?.color ?? const Color(0xFF282828);
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final playlistAsync = ref.watch(playlistDetailProvider(widget.playlistId));
    final currentSong = ref.watch(currentSongProvider);
    
    return playlistAsync.when(
      data: (playlist) {
        if (_dominantColor == const Color(0xFF282828)) {
          _extractColors(playlist.imageUrl);
        }
        
        return Scaffold(
          backgroundColor: AppColors.background,
          body: CustomScrollView(
            slivers: [
              // Header with gradient
              SliverAppBar(
                expandedHeight: 300,
                pinned: true,
                backgroundColor: AppColors.background,
                leading: context.canPop()
                  ? IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => context.pop(),
                    )
                  : null,
                flexibleSpace: FlexibleSpaceBar(
                  background: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          _dominantColor,
                          _dominantColor.withOpacity(0.6),
                          AppColors.background,
                        ],
                        stops: const [0.0, 0.5, 1.0],
                      ),
                    ),
                    child: SafeArea(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(height: 50),
                          // Playlist Image
                          Container(
                            width: 180,
                            height: 180,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(4),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.4),
                                  blurRadius: 24,
                                  offset: const Offset(0, 12),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: CachedNetworkImage(
                                imageUrl: playlist.imageUrl,
                                fit: BoxFit.cover,
                                placeholder: (context, url) => Container(
                                  color: AppColors.surface,
                                  child: const Icon(Icons.queue_music, size: 64, color: AppColors.textSecondary),
                                ),
                                errorWidget: (context, url, error) => Container(
                                  color: AppColors.surface,
                                  child: const Icon(Icons.queue_music, size: 64, color: AppColors.textSecondary),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              
              // Playlist Info
              SliverToBoxAdapter(
                child: Container(
                  color: AppColors.background,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        playlist.name,
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (playlist.description != null && playlist.description!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          playlist.description!,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.person, size: 14, color: Colors.black),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            playlist.ownerName ?? 'Unknown',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${playlist.songCount} songs',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // Action Buttons
                      _buildActionButtons(playlist, ref),
                    ],
                  ),
                ),
              ),
              
              // Songs List
              if (playlist.songs != null && playlist.songs!.isNotEmpty)
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final song = playlist.songs![index];
                      return SongTile(
                        song: song,
                        index: index + 1,
                        onTap: () {
                          ref.read(currentSongProvider.notifier).state = song;
                          ref.read(queueProvider.notifier).state = playlist.songs!;
                          ref.read(currentIndexProvider.notifier).state = index;
                          ref.read(audioServiceProvider).playQueue(
                            playlist.songs!,
                            initialIndex: index,
                          );
                        },
                      );
                    },
                    childCount: playlist.songs!.length,
                  ),
                )
              else
                SliverFillRemaining(
                  child: Container(
                    color: AppColors.background,
                    child: const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.music_off, size: 48, color: AppColors.textSecondary),
                          SizedBox(height: 16),
                          Text(
                            'No songs in this playlist',
                            style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              
              // Bottom padding for mini player and nav
              SliverToBoxAdapter(
                child: SizedBox(height: currentSong != null ? 160 : 100),
              ),
            ],
          ),
        );
      },
      loading: () => Scaffold(
        backgroundColor: AppColors.background,
        body: const Center(child: CircularProgressIndicator(color: AppColors.primary)),
      ),
      error: (error, _) => Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(backgroundColor: Colors.transparent),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.textSecondary),
              const SizedBox(height: 16),
              Text('Error: $error', style: const TextStyle(color: AppColors.textSecondary)),
            ],
          ),
        ),
      ),
    );
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
  
  Widget _buildActionButtons(dynamic playlist, WidgetRef ref) {
    final playerState = ref.watch(playerStateProvider);
    final currentSong = ref.watch(currentSongProvider);
    final queue = ref.watch(queueProvider);
    final audioService = ref.watch(audioServiceProvider);
    
    final isPlaying = playerState.valueOrNull?.playing ?? false;
    
    // Check if this playlist is currently playing
    bool isThisPlaylistPlaying = false;
    if (currentSong != null && playlist.songs != null && playlist.songs!.isNotEmpty) {
      isThisPlaylistPlaying = playlist.songs!.any((s) => s.id == currentSong.id);
    }
    
    return Row(
      children: [
        IconButton(
          icon: const Icon(Icons.favorite_border, color: AppColors.textSecondary),
          onPressed: () {},
        ),
        IconButton(
          icon: const Icon(Icons.download_outlined, color: AppColors.textSecondary),
          onPressed: () {},
        ),
        IconButton(
          icon: const Icon(Icons.more_vert, color: AppColors.textSecondary),
          onPressed: () {},
        ),
        const Spacer(),
        IconButton(
          icon: const Icon(Icons.shuffle, color: AppColors.primary, size: 28),
          onPressed: () => _shufflePlay(playlist.songs ?? []),
        ),
        const SizedBox(width: 12),
        GestureDetector(
          onTap: () {
            if (isThisPlaylistPlaying && isPlaying) {
              audioService.pause();
            } else if (isThisPlaylistPlaying && !isPlaying) {
              audioService.play();
            } else {
              _playAll(playlist.songs ?? []);
            }
          },
          child: Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isThisPlaylistPlaying && isPlaying ? Icons.pause : Icons.play_arrow,
              color: Colors.black,
              size: 32,
            ),
          ),
        ),
      ],
    );
  }
}
