import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';
import 'package:audio_session/audio_session.dart';
import 'package:audio_service/audio_service.dart';

import '../../features/player/domain/models/song_model.dart';

final audioServiceProvider = Provider<AudioService>((ref) {
  final service = AudioService(ref);
  ref.onDispose(() => service.dispose());
  return service;
});

final playerStateProvider = StreamProvider<PlayerState>((ref) {
  final audioService = ref.watch(audioServiceProvider);
  return audioService.playerStateStream;
});

final positionProvider = StreamProvider<Duration>((ref) {
  final audioService = ref.watch(audioServiceProvider);
  return audioService.positionStream;
});

final durationProvider = StreamProvider<Duration?>((ref) {
  final audioService = ref.watch(audioServiceProvider);
  return audioService.durationStream;
});

final currentIndexStreamProvider = StreamProvider<int?>((ref) {
  final audioService = ref.watch(audioServiceProvider);
  return audioService.currentIndexStream;
});

final currentSongProvider = StateProvider<SongModel?>((ref) => null);
final queueProvider = StateProvider<List<SongModel>>((ref) => []);
final currentIndexProvider = StateProvider<int>((ref) => 0);
final shuffleModeProvider = StateProvider<bool>((ref) => false);
final repeatModeProvider = StateProvider<LoopMode>((ref) => LoopMode.off);

class AudioService extends BaseAudioHandler {
  final Ref _ref;
  final AudioPlayer _player = AudioPlayer();
  ConcatenatingAudioSource? _playlist;
  
  AudioService(this._ref) {
    _initAudioSession();
    _listenToIndexChanges();
    _setupAudioHandler();
  }
  
  void _setupAudioHandler() {
    // Listen to player state changes and update media controls
    _player.playerStateStream.listen((playerState) {
      final playing = playerState.playing;
      final processingState = playerState.processingState;
      
      // Update playback state for lock screen and CarPlay
      playbackState.add(PlaybackState(
        controls: [
          MediaControl.skipToPrevious,
          if (playing) MediaControl.pause else MediaControl.play,
          MediaControl.skipToNext,
        ],
        systemActions: const {
          MediaAction.seek,
          MediaAction.seekForward,
          MediaAction.seekBackward,
        },
        androidCompactActionIndices: const [0, 1, 2],
        processingState: _mapProcessingState(processingState),
        playing: playing,
        updatePosition: _player.position,
        bufferedPosition: _player.bufferedPosition,
        speed: _player.speed,
        queueIndex: _player.currentIndex,
      ));
    });
    
    // Listen to position changes
    _player.positionStream.listen((position) {
      playbackState.add(playbackState.value.copyWith(
        updatePosition: position,
      ));
    });
    
    // Listen to current song changes and update media item
    _player.sequenceStateStream.listen((sequenceState) {
      final currentItem = sequenceState?.currentSource?.tag as MediaItem?;
      if (currentItem != null) {
        mediaItem.add(currentItem);
      }
    });
  }
  
  AudioProcessingState _mapProcessingState(ProcessingState state) {
    switch (state) {
      case ProcessingState.idle:
        return AudioProcessingState.idle;
      case ProcessingState.loading:
        return AudioProcessingState.loading;
      case ProcessingState.buffering:
        return AudioProcessingState.buffering;
      case ProcessingState.ready:
        return AudioProcessingState.ready;
      case ProcessingState.completed:
        return AudioProcessingState.completed;
    }
  }
  
  // Override AudioHandler methods for lock screen and CarPlay controls
  @override
  Future<void> play() async {
    await _player.play();
  }
  
  @override
  Future<void> pause() async {
    await _player.pause();
  }
  
  @override
  Future<void> stop() async {
    await _player.stop();
  }
  
  @override
  Future<void> seek(Duration position) async {
    await _player.seek(position);
  }
  
  @override
  Future<void> skipToNext() async {
    await _player.seekToNext();
  }
  
  @override
  Future<void> skipToPrevious() async {
    await _player.seekToPrevious();
  }
  
  @override
  Future<void> skipToQueueItem(int index) async {
    await _player.seek(Duration.zero, index: index);
  }
  
  @override
  Future<void> setShuffleMode(AudioServiceShuffleMode shuffleMode) async {
    final enabled = shuffleMode == AudioServiceShuffleMode.all;
    await _player.setShuffleModeEnabled(enabled);
    _ref.read(shuffleModeProvider.notifier).state = enabled;
  }
  
  @override
  Future<void> setRepeatMode(AudioServiceRepeatMode repeatMode) async {
    LoopMode loopMode;
    switch (repeatMode) {
      case AudioServiceRepeatMode.none:
        loopMode = LoopMode.off;
        break;
      case AudioServiceRepeatMode.one:
        loopMode = LoopMode.one;
        break;
      case AudioServiceRepeatMode.all:
        loopMode = LoopMode.all;
        break;
      case AudioServiceRepeatMode.group:
        loopMode = LoopMode.all;
        break;
    }
    await _player.setLoopMode(loopMode);
    _ref.read(repeatModeProvider.notifier).state = loopMode;
  }
  
  void _listenToIndexChanges() {
    _player.currentIndexStream.listen((index) {
      if (index != null) {
        final queue = _ref.read(queueProvider);
        if (index < queue.length) {
          _ref.read(currentSongProvider.notifier).state = queue[index];
          _ref.read(currentIndexProvider.notifier).state = index;
        }
      }
    });
  }
  
  Future<void> _initAudioSession() async {
    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration.music());
    
    // Enable lock screen controls and CarPlay
    session.interruptionEventStream.listen((event) {
      if (event.begin) {
        switch (event.type) {
          case AudioInterruptionType.duck:
            _player.setVolume(0.5);
            break;
          case AudioInterruptionType.pause:
          case AudioInterruptionType.unknown:
            pause();
            break;
        }
      } else {
        switch (event.type) {
          case AudioInterruptionType.duck:
            _player.setVolume(1.0);
            break;
          case AudioInterruptionType.pause:
            play();
            break;
          case AudioInterruptionType.unknown:
            break;
        }
      }
    });
    
    // Handle becoming noisy (headphones unplugged)
    session.becomingNoisyEventStream.listen((_) {
      pause();
    });
  }
  
  // Streams
  Stream<PlayerState> get playerStateStream => _player.playerStateStream;
  Stream<Duration> get positionStream => _player.positionStream;
  Stream<Duration?> get durationStream => _player.durationStream;
  Stream<int?> get currentIndexStream => _player.currentIndexStream;
  Stream<SequenceState?> get sequenceStateStream => _player.sequenceStateStream;
  
  // Getters
  bool get playing => _player.playing;
  Duration get position => _player.position;
  Duration? get duration => _player.duration;
  
  // Play a single song
  Future<void> playSong(SongModel song) async {
    final audioSource = AudioSource.uri(
      Uri.parse(song.audioUrl),
      tag: MediaItem(
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        artUri: Uri.parse(song.imageUrl),
        duration: Duration(seconds: song.duration),
        extras: {
          'url': song.audioUrl,
          'image': song.imageUrl,
        },
      ),
    );
    
    await _player.setAudioSource(audioSource);
    
    // Update media item for lock screen and CarPlay
    mediaItem.add(MediaItem(
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      artUri: Uri.parse(song.imageUrl),
      duration: Duration(seconds: song.duration),
      extras: {
        'url': song.audioUrl,
        'image': song.imageUrl,
      },
    ));
    
    await play();
  }
  
  // Play a list of songs
  Future<void> playQueue(List<SongModel> songs, {int initialIndex = 0}) async {
    if (songs.isEmpty) return;
    
    if (initialIndex >= songs.length) {
      initialIndex = 0;
    }
    
    final audioSources = songs.map((song) {
      return AudioSource.uri(
        Uri.parse(song.audioUrl),
        tag: MediaItem(
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          artUri: Uri.parse(song.imageUrl),
          duration: Duration(seconds: song.duration),
          extras: {
            'url': song.audioUrl,
            'image': song.imageUrl,
          },
        ),
      );
    }).toList();
    
    _playlist = ConcatenatingAudioSource(children: audioSources);
    await _player.setAudioSource(_playlist!, initialIndex: initialIndex);
    
    // Update queue for lock screen and CarPlay
    queue.add(songs.map((song) => MediaItem(
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      artUri: Uri.parse(song.imageUrl),
      duration: Duration(seconds: song.duration),
      extras: {
        'url': song.audioUrl,
        'image': song.imageUrl,
      },
    )).toList());
    
    await play();
  }
  
  // Add song to queue
  Future<void> addToQueue(SongModel song) async {
    if (_playlist != null) {
      final audioSource = AudioSource.uri(
        Uri.parse(song.audioUrl),
        tag: MediaItem(
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          artUri: Uri.parse(song.imageUrl),
          duration: Duration(seconds: song.duration),
          extras: {
            'url': song.audioUrl,
            'image': song.imageUrl,
          },
        ),
      );
      await _playlist!.add(audioSource);
      
      // Update queue for lock screen and CarPlay
      final currentQueue = queue.value ?? [];
      queue.add([
        ...currentQueue,
        MediaItem(
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          artUri: Uri.parse(song.imageUrl),
          duration: Duration(seconds: song.duration),
          extras: {
            'url': song.audioUrl,
            'image': song.imageUrl,
          },
        ),
      ]);
    }
  }
  
  // Playback controls - these now use the overridden methods
  Future<void> seekTo(Duration position) => seek(position);
  Future<void> skipToIndex(int index) => _player.seek(Duration.zero, index: index);
  
  // Shuffle & Repeat
  Future<void> setShuffleModeEnabled(bool enabled) async {
    await _player.setShuffleModeEnabled(enabled);
    await setShuffleMode(enabled ? AudioServiceShuffleMode.all : AudioServiceShuffleMode.none);
  }
  
  Future<void> setLoopMode(LoopMode mode) async {
    await _player.setLoopMode(mode);
    AudioServiceRepeatMode repeatMode;
    switch (mode) {
      case LoopMode.off:
        repeatMode = AudioServiceRepeatMode.none;
        break;
      case LoopMode.one:
        repeatMode = AudioServiceRepeatMode.one;
        break;
      case LoopMode.all:
        repeatMode = AudioServiceRepeatMode.all;
        break;
    }
    await setRepeatMode(repeatMode);
  }
  
  // Volume
  Future<void> setVolume(double volume) => _player.setVolume(volume);
  
  // Dispose
  void dispose() {
    _player.dispose();
  }
}
