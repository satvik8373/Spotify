import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Clock, 
  Search, 
  TrendingUp, 
  Database,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchAnalyticsProps {
  analytics: {
    totalSearches: number;
    cacheHitRate: number;
    averageResponseTime: number;
  };
  recentSearches: string[];
  onClearCache?: () => void;
  onClearRecentSearches?: () => void;
  className?: string;
}

const SearchAnalytics: React.FC<SearchAnalyticsProps> = ({
  analytics,
  recentSearches,
  onClearCache,
  onClearRecentSearches,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-card border border-border shadow-lg"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Search Analytics
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-4 right-4 z-50 w-80 p-4 bg-card border border-border shadow-xl",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Search Analytics</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
        >
          <EyeOff className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Search className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total Searches</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {analytics.totalSearches.toLocaleString()}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Avg Response</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {Math.round(analytics.averageResponseTime)}ms
            </p>
          </div>
        </div>

        {/* Cache Performance */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Cache Hit Rate</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {Math.round(analytics.cacheHitRate * 100)}%
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analytics.cacheHitRate * 100}%` }}
            />
          </div>
        </div>

        {/* Recent Searches */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-foreground">Recent Searches</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {recentSearches.length}/10
            </span>
          </div>
          
          {recentSearches.length > 0 ? (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentSearches.slice(0, 5).map((search, index) => (
                <div
                  key={index}
                  className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 truncate"
                >
                  {search}
                </div>
              ))}
              {recentSearches.length > 5 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  +{recentSearches.length - 5} more
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">
              No recent searches
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-border">
          {onClearCache && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearCache}
              className="flex-1 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Clear Cache
            </Button>
          )}
          {onClearRecentSearches && recentSearches.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearRecentSearches}
              className="flex-1 text-xs"
            >
              Clear Recent
            </Button>
          )}
        </div>

        {/* Performance Indicators */}
        <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <div className={cn(
              "w-2 h-2 rounded-full",
              analytics.averageResponseTime < 500 ? "bg-green-500" :
              analytics.averageResponseTime < 1000 ? "bg-yellow-500" : "bg-red-500"
            )} />
            <span>
              {analytics.averageResponseTime < 500 ? "Fast" :
               analytics.averageResponseTime < 1000 ? "Normal" : "Slow"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className={cn(
              "w-2 h-2 rounded-full",
              analytics.cacheHitRate > 0.7 ? "bg-green-500" :
              analytics.cacheHitRate > 0.4 ? "bg-yellow-500" : "bg-red-500"
            )} />
            <span>Cache</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SearchAnalytics;