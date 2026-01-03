import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/search/presentation/pages/search_page.dart';
import '../../features/library/presentation/pages/library_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/player/presentation/pages/player_page.dart';
import '../../features/playlist/presentation/pages/playlist_page.dart';
import '../../features/album/presentation/pages/album_page.dart';
import '../../features/liked_songs/presentation/pages/liked_songs_page.dart';
import '../../shared/widgets/main_scaffold.dart';
import '../providers/auth_provider.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);
  
  return GoRouter(
    initialLocation: '/home',
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull != null;
      final isLoggingIn = state.matchedLocation == '/login' || 
                          state.matchedLocation == '/register';
      
      if (!isLoggedIn && !isLoggingIn) {
        return '/login';
      }
      
      if (isLoggedIn && isLoggingIn) {
        return '/home';
      }
      
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => const NoTransitionPage(
          child: LoginPage(),
        ),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (context, state) => const NoTransitionPage(
          child: RegisterPage(),
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => MainScaffold(child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomePage(),
            ),
          ),
          GoRoute(
            path: '/search',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SearchPage(),
            ),
          ),
          GoRoute(
            path: '/library',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: LibraryPage(),
            ),
          ),
          GoRoute(
            path: '/liked-songs',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: LikedSongsPage(),
            ),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfilePage(),
            ),
          ),
          GoRoute(
            path: '/playlist/:id',
            pageBuilder: (context, state) => NoTransitionPage(
              child: PlaylistPage(
                playlistId: state.pathParameters['id']!,
              ),
            ),
          ),
          GoRoute(
            path: '/album/:id',
            pageBuilder: (context, state) => NoTransitionPage(
              child: AlbumPage(
                albumId: state.pathParameters['id']!,
              ),
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/player',
        pageBuilder: (context, state) => CustomTransitionPage(
          child: const PlayerPage(),
          transitionDuration: const Duration(milliseconds: 200),
          reverseTransitionDuration: const Duration(milliseconds: 150),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 1),
                end: Offset.zero,
              ).animate(CurvedAnimation(
                parent: animation,
                curve: Curves.easeOut,
              )),
              child: child,
            );
          },
        ),
      ),
    ],
  );
});
