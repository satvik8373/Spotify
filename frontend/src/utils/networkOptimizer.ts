/**
 * Network Optimizer for Slow Internet Connections
 * Handles adaptive loading, connection detection, and bandwidth optimization
 */

interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface OptimizationConfig {
  imageQuality: 'low' | 'medium' | 'high';
  preloadStrategy: 'minimal' | 'moderate' | 'aggressive';
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
  requestTimeout: number;
  maxConcurrentRequests: number;
  enableDataSaver: boolean;
}

class NetworkOptimizer {
  private networkInfo: NetworkInfo | null = null;
  private config: OptimizationConfig;
  private connectionChangeListeners: Array<(config: OptimizationConfig) => void> = [];

  constructor() {
    this.config = this.getDefaultConfig();
    this.detectConnection();
    this.setupConnectionMonitoring();
  }

  /**
   * Get default configuration based on connection
   */
  private getDefaultConfig(): OptimizationConfig {
    return {
      imageQuality: 'medium',
      preloadStrategy: 'moderate',
      cacheStrategy: 'moderate',
      requestTimeout: 10000,
      maxConcurrentRequests: 3,
      enableDataSaver: false
    };
  }

  /**
   * Detect current network connection
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
        maxConcurrentRequests: 1,
        requestTimeout: 5000
      };
      this.notifyListeners();
    });
  }

  /**
   * Update configuration based on connection quality
   */
  private updateConfigBasedOnConnection(): void {
    if (!this.networkInfo) return;

    const { effectiveType, downlink, saveData } = this.networkInfo;

    // Slow connection optimization
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5) {
      this.config = {
        imageQuality: 'low',
        preloadStrategy: 'minimal',
        cacheStrategy: 'aggressive',
        requestTimeout: 15000,
        maxConcurrentRequests: 1,
        enableDataSaver: true
      };
    }
    // Medium connection optimization
    else if (effectiveType === '3g' || downlink < 2) {
      this.config = {
        imageQuality: 'medium',
        preloadStrategy: 'minimal',
        cacheStrategy: 'aggressive',
        requestTimeout: 12000,
        maxConcurrentRequests: 2,
        enableDataSaver: saveData
      };
    }
    // Fast connection
    else {
      this.config = {
        imageQuality: 'high',
        preloadStrategy: 'moderate',
        cacheStrategy: 'moderate',
        requestTimeout: 8000,
        maxConcurrentRequests: 4,
        enableDataSaver: saveData
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
   * Get optimized image URL based on connection
   */
  public getOptimizedImageUrl(originalUrl: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    if (!originalUrl) return originalUrl;

    // Cloudinary optimization
    if (originalUrl.includes('res.cloudinary.com')) {
      const quality = this.config.imageQuality === 'low' ? 'q_30' : 
                     this.config.imageQuality === 'medium' ? 'q_60' : 'q_80';
      
      const dimensions = size === 'small' ? 'w_150,h_150' :
                        size === 'medium' ? 'w_300,h_300' : 'w_500,h_500';
      
      const format = 'f_auto';
      const optimization = `${quality},${dimensions},${format},c_fill`;
      
      // Insert optimization parameters
      return originalUrl.replace('/upload/', `/upload/${optimization}/`);
    }

    // JioSaavn CDN optimization
    if (originalUrl.includes('c.saavncdn.com')) {
      const sizeParam = size === 'small' ? '150x150' :
                       size === 'medium' ? '300x300' : '500x500';
      return originalUrl.replace(/\d+x\d+/, sizeParam);
    }

    return originalUrl;
  }

  /**
   * Check if we should preload content
   */
  public shouldPreload(priority: 'high' | 'medium' | 'low' = 'medium'): boolean {
    if (this.config.enableDataSaver) return false;
    
    switch (this.config.preloadStrategy) {
      case 'minimal':
        return priority === 'high';
      case 'moderate':
        return priority === 'high' || priority === 'medium';
      case 'aggressive':
        return true;
      default:
        return false;
    }
  }

  /**
   * Get cache TTL based on connection
   */
  public getCacheTTL(contentType: 'api' | 'image' | 'audio' = 'api'): number {
    const baseTime = contentType === 'api' ? 5 * 60 * 1000 : // 5 minutes
                    contentType === 'image' ? 30 * 60 * 1000 : // 30 minutes
                    60 * 60 * 1000; // 1 hour for audio

    switch (this.config.cacheStrategy) {
      case 'aggressive':
        return baseTime * 4; // Cache 4x longer on slow connections
      case 'moderate':
        return baseTime * 2;
      case 'minimal':
        return baseTime;
      default:
        return baseTime;
    }
  }

  /**
   * Get connection quality indicator
   */
  public getConnectionQuality(): 'poor' | 'good' | 'excellent' {
    if (!this.networkInfo) return 'good';
    
    const { effectiveType, downlink } = this.networkInfo;
    
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5) {
      return 'poor';
    } else if (effectiveType === '3g' || downlink < 2) {
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
   * Manually enable data saver mode
   */
  public enableDataSaver(enabled: boolean = true): void {
    this.config.enableDataSaver = enabled;
    if (enabled) {
      this.config.imageQuality = 'low';
      this.config.preloadStrategy = 'minimal';
      this.config.maxConcurrentRequests = 1;
    }
    this.notifyListeners();
  }
}

// Export singleton instance
export const networkOptimizer = new NetworkOptimizer();
export default networkOptimizer;