import axios from 'axios';

const BASE_URL = 'https://saavn.sumit.co/api';

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

// Enhanced category system with better search terms and logic
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
    icon: '',
    searchTerms: [
      'trending now', 'top 50', 'superhits', 'chartbusters', 'viral hits',
      'most played', 'popular songs', 'hit songs', 'latest hits', 'trending songs',
      'new hits', 'fresh hits', 'latest trending'
    ],
    description: 'Most popular songs right now',
    priority: 10,
    color: '#ff4444'
  },
  {
    id: 'bollywood',
    name: 'Bollywood',
    icon: '',
    searchTerms: [
      'latest bollywood', 'new bollywood', 'bollywood 2024', 'fresh bollywood',
      'bollywood hits', 'hindi songs', 'bollywood top', 'hindi hit songs', 
      'bollywood superhits', 'bollywood chartbusters', 'new hindi songs'
    ],
    description: 'Latest and classic Bollywood music',
    priority: 9,
    color: '#ff6b35'
  },
  {
    id: 'romantic',
    name: 'Romantic',
    icon: '',
    searchTerms: [
      'latest romantic', 'new love songs', 'romantic 2024', 'fresh romantic',
      'romantic songs', 'love songs', 'romantic hits', 'valentine songs',
      'bollywood romantic', 'love ballads', 'romantic collection'
    ],
    description: 'Love songs for every mood',
    priority: 8,
    color: '#ff69b4'
  },
  {
    id: 'punjabi',
    name: 'Punjabi',
    icon: '',
    searchTerms: [
      'latest punjabi', 'new punjabi', 'punjabi 2024', 'fresh punjabi',
      'punjabi hits', 'punjabi songs', 'punjabi top', 'punjabi superhits',
      'punjabi chartbusters', 'punjabi collection'
    ],
    description: 'Best of Punjabi music',
    priority: 7,
    color: '#ffa500'
  },
  {
    id: 'party',
    name: 'Party',
    icon: '',
    searchTerms: [
      'latest party', 'new party songs', 'party 2024', 'fresh party',
      'party songs', 'dance hits', 'party music', 'club songs',
      'dance party', 'party collection', 'bollywood party'
    ],
    description: 'Get the party started',
    priority: 6,
    color: '#00ff88'
  },
  {
    id: 'workout',
    name: 'Workout',
    icon: '',
    searchTerms: [
      'latest workout', 'new gym songs', 'workout 2024', 'fresh fitness',
      'workout songs', 'gym music', 'fitness songs', 'motivation songs'
    ],
    description: 'High-energy workout music',
    priority: 5,
    color: '#ff4757'
  },
  {
    id: 'devotional',
    name: 'Devotional',
    icon: '',
    searchTerms: [
      'latest devotional', 'new bhakti', 'devotional 2024', 'fresh spiritual',
      'devotional songs', 'bhakti songs', 'spiritual music', 'religious songs'
    ],
    description: 'Spiritual and devotional songs',
    priority: 4,
    color: '#ffa726'
  },
  {
    id: 'retro',
    name: 'Retro Hits',
    icon: '',
    searchTerms: [
      '90s hits', '2000s hits', '80s songs', 'old hits', 'retro bollywood',
      'classic songs', 'golden hits', 'evergreen songs', 'vintage hits',
      'nostalgic songs'
    ],
    description: 'Golden oldies and retro classics',
    priority: 3,
    color: '#ab47bc'
  },
  {
    id: 'regional',
    name: 'Regional',
    icon: '',
    searchTerms: [
      'latest tamil', 'new telugu', 'fresh kannada', 'latest malayalam',
      'tamil hits', 'telugu songs', 'kannada songs', 'malayalam songs',
      'marathi songs', 'bengali songs', 'south indian', 'regional 2024'
    ],
    description: 'Regional language hits',
    priority: 2,
    color: '#26a69a'
  },
  {
    id: 'international',
    name: 'International',
    icon: '',
    searchTerms: [
      'latest english', 'new international', 'english 2024', 'fresh pop',
      'english songs', 'international hits', 'pop songs', 'western music',
      'english hits', 'global hits'
    ],
    description: 'International and English hits',
    priority: 1,
    color: '#42a5f5'
  }
];

class JioSaavnService {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  // Get specific trending playlists that match JioSaavn's trending section (fast loading)
  async getJioSaavnTrendingPlaylists(): Promise<JioSaavnPlaylist[]> {
    try {
      // Use faster method with timeout for trending
      const exactMatches = await Promise.race([
        this.getTrendingPlaylistsExact(),
        new Promise<JioSaavnPlaylist[]>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      
      if (exactMatches.length >= 6) {
        return exactMatches.slice(0, 12);
      }

      // Quick fallback if exact matches are insufficient
      const generalTrending = await Promise.race([
        this.getTrendingPlaylists(8),
        new Promise<JioSaavnPlaylist[]>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]);
      
      const existingIds = new Set(exactMatches.map(p => p.id));
      const additionalPlaylists = generalTrending
        .filter(p => !existingIds.has(p.id))
        .slice(0, 12 - exactMatches.length);

      return [...exactMatches, ...additionalPlaylists].slice(0, 12);
    } catch (error) {
      console.error('Error fetching JioSaavn trending playlists:', error);
      // Fast fallback to simple search
      return this.searchPlaylists('trending now', 12);
    }
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
          console.warn(`Failed to search for trending term: ${term}`, error);
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
      console.error('Error fetching trending playlists:', error);
      // Fast fallback to regular trending search
      return this.searchPlaylists('trending now', limit);
    }
  }

  // Enhanced search with better logic
  async searchPlaylists(query: string = 'bollywood', limit: number = 20): Promise<JioSaavnPlaylist[]> {
    try {
      const response = await this.axiosInstance.get<JioSaavnPlaylistResponse>('/search/playlists', {
        params: {
          query: query.toLowerCase(),
          limit,
        },
      });

      if (response.data.success) {
        return this.filterAndSortPlaylists(response.data.data.results, query);
      }
      
      throw new Error('Failed to fetch playlists');
    } catch (error) {
      console.error('Error searching JioSaavn playlists:', error);
      throw error;
    }
  }

  // Smart playlist filtering and sorting logic
  private filterAndSortPlaylists(playlists: JioSaavnPlaylist[], query: string): JioSaavnPlaylist[] {
    return playlists
      .filter(playlist => {
        // Filter out playlists with very few songs
        const minSongs = query.toLowerCase().includes('trending') ? 8 : 
                         query.toLowerCase().includes('latest') || query.toLowerCase().includes('new') ? 5 : 10;
        if (playlist.songCount < minSongs) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Priority 1: Latest/Fresh content gets highest priority
        const freshKeywords = ['latest', 'new', '2024', '2023', 'fresh', 'updated', 'recent'];
        const aHasFresh = freshKeywords.some(keyword => 
          a.name.toLowerCase().includes(keyword));
        const bHasFresh = freshKeywords.some(keyword => 
          b.name.toLowerCase().includes(keyword));
        
        if (aHasFresh && !bHasFresh) return -1;
        if (!aHasFresh && bHasFresh) return 1;

        // Priority 2: For trending queries, prioritize differently
        if (query.toLowerCase().includes('trending') || query.toLowerCase().includes('top') || query.toLowerCase().includes('hit')) {
          // Prioritize official trending playlists
          const trendingKeywords = ['trending', 'top', 'hit', 'superhit', 'chartbuster', 'viral', 'popular', 'most played'];
          const aHasTrending = trendingKeywords.some(keyword => 
            a.name.toLowerCase().includes(keyword));
          const bHasTrending = trendingKeywords.some(keyword => 
            b.name.toLowerCase().includes(keyword));
          
          if (aHasTrending && !bHasTrending) return -1;
          if (!aHasTrending && bHasTrending) return 1;
        }

        // Priority 3: Query relevance
        const exactMatchA = a.name.toLowerCase().includes(query.toLowerCase()) ? 100 : 0;
        const exactMatchB = b.name.toLowerCase().includes(query.toLowerCase()) ? 100 : 0;
        
        if (exactMatchA !== exactMatchB) return exactMatchB - exactMatchA;
        
        // Priority 4: Official/Curated playlists
        const officialKeywords = ['hit songs', 'top', 'best of', 'superhits', 'chartbusters', 'collection'];
        const aHasOfficial = officialKeywords.some(keyword => 
          a.name.toLowerCase().includes(keyword)) ? 50 : 0;
        const bHasOfficial = officialKeywords.some(keyword => 
          b.name.toLowerCase().includes(keyword)) ? 50 : 0;
        
        if (aHasOfficial !== bHasOfficial) return bHasOfficial - aHasOfficial;

        // Priority 5: Song count (more songs = more comprehensive)
        const songCountDiff = b.songCount - a.songCount;
        if (Math.abs(songCountDiff) > 10) return songCountDiff;

        // Priority 6: Alphabetical for consistency
        return a.name.localeCompare(b.name);
      });
  }

  // Get fresh playlists for any category with latest content prioritized
  async getFreshPlaylistsByCategory(categoryId: string, limit: number = 20): Promise<JioSaavnPlaylist[]> {
    const category = PLAYLIST_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    try {
      // Prioritize "latest" and "new" search terms for fresh content
      const freshTerms = category.searchTerms.filter(term => 
        term.includes('latest') || term.includes('new') || term.includes('2024') || term.includes('fresh')
      );
      
      const regularTerms = category.searchTerms.filter(term => 
        !term.includes('latest') && !term.includes('new') && !term.includes('2024') && !term.includes('fresh')
      );

      // Combine fresh terms first, then regular terms
      const searchTerms = [...freshTerms, ...regularTerms].slice(0, 5);

      const allPlaylists: JioSaavnPlaylist[] = [];
      
      // Search with fresh terms first
      for (const term of searchTerms) {
        try {
          const playlists = await this.searchPlaylists(term, Math.ceil(limit / 3));
          allPlaylists.push(...playlists);
        } catch (error) {
          console.warn(`Failed to search for fresh term: ${term}`, error);
        }
      }

      // Remove duplicates and sort by freshness
      const uniquePlaylists = this.removeDuplicatePlaylists(allPlaylists);
      return this.sortPlaylistsByFreshness(uniquePlaylists, categoryId).slice(0, limit);
    } catch (error) {
      console.error(`Error fetching fresh playlists for category ${categoryId}:`, error);
      // Fallback to regular category search
      return this.getPlaylistsByCategory(categoryId, limit);
    }
  }

  // Get playlists by category with smart search terms and fresh content
  async getPlaylistsByCategory(categoryId: string, limit: number = 20): Promise<JioSaavnPlaylist[]> {
    const category = PLAYLIST_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    try {
      // Use multiple search terms for better and fresher results
      const allPlaylists: JioSaavnPlaylist[] = [];
      const searchPromises = category.searchTerms.slice(0, 4).map(async (term) => {
        try {
          const playlists = await this.searchPlaylists(term, Math.ceil(limit / 2));
          return playlists;
        } catch (error) {
          console.warn(`Failed to search for term: ${term}`, error);
          return [];
        }
      });

      const results = await Promise.all(searchPromises);
      results.forEach(playlists => allPlaylists.push(...playlists));

      // Remove duplicates and sort by freshness and relevance
      const uniquePlaylists = this.removeDuplicatePlaylists(allPlaylists);
      return this.sortPlaylistsByFreshness(uniquePlaylists, categoryId).slice(0, limit);
    } catch (error) {
      console.error(`Error fetching playlists for category ${categoryId}:`, error);
      // Fallback to first search term
      return this.searchPlaylists(category.searchTerms[0], limit);
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

  // Get featured playlists for homepage
  async getFeaturedPlaylists(): Promise<{ [categoryId: string]: JioSaavnPlaylist[] }> {
    const results: { [categoryId: string]: JioSaavnPlaylist[] } = {};

    try {
      // Get JioSaavn-specific trending playlists
      const trendingPlaylists = await this.getJioSaavnTrendingPlaylists();
      results['trending'] = trendingPlaylists;

      // Get other high priority categories
      const otherCategories = PLAYLIST_CATEGORIES
        .filter(cat => cat.priority >= 7 && cat.id !== 'trending') // Exclude trending as we handle it separately
        .slice(0, 3); // Limit to 3 other categories

      await Promise.all(
        otherCategories.map(async (category) => {
          try {
            const playlists = await this.getPlaylistsByCategory(category.id, 8);
            results[category.id] = playlists;
          } catch (error) {
            console.error(`Failed to fetch featured playlists for ${category.id}:`, error);
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
            console.error(`Failed to fetch featured playlists for ${category.id}:`, error);
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
      console.error('Error fetching JioSaavn playlist details:', error);
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

  // Get trending playlists with exact matches to JioSaavn's trending section (optimized)
  async getTrendingPlaylistsExact(): Promise<JioSaavnPlaylist[]> {
    try {
      // Reduced list for faster loading - focus on most common trending playlists
      const exactTrendingSearches = [
        'Best Of 90s',
        'Top 50 Hindi', 
        'Arijit Singh',
        'Bollywood Superhits',
        'Latest Bollywood',
        'Trending Hindi'
      ];

      const results: JioSaavnPlaylist[] = [];
      
      // Search for each exact pattern with timeout for speed
      for (const searchTerm of exactTrendingSearches) {
        try {
          const playlists = await Promise.race([
            this.searchPlaylists(searchTerm, 2),
            new Promise<JioSaavnPlaylist[]>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 3000)
            )
          ]);
          
          if (playlists.length > 0) {
            const bestMatch = playlists[0]; // Take first result for speed
            
            // Avoid duplicates
            if (!results.some(existing => existing.id === bestMatch.id)) {
              results.push(bestMatch);
            }
          }
        } catch (error) {
          console.warn(`Failed to search for exact trending: ${searchTerm}`, error);
        }
        
        // Stop if we have enough results for speed
        if (results.length >= 8) break;
      }

      return results.slice(0, 8);
    } catch (error) {
      console.error('Error fetching exact trending playlists:', error);
      return this.getTrendingPlaylists(8);
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