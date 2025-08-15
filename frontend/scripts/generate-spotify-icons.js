const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Define icon sizes to generate
const ICON_SIZES = [192, 512];
const SOURCE_SVG = path.join(__dirname, '../public/spotify-icons/spotify-logo-green.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/spotify-icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate PNG icons in different sizes
async function generateIcons() {
  console.log('Generating Spotify icons...');
  
  try {
    // Generate standard icons
    for (const size of ICON_SIZES) {
      await sharp(SOURCE_SVG)
        .resize(size, size)
        .png()
        .toFile(path.join(OUTPUT_DIR, spotify-icon-.png));
      
      console.log(Created icon: spotify-icon-.png);
    }
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Run the icon generation
generateIcons();
