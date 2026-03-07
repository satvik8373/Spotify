import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { MoodPlaylistLoading } from './MoodPlaylistLoading';
import { MoodPlaylistDisplay } from './MoodPlaylistDisplay';
import {
  generateMoodPlaylist,
  saveMoodPlaylist,
  shareMoodPlaylist,
  MoodPlaylist
} from '@/services/moodPlaylistService';
import { usePlayerStore } from '@/stores/usePlayerStore';
import toast from 'react-hot-toast';
import { AlertCircle, Sparkles } from 'lucide-react';
import {
  SentimentSatisfiedOutlined,
  SentimentDissatisfiedOutlined,
  AcUnitOutlined,
  FlashOnOutlined,
  FavoriteBorderOutlined,
  HeadphonesOutlined
} from '@mui/icons-material';

interface MoodPlaylistGeneratorProps {
  className?: string;
}

type ViewState = 'input' | 'loading' | 'display';

export const MoodPlaylistGenerator: React.FC<MoodPlaylistGeneratorProps> = ({
  className,
}) => {
  const [moodText, setMoodText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>('input');
  const [playlist, setPlaylist] = useState<MoodPlaylist | null>(null);

  const { playAlbum, setIsPlaying } = usePlayerStore();

  const MIN_LENGTH = 3;
  const MAX_LENGTH = 200;
  const charCount = moodText.length;
  const isValid = charCount >= MIN_LENGTH && charCount <= MAX_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValid) {
      if (charCount === 0) {
        setError('Please enter your mood');
      } else if (charCount < MIN_LENGTH) {
        setError(`Mood description must be at least ${MIN_LENGTH} characters`);
      } else if (charCount > MAX_LENGTH) {
        setError(`Mood description must be less than ${MAX_LENGTH} characters`);
      }
      return;
    }

    setViewState('loading');

    try {
      const response = await generateMoodPlaylist(moodText);
      setPlaylist(response.playlist);
      setViewState('display');

      // Track analytics event
      logAnalyticsEvent('playlist_generated', {
        emotion: response.playlist.emotion,
        songCount: response.playlist.songCount,
        cached: response.playlist.cached,
      });
    } catch (err: any) {
      setViewState('input');

      // Handle rate limit errors
      if (err.isRateLimitError) {
        setError(err.message);

        // Track rate limit event
        logAnalyticsEvent('rate_limit_hit', {
          resetAt: err.resetAt,
        });
      } else {
        setError(err.message || 'Failed to generate playlist. Please try again.');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_LENGTH) {
      setMoodText(value);
      setError(null);
    }
  };

  const handlePlay = (index: number = 0) => {
    if (!playlist || playlist.songs.length === 0) return;

    // Play the playlist using playAlbum method
    playAlbum(playlist.songs, index);
    setIsPlaying(true);

    toast.success('Playing your mood playlist');

    // Track analytics event
    logAnalyticsEvent('playlist_played', {
      playlistId: playlist._id,
      emotion: playlist.emotion,
      startIndex: index
    });
  };

  const handleSave = async () => {
    if (!playlist) return;

    try {
      await saveMoodPlaylist(playlist);
      toast.success('Playlist saved to your library!');

      // Track analytics event
      logAnalyticsEvent('playlist_saved', {
        playlistId: playlist._id,
        emotion: playlist.emotion,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save playlist');
    }
  };

  const handleShare = async () => {
    if (!playlist) return;

    try {
      const { shareUrl } = await shareMoodPlaylist(playlist._id);

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to share playlist');
    }
  };

  const handleTryAgain = () => {
    setViewState('input');
    setPlaylist(null);
    setMoodText('');
    setError(null);
  };

  const logAnalyticsEvent = (eventType: string, metadata: Record<string, any>) => {
    // Simple analytics logging - can be extended with actual analytics service
    console.log('[Analytics]', eventType, metadata);
  };

  // Show loading state
  if (viewState === 'loading') {
    return <MoodPlaylistLoading className={className} />;
  }

  // Show playlist display
  if (viewState === 'display' && playlist) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={handlePlay}
          onSave={handleSave}
          onShare={handleShare}
          onTryAgain={handleTryAgain}
        />
      </div>
    );
  }

  // Show input form
  return (
    <div className="flex flex-col h-full w-full items-center justify-center px-1 sm:px-0">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col justify-center min-h-0 py-0 sm:py-1 px-1 sm:px-2">
        {/* Title Section */}
        <div className="mb-1.5 sm:mb-3 text-center shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-xl sm:text-[26px] font-black text-white tracking-tight leading-none mb-1 flex items-center justify-center gap-1.5 drop-shadow-lg">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            AI Mood Generator
          </h2>
          <p className="text-[10px] sm:text-[11px] text-white/50 font-medium tracking-wide uppercase">Describe your vibe. We'll curate the music.</p>
        </div>

        {/* iOS-style Glassmorphism Input Container */}
        <div className="bg-white/10 backdrop-blur-3xl rounded-[20px] sm:rounded-3xl border border-white/20 p-2.5 sm:p-4 shadow-2xl shrink-0">
          <Textarea
            value={moodText}
            onChange={handleChange}
            placeholder="How are you feeling right now?"
            className="min-h-[44px] sm:min-h-[60px] resize-none border-0 !ring-0 !ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0 focus-visible:border-transparent text-[13px] sm:text-[15px] p-0 bg-transparent text-white placeholder:text-white/40 leading-relaxed custom-scrollbar"
            aria-label="Mood description"
          />

          <div className="flex items-center justify-between mt-1 sm:mt-3 pt-1 sm:pt-3 border-t border-white/10">
            <span className={cn(
              'text-xs font-medium',
              charCount === 0 && 'text-white/40',
              charCount > 0 && charCount < MIN_LENGTH && 'text-yellow-400',
              charCount >= MIN_LENGTH && charCount <= MAX_LENGTH && 'text-green-400',
              charCount > MAX_LENGTH && 'text-red-400'
            )}>
              {charCount}/{MAX_LENGTH}
            </span>

            <Button
              type="submit"
              disabled={!isValid}
              className="rounded-full px-6 h-9 sm:h-10 text-[13px] sm:text-sm font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
              Generate
            </Button>
          </div>
        </div>

        {/* Quick Emotion Buttons (Separate Container) */}
        <div className="mt-1.5 sm:mt-3 bg-white/10 backdrop-blur-3xl rounded-[20px] sm:rounded-3xl border border-white/20 p-2 sm:p-3 shadow-2xl shrink-0">
          <div className="flex items-center justify-center gap-1.5 mb-1.5 sm:mb-2">
            <div className="h-px bg-white/10 flex-1 rounded-full"></div>
            <p className="text-[8px] sm:text-[9px] font-semibold text-white/40 uppercase tracking-widest px-1.5">Quick Moods</p>
            <div className="h-px bg-white/10 flex-1 rounded-full"></div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
            {[
              { label: 'Happy', text: 'I want a playlist that sounds happy, upbeat, and full of positive energy.', icon: SentimentSatisfiedOutlined },
              { label: 'Sad', text: 'I need a sad, melancholic, and emotional playlist for deep reflection.', icon: SentimentDissatisfiedOutlined },
              { label: 'Calm', text: 'Looking for a very calm, peaceful, and relaxing playlist to unwind.', icon: AcUnitOutlined },
              { label: 'Energetic', text: 'Create an extremely energetic and motivating playlist for an intense workout.', icon: FlashOnOutlined },
              { label: 'Romantic', text: 'I want a romantic, slow, and intimate playlist perfect for a date night.', icon: FavoriteBorderOutlined },
              { label: 'Focus', text: 'I need a quiet, focused, deep-work playlist with minimal distractions to concentrate.', icon: HeadphonesOutlined }
            ].map(({ label, text, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setMoodText(text);
                  setError(null);
                }}
                className={cn(
                  "group flex flex-col items-center justify-center gap-0.5 sm:gap-1 py-1 sm:py-1.5 px-0.5 rounded-lg sm:rounded-xl border transition-all duration-300",
                  "hover:scale-[1.02] active:scale-95",
                  "bg-white/5 border-white/5",
                  "hover:bg-white/10 hover:border-white/10 shadow-sm"
                )}
              >
                <div className="p-1 sm:p-1.5 rounded-full bg-white/5 text-white/60 group-hover:text-white transition-colors">
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-medium text-white/60 group-hover:text-white transition-colors">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4 rounded-2xl bg-red-500/10 border-red-500/20 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  );
};
