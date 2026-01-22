import React from 'react';
import { networkOptimizer } from '../../utils/networkOptimizer';

interface SlowConnectionSkeletonProps {
  className?: string;
  count?: number;
  type?: 'card' | 'list' | 'grid' | 'recently-played';
}

const SlowConnectionSkeleton: React.FC<SlowConnectionSkeletonProps> = ({
  className = '',
  count = 3,
  type = 'card'
}) => {
  const networkConfig = networkOptimizer.getConfig();
  const shouldSkipHeavy = networkConfig.skipHeavyElements;
  const isCellular = networkOptimizer.isCellularConnection();

  // Professional shimmer animation
  const shimmerClass = `
    relative overflow-hidden
    before:absolute before:inset-0
    before:-translate-x-full
    before:animate-[shimmer_2s_infinite]
    before:bg-gradient-to-r
    before:from-transparent before:via-white/10 before:to-transparent
  `;

  // Minimal skeleton for cellular/slow connections
  if (shouldSkipHeavy || isCellular) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: Math.min(count, 2) }).map((_, index) => (
          <div 
            key={index} 
            className={`flex items-center space-x-3 p-3 bg-white/5 rounded-lg backdrop-blur-sm ${shimmerClass}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="w-10 h-10 bg-white/10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded-full w-2/3" />
              <div className="h-2 bg-white/8 rounded-full w-1/2" />
            </div>
          </div>
        ))}
        <div className="text-center text-xs text-white/40 py-2 animate-pulse">
          Optimizing for cellular...
        </div>
      </div>
    );
  }

  // Recently played skeleton
  const renderRecentlyPlayedCard = () => (
    <div className={`bg-white/5 rounded-lg p-3 backdrop-blur-sm ${shimmerClass}`}>
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-white/10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/10 rounded-full w-3/4" />
          <div className="h-2 bg-white/8 rounded-full w-1/2" />
        </div>
      </div>
    </div>
  );

  // Professional card skeleton
  const renderCard = () => (
    <div className={`bg-white/5 rounded-xl p-4 backdrop-blur-sm ${shimmerClass}`}>
      <div className="space-y-3">
        <div className="w-full aspect-square bg-white/10 rounded-lg" />
        <div className="space-y-2">
          <div className="h-3 bg-white/10 rounded-full w-4/5" />
          <div className="h-2 bg-white/8 rounded-full w-3/5" />
        </div>
      </div>
    </div>
  );

  // Professional list skeleton
  const renderList = () => (
    <div className={`flex items-center space-x-4 p-3 bg-white/5 rounded-lg backdrop-blur-sm ${shimmerClass}`}>
      <div className="w-14 h-14 bg-white/10 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/10 rounded-full w-4/5" />
        <div className="h-3 bg-white/8 rounded-full w-3/5" />
        <div className="h-2 bg-white/6 rounded-full w-2/5" />
      </div>
    </div>
  );

  // Grid skeleton
  if (type === 'grid') {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: Math.min(count, 8) }).map((_, index) => (
          <div 
            key={index} 
            className={`bg-white/5 rounded-xl p-3 backdrop-blur-sm ${shimmerClass}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="space-y-3">
              <div className="w-full aspect-square bg-white/10 rounded-lg" />
              <div className="h-2 bg-white/10 rounded-full w-4/5" />
              <div className="h-2 bg-white/8 rounded-full w-3/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Recently played grid
  if (type === 'recently-played') {
    return (
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2 ${className}`}>
        {Array.from({ length: Math.min(count, 4) }).map((_, index) => (
          <div 
            key={index}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {renderRecentlyPlayedCard()}
          </div>
        ))}
      </div>
    );
  }

  // Horizontal scroll cards
  if (type === 'card') {
    return (
      <div className={`flex space-x-4 overflow-hidden ${className}`}>
        {Array.from({ length: Math.min(count, 6) }).map((_, index) => (
          <div 
            key={index} 
            className="flex-shrink-0 w-32"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {renderCard()}
          </div>
        ))}
      </div>
    );
  }

  // List view
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: Math.min(count, 5) }).map((_, index) => (
        <div 
          key={index}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {renderList()}
        </div>
      ))}
    </div>
  );
};

export default SlowConnectionSkeleton;