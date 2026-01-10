/**
 * Request Manager Service
 * Handles API call deduplication, caching, and background processing optimization
 * Prevents multiple simultaneous calls to the same endpoint
 */

interface RequestConfig {
  url: string;
  method: string;
  params?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestManager {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, PendingRequest>();
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private maxConcurrentRequests = 3;
  private activeRequests = 0;
  private rateLimitDelay = 100; // ms between requests

  /**
   * Generate a unique key for the request
   */
  private generateKey(config: RequestConfig): string {
    const { url, method, params, body } = config;
    const paramsStr = params ? JSON.stringify(params) : '';
    const bodyStr = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${paramsStr}:${bodyStr}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get data from cache if valid
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && this.isCacheValid(entry)) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key); // Remove expired entry
    }
    return null;
  }

  /**
   * Store data in cache
   */
  private setCache(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const request = this.requestQueue.shift();
      if (request) {
        this.activeRequests++;
        request()
          .finally(() => {
            this.activeRequests--;
            // Continue processing queue after a delay
            setTimeout(() => this.processQueue(), this.rateLimitDelay);
          });
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Add request to queue for rate-limited processing
   */
  private queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  /**
   * Main request method with deduplication and caching
   */
  async request<T>(
    config: RequestConfig,
    options: {
      cache?: boolean;
      cacheTTL?: number;
      deduplicate?: boolean;
      priority?: 'high' | 'normal' | 'low';
    } = {}
  ): Promise<T> {
    const {
      cache = true,
      cacheTTL = 5 * 60 * 1000, // 5 minutes default
      deduplicate = true,
      priority = 'normal'
    } = options;

    const key = this.generateKey(config);

    // Check cache first
    if (cache) {
      const cachedData = this.getFromCache(key);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    // Check for pending request (deduplication)
    if (deduplicate) {
      const pending = this.pendingRequests.get(key);
      if (pending) {
        // Clean up old pending requests (older than 30 seconds)
        if (Date.now() - pending.timestamp > 30000) {
          this.pendingRequests.delete(key);
        } else {
          return pending.promise;
        }
      }
    }

    // Create the actual request function
    const makeRequest = async (): Promise<T> => {
      try {
        const { url, method, params, body, headers = {} } = config;
        
        // Build URL with params
        const urlObj = new URL(url, window.location.origin);
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              urlObj.searchParams.append(key, String(value));
            }
          });
        }

        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        };

        if (body && method !== 'GET') {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(urlObj.toString(), fetchOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache successful responses
        if (cache && response.ok) {
          this.setCache(key, data, cacheTTL);
        }

        return data;
      } finally {
        // Clean up pending request
        this.pendingRequests.delete(key);
      }
    };

    // Create promise and store as pending
    const requestPromise = priority === 'high' 
      ? makeRequest() 
      : this.queueRequest(makeRequest);

    if (deduplicate) {
      this.pendingRequests.set(key, {
        promise: requestPromise,
        timestamp: Date.now()
      });
    }

    return requestPromise;
  }

  /**
   * Clear cache for specific pattern or all
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Cancel pending requests for a pattern
   */
  cancelPendingRequests(pattern?: string): void {
    if (pattern) {
      for (const key of this.pendingRequests.keys()) {
        if (key.includes(pattern)) {
          this.pendingRequests.delete(key);
        }
      }
    } else {
      this.pendingRequests.clear();
    }
  }

  /**
   * Get cache and request statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests
    };
  }

  /**
   * Cleanup method to be called periodically
   */
  cleanup(): void {
    this.cleanupCache();
    
    // Clean up old pending requests
    const now = Date.now();
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > 30000) {
        this.pendingRequests.delete(key);
      }
    }
  }
}

// Create singleton instance
export const requestManager = new RequestManager();

// Cleanup every 5 minutes
setInterval(() => {
  requestManager.cleanup();
}, 5 * 60 * 1000);

export default requestManager;