# Spotify x Mavrix Frontend

A premium music experience with enhanced discovery features

## Bundle Size Optimizations

This project has been optimized for efficient loading and better performance. The key optimizations include:

### 1. Code Splitting Strategy

- **Component-level lazy loading**: All major routes use dynamic imports with React.lazy() and Suspense for better code splitting
- **Feature-based chunking**: Similar features are grouped together to reduce duplicate code
- **Vendor chunking**: Third-party dependencies are split into logical groups:
  - `vendor-react`: React and related libraries
  - `vendor-ui`: UI component libraries (@radix-ui, MUI, etc.)
  - `vendor-state`: State management (Zustand)
  - `vendor-utils`: Utility libraries (lodash, axios, etc.)
  - `vendor-others`: Other dependencies

### 2. Build Optimizations

- **Compression**: Automatic gzip and Brotli compression for all assets
- **Tree shaking**: Unused code is removed during build
- **Minification**: Terser with aggressive settings to reduce size
- **Source maps**: Not included in production builds
- **Console stripping**: Console logs are removed in production
- **Bundle analysis**: Visualizer plugin generates detailed reports

### 3. Performance Optimizations

- **Preloading**: Critical resources are preloaded
- **DNS prefetching**: External domains are prefetched
- **Deferred loading**: Non-critical scripts are deferred
- **PWA optimizations**: Service worker with aggressive caching
- **Image optimization**: Images are compressed and properly sized

## Bundle Size Results

Before optimization:
```
dist/index.html                     3.74 kB │ gzip:   1.06 kB
dist/assets/index-5YjqFyFq.css     61.17 kB │ gzip:  10.87 kB
dist/assets/vendor-X4K1gmuM.js    210.84 kB │ gzip:  69.01 kB
dist/assets/index-D7RIe5UP.js   1,172.71 kB │ gzip: 323.93 kB
```

After optimization:
```
dist/index.html                             5.36 kB │ gzip:   1.64 kB
dist/assets/index-CEEUuZsa.css             63.22 kB │ gzip:  11.19 kB
dist/assets/page-search-BBSGBfhA.js         2.55 kB │ gzip:   1.20 kB
dist/assets/page-album-CyWBgP8s.js          2.57 kB │ gzip:   1.07 kB
dist/assets/vendor-state-vO-nVjm_.js        3.94 kB │ gzip:   1.39 kB
dist/assets/page-liked-songs-D5qCFEG4.js    5.73 kB │ gzip:   2.22 kB
dist/assets/page-home-DP5mjmGO.js          14.26 kB │ gzip:   4.50 kB
dist/assets/page-playlist-D3c2ELjE.js      15.20 kB │ gzip:   4.56 kB
dist/assets/index-DLeVg84D.js              26.12 kB │ gzip:   7.58 kB
dist/assets/app-core-DsY8vF54.js           42.97 kB │ gzip:  11.09 kB
dist/assets/ui-components-CsiTq29Y.js      55.89 kB │ gzip:  14.57 kB
dist/assets/vendor-ui-C909Stew.js          79.83 kB │ gzip:  24.62 kB
dist/assets/vendor-utils-DfgmPRU5.js      105.82 kB │ gzip:  38.43 kB
dist/assets/vendor-react-Cy20TZEr.js      314.63 kB │ gzip: 100.33 kB
dist/assets/vendor-others-CDstnMDG.js     680.42 kB │ gzip: 171.10 kB
```

**Major improvements:**
- Initial load reduced from 1383.55 kB to 26.12 kB (main bundle)
- Route-based code splitting for faster page navigation
- Features now loaded on demand instead of all at once

Brotli compression further reduces sizes by approximately 12-15% compared to gzip.

## Development

To run the project in development mode:

```bash
npm install
npm run dev
```

## Build

To build the project for production:

```bash
npm run build
```

View the bundle analysis report at `dist/stats.html` after building.

## PWA Support

The app includes full PWA support with:
- Offline capability
- Home screen installation
- Automatic updates
- Background sync
