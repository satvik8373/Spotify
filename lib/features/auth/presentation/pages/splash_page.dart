import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/auth_provider.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }
  
  Future<void> _checkAuth() async {
    // Minimal delay for splash - just enough to show branding
    await Future.delayed(const Duration(milliseconds: 500));
    
    if (!mounted) return;
    
    final authState = ref.read(authStateProvider);
    
    authState.when(
      data: (user) {
        if (user != null) {
          context.go('/home');
        } else {
          context.go('/login');
        }
      },
      loading: () {
        // Wait for auth state
        ref.listen(authStateProvider, (previous, next) {
          next.when(
            data: (user) {
              if (user != null) {
                context.go('/home');
              } else {
                context.go('/login');
              }
            },
            loading: () {},
            error: (_, __) => context.go('/login'),
          );
        });
      },
      error: (_, __) => context.go('/login'),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(
                Icons.music_note,
                size: 56,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Mavrixfy',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 24),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
