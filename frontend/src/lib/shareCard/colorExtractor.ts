/**
 * Color Extraction & Theme Generation
 * Extracts dominant colors from album artwork for dynamic share card themes
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface ColorPalette {
  dominant: string;
  vibrant: string;
  muted: string;
  darkVibrant: string;
  lightVibrant: string;
}

/**
 * Extract colors from image using canvas
 */
export const extractColorsFromImage = async (imageUrl: string): Promise<ColorPalette> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Resize for performance
        const size = 100;
        canvas.width = size;
        canvas.height = size;
        
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        
        const colors = analyzeImageData(imageData);
        resolve(colors);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
};

/**
 * Analyze image data to extract color palette
 */
const analyzeImageData = (imageData: ImageData): ColorPalette => {
  const pixels: RGB[] = [];
  const data = imageData.data;
  
  // Sample every 4th pixel for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // Skip transparent pixels
    if (a < 125) continue;
    
    // Skip very dark or very light pixels
    const brightness = (r + g + b) / 3;
    if (brightness < 20 || brightness > 235) continue;
    
    pixels.push({ r, g, b });
  }
  
  // Find dominant color
  const dominant = findDominantColor(pixels);
  
  // Find vibrant colors
  const vibrant = findVibrantColor(pixels);
  const muted = findMutedColor(pixels);
  const darkVibrant = findDarkVibrantColor(pixels);
  const lightVibrant = findLightVibrantColor(pixels);
  
  return {
    dominant: rgbToHex(dominant),
    vibrant: rgbToHex(vibrant),
    muted: rgbToHex(muted),
    darkVibrant: rgbToHex(darkVibrant),
    lightVibrant: rgbToHex(lightVibrant)
  };
};

/**
 * Find dominant color using k-means clustering
 */
const findDominantColor = (pixels: RGB[]): RGB => {
  if (pixels.length === 0) return { r: 30, g: 215, b: 96 }; // Spotify green fallback
  
  // Simple average for dominant color
  const sum = pixels.reduce(
    (acc, pixel) => ({
      r: acc.r + pixel.r,
      g: acc.g + pixel.g,
      b: acc.b + pixel.b
    }),
    { r: 0, g: 0, b: 0 }
  );
  
  return {
    r: Math.round(sum.r / pixels.length),
    g: Math.round(sum.g / pixels.length),
    b: Math.round(sum.b / pixels.length)
  };
};

/**
 * Find most vibrant (saturated) color
 */
const findVibrantColor = (pixels: RGB[]): RGB => {
  let maxSaturation = 0;
  let vibrant = { r: 30, g: 215, b: 96 };
  
  for (const pixel of pixels) {
    const saturation = calculateSaturation(pixel);
    if (saturation > maxSaturation) {
      maxSaturation = saturation;
      vibrant = pixel;
    }
  }
  
  return vibrant;
};

/**
 * Find muted color (low saturation)
 */
const findMutedColor = (pixels: RGB[]): RGB => {
  const mutedPixels = pixels.filter(p => {
    const sat = calculateSaturation(p);
    return sat > 0.1 && sat < 0.4;
  });
  
  return mutedPixels.length > 0 
    ? findDominantColor(mutedPixels)
    : { r: 100, g: 100, b: 100 };
};

/**
 * Find dark vibrant color
 */
const findDarkVibrantColor = (pixels: RGB[]): RGB => {
  const darkPixels = pixels.filter(p => {
    const brightness = (p.r + p.g + p.b) / 3;
    return brightness < 100 && calculateSaturation(p) > 0.3;
  });
  
  return darkPixels.length > 0
    ? findVibrantColor(darkPixels)
    : { r: 20, g: 20, b: 40 };
};

/**
 * Find light vibrant color
 */
const findLightVibrantColor = (pixels: RGB[]): RGB => {
  const lightPixels = pixels.filter(p => {
    const brightness = (p.r + p.g + p.b) / 3;
    return brightness > 150 && calculateSaturation(p) > 0.3;
  });
  
  return lightPixels.length > 0
    ? findVibrantColor(lightPixels)
    : { r: 200, g: 220, b: 240 };
};

/**
 * Calculate color saturation
 */
const calculateSaturation = (rgb: RGB): number => {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  if (max === 0) return 0;
  
  return (max - min) / max;
};

/**
 * Convert RGB to hex
 */
const rgbToHex = (rgb: RGB): string => {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

/**
 * Generate gradient from colors
 */
export const generateGradient = (colors: ColorPalette, angle = 135): string => {
  return `linear-gradient(${angle}deg, ${colors.darkVibrant} 0%, ${colors.vibrant} 50%, ${colors.lightVibrant} 100%)`;
};

/**
 * Determine if color is light or dark
 */
export const isLightColor = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 155;
};

/**
 * Convert hex to RGB
 */
const hexToRgb = (hex: string): RGB | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Generate theme from image
 */
export const generateThemeFromImage = async (imageUrl: string) => {
  try {
    const colors = await extractColorsFromImage(imageUrl);
    const textColor = isLightColor(colors.dominant) ? '#000000' : '#FFFFFF';
    
    return {
      primary: colors.vibrant,
      secondary: colors.muted,
      accent: colors.lightVibrant,
      text: textColor,
      textSecondary: textColor + '99', // 60% opacity
      gradient: [colors.darkVibrant, colors.vibrant, colors.lightVibrant],
      blur: 40
    };
  } catch (error) {
    // Fallback to Spotify green theme
    return {
      primary: '#1DB954',
      secondary: '#191414',
      accent: '#1ED760',
      text: '#FFFFFF',
      textSecondary: '#B3B3B3',
      gradient: ['#191414', '#1DB954', '#1ED760'],
      blur: 40
    };
  }
};
