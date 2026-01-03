import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../core/theme/app_colors.dart';
import '../../features/player/domain/models/song_model.dart';

class SongTile extends StatelessWidget {
  final SongModel song;
  final VoidCallback? onTap;
  final int? index;
  final bool showImage;
  final Widget? trailing;
  final bool isPlaying;
  
  const SongTile({
    super.key,
    required this.song,
    this.onTap,
    this.index,
    this.showImage = true,
    this.trailing,
    this.isPlaying = false,
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
              if (index != null) ...[
                SizedBox(
                  width: 24,
                  child: Text(
                    '$index',
                    style: TextStyle(
                      color: isPlaying ? AppColors.primary : AppColors.textSecondary,
                      fontWeight: isPlaying ? FontWeight.bold : FontWeight.normal,
                      fontSize: 14,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(width: 12),
              ],
              if (showImage)
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
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      song.title,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: isPlaying ? AppColors.primary : AppColors.textPrimary,
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
              trailing ?? IconButton(
                icon: const Icon(Icons.more_vert, size: 20, color: AppColors.textSecondary),
                onPressed: () => _showSongOptions(context),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  void _showSongOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Song Info Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: CachedNetworkImage(
                      imageUrl: song.imageUrl,
                      width: 48,
                      height: 48,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          song.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          song.artist,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
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
            const Divider(color: AppColors.surfaceLight),
            ListTile(
              leading: Icon(
                song.isLiked ? Icons.favorite : Icons.favorite_border,
                color: song.isLiked ? AppColors.primary : AppColors.textSecondary,
              ),
              title: Text(
                song.isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs',
                style: const TextStyle(color: AppColors.textPrimary),
              ),
              onTap: () {
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.playlist_add, color: AppColors.textSecondary),
              title: const Text('Add to playlist', style: TextStyle(color: AppColors.textPrimary)),
              onTap: () {
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.queue_music, color: AppColors.textSecondary),
              title: const Text('Add to queue', style: TextStyle(color: AppColors.textPrimary)),
              onTap: () {
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.share, color: AppColors.textSecondary),
              title: const Text('Share', style: TextStyle(color: AppColors.textPrimary)),
              onTap: () {
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }
}
