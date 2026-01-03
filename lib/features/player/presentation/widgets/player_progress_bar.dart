import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/audio_service.dart';

class PlayerProgressBar extends ConsumerStatefulWidget {
  const PlayerProgressBar({super.key});

  @override
  ConsumerState<PlayerProgressBar> createState() => _PlayerProgressBarState();
}

class _PlayerProgressBarState extends ConsumerState<PlayerProgressBar> {
  double? _dragValue;
  
  @override
  Widget build(BuildContext context) {
    final audioService = ref.watch(audioServiceProvider);
    final position = ref.watch(positionProvider);
    final duration = ref.watch(durationProvider);
    
    final currentPosition = position.valueOrNull ?? Duration.zero;
    final totalDuration = duration.valueOrNull ?? Duration.zero;
    
    final progress = totalDuration.inMilliseconds > 0
        ? currentPosition.inMilliseconds / totalDuration.inMilliseconds
        : 0.0;
    
    return Column(
      children: [
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: 4,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
          ),
          child: Slider(
            value: _dragValue ?? progress.clamp(0.0, 1.0),
            onChanged: (value) {
              setState(() {
                _dragValue = value;
              });
            },
            onChangeEnd: (value) {
              final newPosition = Duration(
                milliseconds: (value * totalDuration.inMilliseconds).round(),
              );
              audioService.seekTo(newPosition);
              setState(() {
                _dragValue = null;
              });
            },
            activeColor: AppColors.textPrimary,
            inactiveColor: AppColors.textSecondary.withOpacity(0.3),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _formatDuration(currentPosition),
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
              Text(
                _formatDuration(totalDuration),
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }
}
