import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  fmp: number | null;
}

interface PerformanceMonitorProps {
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  enabled?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  onMetricsUpdate,
  enabled = true
}) => {
  const metricsRef = useRef<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    fmp: null
  });

  useEffect(() => {
    if (!enabled || !('PerformanceObserver' in window)) {
      return;
    }

    const metrics = metricsRef.current;

    // First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        metrics.fcp = fcpEntry.startTime;
        onMetricsUpdate?.(metrics);
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        metrics.lcp = lastEntry.startTime;
        onMetricsUpdate?.(metrics);
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'first-input') {
          metrics.fid = entry.processingStart - entry.startTime;
          onMetricsUpdate?.(metrics);
        }
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          metrics.cls = clsValue;
          onMetricsUpdate?.(metrics);
        }
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Time to First Byte (TTFB)
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const navigationEntry = entries.find(entry => entry.entryType === 'navigation');
      if (navigationEntry) {
        metrics.ttfb = (navigationEntry as any).responseStart - (navigationEntry as any).requestStart;
        onMetricsUpdate?.(metrics);
      }
    });
    navigationObserver.observe({ entryTypes: ['navigation'] });

    // First Meaningful Paint (FMP) - approximated
    const fmpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fmpEntry = entries.find(entry => entry.name === 'first-meaningful-paint');
      if (fmpEntry) {
        metrics.fmp = fmpEntry.startTime;
        onMetricsUpdate?.(metrics);
      }
    });
    fmpObserver.observe({ entryTypes: ['paint'] });

    // Log performance metrics to console in development
    if (process.env.NODE_ENV === 'development') {
      const logMetrics = () => {
        console.group('🚀 Performance Metrics');
        console.log('FCP:', metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'Not available');
        console.log('LCP:', metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'Not available');
        console.log('FID:', metrics.fid ? `${metrics.fid.toFixed(2)}ms` : 'Not available');
        console.log('CLS:', metrics.cls ? metrics.cls.toFixed(4) : 'Not available');
        console.log('TTFB:', metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : 'Not available');
        console.log('FMP:', metrics.fmp ? `${metrics.fmp.toFixed(2)}ms` : 'Not available');
        console.groupEnd();
      };

      // Log metrics after a delay to allow them to be measured
      setTimeout(logMetrics, 5000);
    }

    // Cleanup observers
    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      navigationObserver.disconnect();
      fmpObserver.disconnect();
    };
  }, [enabled, onMetricsUpdate]);

  // Measure custom performance marks
  useEffect(() => {
    if (!enabled) return;

    // Mark app initialization
    if ('performance' in window) {
      performance.mark('app-init-start');
      
      // Mark when the app is fully loaded
      const markAppLoaded = () => {
        performance.mark('app-loaded');
        performance.measure('app-initialization', 'app-init-start', 'app-loaded');
      };

      // Mark app as loaded after a reasonable delay
      setTimeout(markAppLoaded, 2000);
    }
  }, [enabled]);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;
