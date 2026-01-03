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

// Premium tone mapping to avoid overly light/pastel backgrounds.
// Push very light colors towards a tasteful mid-dark neutral; slightly darken moderately light ones.
function applyPremiumTone(base: number[]): number[] {
  const L = luminance(base[0], base[1], base[2]);
  // Neutral anchor to keep hues classy
  const neutral = [30, 30, 30];
  if (L >= 0.82) {
    // Very light -> darken more
    return blend(base, neutral, 0.50);
  }
  if (L >= 0.68) {
    // Moderately light -> darken a bit
    return blend(base, neutral, 0.35);
  }
  if (L <= 0.06) {
    // Extremely dark -> lift slightly to avoid pure black
    return blend(base, [255, 255, 255], 0.15);
  }
  return base;
}

function adjustForContrast(baseInput: number[], isLikedSongs: boolean = false): { bg: number[]; text: string; overlay: string; accent: string; secondary: number[] } {
  let base = applyPremiumTone(baseInput);
  
  // Special processing for Liked Songs: iconic purple-blue gradient
  if (isLikedSongs) {
    // Spotify Liked Songs signature color: vibrant purple-blue
    base = [80, 56, 160]; // Rich purple base
  }
  
  const white = [255, 255, 255];
  const black = [0, 0, 0];

  // Derive secondary by shifting slightly towards black or white depending on base lightness
  const isBaseLight = luminance(base[0], base[1], base[2]) > 0.5;
  let secondary = isBaseLight ? blend(base, black, 0.30) : blend(base, white, 0.20);
  
  // For Liked Songs, create the signature gradient transition
  if (isLikedSongs) {
    // Transition to a darker, more saturated blue-purple
    secondary = [45, 30, 90]; // Darker purple for gradient end
  }

  // Choose text color by contrast
  const contrastWithWhite = contrastRatio(base, white);
  const contrastWithBlack = contrastRatio(base, black);
  let text = contrastWithWhite >= contrastWithBlack ? 'white' : 'black';

  // If contrast is low (< 4.5), adjust background towards opposite to improve
  let adjusted = base;
  let overlay = 'rgba(0,0,0,0.0)';
  if (Math.max(contrastWithWhite, contrastWithBlack) < 4.5) {
    const target = text === 'white' ? black : white;
    adjusted = blend(base, target, 0.22);
  }

  // If after adjustment text contrast still not good, apply semi-transparent overlay hint
  const finalContrast = Math.max(contrastRatio(adjusted, white), contrastRatio(adjusted, black));
  if (finalContrast < 4.5) {
    overlay = text === 'white' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.18)';
  }

  // Accent: a more saturated/brighter variant for progress/accents
  const accent = isBaseLight ? rgbToCss(blend(base, black, 0.35)) : rgbToCss(blend(base, white, 0.35));

  return { bg: adjusted, text, overlay, accent, secondary };
}

export const useAlbumColors = (imageUrl: string | undefined, isLikedSongs: boolean = false): AlbumColors => {
  const [colors, setColors] = useState<AlbumColors>({
    primary: 'rgb(24, 24, 27)',
    secondary: 'rgb(39, 39, 42)',
    accent: 'rgb(34, 197, 94)', // green-500
    text: 'white',
    overlay: 'rgba(0,0,0,0.0)',
    gradient: 'linear-gradient(90deg, rgb(24,24,27) 0%, rgb(39,39,42) 100%)',
    isLight: false,
    cssVars: {
      '--album-primary': 'rgb(24,24,27)'
    } as React.CSSProperties,
  });

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const dominant = colorThief.getColor(img) as number[]; // [r,g,b]
        const palette = colorThief.getPalette(img, 6) as number[][]; // up to 6 colors

        const { bg, text, overlay, accent, secondary } = adjustForContrast(dominant, isLikedSongs);

        const primaryCss = rgbToCss(bg);
        const secondaryCss = rgbToCss(secondary);
        // Create Spotify-style gradient: 180deg (top to bottom) with smooth color transition
        const gradient = `linear-gradient(180deg, ${primaryCss} 0%, ${secondaryCss} 100%)`;

        // Pick accent from palette with highest contrast vs background if available
        let accentCss = accent;
        if (palette && palette.length) {
          let best = palette[0];
          let bestScore = contrastRatio(bg, best);
          for (let i = 1; i < palette.length; i++) {
            const c = palette[i];
            const score = contrastRatio(bg, c);
            if (score > bestScore) {
              best = c; bestScore = score;
            }
          }
          // Slightly brighten/darken selected accent to stand out
          const tuned = luminance(best[0], best[1], best[2]) > 0.5 ? blend(best, [0,0,0], 0.2) : blend(best, [255,255,255], 0.2);
          accentCss = rgbToCss(tuned);
        }

        const isLight = luminance(bg[0], bg[1], bg[2]) > 0.5;

        const cssVars: React.CSSProperties = {
          '--album-primary': primaryCss,
          '--album-secondary': secondaryCss,
          '--album-text': text,
          '--album-overlay': overlay,
          '--album-accent': accentCss,
          '--album-gradient': gradient,
        } as React.CSSProperties;

        setColors({
          primary: primaryCss,
          secondary: secondaryCss,
          accent: accentCss,
          text,
          overlay,
          gradient,
          isLight,
          cssVars,
        });
      } catch (error) {
        // Fallback palette
        const fallback: AlbumColors = {
          primary: 'rgb(24, 24, 27)',
          secondary: 'rgb(39, 39, 42)',
          accent: 'rgb(34, 197, 94)',
          text: 'white',
          overlay: 'rgba(0,0,0,0.0)',
          gradient: 'linear-gradient(90deg, rgb(24,24,27) 0%, rgb(39,39,42) 100%)',
          isLight: false,
          cssVars: {
            '--album-primary': 'rgb(24,24,27)',
            '--album-secondary': 'rgb(39,39,42)',
            '--album-text': 'white',
            '--album-overlay': 'rgba(0,0,0,0.0)',
            '--album-accent': 'rgb(34, 197, 94)',
            '--album-gradient': 'linear-gradient(90deg, rgb(24,24,27) 0%, rgb(39,39,42) 100%)',
          } as React.CSSProperties,
        };
        setColors(fallback);
      }
    };

    img.onerror = () => {
      setColors({
        primary: 'rgb(24, 24, 27)',
        secondary: 'rgb(39, 39, 42)',
        accent: 'rgb(34, 197, 94)',
        text: 'white',
        overlay: 'rgba(0,0,0,0.0)',
        gradient: 'linear-gradient(90deg, rgb(24,24,27) 0%, rgb(39,39,42) 100%)',
        isLight: false,
        cssVars: {
          '--album-primary': 'rgb(24,24,27)',
          '--album-secondary': 'rgb(39,39,42)',
          '--album-text': 'white',
          '--album-overlay': 'rgba(0,0,0,0.0)',
          '--album-accent': 'rgb(34, 197, 94)',
          '--album-gradient': 'linear-gradient(90deg, rgb(24,24,27) 0%, rgb(39,39,42) 100%)',
        } as React.CSSProperties,
      });
    };

    img.src = imageUrl;
  }, [imageUrl]);

  return colors;
};