const SectionGridSkeleton = () => {
  return (
    <div className="mb-8 skeleton-container">
      <div className="h-8 w-48 rounded mb-4 skeleton-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-md skeleton-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="aspect-square rounded-md skeleton-pulse mb-4" />
            <div className="h-4 rounded w-3/4 mb-2 skeleton-pulse" />
            <div className="h-4 rounded w-1/2 skeleton-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};
export default SectionGridSkeleton;
