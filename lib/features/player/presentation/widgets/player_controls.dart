import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/audio_service.dart';

class PlayerControls extends ConsumerWidget {
  const PlayerControls({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final audioService = ref.watch(audioServiceProvider);
    final playerState = ref.watch(playerStateProvider);
    final shuffleMode = ref.watch(shuffleModeProvider);
    final repeatMode = ref.watch(repeatModeProvider);
    
    final isPlaying = playerState.valueOrNull?.playing ?? false;
    final processingState = playerState.valueOrNull?.processingState;
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Shuffle
        IconButton(
          icon: Icon(
            Icons.shuffle,
            color: shuffleMode ? AppColors.primary : AppColors.textSecondary,
          ),
          onPressed: () {
            final newMode = !shuffleMode;
            ref.read(shuffleModeProvider.notifier).state = newMode;
            audioService.setShuffleModeEnabled(newMode);
          },
        ),
        
        const SizedBox(width: 16),
        
        // Previous
        IconButton(
          icon: const Icon(Icons.skip_previous, size: 36),
          onPressed: () => audioService.skipToPrevious(),
        ),
        
        const SizedBox(width: 8),
        
        // Play/Pause
        Container(
          width: 64,
          height: 64,
          decoration: const BoxDecoration(
            color: AppColors.textPrimary,
            shape: BoxShape.circle,
          ),
          child: processingState == ProcessingState.loading ||
                  processingState == ProcessingState.buffering
              ? const Center(
                  child: SizedBox(
                    width: 32,
                    height: 32,
                    child: CircularProgressIndicator(
                      color: AppColors.background,
                      strokeWidth: 3,
                    ),
                  ),
                )
              : IconButton(
                  icon: Icon(
                    isPlaying ? Icons.pause : Icons.play_arrow,
                    size: 36,
                    color: AppColors.background,
                  ),
                  onPressed: () {
                    if (isPlaying) {
                      audioService.pause();
                    } else {
                      audioService.play();
                    }
                  },
                ),
        ),
        
        const SizedBox(width: 8),
        
        // Next
        IconButton(
          icon: const Icon(Icons.skip_next, size: 36),
          onPressed: () => audioService.skipToNext(),
        ),
        
        const SizedBox(width: 16),
        
        // Repeat
        IconButton(
          icon: Icon(
            repeatMode == LoopMode.one
                ? Icons.repeat_one
                : Icons.repeat,
            color: repeatMode != LoopMode.off
                ? AppColors.primary
                : AppColors.textSecondary,
          ),
          onPressed: () {
            LoopMode newMode;
            switch (repeatMode) {
              case LoopMode.off:
                newMode = LoopMode.all;
                break;
              case LoopMode.all:
                newMode = LoopMode.one;
                break;
              case LoopMode.one:
                newMode = LoopMode.off;
                break;
            }
            ref.read(repeatModeProvider.notifier).state = newMode;
            audioService.setLoopMode(newMode);
          },
        ),
      ],
    );
  }
}
