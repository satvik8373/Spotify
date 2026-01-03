import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/audio_service.dart';
import '../../../../core/services/firestore_service.dart';
import '../../../player/domain/models/song_model.dart';

// Provider for liked songs from Firestore
final likedSongsProvider = FutureProvider<List<SongModel>>((ref) async {
  final firestore = ref.read(firestoreServiceProvider);
  return await firestore.getLikedSongs();
});

// Provider to check if a song is liked
final isSongLikedProvider = FutureProvider.family<bool, String>((ref, songId) async {
  final firestore = ref.read(firestoreServiceProvider);
  return await firestore.isSongLiked(songId);
});

class LikedSongsPage extends ConsumerWidget {
  const LikedSongsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final likedSongs = ref.watch(likedSongsProvider);
    
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Gradient Header with Liked Songs icon
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
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Color(0xFF5038A0),  // Purple top
                      Color(0xFF2F49B6),  // Mid purple-blue
                      Color(0xFF18205E),  // Dark blue
                      AppColors.background,
                    ],
                    stops: [0.0, 0.4, 0.7, 1.0],
                  ),
                ),
                child: SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 50),
                      // Liked Songs Icon with gradient
                      Container(
                        width: 180,
                        height: 180,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF450AF5), Color(0xFFC4EFD9)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(4),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.4),
                              blurRadius: 24,
                              offset: const Offset(0, 12),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.favorite,
                          size: 80,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          
          // Title and song count
          SliverToBoxAdapter(
            child: Container(
              color: AppColors.background,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Liked Songs',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  likedSongs.when(
                    data: (songs) => Text(
                      '${songs.length} songs',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
          ),
          
          // Action buttons row
          SliverToBoxAdapter(
            child: Container(
              color: AppColors.background,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  // Download button
                  IconButton(
                    icon: const Icon(Icons.download_outlined, color: AppColors.textSecondary),
                    onPressed: () {},
                  ),
                  const Spacer(),
                  // Shuffle button
                  IconButton(
                    icon: const Icon(Icons.shuffle, color: AppColors.primary, size: 28),
                    onPressed: () {
                      likedSongs.whenData((songs) {
                        if (songs.isEmpty) return;
                        final shuffled = List<SongModel>.from(songs)..shuffle();
                        ref.read(currentSongProvider.notifier).state = shuffled.first;
                        ref.read(queueProvider.notifier).state = shuffled;
                        ref.read(currentIndexProvider.notifier).state = 0;
                        ref.read(audioServiceProvider).playQueue(shuffled, initialIndex: 0);
                      });
                    },
                  ),
                  const SizedBox(width: 12),
                  // Play button
                  GestureDetector(
                    onTap: () {
                      likedSongs.whenData((songs) {
                        if (songs.isEmpty) return;
                        ref.read(currentSongProvider.notifier).state = songs.first;
                        ref.read(queueProvider.notifier).state = songs;
                        ref.read(currentIndexProvider.notifier).state = 0;
                        ref.read(audioServiceProvider).playQueue(songs, initialIndex: 0);
                      });
                    },
                    child: Container(
                      width: 56,
                      height: 56,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.play_arrow, color: Colors.black, size: 32),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Songs list
          likedSongs.when(
            data: (songs) {
              if (songs.isEmpty) {
                return SliverFillRemaining(
                  child: Container(
                    color: AppColors.background,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 96,
                            height: 96,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF4338CA), Color(0xFF3B82F6)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(48),
                            ),
                            child: const Icon(Icons.favorite, size: 48, color: Colors.white),
                          ),
                          const SizedBox(height: 24),
                          const Text(
                            'Songs you like will appear here',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Save songs by tapping the heart icon.',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }
              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final song = songs[index];
                    return _SongListTile(
                      song: song,
                      index: index,
                      onTap: () {
                        print('=== LIKED SONG TAP ===');
                        print('Index: $index');
                        print('Song: ${song.title}');
                        
                        final songsList = List<SongModel>.from(songs);
                        ref.read(currentSongProvider.notifier).state = songsList[index];
                        ref.read(queueProvider.notifier).state = songsList;
                        ref.read(currentIndexProvider.notifier).state = index;
                        ref.read(audioServiceProvider).playQueue(songsList, initialIndex: index);
                      },
                      onUnlike: () async {
                        final firestore = ref.read(firestoreServiceProvider);
                        await firestore.unlikeSong(song.id);
                        ref.invalidate(likedSongsProvider);
                      },
                    );
                  },
                  childCount: songs.length,
                ),
              );
            },
            loading: () => const SliverFillRemaining(
              child: Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),
            error: (error, _) => SliverFillRemaining(
              child: Container(
                color: AppColors.background,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppColors.textSecondary),
                      const SizedBox(height: 16),
                      const Text(
                        'Sign in to see your liked songs',
                        style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          
          // Bottom padding for mini player
          const SliverToBoxAdapter(child: SizedBox(height: 120)),
        ],
      ),
    );
  }
}

// Custom song list tile matching web app design
class _SongListTile extends StatelessWidget {
  final SongModel song;
  final int index;
  final VoidCallback onTap;
  final VoidCallback onUnlike;

  const _SongListTile({
    required this.song,
    required this.index,
    required this.onTap,
    required this.onUnlike,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        splashColor: Colors.white.withOpacity(0.1),
        highlightColor: Colors.white.withOpacity(0.05),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              // Album art
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: CachedNetworkImage(
                  imageUrl: song.imageUrl,
                  width: 48,
                  height: 48,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    width: 48,
                    height: 48,
                    color: AppColors.surface,
                    child: const Icon(Icons.music_note, size: 24, color: AppColors.textSecondary),
                  ),
                  errorWidget: (context, url, error) => Container(
                    width: 48,
                    height: 48,
                    color: AppColors.surface,
                    child: const Icon(Icons.music_note, size: 24, color: AppColors.textSecondary),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Song info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      song.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      song.artist,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              // Heart icon (liked indicator) - Spotify green for visibility
              IconButton(
                icon: const Icon(
                  Icons.favorite,
                  color: AppColors.primary,  // Spotify green
                  size: 22,
                ),
                onPressed: onUnlike,
              ),
              // More options
              IconButton(
                icon: const Icon(
                  Icons.more_vert,
                  color: AppColors.textSecondary,
                  size: 20,
                ),
                onPressed: () {
                  // Show options menu
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
