class MobilePerformanceService {
  private isMobile: boolean = false;
  private touchStartTime: number = 0;
  private scrollThrottleTimer: number | null = null;
  private resizeThrottleTimer: number | null = null;

  constructor() {
    this.detectMobile();
    this.initializeMobileOptimizations();
  }

  private detectMobile(): void {
    // Mobile detection
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   window.innerWidth <= 768;
  }

  private initializeMobileOptimizations(): void {
    if (!this.isMobile) return;

    // Optimize touch events
    this.optimizeTouchEvents();
    
    // Optimize scroll performance
    this.optimizeScrollPerformance();
    
    // Optimize resize events
    this.optimizeResizeEvents();
    
    // Set mobile-specific meta tags
    this.setMobileMetaTags();
    
    // Optimize viewport
    this.optimizeViewport();
  }

  private optimizeTouchEvents(): void {
    // Add passive event listeners for better scroll performance
    const addPassiveEventListener = (element: EventTarget, event: string) => {
      element.addEventListener(event, () => {}, { passive: true });
    };

    // Apply to document and body
    addPassiveEventListener(document, 'touchstart');
    addPassiveEventListener(document, 'touchmove');
    addPassiveEventListener(document, 'touchend');
  }

  private optimizeScrollPerformance(): void {
    // Throttle scroll events
    const throttledScroll = () => {
      if (this.scrollThrottleTimer) return;
      
      this.scrollThrottleTimer = window.setTimeout(() => {
        // Handle scroll optimizations
        this.handleScrollOptimizations();
        this.scrollThrottleTimer = null;
      }, 16); // ~60fps
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
  }

  private optimizeResizeEvents(): void {
    // Throttle resize events
    const throttledResize = () => {
      if (this.resizeThrottleTimer) return;
      
      this.resizeThrottleTimer = window.setTimeout(() => {
        this.detectMobile();
        this.handleResizeOptimizations();
        this.resizeThrottleTimer = null;
      }, 250);
    };

    window.addEventListener('resize', throttledResize, { passive: true });
  }

  private setMobileMetaTags(): void {
    // Ensure proper viewport meta tag
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }

  private optimizeViewport(): void {
    // Set mobile-specific CSS variables
    document.documentElement.style.setProperty('--mobile-safe-area-inset-top', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--mobile-safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--mobile-safe-area-inset-left', 'env(safe-area-inset-left)');
    document.documentElement.style.setProperty('--mobile-safe-area-inset-right', 'env(safe-area-inset-right)');
  }

  private handleScrollOptimizations(): void {
    // Implement scroll-based optimizations
    const scrollY = window.scrollY;
    
    // Lazy load images when they come into view
    this.lazyLoadImages();
    
    // Optimize animations based on scroll position
    this.optimizeAnimations(scrollY);
  }

  private handleResizeOptimizations(): void {
    // Handle resize-based optimizations
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update mobile detection
    this.isMobile = width <= 768;
    
    // Adjust layout for new dimensions
    this.adjustLayoutForDimensions(width, height);
  }

  private lazyLoadImages(): void {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.1
    });

    images.forEach(img => imageObserver.observe(img));
  }

  private optimizeAnimations(scrollY: number): void {
    // Reduce animation complexity on mobile
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion || this.isMobile) {
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
      document.documentElement.style.setProperty('--transition-duration', '0.1s');
    }
  }

  private adjustLayoutForDimensions(width: number, height: number): void {
    // Adjust layout based on screen dimensions
    if (width < 480) {
      // Small mobile
      document.documentElement.style.setProperty('--mobile-breakpoint', 'small');
    } else if (width < 768) {
      // Medium mobile
      document.documentElement.style.setProperty('--mobile-breakpoint', 'medium');
    } else {
      // Large mobile/tablet
      document.documentElement.style.setProperty('--mobile-breakpoint', 'large');
    }
  }

  // Public methods
  public isMobileDevice(): boolean {
    return this.isMobile;
  }

  public optimizeImageForMobile(src: string, width: number, height: number): string {
    if (!this.isMobile) return src;
    
    // Mobile-specific image optimizations
    const mobileWidth = Math.min(width, 400);
    const mobileHeight = Math.min(height, 400);
    
    if (src.includes('cloudinary')) {
      const baseUrl = src.split('/upload/')[0];
      const imagePath = src.split('/upload/')[1];
      const transformations = [
        `w_${mobileWidth}`,
        `h_${mobileHeight}`,
        'q_80',
        'f_auto',
        'fl_progressive',
        'fl_force_strip'
      ];
      return `${baseUrl}/upload/${transformations.join(',')}/${imagePath}`;
    }
    
    return src;
  }

  public preloadCriticalResources(): void {
    if (!this.isMobile) return;
    
    // Preload critical resources for mobile
    const criticalResources = [
      '/assets/critical.css',
      '/assets/critical.js'
    ];
    
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.css') ? 'style' : 'script';
      document.head.appendChild(link);
    });
  }

  public optimizeTouchTargets(): void {
    if (!this.isMobile) return;
    
    // Ensure touch targets are at least 44px
    const touchTargets = document.querySelectorAll('button, a, input, select, textarea');
    touchTargets.forEach(target => {
      const element = target as HTMLElement;
      const rect = element.getBoundingClientRect();
      
      if (rect.width < 44 || rect.height < 44) {
        element.style.minWidth = '44px';
        element.style.minHeight = '44px';
        element.style.padding = '12px';
      }
    });
  }

  public enableMobileCaching(): void {
    if (!this.isMobile) return;
    
    // Implement mobile-specific caching strategies
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Mobile service worker registered:', registration);
        })
        .catch(error => {
          console.error('Mobile service worker registration failed:', error);
        });
    }
  }

  public measureMobilePerformance(): void {
    if (!this.isMobile) return;
    
    // Measure mobile-specific performance metrics
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          console.log('Mobile Navigation Timing:', {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
            firstPaint: navEntry.domContentLoadedEventEnd - navEntry.fetchStart
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  }

  public cleanup(): void {
    // Cleanup event listeners and timers
    if (this.scrollThrottleTimer) {
      clearTimeout(this.scrollThrottleTimer);
    }
    if (this.resizeThrottleTimer) {
      clearTimeout(this.resizeThrottleTimer);
    }
  }
}

// Export singleton instance
export const mobilePerformanceService = new MobilePerformanceService();
