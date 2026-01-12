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
    searchTerms: ['hit songs', 'trending', 'chartbusters', 'top 50', 'superhits'],
    description: 'Most popular songs right now',
    priority: 10,
    color: '#ff4444'
  },
  {
    id: 'bollywood',
    name: 'Bollywood',
    icon: '',
    searchTerms: ['bollywood', 'hindi', 'hindi hit songs', 'bollywood hits'],
    description: 'Latest and classic Bollywood music',
    priority: 9,
    color: '#ff6b35'
  },
  {
    id: 'romantic',
    name: 'Romantic',
    icon: '',
    searchTerms: ['romantic', 'love songs', 'romance', 'valentine'],
    description: 'Love songs for every mood',
    priority: 8,
    color: '#ff69b4'
  },
  {
    id: 'punjabi',
    name: 'Punjabi',
    icon: '',
    searchTerms: ['punjabi', 'punjabi hit songs', 'punjabi hits'],
    description: 'Best of Punjabi music',
    priority: 7,
    color: '#ffa500'
  },
  {
    id: 'party',
    name: 'Party',
    icon: '',
    searchTerms: ['party', 'dance', 'party hits', 'dance hits', 'club'],
    description: 'Get the party started',
    priority: 6,
    color: '#00ff88'
  },
  {
    id: 'workout',
    name: 'Workout',
    icon: '',
    searchTerms: ['workout', 'gym', 'fitness', 'motivation'],
    description: 'High-energy workout music',
    priority: 5,
    color: '#ff4757'
  },
  {
    id: 'devotional',
    name: 'Devotional',
    icon: '',
    searchTerms: ['devotional', 'bhakti', 'spiritual', 'religious'],
    description: 'Spiritual and devotional songs',
    priority: 4,
    color: '#ffa726'
  },
  {
    id: 'retro',
    name: 'Retro Hits',
    icon: '',
    searchTerms: ['90s', '2000s', '80s', 'old hits', 'retro', 'classic'],
    description: 'Golden oldies and retro classics',
    priority: 3,
    color: '#ab47bc'
  },
  {
    id: 'regional',
    name: 'Regional',
    icon: '',
    searchTerms: ['tamil', 'telugu', 'kannada', 'malayalam', 'marathi', 'bengali'],
    description: 'Regional language hits',
    priority: 2,
    color: '#26a69a'
  },
  {
    id: 'international',
    name: 'International',
    icon: '',
    searchTerms: ['english', 'international', 'pop', 'western'],
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
        // Filter out playlists with very few songs (less than 10)
        if (playlist.songCount < 10) return false;
        
        // Filter out explicit content if needed (can be made configurable)
        // if (playlist.explicitContent) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Prioritize playlists with more songs
        const songCountScore = (b.songCount - a.songCount) * 0.1;
        
        // Prioritize playlists with exact query match in name
        const exactMatchA = a.name.toLowerCase().includes(query.toLowerCase()) ? 100 : 0;
        const exactMatchB = b.name.toLowerCase().includes(query.toLowerCase()) ? 100 : 0;
        
        // Prioritize official/curated playlists (those with "Hit Songs", "Top", etc.)
        const officialKeywords = ['hit songs', 'top', 'best of', 'superhits', 'chartbusters'];
        const officialScoreA = officialKeywords.some(keyword => 
          a.name.toLowerCase().includes(keyword)) ? 50 : 0;
        const officialScoreB = officialKeywords.some(keyword => 
          b.name.toLowerCase().includes(keyword)) ? 50 : 0;
        
        const totalScoreA = exactMatchA + officialScoreA + songCountScore;
        const totalScoreB = exactMatchB + officialScoreB;
        
        return totalScoreB - totalScoreA;
      });
  }

  // Get playlists by category with smart search terms
  async getPlaylistsByCategory(categoryId: string, limit: number = 20): Promise<JioSaavnPlaylist[]> {
    const category = PLAYLIST_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    try {
      // Try multiple search terms for better results
      const allPlaylists: JioSaavnPlaylist[] = [];
      const searchPromises = category.searchTerms.slice(0, 3).map(async (term) => {
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

      // Remove duplicates and sort by relevance
      const uniquePlaylists = this.removeDuplicatePlaylists(allPlaylists);
      return uniquePlaylists.slice(0, limit);
    } catch (error) {
      console.error(`Error fetching playlists for category ${categoryId}:`, error);
      // Fallback to first search term
      return this.searchPlaylists(category.searchTerms[0], limit);
    }
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
    const featuredCategories = PLAYLIST_CATEGORIES
      .filter(cat => cat.priority >= 7) // Only high priority categories
      .slice(0, 4); // Limit to 4 categories for homepage

    const results: { [categoryId: string]: JioSaavnPlaylist[] } = {};

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