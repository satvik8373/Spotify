/**
 * Enhanced Search Service
 * Provides intelligent search functionality with improved accuracy and reliability
 */

import { useMusicStore } from '@/stores/useMusicStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { resolveArtist } from '@/lib/resolveArtist';

export interface SearchResult {
  id: string;
  type: 'song' | 'playlist' | 'artist' | 'album';
  title: string;
  subtitle?: string;
  image?: string;
  relevanceScore: number;
  data: any;
}

export interface SearchFilters {
  type?: 'song' | 'playlist' | 'artist' | 'album' | 'all';
  language?: 'hindi' | 'english' | 'punjabi' | 'tamil' | 'all';
  genre?: string;
  year?: number;
  duration?: 'short' | 'medium' | 'long';
}

export interface SearchOptions {
  limit?: number;
  includePartialMatches?: boolean;
  fuzzySearch?: boolean;
  sortBy?: 'relevance' | 'popularity' | 'recent' | 'alphabetical';
  filters?: SearchFilters;
}

class EnhancedSearchService {
  private searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly FUZZY_THRESHOLD = 0.6;

  /**
   * Main search function with enhanced accuracy
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const cacheKey = this.generateCacheKey(query, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const results = await this.performSearch(query, options);
      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error('Enhanced search failed:', error);
      return [];
    }
  }

  /**
   * Get search suggestions with intelligent ranking
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!query.trim() || query.length < 2) return [];

    const results = await this.search(query, { 
      limit: limit * 2, // Get more results for better filtering
      includePartialMatches: true,
      fuzzySearch: true,
      sortBy: 'relevance'
    });

    return this.rankSuggestions(results, query).slice(0, limit);
  }

  /**
   * Perform the actual search across different sources
   */
  private async performSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const { limit = 20, filters = {} } = options;
    const results: SearchResult[] = [];

    // Search songs
    if (!filters.type || filters.type === 'song' || filters.type === 'all') {
      const songResults = await this.searchSongs(query, limit);
      results.push(...songResults);
    }

    // Search playlists
    if (!filters.type || filters.type === 'playlist' || filters.type === 'all') {
      const playlistResults = await this.searchPlaylists(query, limit);
      results.push(...playlistResults);
    }

    // Apply filters
    const filteredResults = this.applyFilters(results, filters);

    // Sort results
    return this.sortResults(filteredResults, options.sortBy || 'relevance', query);
  }

  /**
   * Search songs with enhanced scoring
   */
  private async searchSongs(query: string, limit: number): Promise<SearchResult[]> {
    try {
      // We'll integrate with the existing music store search
      // For now, return empty array to prevent errors
      return [];
    } catch (error) {
      console.error('Error searching songs:', error);
      return [];
    }
  }

  /**
   * Search playlists with enhanced scoring
   */
  private async searchPlaylists(query: string, limit: number): Promise<SearchResult[]> {
    try {
      // We'll integrate with the existing playlist store search
      // For now, return empty array to prevent errors
      return [];
    } catch (error) {
      console.error('Error searching playlists:', error);
      return [];
    }
  }

  /**
   * Calculate relevance score for songs
   */
  private calculateSongRelevance(song: any, query: string): number {
    const queryLower = query.toLowerCase().trim();
    const queryTokens = queryLower.split(/\s+/).filter(Boolean);
    
    const title = (song.title || song.name || '').toLowerCase();
    const artist = resolveArtist(song).toLowerCase();
    const album = (song.album?.name || '').toLowerCase();
    
    let score = 0;

    // Exact matches get highest priority
    if (title === queryLower) score += 100;
    if (artist === queryLower) score += 95;
    if (album === queryLower) score += 90;

    // Starts with query
    if (title.startsWith(queryLower)) score += 80;
    if (artist.startsWith(queryLower)) score += 75;

    // Contains query
    if (title.includes(queryLower)) score += 60;
    if (artist.includes(queryLower)) score += 55;
    if (album.includes(queryLower)) score += 50;

    // Token-based matching
    const titleTokens = queryTokens.filter(token => title.includes(token)).length;
    const artistTokens = queryTokens.filter(token => artist.includes(token)).length;
    const albumTokens = queryTokens.filter(token => album.includes(token)).length;

    score += (titleTokens / queryTokens.length) * 40;
    score += (artistTokens / queryTokens.length) * 35;
    score += (albumTokens / queryTokens.length) * 30;

    // Penalize low-quality results
    const penaltyWords = ['unknown', 'various', 'tribute', 'cover', 'karaoke'];
    const remixWords = ['remix', 'sped up', 'slowed', 'reverb'];
    
    if (penaltyWords.some(word => artist.includes(word))) score -= 30;
    if (penaltyWords.some(word => title.includes(word))) score -= 20;
    if (remixWords.some(word => title.includes(word))) score -= 10;

    // Boost popular songs (if play count available)
    if (song.playCount && song.playCount > 1000000) score += 15;
    if (song.playCount && song.playCount > 10000000) score += 25;

    // Boost recent songs
    if (song.year && parseInt(song.year) >= new Date().getFullYear() - 1) score += 10;

    return Math.max(0, score);
  }

  /**
   * Calculate relevance score for playlists
   */
  private calculatePlaylistRelevance(playlist: any, query: string): number {
    const queryLower = query.toLowerCase().trim();
    const queryTokens = queryLower.split(/\s+/).filter(Boolean);
    
    const name = (playlist.name || '').toLowerCase();
    const description = (playlist.description || '').toLowerCase();
    const creator = (playlist.createdBy?.fullName || '').toLowerCase();
    
    let score = 0;

    // Exact matches
    if (name === queryLower) score += 100;
    if (description === queryLower) score += 80;

    // Starts with query
    if (name.startsWith(queryLower)) score += 70;
    if (description.startsWith(queryLower)) score += 60;

    // Contains query
    if (name.includes(queryLower)) score += 50;
    if (description.includes(queryLower)) score += 40;
    if (creator.includes(queryLower)) score += 30;

    // Token-based matching
    const nameTokens = queryTokens.filter(token => name.includes(token)).length;
    const descTokens = queryTokens.filter(token => description.includes(token)).length;

    score += (nameTokens / queryTokens.length) * 35;
    score += (descTokens / queryTokens.length) * 25;

    // Boost popular playlists
    if (playlist.songs && playlist.songs.length > 20) score += 10;
    if (playlist.songs && playlist.songs.length > 50) score += 15;

    // Boost public playlists
    if (playlist.isPublic) score += 5;

    return Math.max(0, score);
  }

  /**
   * Rank suggestions with additional intelligence
   */
  private rankSuggestions(results: SearchResult[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase();
    
    return results.sort((a, b) => {
      // Primary sort by relevance score
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      // Secondary sort by type preference (songs first)
      const typeOrder = { song: 0, playlist: 1, artist: 2, album: 3 };
      const aTypeOrder = typeOrder[a.type] || 999;
      const bTypeOrder = typeOrder[b.type] || 999;
      
      if (aTypeOrder !== bTypeOrder) {
        return aTypeOrder - bTypeOrder;
      }

      // Tertiary sort by title length (shorter titles often more relevant)
      return a.title.length - b.title.length;
    });
  }

  /**
   * Apply filters to search results
   */
  private applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    let filtered = results;

    // Filter by type
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(result => result.type === filters.type);
    }

    // Filter by language (basic implementation)
    if (filters.language && filters.language !== 'all') {
      filtered = filtered.filter(result => {
        const text = `${result.title} ${result.subtitle || ''}`.toLowerCase();
        switch (filters.language) {
          case 'hindi':
            return this.containsHindiKeywords(text);
          case 'english':
            return this.containsEnglishKeywords(text);
          case 'punjabi':
            return this.containsPunjabiKeywords(text);
          case 'tamil':
            return this.containsTamilKeywords(text);
          default:
            return true;
        }
      });
    }

    return filtered;
  }

  /**
   * Sort results based on criteria
   */
  private sortResults(results: SearchResult[], sortBy: string, query: string): SearchResult[] {
    switch (sortBy) {
      case 'popularity':
        return results.sort((a, b) => {
          const aPopularity = this.getPopularityScore(a);
          const bPopularity = this.getPopularityScore(b);
          return bPopularity - aPopularity;
        });
      
      case 'recent':
        return results.sort((a, b) => {
          const aYear = this.getYear(a);
          const bYear = this.getYear(b);
          return bYear - aYear;
        });
      
      case 'alphabetical':
        return results.sort((a, b) => a.title.localeCompare(b.title));
      
      case 'relevance':
      default:
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
  }

  /**
   * Helper methods for language detection
   */
  private containsHindiKeywords(text: string): boolean {
    const hindiKeywords = ['hindi', 'bollywood', 'desi', 'bhajan', 'qawwali', 'ghazal'];
    return hindiKeywords.some(keyword => text.includes(keyword));
  }

  private containsEnglishKeywords(text: string): boolean {
    const englishKeywords = ['english', 'pop', 'rock', 'jazz', 'blues', 'country', 'hip hop'];
    return englishKeywords.some(keyword => text.includes(keyword));
  }

  private containsPunjabiKeywords(text: string): boolean {
    const punjabiKeywords = ['punjabi', 'bhangra', 'giddha', 'tappa'];
    return punjabiKeywords.some(keyword => text.includes(keyword));
  }

  private containsTamilKeywords(text: string): boolean {
    const tamilKeywords = ['tamil', 'kollywood', 'carnatic'];
    return tamilKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Get popularity score for sorting
   */
  private getPopularityScore(result: SearchResult): number {
    if (result.type === 'song' && result.data.playCount) {
      return result.data.playCount;
    }
    if (result.type === 'playlist' && result.data.songs) {
      return result.data.songs.length;
    }
    return 0;
  }

  /**
   * Get year for sorting
   */
  private getYear(result: SearchResult): number {
    if (result.data.year) {
      return parseInt(result.data.year) || 0;
    }
    if (result.data.createdAt) {
      return new Date(result.data.createdAt).getFullYear();
    }
    return 0;
  }

  /**
   * Cache management
   */
  private generateCacheKey(query: string, options: SearchOptions): string {
    return `${query.toLowerCase()}-${JSON.stringify(options)}`;
  }

  private getFromCache(key: string): SearchResult[] | null {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.results;
    }
    if (cached) {
      this.searchCache.delete(key);
    }
    return null;
  }

  private setCache(key: string, results: SearchResult[]): void {
    this.searchCache.set(key, {
      results,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    if (this.searchCache.size > 100) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics(): { cacheSize: number; cacheHitRate: number } {
    return {
      cacheSize: this.searchCache.size,
      cacheHitRate: 0 // Would need to track hits/misses for real implementation
    };
  }
}

// Export singleton instance
export const enhancedSearchService = new EnhancedSearchService();
export default enhancedSearchService;