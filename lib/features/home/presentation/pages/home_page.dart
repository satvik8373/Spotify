import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/audio_service.dart';
import '../../../player/domain/models/song_model.dart';
import '../../../playlist/domain/models/playlist_model.dart';
import '../providers/home_provider.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  String _activeTab = 'all';

  @override
  Widget build(BuildContext context) {
    final homeData = ref.watch(homeDataProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(homeDataProvider);
          },
          color: const Color(0xFF1ED760),
          backgroundColor: AppColors.surface,
          child: homeData.when(
            data: (data) => CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: _buildMobileHeader(context)),
                SliverToBoxAdapter(child: _buildTabButtons()),
                SliverToBoxAdapter(
                  child: _buildRecentlyPlayedGrid(context, ref, data.publicPlaylists),
                ),
                if (data.publicPlaylists.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _buildPlaylistSection(context, 'Popular Playlists', data.publicPlaylists),
                  ),
                if (data.featuredPlaylists.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _buildPlaylistSection(context, 'Made For You', data.featuredPlaylists),
                  ),
                if (data.trending.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _buildSongSection(context, ref, 'Trending Songs', data.trending),
                  ),
                if (data.bollywoodSongs.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _buildSongSection(context, ref, 'Bollywood Hits', data.bollywoodSongs),
                  ),
                if (data.hollywoodSongs.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _buildSongSection(context, ref, 'International Hits', data.hollywoodSongs),
                  ),
                if (data.hindiSongs.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _buildSongSection(context, ref, 'Hindi Top Songs', data.hindiSongs),
                  ),
                if (data.newReleases.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _buildSongSection(context, ref, 'New Releases', data.newReleases),
                  ),
                const SliverToBoxAdapter(child: SizedBox(height: 140)),
              ],
            ),
            loading: () => _buildLoadingState(),
            error: (error, stack) => _buildErrorState(error, ref),
          ),
        ),
      ),
    );
  }

  Widget _buildMobileHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () => context.push('/profile'),
            child: Container(
              width: 32, height: 32,
              decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.grey[800]),
              child: const Icon(Icons.person, size: 20, color: Colors.white70),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined, size: 24),
            onPressed: () {},
            color: Colors.white,
          ),
        ],
      ),
    );
  }

  Widget _buildTabButtons() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Row(
        children: [
          _buildTabButton('All', 'all'),
          const SizedBox(width: 8),
          _buildTabButton('Music', 'music'),
          const SizedBox(width: 8),
          _buildTabButton('Podcasts', 'podcasts'),
        ],
      ),
    );
  }

  Widget _buildTabButton(String label, String tab) {
    final isActive = _activeTab == tab;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = tab),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : const Color(0xFF2A2A2A),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label, style: TextStyle(
          color: isActive ? Colors.black : Colors.white,
          fontSize: 13, fontWeight: FontWeight.w600,
        )),
      ),
    );
  }

  Widget _buildRecentlyPlayedGrid(BuildContext context, WidgetRef ref, List<PlaylistModel> playlists) {
    final allItems = <_RecentCardData>[
      _RecentCardData(name: 'Liked Songs', image: 'https://misc.scdn.co/liked-songs/liked-songs-640.png', route: '/liked-songs'),
    ];
    for (final p in playlists) {
      allItems.add(_RecentCardData(name: p.name, image: p.imageUrl, route: '/playlist/${p.id}'));
    }
    final displayItems = allItems.take(8).toList();
    
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
      child: GridView.builder(
        shrinkWrap: true, 
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2, childAspectRatio: 3.2, crossAxisSpacing: 8, mainAxisSpacing: 8,
        ),
        itemCount: displayItems.length,
        itemBuilder: (ctx, i) {
          final item = displayItems[i];
          return _RecentCard(name: item.name, image: item.image, onTap: () => context.push(item.route));
        },
      ),
    );
  }

  Widget _buildPlaylistSection(BuildContext context, String title, List<PlaylistModel> playlists) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
          GestureDetector(
            onTap: () => context.push('/library'),
            child: Text('SHOW ALL', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey[400], letterSpacing: 1)),
          ),
        ]),
      ),
      SizedBox(
        height: 200,
        child: ListView.builder(
          scrollDirection: Axis.horizontal, 
          padding: const EdgeInsets.symmetric(horizontal: 8),
          itemCount: playlists.length,
          cacheExtent: 500, // Preload more items
          itemBuilder: (ctx, i) => _PlaylistCard(playlist: playlists[i], onTap: () => context.push('/playlist/${playlists[i].id}')),
        ),
      ),
    ]);
  }

  Widget _buildSongSection(BuildContext context, WidgetRef ref, String title, List<SongModel> songs) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
        child: Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
      ),
      SizedBox(
        height: 200,
        child: ListView.builder(
          scrollDirection: Axis.horizontal, 
          padding: const EdgeInsets.symmetric(horizontal: 8),
          itemCount: songs.length,
          cacheExtent: 500, // Preload more items
          itemBuilder: (ctx, i) => _SongCard(song: songs[i], onTap: () {
            ref.read(currentSongProvider.notifier).state = songs[i];
            ref.read(queueProvider.notifier).state = songs;
            ref.read(currentIndexProvider.notifier).state = i;
            ref.read(audioServiceProvider).playQueue(songs, initialIndex: i);
          }),
        ),
      ),
    ]);
  }

  Widget _buildLoadingState() {
    return const Center(
      child: CircularProgressIndicator(color: Color(0xFF1ED760), strokeWidth: 2),
    );
  }

  Widget _buildErrorState(Object error, WidgetRef ref) {
    return Center(child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.wifi_off, size: 64, color: Colors.grey),
        const SizedBox(height: 16),
        const Text('Failed to load music', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
        const SizedBox(height: 8),
        Text('Check your internet connection', style: TextStyle(fontSize: 14, color: Colors.grey[400])),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: () => ref.invalidate(homeDataProvider),
          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1ED760), foregroundColor: Colors.black),
          child: const Text('Retry'),
        ),
      ]),
    ));
  }
}


// Optimized image widget - no fade, instant display
class _FastImage extends StatelessWidget {
  final String url;
  final double width;
  final double height;
  final BorderRadius? borderRadius;

  const _FastImage({required this.url, required this.width, required this.height, this.borderRadius});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.zero,
      child: CachedNetworkImage(
        imageUrl: url,
        width: width,
        height: height,
        fit: BoxFit.cover,
        fadeInDuration: Duration.zero, // No fade
        fadeOutDuration: Duration.zero, // No fade
        placeholderFadeInDuration: Duration.zero, // No fade
        memCacheWidth: (width * 2).toInt(), // Optimize memory
        memCacheHeight: (height * 2).toInt(),
        placeholder: (c, u) => Container(width: width, height: height, color: const Color(0xFF282828)),
        errorWidget: (c, u, e) => Container(
          width: width, height: height, color: const Color(0xFF282828),
          child: Icon(Icons.music_note, size: width * 0.4, color: Colors.grey),
        ),
      ),
    );
  }
}

class _RecentCard extends StatelessWidget {
  final String name, image;
  final VoidCallback onTap;
  const _RecentCard({required this.name, required this.image, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(color: const Color(0xFF2A2A2A), borderRadius: BorderRadius.circular(4)),
        child: Row(children: [
          _FastImage(
            url: image, width: 56, height: 56,
            borderRadius: const BorderRadius.only(topLeft: Radius.circular(4), bottomLeft: Radius.circular(4)),
          ),
          Expanded(child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white), maxLines: 2, overflow: TextOverflow.ellipsis),
          )),
        ]),
      ),
    );
  }
}

class _PlaylistCard extends StatelessWidget {
  final PlaylistModel playlist;
  final VoidCallback onTap;
  const _PlaylistCard({required this.playlist, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 150, margin: const EdgeInsets.symmetric(horizontal: 6), padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _FastImage(url: playlist.imageUrl, width: 126, height: 126, borderRadius: BorderRadius.circular(4)),
          const SizedBox(height: 10),
          Text(playlist.name, style: TextStyle(fontSize: 13, color: Colors.grey[400]), maxLines: 2, overflow: TextOverflow.ellipsis),
        ]),
      ),
    );
  }
}

class _SongCard extends StatelessWidget {
  final SongModel song;
  final VoidCallback onTap;
  const _SongCard({required this.song, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 150, margin: const EdgeInsets.symmetric(horizontal: 6), padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _FastImage(url: song.imageUrl, width: 126, height: 126, borderRadius: BorderRadius.circular(4)),
          const SizedBox(height: 10),
          Text(song.title, style: TextStyle(fontSize: 13, color: Colors.grey[400]), maxLines: 2, overflow: TextOverflow.ellipsis),
        ]),
      ),
    );
  }
}

class _RecentCardData {
  final String name;
  final String image;
  final String route;
  const _RecentCardData({required this.name, required this.image, required this.route});
}
