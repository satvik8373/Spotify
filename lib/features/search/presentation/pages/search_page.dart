import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/audio_service.dart';
import '../../../player/domain/models/song_model.dart';
import '../providers/search_provider.dart';
import '../../../../shared/widgets/song_tile.dart';

class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();
  
  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final searchQuery = ref.watch(searchQueryProvider);
    final searchResults = ref.watch(searchResultsProvider);
    final browseCategories = ref.watch(browseCategoriesProvider);
    
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(
                'Search',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            
            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: TextField(
                controller: _searchController,
                focusNode: _focusNode,
                decoration: InputDecoration(
                  hintText: 'What do you want to listen to?',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            ref.read(searchQueryProvider.notifier).state = '';
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: AppColors.textPrimary,
                  hintStyle: TextStyle(color: AppColors.background.withOpacity(0.6)),
                  prefixIconColor: AppColors.background,
                  suffixIconColor: AppColors.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide.none,
                  ),
                ),
                style: const TextStyle(color: AppColors.background),
                onChanged: (value) {
                  ref.read(searchQueryProvider.notifier).state = value;
                },
              ),
            ),
            
            // Content
            Expanded(
              child: searchQuery.isEmpty
                  ? _buildBrowseSection(browseCategories)
                  : _buildSearchResults(searchResults),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildBrowseSection(AsyncValue<List<BrowseCategory>> categories) {
    return categories.when(
      data: (data) => CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(
                'Browse all',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.8,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final category = data[index];
                  return _CategoryCard(
                    category: category,
                    onTap: () {
                      _searchController.text = category.searchQuery;
                      ref.read(searchQueryProvider.notifier).state = category.searchQuery;
                    },
                  );
                },
                childCount: data.length,
              ),
            ),
          ),
          const SliverToBoxAdapter(
            child: SizedBox(height: 100),
          ),
        ],
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => const Center(child: Text('Failed to load categories')),
    );
  }
  
  Widget _buildSearchResults(AsyncValue<SearchResults> results) {
    return results.when(
      data: (data) {
        if (data.songs.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.search_off,
                  size: 64,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(height: 16),
                Text(
                  'No results found',
                  style: TextStyle(
                    fontSize: 18,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Try searching for something else',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary.withOpacity(0.7),
                  ),
                ),
              ],
            ),
          );
        }
        
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: data.songs.length + 1,
          itemBuilder: (context, index) {
            if (index == 0) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  '${data.songs.length} Songs',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              );
            }
            
            final song = data.songs[index - 1];
            return SongTile(
              song: song,
              onTap: () {
                ref.read(currentSongProvider.notifier).state = song;
                ref.read(queueProvider.notifier).state = data.songs;
                ref.read(currentIndexProvider.notifier).state = index - 1;
                ref.read(audioServiceProvider).playQueue(data.songs, initialIndex: index - 1);
              },
            );
          },
        );
      },
      loading: () => const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Searching...'),
          ],
        ),
      ),
      error: (error, __) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Search failed: $error'),
          ],
        ),
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final BrowseCategory category;
  final VoidCallback onTap;
  
  const _CategoryCard({required this.category, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: category.color,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Stack(
          children: [
            if (category.imageUrl.isNotEmpty)
              Positioned(
                right: -10,
                bottom: -10,
                child: Transform.rotate(
                  angle: 0.3,
                  child: Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: CachedNetworkImage(
                        imageUrl: category.imageUrl,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) => Container(
                          color: Colors.white24,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                category.name,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
