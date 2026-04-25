import axiosInstance from '@/lib/axios';

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

export const runSmartSearch = async (query: string): Promise<SmartSearchResult> => {
    const response = await axiosInstance.get<{ success: boolean; data: SmartSearchResult }>(
        `/search/smart?q=${encodeURIComponent(query)}`
    );
    return response.data.data;
};
