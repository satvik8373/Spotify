import { useState, useCallback } from 'react';
import {
  convertAllSpotifySongsToJiosaavn,
  getSpotifySyncedSongs,
  getConversionStats,
  ConversionResult,
  ConversionProgress,
} from '@/services/spotifyToJiosaavnConverter';

export function useSpotifyToJiosaavnConverter() {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress>({
    current: 0,
    total: 0,
    currentSong: '',
    status: 'idle',
  });
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startConversion = useCallback(async () => {
    setIsConverting(true);
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: 0, currentSong: '', status: 'converting' });

    try {
      const conversionResult = await convertAllSpotifySongsToJiosaavn((p) => {
        setProgress(p);
      });
      
      setResult(conversionResult);
      setProgress(prev => ({ ...prev, status: 'completed' }));
    } catch (err: any) {
      setError(err.message || 'Conversion failed');
      setProgress(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsConverting(false);
    }
  }, []);

  const checkStats = useCallback(async () => {
    try {
      return await getConversionStats();
    } catch (err) {
      console.error('Error checking stats:', err);
      return { spotifyCount: 0, totalCount: 0 };
    }
  }, []);

  const getSpotifySongs = useCallback(async () => {
    try {
      return await getSpotifySyncedSongs();
    } catch (err) {
      console.error('Error getting Spotify songs:', err);
      return [];
    }
  }, []);

  return {
    isConverting,
    progress,
    result,
    error,
    startConversion,
    checkStats,
    getSpotifySongs,
  };
}
