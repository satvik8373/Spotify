import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../playlist/domain/models/playlist_model.dart';

class QuickPicksGrid extends StatelessWidget {
  final List<PlaylistModel> playlists;
  
  const QuickPicksGrid({super.key, required this.playlists});

  @override
  Widget build(BuildContext context) {
    if (playlists.isEmpty) return const SizedBox.shrink();
    
    final displayPlaylists = playlists.take(6).toList();
    
    return Padding(
      padding: const EdgeInsets.all(16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 3.5,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
        ),
        itemCount: displayPlaylists.length,
        itemBuilder: (context, index) {
          final playlist = displayPlaylists[index];
          return _QuickPickItem(playlist: playlist);
        },
      ),
    );
  }
}

class _QuickPickItem extends StatelessWidget {
  final PlaylistModel playlist;
  
  const _QuickPickItem({required this.playlist});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/playlist/${playlist.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(4),
                bottomLeft: Radius.circular(4),
              ),
              child: CachedNetworkImage(
                imageUrl: playlist.imageUrl,
                width: 56,
                height: 56,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  color: AppColors.surfaceLight,
                  child: const Icon(Icons.music_note, size: 24),
                ),
                errorWidget: (context, url, error) => Container(
                  color: AppColors.surfaceLight,
                  child: const Icon(Icons.music_note, size: 24),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                playlist.name,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
          ],
        ),
      ),
    );
  }
}
