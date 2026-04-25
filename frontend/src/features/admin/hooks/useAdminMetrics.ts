import { useCallback, useEffect, useState } from 'react';
import { collection, getCountFromServer } from 'firebase/firestore';

import { db } from '@/lib/firebase';

import type { AdminSession } from '../types';

export interface AdminLiveMetrics {
  songs?: number;
  playlists?: number;
  users?: number;
  trendingSongs?: number;
}

interface UseAdminMetricsResult {
  metrics: AdminLiveMetrics;
  isRefreshing: boolean;
  isLive: boolean;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
}

export const useAdminMetrics = (session: AdminSession): UseAdminMetricsResult => {
  const [metrics, setMetrics] = useState<AdminLiveMetrics>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (session.status !== 'granted' || session.preview) {
      setMetrics({});
      setLastSyncedAt(null);
      return;
    }

    setIsRefreshing(true);

    try {
      const [songsCount, playlistsCount, usersCount, trendingSongsCount] = await Promise.allSettled([
        getCountFromServer(collection(db, 'songs')),
        getCountFromServer(collection(db, 'playlists')),
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(collection(db, 'trendingSongs')),
      ]);

      const nextMetrics: AdminLiveMetrics = {};

      if (songsCount.status === 'fulfilled') {
        nextMetrics.songs = songsCount.value.data().count;
      }

      if (playlistsCount.status === 'fulfilled') {
        nextMetrics.playlists = playlistsCount.value.data().count;
      }

      if (usersCount.status === 'fulfilled') {
        nextMetrics.users = usersCount.value.data().count;
      }

      if (trendingSongsCount.status === 'fulfilled') {
        nextMetrics.trendingSongs = trendingSongsCount.value.data().count;
      }

      setMetrics(nextMetrics);
      setLastSyncedAt(new Date().toISOString());
    } finally {
      setIsRefreshing(false);
    }
  }, [session.preview, session.status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    metrics,
    isRefreshing,
    isLive: Object.keys(metrics).length > 0,
    lastSyncedAt,
    refresh,
  };
};
