// Feature: ai-mood-playlist-generator
// Unit tests for MoodPlaylistDisplay component
// Requirements: 5.6, 5.7, 9.1, 10.1

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoodPlaylistDisplay } from '../MoodPlaylistDisplay';
import { Song } from '@/types';

const createMockSong = (id: number): Song => ({
  _id: `song-${id}`,
  title: `Song Title ${id}`,
  artist: `Artist ${id}`,
  album: `Album ${id}`,
  duration: 180 + id,
  imageUrl: `https://example.com/image-${id}.jpg`,
  streamUrl: `https://example.com/stream-${id}.mp3`,
  genre: 'pop',
  year: 2024,
  source: 'spotify',
});

const createMockPlaylist = (emotion: 'sadness' | 'joy' | 'anger' | 'love' | 'fear' | 'surprise', songCount = 20) => ({
  _id: 'playlist-1',
  name: `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} Vibes`,
  emotion,
  songs: Array(songCount).fill(null).map((_, i) => createMockSong(i)),
  songCount,
  generatedAt: new Date().toISOString(),
  cached: false,
});

describe('MoodPlaylistDisplay', () => {
  const mockOnPlay = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnShare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Playlist Metadata Display (Requirements 5.6, 5.7)', () => {
    it('should display playlist name', () => {
      const playlist = createMockPlaylist('joy');
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      expect(screen.getByText('Joy Vibes')).toBeInTheDocument();
    });

    it('should display emotion badge', () => {
      const playlist = createMockPlaylist('joy');
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const emotionBadge = screen.getByText('joy');
      expect(emotionBadge).toBeInTheDocument();
      expect(emotionBadge).toHaveClass('capitalize');
    });

    it('should display song count', () => {
      const playlist = createMockPlaylist('joy');
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      expect(screen.getByText('20 songs')).toBeInTheDocument();
    });

    it('should display all emotion types correctly', () => {
      const emotions: Array<'sadness' | 'joy' | 'anger' | 'love' | 'fear' | 'surprise'> = [
        'sadness', 'joy', 'anger', 'love', 'fear', 'surprise'
      ];
      
      emotions.forEach(emotion => {
        const { unmount } = render(
          <MoodPlaylistDisplay
            playlist={createMockPlaylist(emotion)}
            onPlay={mockOnPlay}
            onSave={mockOnSave}
            onShare={mockOnShare}
          />
        );
        
        expect(screen.getByText(emotion)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Song List Display (Requirement 9.1)', () => {
    it('should display all 20 songs', () => {
      const playlist = createMockPlaylist('joy');
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      // Check that all songs are rendered
      for (let i = 0; i < 20; i++) {
        expect(screen.getByText(`Song Title ${i}`)).toBeInTheDocument();
        expect(screen.getByText(`Artist ${i}`)).toBeInTheDocument();
      }
    });

    it('should display track numbers', () => {
      const playlist = createMockPlaylist('joy');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      // Check first few track numbers
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('should display song titles and artists', () => {
      const playlist = createMockPlaylist('joy');
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      expect(screen.getByText('Song Title 0')).toBeInTheDocument();
      expect(screen.getByText('Artist 0')).toBeInTheDocument();
    });

    it('should display song durations in MM:SS format', () => {
      const playlist = createMockPlaylist('joy');
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      // Song 0 has duration 180 seconds = 3:00
      expect(screen.getByText('3:00')).toBeInTheDocument();
      // Song 1 has duration 181 seconds = 3:01
      expect(screen.getByText('3:01')).toBeInTheDocument();
    });

    it('should display album art when imageUrl is provided', () => {
      const playlist = createMockPlaylist('joy');
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
      expect(images[0]).toHaveAttribute('src', 'https://example.com/image-0.jpg');
    });

    it('should display music icon when imageUrl is missing', () => {
      const playlist = createMockPlaylist('joy');
      playlist.songs[0].imageUrl = '';
      
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      // Should have a music icon placeholder
      const musicIcons = container.querySelectorAll('svg');
      expect(musicIcons.length).toBeGreaterThan(0);
    });

    it('should make song rows hoverable', () => {
      const playlist = createMockPlaylist('joy');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const songRows = container.querySelectorAll('[class*="hover:bg-accent"]');
      expect(songRows.length).toBe(20);
    });
  });

  describe('Action Buttons (Requirement 10.1)', () => {
    it('should display play button', () => {
      const playlist = createMockPlaylist('joy');
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toBeInTheDocument();
    });

    it('should display save button', () => {
      const playlist = createMockPlaylist('joy');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      // Save button has Heart icon
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3); // Play, Save, Share
    });

    it('should display share button', () => {
      const playlist = createMockPlaylist('joy');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3); // Play, Save, Share
    });

    it('should call onPlay when play button is clicked', async () => {
      const user = userEvent.setup();
      const playlist = createMockPlaylist('joy');
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);
      
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
    });

    it('should call onSave when save button is clicked', async () => {
      const user = userEvent.setup();
      const playlist = createMockPlaylist('joy');
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      const saveButton = buttons[1]; // Second button is save
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    it('should call onShare when share button is clicked', async () => {
      const user = userEvent.setup();
      const playlist = createMockPlaylist('joy');
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      const shareButton = buttons[2]; // Third button is share
      await user.click(shareButton);
      
      expect(mockOnShare).toHaveBeenCalledTimes(1);
    });
  });

  describe('Emotion-Based Color Theming', () => {
    it('should apply sadness theme (blue)', () => {
      const playlist = createMockPlaylist('sadness');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const badge = screen.getByText('sadness');
      expect(badge).toHaveClass('text-blue-400');
    });

    it('should apply joy theme (yellow)', () => {
      const playlist = createMockPlaylist('joy');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const badge = screen.getByText('joy');
      expect(badge).toHaveClass('text-yellow-400');
    });

    it('should apply anger theme (red)', () => {
      const playlist = createMockPlaylist('anger');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const badge = screen.getByText('anger');
      expect(badge).toHaveClass('text-red-400');
    });

    it('should apply love theme (pink)', () => {
      const playlist = createMockPlaylist('love');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const badge = screen.getByText('love');
      expect(badge).toHaveClass('text-pink-400');
    });

    it('should apply fear theme (purple)', () => {
      const playlist = createMockPlaylist('fear');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const badge = screen.getByText('fear');
      expect(badge).toHaveClass('text-purple-400');
    });

    it('should apply surprise theme (orange)', () => {
      const playlist = createMockPlaylist('surprise');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const badge = screen.getByText('surprise');
      expect(badge).toHaveClass('text-orange-400');
    });
  });

  describe('Component Structure', () => {
    it('should render within a Card component', () => {
      const playlist = createMockPlaylist('joy');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const card = container.querySelector('[class*="card"]');
      expect(card).toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      const playlist = createMockPlaylist('joy');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
          className="custom-class"
        />
      );
      
      const card = container.firstChild;
      expect(card).toHaveClass('custom-class');
    });

    it('should have scrollable song list', () => {
      const playlist = createMockPlaylist('joy');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      // ScrollArea should be present with fixed height
      const scrollArea = container.querySelector('[class*="h-\\[400px\\]"]');
      expect(scrollArea).toBeInTheDocument();
    });

    it('should maintain max-width constraint', () => {
      const playlist = createMockPlaylist('joy');
      const { container } = render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      const card = container.firstChild;
      expect(card).toHaveClass('max-w-2xl');
    });
  });

  describe('Duration Formatting', () => {
    it('should format seconds correctly with leading zeros', () => {
      const playlist = createMockPlaylist('joy');
      // Override first song duration to test formatting
      playlist.songs[0].duration = 65; // 1:05
      
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('should handle zero seconds correctly', () => {
      const playlist = createMockPlaylist('joy');
      playlist.songs[0].duration = 60; // 1:00
      
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    it('should handle long durations correctly', () => {
      const playlist = createMockPlaylist('joy');
      playlist.songs[0].duration = 599; // 9:59
      
      render(
        <MoodPlaylistDisplay
          playlist={playlist}
          onPlay={mockOnPlay}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      );
      
      expect(screen.getByText('9:59')).toBeInTheDocument();
    });
  });
});
