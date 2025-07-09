// Service Worker for Mavrixfy
const CACHE_VERSION = '1.2.5'; // Increment this version whenever you make changes
const CACHE_NAME = `spotify-mavrix-v${CACHE_VERSION}`;
const APP_SHELL_CACHE = 'app-shell-v' + CACHE_VERSION;
const DYNAMIC_CACHE = 'dynamic-v' + CACHE_VERSION;

// Resources to cache immediately 
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/shortcut-liked-96.png',
  '/shortcut-search-96.png',
  '/spotify-icons/spotify-logo-green.png',
  '/spotify-icons/spotify-logo-white.png',
  '/spotify-icons/spotify-logo-black.png',
  '/spotify-icons/spotify-logo-green.svg',
  '/spotify-icons/spotify-logo-white.svg',
  '/spotify-icons/spotify-logo-black.svg'
];

// Files that shouldn't be cached
const EXCLUDE_FROM_CACHE = [
  '/api/',
  'chrome-extension://'
];

// Force update check interval (6 hours)
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Changed to 24 hours to reduce checks

// Debug mode - set to false to disable verbose logging
const DEBUG_MODE = false;

// Logger function that only logs in debug mode
const logDebug = (message) => {
  if (DEBUG_MODE) {
    console.log(message);
  }
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  logDebug('[Service Worker] Installing new version: ' + CACHE_VERSION);
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => {
        logDebug('[Service Worker] Caching app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force activation - don't wait for old service worker to stop controlling clients
        logDebug('[Service Worker] Skipping waiting for immediate activation');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  logDebug('[Service Worker] Activating new version: ' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any old caches that don't match our current version
          if (
            !cacheName.includes(CACHE_VERSION) && 
            (cacheName.startsWith('spotify-mavrix-') || 
             cacheName.startsWith('app-shell-') || 
             cacheName.startsWith('dynamic-'))
          ) {
            logDebug('[Service Worker] Deleting old cache: ' + cacheName);
            return caches.delete(cacheName);
          }
        }).filter(Boolean)
      );
    })
    .then(() => {
      // Take control of all clients immediately
      logDebug('[Service Worker] Claiming all clients');
      return self.clients.claim();
    })
    .then(() => {
      // Force clients to reload to get the new version
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'NEW_VERSION',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// Handle app installed event
self.addEventListener('appinstalled', (event) => {
  logDebug('[Service Worker] App was installed');
  // Notify clients that the app was installed
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'APP_INSTALLED'
      });
    });
  });
  
  // Store installation info in cache for persistence
  caches.open('pwa-state-cache').then(cache => {
    cache.put('installation-status', new Response(JSON.stringify({
      installed: true,
      installTime: Date.now()
    })));
  });
});

// Periodic update check
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Removed console log to prevent spam
    checkForUpdates();
  }
  
  // Check for PWA installation status request
  if (event.data && event.data.type === 'GET_INSTALLATION_STATUS') {
    caches.open('pwa-state-cache').then(cache => {
      cache.match('installation-status').then(response => {
        if (response) {
          response.json().then(data => {
            event.ports[0].postMessage({
              type: 'INSTALLATION_STATUS',
              installed: data.installed,
              installTime: data.installTime
            });
          });
        } else {
          event.ports[0].postMessage({
            type: 'INSTALLATION_STATUS',
            installed: false
          });
        }
      });
    });
  }
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip API requests and Chrome extensions
  if (EXCLUDE_FROM_CACHE.some(url => event.request.url.includes(url))) {
    return;
  }

  // For navigation requests (HTML pages) - always try network first then fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response for caching
          const responseToCache = response.clone();
          caches.open(APP_SHELL_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If offline, serve the cached index.html
          logDebug('[Service Worker] Falling back to cached page for: ' + event.request.url);
          return caches.match('/index.html');
        })
    );
    return;
  }

  // For JavaScript and CSS files - network first with cache fallback
  if (event.request.url.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh response
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
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
            caches.open(DYNAMIC_CACHE)
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
            return null;
          });
      })
  );
});

// Check for updates periodically
function checkForUpdates() {
  // Removed console log to prevent spam
  
  // Unregister and re-register to force update
  self.registration.update().then(() => {
    // Removed console log to prevent spam
  });
}

// Set up periodic update checks
self.addEventListener('activate', (event) => {
  // Set up periodic update checks
  setInterval(() => {
    checkForUpdates();
  }, UPDATE_CHECK_INTERVAL);
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
    self.registration.showNotification('Mavrixfy', options)
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