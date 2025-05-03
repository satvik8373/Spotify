// Cache names
const CACHE_NAME = 'spotify-app-v1';
const STATIC_CACHE = 'spotify-static-v1';
const DYNAMIC_CACHE = 'spotify-dynamic-v1';
const AUDIO_CACHE = 'spotify-audio-v1';

// App shell files to cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon-16.png',
  '/favicon-32.png',
  '/src/main.tsx',
  '/src/index.css',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[Service Worker] Precaching App Shell');
        return cache.addAll(APP_SHELL);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Take control of all clients immediately
  self.clients.claim();
  
  event.waitUntil(
    caches.keys()
      .then(keyList => {
        return Promise.all(keyList.map(key => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== AUDIO_CACHE) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        }));
      })
  );
  
  return self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Special handling for audio files
  if (request.url.includes('.mp3') || request.url.includes('/audio/')) {
    return event.respondWith(
      caches.open(AUDIO_CACHE)
        .then(cache => {
          return cache.match(request)
            .then(cachedResponse => {
              // Return cached audio if available
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // Otherwise fetch from network and cache
              return fetch(request)
                .then(networkResponse => {
                  // Cache a clone of the response
                  cache.put(request, networkResponse.clone());
                  return networkResponse;
                })
                .catch(error => {
                  console.error('[Service Worker] Audio fetch failed:', error);
                });
            });
        })
    );
  }
  
  // Dynamic caching strategy for other assets
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then(networkResponse => {
            // Don't cache API responses, headers or POST requests
            if (!request.url.includes('/api/') && 
                request.method === 'GET' && 
                !request.url.includes('chrome-extension')) {
              
              return caches.open(DYNAMIC_CACHE)
                .then(cache => {
                  // Cache a clone of the response
                  cache.put(request, networkResponse.clone());
                  return networkResponse;
                });
            }
            
            return networkResponse;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            // Could return a fallback offline page here
          });
      })
  );
});

// Background Sync for pending operations
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync', event.tag);
  
  if (event.tag === 'sync-liked-songs') {
    event.waitUntil(syncLikedSongs());
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    console.log('[Service Worker] Received keep-alive ping');
    
    // Send back acknowledgment
    if (event.source) {
      event.source.postMessage({
        type: 'KEEP_ALIVE_ACK',
        timestamp: Date.now()
      });
    }
  }
});

// Function to sync pending liked songs
function syncLikedSongs() {
  // This would normally retrieve pending operations from IndexedDB
  // and send them to the server
  return new Promise((resolve) => {
    console.log('[Service Worker] Syncing liked songs');
    // Implementation would go here
    resolve();
  });
}

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.registration.periodicSync.register('sync-content', {
    minInterval: 24 * 60 * 60 * 1000, // 24 hours
  }).catch(error => {
    console.error('[Service Worker] Periodic sync registration failed:', error);
  });
} 