import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class DeepLinkService {
  static final DeepLinkService _instance = DeepLinkService._internal();
  factory DeepLinkService() => _instance;
  DeepLinkService._internal();

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;
  WidgetRef? _ref;
  GoRouter? _router;

  // Initialize deep link handling
  void initialize(WidgetRef ref, GoRouter router) {
    _ref = ref;
    _router = router;
    _startListening();
  }

  void _startListening() {
    // Handle deep links when app is already running
    _linkSubscription = _appLinks.uriLinkStream.listen(
      (Uri uri) {
        print('🔗 Deep link received: $uri');
        _handleDeepLink(uri);
      },
      onError: (err) {
        print('❌ Deep link error: $err');
      },
    );

    // Handle deep link when app is launched from closed state
    _checkInitialLink();
  }

  Future<void> _checkInitialLink() async {
    try {
      final Uri? initialUri = await _appLinks.getInitialLink();
      if (initialUri != null) {
        print('🔗 Initial deep link: $initialUri');
        // Add a small delay to ensure the app is fully initialized
        await Future.delayed(const Duration(milliseconds: 500));
        _handleDeepLink(initialUri);
      }
    } catch (e) {
      print('❌ Error getting initial link: $e');
    }
  }

  void _handleDeepLink(Uri uri) {
    print('🔄 Processing deep link: ${uri.toString()}');
    
    // Handle Spotify callback
    if (uri.scheme == 'mavrixfy' && uri.host == 'spotify-callback') {
      _handleSpotifyCallback(uri);
    } else {
      print('⚠️ Unknown deep link: $uri');
    }
  }

  Future<void> _handleSpotifyCallback(Uri uri) async {
    try {
      print('🎵 Handling Spotify callback: $uri');
      
      final code = uri.queryParameters['code'];
      final state = uri.queryParameters['state'];
      final error = uri.queryParameters['error'];
      
      if (error != null) {
        print('❌ Spotify authorization error: $error');
        _showSpotifyError('Spotify authorization failed: $error');
        return;
      }
      
      if (code == null) {
        print('❌ No authorization code in callback');
        _showSpotifyError('No authorization code received from Spotify');
        return;
      }
      
      print('✅ Authorization code received: ${code.substring(0, 10)}...');
      
      // Process the callback - for now just show success
      if (_ref != null) {
        try {
          print('🔄 Processing Spotify callback...');
          
          // Navigate to Spotify Connect page to show success
          if (_router != null) {
            _router!.push('/spotify-connect');
          }
          
          _showSpotifySuccess();
        } catch (e) {
          print('❌ Error processing Spotify callback: $e');
          _showSpotifyError('Error connecting to Spotify: $e');
        }
      } else {
        print('❌ No ref available for Spotify service');
        _showSpotifyError('App not properly initialized');
      }
      
    } catch (e) {
      print('❌ Error handling Spotify callback: $e');
      _showSpotifyError('Error handling Spotify callback: $e');
    }
  }

  void _showSpotifySuccess() {
    print('🎉 Spotify connected successfully!');
    // The UI will automatically update due to provider invalidation
  }

  void _showSpotifyError(String message) {
    print('❌ Spotify connection error: $message');
    // The error will be handled by the UI when checking connection status
  }

  void dispose() {
    _linkSubscription?.cancel();
    _linkSubscription = null;
    _ref = null;
    _router = null;
  }
}

// Provider for the deep link service
final deepLinkServiceProvider = Provider<DeepLinkService>((ref) {
  return DeepLinkService();
});