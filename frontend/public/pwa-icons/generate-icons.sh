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

# Generate regular icons - no background, just the logo itself
convert -background none -density 600 $SVG_SOURCE -resize 192x192 ../spotify-icon-192.png
convert -background none -density 1200 $SVG_SOURCE -resize 512x512 ../spotify-icon-512.png

# Generate maskable icons - use minimal padding to match Spotify's style exactly
# Use 85% of the space for the icon, matching Spotify's look
convert -background "#191414" -density 600 $SVG_SOURCE -resize 163x163 -gravity center -extent 192x192 ../spotify-icon-maskable-192.png
convert -background "#191414" -density 1200 $SVG_SOURCE -resize 435x435 -gravity center -extent 512x512 ../spotify-icon-maskable-512.png

# Generate Apple touch icons with minimal padding to match Spotify
convert -background "#191414" -density 600 $SVG_SOURCE -resize 160x160 -gravity center -extent 180x180 ../apple-touch-icon-180.png
convert -background "#191414" -density 600 $SVG_SOURCE -resize 106x106 -gravity center -extent 120x120 ../apple-touch-icon-120.png
convert -background "#191414" -density 600 $SVG_SOURCE -resize 134x134 -gravity center -extent 152x152 ../apple-touch-icon-152.png
convert -background "#191414" -density 600 $SVG_SOURCE -resize 148x148 -gravity center -extent 167x167 ../apple-touch-icon-167.png

# Generate a general apple-touch-icon (iOS will use this by default)
cp ../apple-touch-icon-180.png ../apple-touch-icon.png

# Generate favicon
convert -background none -density 400 $SVG_SOURCE -resize 64x64 ../favicon.png

# Generate shortcut icons 
convert -background "#191414" -density 400 $SVG_SOURCE -resize 84x84 -gravity center -extent 96x96 ../shortcut-liked-96.png
convert -background "#191414" -density 400 $SVG_SOURCE -resize 84x84 -gravity center -extent 96x96 ../shortcut-search-96.png

echo "All icons generated successfully!" 