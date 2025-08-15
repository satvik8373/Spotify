/**
 * Fix Spotify Icon Script
 * This script creates a properly formatted Spotify icon with the correct spacing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define icon sizes to generate
const ICON_SIZES = [192, 512];
const SOURCE_SVG = path.join(__dirname, '../public/spotify-icons/spotify-logo-green.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/spotify-icons');
const TEMP_DIR = path.join(__dirname, '../public/temp-icons');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Read the Spotify logo SVG content
const spotifyLogoContent = fs.readFileSync(SOURCE_SVG, 'utf8');

// Generate properly formatted icons
async function generateIcons() {
  console.log('Generating properly formatted Spotify icons...');
  
  try {
    // Generate maskable icons with proper spacing
    for (const size of ICON_SIZES) {
      // Create a combined SVG with proper spacing
      const svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.2)}" ry="${Math.floor(size * 0.2)}" fill="#191414"/>
          <g transform="translate(${Math.floor(size * 0.175)}, ${Math.floor(size * 0.175)}) scale(${0.65})">
            ${spotifyLogoContent.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
          </g>
        </svg>
      `;
      
      // Write the SVG to a temporary file
      const tempSvgPath = path.join(TEMP_DIR, `temp-icon-${size}.svg`);
      fs.writeFileSync(tempSvgPath, svgContent);
      
      // Convert SVG to PNG for maskable icon
      await sharp(tempSvgPath)
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created maskable icon: spotify-icon-maskable-${size}.png`);
      
      // Also create regular icon with the same format
      await sharp(tempSvgPath)
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created icon: spotify-icon-${size}.png`);
    }
    
    // Create a special icon for Apple touch icons
    const appleIconSize = 180;
    const appleSvgContent = `
      <svg width="${appleIconSize}" height="${appleIconSize}" viewBox="0 0 ${appleIconSize} ${appleIconSize}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${appleIconSize}" height="${appleIconSize}" rx="${Math.floor(appleIconSize * 0.2)}" ry="${Math.floor(appleIconSize * 0.2)}" fill="#191414"/>
        <g transform="translate(${Math.floor(appleIconSize * 0.175)}, ${Math.floor(appleIconSize * 0.175)}) scale(${0.65})">
          ${spotifyLogoContent.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
        </g>
      </svg>
    `;
    
    // Write the Apple SVG to a temporary file
    const tempAppleSvgPath = path.join(TEMP_DIR, 'temp-apple-icon.svg');
    fs.writeFileSync(tempAppleSvgPath, appleSvgContent);
    
    // Convert SVG to PNG for Apple touch icon
    await sharp(tempAppleSvgPath)
      .png()
      .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
    
    console.log('Created Apple touch icon: apple-touch-icon.png');
    
    // Copy to other Apple touch icon sizes
    fs.copyFileSync(
      path.join(__dirname, '../public/apple-touch-icon.png'),
      path.join(__dirname, '../public/apple-touch-icon-120.png')
    );
    fs.copyFileSync(
      path.join(__dirname, '../public/apple-touch-icon.png'),
      path.join(__dirname, '../public/apple-touch-icon-152.png')
    );
    fs.copyFileSync(
      path.join(__dirname, '../public/apple-touch-icon.png'),
      path.join(__dirname, '../public/apple-touch-icon-167.png')
    );
    fs.copyFileSync(
      path.join(__dirname, '../public/apple-touch-icon.png'),
      path.join(__dirname, '../public/apple-touch-icon-180.png')
    );
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the icon generation
generateIcons(); 