import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/audio_service.dart';
import '../../../player/domain/models/song_model.dart';

class HorizontalSongList extends ConsumerWidget {
  final String title;
  final List<SongModel> songs;
  final VoidCallback? onSeeAll;
  
  const HorizontalSongList({
    super.key,
    required this.title,
    required this.songs,
    this.onSeeAll,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (songs.isEmpty) return const SizedBox.shrink();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (onSeeAll != null)
                TextButton(
                  onPressed: onSeeAll,
                  child: const Text('See all'),
                ),
            ],
          ),
        ),
        SizedBox(
          height: 200,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: songs.length,
            itemBuilder: (context, index) {
              final song = songs[index];
              return _SongCard(
                song: song,
                onTap: () {
                  ref.read(currentSongProvider.notifier).state = song;
                  ref.read(queueProvider.notifier).state = songs;
                  ref.read(currentIndexProvider.notifier).state = index;
                  ref.read(audioServiceProvider).playQueue(songs, initialIndex: index);
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _SongCard extends StatelessWidget {
  final SongModel song;
  final VoidCallback onTap;
  
  const _SongCard({
    required this.song,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 150,
        margin: const EdgeInsets.only(right: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 150,
              height: 150,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: song.imageUrl,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    color: AppColors.surface,
                    child: const Icon(Icons.music_note, size: 48),
                  ),
                  errorWidget: (context, url, error) => Container(
                    color: AppColors.surface,
                    child: const Icon(Icons.music_note, size: 48),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              song.title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              song.artist,
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
