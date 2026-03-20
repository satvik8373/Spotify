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
        source: 'jiosaavn'
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
        // Step 1: Fetch primary search results
        const primaryResult = await searchSongs(query, 30);
        const rawSongs = primaryResult?.data?.data?.results || primaryResult?.data?.results || [];
        const allFormatted = rawSongs.map(formatSong);

        // Top result = first song with audio URL
        const topResult = allFormatted.find(s => s.audioUrl) || allFormatted[0] || null;

        // Regular results (filtered, excluding top result)
        const regularResults = allFormatted
            .filter(s => s.audioUrl && s.id !== topResult?.id)
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
            topResult,
            results: regularResults,
            similarSongs,
            detectedMood,
            vibeMode,
            processingTime
        };

    } catch (error) {
        console.error('[SmartSearch] Error:', error.message);
        // Graceful fallback: just return raw search
        const fallback = await searchSongs(query, 20);
        const songs = (fallback?.data?.data?.results || fallback?.data?.results || []).map(formatSong).filter(s => s.audioUrl);
        return {
            intent,
            query,
            topResult: songs[0] || null,
            results: songs.slice(1),
            similarSongs: [],
            detectedMood: null,
            vibeMode: getVibeMode('joy'),
            processingTime: Date.now() - startTime
        };
    }
}
