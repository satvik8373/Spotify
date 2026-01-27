import axios from 'axios';

// Updated to use more reliable JioSaavn API endpoints with fallbacks
const BASE_URL = 'https://saavn.sumit.co/api';
const FALLBACK_BASE_URL = 'https://jiosaavn-api-privatecvc2.vercel.app';
const BACKUP_BASE_URL = 'https://saavn.me';

export interface JioSaavnImage {
  quality: string;
  url: string;
}

export interface JioSaavnPlaylist {
  id: string;
  name: string;
  type: string;
  image: JioSaavnImage[];
  url: string;
  songCount: number;
  language: string;
  explicitContent: boolean;
}

export interface JioSaavnPlaylistResponse {
  success: boolean;
  data: {
    total: number;
    start: number;
    results: JioSaavnPlaylist[];
  };
}

export interface JioSaavnSong {
  id: string;
  name: string;
  type: string;
  year: string;
  releaseDate: string;
  duration: number;
  label: string;
  explicitContent: boolean;
  playCount: number;
  language: string;
  hasLyrics: boolean;
  lyricsId: string;
  url: string;
  copyright: string;
  album: {
    id: string;
    name: string;
    url: string;
  };
  artists: {
    primary: Array<{
      id: string;
      name: string;
      role: string;
      type: string;
      image: JioSaavnImage[];
      url: string;
    }>;
    featured: Array<{
      id: string;
      name: string;
      role: string;
      type: string;
      image: JioSaavnImage[];
      url: string;
    }>;
    all: Array<{
      id: string;
      name: string;
      role: string;
      type: string;
      image: JioSaavnImage[];
      url: string;
    }>;
  };
  image: JioSaavnImage[];
  downloadUrl: Array<{
    quality: string;
    url: string;
  }>;
}

export interface JioSaavnPlaylistDetails {
  success: boolean;
  data: {
    id: string;
    name: string;
    description: string;
    type: string;
    year: string;
    playCount: number;
    language: string;
    explicitContent: boolean;
    songCount: number;
    url: string;
    image: JioSaavnImage[];
    songs: JioSaavnSong[];
  };
}

// Enhanced category system with 2026-focused search terms and better trending logic
export interface PlaylistCategory {
  id: string;
  name: string;
  icon: string;
  searchTerms: string[];
  description: string;
  priority: number; // Higher priority categories show first
  color: string; // Theme color for the category
}

export const PLAYLIST_CATEGORIES: PlaylistCategory[] = [
  {
    id: 'trending',
    name: 'Trending Now',
    icon: '🔥',
    searchTerms: [
      'trending now 2026', 'top 50 2026', 'superhits 2026', 'chartbusters 2026', 
      'viral hits 2026', 'most played 2026', 'popular songs 2026', 'hit songs 2026', 
      'latest hits 2026', 'trending songs 2026', 'new hits 2026', 'fresh hits 2026', 
      'latest trending', 'trending hindi', 'trending bollywood', 'top charts 2026',
      'weekly top 50', 'monthly hits', 'current hits', 'now playing'
    ],
    description: 'Most popular songs right now in 2026',
    priority: 10,
    color: '#ff4444'
  },
  {
    id: 'bollywood',
    name: 'Bollywood',
    icon: '🎬',
    searchTerms: [
      'bollywood hits', 'hindi songs', 'bollywood superhits', 'hindi hit songs', 
      'bollywood chartbusters', 'bollywood collection', 'best of bollywood',
      'latest bollywood', 'new bollywood', 'bollywood 2026', 'fresh bollywood',
      'bollywood top', 'hindi latest', 'bollywood new releases', 'hindi new releases',
      'bollywood trending', 'hindi trending', 'bollywood popular', 'hindi popular',
      'bollywood evergreen', 'hindi classics', 'bollywood melodies'
    ],
    description: 'Latest and classic Bollywood music for 2026',
    priority: 9,
    color: '#ff6b35'
  },
  {
    id: 'romantic',
    name: 'Romantic',
    icon: '💕',
    searchTerms: [
      'romantic songs', 'love songs', 'romantic hits', 'love ballads',
      'romantic collection', 'valentine songs', 'bollywood romantic',
      'latest romantic', 'new love songs', 'romantic 2026', 'fresh romantic',
      'romantic latest', 'love latest', 'romantic trending', 'love trending',
      'romantic popular', 'love popular', 'romantic new', 'love new',
      'romantic melodies', 'love classics', 'heart touching songs'
    ],
    description: 'Love songs for every mood in 2026',
    priority: 8,
    color: '#ff69b4'
  },
  {
    id: 'punjabi',
    name: 'Punjabi',
    icon: '🎵',
    searchTerms: [
      'punjabi hits', 'punjabi songs', 'punjabi superhits', 'punjabi collection',
      'best of punjabi', 'punjabi chartbusters', 'punjabi top',
      'latest punjabi', 'new punjabi', 'punjabi 2026', 'fresh punjabi',
      'punjabi latest', 'punjabi new releases', 'punjabi popular', 'punjabi trending',
      'punjabi classics', 'punjabi melodies', 'punjabi evergreen'
    ],
    description: 'Best of Punjabi music for 2026',
    priority: 7,
    color: '#ffa500'
  },
  {
    id: 'party',
    name: 'Party',
    icon: '🎉',
    searchTerms: [
      'latest party 2026', 'new party songs 2026', 'party 2026', 'fresh party 2026',
      'party songs 2026', 'dance hits 2026', 'party music 2026', 'club songs 2026',
      'dance party 2026', 'party collection 2026', 'bollywood party 2026',
      'party latest', 'dance latest', 'party trending', 'dance trending'
    ],
    description: 'Get the party started in 2026',
    priority: 6,
    color: '#00ff88'
  },
  {
    id: 'workout',
    name: 'Workout',
    icon: '💪',
    searchTerms: [
      'latest workout 2026', 'new gym songs 2026', 'workout 2026', 'fresh fitness 2026',
      'workout songs 2026', 'gym music 2026', 'fitness songs 2026', 'motivation songs 2026',
      'workout latest', 'gym latest', 'fitness latest', 'workout trending'
    ],
    description: 'High-energy workout music for 2026',
    priority: 5,
    color: '#ff4757'
  },
  {
    id: 'devotional',
    name: 'Devotional',
    icon: '🙏',
    searchTerms: [
      'latest devotional 2026', 'new bhakti 2026', 'devotional 2026', 'fresh spiritual 2026',
      'devotional songs 2026', 'bhakti songs 2026', 'spiritual music 2026', 'religious songs 2026',
      'devotional latest', 'bhakti latest', 'spiritual latest', 'devotional trending'
    ],
    description: 'Spiritual and devotional songs for 2026',
    priority: 4,
    color: '#ffa726'
  },
  {
    id: 'retro',
    name: 'Retro Hits',
    icon: '📻',
    searchTerms: [
      '90s hits', '2000s hits', '80s songs', 'old hits', 'retro bollywood',
      'classic songs', 'golden hits', 'evergreen songs', 'vintage hits',
      'nostalgic songs', 'retro collection', 'classic collection'
    ],
    description: 'Golden oldies and retro classics',
    priority: 3,
    color: '#ab47bc'
  },
  {
    id: 'regional',
    name: 'Regional',
    icon: '🌍',
    searchTerms: [
      'latest tamil 2026', 'new telugu 2026', 'fresh kannada 2026', 'latest malayalam 2026',
      'tamil hits 2026', 'telugu songs 2026', 'kannada songs 2026', 'malayalam songs 2026',
      'marathi songs 2026', 'bengali songs 2026', 'south indian 2026', 'regional 2026',
      'tamil latest', 'telugu latest', 'kannada latest', 'malayalam latest'
    ],
    description: 'Regional language hits for 2026',
    priority: 2,
    color: '#26a69a'
  },
  {
    id: 'international',
    name: 'International',
    icon: '🌎',
    searchTerms: [
      'latest english 2026', 'new international 2026', 'english 2026', 'fresh pop 2026',
      'english songs 2026', 'international hits 2026', 'pop songs 2026', 'western music 2026',
      'english hits 2026', 'global hits 2026', 'english latest', 'international latest'
    ],
    description: 'International and English hits for 2026',
    priority: 1,
    color: '#42a5f5'
  }
];

class JioSaavnService {
  private axiosInstance;
  private fallbackInstance;
  private backupInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.fallbackInstance = axios.create({
      baseURL: FALLBACK_BASE_URL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.backupInstance = axios.create({
      baseURL: BACKUP_BASE_URL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  // Try multiple API endpoints with fallbacks for better reliability
  private async tryMultipleEndpoints<T>(
    endpoint: string, 
    params: any = {}, 
    method: 'GET' | 'POST' = 'GET'
  ): Promise<T> {
    const instances = [this.axiosInstance, this.fallbackInstance, this.backupInstance];
    
    for (let i = 0; i < instances.length; i++) {
      try {
        const response = await instances[i].request({
          method,
          url: endpoint,
          params: method === 'GET' ? params : undefined,
          data: method === 'POST' ? params : undefined,
        });
        
        if (response.data && (response.data.success !== false)) {
          return response.data;
        }
      } catch (error) {
        console.warn(`API endpoint ${i + 1} failed:`, error);
        if (i === instances.length - 1) {
          throw error;
        }
      }
    }
    
    throw new Error('All API endpoints failed');
  }

  // Get 2026 trending playlists with enhanced search terms and charts
  async get2026TrendingPlaylists(forceRefresh: boolean = false): Promise<JioSaavnPlaylist[]> {
    try {
      // Get both 2026-specific content and latest charts
      const [trending2026, latestCharts] = await Promise.allSettled([
        this.get2026SpecificTrending(forceRefresh),
        this.getLatestCharts2026(forceRefresh)
      ]);

      const allPlaylists: JioSaavnPlaylist[] = [];
      
      // Add 2026-specific trending results
      if (trending2026.status === 'fulfilled') {
        allPlaylists.push(...trending2026.value);
      }
      
      // Add latest charts results
      if (latestCharts.status === 'fulfilled') {
        allPlaylists.push(...latestCharts.value);
      }

      // If we don't have enough results, add fallback searches
      if (allPlaylists.length < 8) {
        try {
          const fallbackResults = await this.searchPlaylists('trending now', 8, forceRefresh);
          allPlaylists.push(...fallbackResults);
        } catch (error) {
          console.warn('Fallback search failed:', error);
        }
      }

      // Remove duplicates and prioritize 2026 content
      const uniquePlaylists = this.removeDuplicatePlaylists(allPlaylists);
      
      const filtered = uniquePlaylists
        .filter(playlist => playlist.songCount >= 8)
        .sort((a, b) => {
          // Prioritize 2026 content
          const a2026 = a.name.toLowerCase().includes('2026') ? 200 : 0;
          const b2026 = b.name.toLowerCase().includes('2026') ? 200 : 0;
          
          if (a2026 !== b2026) return b2026 - a2026;
          
          // Then prioritize trending keywords
          const trendingKeywords = ['trending', 'top', 'hit', 'superhit', 'latest', 'viral', 'chart'];
          const aTrending = trendingKeywords.some(keyword => 
            a.name.toLowerCase().includes(keyword)) ? 100 : 0;
          const bTrending = trendingKeywords.some(keyword => 
            b.name.toLowerCase().includes(keyword)) ? 100 : 0;
          
          if (aTrending !== bTrending) return bTrending - aTrending;
          
          // Finally sort by song count
          return b.songCount - a.songCount;
        });

      // If refreshing, shuffle the results to show different content
      return forceRefresh ? this.shuffleArray(filtered).slice(0, 12) : filtered.slice(0, 12);
    } catch (error) {
      console.error('Error fetching 2026 trending playlists:', error);
      // Fallback to regular trending search
      return this.searchPlaylists('trending now', 12, forceRefresh);
    }
  }

  // Get 2026-specific trending content
  private async get2026SpecificTrending(forceRefresh: boolean = false): Promise<JioSaavnPlaylist[]> {
    let trending2026Terms = [
      'trending now 2026',
      'top 50 2026', 
      'superhits 2026',
      'latest hits 2026',
      'viral hits 2026',
      'bollywood 2026',
      'hindi hits 2026'
    ];

    // If refreshing, randomize the terms
    if (forceRefresh) {
      trending2026Terms = this.shuffleArray(trending2026Terms);
    }

    const allPlaylists: JioSaavnPlaylist[] = [];
    
    // Search with 2026-specific terms
    for (const term of trending2026Terms.slice(0, 4)) {
      try {
        const response = await this.tryMultipleEndpoints<JioSaavnPlaylistResponse>(
          '/search/playlists',
          { 
            query: term, 
            limit: 6,
            page: forceRefresh ? Math.floor(Math.random() * 3) + 1 : 1
          }
        );
        
        if (response.success && response.data?.results) {
          allPlaylists.push(...response.data.results);
        }
      } catch (error) {
        console.warn(`Failed to search for ${term}:`, error);
      }
    }

    return allPlaylists;
  }

  // Get trending playlists that match JioSaavn's trending section (optimized for speed)
  async getTrendingPlaylists(limit: number = 20): Promise<JioSaavnPlaylist[]> {
    try {
      // Use fewer, more targeted search terms for faster loading
      const trendingTerms = [
        'trending now',
        'top 50',
        'superhits',
        'hit songs'
      ];

      const allPlaylists: JioSaavnPlaylist[] = [];
      
      // Search with fewer terms but get more results per term for speed
      const searchPromises = trendingTerms.slice(0, 2).map(async (term) => {
        try {
          const playlists = await this.searchPlaylists(term, limit);
          return playlists;
        } catch (error) {
          return [];
        }
      });

      const results = await Promise.all(searchPromises);
      results.forEach(playlists => allPlaylists.push(...playlists));

      // Remove duplicates and prioritize trending content
      const uniquePlaylists = this.removeDuplicatePlaylists(allPlaylists);
      
      // Sort by trending criteria (simplified for speed)
      return uniquePlaylists
        .sort((a, b) => {
          // Quick trending keyword check
          const trendingKeywords = ['trending', 'top', 'hit', 'superhit'];
          const aHasTrending = trendingKeywords.some(keyword => 
            a.name.toLowerCase().includes(keyword));
          const bHasTrending = trendingKeywords.some(keyword => 
            b.name.toLowerCase().includes(keyword));
          
          if (aHasTrending && !bHasTrending) return -1;
          if (!aHasTrending && bHasTrending) return 1;
          
          // Then sort by song count (more songs = more popular)
          return b.songCount - a.songCount;
        })
        .slice(0, limit);
    } catch (error) {
      // Fast fallback to regular trending search
      return this.searchPlaylists('trending now', limit);
    }
  }

  // Enhanced search with better logic and 2026 focus - with refresh randomization and minimum results guarantee
  async searchPlaylists(query: string = 'bollywood', limit: number = 20, forceRefresh: boolean = false): Promise<JioSaavnPlaylist[]> {
    try {
      // Add 2026 to query if it's trending-related and doesn't already have a year
      let enhancedQuery = query.toLowerCase();
      if ((enhancedQuery.includes('trending') || enhancedQuery.includes('latest') || 
           enhancedQuery.includes('new') || enhancedQuery.includes('hit')) && 
          !enhancedQuery.includes('2026') && !enhancedQuery.includes('2025') && 
          !enhancedQuery.includes('2024')) {
        enhancedQuery = `${query} 2026`;
      }

      // Add randomization for refresh to get different results
      if (forceRefresh) {
        const refreshVariations = [
          enhancedQuery,
          `${enhancedQuery} fresh`,
          `${enhancedQuery} updated`,
          `${enhancedQuery} latest`,
          `new ${enhancedQuery}`,
          `fresh ${enhancedQuery}`
        ];
        enhancedQuery = refreshVariations[Math.floor(Math.random() * refreshVariations.length)];
      }

      let results: JioSaavnPlaylist[] = [];

      // Try the enhanced query first
      try {
        const response = await this.tryMultipleEndpoints<JioSaavnPlaylistResponse>(
          '/search/playlists',
          { 
            query: enhancedQuery, 
            limit: forceRefresh ? limit + 10 : limit, // Get more results when refreshing
            page: forceRefresh ? Math.floor(Math.random() * 3) + 1 : 1 // Random page for refresh
          }
        );

        if (response.success && response.data?.results) {
          results = this.filterAndSortPlaylists(response.data.results, enhancedQuery);
        }
      } catch (error) {
        console.warn(`Primary search failed for "${enhancedQuery}":`, error);
      }

      // If we don't have enough results, try the original query
      if (results.length < Math.min(limit, 5)) {
        try {
          const fallbackResponse = await this.tryMultipleEndpoints<JioSaavnPlaylistResponse>(
            '/search/playlists',
            { 
              query: query, 
              limit: limit,
              page: 1
            }
          );

          if (fallbackResponse.success && fallbackResponse.data?.results) {
            const fallbackResults = this.filterAndSortPlaylists(fallbackResponse.data.results, query);
            // Merge results, avoiding duplicates
            const existingIds = new Set(results.map(p => p.id));
            const newResults = fallbackResults.filter(p => !existingIds.has(p.id));
            results = [...results, ...newResults];
          }
        } catch (error) {
          console.warn(`Fallback search failed for "${query}":`, error);
        }
      }

      const finalResults = forceRefresh ? this.shuffleArray(results).slice(0, limit) : results.slice(0, limit);
      console.log(`Search for "${query}" returned ${finalResults.length} playlists`);
      
      return finalResults;
    } catch (error) {
      console.error('Error searching playlists:', error);
      throw error;
    }
  }

  // Shuffle array for refresh randomization
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Smart playlist filtering and sorting logic with 2026 focus - More lenient filtering
  private filterAndSortPlaylists(playlists: JioSaavnPlaylist[], query: string): JioSaavnPlaylist[] {
    return playlists
      .filter(playlist => {
        // Be much more lenient for popular categories
        const isPopularCategory = ['bollywood', 'romantic', 'punjabi', 'hindi', 'love'].some(term => 
          query.toLowerCase().includes(term)
        );
        
        // Much lower minimum song requirements
        const minSongs = isPopularCategory ? 3 : // Very lenient for popular categories
                         query.toLowerCase().includes('trending') ? 5 : 
                         query.toLowerCase().includes('latest') || query.toLowerCase().includes('new') ? 3 : 5;
        
        if (playlist.songCount < minSongs) return false;
        
        // Filter out obviously bad playlists
        const name = playlist.name.toLowerCase();
        if (name.includes('test') || name.includes('temp') || name.length < 3) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Priority 1: 2026 content gets highest priority
        const a2026 = a.name.toLowerCase().includes('2026') ? 200 : 0;
        const b2026 = b.name.toLowerCase().includes('2026') ? 200 : 0;
        
        if (a2026 !== b2026) return b2026 - a2026;

        // Priority 2: Latest/Fresh content gets high priority
        const freshKeywords = ['latest', 'new', '2025', 'fresh', 'updated', 'recent'];
        const aHasFresh = freshKeywords.some(keyword => 
          a.name.toLowerCase().includes(keyword)) ? 150 : 0;
        const bHasFresh = freshKeywords.some(keyword => 
          b.name.toLowerCase().includes(keyword)) ? 150 : 0;
        
        if (aHasFresh !== bHasFresh) return bHasFresh - aHasFresh;

        // Priority 3: For trending queries, prioritize differently
        if (query.toLowerCase().includes('trending') || query.toLowerCase().includes('top') || query.toLowerCase().includes('hit')) {
          // Prioritize official trending playlists
          const trendingKeywords = ['trending', 'top', 'hit', 'superhit', 'chartbuster', 'viral', 'popular', 'most played'];
          const aHasTrending = trendingKeywords.some(keyword => 
            a.name.toLowerCase().includes(keyword)) ? 100 : 0;
          const bHasTrending = trendingKeywords.some(keyword => 
            b.name.toLowerCase().includes(keyword)) ? 100 : 0;
          
          if (aHasTrending !== bHasTrending) return bHasTrending - aHasTrending;
        }

        // Priority 4: Query relevance - exact matches get priority
        const queryWords = query.toLowerCase().split(' ');
        const aMatches = queryWords.filter(word => word.length > 2 && a.name.toLowerCase().includes(word)).length;
        const bMatches = queryWords.filter(word => word.length > 2 && b.name.toLowerCase().includes(word)).length;
        
        if (aMatches !== bMatches) return bMatches - aMatches;
        
        // Priority 5: Official/Curated playlists
        const officialKeywords = ['hit songs', 'top', 'best of', 'superhits', 'chartbusters', 'collection', 'hits'];
        const aHasOfficial = officialKeywords.some(keyword => 
          a.name.toLowerCase().includes(keyword)) ? 50 : 0;
        const bHasOfficial = officialKeywords.some(keyword => 
          b.name.toLowerCase().includes(keyword)) ? 50 : 0;
        
        if (aHasOfficial !== bHasOfficial) return bHasOfficial - aHasOfficial;

        // Priority 6: Song count (more songs = more comprehensive) - but don't over-prioritize
        const songCountDiff = b.songCount - a.songCount;
        if (Math.abs(songCountDiff) > 20) return Math.sign(songCountDiff) * 10; // Reduced impact

        // Priority 7: Alphabetical for consistency
        return a.name.localeCompare(b.name);
      });
  }

  // Get fresh playlists for any category with latest content prioritized
  async getFreshPlaylistsByCategory(categoryId: string, limit: number = 20, forceRefresh: boolean = false): Promise<JioSaavnPlaylist[]> {
    const category = PLAYLIST_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    try {
      // For popular categories, use optimized search strategy
      if (['bollywood', 'romantic', 'punjabi'].includes(categoryId)) {
        return this.getPopularCategoryPlaylists(categoryId, limit, forceRefresh);
      }

      // Prioritize "latest" and "new" search terms for fresh content
      let searchTerms = category.searchTerms.filter(term => 
        term.includes('latest') || term.includes('new') || term.includes('2026') || term.includes('fresh')
      );
      
      const regularTerms = category.searchTerms.filter(term => 
        !term.includes('latest') && !term.includes('new') && !term.includes('2026') && !term.includes('fresh')
      );

      // Combine fresh terms first, then regular terms
      searchTerms = [...searchTerms, ...regularTerms];
      
      // If refreshing, randomize the search terms
      if (forceRefresh) {
        searchTerms = this.shuffleArray(searchTerms);
      }
      
      searchTerms = searchTerms.slice(0, 5);

      const allPlaylists: JioSaavnPlaylist[] = [];
      
      // Search with fresh terms first
      for (const term of searchTerms) {
        try {
          const playlists = await this.searchPlaylists(term, Math.ceil(limit / 3), forceRefresh);
          allPlaylists.push(...playlists);
        } catch (error) {
          // Failed to search for fresh term - skip
        }
      }

      // Remove duplicates and sort by freshness
      const uniquePlaylists = this.removeDuplicatePlaylists(allPlaylists);
      const sorted = this.sortPlaylistsByFreshness(uniquePlaylists, categoryId);
      
      return forceRefresh ? this.shuffleArray(sorted).slice(0, limit) : sorted.slice(0, limit);
    } catch (error) {
      // Fallback to regular category search
      return this.getPlaylistsByCategory(categoryId, limit, forceRefresh);
    }
  }

  // Get playlists by category with smart search terms and fresh content
  async getPlaylistsByCategory(categoryId: string, limit: number = 20, forceRefresh: boolean = false): Promise<JioSaavnPlaylist[]> {
    const category = PLAYLIST_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    try {
      // For popular categories, use optimized search strategy
      if (['bollywood', 'romantic', 'punjabi'].includes(categoryId)) {
        return this.getPopularCategoryPlaylists(categoryId, limit, forceRefresh);
      }

      // Use multiple search terms for better and fresher results
      let searchTerms = category.searchTerms.slice(0, 4);
      
      // If refreshing, randomize and use different terms
      if (forceRefresh) {
        searchTerms = this.shuffleArray(category.searchTerms).slice(0, 4);
      }
      
      const allPlaylists: JioSaavnPlaylist[] = [];
      const searchPromises = searchTerms.map(async (term) => {
        try {
          const playlists = await this.searchPlaylists(term, Math.ceil(limit / 2), forceRefresh);
          return playlists;
        } catch (error) {
          return [];
        }
      });

      const results = await Promise.all(searchPromises);
      results.forEach(playlists => allPlaylists.push(...playlists));

      // Remove duplicates and sort by freshness and relevance
      const uniquePlaylists = this.removeDuplicatePlaylists(allPlaylists);
      const sorted = this.sortPlaylistsByFreshness(uniquePlaylists, categoryId);
      
      return forceRefresh ? this.shuffleArray(sorted).slice(0, limit) : sorted.slice(0, limit);
    } catch (error) {
      // Fallback to first search term
      return this.searchPlaylists(category.searchTerms[0], limit, forceRefresh);
    }
  }

  // Optimized method for popular categories (Bollywood, Romantic, Punjabi)
  private async getPopularCategoryPlaylists(categoryId: string, limit: number = 20, forceRefresh: boolean = false): Promise<JioSaavnPlaylist[]> {
    const category = PLAYLIST_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) return [];

    try {
      // Use more search terms and be more aggressive
      const primaryTerms = category.searchTerms.filter(term => 
        !term.includes('2026') && !term.includes('latest') && !term.includes('new')
      );

      const secondaryTerms = category.searchTerms.filter(term => 
        term.includes('latest') || term.includes('new') || term.includes('2026')
      );

      let searchTerms = [...primaryTerms, ...secondaryTerms];
      
      if (forceRefresh) {
        searchTerms = this.shuffleArray(searchTerms);
      }

      const allPlaylists: JioSaavnPlaylist[] = [];

      // Search with MORE terms to get more results
      for (const term of searchTerms.slice(0, 8)) { // Increased from 5 to 8 terms
        try {
          const playlists = await this.searchPlaylists(term, 15, forceRefresh); // Increased limit per search
          allPlaylists.push(...playlists);
          
          console.log(`Found ${playlists.length} playlists for "${term}"`);
        } catch (error) {
          console.warn(`Failed to search for ${term}:`, error);
        }
      }

      // If still not enough results, try additional generic searches
      if (allPlaylists.length < limit) {
        const additionalTerms = this.getAdditionalSearchTerms(categoryId);
        for (const term of additionalTerms) {
          try {
            const playlists = await this.searchPlaylists(term, 10, forceRefresh);
            allPlaylists.push(...playlists);
            console.log(`Additional search for "${term}" found ${playlists.length} playlists`);
          } catch (error) {
            console.warn(`Additional search failed for ${term}:`, error);
          }
        }
      }

      // Remove duplicates and sort
      const uniquePlaylists = this.removeDuplicatePlaylists(allPlaylists);
      console.log(`Total unique playlists found for ${categoryId}: ${uniquePlaylists.length}`);
      
      const sorted = this.sortPlaylistsByFreshness(uniquePlaylists, categoryId);
      
      const result = forceRefresh ? this.shuffleArray(sorted).slice(0, limit) : sorted.slice(0, limit);
      console.log(`Returning ${result.length} playlists for ${categoryId}`);
      
      return result;
    } catch (error) {
      console.error(`Error fetching ${categoryId} playlists:`, error);
      // Final fallback - use the most basic search term with higher limit
      const basicTerm = categoryId === 'bollywood' ? 'bollywood' : 
                       categoryId === 'romantic' ? 'romantic' : 
                       'punjabi';
      return this.searchPlaylists(basicTerm, limit, forceRefresh);
    }
  }

  // Get additional search terms for better coverage
  private getAdditionalSearchTerms(categoryId: string): string[] {
    switch (categoryId) {
      case 'bollywood':
        return ['hindi', 'bollywood music', 'hindi music', 'indian songs', 'filmi songs'];
      case 'romantic':
        return ['love', 'romantic music', 'love music', 'valentine', 'heart touching'];
      case 'punjabi':
        return ['punjabi music', 'punjabi gana', 'punjabi bhangra', 'punjabi folk'];
      default:
        return [];
    }
  }

  // Sort playlists by freshness and relevance
  private sortPlaylistsByFreshness(playlists: JioSaavnPlaylist[], categoryId: string): JioSaavnPlaylist[] {
    return playlists.sort((a, b) => {
      // Priority 1: Playlists with category-specific keywords
      const category = PLAYLIST_CATEGORIES.find(cat => cat.id === categoryId);
      if (category) {
        const aHasCategoryKeyword = category.searchTerms.some(term => 
          a.name.toLowerCase().includes(term.toLowerCase()));
        const bHasCategoryKeyword = category.searchTerms.some(term => 
          b.name.toLowerCase().includes(term.toLowerCase()));
        
        if (aHasCategoryKeyword && !bHasCategoryKeyword) return -1;
        if (!aHasCategoryKeyword && bHasCategoryKeyword) return 1;
      }

      // Priority 2: Fresh/Latest content indicators
      const freshKeywords = ['latest', 'new', '2024', '2023', 'fresh', 'updated', 'recent'];
      const aHasFresh = freshKeywords.some(keyword => 
        a.name.toLowerCase().includes(keyword));
      const bHasFresh = freshKeywords.some(keyword => 
        b.name.toLowerCase().includes(keyword));
      
      if (aHasFresh && !bHasFresh) return -1;
      if (!aHasFresh && bHasFresh) return 1;

      // Priority 3: Official/Curated playlists
      const officialKeywords = ['top', 'best', 'hit', 'superhit', 'collection', 'chartbuster'];
      const aHasOfficial = officialKeywords.some(keyword => 
        a.name.toLowerCase().includes(keyword));
      const bHasOfficial = officialKeywords.some(keyword => 
        b.name.toLowerCase().includes(keyword));
      
      if (aHasOfficial && !bHasOfficial) return -1;
      if (!aHasOfficial && bHasOfficial) return 1;

      // Priority 4: Song count (more songs = more comprehensive)
      const songCountDiff = b.songCount - a.songCount;
      if (Math.abs(songCountDiff) > 5) return songCountDiff;

      // Priority 5: Alphabetical for consistency
      return a.name.localeCompare(b.name);
    });
  }

  // Remove duplicate playlists based on ID
  private removeDuplicatePlaylists(playlists: JioSaavnPlaylist[]): JioSaavnPlaylist[] {
    const seen = new Set<string>();
    return playlists.filter(playlist => {
      if (seen.has(playlist.id)) {
        return false;
      }
      seen.add(playlist.id);
      return true;
    });
  }

  // Get featured playlists for homepage with 2026 focus
  async getFeaturedPlaylists(): Promise<{ [categoryId: string]: JioSaavnPlaylist[] }> {
    const results: { [categoryId: string]: JioSaavnPlaylist[] } = {};

    try {
      // Get 2026-specific trending playlists
      const trendingPlaylists = await this.get2026TrendingPlaylists();
      results['trending'] = trendingPlaylists;

      // Get other high priority categories with 2026 focus
      const otherCategories = PLAYLIST_CATEGORIES
        .filter(cat => cat.priority >= 7 && cat.id !== 'trending') // Exclude trending as we handle it separately
        .slice(0, 3); // Limit to 3 other categories

      await Promise.all(
        otherCategories.map(async (category) => {
          try {
            const playlists = await this.getFreshPlaylistsByCategory(category.id, 8);
            results[category.id] = playlists;
          } catch (error) {
            console.warn(`Failed to fetch ${category.id} playlists:`, error);
            results[category.id] = [];
          }
        })
      );
    } catch (error) {
      console.error('Error fetching featured playlists:', error);
      // Fallback to original method
      const featuredCategories = PLAYLIST_CATEGORIES
        .filter(cat => cat.priority >= 7)
        .slice(0, 4);

      await Promise.all(
        featuredCategories.map(async (category) => {
          try {
            const playlists = await this.getPlaylistsByCategory(category.id, 8);
            results[category.id] = playlists;
          } catch (error) {
            console.warn(`Fallback failed for ${category.id}:`, error);
            results[category.id] = [];
          }
        })
      );
    }

    return results;
  }

  // Get playlist details with songs
  async getPlaylistDetails(playlistId: string): Promise<JioSaavnPlaylistDetails['data']> {
    try {
      const response = await this.axiosInstance.get<JioSaavnPlaylistDetails>(`/playlists`, {
        params: {
          id: playlistId,
        },
      });

      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch playlist details');
    } catch (error) {
      throw error;
    }
  }

  // Get popular playlists by category (legacy method for backward compatibility)
  async getPopularPlaylists(category: string = 'hindi'): Promise<JioSaavnPlaylist[]> {
    const categoryMap: { [key: string]: string } = {
      hindi: 'bollywood',
      punjabi: 'punjabi',
      tamil: 'regional',
      telugu: 'regional',
      english: 'international',
      romantic: 'romantic',
      party: 'party',
      workout: 'workout',
    };

    const categoryId = categoryMap[category] || 'bollywood';
    return this.getPlaylistsByCategory(categoryId, 15);
  }

  // Get latest JioSaavn charts and trending content for 2026
  async getLatestCharts2026(forceRefresh: boolean = false): Promise<JioSaavnPlaylist[]> {
    try {
      // Use specific chart and trending terms that JioSaavn uses
      let chartTerms = [
        'Top 50 This Week',
        'Trending This Week', 
        'Weekly Top Songs',
        'Hindi Top 50',
        'Bollywood Top Charts',
        'Most Popular This Week',
        'Viral This Week',
        'Top Hits 2026'
      ];

      // If refreshing, randomize the chart terms
      if (forceRefresh) {
        chartTerms = this.shuffleArray(chartTerms);
      }

      const allPlaylists: JioSaavnPlaylist[] = [];
      
      // Search for official chart playlists
      for (const term of chartTerms.slice(0, 5)) {
        try {
          const response = await this.tryMultipleEndpoints<JioSaavnPlaylistResponse>(
            '/search/playlists',
            { 
              query: term, 
              limit: 4,
              page: forceRefresh ? Math.floor(Math.random() * 2) + 1 : 1
            }
          );
          
          if (response.success && response.data?.results) {
            // Filter for official-looking playlists
            const officialPlaylists = response.data.results.filter(playlist => {
              const name = playlist.name.toLowerCase();
              return (
                playlist.songCount >= 15 && // Must have decent number of songs
                (name.includes('top') || name.includes('chart') || 
                 name.includes('trending') || name.includes('hit') ||
                 name.includes('popular') || name.includes('viral'))
              );
            });
            
            allPlaylists.push(...officialPlaylists);
          }
        } catch (error) {
          console.warn(`Failed to search for chart term: ${term}`, error);
        }
      }

      // Remove duplicates and sort by relevance
      const uniquePlaylists = this.removeDuplicatePlaylists(allPlaylists);
      
      const sorted = uniquePlaylists
        .sort((a, b) => {
          // Prioritize official chart keywords
          const chartKeywords = ['top 50', 'top', 'chart', 'trending', 'weekly', 'popular'];
          const aHasChart = chartKeywords.some(keyword => 
            a.name.toLowerCase().includes(keyword)) ? 100 : 0;
          const bHasChart = chartKeywords.some(keyword => 
            b.name.toLowerCase().includes(keyword)) ? 100 : 0;
          
          if (aHasChart !== bHasChart) return bHasChart - aHasChart;
          
          // Then by song count
          return b.songCount - a.songCount;
        });

      return forceRefresh ? this.shuffleArray(sorted).slice(0, 10) : sorted.slice(0, 10);
    } catch (error) {
      console.error('Error fetching latest charts:', error);
      return [];
    }
  }

  // Get best quality image URL
  getBestImageUrl(images: JioSaavnImage[]): string {
    if (!images || images.length === 0) {
      return '/placeholder-playlist.jpg';
    }

    // Prefer 500x500, then 150x150, then 50x50
    const preferred = images.find(img => img.quality === '500x500') ||
                     images.find(img => img.quality === '150x150') ||
                     images[0];

    return preferred?.url || '/placeholder-playlist.jpg';
  }

  // Convert JioSaavn song to app song format
  convertToAppSong(jioSong: JioSaavnSong): any {
    const primaryArtist = jioSong.artists.primary[0];
    const bestImageUrl = this.getBestImageUrl(jioSong.image);
    const bestDownloadUrl = jioSong.downloadUrl.find(url => url.quality === '320kbps') ||
                           jioSong.downloadUrl.find(url => url.quality === '160kbps') ||
                           jioSong.downloadUrl[0];

    return {
      _id: `jiosaavn_${jioSong.id}`,
      title: jioSong.name,
      artist: primaryArtist?.name || 'Unknown Artist',
      albumId: jioSong.album.name,
      duration: jioSong.duration,
      imageUrl: bestImageUrl,
      audioUrl: bestDownloadUrl?.url || '',
      source: 'jiosaavn',
      language: jioSong.language,
      year: jioSong.year,
      playCount: jioSong.playCount,
      hasLyrics: jioSong.hasLyrics,
      explicitContent: jioSong.explicitContent,
      originalData: jioSong,
    };
  }

  // Get category by ID
  getCategoryById(categoryId: string): PlaylistCategory | undefined {
    return PLAYLIST_CATEGORIES.find(cat => cat.id === categoryId);
  }

  // Get all categories sorted by priority
  getAllCategories(): PlaylistCategory[] {
    return [...PLAYLIST_CATEGORIES].sort((a, b) => b.priority - a.priority);
  }

  // Smart search with category detection
  async smartSearch(query: string, limit: number = 20): Promise<{
    playlists: JioSaavnPlaylist[];
    detectedCategory?: PlaylistCategory;
    suggestions: string[];
  }> {
    const lowerQuery = query.toLowerCase();
    
    // Try to detect category from query
    const detectedCategory = PLAYLIST_CATEGORIES.find(category =>
      category.searchTerms.some(term => lowerQuery.includes(term.toLowerCase())) ||
      lowerQuery.includes(category.name.toLowerCase())
    );

    let playlists: JioSaavnPlaylist[] = [];
    
    if (detectedCategory) {
      // Use category-specific search for better results
      playlists = await this.getPlaylistsByCategory(detectedCategory.id, limit);
    } else {
      // Regular search
      playlists = await this.searchPlaylists(query, limit);
    }

    // Generate search suggestions
    const suggestions = this.generateSearchSuggestions(query);

    return {
      playlists,
      detectedCategory,
      suggestions
    };
  }

  // Generate search suggestions based on popular terms
  private generateSearchSuggestions(query: string): string[] {
    const popularTerms = [
      'bollywood hits', 'punjabi songs', 'romantic songs', 'party music',
      'workout songs', '90s hits', 'arijit singh', 'trending songs',
      'devotional songs', 'tamil hits', 'telugu songs', 'english songs'
    ];

    return popularTerms
      .filter(term => term.toLowerCase().includes(query.toLowerCase()) || 
                     query.toLowerCase().includes(term.toLowerCase()))
      .slice(0, 5);
  }
}

export const jioSaavnService = new JioSaavnService();
export default jioSaavnService;