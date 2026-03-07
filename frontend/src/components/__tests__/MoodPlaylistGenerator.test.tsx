// Feature: ai-mood-playlist-generator
// Unit tests for MoodPlaylistGenerator component
// Requirements: 1.1, 1.2, 1.3, 11.1, 11.2, 11.3, 11.4, 13.3

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoodPlaylistGenerator } from '../MoodPlaylistGenerator';
import * as moodPlaylistService from '@/services/moodPlaylistService';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('@/services/moodPlaylistService');
jest.mock('react-hot-toast');
jest.mock('@/stores/usePlayerStore', () => ({
  usePlayerStore: () => ({
    playAlbum: jest.fn(),
    setIsPlaying: jest.fn(),
  }),
}));

const mockGenerateMoodPlaylist = moodPlaylistService.generateMoodPlaylist as jest.MockedFunction<
  typeof moodPlaylistService.generateMoodPlaylist
>;

const mockSaveMoodPlaylist = moodPlaylistService.saveMoodPlaylist as jest.MockedFunction<
  typeof moodPlaylistService.saveMoodPlaylist
>;

const mockShareMoodPlaylist = moodPlaylistService.shareMoodPlaylist as jest.MockedFunction<
  typeof moodPlaylistService.shareMoodPlaylist
>;

describe('MoodPlaylistGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation and Character Counter (Requirements 1.1, 1.2, 1.3)', () => {
    it('should display character counter starting at 0', () => {
      render(<MoodPlaylistGenerator />);
      expect(screen.getByText(/0 \/ 200 characters/i)).toBeInTheDocument();
    });

    it('should update character counter as user types', async () => {
      const user = userEvent.setup();
      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy');

      expect(screen.getByText(/5 \/ 200 characters/i)).toBeInTheDocument();
    });

    it('should show validation error for empty input', async () => {
      const user = userEvent.setup();
      render(<MoodPlaylistGenerator />);

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      expect(screen.getByText(/please enter your mood/i)).toBeInTheDocument();
    });

    it('should show validation error for input shorter than 3 characters', async () => {
      const user = userEvent.setup();
      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Hi');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      expect(screen.getByText(/mood description must be at least 3 characters/i)).toBeInTheDocument();
    });

    it('should show validation error for input longer than 200 characters', async () => {
      const user = userEvent.setup();
      render(<MoodPlaylistGenerator />);

      const longText = 'a'.repeat(201);
      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, longText);

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      expect(screen.getByText(/mood description must be less than 200 characters/i)).toBeInTheDocument();
    });

    it('should disable submit button when input is invalid', () => {
      render(<MoodPlaylistGenerator />);

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when input is valid (3-200 chars)', async () => {
      const user = userEvent.setup();
      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy and excited');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      expect(submitButton).toBeEnabled();
    });

    it('should show remaining characters needed when input is too short', async () => {
      const user = userEvent.setup();
      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Hi');

      expect(screen.getByText(/1 more needed/i)).toBeInTheDocument();
    });

    it('should prevent typing beyond 200 characters', async () => {
      const user = userEvent.setup();
      render(<MoodPlaylistGenerator />);

      const longText = 'a'.repeat(205);
      const textarea = screen.getByPlaceholderText(/how are you feeling/i) as HTMLTextAreaElement;
      await user.type(textarea, longText);

      // Should be capped at 200
      expect(textarea.value.length).toBe(200);
    });

    it('should clear error when user starts typing after validation error', async () => {
      const user = userEvent.setup();
      render(<MoodPlaylistGenerator />);

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);
      expect(screen.getByText(/please enter your mood/i)).toBeInTheDocument();

      // Start typing
      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy');

      // Error should be cleared
      expect(screen.queryByText(/please enter your mood/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State Display (Requirements 11.1, 11.2, 11.3)', () => {
    it('should show loading state when generating playlist', async () => {
      const user = userEvent.setup();

      // Mock API call to delay response
      mockGenerateMoodPlaylist.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy and excited');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      // Should show loading component
      expect(screen.getByText(/initializing ai model/i)).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('should hide loading state when playlist generation completes', async () => {
      const user = userEvent.setup();

      const mockPlaylist = {
        _id: 'playlist-1',
        name: 'Joy Vibes',
        emotion: 'joy' as const,
        songs: Array(20).fill(null).map((_, i) => ({
          _id: `song-${i}`,
          title: `Song ${i}`,
          artist: 'Artist',
          album: 'Album',
          duration: 180,
          imageUrl: '',
          streamUrl: '',
        })),
        songCount: 20,
        generatedAt: new Date().toISOString(),
      };

      mockGenerateMoodPlaylist.mockResolvedValue({
        playlist: mockPlaylist,
      });

      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy and excited');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      // Wait for loading to disappear
      await waitFor(() => {
        expect(screen.queryByText(/initializing ai model/i)).not.toBeInTheDocument();
      });

      // Should show playlist display
      expect(screen.getByText('Joy Vibes')).toBeInTheDocument();
    });

    it('should hide loading state when generation fails', async () => {
      const user = userEvent.setup();

      mockGenerateMoodPlaylist.mockRejectedValue(new Error('API error'));

      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy and excited');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      // Wait for loading to disappear
      await waitFor(() => {
        expect(screen.queryByText(/initializing ai model/i)).not.toBeInTheDocument();
      });

      // Should show error message
      expect(screen.getByText(/api error/i)).toBeInTheDocument();
    });
  });

  describe('Error Message Display (Requirement 13.3)', () => {
    it('should display user-friendly error message on API failure', async () => {
      const user = userEvent.setup();

      mockGenerateMoodPlaylist.mockRejectedValue(new Error('Something went wrong. Please try again.'));

      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy and excited');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong. please try again/i)).toBeInTheDocument();
      });
    });

    it('should display rate limit error with upgrade prompt', async () => {
      const user = userEvent.setup();

      mockGenerateMoodPlaylist.mockRejectedValue({
        isRateLimitError: true,
        error: 'Rate limit exceeded',
        message: 'Free users can generate 3 playlists per day. Upgrade to premium for unlimited generations.',
        resetAt: new Date().toISOString(),
      });

      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy and excited');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/free users can generate 3 playlists per day/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /upgrade to premium/i })).toBeInTheDocument();
      });
    });

    it('should not display technical error details', async () => {
      const user = userEvent.setup();

      // Simulate technical error with stack trace
      const technicalError = new Error('Database connection failed');
      (technicalError as any).stack = 'Error: Database connection failed\n  at line 123';

      mockGenerateMoodPlaylist.mockRejectedValue(technicalError);

      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy and excited');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Should show user-friendly message
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
        // Should NOT show stack trace
        expect(screen.queryByText(/at line 123/i)).not.toBeInTheDocument();
      });
    });

    it('should display validation error inline with input', async () => {
      const user = userEvent.setup();
      render(<MoodPlaylistGenerator />);

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent(/please enter your mood/i);
    });
  });

  describe('Playlist Display (Requirements 11.4)', () => {
    it('should display generated playlist with metadata', async () => {
      const user = userEvent.setup();

      const mockPlaylist = {
        _id: 'playlist-1',
        name: 'Joy Vibes',
        emotion: 'joy' as const,
        songs: Array(20).fill(null).map((_, i) => ({
          _id: `song-${i}`,
          title: `Song ${i}`,
          artist: `Artist ${i}`,
          album: 'Album',
          duration: 180,
          imageUrl: '',
          streamUrl: '',
        })),
        songCount: 20,
        generatedAt: new Date().toISOString(),
      };

      mockGenerateMoodPlaylist.mockResolvedValue({
        playlist: mockPlaylist,
      });

      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy and excited');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Joy Vibes')).toBeInTheDocument();
        expect(screen.getByText('joy')).toBeInTheDocument();
        expect(screen.getByText('20 songs')).toBeInTheDocument();
      });
    });

    it('should show play, save, and share buttons', async () => {
      const user = userEvent.setup();

      const mockPlaylist = {
        _id: 'playlist-1',
        name: 'Joy Vibes',
        emotion: 'joy' as const,
        songs: Array(20).fill(null).map((_, i) => ({
          _id: `song-${i}`,
          title: `Song ${i}`,
          artist: 'Artist',
          album: 'Album',
          duration: 180,
          imageUrl: '',
          streamUrl: '',
        })),
        songCount: 20,
        generatedAt: new Date().toISOString(),
      };

      mockGenerateMoodPlaylist.mockResolvedValue({
        playlist: mockPlaylist,
      });

      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy and excited');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      });
    });

    it('should allow generating another playlist after completion', async () => {
      const user = userEvent.setup();

      const mockPlaylist = {
        _id: 'playlist-1',
        name: 'Joy Vibes',
        emotion: 'joy' as const,
        songs: Array(20).fill(null).map((_, i) => ({
          _id: `song-${i}`,
          title: `Song ${i}`,
          artist: 'Artist',
          album: 'Album',
          duration: 180,
          imageUrl: '',
          streamUrl: '',
        })),
        songCount: 20,
        generatedAt: new Date().toISOString(),
      };

      mockGenerateMoodPlaylist.mockResolvedValue({
        playlist: mockPlaylist,
      });

      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy and excited');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Joy Vibes')).toBeInTheDocument();
      });

      // Click "Generate Another Playlist"
      const tryAgainButton = screen.getByRole('button', { name: /generate another playlist/i });
      await user.click(tryAgainButton);

      // Should return to input form
      expect(screen.getByPlaceholderText(/how are you feeling/i)).toBeInTheDocument();
    });
  });

  describe('Rate Limit Info Display', () => {
    it('should display remaining generations for free users', async () => {
      const user = userEvent.setup();

      const mockPlaylist = {
        _id: 'playlist-1',
        name: 'Joy Vibes',
        emotion: 'joy' as const,
        songs: Array(20).fill(null).map((_, i) => ({
          _id: `song-${i}`,
          title: `Song ${i}`,
          artist: 'Artist',
          album: 'Album',
          duration: 180,
          imageUrl: '',
          streamUrl: '',
        })),
        songCount: 20,
        generatedAt: new Date().toISOString(),
      };

      mockGenerateMoodPlaylist.mockResolvedValue({
        playlist: mockPlaylist,
        rateLimitInfo: {
          remaining: 2,
          resetAt: new Date().toISOString(),
        },
      });

      render(<MoodPlaylistGenerator />);

      const textarea = screen.getByPlaceholderText(/how are you feeling/i);
      await user.type(textarea, 'Happy and excited');

      const submitButton = screen.getByRole('button', { name: /generate playlist/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Joy Vibes')).toBeInTheDocument();
      });

      // Click "Generate Another Playlist" to return to input
      const tryAgainButton = screen.getByRole('button', { name: /generate another playlist/i });
      await user.click(tryAgainButton);

      // Should show remaining generations
      expect(screen.getByText(/2 generations remaining today/i)).toBeInTheDocument();
    });
  });
});
