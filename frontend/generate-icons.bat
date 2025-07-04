@echo off
echo ===== Spotify PWA Icon Generator =====
echo This script will generate all necessary icons for the Spotify PWA.

echo.
echo Installing required packages...
call npm install --no-save canvas sharp fs-extra

echo.
echo Generating maskable icons...
call node scripts/generate-maskable-icons.js

echo.
echo Done! The following icons have been generated:
echo - spotify-icon-192.png
echo - spotify-icon-512.png
echo - spotify-icon-maskable-192.png
echo - spotify-icon-maskable-512.png
echo - favicon.png
echo - apple-touch-icon*.png files

echo.
echo Icons are ready for use in the PWA!
pause 