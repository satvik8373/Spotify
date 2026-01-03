import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/auth_provider.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).valueOrNull;
    final themeMode = ref.watch(themeModeProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile Header
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundColor: AppColors.primary,
                  backgroundImage: user?.photoURL != null
                      ? NetworkImage(user!.photoURL!)
                      : null,
                  child: user?.photoURL == null
                      ? Text(
                          user?.displayName?.substring(0, 1).toUpperCase() ?? 'U',
                          style: const TextStyle(
                            fontSize: 36,
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                const SizedBox(height: 16),
                Text(
                  user?.displayName ?? 'User',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  user?.email ?? '',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Settings Section
          const Text(
            'Settings',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          // Theme Toggle
          ListTile(
            leading: Icon(
              themeMode == ThemeMode.dark ? Icons.dark_mode : Icons.light_mode,
            ),
            title: const Text('Dark Mode'),
            trailing: Switch(
              value: themeMode == ThemeMode.dark,
              onChanged: (value) {
                ref.read(themeModeProvider.notifier).toggleTheme();
              },
              activeColor: AppColors.primary,
            ),
          ),
          
          const Divider(),
          
          // Audio Quality
          ListTile(
            leading: const Icon(Icons.high_quality),
            title: const Text('Audio Quality'),
            subtitle: const Text('High'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showAudioQualityDialog(context),
          ),
          
          const Divider(),
          
          // Download Settings
          ListTile(
            leading: const Icon(Icons.download),
            title: const Text('Download Settings'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          
          const Divider(),
          
          // Notifications
          ListTile(
            leading: const Icon(Icons.notifications_outlined),
            title: const Text('Notifications'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          
          const Divider(),
          
          // Privacy
          ListTile(
            leading: const Icon(Icons.privacy_tip_outlined),
            title: const Text('Privacy'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          
          const Divider(),
          
          // About
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('About'),
            subtitle: const Text('Version 2.0.0'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          
          const SizedBox(height: 32),
          
          // Logout Button
          ElevatedButton(
            onPressed: () => _showLogoutDialog(context, ref),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              foregroundColor: AppColors.textPrimary,
              side: BorderSide(color: AppColors.textSecondary.withOpacity(0.3)),
            ),
            child: const Text('Log Out'),
          ),
          
          const SizedBox(height: 100),
        ],
      ),
    );
  }
  
  void _showAudioQualityDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Audio Quality'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: const Text('Low'),
              subtitle: const Text('24 kbps'),
              value: 'low',
              groupValue: 'high',
              onChanged: (value) => Navigator.pop(context),
            ),
            RadioListTile<String>(
              title: const Text('Normal'),
              subtitle: const Text('96 kbps'),
              value: 'normal',
              groupValue: 'high',
              onChanged: (value) => Navigator.pop(context),
            ),
            RadioListTile<String>(
              title: const Text('High'),
              subtitle: const Text('160 kbps'),
              value: 'high',
              groupValue: 'high',
              onChanged: (value) => Navigator.pop(context),
            ),
            RadioListTile<String>(
              title: const Text('Very High'),
              subtitle: const Text('320 kbps'),
              value: 'very_high',
              groupValue: 'high',
              onChanged: (value) => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }
  
  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Log Out'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(authControllerProvider.notifier).signOut();
              if (context.mounted) {
                context.go('/login');
              }
            },
            child: const Text('Log Out'),
          ),
        ],
      ),
    );
  }
}
