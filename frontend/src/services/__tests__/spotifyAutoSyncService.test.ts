import { spotifyAutoSyncService } from '../spotifyAutoSyncService';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock the services
jest.mock('../spotifyService', () => ({
  isAuthenticated: jest.fn(() => true),
  getSavedTracks: jest.fn(() => Promise.resolve([]))
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({ isAuthenticated: true, userId: 'test-user' }))
  }
}));

jest.mock('@/stores/useMusicStore', () => ({
  useMusicStore: {
    getState: jest.fn(() => ({
      searchIndianSongs: jest.fn(),
      indianSearchResults: [],
      convertIndianSongToAppSong: jest.fn((song) => ({
        _id: song.id,
        title: song.title,
        artist: song.artist,
        imageUrl: song.image,
        audioUrl: song.url,
        duration: parseInt(song.duration) || 0,
        albumId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    }))
  }
}));

jest.mock('../likedSongsService', () => ({
  isSongAlreadyLiked: jest.fn(() => Promise.resolve(false)),
  addLikedSong: jest.fn(() => Promise.resolve({ added: true }))
}));

describe('SpotifyAutoSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    spotifyAutoSyncService.stopAutoSync();
  });

  test('should initialize with default config', () => {
    const config = spotifyAutoSyncService.getConfig();
    expect(config.enabled).toBe(false);
    expect(config.intervalMinutes).toBe(30);
    expect(config.maxSongsPerSync).toBe(20);
  });

  test('should start auto-sync when authenticated', () => {
    const success = spotifyAutoSyncService.startAutoSync(60);
    expect(success).toBe(true);
    expect(spotifyAutoSyncService.isEnabled()).toBe(true);
  });

  test('should stop auto-sync', () => {
    spotifyAutoSyncService.startAutoSync(60);
    expect(spotifyAutoSyncService.isEnabled()).toBe(true);
    
    spotifyAutoSyncService.stopAutoSync();
    expect(spotifyAutoSyncService.isEnabled()).toBe(false);
  });

  test('should save and load config from localStorage', () => {
    const mockConfig = JSON.stringify({
      enabled: true,
      intervalMinutes: 120,
      lastSyncTimestamp: Date.now(),
      maxSongsPerSync: 10
    });
    
    localStorageMock.getItem.mockReturnValue(mockConfig);
    
    // Create a new instance to test loading
    const config = spotifyAutoSyncService.getConfig();
    expect(config.intervalMinutes).toBe(120);
    expect(config.maxSongsPerSync).toBe(10);
  });

  test('should handle listeners correctly', () => {
    const mockListener = jest.fn();
    
    spotifyAutoSyncService.addListener(mockListener);
    spotifyAutoSyncService.startAutoSync(30);
    
    expect(mockListener).toHaveBeenCalledWith({
      type: 'started',
      message: 'Auto-sync enabled (every 30 minutes)'
    });
    
    spotifyAutoSyncService.removeListener(mockListener);
    spotifyAutoSyncService.stopAutoSync();
    
    // Should not be called again after removal
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test('should calculate time until next sync', () => {
    spotifyAutoSyncService.startAutoSync(30);
    
    const timeUntilNext = spotifyAutoSyncService.getTimeUntilNextSync();
    expect(timeUntilNext).toBeGreaterThan(0);
    expect(timeUntilNext).toBeLessThanOrEqual(30 * 60 * 1000); // 30 minutes in ms
  });
});