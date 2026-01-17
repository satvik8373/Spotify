const UsersListSkeleton = () => {
  return Array.from({ length: 4 }).map((_, i) => (
    <div
      key={i}
      className="flex items-center justify-center lg:justify-start gap-3 p-3 rounded-lg skeleton-pulse"
      style={{ animationDelay: `${i * 0.1}s` }}
    >
      <div className="h-12 w-12 rounded-full skeleton-pulse" />
      <div className="flex-1 lg:block hidden">
        <div className="h-4 w-24 rounded mb-2 skeleton-pulse" />
        <div className="h-3 w-32 rounded skeleton-pulse" />
      </div>
    </div>
  ));
};
export default UsersListSkeleton;
