import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Heart, Share2, Music, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Song } from '@/types';

interface MoodPlaylist {
  _id: string;
  name: string;
  emotion: 'sadness' | 'joy' | 'anger' | 'love' | 'fear' | 'surprise';
  songs: Song[];
  songCount: number;
  generatedAt: string;
  cached?: boolean;
}

interface MoodPlaylistDisplayProps {
  playlist: MoodPlaylist;
  onPlay: (index?: number) => void;
  onSave: () => void;
  onShare: () => void;
  onTryAgain: () => void;
  className?: string;
}

// Emotion-based color themes
const emotionThemes = {
  sadness: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    button: 'hover:bg-blue-500/10',
  },
  joy: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    button: 'hover:bg-yellow-500/10',
  },
  anger: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    button: 'hover:bg-red-500/10',
  },
  love: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    badge: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    button: 'hover:bg-pink-500/10',
  },
  fear: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    button: 'hover:bg-purple-500/10',
  },
  surprise: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    button: 'hover:bg-orange-500/10',
  },
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const MoodPlaylistDisplay: React.FC<MoodPlaylistDisplayProps> = ({
  playlist,
  onPlay,
  onSave,
  onShare,
  onTryAgain,
  className,
}) => {
  // Fallback to 'joy' if emotion is undefined or not in themes
  const emotion = playlist.emotion && emotionThemes[playlist.emotion]
    ? playlist.emotion
    : 'joy';
  const theme = emotionThemes[emotion];

  return (
    <Card className={cn("flex flex-col h-full bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/5 shadow-2xl rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]", className)}>
      {/* Ultra Compact Header Section */}
      <CardHeader className="p-3 sm:p-4 pb-3 border-b border-white/5 relative overflow-hidden flex-shrink-0 z-10">

        {/* Ambient Glow */}
        <div className={cn("absolute -top-32 -right-32 w-48 h-48 rounded-full blur-[60px] opacity-40 pointer-events-none transition-colors duration-1000", theme.bg)} />

        {/* Top Info & Actions Row */}
        <div className="relative z-10 flex items-center justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <CardTitle className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80 truncate tracking-tight">
              {playlist.name}
            </CardTitle>
            <Badge className={cn("px-1.5 py-0 rounded-[4px] text-[9px] font-bold border backdrop-blur-md uppercase tracking-wider hidden sm:flex items-center", theme.badge)}>
              {emotion}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              onClick={onSave}
              size="icon"
              className="rounded-full w-8 h-8 bg-white/5 hover:bg-white/10 border border-white/10 text-pink-400 transition-all hover:scale-105"
              title="Save Playlist"
            >
              <Heart className="w-4 h-4" />
            </Button>
            <Button
              onClick={onShare}
              size="icon"
              className="rounded-full w-8 h-8 bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-400 transition-all hover:scale-105"
              title="Share Playlist"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Primary Action Row */}
        <div className="relative z-10 flex flex-row gap-2 w-full">
          <Button
            onClick={() => onPlay(0)}
            className="flex-1 h-9 px-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-400 hover:to-emerald-300 text-black font-extrabold text-xs shadow-md shadow-green-500/10 transition-all hover:scale-[1.02]"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-black" />
            Play All ({playlist.songCount})
          </Button>
          <Button
            onClick={onTryAgain}
            variant="outline"
            className="flex-1 h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 border-white/20 text-white font-semibold text-xs transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
            New Mood
          </Button>
        </div>
      </CardHeader>

      {/* Song List - Flexible Height */}
      <CardContent className="flex-1 min-h-0 p-0 !pb-0 overflow-hidden bg-black/20 relative z-0">
        <ScrollArea className="h-full !pb-0 absolute inset-0">
          <div className="px-2 sm:px-4 py-2 pb-6">
            {playlist.songs.map((song, index) => (
              <div
                key={song._id || `song-${index}`}
                onClick={() => onPlay(index)}
                className={cn(
                  "flex items-center gap-3 px-2 sm:px-3 py-2.5 hover:bg-white/10 transition-all cursor-pointer group rounded-lg",
                  index !== playlist.songs.length - 1 && "border-b border-white/5"
                )}
              >
                {/* Track Number */}
                <span className="w-5 text-center text-xs text-white/40 font-bold group-hover:text-green-400 transition-colors">
                  {index + 1}
                </span>

                {/* Album Art */}
                <div className="relative w-10 h-10 rounded-md overflow-hidden bg-white/5 flex-shrink-0 shadow-lg group-hover:shadow-green-500/20 transition-all">
                  {song.imageUrl ? (
                    <img
                      src={song.imageUrl}
                      alt={song.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-3.5 h-3.5 text-white/30" />
                    </div>
                  )}
                </div>

                {/* Song Info */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="font-bold text-sm sm:text-base text-white truncate group-hover:text-green-400 transition-colors mb-0.5">
                    {song.title}
                  </div>
                  <div className="text-xs sm:text-sm text-white/50 truncate">
                    {song.artist}
                  </div>
                </div>

                {/* Duration */}
                <span className="text-xs sm:text-sm text-white/40 font-medium tabular-nums group-hover:text-white/80 transition-colors">
                  {formatDuration(song.duration)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
