const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Icon sizes we need to generate
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Source icon (assuming we have a high-res source icon)
const sourceIcon = path.join(__dirname, '../src/assets/app-icon.png');

// Generate app icons
async function generateIcons() {
  try {
    for (const size of sizes) {
      await sharp(sourceIcon)
        .resize(size, size)
        .toFile(path.join(ICONS_DIR, `icon-${size}x${size}.png`));
      console.log(`Generated ${size}x${size} icon`);
    }

    // Generate shortcut icons
    const shortcuts = ['home', 'search', 'library', 'liked'];
    for (const shortcut of shortcuts) {
      await sharp(path.join(__dirname, `../src/assets/${shortcut}-icon.png`))
        .resize(96, 96)
        .toFile(path.join(ICONS_DIR, `${shortcut}.png`));
      console.log(`Generated ${shortcut} shortcut icon`);
    }

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons(); 