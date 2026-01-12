const PlaylistSkeleton = () => {
  return Array.from({ length: 7 }).map((_, i) => (
    <div key={i} className="p-2 rounded-md flex items-center gap-3">
      <div className="w-12 h-12 rounded-md flex-shrink-0 skeleton-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
      <div className="flex-1 min-w-0 hidden md:block space-y-2">
        <div className="h-4 rounded skeleton-pulse w-3/4" style={{ animationDelay: `${i * 0.1 + 0.1}s` }} />
        <div className="h-3 rounded skeleton-pulse w-1/2" style={{ animationDelay: `${i * 0.1 + 0.2}s` }} />
      </div>
    </div>
  ));
};
export default PlaylistSkeleton;
