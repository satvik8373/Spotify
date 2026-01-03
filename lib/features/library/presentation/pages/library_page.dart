import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/auth_provider.dart';
import '../providers/library_provider.dart';
import '../../../playlist/domain/models/playlist_model.dart';

class LibraryPage extends ConsumerStatefulWidget {
  const LibraryPage({super.key});

  @override
  ConsumerState<LibraryPage> createState() => _LibraryPageState();
}

class _LibraryPageState extends ConsumerState<LibraryPage> {
  String _selectedFilter = 'All';
  final List<String> _filters = ['All', 'Playlists', 'Albums', 'Artists'];
  
  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).valueOrNull;
    final libraryItems = ref.watch(libraryItemsProvider);
    
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Profile Avatar
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: AppColors.primary,
                    backgroundImage: user?.photoURL != null
                        ? NetworkImage(user!.photoURL!)
                        : null,
                    child: user?.photoURL == null
                        ? Text(
                            user?.displayName?.substring(0, 1).toUpperCase() ?? 'U',
                            style: const TextStyle(
                              color: Colors.black,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Your Library',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.search),
                    onPressed: () {},
                  ),
                  IconButton(
                    icon: const Icon(Icons.add),
                    onPressed: () => _showCreatePlaylistDialog(),
                  ),
                ],
              ),
            ),
            
            // Filters
            SizedBox(
              height: 40,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _filters.length,
                itemBuilder: (context, index) {
                  final filter = _filters[index];
                  final isSelected = filter == _selectedFilter;
                  
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(filter),
                      selected: isSelected,
                      onSelected: (selected) {
                        setState(() {
                          _selectedFilter = filter;
                        });
                      },
                      backgroundColor: AppColors.surface,
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.black : AppColors.textPrimary,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  );
                },
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Library Items
            Expanded(
              child: libraryItems.when(
                data: (items) {
                  final filteredItems = _filterItems(items);
                  
                  return ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      // Liked Songs Card
                      _LikedSongsCard(
                        onTap: () => context.push('/liked-songs'),
                      ),
                      
                      const SizedBox(height: 8),
                      
                      // Playlists
                      ...filteredItems.map((item) => _LibraryItemTile(item: item)),
                      
                      const SizedBox(height: 100),
                    ],
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, __) => const Center(child: Text('Failed to load library')),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  List<LibraryItem> _filterItems(List<LibraryItem> items) {
    if (_selectedFilter == 'All') return items;
    
    return items.where((item) {
      switch (_selectedFilter) {
        case 'Playlists':
          return item.type == LibraryItemType.playlist;
        case 'Albums':
          return item.type == LibraryItemType.album;
        case 'Artists':
          return item.type == LibraryItemType.artist;
        default:
          return true;
      }
    }).toList();
  }
  
  void _showCreatePlaylistDialog() {
    final nameController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Create Playlist'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            hintText: 'Playlist name',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              if (nameController.text.isNotEmpty) {
                ref.read(libraryItemsProvider.notifier).createPlaylist(
                  nameController.text,
                );
                Navigator.pop(context);
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}

class _LikedSongsCard extends StatelessWidget {
  final VoidCallback onTap;
  
  const _LikedSongsCard({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF450AF5), Color(0xFFC4EFD9)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Icon(
                Icons.favorite,
                color: Colors.white,
                size: 28,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Liked Songs',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Row(
                    children: [
                      const Icon(Icons.push_pin, size: 14, color: AppColors.primary),
                      const SizedBox(width: 4),
                      Text(
                        'Playlist',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LibraryItemTile extends StatelessWidget {
  final LibraryItem item;
  
  const _LibraryItemTile({required this.item});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(item.type == LibraryItemType.artist ? 28 : 4),
        child: CachedNetworkImage(
          imageUrl: item.imageUrl,
          width: 56,
          height: 56,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(
            color: AppColors.surface,
            child: Icon(
              item.type == LibraryItemType.artist ? Icons.person : Icons.music_note,
            ),
          ),
          errorWidget: (context, url, error) => Container(
            color: AppColors.surface,
            child: Icon(
              item.type == LibraryItemType.artist ? Icons.person : Icons.music_note,
            ),
          ),
        ),
      ),
      title: Text(
        item.name,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        item.subtitle,
        style: TextStyle(color: AppColors.textSecondary),
      ),
      onTap: () {
        switch (item.type) {
          case LibraryItemType.playlist:
            context.push('/playlist/${item.id}');
            break;
          case LibraryItemType.album:
            context.push('/album/${item.id}');
            break;
          case LibraryItemType.artist:
            // Navigate to artist
            break;
        }
      },
    );
  }
}
