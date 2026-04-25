import { useEffect, useRef, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

type MediaType = 'image' | 'gif' | 'video' | 'audio';
type Platform = 'web' | 'app';

interface Promotion {
  id: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  platforms?: Platform;
  // legacy support
  imageUrl?: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

function getMediaType(promo: Promotion): MediaType {
  if (promo.mediaType) return promo.mediaType;
  // legacy: if only imageUrl exists, treat as image
  if (promo.imageUrl) return 'image';
  return 'image';
}

function getMediaUrl(promo: Promotion): string | undefined {
  return promo.mediaUrl || promo.imageUrl;
}

// ── Individual media renderers ──────────────────────────────────────────────

function ImageMedia({ url, alt }: { url: string; alt: string }) {
  return (
    <img
      src={url}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover opacity-80"
    />
  );
}

function GifMedia({ url, alt }: { url: string; alt: string }) {
  return (
    <img
      src={url}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

function VideoMedia({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  return (
    <>
      <video
        ref={videoRef}
        src={url}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted={muted}
        playsInline
      />
      {/* Mute toggle */}
      <button
        onClick={() => setMuted(m => !m)}
        className="absolute top-2 right-2 z-20 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
      >
        {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>
    </>
  );
}

function AudioMedia({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  }

  return (
    <>
      <audio ref={audioRef} src={url} loop onEnded={() => setPlaying(false)} />
      {/* Audio visualizer background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-indigo-900 to-pink-900">
        <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-30">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full bg-white ${playing ? 'animate-pulse' : ''}`}
              style={{
                height: `${20 + Math.sin(i * 0.8) * 30 + Math.random() * 20}%`,
                animationDelay: `${i * 0.05}s`,
                animationDuration: `${0.6 + Math.random() * 0.4}s`,
              }}
            />
          ))}
        </div>
      </div>
      {/* Play button */}
      <button
        onClick={toggle}
        className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 backdrop-blur-sm hover:bg-white/30 transition-colors"
      >
        {playing
          ? <Pause className="h-6 w-6 text-white" />
          : <Play className="h-6 w-6 text-white fill-white" />
        }
      </button>
    </>
  );
}

// ── Main Banner ─────────────────────────────────────────────────────────────

export function PromotionsBanner() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const snap = await getDocs(
          query(collection(db, 'promotions'), where('status', '==', 'active'))
        );
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Promotion[];
        // Filter: show if platforms is 'web' or not set (legacy = show everywhere)
        const valid = all.filter(p =>
          (!p.endDate || p.endDate >= today) &&
          (!p.platforms || p.platforms === 'web')
        );
        setPromos(valid);
      } catch (e) {
        console.error('Failed to load promotions', e);
      }
    };
    fetchPromos();
  }, []);

  // Auto-rotate every 5s — skip for video/audio (let them play)
  useEffect(() => {
    if (promos.length <= 1) return;
    const type = getMediaType(promos[current]);
    if (type === 'video' || type === 'audio') return;
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % promos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promos, current]);

  if (!promos.length) return null;

  const promo = promos[current];
  const mediaType = getMediaType(promo);
  const mediaUrl = getMediaUrl(promo);

  return (
    <div className="px-4 md:px-6 mb-2">
      {/* 16:5 aspect ratio */}
      <div
        className="relative w-full rounded-xl overflow-hidden bg-gradient-to-r from-purple-900/60 to-pink-900/60"
        style={{ paddingTop: '31.25%' }}
      >
        {/* Media layer */}
        {mediaUrl && (
          <>
            {mediaType === 'image' && <ImageMedia url={mediaUrl} alt={promo.title} />}
            {mediaType === 'gif'   && <GifMedia   url={mediaUrl} alt={promo.title} />}
            {mediaType === 'video' && <VideoMedia  url={mediaUrl} />}
            {mediaType === 'audio' && <AudioMedia  url={mediaUrl} />}
          </>
        )}

        {/* Gradient overlay — skip for audio (has its own bg) */}
        {mediaType !== 'audio' && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        )}

        {/* Text */}
        <div className="absolute inset-0 z-10 p-4 md:p-6 flex flex-col justify-end pointer-events-none">
          <p className="text-white font-bold text-base md:text-lg leading-tight drop-shadow">
            {promo.title}
          </p>
          {promo.description && (
            <p className="text-white/80 text-xs md:text-sm mt-1 drop-shadow line-clamp-2">
              {promo.description}
            </p>
          )}
        </div>

        {/* Dot indicators */}
        {promos.length > 1 && (
          <div className="absolute bottom-2 right-3 flex gap-1 z-20">
            {promos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? 'bg-white w-3' : 'bg-white/40 w-1.5'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
