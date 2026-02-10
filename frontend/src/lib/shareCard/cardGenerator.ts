/**
 * Share Card Generator - Core Logic
 * Generates platform-optimized visual share cards using HTML Canvas
 */

import { ShareCardConfig, GeneratedShareCard, PLATFORM_DIMENSIONS } from './types';
import { generateThemeFromImage } from './colorExtractor';

/**
 * Generate share card image
 */
export const generateShareCard = async (
  config: ShareCardConfig
): Promise<GeneratedShareCard> => {
  const dimensions = PLATFORM_DIMENSIONS[config.platform];
  
  // Generate theme if not provided
  const theme = config.theme || await generateThemeFromImage(config.content.imageUrl);
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }
  
  // Draw card based on platform
  await drawShareCard(ctx, canvas, config, theme, dimensions);
  
  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
      'image/png',
      1.0
    );
  });
  
  // Create object URL
  const imageUrl = URL.createObjectURL(blob);
  
  return {
    imageUrl,
    imageBlob: blob,
    dimensions,
    shareUrl: config.deepLink.url,
    metadata: {
      platform: config.platform,
      contentType: config.content.type,
      generatedAt: Date.now()
    }
  };
};

/**
 * Draw share card on canvas
 */
const drawShareCard = async (
  ctx: CanvasRenderingContext2D,
  _canvas: HTMLCanvasElement,
  config: ShareCardConfig,
  theme: any,
  dimensions: any
) => {
  const { width, height } = dimensions;
  const { safeZone } = dimensions;
  
  // Draw background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, theme.gradient[0]);
  gradient.addColorStop(0.5, theme.gradient[1]);
  gradient.addColorStop(1, theme.gradient[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Load and draw album artwork
  const artwork = await loadImage(config.content.imageUrl);
  
  // Calculate artwork position and size
  const artworkSize = calculateArtworkSize(config.platform, dimensions);
  const artworkX = (width - artworkSize) / 2;
  const artworkY = safeZone.top + 100;
  
  // Draw artwork shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  
  // Draw artwork with rounded corners
  drawRoundedImage(ctx, artwork, artworkX, artworkY, artworkSize, artworkSize, 16);
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw content text
  const textY = artworkY + artworkSize + 60;
  drawContentText(ctx, config, theme, width, textY, safeZone);
  
  // Draw branding
  if (config.branding.logo) {
    drawBranding(ctx, config, width, height, safeZone, theme);
  }
  
  // Draw CTA button
  drawCTAButton(ctx, config, width, height, safeZone, theme);
  
  // Draw QR code for Instagram stories
  if (config.platform === 'instagram-story') {
    await drawQRCode(ctx, config.deepLink.url, width, height, safeZone);
  }
};

/**
 * Calculate artwork size based on platform
 */
const calculateArtworkSize = (platform: string, dimensions: any): number => {
  const { width, height } = dimensions;
  
  if (platform.includes('story') || platform === 'snapchat') {
    // Story format - larger artwork
    return Math.min(width * 0.7, 600);
  } else {
    // Feed format - medium artwork
    return Math.min(width * 0.5, height * 0.5, 400);
  }
};

/**
 * Draw content text (title, subtitle)
 */
const drawContentText = (
  ctx: CanvasRenderingContext2D,
  config: ShareCardConfig,
  theme: any,
  width: number,
  startY: number,
  safeZone: any
) => {
  const maxWidth = width - safeZone.left - safeZone.right;
  const centerX = width / 2;
  
  // Title
  ctx.fillStyle = theme.text;
  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  const titleLines = wrapText(ctx, config.content.title, maxWidth);
  let currentY = startY;
  
  titleLines.forEach(line => {
    ctx.fillText(line, centerX, currentY);
    currentY += 60;
  });
  
  // Subtitle
  ctx.fillStyle = theme.textSecondary;
  ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  currentY += 10;
  
  const subtitleLines = wrapText(ctx, config.content.subtitle, maxWidth);
  subtitleLines.forEach(line => {
    ctx.fillText(line, centerX, currentY);
    currentY += 42;
  });
  
  // Metadata (track count, duration, etc.)
  if (config.content.metadata) {
    ctx.fillStyle = theme.textSecondary;
    ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    currentY += 20;
    
    const metadataText = formatMetadata(config.content);
    ctx.fillText(metadataText, centerX, currentY);
  }
};

/**
 * Draw branding (logo and app name)
 */
const drawBranding = (
  ctx: CanvasRenderingContext2D,
  config: ShareCardConfig,
  width: number,
  height: number,
  safeZone: any,
  theme: any
) => {
  const bottomY = height - safeZone.bottom - 80;
  const centerX = width / 2;
  
  // App name
  ctx.fillStyle = theme.text;
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(config.branding.appName, centerX, bottomY);
  
  // Watermark
  if (config.branding.watermark) {
    ctx.fillStyle = theme.textSecondary;
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Listen on Mavrixfy', centerX, bottomY + 40);
  }
};

/**
 * Draw CTA button
 */
const drawCTAButton = (
  ctx: CanvasRenderingContext2D,
  _config: ShareCardConfig,
  width: number,
  height: number,
  safeZone: any,
  _theme: any
) => {
  const buttonWidth = 300;
  const buttonHeight = 60;
  const buttonX = (width - buttonWidth) / 2;
  const buttonY = height - safeZone.bottom - 180;
  
  // Button background
  ctx.fillStyle = '#1DB954'; // Spotify green
  ctx.beginPath();
  ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 30);
  ctx.fill();
  
  // Button text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Open in App', width / 2, buttonY + buttonHeight / 2);
};

/**
 * Draw QR code (placeholder - would use qrcode library in production)
 */
const drawQRCode = async (
  ctx: CanvasRenderingContext2D,
  _url: string,
  width: number,
  _height: number,
  safeZone: any
) => {
  const qrSize = 120;
  const qrX = width - safeZone.right - qrSize - 20;
  const qrY = safeZone.top + 20;
  
  // Draw QR background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrX, qrY, qrSize, qrSize);
  
  // Draw QR placeholder
  ctx.fillStyle = '#000000';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('QR', qrX + qrSize / 2, qrY + qrSize / 2);
};

/**
 * Helper: Load image
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Helper: Draw rounded image
 */
const drawRoundedImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.clip();
  ctx.drawImage(img, x, y, width, height);
  ctx.restore();
};

/**
 * Helper: Wrap text to fit width
 */
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

/**
 * Helper: Format metadata
 */
const formatMetadata = (content: any): string => {
  const parts: string[] = [];
  
  if (content.metadata?.trackCount) {
    parts.push(`${content.metadata.trackCount} songs`);
  }
  
  if (content.metadata?.duration) {
    const minutes = Math.floor(content.metadata.duration / 60);
    parts.push(`${minutes} min`);
  }
  
  if (content.metadata?.year) {
    parts.push(`${content.metadata.year}`);
  }
  
  return parts.join(' • ');
};

/**
 * Cleanup generated card URLs
 */
export const cleanupCardUrl = (url: string) => {
  URL.revokeObjectURL(url);
};
