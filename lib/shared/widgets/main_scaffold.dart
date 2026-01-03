import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/services/audio_service.dart';
import '../../features/player/presentation/widgets/mini_player.dart';

class MainScaffold extends ConsumerWidget {
  final Widget child;
  
  const MainScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentSong = ref.watch(currentSongProvider);
    final currentPath = GoRouterState.of(context).matchedLocation;
    
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          child,
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withOpacity(0.85),
                    Colors.black,
                  ],
                ),
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (currentSong != null) 
                      const Padding(
                        padding: EdgeInsets.fromLTRB(8, 8, 8, 4),
                        child: MiniPlayer(),
                      ),
                    Padding(
                      padding: const EdgeInsets.only(top: 8, bottom: 10),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _NavItem(
                            icon: Icons.home_outlined,
                            activeIcon: Icons.home,
                            label: 'Home',
                            isActive: currentPath == '/home',
                            onTap: () => context.go('/home'),
                          ),
                          _NavItem(
                            icon: Icons.search_outlined,
                            activeIcon: Icons.search,
                            label: 'Search',
                            isActive: currentPath == '/search',
                            onTap: () => context.go('/search'),
                          ),
                          _NavItem(
                            icon: Icons.library_music_outlined,
                            activeIcon: Icons.library_music,
                            label: 'Your Library',
                            isActive: currentPath == '/library',
                            onTap: () => context.go('/library'),
                          ),
                          _NavItem(
                            icon: Icons.favorite_outline,
                            activeIcon: Icons.favorite,
                            label: 'Liked Songs',
                            isActive: currentPath.startsWith('/liked'),
                            onTap: () => context.go('/liked-songs'),
                            activeColor: AppColors.primary,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;
  final Color? activeColor;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isActive,
    required this.onTap,
    this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    final color = isActive 
        ? (activeColor ?? Colors.white) 
        : Colors.grey[400];
    
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 70,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isActive ? activeIcon : icon,
              color: color,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
