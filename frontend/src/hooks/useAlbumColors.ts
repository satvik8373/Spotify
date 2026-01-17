import { useState, useEffect } from 'react';
import ColorThief from 'colorthief';

export interface AlbumColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  overlay: string;
  gradient: string;
  isLight: boolean;
  cssVars: React.CSSProperties;
}

const colorThief = new ColorThief();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rgbToCss([r, g, b]: number[]): string {
  return `rgb(${clamp(r, 0, 255)}, ${clamp(g, 0, 255)}, ${clamp(b, 0, 255)})`;
}

// Relative luminance per WCAG
function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(rgb1: number[], rgb2: number[]): number {
  const L1 = luminance(rgb1[0], rgb1[1], rgb1[2]) + 0.05;
  const L2 = luminance(rgb2[0], rgb2[1], rgb2[2]) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}

function blend(rgb: number[], target: number[], amount: number): number[] {
  return [
    Math.round(rgb[0] * (1 - amount) + target[0] * amount),
    Math.round(rgb[1] * (1 - amount) + target[1] * amount),
    Math.round(rgb[2] * (1 - amount) + target[2] * amount),
  ];
}

// Calculate saturation (0-1)
function getSaturation(rgb: number[]): number {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return 0;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

// Score a color based on its suitability for a Spotify-like background
// Higher saturation and good lightness is better
function scoreColor(rgb: number[]): number {
  const sat = getSaturation(rgb);
  const lum = luminance(rgb[0], rgb[1], rgb[2]);

  // Penalize very dark or very light colors, but prefer vibrant ones
  const isGreyscale = sat < 0.1;
  if (isGreyscale) return 0; // Low priority

  // Prefer colors with good saturation and moderate to bright lightness
  // Ideal luminance for a vibrant background is around 0.2 - 0.6
  const lightnessScore = lum > 0.15 && lum < 0.7 ? 1 : Math.max(0.3, 1 - Math.abs(lum - 0.4));
  
  // Heavily weight saturation and good lightness
  return sat * 2.5 + lightnessScore * 1.5;
}

function adjustForContrast(baseInput: number[], isLikedSongs: boolean = false): { bg: number[]; text: string; overlay: string; accent: string; secondary: number[] } {
  let base = baseInput;

  // Special processing for Liked Songs: iconic purple-blue gradient
  if (isLikedSongs) {
    base = [120, 80, 200]; // Brighter purple base
  }

  const white = [255, 255, 255];
  const black = [0, 0, 0];

  // Instead of darkening colors, we'll make them more vibrant and lighter
  // Enhance the color to be more like Spotify's vibrant backgrounds
  
  // Boost saturation and brightness for more vibrant appearance
  const [r, g, b] = base;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  
  // If color is already vibrant, enhance it further
  if (saturation > 0.3) {
    // Find the dominant color channel and boost it
    const maxIndex = [r, g, b].indexOf(max);
    base = base.map((channel, index) => {
      if (index === maxIndex) {
        // Boost the dominant channel for more vibrancy
        return Math.min(255, Math.round(channel * 1.15));
      } else {
        // Slightly reduce other channels for better contrast
        return Math.max(0, Math.round(channel * 0.95));
      }
    });
  }

  // Ensure the color is bright enough - lift dark colors
  const brightness = (r + g + b) / 3;
  if (brightness < 100) {
    // Brighten dark colors significantly
    const brightnessFactor = 1.5;
    base = base.map(channel => Math.min(255, Math.round(channel * brightnessFactor)));
  }

  // Create secondary color - instead of going to black, create a richer version
  // This maintains the vibrant look throughout the gradient
  let secondary = base.map(channel => Math.round(channel * 0.7)); // Darker but not black

  // For Liked Songs - use a brighter gradient
  if (isLikedSongs) {
    secondary = [80, 50, 140]; // Brighter secondary
  }

  // Text color is white for good contrast on vibrant backgrounds
  let text = 'white';

  // Only darken if absolutely necessary for text readability
  const baseLum = luminance(base[0], base[1], base[2]);
  if (baseLum > 0.8) {
    // Only for extremely bright colors, reduce slightly
    base = blend(base, black, 0.1);
  }

  let overlay = 'rgba(0,0,0,0.0)';

  // Accent: A brighter, more vibrant version
  const accent = rgbToCss(blend(base, white, 0.25));

  return { bg: base, text, overlay, accent, secondary };
}

export const useAlbumColors = (imageUrl: string | undefined, isLikedSongs: boolean = false): AlbumColors => {
  const [colors, setColors] = useState<AlbumColors>({
    primary: 'rgb(120, 120, 120)', // Lighter neutral grey default
    secondary: 'rgb(80, 80, 80)', // Lighter secondary
    accent: 'rgb(34, 197, 94)',
    text: 'white',
    overlay: 'rgba(0,0,0,0.0)',
    gradient: 'linear-gradient(180deg, rgb(120,120,120) 0%, rgb(80,80,80) 100%)',
    isLight: false,
    cssVars: {
      '--album-primary': 'rgb(120,120,120)'
    } as React.CSSProperties,
  });

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        // Get palette (up to 10 colors to find the best candidate)
        const palette = colorThief.getPalette(img, 10) as number[][];

        // Find the best color
        let bestColor = palette[0];
        let maxScore = -Infinity;

        // Skip the very first color if it's too dark/black (often just the border/background)
        // unless it's the only ones we have
        const candidates = palette.length > 2 ? palette.slice(0) : palette;

        for (const color of candidates) {
          const score = scoreColor(color);
          if (score > maxScore) {
            maxScore = score;
            bestColor = color;
          }
        }

        // If "Sahiba" red case or similar vibrant covers, this should pick the red.

        const { bg, text, overlay, accent, secondary } = adjustForContrast(bestColor, isLikedSongs);

        const primaryCss = rgbToCss(bg);
        const secondaryCss = rgbToCss(secondary);

        // Spotify-style gradient: Top (Primary) -> Bottom (Darker/Black)
        const gradient = `linear-gradient(180deg, ${primaryCss} 0%, ${secondaryCss} 100%)`;

        const isLight = luminance(bg[0], bg[1], bg[2]) > 0.5;

        const cssVars: React.CSSProperties = {
          '--album-primary': primaryCss,
          '--album-primary-rgb': `${bg[0]}, ${bg[1]}, ${bg[2]}`,
          '--album-secondary': secondaryCss,
          '--album-text': text,
          '--album-overlay': overlay,
          '--album-accent': accent,
          '--album-gradient': gradient,
        } as React.CSSProperties;

        setColors({
          primary: primaryCss,
          secondary: secondaryCss,
          accent,
          text,
          overlay,
          gradient,
          isLight,
          cssVars,
        });
      } catch (error) {
        console.warn('ColorThief failed, using fallback', error);
      }
    };

    img.onerror = () => {
      // Keep default/previous
    };

    img.src = imageUrl;
  }, [imageUrl, isLikedSongs]);

  return colors;
};