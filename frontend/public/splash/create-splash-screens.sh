#!/bin/bash
# Script to generate splash screens for iOS PWA

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first."
    exit 1
fi

# Source SVG file and background color
SVG_SOURCE="../pwa-icons/spotify-mavrix-icon.svg"
BG_COLOR="#121212"
TEXT_COLOR="#1DB954"

# Generate splash screens for different iOS devices
# iPhone
convert -size 1125x2436 xc:$BG_COLOR \
  -font Arial-Bold -pointsize 40 -fill $TEXT_COLOR -gravity south \
  -annotate +0+200 "Spotify x Mavrix" \
  -gravity center "$SVG_SOURCE" -resize 256x256 -composite \
  ./apple-splash-1125-2436.png
  
# iPhone XR, XS Max
convert -size 1242x2688 xc:$BG_COLOR \
  -font Arial-Bold -pointsize 40 -fill $TEXT_COLOR -gravity south \
  -annotate +0+200 "Spotify x Mavrix" \
  -gravity center "$SVG_SOURCE" -resize 280x280 -composite \
  ./apple-splash-1242-2688.png
  
# iPhone 8 Plus, 7 Plus, 6s Plus
convert -size 1242x2208 xc:$BG_COLOR \
  -font Arial-Bold -pointsize 40 -fill $TEXT_COLOR -gravity south \
  -annotate +0+200 "Spotify x Mavrix" \
  -gravity center "$SVG_SOURCE" -resize 260x260 -composite \
  ./apple-splash-1242-2208.png
  
# iPhone 8, 7, 6s, 6
convert -size 750x1334 xc:$BG_COLOR \
  -font Arial-Bold -pointsize 36 -fill $TEXT_COLOR -gravity south \
  -annotate +0+180 "Spotify x Mavrix" \
  -gravity center "$SVG_SOURCE" -resize 200x200 -composite \
  ./apple-splash-750-1334.png
  
# iPad Pro 12.9"
convert -size 2048x2732 xc:$BG_COLOR \
  -font Arial-Bold -pointsize 50 -fill $TEXT_COLOR -gravity south \
  -annotate +0+250 "Spotify x Mavrix" \
  -gravity center "$SVG_SOURCE" -resize 350x350 -composite \
  ./apple-splash-2048-2732.png
  
# iPad Pro 11"
convert -size 1668x2388 xc:$BG_COLOR \
  -font Arial-Bold -pointsize 50 -fill $TEXT_COLOR -gravity south \
  -annotate +0+240 "Spotify x Mavrix" \
  -gravity center "$SVG_SOURCE" -resize 320x320 -composite \
  ./apple-splash-1668-2388.png
  
# iPad Pro 10.5"
convert -size 1668x2224 xc:$BG_COLOR \
  -font Arial-Bold -pointsize 45 -fill $TEXT_COLOR -gravity south \
  -annotate +0+220 "Spotify x Mavrix" \
  -gravity center "$SVG_SOURCE" -resize 300x300 -composite \
  ./apple-splash-1668-2224.png
  
# iPad 9.7"
convert -size 1536x2048 xc:$BG_COLOR \
  -font Arial-Bold -pointsize 40 -fill $TEXT_COLOR -gravity south \
  -annotate +0+200 "Spotify x Mavrix" \
  -gravity center "$SVG_SOURCE" -resize 280x280 -composite \
  ./apple-splash-1536-2048.png

echo "All splash screens generated successfully!" 