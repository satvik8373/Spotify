/**
 * Smart Search Service
 * Hybrid intelligent search:
 *   1. Intent detection (song | artist | mood)
 *   2. JioSaavn top result fetch
 *   3. Mood extraction from song metadata
 *   4. Similar songs via TAG_MAP + parallel JioSaavn
 *   5. Vibe Mode — 3 mood shortcuts
 */

import { searchSongs } from './jiosaavn.service.js';
import { getHighestQualityAudioUrl } from '../lib/jiosaavnAudio.js';
import { detectEmotionByKeywords } from './moodPlaylist/fallbackDetector.js';
import { mapEmotionToGenres } from './moodPlaylist/genreMapper.js';
import { detectContext } from './moodPlaylist/contextDetector.js';
import { rankSongs } from './moodPlaylist/playlistGenerator.js';
import admin from '../config/firebase.js';

// ─────────────────────────────────────────
// Firestore catalog songs
// ─────────────────────────────────────────
let _firestoreSongsCache = null;
let _firestoreCacheTime = 0;
const FIRESTORE_CACHE_TTL = 30 * 1000; // 30 seconds

async function getFirestoreSongs() {
    const now = Date.now();
    if (_firestoreSongsCache && now - _firestoreCacheTime < FIRESTORE_CACHE_TTL) {
        return _firestoreSongsCache;
    }
    try {
        const db = admin.firestore();
        const snap = await db.collection('songs').get();
        const songs = snap.docs.map(d => {
            const data = d.data();
            const audioUrl = data.audioUrl || data.streamUrl || data.url || '';
            if (!audioUrl) return null;
            return {
                id: d.id,
                title: data.title || data.name || '',
                artist: data.artist || data.primaryArtists || '',
                album: typeof data.album === 'object' ? (data.album?.name || '') : (data.album || ''),
                year: data.year ? Number(data.year) : null,
                duration: data.duration ? Number(data.duration) : 0,
                imageUrl: data.imageUrl || '',
                audioUrl,
                source: 'catalog',
                playCount: 0,
            };
        }).filter(Boolean);
        _firestoreSongsCache = songs;
        _firestoreCacheTime = now;
        return songs;
    } catch (e) {
        console.error('[SmartSearch] Firestore fetch error:', e.message);
        return [];
    }
}

function matchesCatalogSong(song, query) {
    const q = query.toLowerCase();
    const title = (song.title || '').toLowerCase();
    const artist = (song.artist || '').toLowerCase();
    const album = (song.album || '').toLowerCase();
    return title.includes(q) || artist.includes(q) || album.includes(q) ||
        q.includes(title) || q.split(' ').some(w => w.length > 2 && title.includes(w));
}

// ─────────────────────────────────────────
// Intent Detection
// ─────────────────────────────────────────
const MOOD_PHRASES = [
    'sad songs', 'happy songs', 'romantic songs', 'workout music', 'gym songs',
    'party songs', 'chill songs', 'study music', 'sleep songs', 'love songs',
    'motivational songs', 'breakup songs', 'night songs', 'rain songs',
    'upbeat songs', 'energetic songs', 'focus music', 'relaxing songs',
    'devotional songs', 'bhajan', 'sufi songs', 'desi songs', 'punjabi songs',
    'bollywood songs', 'gujarati songs', 'tamil songs', 'telugu songs'
];

const ARTIST_SUFFIXES = ['songs', 'hits', 'best songs', 'playlist', 'top songs', 'all songs'];
const VARIANT_KEYWORDS_PATTERN = /\b(remix|version|edit|mix|dj|slowed|reverb|cover|acoustic|live|instrumental|karaoke|nightcore|lo[-\s]?fi|sped[-\s]?up|mashup|ringtone|bgm|jukebox)\b/gi;
const VARIANT_KEYWORDS_TEST = new RegExp(VARIANT_KEYWORDS_PATTERN.source, 'i');
const NOISE_KEYWORDS_PATTERN = /\b(official|audio|video|lyrics?|full|track|song)\b/gi;
const MIN_CORRECTION_SIMILARITY = 0.72;
const MIN_RESULT_SIMILARITY = 0.34;
const MAX_COMPARE_LENGTH = 64;

/**
 * Classify query intent
 * @returns {'song' | 'artist' | 'mood'}
 */
export function detectQueryIntent(query) {
    const lower = query.toLowerCase().trim();

    // Check if it's a pure mood phrase
    if (MOOD_PHRASES.some(phrase => lower.includes(phrase))) {
        return 'mood';
    }

    // Check if it looks like artist search: "arijit singh songs", "ap dhillon hits"
    const isArtistSearch = ARTIST_SUFFIXES.some(suffix => lower.endsWith(suffix));
    if (isArtistSearch) return 'artist';

    // Default: treat as song title search
    return 'song';
}

// ─────────────────────────────────────────
// Layer A: Query Understanding
// ─────────────────────────────────────────
function normalizeText(value = '') {
    return String(value)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/feat\.?|ft\.?/gi, ' ')
        .replace(/&/g, ' and ')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function addAspiratedVariants(term, candidates) {
    if (!term || term.length < 3) return;

    // Handles common Indian transliteration typos: "d" vs "dh", "t" vs "th".
    for (let i = 0; i < term.length; i += 1) {
        const char = term[i];
        const next = term[i + 1] || '';
        if ('bdgkpctj'.includes(char) && next !== 'h') {
            candidates.add(`${term.slice(0, i + 1)}h${term.slice(i + 1)}`);
        }
        if ('bdgkpctj'.includes(char) && next === 'h') {
            candidates.add(`${term.slice(0, i + 1)}${term.slice(i + 2)}`);
        }
    }
}

function createSearchPlan(query) {
    const originalQuery = String(query || '').trim().replace(/\s+/g, ' ');
    const normalizedQuery = normalizeText(originalQuery);
    if (normalizedQuery.length < 2) {
        return { originalQuery, normalizedQuery, retrievalQueries: [] };
    }

    const tokens = normalizedQuery.split(' ').filter(Boolean);
    const candidates = new Set([originalQuery, normalizedQuery]);

    if (tokens.length === 1) {
        const term = tokens[0];
        addAspiratedVariants(term, candidates);
        if (term.length >= 5) candidates.add(term.slice(0, -1));
        if (term.length >= 7) candidates.add(term.slice(0, -2));
        if (term.length >= 6) {
            candidates.add(term.slice(0, Math.max(4, Math.floor(term.length * 0.75))));
        }
    } else {
        candidates.add(tokens.slice(0, 2).join(' '));
        if (tokens[0]) candidates.add(tokens[0]);
        tokens.forEach(token => addAspiratedVariants(token, candidates));
        addAspiratedVariants(tokens.join(''), candidates);
    }

    return {
        originalQuery,
        normalizedQuery,
        retrievalQueries: Array.from(candidates)
            .filter(candidate => candidate.length >= 2)
            .slice(0, 8)
    };
}

function stringSimilarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.92;

    const left = a.slice(0, MAX_COMPARE_LENGTH);
    const right = b.slice(0, MAX_COMPARE_LENGTH);
    const matrix = Array.from({ length: left.length + 1 }, () =>
        new Array(right.length + 1).fill(0)
    );

    for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= left.length; i += 1) {
        for (let j = 1; j <= right.length; j += 1) {
            const cost = left[i - 1] === right[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return 1 - matrix[left.length][right.length] / Math.max(left.length, right.length);
}

function canonicalTitle(title) {
    return normalizeText(String(title || '').replace(/[\(\[\{].*?[\)\]\}]/g, ' '))
        .replace(VARIANT_KEYWORDS_PATTERN, ' ')
        .replace(NOISE_KEYWORDS_PATTERN, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ─────────────────────────────────────────
// Format a raw JioSaavn song
// ─────────────────────────────────────────
function formatSong(song) {
    const artistName =
        song.primaryArtists ||
        song.artists?.primary?.map(a => a.name).join(', ') ||
        song.artists?.all?.[0]?.name ||
        'Unknown Artist';

    // Robust image parsing
    let imageUrl = '';
    if (song.image && Array.isArray(song.image)) {
        const imgObj = song.image.find(i => i.quality === '500x500') ||
            song.image.find(i => i.quality === '150x150') ||
            song.image[song.image.length - 1];
        imageUrl = imgObj?.url || imgObj?.link || '';
    } else if (typeof song.image === 'string') {
        imageUrl = song.image;
    }

    // Robust audio URL parsing
    const audioUrl = getHighestQualityAudioUrl(song.downloadUrl);

    return {
        id: song.id,
        title: song.name || song.title || '',
        artist: artistName,
        album: song.album?.name || '',
        year: parseInt(song.year) || null,
        duration: parseInt(song.duration) || 0,
        imageUrl,
        audioUrl,
        source: song.source || 'jiosaavn',
        playCount: Number(song.playCount || song.play_count || 0) || 0
    };
}

// ─────────────────────────────────────────
// Layer C: Top-K Ranking
// ─────────────────────────────────────────
function getMatchScore(query, title, canonical, artist, album) {
    return Math.min(1, Math.max(
        stringSimilarity(query, title),
        stringSimilarity(query, canonical)
    ) +
        stringSimilarity(query, artist) * 0.2 +
        stringSimilarity(query, album) * 0.12);
}

function buildCandidate(rawSong, query) {
    const formatted = formatSong(rawSong);
    if (!formatted.id || !formatted.title) return null;

    const normalizedTitle = normalizeText(formatted.title);
    const normalizedArtist = normalizeText(formatted.artist);
    const normalizedAlbum = normalizeText(formatted.album);
    const canonical = canonicalTitle(formatted.title) || normalizedTitle;
    const combinedText = `${formatted.title} ${formatted.artist} ${formatted.album}`;
    const isVariant = VARIANT_KEYWORDS_TEST.test(normalizeText(combinedText));
    const hasArtist = normalizedArtist && normalizedArtist !== 'unknown artist';
    const hasAlbum = Boolean(normalizedAlbum);
    const hasOfficialFlag = Boolean(rawSong.isOfficial || rawSong.official || rawSong.isOriginal || rawSong.copyright || rawSong.label);
    const year = Number(formatted.year || 0);

    return {
        song: formatted,
        id: formatted.id,
        title: formatted.title,
        canonicalTitle: canonical,
        normalizedTitle,
        normalizedArtist,
        normalizedAlbum,
        playCount: formatted.playCount || 0,
        year,
        metadataScore:
            Number(Boolean(hasArtist)) +
            Number(hasAlbum) +
            Number(year > 0) +
            Number(hasOfficialFlag),
        originalPriority: isVariant
            ? 0
            : hasOfficialFlag
                ? 3
                : hasArtist && hasAlbum
                    ? 2
                    : 1,
        matchScore: getMatchScore(query, normalizedTitle, canonical, normalizedArtist, normalizedAlbum)
    };
}

function compareCandidates(a, b) {
    // If match scores are significantly different, prioritize the much better match
    if (Math.abs(b.matchScore - a.matchScore) > 0.15) {
        return b.matchScore - a.matchScore;
    }
    
    // For similar match scores, prioritize the LATEST year
    if (b.year !== a.year) return b.year - a.year;

    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.originalPriority !== a.originalPriority) return b.originalPriority - a.originalPriority;
    if (b.playCount !== a.playCount) return b.playCount - a.playCount;
    if (b.metadataScore !== a.metadataScore) return b.metadataScore - a.metadataScore;
    return a.title.localeCompare(b.title);
}

function withMatchScore(candidate, correctedQuery) {
    return {
        ...candidate,
        matchScore: getMatchScore(
            correctedQuery,
            candidate.normalizedTitle,
            candidate.canonicalTitle,
            candidate.normalizedArtist,
            candidate.normalizedAlbum
        )
    };
}

function findCorrectedQuery(normalizedQuery, candidates) {
    let bestCorrection = normalizedQuery;
    let bestScore = 0;

    for (const candidate of candidates) {
        const target = candidate.canonicalTitle || candidate.normalizedTitle;
        if (!target || target === normalizedQuery) continue;

        const similarity = Math.max(
            stringSimilarity(normalizedQuery, target),
            stringSimilarity(normalizedQuery, candidate.normalizedTitle)
        );
        const qualityBoost =
            candidate.originalPriority * 0.03 +
            Math.min(Math.log10(candidate.playCount + 1) / 100, 0.07);
        const correctionScore = similarity + qualityBoost;

        if (similarity >= MIN_CORRECTION_SIMILARITY && correctionScore > bestScore) {
            bestScore = correctionScore;
            bestCorrection = target;
        }
    }

    return bestCorrection;
}

function rankSongsTopK(query, rawSongs, limit = 20) {
    const normalizedQuery = normalizeText(query);
    const candidateById = new Map();

    for (const rawSong of rawSongs) {
        const candidate = buildCandidate(rawSong, normalizedQuery);
        if (!candidate || !candidate.song.audioUrl) continue;
        const existing = candidateById.get(candidate.id);
        if (!existing || compareCandidates(candidate, existing) < 0) {
            candidateById.set(candidate.id, candidate);
        }
    }

    const firstPass = Array.from(candidateById.values());
    if (!firstPass.length) {
        return { correctedQuery: normalizedQuery, songs: [], candidateCount: 0 };
    }

    const correctedQuery = findCorrectedQuery(normalizedQuery, firstPass);
    const rankedCandidates = correctedQuery === normalizedQuery
        ? firstPass
        : firstPass.map(candidate => withMatchScore(candidate, correctedQuery));

    const groups = new Map();
    for (const candidate of rankedCandidates) {
        const key = candidate.canonicalTitle || candidate.normalizedTitle || candidate.id;
        groups.set(key, [...(groups.get(key) || []), candidate]);
    }

    const orderedGroups = Array.from(groups.values()).map(items => {
        const sorted = [...items].sort(compareCandidates);
        return { top: sorted[0], items: sorted };
    }).sort((a, b) => compareCandidates(a.top, b.top));

    const flattened = orderedGroups.flatMap(group => group.items);
    const filtered = flattened.filter((candidate, index) =>
        candidate.matchScore >= MIN_RESULT_SIMILARITY || index < 3
    );

    return {
        correctedQuery,
        songs: (filtered.length ? filtered : flattened)
            .slice(0, Math.max(1, limit))
            .map(candidate => candidate.song),
        candidateCount: firstPass.length
    };
}

// ─────────────────────────────────────────
// Quality filter
// ─────────────────────────────────────────
function isLowQuality(s) {
    const combined = `${s.title} ${s.artist} ${s.album}`.toLowerCase();
    const banned = ['remix', 'lofi', 'lo-fi', 'ringtone', 'mashup', 'instrumental',
        '8d', 'slowed', 'reverb', 'karaoke', 'cover', 'unplugged', 'bgm', 'jukebox'];
    return banned.some(kw => combined.includes(kw)) ||
        !s.title || !s.audioUrl || s.artist === 'Unknown Artist';
}

// ─────────────────────────────────────────
// Extract mood from a song's title + artist
// ─────────────────────────────────────────
function extractSongMood(song) {
    const text = `${song.title} ${song.artist} ${song.album}`;
    const emotion = detectEmotionByKeywords(text);
    const context = detectContext(text);
    return {
        emotion: emotion.emotion || 'joy',
        baseEmotion: emotion.baseEmotion || 'joy',
        context: context.primary || null
    };
}

// ─────────────────────────────────────────
// Vibe Mode — suggest 3 mood shortcuts
// ─────────────────────────────────────────
const VIBE_PROFILES = {
    motivated: [{ label: '💪 Motivation', mood: 'motivated' }, { label: '🏋 Gym Energy', mood: 'workout' }, { label: '⚡ Confidence', mood: 'energetic' }],
    joy: [{ label: '🎉 Party', mood: 'party' }, { label: '🌞 Happy Vibes', mood: 'joy' }, { label: '🚀 Energetic', mood: 'energetic' }],
    sadness: [{ label: '😢 Sad Mood', mood: 'sadness' }, { label: '💔 Heartbreak', mood: 'heartbreak' }, { label: '🌧 Melancholy', mood: 'melancholy' }],
    love: [{ label: '❤️ Romantic', mood: 'romantic' }, { label: '🌹 Love Songs', mood: 'love' }, { label: '🌙 Late Night Love', mood: 'dreamy' }],
    calm: [{ label: '😌 Chill', mood: 'chill' }, { label: '📚 Study Mode', mood: 'focused' }, { label: '🌙 Sleep', mood: 'sleepy' }],
    anger: [{ label: '🔥 Intense', mood: 'anger' }, { label: '💪 Workout', mood: 'workout' }, { label: '🤬 Release', mood: 'dark' }],
    nostalgic: [{ label: '⏮ Throwback', mood: 'nostalgic' }, { label: '🎸 Retro', mood: 'nostalgic' }, { label: '😢 Emotional', mood: 'melancholy' }],
    chill: [{ label: '😎 Chill', mood: 'chill' }, { label: '☀️ Lazy Day', mood: 'calm' }, { label: '📖 Focus', mood: 'focused' }],
    desi: [{ label: '🎺 Punjabi', mood: 'desi' }, { label: '💃 Bhangra', mood: 'desi' }, { label: '🎶 Filmy', mood: 'filmy' }],
    sufi: [{ label: '🕌 Sufi', mood: 'sufi' }, { label: '🧘 Devotional', mood: 'devotional' }, { label: '😌 Peaceful', mood: 'calm' }],
};

function getVibeMode(emotion) {
    return VIBE_PROFILES[emotion] || VIBE_PROFILES['joy'];
}

// ─────────────────────────────────────────
// Main: Smart Search
// ─────────────────────────────────────────
export async function smartSearch(query) {
    const startTime = Date.now();
    const intent = detectQueryIntent(query);
    console.log(`[SmartSearch] query="${query}" intent=${intent}`);

    try {
        // Step 1: Query understanding + retrieval + Top-K ranking
        const searchPlan = createSearchPlan(query);
        const retrievedResults = await Promise.allSettled(
            searchPlan.retrievalQueries.map(async (searchQuery, index) => {
                const res = await searchSongs(searchQuery, index === 0 ? 50 : 25);
                return res?.data?.data?.results || res?.data?.results || [];
            })
        );

        const rawSongs = [];
        const seenRawIds = new Set();
        for (const result of retrievedResults) {
            if (result.status !== 'fulfilled') continue;
            for (const song of result.value) {
                const id = song?.id || `${song?.name || song?.title}-${song?.album?.name || ''}`;
                if (!id || seenRawIds.has(id)) continue;
                seenRawIds.add(id);
                rawSongs.push(song);
            }
        }

        const ranked = rankSongsTopK(query, rawSongs, 20);

        // Merge Firestore catalog songs — they appear naturally in results
        const catalogSongs = await getFirestoreSongs();
        const matchingCatalog = catalogSongs.filter(s => matchesCatalogSong(s, query));

        // Merge catalog songs into raw pool and re-rank
        const allRaw = [...rawSongs];
        const seenCatalogIds = new Set(seenRawIds);
        for (const cs of matchingCatalog) {
            if (!seenCatalogIds.has(cs.id)) {
                seenCatalogIds.add(cs.id);
                // Convert to JioSaavn-like format for rankSongsTopK
                allRaw.push({
                    id: cs.id,
                    name: cs.title,
                    title: cs.title,
                    primaryArtists: cs.artist,
                    album: { name: cs.album },
                    year: cs.year,
                    duration: cs.duration,
                    image: cs.imageUrl ? [{ quality: '500x500', url: cs.imageUrl }] : [],
                    downloadUrl: [{ quality: '320kbps', url: cs.audioUrl }],
                    source: 'catalog',
                });
            }
        }

        const rankedAll = rankSongsTopK(query, allRaw, 20);
        const topResult = rankedAll.songs[0] || ranked.songs[0] || null;
        const regularResults = rankedAll.songs
            .filter(s => s.id !== topResult?.id)
            .slice(0, 15);

        // Step 2: Extract mood from top result (or query itself for mood searches)
        let detectedMood = null;
        let similarSongs = [];

        if (topResult) {
            detectedMood = extractSongMood(topResult);
        } else if (intent === 'mood') {
            const emotion = detectEmotionByKeywords(query);
            const context = detectContext(query);
            detectedMood = { emotion: emotion.emotion, baseEmotion: emotion.baseEmotion, context: context.primary };
        }

        // Step 3: Fetch similar songs based on detected mood
        if (detectedMood) {
            const emotion = detectedMood.emotion;
            const context = detectedMood.context;
            const searchQueries = mapEmotionToGenres(emotion, context).slice(0, 4);

            const similarResults = await Promise.allSettled(
                searchQueries.map(async q => {
                    const res = await searchSongs(q, 20);
                    return res?.data?.data?.results || res?.data?.results || [];
                })
            );

            const seenIds = new Set([topResult?.id, ...regularResults.map(s => s.id)]);
            const rawSimilar = [];

            for (const res of similarResults) {
                if (res.status !== 'fulfilled') continue;
                for (const song of res.value) {
                    const fmt = formatSong(song);
                    if (!seenIds.has(fmt.id) && !isLowQuality(fmt)) {
                        rawSimilar.push(fmt);
                        seenIds.add(fmt.id);
                    }
                }
            }

            // Rank similar songs
            similarSongs = rankSongs(rawSimilar)
                .map(({ _rankScore, ...s }) => s)
                .slice(0, 12);
        }

        // Step 4: Vibe mode shortcuts
        const vibeMode = getVibeMode(detectedMood?.emotion || 'joy');

        const processingTime = Date.now() - startTime;
        console.log(`[SmartSearch] ✓ Done in ${processingTime}ms — top="${topResult?.title}" similar=${similarSongs.length}`);

        return {
            intent,
            query,
            correctedQuery: rankedAll.correctedQuery || ranked.correctedQuery,
            topResult,
            results: regularResults,
            similarSongs,
            detectedMood,
            vibeMode,
            processingTime
        };

    } catch (error) {
        console.error('[SmartSearch] Error:', error.message);
        // Graceful fallback: just return raw search + catalog songs
        const fallback = await searchSongs(query, 20).catch(() => null);
        const rawFallbackSongs = fallback?.data?.data?.results || fallback?.data?.results || [];
        
        // Merge Firestore catalog songs into fallback
        const catalogSongs = await getFirestoreSongs();
        const matchingCatalog = catalogSongs.filter(s => matchesCatalogSong(s, query));
        
        const allRawFallback = [...rawFallbackSongs];
        const seenCatalogIds = new Set(rawFallbackSongs.map(s => s.id));
        for (const cs of matchingCatalog) {
            if (!seenCatalogIds.has(cs.id)) {
                seenCatalogIds.add(cs.id);
                allRawFallback.push({
                    id: cs.id,
                    name: cs.title,
                    title: cs.title,
                    primaryArtists: cs.artist,
                    album: { name: cs.album },
                    year: cs.year,
                    duration: cs.duration,
                    image: cs.imageUrl ? [{ quality: '500x500', url: cs.imageUrl }] : [],
                    downloadUrl: [{ quality: '320kbps', url: cs.audioUrl }],
                    source: 'catalog',
                });
            }
        }

        const rankedFallback = rankSongsTopK(query, allRawFallback, 20);
        const songs = rankedFallback.songs.filter(s => s.audioUrl);
        return {
            intent,
            query,
            correctedQuery: rankedFallback.correctedQuery,
            topResult: songs[0] || null,
            results: songs.slice(1),
            similarSongs: [],
            detectedMood: null,
            vibeMode: getVibeMode('joy'),
            processingTime: Date.now() - startTime
        };
    }
}
