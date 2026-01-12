const FeaturedGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center rounded-md overflow-hidden skeleton-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="w-16 sm:w-20 h-16 sm:h-20 flex-shrink-0 skeleton-pulse" />
          <div className="flex-1 p-4">
            <div className="h-4 rounded w-3/4 mb-2 skeleton-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};
export default FeaturedGridSkeleton;
