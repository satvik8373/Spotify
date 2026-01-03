import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../playlist/domain/models/playlist_model.dart';

class HorizontalPlaylistList extends StatelessWidget {
  final String title;
  final List<PlaylistModel> playlists;
  final VoidCallback? onSeeAll;
  
  const HorizontalPlaylistList({
    super.key,
    required this.title,
    required this.playlists,
    this.onSeeAll,
  });

  @override
  Widget build(BuildContext context) {
    if (playlists.isEmpty) return const SizedBox.shrink();
    
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
          height: 220,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: playlists.length,
            itemBuilder: (context, index) {
              final playlist = playlists[index];
              return _PlaylistCard(playlist: playlist);
            },
          ),
        ),
      ],
    );
  }
}

class _PlaylistCard extends StatelessWidget {
  final PlaylistModel playlist;
  
  const _PlaylistCard({required this.playlist});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/playlist/${playlist.id}'),
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
                  imageUrl: playlist.imageUrl,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    color: AppColors.surface,
                    child: const Icon(Icons.queue_music, size: 48),
                  ),
                  errorWidget: (context, url, error) => Container(
                    color: AppColors.surface,
                    child: const Icon(Icons.queue_music, size: 48),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              playlist.name,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              playlist.description ?? '${playlist.songCount} songs',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
