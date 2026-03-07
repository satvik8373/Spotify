import axiosInstance from '@/lib/axios';

export interface MoodHistoryPlaylist {
    _id: string;
    name: string;
    emotion: string;
    moodText?: string;
    songs: Array<{
        _id: string;
        title: string;
        artist: string;
        album: string;
        imageUrl: string;
        audioUrl: string;
        duration: number;
    }>;
    songCount: number;
    generatedAt?: any;
    createdAt?: any;
    coverGradient?: string;
    isFinalized?: boolean;
}

export interface MoodHistoryResponse {
    playlists: MoodHistoryPlaylist[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
}

export const fetchMoodHistory = async (page: number = 1, limit: number = 10): Promise<MoodHistoryResponse> => {
    const res = await axiosInstance.get(`/playlists/mood-history?page=${page}&limit=${limit}`);
    return res.data;
};

export const finalizePlaylist = async (playlistId: string): Promise<{ message: string; playlist: MoodHistoryPlaylist }> => {
    const res = await axiosInstance.post('/playlists/mood-finalize', { playlistId });
    return res.data;
};
