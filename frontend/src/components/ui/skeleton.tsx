import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50 dark:bg-muted/30", className)}
      {...props}
    />
  )
}

// Song row skeleton for music lists
function SongRowSkeleton({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <div className={cn(
      "group relative hover:bg-white/5 rounded-md",
      isMobile 
        ? "grid grid-cols-[1fr_auto] gap-3 p-2" 
        : "grid grid-cols-[16px_4fr_2fr_1fr_auto] gap-4 p-2 px-4"
    )}>
      {/* Index number - desktop only */}
      {!isMobile && (
        <div className="flex items-center justify-center">
          <Skeleton className="w-4 h-4 rounded-sm" />
        </div>
      )}
      
      {/* Title and artist column */}
      <div className="flex items-center min-w-0">
        <Skeleton className={cn(
          "flex-shrink-0 mr-3 rounded-md",
          isMobile ? "w-12 h-12" : "w-10 h-10"
        )} />
        
        <div className="min-w-0 pr-2 flex-1">
          <Skeleton className="h-4 w-36 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      
      {/* Date added column - desktop only */}
      {!isMobile && (
        <div className="hidden md:flex items-center">
          <Skeleton className="h-4 w-24" />
        </div>
      )}
      
      {/* Duration column - desktop only */}
      {!isMobile && (
        <div className="hidden md:flex items-center justify-end">
          <Skeleton className="h-4 w-10" />
        </div>
      )}
      
      {/* Actions column */}
      <div className="flex items-center justify-end gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  )
}

// Playlist card skeleton
function PlaylistCardSkeleton() {
  return (
    <div className="group relative transform transition-all duration-300 hover:scale-[1.02]">
      <div className="relative">
        <Skeleton className="w-full aspect-square rounded-lg" />
        <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Skeleton className="w-12 h-12 rounded-full" />
        </div>
      </div>
      <div className="mt-2">
        <Skeleton className="h-4 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

// Button skeleton
function ButtonSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton className={cn("h-10 w-20 rounded-lg", className)} />
  )
}

// Card skeleton
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 space-y-3", className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}

// List skeleton for multiple items
function ListSkeleton({ count = 5, isMobile = false }: { count?: number; isMobile?: boolean }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <SongRowSkeleton key={i} isMobile={isMobile} />
      ))}
    </div>
  )
}

// Grid skeleton for playlists
function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
      {[...Array(count)].map((_, i) => (
        <PlaylistCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Page skeleton for full page loading
function PageSkeleton() {
  return (
    <div className="p-4 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <ListSkeleton count={8} />
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  SongRowSkeleton, 
  PlaylistCardSkeleton, 
  ButtonSkeleton, 
  CardSkeleton, 
  ListSkeleton, 
  GridSkeleton, 
  PageSkeleton 
}
