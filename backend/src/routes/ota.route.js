/**
 * OTA Update Routes for Production Backend
 * Serves JavaScript bundle updates to mobile clients
 */

import { Router } from 'express';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Store bundle metadata (in production, consider using database)
const bundleRegistry = new Map();

// Configuration
const BUNDLE_DIR = join(__dirname, '../../../ota_bundles');
const BASE_URL = process.env.OTA_BASE_URL || process.env.FRONTEND_URL || 'https://spotify-api-drab.vercel.app';

/**
 * Calculate file hash
 */
function calculateFileHash(filePath) {
  const fileBuffer = readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Compare versions (semver-like)
 */
function isNewerVersion(current, latest) {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const curr = currentParts[i] || 0;
    const lat = latestParts[i] || 0;

    if (lat > curr) return true;
    if (lat < curr) return false;
  }

  return false;
}

/**
 * Check if app version meets minimum requirement
 */
function meetsMinVersion(appVersion, minVersion) {
  const appParts = appVersion.split('.').map(Number);
  const minParts = minVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(appParts.length, minParts.length); i++) {
    const app = appParts[i] || 0;
    const min = minParts[i] || 0;

    if (app > min) return true;
    if (app < min) return false;
  }

  return true;
}

/**
 * Get latest bundle for platform
 */
function getLatestBundle(platform) {
  const platformBundles = Array.from(bundleRegistry.values()).filter(
    (bundle) => bundle.platform === platform || bundle.platform === 'all'
  );

  if (platformBundles.length === 0) {
    return null;
  }

  // Sort by version (descending) and return latest
  platformBundles.sort((a, b) => {
    if (isNewerVersion(a.version, b.version)) return -1;
    if (isNewerVersion(b.version, a.version)) return 1;
    return 0;
  });

  return platformBundles[0];
}

/**
 * Initialize bundle registry from existing files
 */
function initializeBundleRegistry() {
  try {
    if (!existsSync(BUNDLE_DIR)) {
      console.log('[OTA] Bundle directory not found:', BUNDLE_DIR);
      return;
    }

    const files = readdirSync(BUNDLE_DIR);
    const metadataFiles = files.filter(f => f.endsWith('.metadata.json'));

    for (const metaFile of metadataFiles) {
      try {
        const metaPath = join(BUNDLE_DIR, metaFile);
        const metadata = JSON.parse(readFileSync(metaPath, 'utf8'));
        
        const bundleFile = metaFile.replace('.metadata.json', '.bundle.js');
        const bundlePath = join(BUNDLE_DIR, bundleFile);
        
        if (existsSync(bundlePath)) {
          const stats = statSync(bundlePath);
          const bundleKey = `${metadata.platform}_${metadata.version}`;
          
          bundleRegistry.set(bundleKey, {
            version: metadata.version,
            platform: metadata.platform,
            minAppVersion: metadata.minAppVersion || '1.0.0',
            releaseNotes: metadata.releaseNotes || 'Update available',
            bundleUrl: `${BASE_URL}/api/ota/download/${metadata.version}/${metadata.platform}`,
            bundleHash: metadata.bundleHash,
            timestamp: metadata.timestamp || Date.now(),
            fileSize: stats.size,
          });
          
          console.log(`[OTA] Loaded bundle: ${bundleKey}`);
        }
      } catch (err) {
        console.error(`[OTA] Error loading metadata ${metaFile}:`, err.message);
      }
    }
    
    console.log(`[OTA] Initialized with ${bundleRegistry.size} bundles`);
  } catch (error) {
    console.error('[OTA] Registry initialization error:', error);
  }
}

// Initialize on module load
initializeBundleRegistry();

/**
 * Debug endpoint to check initialization status
 * GET /api/ota/debug
 */
router.get('/debug', async (req, res) => {
  try {
    const bundles = Array.from(bundleRegistry.values());
    res.json({
      success: true,
      bundleDir: BUNDLE_DIR,
      baseUrl: BASE_URL,
      bundlesLoaded: bundleRegistry.size,
      bundles: bundles,
      dirExists: existsSync(BUNDLE_DIR),
      files: existsSync(BUNDLE_DIR) ? readdirSync(BUNDLE_DIR) : [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Manual re-initialization endpoint
 * POST /api/ota/reload
 */
router.post('/reload', async (req, res) => {
  try {
    bundleRegistry.clear();
    initializeBundleRegistry();
    res.json({
      success: true,
      message: 'Bundle registry reloaded',
      bundlesLoaded: bundleRegistry.size,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Check for available updates
 * POST /api/ota/check
 */
router.post('/check', async (req, res) => {
  try {
    const { currentVersion, platform, appVersion } = req.body;

    if (!currentVersion || !platform || !appVersion) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
      });
    }

    console.log(`[OTA] Check request - Current: ${currentVersion}, Platform: ${platform}, App: ${appVersion}`);

    // Get latest bundle for platform
    const latestBundle = getLatestBundle(platform);

    if (!latestBundle) {
      return res.json({
        success: true,
        updateAvailable: false,
        message: 'No bundles available',
      });
    }

    // Check if update is available
    const updateAvailable = isNewerVersion(currentVersion, latestBundle.version);

    // Check if app version meets minimum requirement
    const meetsRequirement = meetsMinVersion(appVersion, latestBundle.minAppVersion);

    if (!meetsRequirement) {
      return res.json({
        success: true,
        updateAvailable: false,
        message: 'App version too old, please update from store',
        requiresAppUpdate: true,
      });
    }

    if (updateAvailable) {
      console.log(`[OTA] Update available: ${latestBundle.version}`);
      return res.json({
        success: true,
        updateAvailable: true,
        bundleInfo: latestBundle,
      });
    }

    return res.json({
      success: true,
      updateAvailable: false,
      message: 'Already on latest version',
    });
  } catch (error) {
    console.error('[OTA] Check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Download bundle file
 * GET /api/ota/download/:version/:platform
 */
router.get('/download/:version/:platform', async (req, res) => {
  try {
    const { version, platform } = req.params;

    const bundleKey = `${platform}_${version}`;
    const metadata = bundleRegistry.get(bundleKey);

    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'Bundle not found',
      });
    }

    const bundlePath = join(BUNDLE_DIR, `${platform}_${version}.bundle.js`);

    if (!existsSync(bundlePath)) {
      return res.status(404).json({
        success: false,
        error: 'Bundle file not found',
      });
    }

    console.log(`[OTA] Serving bundle: ${bundleKey}`);

    // Set headers for download
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Content-Disposition', `attachment; filename="${platform}_${version}.bundle.js"`);
    res.setHeader('X-Bundle-Version', version);
    res.setHeader('X-Bundle-Hash', metadata.bundleHash);

    // Send file
    res.sendFile(bundlePath);
  } catch (error) {
    console.error('[OTA] Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Register/Upload new bundle (admin endpoint)
 * POST /api/ota/register
 */
router.post('/register', async (req, res) => {
  try {
    const { version, platform, minAppVersion, releaseNotes } = req.body;

    if (!version || !platform || !minAppVersion) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
      });
    }

    const bundlePath = join(BUNDLE_DIR, `${platform}_${version}.bundle.js`);

    if (!existsSync(bundlePath)) {
      return res.status(404).json({
        success: false,
        error: 'Bundle file not found. Please upload the bundle first.',
      });
    }

    // Calculate hash
    const bundleHash = calculateFileHash(bundlePath);
    const stats = statSync(bundlePath);

    const metadata = {
      version,
      platform,
      minAppVersion,
      releaseNotes,
      bundleUrl: `${BASE_URL}/api/ota/download/${version}/${platform}`,
      bundleHash,
      timestamp: Date.now(),
      fileSize: stats.size,
    };

    const bundleKey = `${platform}_${version}`;
    bundleRegistry.set(bundleKey, metadata);

    console.log(`[OTA] Registered bundle: ${bundleKey}`);

    res.json({
      success: true,
      message: 'Bundle registered successfully',
      metadata,
    });
  } catch (error) {
    console.error('[OTA] Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * List all available bundles
 * GET /api/ota/bundles
 */
router.get('/bundles', async (req, res) => {
  try {
    const bundles = Array.from(bundleRegistry.values());
    
    res.json({
      success: true,
      bundles: bundles.sort((a, b) => b.timestamp - a.timestamp),
    });
  } catch (error) {
    console.error('[OTA] List error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Get bundle metadata
 * GET /api/ota/metadata/:version/:platform
 */
router.get('/metadata/:version/:platform', async (req, res) => {
  try {
    const { version, platform } = req.params;
    const bundleKey = `${platform}_${version}`;
    const metadata = bundleRegistry.get(bundleKey);

    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'Bundle not found',
      });
    }

    res.json({
      success: true,
      metadata,
    });
  } catch (error) {
    console.error('[OTA] Metadata error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Delete bundle (admin endpoint)
 * DELETE /api/ota/bundle/:version/:platform
 */
router.delete('/bundle/:version/:platform', async (req, res) => {
  try {
    const { version, platform } = req.params;
    const bundleKey = `${platform}_${version}`;

    if (!bundleRegistry.has(bundleKey)) {
      return res.status(404).json({
        success: false,
        error: 'Bundle not found',
      });
    }

    bundleRegistry.delete(bundleKey);

    console.log(`[OTA] Deleted bundle: ${bundleKey}`);

    res.json({
      success: true,
      message: 'Bundle deleted successfully',
    });
  } catch (error) {
    console.error('[OTA] Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
