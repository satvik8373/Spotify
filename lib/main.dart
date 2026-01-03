import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:just_audio_background/just_audio_background.dart';

import 'firebase_options.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/services/deep_link_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize JustAudio background service for lock screen controls
  await JustAudioBackground.init(
    androidNotificationChannelId: 'com.mavrixfy.mavrixfy.channel.audio',
    androidNotificationChannelName: 'Mavrixfy Audio playback',
    androidNotificationChannelDescription: 'Mavrixfy music player controls',
    androidNotificationOngoing: true,
    androidStopForegroundOnPause: true,
    artDownscaleWidth: 512,
    artDownscaleHeight: 512,
    fastForwardInterval: const Duration(seconds: 10),
    rewindInterval: const Duration(seconds: 10),
    preloadArtwork: true,
  );
  
  // Set system UI immediately for faster perceived boot
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.black,
    ),
  );
  
  // Initialize critical services before app starts
  await _initCriticalServices();
  
  // Run app with initialized services
  runApp(const ProviderScope(child: MavrixfyApp()));
}

// Initialize critical services that providers depend on
Future<void> _initCriticalServices() async {
  try {
    // Initialize Hive first (required by theme provider)
    await Hive.initFlutter();
    await Hive.openBox('settings');
    await Hive.openBox('cache');
    debugPrint('Hive initialized successfully');
  } catch (e) {
    debugPrint('Hive initialization failed: $e');
    // Continue without Hive for now
  }
  
  // Initialize Firebase with proper options
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    debugPrint('Firebase initialized successfully');
  } catch (e) {
    debugPrint('Firebase initialization failed: $e');
    // Continue without Firebase for now
  }
}

// Initialize remaining services after app starts
Future<void> _initRemainingServices() async {
  try {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
    debugPrint('System orientation set successfully');
  } catch (e) {
    debugPrint('System orientation setup failed: $e');
  }
}

class MavrixfyApp extends ConsumerStatefulWidget {
  const MavrixfyApp({super.key});

  @override
  ConsumerState<MavrixfyApp> createState() => _MavrixfyAppState();
}

class _MavrixfyAppState extends ConsumerState<MavrixfyApp> {
  bool _initialized = false;
  bool _deepLinkInitialized = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      await _initRemainingServices();
      if (mounted) {
        setState(() => _initialized = true);
      }
    } catch (e) {
      debugPrint('Remaining services initialization failed: $e');
      if (mounted) {
        setState(() => _initialized = true);
      }
    }
  }

  void _initializeDeepLinks() {
    if (!_deepLinkInitialized) {
      try {
        final router = ref.read(appRouterProvider);
        final deepLinkService = ref.read(deepLinkServiceProvider);
        deepLinkService.initialize(ref, router);
        _deepLinkInitialized = true;
        debugPrint('Deep link service initialized successfully');
      } catch (e) {
        debugPrint('Deep link service initialization failed: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      // Show minimal splash while initializing
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: ThemeData.dark().copyWith(
          scaffoldBackgroundColor: const Color(0xFF121212),
        ),
        home: const Scaffold(
          backgroundColor: Color(0xFF121212),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(color: Color(0xFF1ED760), strokeWidth: 2),
                SizedBox(height: 16),
                Text(
                  'Loading Mavrixfy...',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    try {
      final themeMode = ref.watch(themeModeProvider);
      final router = ref.watch(appRouterProvider);
      
      // Initialize deep links after router is available
      _initializeDeepLinks();
      
      return MaterialApp.router(
        title: 'Mavrixfy',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: themeMode,
        routerConfig: router,
      );
    } catch (e) {
      debugPrint('App build error: $e');
      // Fallback if routing fails
      return MaterialApp(
        title: 'Mavrixfy',
        debugShowCheckedModeBanner: false,
        theme: ThemeData.dark().copyWith(
          scaffoldBackgroundColor: const Color(0xFF121212),
          primaryColor: const Color(0xFF1DB954),
        ),
        home: Scaffold(
          backgroundColor: const Color(0xFF121212),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.error_outline,
                  size: 64,
                  color: Color(0xFFE91429),
                ),
                const SizedBox(height: 16),
                const Text(
                  'App Loading Error',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Error: $e',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFFB3B3B3),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    // Restart the app
                    setState(() {
                      _initialized = false;
                    });
                    _init();
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );
    }
  }
}
