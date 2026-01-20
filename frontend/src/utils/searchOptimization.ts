/**
 * Search Optimization Utilities
 * Provides utilities for optimizing search performance and accuracy
 */

// Common search terms and their normalized versions
const SEARCH_TERM_NORMALIZATIONS: Record<string, string> = {
  // Language variations
  'hindi': 'hindi bollywood',
  'english': 'english pop',
  'punjabi': 'punjabi bhangra',
  'tamil': 'tamil kollywood',
  
  // Genre expansions
  'romantic': 'romantic love songs',
  'party': 'party dance songs',
  'sad': 'sad emotional songs',
  'workout': 'workout gym songs',
  'chill': 'chill relaxing songs',
  
  // Common misspellings
  'bolywood': 'bollywood',
  'holiwood': 'hollywood',
  'panjabi': 'punjabi',
  'tameel': 'tamil',
};

// Stop words that don't add value to search
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'song', 'songs', 'music', 'track', 'tracks', 'audio', 'mp3', 'video'
]);

// High-value keywords that should be preserved
const IMPORTANT_KEYWORDS = new Set([
  'latest', 'new', 'trending', 'top', 'best', 'hit', 'hits', 'popular', 'famous',
  'bollywood', 'hollywood', 'punjabi', 'tamil', 'hindi', 'english',
  'romantic', 'love', 'sad', 'party', 'dance', 'classical', 'devotional'
]);

/**
 * Normalize and optimize search query
 */
export const optimizeSearchQuery = (query: string): string => {
  if (!query || typeof query !== 'string') return '';

  let optimized = query.toLowerCase().trim();

  // Apply normalizations
  for (const [original, normalized] of Object.entries(SEARCH_TERM_NORMALIZATIONS)) {
    if (optimized.includes(original)) {
      optimized = optimized.replace(new RegExp(original, 'gi'), normalized);
    }
  }

  // Remove extra whitespace
  optimized = optimized.replace(/\s+/g, ' ').trim();

  return optimized;
};

/**
 * Extract meaningful keywords from search query
 */
export const extractKeywords = (query: string): string[] => {
  if (!query) return [];

  const words = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 1);

  // Filter out stop words but keep important keywords
  const keywords = words.filter(word => 
    !STOP_WORDS.has(word) || IMPORTANT_KEYWORDS.has(word)
  );

  // Remove duplicates and return
  return [...new Set(keywords)];
};

/**
 * Generate search suggestions based on query
 */
export const generateSearchSuggestions = (query: string): string[] => {
  if (!query || query.length < 2) return [];

  const suggestions: string[] = [];
  const queryLower = query.toLowerCase();

  // Genre-based suggestions
  const genreSuggestions: Record<string, string[]> = {
    'hindi': ['Hindi songs 2024', 'Hindi romantic songs', 'Hindi sad songs'],
    'english': ['English pop songs', 'English rock songs', 'English hits 2024'],
    'punjabi': ['Punjabi songs 2024', 'Punjabi bhangra songs', 'Punjabi romantic songs'],
    'tamil': ['Tamil songs 2024', 'Tamil melody songs', 'Tamil kuthu songs'],
    'romantic': ['Romantic Hindi songs', 'Romantic English songs', 'Love songs'],
    'party': ['Party songs 2024', 'Dance songs', 'Club songs'],
    'sad': ['Sad Hindi songs', 'Sad English songs', 'Breakup songs'],
  };

  // Add genre-based suggestions
  for (const [genre, genreSugs] of Object.entries(genreSuggestions)) {
    if (queryLower.includes(genre)) {
      suggestions.push(...genreSugs);
    }
  }

  // Add year-based suggestions
  const currentYear = new Date().getFullYear();
  if (queryLower.includes('latest') || queryLower.includes('new')) {
    suggestions.push(
      `Latest songs ${currentYear}`,
      `New releases ${currentYear}`,
      `Trending songs ${currentYear}`
    );
  }

  // Add artist-based suggestions if query looks like an artist name
  if (query.length > 3 && !queryLower.includes('song')) {
    suggestions.push(
      `${query} songs`,
      `${query} latest songs`,
      `${query} hit songs`
    );
  }

  // Remove duplicates and limit results
  return [...new Set(suggestions)].slice(0, 5);
};

/**
 * Calculate search query similarity
 */
export const calculateQuerySimilarity = (query1: string, query2: string): number => {
  if (!query1 || !query2) return 0;

  const keywords1 = new Set(extractKeywords(query1));
  const keywords2 = new Set(extractKeywords(query2));

  if (keywords1.size === 0 && keywords2.size === 0) return 1;
  if (keywords1.size === 0 || keywords2.size === 0) return 0;

  // Calculate Jaccard similarity
  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);

  return intersection.size / union.size;
};

/**
 * Validate search query
 */
export const validateSearchQuery = (query: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} => {
  const errors: string[] = [];
  const suggestions: string[] = [];

  if (!query || typeof query !== 'string') {
    errors.push('Search query is required');
    return { isValid: false, errors, suggestions };
  }

  const trimmed = query.trim();

  if (trimmed.length === 0) {
    errors.push('Search query cannot be empty');
    return { isValid: false, errors, suggestions };
  }

  if (trimmed.length < 2) {
    errors.push('Search query must be at least 2 characters long');
    suggestions.push('Try typing more characters');
    return { isValid: false, errors, suggestions };
  }

  if (trimmed.length > 100) {
    errors.push('Search query is too long');
    suggestions.push('Try using fewer words');
    return { isValid: false, errors, suggestions };
  }

  // Check for common issues
  if (/^\d+$/.test(trimmed)) {
    suggestions.push('Try adding words like "song" or "music" to your search');
  }

  if (/^[^a-zA-Z0-9\s]+$/.test(trimmed)) {
    errors.push('Search query contains only special characters');
    suggestions.push('Try using letters and numbers');
    return { isValid: false, errors, suggestions };
  }

  return { isValid: true, errors, suggestions };
};

/**
 * Get search performance metrics
 */
export const getSearchMetrics = (
  query: string,
  results: any[],
  responseTime: number
): {
  query: string;
  resultCount: number;
  responseTime: number;
  queryComplexity: number;
  relevanceScore: number;
} => {
  const keywords = extractKeywords(query);
  const queryComplexity = keywords.length + (query.split(' ').length * 0.1);
  
  // Simple relevance calculation based on result count and response time
  const relevanceScore = results.length > 0 
    ? Math.min(100, (results.length / Math.max(1, responseTime / 100)) * 10)
    : 0;

  return {
    query,
    resultCount: results.length,
    responseTime,
    queryComplexity,
    relevanceScore
  };
};

/**
 * Debounce function for search input
 */
export const createSearchDebouncer = (
  callback: (query: string) => void,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout;

  return (query: string) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(query), delay);
  };
};

/**
 * Search result ranking utilities
 */
export const rankSearchResults = (
  results: any[],
  query: string,
  options: {
    prioritizeExactMatches?: boolean;
    boostRecentResults?: boolean;
    penalizeLowQuality?: boolean;
  } = {}
): any[] => {
  const {
    prioritizeExactMatches = true,
    boostRecentResults = true,
    penalizeLowQuality = true
  } = options;

  const queryKeywords = extractKeywords(query);
  const currentYear = new Date().getFullYear();

  return results.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Exact match bonus
    if (prioritizeExactMatches) {
      const titleA = (a.title || a.name || '').toLowerCase();
      const titleB = (b.title || b.name || '').toLowerCase();
      
      if (titleA === query.toLowerCase()) scoreA += 100;
      if (titleB === query.toLowerCase()) scoreB += 100;
    }

    // Keyword matching
    queryKeywords.forEach(keyword => {
      const textA = `${a.title || a.name || ''} ${a.artist || ''}`.toLowerCase();
      const textB = `${b.title || b.name || ''} ${b.artist || ''}`.toLowerCase();
      
      if (textA.includes(keyword)) scoreA += 10;
      if (textB.includes(keyword)) scoreB += 10;
    });

    // Recent results boost
    if (boostRecentResults) {
      const yearA = parseInt(a.year || '0');
      const yearB = parseInt(b.year || '0');
      
      if (yearA >= currentYear - 1) scoreA += 15;
      if (yearB >= currentYear - 1) scoreB += 15;
    }

    // Quality penalties
    if (penalizeLowQuality) {
      const lowQualityWords = ['unknown', 'various', 'tribute', 'cover'];
      const artistA = (a.artist || '').toLowerCase();
      const artistB = (b.artist || '').toLowerCase();
      
      if (lowQualityWords.some(word => artistA.includes(word))) scoreA -= 20;
      if (lowQualityWords.some(word => artistB.includes(word))) scoreB -= 20;
    }

    return scoreB - scoreA;
  });
};

export default {
  optimizeSearchQuery,
  extractKeywords,
  generateSearchSuggestions,
  calculateQuerySimilarity,
  validateSearchQuery,
  getSearchMetrics,
  createSearchDebouncer,
  rankSearchResults
};