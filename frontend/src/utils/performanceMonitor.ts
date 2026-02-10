/**
 * Performance Monitor Utility
 * Lightweight performance tracking for production debugging
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics
  private enabled = false;

  constructor() {
    // Only enable in development or when explicitly requested
    this.enabled = import.meta.env.DEV || localStorage.getItem('perf_monitor') === 'true';
  }

  /**
   * Mark a performance point
   */
  mark(name: string): void {
    if (!this.enabled) return;
    
    try {
      performance.mark(name);
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string, endMark: string): number | null {
    if (!this.enabled) return null;

    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      
      if (measure) {
        this.addMetric(name, measure.duration);
        return measure.duration;
      }
    } catch (e) {
      // Ignore errors
    }
    
    return null;
  }

  /**
   * Track a custom metric
   */
  track(name: string, value: number): void {
    if (!this.enabled) return;
    this.addMetric(name, value);
  }

  /**
   * Get average for a metric
   */
  getAverage(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return sum / filtered.length;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    try {
      performance.clearMarks();
      performance.clearMeasures();
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { avg: number; count: number; min: number; max: number }> {
    const summary: Record<string, { avg: number; count: number; min: number; max: number }> = {};
    
    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          avg: 0,
          count: 0,
          min: Infinity,
          max: -Infinity
        };
      }
      
      const s = summary[metric.name];
      s.count++;
      s.avg = ((s.avg * (s.count - 1)) + metric.value) / s.count;
      s.min = Math.min(s.min, metric.value);
      s.max = Math.max(s.max, metric.value);
    });
    
    return summary;
  }

  /**
   * Log summary to console
   */
  logSummary(): void {
    if (!this.enabled) return;
    
    const summary = this.getSummary();
    console.table(summary);
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('perf_monitor', enabled ? 'true' : 'false');
  }

  private addMetric(name: string, value: number): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now()
    });

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).perfMonitor = perfMonitor;
}

/**
 * Hook for measuring component render time
 */
export function useRenderTime(componentName: string) {
  if (!perfMonitor) return;
  
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    perfMonitor.track(`${componentName}_render`, endTime - startTime);
  };
}

/**
 * Decorator for measuring function execution time
 */
export function measureTime(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const startTime = performance.now();
    const result = await originalMethod.apply(this, args);
    const endTime = performance.now();
    
    perfMonitor.track(`${propertyKey}_execution`, endTime - startTime);
    
    return result;
  };
  
  return descriptor;
}

export default perfMonitor;
