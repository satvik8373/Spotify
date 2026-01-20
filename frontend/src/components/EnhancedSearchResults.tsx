import React, { useMemo } from 'react';
import { SearchResult } from '@/services/enhancedSearchService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Music, 
  ListMusic, 
  User, 
  Album,
  Clock,
  TrendingUp,
  Star,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface EnhancedSearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading?: boolean;
  onPlaySong?: (song: any) => void;
  onViewPlaylist?: (playlistId: string) => void;
  className?: string;
}

const EnhancedSearchResults: React.FC<EnhancedSearchResultsProps> = ({
  results,
  query,
  isLoading = false,
  onPlaySong,
  onViewPlaylist,
  className
}) => {
  const navigate = useNavigate();
  const { setCurrentSong } = usePlayerStore();

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      song: [],
      playlist: [],
      artist: [],
      album: []
    };

    results.forEach(result => {
      if (groups[result.type]) {
        groups[result.type].push(result);
      }
    });

    return groups;
  }, [results]);

  // Get top result
  const topResult = useMemo(() => {
    return results.length > 0 ? results[0] : null;
  }, [results]);

  const handlePlaySong = (result: SearchResult) => {
    if (result.type === 'song' && result.data) {
      setCurrentSong(result.data);
      onPlaySong?.(result.data);
      toast.success(`Now playing: ${result.title}`);
    }
  };

  const handleViewPlaylist = (result: SearchResult) => {
    if (result.type === 'playlist' && result.data?._id) {
      navigate(`/playlist/${result.data._id}`);
      onViewPlaylist?.(result.data._id);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'song': return Music;
      case 'playlist': return ListMusic;
      case 'artist': return User;
      case 'album': return Album;
      default: return Music;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'song': return 'text-green-400';
      case 'playlist': return 'text-blue-400';
      case 'artist': return 'text-purple-400';
      case 'album': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-4"></div>
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-muted rounded-lg"></div>
              <div className="flex-1">
                <div className="h-6 bg-muted rounded w-48 mb-2"></div>
                <div className="h-4 bg-muted rounded w-32"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Music className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
        <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Top Result */}
      {topResult && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Top result</h2>
          </div>
          
          <div className="bg-card rounded-xl p-6 border border-border hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-6">
              {/* Result Image */}
              <div className="relative">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={topResult.image || '/images/default-album.png'}
                    alt={topResult.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/default-album.png';
                    }}
                  />
                </div>
                
                {/* Play button overlay for songs */}
                {topResult.type === 'song' && (
                  <Button
                    size="icon"
                    className="absolute inset-0 w-full h-full bg-black/60 hover:bg-black/80 text-white rounded-xl opacity-0 hover:opacity-100 transition-opacity"
                    onClick={() => handlePlaySong(topResult)}
                  >
                    <Play className="h-8 w-8" />
                  </Button>
                )}
              </div>

              {/* Result Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {React.createElement(getTypeIcon(topResult.type), {
                    className: cn("h-4 w-4", getTypeColor(topResult.type))
                  })}
                  <Badge variant="secondary" className="text-xs capitalize">
                    {topResult.type}
                  </Badge>
                  {topResult.relevanceScore && topResult.relevanceScore > 80 && (
                    <Badge variant="default" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Best match
                    </Badge>
                  )}
                </div>
                
                <h3 className="text-2xl font-bold text-foreground mb-2 truncate">
                  {topResult.title}
                </h3>
                
                {topResult.subtitle && (
                  <p className="text-muted-foreground mb-4 truncate">
                    {topResult.subtitle}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  {topResult.type === 'song' ? (
                    <Button
                      onClick={() => handlePlaySong(topResult)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Play
                    </Button>
                  ) : topResult.type === 'playlist' ? (
                    <Button
                      onClick={() => handleViewPlaylist(topResult)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Playlist
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grouped Results */}
      {Object.entries(groupedResults).map(([type, typeResults]) => {
        if (typeResults.length === 0) return null;
        
        // Skip showing the top result again in grouped results
        const filteredResults = type === topResult?.type 
          ? typeResults.slice(1) 
          : typeResults;
        
        if (filteredResults.length === 0) return null;

        const TypeIcon = getTypeIcon(type);
        
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-4">
              <TypeIcon className={cn("h-5 w-5", getTypeColor(type))} />
              <h2 className="text-xl font-bold text-foreground capitalize">
                {type}s ({filteredResults.length})
              </h2>
            </div>

            <div className="grid gap-3">
              {filteredResults.slice(0, 6).map((result, index) => (
                <div
                  key={`${result.id}-${index}`}
                  className="bg-card rounded-lg p-4 border border-border hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    {/* Result Image */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={result.image || '/images/default-album.png'}
                          alt={result.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/default-album.png';
                          }}
                        />
                      </div>
                      
                      {/* Play button for songs */}
                      {result.type === 'song' && (
                        <Button
                          size="icon"
                          className="absolute inset-0 w-full h-full bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handlePlaySong(result)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Result Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">
                        {result.title}
                      </h4>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      {result.type === 'song' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePlaySong(result)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      ) : result.type === 'playlist' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewPlaylist(result)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    {/* Relevance Score (for debugging) */}
                    {process.env.NODE_ENV === 'development' && result.relevanceScore && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(result.relevanceScore)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {/* Show more button */}
              {filteredResults.length > 6 && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    // Could implement pagination or show all results
                    toast.info(`Showing top 6 ${type}s. More results available.`);
                  }}
                >
                  Show {filteredResults.length - 6} more {type}s
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EnhancedSearchResults;