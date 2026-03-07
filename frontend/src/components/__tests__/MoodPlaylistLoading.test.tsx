// Feature: ai-mood-playlist-generator
// Unit tests for MoodPlaylistLoading component
// Requirements: 11.1, 11.2, 11.3

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MoodPlaylistLoading } from '../MoodPlaylistLoading';

// Mock lucide-react Sparkles to prevent SVG rendering issues in tests
jest.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="sparkles-icon" />
}));

describe('MoodPlaylistLoading', () => {
  describe('Loading Animation Display', () => {
    it('should display AI specific elements like sparkles', () => {
      render(<MoodPlaylistLoading />);

      const sparkles = screen.getByTestId('sparkles-icon');
      expect(sparkles).toBeTruthy();
    });

    it('should render rotating rings', () => {
      const { container } = render(<MoodPlaylistLoading />);

      const rings = container.querySelectorAll('[class*="animate-[spin"]');
      expect(rings.length).toBeGreaterThan(0);
    });
  });

  describe('Loading Message Display', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should display "Initializing AI model..." message initially', () => {
      render(<MoodPlaylistLoading />);

      expect(screen.getByText(/initializing ai model/i)).toBeTruthy();
      expect(screen.getByText(/analyzing your vibe/i)).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('should apply custom className when provided', () => {
      const { container } = render(<MoodPlaylistLoading className="custom-class" />);

      const wrapper = container.firstChild;
      // Using classList.contains to avoid jest-dom dependency issue
      expect((wrapper as HTMLElement).getAttribute('class')).toContain('custom-class');
    });

    it('should center content vertically and horizontally', () => {
      const { container } = render(<MoodPlaylistLoading />);

      const wrapper = container.firstChild;
      expect((wrapper as HTMLElement).getAttribute('class')).toContain('items-center');
      expect((wrapper as HTMLElement).getAttribute('class')).toContain('justify-center');
    });
  });

  describe('Visual Consistency', () => {
    it('should use consistent dark styling (blue and purple)', () => {
      const { container } = render(<MoodPlaylistLoading />);

      const blueElements = container.querySelectorAll('[class*="blue"]');
      expect(blueElements.length).toBeGreaterThan(0);

      const purpleElements = container.querySelectorAll('[class*="purple"]');
      expect(purpleElements.length).toBeGreaterThan(0);
    });
  });
});
