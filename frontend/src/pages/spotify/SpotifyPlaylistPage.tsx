import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Play, Pause, Music2 } from 'lucide-react';
import { useSpotify } from '@/contexts/SpotifyContext';
import * as spotifyService from '@/services/spotifyService';

interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
}

export default function SpotifyPlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const spotify = useSpotify();
  const [isLoading, setIsLoading] = useState(true);
  const [playlist, setPlaylist] = useState<any | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const pl = await spotifyService.getPlaylist(id);
        setPlaylist(pl);
        const items = Array.isArray(pl.tracks?.items) ? pl.tracks.items : [];
        const mapped: SpotifyTrack[] = items
          .map((it: any) => it.track)
          .filter(Boolean)
          .map((t: any) => ({
            id: t.id,
            uri: t.uri,
            name: t.name,
            duration_ms: t.duration_ms,
            artists: t.artists || [],
          }));
        setTracks(mapped);
      } catch (e) {
        // noop
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const togglePlay = async (track: SpotifyTrack) => {
    if (!spotify.isAuthenticated) return;
    if (playingTrackId === track.id) {
      setPlayingTrackId(null);
      return;
    }
    const ok = await spotify.playTrack(track.uri);
    if (ok) setPlayingTrackId(track.id);
  };

  const formatDuration = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-4">
        <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="text-muted-foreground">Playlist not found.</div>
      </div>
    );
  }

  return (
    <main className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6">
        <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="w-32 h-32 rounded-md overflow-hidden bg-muted flex items-center justify-center">
            {playlist.images?.[0]?.url ? (
              <img src={playlist.images[0].url} alt={playlist.name} className="w-full h-full object-cover" />
            ) : (
              <Music2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase text-muted-foreground">Spotify Playlist</div>
            <h1 className="text-2xl font-bold truncate">{playlist.name}</h1>
            <div className="text-sm text-muted-foreground truncate">
              {playlist.owner?.display_name || 'Unknown'} • {playlist.tracks?.total || tracks.length} tracks
            </div>
          </div>
        </div>

        <div className="border border-border rounded-md overflow-hidden">
          <div className="grid grid-cols-12 px-3 py-2 text-xs uppercase text-muted-foreground bg-muted/30">
            <div className="col-span-6 sm:col-span-6">Title</div>
            <div className="col-span-4 sm:col-span-4">Artists</div>
            <div className="col-span-2 sm:col-span-2 text-right">Time</div>
          </div>
          <div>
            {tracks.map((t) => (
              <div key={t.id} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-accent/50">
                <div className="col-span-6 sm:col-span-6 flex items-center gap-3 min-w-0">
                  <button
                    className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground"
                    onClick={() => togglePlay(t)}
                    title={playingTrackId === t.id ? 'Pause' : 'Play'}
                  >
                    {playingTrackId === t.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <div className="truncate">{t.name}</div>
                </div>
                <div className="col-span-4 sm:col-span-4 truncate">
                  {t.artists?.map(a => a.name).join(', ')}
                </div>
                <div className="col-span-2 sm:col-span-2 text-right text-sm text-muted-foreground">
                  {formatDuration(t.duration_ms)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}


