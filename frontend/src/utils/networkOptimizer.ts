/**
 * Network Optimizer for Cellular/Slow Internet Connections
 * Aggressive optimization to minimize loading and reduce heavy elements
 */

interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface OptimizationConfig {
  imageQuality: 'minimal' | 'low' | 'medium';
  preloadStrategy: 'none' | 'critical' | 'minimal';
  cacheStrategy: 'aggressive' | 'moderate';
  requestTimeout: number;
  maxConcurrentRequests: number;
  enableDataSaver: boolean;
  skipHeavyElements: boolean;
  reduceAnimations: boolean;
}

class NetworkOptimizer {
  private networkInfo: NetworkInfo | null = null;
  private config: OptimizationConfig;
  private connectionChangeListeners: Array<(config: OptimizationConfig) => void> = [];
  private isCellular: boolean = false;

  constructor() {
    this.config = this.getDefaultConfig();
    this.detectConnection();
    this.setupConnectionMonitoring();
  }

  /**
   * Get default configuration - optimized for cellular
   */
  private getDefaultConfig(): OptimizationConfig {
    return {
      imageQuality: 'low',
      preloadStrategy: 'critical',
      cacheStrategy: 'aggressive',
      requestTimeout: 8000,
      maxConcurrentRequests: 2,
      enableDataSaver: true,
      skipHeavyElements: true,
      reduceAnimations: true
    };
  }

  /**
   * Detect current network connection and cellular status
   */
  private detectConnection(): void {
    // @ts-ignore - Navigator connection API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      this.networkInfo = {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false
      };

      // Detect cellular connection
      this.isCellular = connection.type === 'cellular' || 
                       connection.effectiveType === '2g' || 
                       connection.effectiveType === 'slow-2g' ||
                       connection.effectiveType === '3g' ||
                       connection.downlink < 2;
    }

    this.updateConfigBasedOnConnection();
  }

  /**
   * Setup connection monitoring
   */
  private setupConnectionMonitoring(): void {
    // @ts-ignore - Navigator connection API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', () => {
        this.detectConnection();
      });
    }

    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.updateConfigBasedOnConnection();
    });

    window.addEventListener('offline', () => {
      this.config = {
        ...this.config,
        enableDataSaver: true,
        skipHeavyElements: true,
        maxConcurrentRequests: 1,
        requestTimeout: 5000,
        preloadStrategy: 'none'
      };
      this.notifyListeners();
    });
  }

  /**
   * Update configuration based on connection quality - aggressive cellular optimization
   */
  private updateConfigBasedOnConnection(): void {
    if (!this.networkInfo) return;

    const { effectiveType, downlink, saveData } = this.networkInfo;

    // Cellular or very slow connection - maximum optimization
    if (this.isCellular || effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5) {
      this.config = {
        imageQuality: 'minimal',
        preloadStrategy: 'none',
        cacheStrategy: 'aggressive',
        requestTimeout: 20000,
        maxConcurrentRequests: 1,
        enableDataSaver: true,
        skipHeavyElements: true,
        reduceAnimations: true
      };
    }
    // 3G or medium connection - moderate optimization
    else if (effectiveType === '3g' || downlink < 2) {
      this.config = {
        imageQuality: 'low',
        preloadStrategy: 'critical',
        cacheStrategy: 'aggressive',
        requestTimeout: 15000,
        maxConcurrentRequests: 1,
        enableDataSaver: true,
        skipHeavyElements: true,
        reduceAnimations: true
      };
    }
    // Fast connection - minimal optimization
    else {
      this.config = {
        imageQuality: 'medium',
        preloadStrategy: 'minimal',
        cacheStrategy: 'moderate',
        requestTimeout: 10000,
        maxConcurrentRequests: 3,
        enableDataSaver: saveData,
        skipHeavyElements: false,
        reduceAnimations: false
      };
    }

    this.notifyListeners();
  }

  /**
   * Add listener for configuration changes
   */
  public onConfigChange(callback: (config: OptimizationConfig) => void): void {
    this.connectionChangeListeners.push(callback);
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyListeners(): void {
    this.connectionChangeListeners.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        console.warn('Network optimizer listener error:', error);
      }
    });
  }

  /**
   * Get current optimization configuration
   */
  public getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * Get optimized image URL based on connection - aggressive optimization
   */
  public getOptimizedImageUrl(originalUrl: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    if (!originalUrl) return originalUrl;

    // Skip image optimization entirely for minimal quality
    if (this.config.imageQuality === 'minimal') {
      return originalUrl.replace(/\d+x\d+/, '150x150'); // Force smallest size
    }

    // Cloudinary optimization
    if (originalUrl.includes('res.cloudinary.com')) {
      const quality = this.config.imageQuality === 'minimal' ? 'q_20' :
                     this.config.imageQuality === 'low' ? 'q_30' : 'q_50';
      
      const dimensions = size === 'small' ? 'w_100,h_100' :
                        size === 'medium' ? 'w_200,h_200' : 'w_300,h_300';
      
      const format = 'f_jpg'; // Force JPG for faster processing
      const optimization = `${quality},${dimensions},${format},c_fill`;
      
      return originalUrl.replace('/upload/', `/upload/${optimization}/`);
    }

    // JioSaavn CDN optimization
    if (originalUrl.includes('c.saavncdn.com')) {
      const sizeParam = size === 'small' ? '100x100' :
                       size === 'medium' ? '150x150' : '200x200';
      return originalUrl.replace(/\d+x\d+/, sizeParam);
    }

    return originalUrl;
  }

  /**
   * Check if we should preload content - very restrictive
   */
  public shouldPreload(priority: 'high' | 'medium' | 'low' = 'medium'): boolean {
    if (this.config.preloadStrategy === 'none') return false;
    if (this.config.preloadStrategy === 'critical') return priority === 'high';
    if (this.config.preloadStrategy === 'minimal') return priority === 'high' || priority === 'medium';
    return false;
  }

  /**
   * Check if heavy elements should be skipped
   */
  public shouldSkipHeavyElements(): boolean {
    return this.config.skipHeavyElements;
  }

  /**
   * Check if animations should be reduced
   */
  public shouldReduceAnimations(): boolean {
    return this.config.reduceAnimations;
  }

  /**
   * Get cache TTL based on connection - very aggressive caching
   */
  public getCacheTTL(contentType: 'api' | 'image' | 'audio' = 'api'): number {
    const baseTime = contentType === 'api' ? 10 * 60 * 1000 : // 10 minutes
                    contentType === 'image' ? 60 * 60 * 1000 : // 1 hour
                    2 * 60 * 60 * 1000; // 2 hours for audio

    switch (this.config.cacheStrategy) {
      case 'aggressive':
        return baseTime * 6; // Cache 6x longer on cellular
      case 'moderate':
        return baseTime * 2;
      default:
        return baseTime;
    }
  }

  /**
   * Get connection quality indicator
   */
  public getConnectionQuality(): 'poor' | 'good' | 'excellent' {
    if (!this.networkInfo) return 'good';
    
    if (this.isCellular || this.networkInfo.effectiveType === 'slow-2g' || this.networkInfo.effectiveType === '2g') {
      return 'poor';
    } else if (this.networkInfo.effectiveType === '3g' || this.networkInfo.downlink < 2) {
      return 'good';
    } else {
      return 'excellent';
    }
  }

  /**
   * Check if data saver mode is enabled
   */
  public isDataSaverEnabled(): boolean {
    return this.config.enableDataSaver;
  }

  /**
   * Check if on cellular connection
   */
  public isCellularConnection(): boolean {
    return this.isCellular;
  }

  /**
   * Manually enable aggressive cellular mode
   */
  public enableCellularMode(enabled: boolean = true): void {
    if (enabled) {
      this.config = {
        imageQuality: 'minimal',
        preloadStrategy: 'none',
        cacheStrategy: 'aggressive',
        requestTimeout: 20000,
        maxConcurrentRequests: 1,
        enableDataSaver: true,
        skipHeavyElements: true,
        reduceAnimations: true
      };
    } else {
      this.updateConfigBasedOnConnection();
    }
    this.notifyListeners();
  }
}

// Export singleton instance
export const networkOptimizer = new NetworkOptimizer();
export default networkOptimizer;