// Service Worker for Mavrixfy - iOS PWA Compatible with Audio Caching
const CACHE_VERSION = '2.1.0';
const CACHE_NAME = `mavrixfy-v${CACHE_VERSION}`;
const STATIC_CACHE = `mavrixfy-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `mavrixfy-dynamic-v${CACHE_VERSION}`;
const AUDIO_CACHE = `mavrixfy-audio-v${CACHE_VERSION}`;

// Audio cache configuration
const AUDIO_CACHE_CONFIG = {
  maxItems: 50,              // Max number of audio files to cache
  maxSizeBytes: 500 * 1024 * 1024, // 500MB max total size
  maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days max age
};

// Detect iOS
const isIOS = /iPad|iPhone|iPod/.test(self.navigator.userAgent);

// Audio URL patterns to cache
const AUDIO_URL_PATTERNS = [
  /\.mp3(\?|$)/i,
  /\.m4a(\?|$)/i,
  /\.aac(\?|$)/i,
  /\.ogg(\?|$)/i,
  /\.wav(\?|$)/i,
  /\/aac\//i,           // JioSaavn AAC streams
  /\/mp3\//i,           // JioSaavn MP3 streams
  /saavn\.me/i,         // JioSaavn CDN
  /jiosaavn/i,          // JioSaavn domains
  /cdnx?\.saavncdn\.com/i, // Saavn CDN
];

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/mavrixfy.png'
];

// Check if URL is an audio file
function isAudioUrl(url) {
  return AUDIO_URL_PATTERNS.some(pattern => pattern.test(url));
}

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache static files (skip detailed caching on iOS)
      isIOS ? Promise.resolve() : caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_FILES)),
      // Create audio cache
      caches.open(AUDIO_CACHE)
    ])
    .then(() => self.skipWaiting())
    .catch(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, AUDIO_CACHE];

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete old version caches
            if (!currentCaches.includes(cacheName) && cacheName.startsWith('mavrixfy-')) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - main request handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle audio requests with special caching strategy
  if (isAudioUrl(request.url)) {
    event.respondWith(handleAudioRequest(request));
    return;
  }

  // For iOS, use simpler network-first strategy
  if (isIOS) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then(response => {
          return response || new Response(null, { status: 504 });
        });
      })
    );
    return;
  }

  // Handle different types of requests (non-iOS)
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/jiosaavn/')) {
      event.respondWith(handleJioSaavnApiRequest(request));
      return;
    }
    event.respondWith(handleSameOriginRequest(request));
  } else if (url.hostname === 'res.cloudinary.com') {
    event.respondWith(handleImageRequest(request));
  } else if (url.hostname === 'api.spotify.com') {
    event.respondWith(handleApiRequest(request));
  } else if (url.hostname === 'saavn.dev' || url.hostname.endsWith('.googleusercontent.com')) {
    return; // Allow default browser fetch
  } else {
    event.respondWith(handleExternalRequest(request));
  }
});

/**
 * Handle audio requests with range support and caching
 * Critical for iOS PWA background playback and CarPlay
 */
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const url = request.url;

  try {
    // Check for Range header (seeking/partial content)
    const rangeHeader = request.headers.get('Range');

    if (rangeHeader) {
      // Handle range request
      return await handleRangeRequest(request, cache);
    }

    // Non-range request: try cache first, then network
    const cachedResponse = await cache.match(url);

    if (cachedResponse) {
      // Verify cached response is still valid
      const cachedDate = cachedResponse.headers.get('sw-cached-date');
      if (cachedDate) {
        const age = Date.now() - parseInt(cachedDate, 10);
        if (age < AUDIO_CACHE_CONFIG.maxAgeMs) {
          // Refresh in background if older than 1 day
          if (age > 24 * 60 * 60 * 1000) {
            fetchAndCacheAudio(request, cache);
          }
          return cachedResponse;
        }
      } else {
        return cachedResponse;
      }
    }

    // Fetch from network and cache
    return await fetchAndCacheAudio(request, cache);

  } catch (error) {
    // Fallback to cached version on network error
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return error response
    return new Response(null, {
      status: 503,
      statusText: 'Audio unavailable offline'
    });
  }
}

/**
 * Handle Range requests for audio seeking
 * iOS requires proper 206 Partial Content responses
 */
async function handleRangeRequest(request, cache) {
  const url = request.url;
  const rangeHeader = request.headers.get('Range');

  // Try to get from cache first
  const cachedResponse = await cache.match(url);

  if (cachedResponse && cachedResponse.body) {
    // We have the full file cached - serve partial content from it
    try {
      const fullBlob = await cachedResponse.blob();
      const totalSize = fullBlob.size;

      // Parse Range header (e.g., "bytes=0-" or "bytes=1000-2000")
      const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!rangeMatch) {
        return cachedResponse;
      }

      const start = parseInt(rangeMatch[1], 10);
      const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : totalSize - 1;
      const chunkSize = end - start + 1;

      // Validate range
      if (start >= totalSize) {
        return new Response(null, {
          status: 416,
          statusText: 'Range Not Satisfiable',
          headers: {
            'Content-Range': `bytes */${totalSize}`
          }
        });
      }

      // Slice the blob for the requested range
      const chunk = fullBlob.slice(start, end + 1);

      return new Response(chunk, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
          'Content-Type': cachedResponse.headers.get('Content-Type') || 'audio/mpeg',
          'Content-Length': chunkSize.toString(),
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    } catch (error) {
      // Fall through to network request
    }
  }

  // Not in cache or cache read failed - fetch from network
  try {
    const networkResponse = await fetch(request);

    // If we get a full response (200), cache it and return range
    if (networkResponse.status === 200) {
      // Clone for caching
      const responseToCache = networkResponse.clone();

      // Cache in background
      cacheAudioResponse(url, responseToCache, cache);

      // Return the network response as-is (browser handles range)
      return networkResponse;
    }

    // Return partial content response as-is
    return networkResponse;

  } catch (error) {
    return new Response(null, {
      status: 503,
      statusText: 'Audio unavailable'
    });
  }
}

/**
 * Fetch audio from network and cache it
 */
async function fetchAndCacheAudio(request, cache) {
  const response = await fetch(request);

  if (response.ok) {
    // Clone response for caching
    const responseToCache = response.clone();

    // Cache in background (don't block response)
    cacheAudioResponse(request.url, responseToCache, cache);
  }

  return response;
}

/**
 * Cache audio response with metadata
 */
async function cacheAudioResponse(url, response, cache) {
  try {
    // Create new response with cache timestamp
    const headers = new Headers(response.headers);
    headers.set('sw-cached-date', Date.now().toString());

    const cachedResponse = new Response(await response.blob(), {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });

    // Store in cache
    await cache.put(url, cachedResponse);

    // Prune cache if needed (in background)
    pruneAudioCache(cache);

  } catch (error) {
    // Caching failed - not critical
  }
}

/**
 * Prune audio cache to stay within limits
 */
async function pruneAudioCache(cache) {
  try {
    const keys = await cache.keys();

    if (keys.length <= AUDIO_CACHE_CONFIG.maxItems) {
      return;
    }

    // Get all cached items with their dates
    const items = await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request);
        const dateStr = response?.headers.get('sw-cached-date');
        return {
          request,
          date: dateStr ? parseInt(dateStr, 10) : 0
        };
      })
    );

    // Sort by date (oldest first)
    items.sort((a, b) => a.date - b.date);

    // Delete oldest items to get under limit
    const toDelete = items.slice(0, items.length - AUDIO_CACHE_CONFIG.maxItems + 10);

    await Promise.all(
      toDelete.map(item => cache.delete(item.request))
    );

  } catch (error) {
    // Pruning failed - not critical
  }
}

/**
 * Handle JioSaavn API requests
 */
async function handleJioSaavnApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Network error',
      message: 'Unable to reach the music API. Please check your connection.'
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle same-origin requests
 */
async function handleSameOriginRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok && networkResponse.status !== 206) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone()).catch(() => {});
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }

    throw error;
  }
}

/**
 * Handle image requests (Cloudinary)
 */
async function handleImageRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const placeholderResponse = await cache.match('/mavrixfy.png');
    if (placeholderResponse) {
      return placeholderResponse;
    }

    throw error;
  }
}

/**
 * Handle Spotify API requests
 */
async function handleApiRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok && request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    throw error;
  }
}

/**
 * Handle external requests
 */
async function handleExternalRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(null, {
      status: 504,
      statusText: 'Network request failed'
    });
  }
}

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Sync pending actions
}

// Push notifications
self.addEventListener('push', (event) => {
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
      { action: 'explore', title: 'Explore', icon: '/mavrixfy.png' },
      { action: 'close', title: 'Close', icon: '/mavrixfy.png' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Mavrixfy', options)
  );
});

// Notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(clients.openWindow('/'));
  }
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;

      case 'CACHE_AUDIO':
        // Manually cache an audio URL
        if (event.data.url) {
          caches.open(AUDIO_CACHE).then(cache => {
            fetch(event.data.url)
              .then(response => {
                if (response.ok) {
                  cacheAudioResponse(event.data.url, response, cache);
                }
              })
              .catch(() => {});
          });
        }
        break;

      case 'CLEAR_AUDIO_CACHE':
        caches.delete(AUDIO_CACHE).then(() => {
          caches.open(AUDIO_CACHE);
        });
        break;

      case 'GET_CACHE_STATUS':
        getCacheStatus().then(status => {
          event.source.postMessage({
            type: 'CACHE_STATUS',
            ...status
          });
        });
        break;
    }
  }
});

/**
 * Get cache status for debugging/UI
 */
async function getCacheStatus() {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const keys = await cache.keys();

    let totalSize = 0;
    const items = [];

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.clone().blob();
        totalSize += blob.size;
        items.push({
          url: request.url,
          size: blob.size,
          cachedAt: response.headers.get('sw-cached-date')
        });
      }
    }

    return {
      audioItemCount: keys.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      maxItems: AUDIO_CACHE_CONFIG.maxItems,
      maxSizeMB: (AUDIO_CACHE_CONFIG.maxSizeBytes / (1024 * 1024)).toFixed(0),
      items
    };
  } catch (error) {
    return { error: 'Failed to get cache status' };
  }
}
