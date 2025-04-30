#!/bin/bash
# Script to generate all PWA icons from SVG source

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first."
    exit 1
fi

# Source SVG file
SVG_SOURCE="./spotify-mavrix-icon.svg"

# Generate regular icons
convert -background none -density 600 $SVG_SOURCE -resize 192x192 ../spotify-icon-192.png
convert -background none -density 1200 $SVG_SOURCE -resize 512x512 ../spotify-icon-512.png

# Generate maskable icons (with padding for safe area)
convert -background none -density 600 $SVG_SOURCE -resize 152x152 -gravity center -extent 192x192 ../spotify-icon-maskable-192.png
convert -background none -density 1200 $SVG_SOURCE -resize 404x404 -gravity center -extent 512x512 ../spotify-icon-maskable-512.png

# Generate Apple touch icons
convert -background none -density 600 $SVG_SOURCE -resize 152x152 -gravity center -extent 180x180 ../apple-touch-icon.png
convert -background none -density 600 $SVG_SOURCE -resize 120x120 ../apple-touch-icon-120.png
convert -background none -density 600 $SVG_SOURCE -resize 152x152 ../apple-touch-icon-152.png
convert -background none -density 600 $SVG_SOURCE -resize 167x167 ../apple-touch-icon-167.png
convert -background none -density 600 $SVG_SOURCE -resize 180x180 ../apple-touch-icon-180.png

# Generate shortcut icons
convert -background none -density 400 $SVG_SOURCE -resize 76x76 -gravity center -extent 96x96 ../shortcut-liked-96.png
convert -background none -density 400 $SVG_SOURCE -resize 76x76 -gravity center -extent 96x96 ../shortcut-search-96.png

# Generate favicon
convert -background none -density 400 $SVG_SOURCE -resize 32x32 ../favicon-32.png
convert -background none -density 400 $SVG_SOURCE -resize 16x16 ../favicon-16.png

echo "All icons generated successfully!" 