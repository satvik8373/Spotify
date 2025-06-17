import { useState, useEffect } from 'react';
import ColorThief from 'colorthief';

export interface AlbumColors {
  primary: string;
  secondary: string;
  isLight: boolean;
}

const colorThief = new ColorThief();

export const useAlbumColors = (imageUrl: string | undefined): AlbumColors => {
  const [colors, setColors] = useState<AlbumColors>({
    primary: 'rgb(24, 24, 27)', // Default Zinc-900
    secondary: 'rgb(39, 39, 42)', // Default Zinc-800
    isLight: false,
  });

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        // Get dominant color and palette
        const dominantColor = colorThief.getColor(img);
        const palette = colorThief.getPalette(img, 2);

        // Convert RGB arrays to CSS color strings
        const primaryColor = `rgb(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]})`;
        const secondaryColor = palette[1] 
          ? `rgb(${palette[1][0]}, ${palette[1][1]}, ${palette[1][2]})`
          : `rgb(${dominantColor[0] * 0.8}, ${dominantColor[1] * 0.8}, ${dominantColor[2] * 0.8})`;

        // Calculate perceived brightness of primary color (using relative luminance formula)
        const brightness = (dominantColor[0] * 299 + dominantColor[1] * 587 + dominantColor[2] * 114) / 1000;
        const isLight = brightness > 128;

        setColors({
          primary: primaryColor,
          secondary: secondaryColor,
          isLight,
        });
      } catch (error) {
        // Fallback to default colors on error
        setColors({
          primary: 'rgb(24, 24, 27)',
          secondary: 'rgb(39, 39, 42)',
          isLight: false,
        });
      }
    };

    img.onerror = () => {
      // Fallback to default colors on error
      setColors({
        primary: 'rgb(24, 24, 27)',
        secondary: 'rgb(39, 39, 42)',
        isLight: false,
      });
    };

    img.src = imageUrl;
  }, [imageUrl]);

  return colors;
}; 