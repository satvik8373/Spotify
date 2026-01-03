import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:just_audio/just_audio.dart';
import 'package:palette_generator/palette_generator.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/audio_service.dart';
import '../../../../core/services/firestore_service.dart';
import '../../../liked_songs/presentation/pages/liked_songs_page.dart';
import '../widgets/player_controls.dart';
import '../widgets/player_progress_bar.dart';

/// Player page with improved swipe gesture support:
/// - Swipe left/right: Skip to next/previous track
/// - Swipe down: Close player and return to previous screen
/// - Clean, Spotify-like gesture implementation
class PlayerPage extends ConsumerStatefulWidget {
  const PlayerPage({super.key});

  @override
  ConsumerState<PlayerPage> createState() => _PlayerPageState();
}

class _PlayerPageState extends ConsumerState<PlayerPage> with TickerProviderStateMixin {
  Color _dominantColor = AppColors.surface;
  String? _lastImageUrl;
  double _swipeOffset = 0.0;
  bool _isSwipeActive = false;
  double _verticalDragOffset = 0.0;
  bool _isDragging = false;
  bool _hasTriggeredHaptic = false;
  
  late AnimationController _swipeAnimationController;
  late Animation<double> _swipeAnimation;
  late AnimationController _dragController;
  late Animation<double> _dragAnimation;
  
  // Spotify-like gesture thresholds
  static const double _horizontalSwipeThreshold = 120.0;
  static const double _dismissThreshold = 150.0;
  static const double _swipeVelocityThreshold = 800.0;
  static const double _maxSwipeDistance = 200.0;
  
  @override
  void initState() {
    super.initState();
    _swipeAnimationController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _swipeAnimation = Tween<double>(
      begin: 0.0,
      end: 0.0,
    ).animate(CurvedAnimation(
      parent: _swipeAnimationController,
      curve: Curves.easeOutQuart,
    ));
    
    _dragController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _dragAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _dragController,
      curve: Curves.easeOutCubic,
    ));
  }
  
  @override
  void dispose() {
    _swipeAnimationController.dispose();
    _dragController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    final currentSong = ref.watch(currentSongProvider);
    final playerState = ref.watch(playerStateProvider);
    
    if (currentSong == null) {
      return const Scaffold(
        body: Center(child: Text('No song playing')),
      );
    }
    
    // Extract colors when song changes
    if (_lastImageUrl != currentSong.imageUrl) {
      _lastImageUrl = currentSong.imageUrl;
      _extractColors(currentSong.imageUrl);
    }
    
    // Watch liked status
    final isLiked = ref.watch(isSongLikedProvider(currentSong.id));
    
    return AnimatedBuilder(
      animation: Listenable.merge([_dragAnimation, _swipeAnimation]),
      builder: (context, child) {
        final currentOffset = _isSwipeActive ? _swipeOffset : _swipeAnimation.value;
        final transformOffset = currentOffset * 0.15;
        final dragProgress = _dragAnimation.value;
        
        return Transform.translate(
          offset: Offset(transformOffset, _verticalDragOffset),
          child: Transform.scale(
            scale: 1.0 - (dragProgress * 0.05),
            child: Opacity(
              opacity: 1.0 - (dragProgress * 0.3),
              child: Scaffold(
                body: GestureDetector(
                  // Vertical drag for dismiss
                  onVerticalDragStart: (details) {
                    setState(() {
                      _isDragging = true;
                      _verticalDragOffset = 0.0;
                      _hasTriggeredHaptic = false;
                    });
                    _dragController.stop();
                  },
                  onVerticalDragUpdate: (details) {
                    if (!_isDragging) return;
                    
                    setState(() {
                      _verticalDragOffset += details.delta.dy;
                      if (_verticalDragOffset < 0) _verticalDragOffset = 0;
                    });
                    
                    final progress = (_verticalDragOffset / _dismissThreshold).clamp(0.0, 1.0);
                    _dragController.value = progress;
                    
                    if (progress > 0.7 && !_hasTriggeredHaptic) {
                      HapticFeedback.lightImpact();
                      _hasTriggeredHaptic = true;
                    }
                  },
                  onVerticalDragEnd: (details) {
                    if (!_isDragging) return;
                    
                    final velocity = details.velocity.pixelsPerSecond.dy;
                    final shouldDismiss = _verticalDragOffset > _dismissThreshold || 
                                         velocity > _swipeVelocityThreshold;
                    
                    if (shouldDismiss) {
                      _performDismiss();
                    } else {
                      _resetDrag();
                    }
                    
                    setState(() {
                      _isDragging = false;
                      _hasTriggeredHaptic = false;
                    });
                  },
                  
                  // Horizontal drag for track changes
                  onHorizontalDragStart: (details) {
                    setState(() {
                      _isSwipeActive = true;
                      _swipeOffset = 0.0;
                      _hasTriggeredHaptic = false;
                    });
                    _swipeAnimationController.stop();
                  },
                  onHorizontalDragUpdate: (details) {
                    if (!_isSwipeActive) return;
                    
                    setState(() {
                      _swipeOffset += details.delta.dx;
                      _swipeOffset = _swipeOffset.clamp(-_maxSwipeDistance, _maxSwipeDistance);
                    });
                    
                    if (_swipeOffset.abs() > _horizontalSwipeThreshold && !_hasTriggeredHaptic) {
                      HapticFeedback.selectionClick();
                      _hasTriggeredHaptic = true;
                    }
                  },
                  onHorizontalDragEnd: (details) {
                    if (!_isSwipeActive) return;
                    
                    final velocity = details.velocity.pixelsPerSecond.dx;
                    final shouldChangeTrack = _swipeOffset.abs() > _horizontalSwipeThreshold || 
                                             velocity.abs() > _swipeVelocityThreshold;
                    
                    if (shouldChangeTrack) {
                      if (_swipeOffset > 0) {
                        _animateTrackChange(() {
                          ref.read(audioServiceProvider).skipToPrevious();
                        });
                      } else {
                        _animateTrackChange(() {
                          ref.read(audioServiceProvider).skipToNext();
                        });
                      }
                    } else {
                      _animateSwipeBack();
                    }
                    
                    setState(() {
                      _isSwipeActive = false;
                      _hasTriggeredHaptic = false;
                    });
                  },
                  
                  child: AnimatedContainer(
                    duration: _isDragging ? Duration.zero : const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          _dominantColor.withOpacity(0.8),
                          AppColors.background,
                        ],
                      ),
                    ),
                    child: Stack(
                      children: [
                        SafeArea(
                          child: Column(
                            children: [
                              // Header
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.keyboard_arrow_down, size: 32),
                                      onPressed: () => context.pop(),
                                    ),
                                    Expanded(
                                      child: Column(
                                        children: [
                                          Text(
                                            'PLAYING FROM',
                                            style: TextStyle(
                                              fontSize: 11,
                                              letterSpacing: 1,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                          Text(
                                            currentSong.album.isNotEmpty ? currentSong.album : 'Unknown Album',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w600,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            textAlign: TextAlign.center,
                                          ),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.more_vert),
                                      onPressed: () => _showSongOptions(context),
                                    ),
                                  ],
                                ),
                              ),
                              
                              // Album Art
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.all(32),
                                  child: Hero(
                                    tag: 'album-art-${currentSong.id}',
                                    child: Container(
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(8),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(0.3),
                                            blurRadius: 30,
                                            offset: const Offset(0, 10),
                                          ),
                                        ],
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: CachedNetworkImage(
                                          imageUrl: currentSong.imageUrl,
                                          fit: BoxFit.cover,
                                          placeholder: (context, url) => Container(
                                            color: AppColors.surface,
                                            child: const Icon(Icons.music_note, size: 64),
                                          ),
                                          errorWidget: (context, url, error) => Container(
                                            color: AppColors.surface,
                                            child: const Icon(Icons.music_note, size: 64),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              
                              // Song Info
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 32),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            currentSong.title,
                                            style: const TextStyle(
                                              fontSize: 22,
                                              fontWeight: FontWeight.bold,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            currentSong.artist,
                                            style: TextStyle(
                                              fontSize: 16,
                                              color: AppColors.textSecondary,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: Icon(
                                        isLiked.valueOrNull == true ? Icons.favorite : Icons.favorite_border,
                                        color: isLiked.valueOrNull == true ? const Color(0xFF1DB954) : null,
                                        size: 28,
                                      ),
                                      onPressed: () => _toggleLike(currentSong),
                                    ),
                                  ],
                                ),
                              ),
                              
                              const SizedBox(height: 16),
                              
                              // Progress Bar
                              const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 32),
                                child: PlayerProgressBar(),
                              ),
                              
                              const SizedBox(height: 16),
                              
                              // Controls
                              const PlayerControls(),
                              
                              const SizedBox(height: 16),
                              
                              // Bottom Actions
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.devices),
                                      onPressed: () {},
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.share),
                                      onPressed: () => _shareSong(),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.queue_music),
                                      onPressed: () => _showQueue(context),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        
                        // Spotify-like swipe indicators
                        if (_isSwipeActive && _swipeOffset.abs() > _horizontalSwipeThreshold * 0.6)
                          Positioned.fill(
                            child: Center(
                              child: AnimatedOpacity(
                                duration: const Duration(milliseconds: 100),
                                opacity: ((_swipeOffset.abs() - _horizontalSwipeThreshold * 0.6) / 
                                         (_horizontalSwipeThreshold * 0.4)).clamp(0.0, 1.0),
                                child: Container(
                                  width: 60,
                                  height: 60,
                                  decoration: BoxDecoration(
                                    color: Colors.black.withOpacity(0.6),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    _swipeOffset > 0 ? Icons.skip_previous_rounded : Icons.skip_next_rounded,
                                    color: Colors.white,
                                    size: 30,
                                  ),
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
          ),
        );
      },
    );
  }
  
  void _performDismiss() {
    HapticFeedback.mediumImpact();
    _dragController.animateTo(1.0, 
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOutCubic,
    ).then((_) {
      if (mounted) {
        context.pop();
      }
    });
  }
  
  void _resetDrag() {
    _dragController.animateTo(0.0, 
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutBack,
    ).then((_) {
      setState(() {
        _verticalDragOffset = 0.0;
      });
    });
  }
  
  void _animateTrackChange(VoidCallback onTrackChange) {
    HapticFeedback.mediumImpact();
    
    final targetOffset = _swipeOffset > 0 ? _maxSwipeDistance : -_maxSwipeDistance;
    
    _swipeAnimation = Tween<double>(
      begin: _swipeOffset,
      end: targetOffset,
    ).animate(CurvedAnimation(
      parent: _swipeAnimationController,
      curve: Curves.easeOutQuart,
    ));
    
    _swipeAnimationController.forward().then((_) {
      onTrackChange();
      
      _swipeOffset = -targetOffset;
      _swipeAnimation = Tween<double>(
        begin: _swipeOffset,
        end: 0.0,
      ).animate(CurvedAnimation(
        parent: _swipeAnimationController,
        curve: Curves.easeOutQuart,
      ));
      
      _swipeAnimationController.reset();
      _swipeAnimationController.forward().then((_) {
        setState(() {
          _swipeOffset = 0.0;
        });
      });
    });
  }
  
  void _animateSwipeBack() {
    _swipeAnimation = Tween<double>(
      begin: _swipeOffset,
      end: 0.0,
    ).animate(CurvedAnimation(
      parent: _swipeAnimationController,
      curve: Curves.easeOutQuart,
    ));
    
    _swipeAnimationController.reset();
    _swipeAnimationController.forward().then((_) {
      setState(() {
        _swipeOffset = 0.0;
      });
    });
  }
  
  Future<void> _extractColors(String imageUrl) async {
    if (imageUrl.isEmpty) return;
    
    try {
      final paletteGenerator = await PaletteGenerator.fromImageProvider(
        CachedNetworkImageProvider(imageUrl),
        maximumColorCount: 10,
        size: const Size(100, 100),
      );
      if (mounted) {
        setState(() {
          _dominantColor = paletteGenerator.dominantColor?.color ?? AppColors.surface;
        });
      }
    } catch (_) {}
  }
  
  void _showSongOptions(BuildContext context) {
    showCupertinoModalPopup(
      context: context,
      barrierColor: Colors.black.withOpacity(0.5),
      builder: (context) => const SongOptionsSheet(),
    );
  }
  
  Future<void> _toggleLike(dynamic song) async {
    final firestore = ref.read(firestoreServiceProvider);
    final isLiked = ref.read(isSongLikedProvider(song.id)).valueOrNull ?? false;
    
    if (isLiked) {
      await firestore.unlikeSong(song.id);
    } else {
      await firestore.likeSong(song);
    }
    ref.invalidate(isSongLikedProvider(song.id));
    ref.invalidate(likedSongsProvider);
  }
  
  void _shareSong() {
    // Implement share
  }
  
  void _showQueue(BuildContext context) {
    showCupertinoModalPopup(
      context: context,
      barrierColor: Colors.black.withOpacity(0.5),
      builder: (context) => const QueueSheet(),
    );
  }
}

class SongOptionsSheet extends ConsumerWidget {
  const SongOptionsSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentSong = ref.watch(currentSongProvider);
    
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF1C1C1E),
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 8, bottom: 16),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            
            if (currentSong != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: CachedNetworkImage(
                        imageUrl: currentSong.imageUrl,
                        width: 48,
                        height: 48,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          width: 48,
                          height: 48,
                          color: AppColors.surface,
                          child: const Icon(Icons.music_note, size: 24),
                        ),
                        errorWidget: (context, url, error) => Container(
                          width: 48,
                          height: 48,
                          color: AppColors.surface,
                          child: const Icon(Icons.music_note, size: 24),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            currentSong.title,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            currentSong.artist,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.white.withOpacity(0.7),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            
            const SizedBox(height: 8),
            
            _buildOptionTile(
              icon: CupertinoIcons.heart,
              title: 'Like',
              onTap: () {
                Navigator.pop(context);
              },
            ),
            _buildOptionTile(
              icon: CupertinoIcons.plus_circle,
              title: 'Add to Playlist',
              onTap: () {
                Navigator.pop(context);
              },
            ),
            _buildOptionTile(
              icon: CupertinoIcons.music_albums,
              title: 'Go to Album',
              onTap: () {
                Navigator.pop(context);
              },
            ),
            _buildOptionTile(
              icon: CupertinoIcons.person_circle,
              title: 'Go to Artist',
              onTap: () {
                Navigator.pop(context);
              },
            ),
            _buildOptionTile(
              icon: CupertinoIcons.square_arrow_up,
              title: 'Share',
              onTap: () {
                Navigator.pop(context);
              },
            ),
            _buildOptionTile(
              icon: CupertinoIcons.download_circle,
              title: 'Download',
              onTap: () {
                Navigator.pop(context);
              },
            ),
            
            const SizedBox(height: 8),
            
            Container(
              margin: const EdgeInsets.all(16),
              width: double.infinity,
              child: CupertinoButton(
                color: const Color(0xFF2C2C2E),
                borderRadius: BorderRadius.circular(12),
                child: const Text(
                  'Cancel',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildOptionTile({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFF2C2C2E),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: Colors.white,
                size: 18,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 17,
                  color: Colors.white,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              color: Colors.white.withOpacity(0.3),
              size: 16,
            ),
          ],
        ),
      ),
    );
  }
}

class QueueSheet extends ConsumerWidget {
  const QueueSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final queue = ref.watch(queueProvider);
    final currentIndex = ref.watch(currentIndexProvider);
    
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(
        color: Color(0xFF1C1C1E),
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 8, bottom: 8),
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Queue',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  child: Text(
                    'Clear',
                    style: TextStyle(
                      fontSize: 17,
                      color: CupertinoColors.systemBlue,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  onPressed: () {},
                ),
              ],
            ),
          ),
          
          Expanded(
            child: ListView.builder(
              itemCount: queue.length,
              itemBuilder: (context, index) {
                final song = queue[index];
                final isPlaying = index == currentIndex;
                
                return CupertinoButton(
                  padding: EdgeInsets.zero,
                  onPressed: () {
                    ref.read(audioServiceProvider).skipToIndex(index);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: CachedNetworkImage(
                            imageUrl: song.imageUrl,
                            width: 48,
                            height: 48,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              width: 48,
                              height: 48,
                              color: const Color(0xFF2C2C2E),
                              child: const Icon(
                                CupertinoIcons.music_note,
                                size: 24,
                                color: Colors.white,
                              ),
                            ),
                            errorWidget: (context, url, error) => Container(
                              width: 48,
                              height: 48,
                              color: const Color(0xFF2C2C2E),
                              child: const Icon(
                                CupertinoIcons.music_note,
                                size: 24,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                song.title,
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                  color: isPlaying ? CupertinoColors.systemBlue : Colors.white,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                song.artist,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.white.withOpacity(0.7),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        if (isPlaying)
                          const Icon(
                            CupertinoIcons.waveform,
                            color: CupertinoColors.systemBlue,
                            size: 20,
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}