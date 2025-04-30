// Service Worker for Spotify x Mavrix
const CACHE_NAME = 'spotify-mavrix-v1';

// Resources to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/spotify-icon-192.png',
  '/spotify-icon-512.png',
  '/pwa-icons/spotify-mavrix-icon.svg',
  '/shortcut-liked-96.png',
  '/shortcut-search-96.png'
];

// Files that shouldn't be cached
const EXCLUDE_FROM_CACHE = [
  '/api/',
  'chrome-extension://'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip API requests and Chrome extensions
  if (EXCLUDE_FROM_CACHE.some(url => event.request.url.includes(url))) {
    return;
  }

  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If offline, serve the cached index.html
          return caches.match('/');
        })
    );
    return;
  }

  // For other assets, use a cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise try to fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();

            // Cache the fetched resource
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, serve a fallback for image resources
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
              return caches.match('/pwa-icons/spotify-mavrix-icon.svg');
            }
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-liked-songs') {
    event.waitUntil(syncLikedSongs());
  }
});

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/pwa-icons/spotify-mavrix-icon.svg',
    badge: '/pwa-icons/notification-badge.png',
    actions: [
      {
        action: 'open',
        title: 'Open'
      }
    ],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('Spotify x Mavrix', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Sync liked songs function
async function syncLikedSongs() {
  try {
    const cache = await caches.open('liked-songs-cache');
    const pendingActions = await cache.match('pending-actions');
    
    if (!pendingActions) return;
    
    const actions = await pendingActions.json();
    
    // Process each pending action
    const requests = actions.map(async (action) => {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        // Remove processed action
        const updatedActions = actions.filter(a => a.id !== action.id);
        await cache.put('pending-actions', new Response(JSON.stringify(updatedActions)));
      } catch (error) {
        console.error('Sync failed for action:', action, error);
      }
    });
    
    await Promise.all(requests);
  } catch (error) {
    console.error('Error syncing liked songs:', error);
  }
} 