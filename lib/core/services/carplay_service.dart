import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final carPlayServiceProvider = Provider<CarPlayService>((ref) {
  return CarPlayService();
});

class CarPlayService {
  static const MethodChannel _channel = MethodChannel('mavrixfy/carplay');
  
  CarPlayService() {
    _initCarPlay();
  }
  
  Future<void> _initCarPlay() async {
    try {
      await _channel.invokeMethod('initCarPlay');
    } catch (e) {
      print('CarPlay initialization failed: $e');
    }
  }
  
  Future<void> updateNowPlaying({
    required String title,
    required String artist,
    required String album,
    required String artworkUrl,
    required Duration duration,
    required Duration position,
    required bool isPlaying,
  }) async {
    try {
      await _channel.invokeMethod('updateNowPlaying', {
        'title': title,
        'artist': artist,
        'album': album,
        'artworkUrl': artworkUrl,
        'duration': duration.inSeconds,
        'position': position.inSeconds,
        'isPlaying': isPlaying,
      });
    } catch (e) {
      print('Failed to update CarPlay now playing: $e');
    }
  }
  
  Future<void> setPlaybackState(bool isPlaying) async {
    try {
      await _channel.invokeMethod('setPlaybackState', {
        'isPlaying': isPlaying,
      });
    } catch (e) {
      print('Failed to set CarPlay playback state: $e');
    }
  }
}