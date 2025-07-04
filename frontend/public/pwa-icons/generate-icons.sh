#!/bin/bash
# Script to generate all PWA icons from SVG source

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first."
    exit 1
fi

# Source SVG file
SVG_SOURCE="./spotify-mavrix-icon.svg"

# Create output directory if it doesn't exist
mkdir -p ../

# Generate regular icons
convert -background none -density 600 $SVG_SOURCE -resize 192x192 ../spotify-icon-192.png
convert -background none -density 1200 $SVG_SOURCE -resize 512x512 ../spotify-icon-512.png

# Generate maskable icons (with proper padding for safe area - 40% of the image should be within safe zone)
# For maskable icons, we'll resize the icon to 60% of the final size and add padding
convert -background "#1DB954" -density 600 $SVG_SOURCE -resize 115x115 -gravity center -extent 192x192 ../spotify-icon-maskable-192.png
convert -background "#1DB954" -density 1200 $SVG_SOURCE -resize 307x307 -gravity center -extent 512x512 ../spotify-icon-maskable-512.png

# Generate Apple touch icons
convert -background "#1DB954" -density 600 $SVG_SOURCE -resize 140x140 -gravity center -extent 180x180 ../apple-touch-icon-180.png
convert -background "#1DB954" -density 600 $SVG_SOURCE -resize 93x93 -gravity center -extent 120x120 ../apple-touch-icon-120.png
convert -background "#1DB954" -density 600 $SVG_SOURCE -resize 118x118 -gravity center -extent 152x152 ../apple-touch-icon-152.png
convert -background "#1DB954" -density 600 $SVG_SOURCE -resize 130x130 -gravity center -extent 167x167 ../apple-touch-icon-167.png

# Generate a general apple-touch-icon (iOS will use this by default)
cp ../apple-touch-icon-180.png ../apple-touch-icon.png

# Generate favicon
convert -background none -density 400 $SVG_SOURCE -resize 64x64 ../favicon.png

# Generate shortcut icons 
convert -background none -density 400 $SVG_SOURCE -resize 76x76 -gravity center -extent 96x96 ../shortcut-liked-96.png
convert -background none -density 400 $SVG_SOURCE -resize 76x76 -gravity center -extent 96x96 ../shortcut-search-96.png

echo "All icons generated successfully!" 