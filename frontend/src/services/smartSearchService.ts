import { getCatalogSongs, filterCatalogSongs } from './catalogService';

export interface SmartSearchSong {
    id: string;
    title: string;
    artist: string;
    album: string;
    year: number | null;
    duration: number;
    imageUrl: string;
    audioUrl: string;
    source: string;
}

export interface VibeMode {
    label: string;
    mood: string;
}

export interface DetectedMood {
    emotion: string;
    baseEmotion: string;
    context: string | null;
}

export interface SmartSearchResult {
    intent: 'song' | 'artist' | 'mood';
    query: string;
    correctedQuery?: string;
    topResult: SmartSearchSong | null;
    results: SmartSearchSong[];
    similarSongs: SmartSearchSong[];
    detectedMood: DetectedMood | null;
    vibeMode: VibeMode[];
    processingTime: number;
}

const JIOSAAVN_URLS = [
    'https://saavn.sumit.co/api/search/songs',
    'https://jiosaavn-api-privatecvc2.vercel.app/search/songs',
    'https://saavn.me/search/songs',
];

async function fetchJioSaavnSearch(query: string, limit = 20): Promise<SmartSearchSong[]> {
    for (const baseUrl of JIOSAAVN_URLS) {
        try {
            const url = `${baseUrl}?query=${encodeURIComponent(query)}&limit=${limit}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) continue;
            const json = await res.json();
            const raw: any[] = json?.data?.results || json?.results || [];
            const songs: SmartSearchSong[] = raw
                .filter(s => s?.id)
                .map(s => {
                    const downloads: any[] = Array.isArray(s.downloadUrl) ? s.downloadUrl : [];
                    const audioUrl =
                        downloads.find((d: any) => d.quality === '320kbps')?.url ||
                        downloads.find((d: any) => d.quality === '160kbps')?.url ||
                        downloads[downloads.length - 1]?.url || '';
                    const images: any[] = Array.isArray(s.image) ? s.image : [];
                    const imageUrl =
                        images.find((i: any) => i.quality === '500x500')?.url ||
                        images[images.length - 1]?.url || '';
                    const artist =
                        s.artists?.primary?.map((a: any) => a.name).join(', ') ||
                        s.primaryArtists || s.artist || 'Unknown Artist';
                    return {
                        id: s.id,
                        title: s.name || s.title || '',
                        artist,
                        album: s.album?.name || '',
                        year: s.year ? Number(s.year) : null,
                        duration: Number(s.duration) || 0,
                        imageUrl,
                        audioUrl,
                        source: 'jiosaavn',
                    };
                })
                .filter(s => s.audioUrl);
            if (songs.length > 0) return songs;
        } catch {
            // try next provider
        }
    }
    return [];
}

export const runSmartSearch = async (query: string): Promise<SmartSearchResult> => {
    const start = Date.now();

    // Run JioSaavn search + catalog fetch in parallel
    const [jiosaavnSongs, catalogSongs] = await Promise.all([
        fetchJioSaavnSearch(query, 20),
        getCatalogSongs().catch(() => []),
    ]);

    // Merge catalog songs that match the query and aren't already in results
    const matchingCatalog = filterCatalogSongs(catalogSongs, query);
    const existingIds = new Set(jiosaavnSongs.map(s => s.id));
    const catalogResults: SmartSearchSong[] = matchingCatalog
        .filter(s => !existingIds.has(s._id))
        .map(s => ({
            id: s._id,
            title: s.title,
            artist: s.artist,
            album: s.album || '',
            year: null,
            duration: s.duration || 0,
            imageUrl: s.imageUrl || '',
            audioUrl: s.audioUrl,
            source: 'catalog',
        }));

    // Rank: latest year first, then by title relevance as tiebreaker
    const q = query.toLowerCase().trim();
    const score = (s: SmartSearchSong) => {
        const t = s.title.toLowerCase();
        const a = s.artist.toLowerCase();
        if (t === q) return 100;
        if (t.startsWith(q)) return 80;
        if (t.includes(q)) return 60;
        if (a.includes(q)) return 30;
        return 10;
    };

    const allResults = [...catalogResults, ...jiosaavnSongs]
        .sort((a, b) => {
            const yearDiff = (b.year || 0) - (a.year || 0);
            if (yearDiff !== 0) return yearDiff;
            return score(b) - score(a);
        });

    const topResult = allResults[0] || null;
    const results = allResults.slice(1);

    return {
        intent: 'song',
        query,
        correctedQuery: query,
        topResult,
        results,
        similarSongs: [],
        detectedMood: null,
        vibeMode: [],
        processingTime: Date.now() - start,
    };
};
