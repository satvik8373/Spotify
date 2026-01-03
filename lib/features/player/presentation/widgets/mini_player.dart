import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:palette_generator/palette_generator.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/audio_service.dart';
import '../../../../core/services/firestore_service.dart';
import '../../../liked_songs/presentation/pages/liked_songs_page.dart';

/// Mini player widget with swipe gesture support:
/// - Tap: Navigate to full player page
/// - Swipe left/right: Skip to next/previous track
class MiniPlayer extends ConsumerStatefulWidget {
  const MiniPlayer({super.key});

  @override
  ConsumerState<MiniPlayer> createState() => _MiniPlayerState();
}

class _MiniPlayerState extends ConsumerState<MiniPlayer> {
  Color _dominantColor = const Color(0xFF1A1A1A);
  Color _textColor = Colors.white;
  String? _lastImageUrl;
  bool _isExtractingColor = false;

  @override
  Widget build(BuildContext context) {
    final currentSong = ref.watch(currentSongProvider);
    final playerState = ref.watch(playerStateProvider);
    final position = ref.watch(positionProvider);
    final duration = ref.watch(durationProvider);
    final audioService = ref.watch(audioServiceProvider);
    
    if (currentSong == null) return const SizedBox.shrink();
    
    // Check if current song is liked
    final isLiked = ref.watch(isSongLikedProvider(currentSong.id));
    
    final isPlaying = playerState.valueOrNull?.playing ?? false;
    final currentPosition = position.valueOrNull ?? Duration.zero;
    final totalDuration = duration.valueOrNull ?? Duration.zero;
    
    final progress = totalDuration.inMilliseconds > 0
        ? currentPosition.inMilliseconds / totalDuration.inMilliseconds
        : 0.0;

    // Extract dominant color only when image changes
    if (_lastImageUrl != currentSong.imageUrl) {
      _lastImageUrl = currentSong.imageUrl;
      _extractColor(currentSong.imageUrl);
    }
    
    return GestureDetector(
      onTap: () => context.push('/player'),
      onPanEnd: (details) {
        // Horizontal swipe for track changes
        if (details.velocity.pixelsPerSecond.dx.abs() > 500) {
          if (details.velocity.pixelsPerSecond.dx > 0) {
            // Swipe right - previous track
            audioService.skipToPrevious();
          } else {
            // Swipe left - next track
            audioService.skipToNext();
          }
        }
      },
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          color: _dominantColor,
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Main Content
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                children: [
                  // Album Art
                  Hero(
                    tag: 'album-art-${currentSong.id}',
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: CachedNetworkImage(
                        imageUrl: currentSong.imageUrl,
                        width: 40,
                        height: 40,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          width: 40,
                          height: 40,
                          color: AppColors.surface,
                          child: const Icon(Icons.music_note, size: 20),
                        ),
                        errorWidget: (context, url, error) => Container(
                          width: 40,
                          height: 40,
                          color: AppColors.surface,
                          child: const Icon(Icons.music_note, size: 20),
                        ),
                      ),
                    ),
                  ),
                  
                  const SizedBox(width: 10),
                  
                  // Song Info
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          currentSong.title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: _textColor,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          currentSong.artist,
                          style: TextStyle(
                            fontSize: 12,
                            color: _textColor.withOpacity(0.7),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  
                  // Like Button
                  IconButton(
                    icon: Icon(
                      isLiked.valueOrNull == true ? Icons.favorite : Icons.favorite_border,
                      color: isLiked.valueOrNull == true ? const Color(0xFF1DB954) : _textColor.withOpacity(0.8),
                      size: 22,
                    ),
                    onPressed: () async {
                      final firestore = ref.read(firestoreServiceProvider);
                      if (isLiked.valueOrNull == true) {
                        await firestore.unlikeSong(currentSong.id);
                      } else {
                        await firestore.likeSong(currentSong);
                      }
                      ref.invalidate(isSongLikedProvider(currentSong.id));
                      ref.invalidate(likedSongsProvider);
                    },
                  ),
                  
                  // Play/Pause Button
                  IconButton(
                    icon: Icon(
                      isPlaying ? Icons.pause : Icons.play_arrow,
                      color: _textColor,
                      size: 28,
                    ),
                    onPressed: () {
                      if (isPlaying) {
                        audioService.pause();
                      } else {
                        audioService.play();
                      }
                    },
                  ),
                ],
              ),
            ),
            
            // Progress Bar at bottom
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                height: 2,
                child: LinearProgressIndicator(
                  value: progress.clamp(0.0, 1.0),
                  backgroundColor: Colors.white.withOpacity(0.2),
                  valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _extractColor(String imageUrl) async {
    if (imageUrl.isEmpty || _isExtractingColor) return;
    
    _isExtractingColor = true;
    
    try {
      final paletteGenerator = await PaletteGenerator.fromImageProvider(
        CachedNetworkImageProvider(imageUrl),
        maximumColorCount: 10,
        size: const Size(50, 50), // Use smaller size for faster extraction
      );
      
      if (mounted) {
        setState(() {
          _dominantColor = paletteGenerator.dominantColor?.color ?? const Color(0xFF1A1A1A);
          _textColor = _dominantColor.computeLuminance() > 0.5 
              ? Colors.black 
              : Colors.white;
        });
      }
    } catch (e) {
      // Use default colors on error
    } finally {
      _isExtractingColor = false;
    }
  }
}
