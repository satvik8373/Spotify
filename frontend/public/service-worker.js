// Service Worker for Mavrixfy
const CACHE_NAME = 'mavrixfy-v2.0.3';
const STATIC_CACHE = 'mavrixfy-static-v1.0.3';
const DYNAMIC_CACHE = 'mavrixfy-dynamic-v1.0.3';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/mavrixfy.png',
  '/mavrixfy_loading.mp4',
  '/browserconfig.xml',
  '/pwa-icon-fix.css'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        // swallow
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.origin === self.location.origin) {
    // Check if this is a JioSaavn API request through our backend
    if (url.pathname.startsWith('/api/jiosaavn/')) {
      // For JioSaavn API requests, use network-only strategy without fallback
      // This prevents 504 errors from being returned when the API is slow or unavailable
      event.respondWith(
        fetch(request).catch((error) => {
          // Return a proper error response instead of 504
          return new Response(JSON.stringify({ 
            error: 'Network error', 
            message: 'Unable to reach the music API. Please check your connection.' 
          }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );
      return;
    }
    // Same-origin requests
    event.respondWith(handleSameOriginRequest(request));
  } else if (url.hostname === 'res.cloudinary.com') {
    // Cloudinary images - cache first strategy
    event.respondWith(handleImageRequest(request));
  } else if (url.hostname === 'api.spotify.com') {
    // Spotify API - network first strategy
    event.respondWith(handleApiRequest(request));
  } else if (url.hostname === 'saavn.dev' || url.hostname.endsWith('.googleusercontent.com')) {
    // Bypass SW for these hosts to avoid unintended 504 fallbacks or rate-limit noise
    return; // allow default browser fetch handling
  } else {
    // Other external requests - network first
    event.respondWith(handleExternalRequest(request));
  }
});

// Handle same-origin requests
async function handleSameOriginRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

// Handle image requests (Cloudinary)
async function handleImageRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return a placeholder image if available
    const placeholderResponse = await cache.match('/mavrixfy.png');
    if (placeholderResponse) {
      return placeholderResponse;
    }
    
    throw error;
  }
}

// Handle API requests (Spotify)
async function handleApiRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses (but with shorter TTL)
    if (networkResponse.ok) {
      // Only cache GET requests
      if (request.method === 'GET') {
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    throw error;
  }
}


// Handle other external requests
async function handleExternalRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Gracefully fall back without throwing to avoid uncaught promise errors
    // Return a 504 Gateway Timeout-like response so the app can handle it
    return new Response(null, { status: 504, statusText: 'Network request failed (service worker fallback)' });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  // no-op
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Handle background sync
async function doBackgroundSync() {
  try {
    // Sync any pending actions (likes, playlists, etc.)
    console.log('Performing background sync...');
    
    // You can add specific sync logic here
    // For example, syncing liked songs, playlists, etc.
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  // no-op
  
  const options = {
    body: event.data ? event.data.text() : 'New music available!',
    icon: '/mavrixfy.png',
    badge: '/mavrixfy.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/mavrixfy.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/mavrixfy.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Mavrixfy', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  // no-op
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle message events
self.addEventListener('message', (event) => {
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 