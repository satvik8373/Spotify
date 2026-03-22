import { useMusicStore } from '@/stores/useMusicStore';
import type { Song } from '@/types';
import { getHighestQualityAudioUrl } from '@/utils/jiosaavnAudio';

const INVALID_TEXT_VALUES = new Set(['', 'null', 'undefined', '[object object]']);
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const SKIP_ID_PREFIXES = ['spotify-', 'liked-', 'spotify-auto-'];

const resolvedAudioCache = new Map<string, string>();
const inFlightResolutions = new Map<string, Promise<string>>();

const getSafeText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const normalized = String(value).trim();
  return INVALID_TEXT_VALUES.has(normalized.toLowerCase()) ? '' : normalized;
};

const normalizeAudioUrl = (url: string): string => {
  return getSafeText(url).replace(/^http:\/\//, 'https://');
};

const normalizeMatchText = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[\s\-_]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
};

export const getSongResolutionKey = (song: Partial<Song> | null | undefined): string => {
  if (!song) return '';
  const id = getSafeText(song._id);
  if (id) return id;

  const title = getSafeText(song.title);
  const artist = getSafeText(song.artist);
  return `${title}::${artist}`.toLowerCase();
};

export const isSameSong = (
  left: Partial<Song> | null | undefined,
  right: Partial<Song> | null | undefined
): boolean => {
  if (!left || !right) return false;

  const leftId = getSafeText(left._id);
  const rightId = getSafeText(right._id);
  if (leftId && rightId) {
    return leftId === rightId;
  }

  const leftTitle = normalizeMatchText(getSafeText(left.title));
  const rightTitle = normalizeMatchText(getSafeText(right.title));
  const leftArtist = normalizeMatchText(getSafeText(left.artist));
  const rightArtist = normalizeMatchText(getSafeText(right.artist));

  return Boolean(leftTitle && leftArtist && leftTitle === rightTitle && leftArtist === rightArtist);
};

export const getPotentialJioSongIds = (song: Partial<Song>): string[] => {
  const ids = new Set<string>();

  const addId = (value: unknown) => {
    const id = getSafeText(value);
    if (!id || SKIP_ID_PREFIXES.some((prefix) => id.startsWith(prefix))) {
      return;
    }
    ids.add(id);
  };

  const rawId = getSafeText(song._id);
  if (rawId) {
    if (rawId.startsWith('jiosaavn_')) {
      addId(rawId.slice('jiosaavn_'.length));
    } else if (rawId.startsWith('indian-song-')) {
      const parsed = rawId.slice('indian-song-'.length).split('-')[0];
      addId(parsed);
    } else if (!OBJECT_ID_PATTERN.test(rawId)) {
      addId(rawId);
    }
  }

  const songWithMeta = song as Partial<Song> & {
    id?: unknown;
    originalId?: unknown;
    spotifyId?: unknown;
    jioSongId?: unknown;
  };

  addId(songWithMeta.id);
  addId(songWithMeta.originalId);
  addId(songWithMeta.spotifyId);
  addId(songWithMeta.jioSongId);

  return [...ids].filter((id) => id.length > 2);
};

const tryFetchAudioBySongId = async (songId: string): Promise<string> => {
  try {
    const response = await fetch(`/api/jiosaavn/songs/${encodeURIComponent(songId)}`);
    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    const payload = data?.data;
    if (!payload) {
      return '';
    }

    const fromDownloadUrl = getHighestQualityAudioUrl(payload.downloadUrl);
    if (fromDownloadUrl) {
      return normalizeAudioUrl(fromDownloadUrl);
    }

    const fallbackUrl = getSafeText(payload.audioUrl || payload.url);
    return fallbackUrl ? normalizeAudioUrl(fallbackUrl) : '';
  } catch {
    return '';
  }
};

const pickBestSearchResultUrl = (
  song: Partial<Song>,
  results: Array<{ title?: string; artist?: string; url?: string }>
): string => {
  if (!results.length) return '';

  const targetTitle = normalizeMatchText(getSafeText(song.title));
  const targetArtist = normalizeMatchText(getSafeText(song.artist));

  const exact = results.find((result) => {
    const url = getSafeText(result.url);
    if (!url) return false;
    const title = normalizeMatchText(getSafeText(result.title));
    const artist = normalizeMatchText(getSafeText(result.artist));
    return title === targetTitle && artist === targetArtist;
  });

  if (exact?.url) {
    return normalizeAudioUrl(exact.url);
  }

  const partial = results.find((result) => {
    const url = getSafeText(result.url);
    if (!url) return false;
    const title = normalizeMatchText(getSafeText(result.title));
    return targetTitle ? title.includes(targetTitle) || targetTitle.includes(title) : true;
  });

  if (partial?.url) {
    return normalizeAudioUrl(partial.url);
  }

  const firstWithAudio = results.find((result) => getSafeText(result.url));
  return firstWithAudio?.url ? normalizeAudioUrl(firstWithAudio.url) : '';
};

const resolveSongAudioUrlUncached = async (song: Partial<Song>): Promise<string> => {
  const existingUrl = normalizeAudioUrl(getSafeText(song.audioUrl));
  if (existingUrl && !existingUrl.startsWith('blob:')) {
    return existingUrl;
  }

  const candidateIds = getPotentialJioSongIds(song);
  for (const candidateId of candidateIds) {
    const resolvedUrl = await tryFetchAudioBySongId(candidateId);
    if (resolvedUrl) {
      return resolvedUrl;
    }
  }

  const searchQuery = [getSafeText(song.title), getSafeText(song.artist)]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (!searchQuery) {
    return '';
  }

  try {
    const musicStore = useMusicStore.getState();
    await musicStore.searchIndianSongs(searchQuery);
    const results = useMusicStore.getState().indianSearchResults || [];
    return pickBestSearchResultUrl(song, results);
  } catch {
    return '';
  }
};

export const resolveSongAudioUrl = async (song: Partial<Song>): Promise<string> => {
  const key = getSongResolutionKey(song);
  if (!key) return '';

  const cached = resolvedAudioCache.get(key);
  if (cached) {
    return cached;
  }

  const inFlight = inFlightResolutions.get(key);
  if (inFlight) {
    return inFlight;
  }

  const resolverPromise = resolveSongAudioUrlUncached(song)
    .then((url) => {
      if (url) {
        resolvedAudioCache.set(key, url);
      }
      return url;
    })
    .finally(() => {
      inFlightResolutions.delete(key);
    });

  inFlightResolutions.set(key, resolverPromise);
  return resolverPromise;
};
