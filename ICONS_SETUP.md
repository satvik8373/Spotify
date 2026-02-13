# Mavrixfy Icon Setup Guide

All icons across the project now use `mavrixfy.png` as the source logo.

## Source Logo
- **Location**: `frontend/public/mavrixfy.png`
- This is your master logo file that all other icons are generated from

## Frontend (Web/PWA)

### Current Setup
All frontend icons already reference `mavrixfy.png`:
- ✅ Favicon: `/mavrixfy.png`
- ✅ Apple touch icons: `/mavrixfy.png`
- ✅ Android PWA icons: `/mavrixfy.png`
- ✅ Manifest icons: `/mavrixfy.png`

### Files Updated
- `frontend/index.html` - All icon links
- `frontend/public/manifest.json` - PWA icons and shortcuts

## Mobile App (Mavrixfy_App)

### Generate Icons
Run this command to generate all mobile app icons from mavrixfy.png:

```bash
cd Mavrixfy_App
npm run generate:icons
```

This will create:
- `icon.png` (1024x1024) - Main app icon
- `splash-icon.png` (512x512) - Splash screen
- `android-icon-foreground.png` (432x432) - Android adaptive icon foreground
- `android-icon-background.png` (432x432) - Android adaptive icon background
- `android-icon-monochrome.png` (432x432) - Android monochrome icon

### Files Updated
- `Mavrixfy_App/app.json` - Icon paths configured
- `Mavrixfy_App/scripts/generate-app-icons.js` - Icon generation script
- `Mavrixfy_App/package.json` - Added `generate:icons` script

## How to Update Logo

1. Replace `frontend/public/mavrixfy.png` with your new logo
2. Run icon generation for mobile app:
   ```bash
   cd Mavrixfy_App
   npm run generate:icons
   ```
3. Rebuild your apps:
   ```bash
   # For mobile
   eas build --platform android --profile production
   
   # For web
   cd frontend
   npm run build
   ```

## Icon Specifications

### Web/PWA
- Format: PNG
- Sizes: 16x16 to 512x512
- Purpose: any, maskable

### iOS
- Format: PNG
- Size: 1024x1024
- No transparency, no rounded corners

### Android
- Format: PNG
- Adaptive icon: 432x432
- Background: #121212 (dark theme)
- Foreground: Your logo with padding

## Notes
- All icons use the same source: `mavrixfy.png`
- Frontend icons are static references (no generation needed)
- Mobile app icons need to be regenerated when logo changes
- Keep mavrixfy.png at least 1024x1024 for best quality
