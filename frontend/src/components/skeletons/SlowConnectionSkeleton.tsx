import React from 'react';
import { networkOptimizer } from '../../utils/networkOptimizer';

interface SlowConnectionSkeletonProps {
  className?: string;
  count?: number;
  type?: 'card' | 'list' | 'grid';
}

const SlowConnectionSkeleton: React.FC<SlowConnectionSkeletonProps> = ({
  className = '',
  count = 3,
  type = 'card'
}) => {
  const networkConfig = networkOptimizer.getConfig();
  const isSlowConnection = networkConfig.enableDataSaver;

  // Simplified skeleton for slow connections
  if (isSlowConnection) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded">
            <div className="w-12 h-12 bg-gray-700 rounded flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Full skeleton for good connections
  const renderCardSkeleton = () => (
    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
      <div className="w-full aspect-square bg-gray-700 rounded skeleton-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-700 rounded skeleton-pulse" />
        <div className="h-3 bg-gray-700 rounded w-3/4 skeleton-pulse" />
      </div>
    </div>
  );

  const renderListSkeleton = () => (
    <div className="flex items-center space-x-4 p-3">
      <div className="w-16 h-16 bg-gray-700 rounded skeleton-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-700 rounded skeleton-pulse" />
        <div className="h-3 bg-gray-700 rounded w-2/3 skeleton-pulse" />
      </div>
    </div>
  );

  const renderGridSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3">
          <div className="w-full aspect-square bg-gray-700 rounded skeleton-pulse" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded skeleton-pulse" />
            <div className="h-3 bg-gray-700 rounded w-3/4 skeleton-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  if (type === 'grid') {
    return <div className={className}>{renderGridSkeleton()}</div>;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {type === 'card' ? renderCardSkeleton() : renderListSkeleton()}
        </div>
      ))}
    </div>
  );
};

export default SlowConnectionSkeleton;