import { Router } from 'express';

const router = Router();

// Get APK download URL from environment variable
const apkDownloadUrl = process.env.APK_DOWNLOAD_URL || 'https://github.com/satvik8373/Mavrixfy-App/releases/download/v1.2.0/mavrixfy.apk';

// Version data - update this when releasing new versions
const versionData = {
  "latestVersion": "1.2.0",
  "minimumSupportedVersion": "1.0.0",
  "forceUpdate": false,
  "updateUrl": {
    "android": apkDownloadUrl,
    "ios": "https://apps.apple.com/app/mavrixfy/id123456789"
  },
  "message": "Version 1.2.0 is now available with exciting new features!",
  "changelog": [
    "Added automatic update checking system",
    "Fixed JioSaavn playlist showing only 10 songs",
    "Improved music streaming performance",
    "Enhanced UI animations",
    "Bug fixes and stability improvements"
  ],
  "releaseDate": "2026-02-23",
  "features": [
    {
      "title": "Auto Update System",
      "description": "App now automatically checks for updates and notifies you"
    },
    {
      "title": "Complete Playlists",
      "description": "Now see all songs in JioSaavn playlists, not just 10"
    },
    {
      "title": "Better Performance",
      "description": "Faster loading and smoother playback"
    }
  ]
};

// Get app version info
router.get('/check', async (req, res) => {
  try {
    res.json({
      success: true,
      data: versionData
    });
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get version info' 
    });
  }
});

// Compare version (helper endpoint)
router.post('/compare', async (req, res) => {
  try {
    const { currentVersion } = req.body;
    
    if (!currentVersion) {
      return res.status(400).json({ 
        success: false,
        error: 'Current version is required' 
      });
    }
    
    const isUpdateAvailable = compareVersions(currentVersion, versionData.latestVersion);
    const isBelowMinimum = compareVersions(currentVersion, versionData.minimumSupportedVersion);
    
    res.json({
      success: true,
      data: {
        currentVersion,
        latestVersion: versionData.latestVersion,
        minimumSupportedVersion: versionData.minimumSupportedVersion,
        updateAvailable: isUpdateAvailable,
        forceUpdate: versionData.forceUpdate || isBelowMinimum,
        updateUrl: versionData.updateUrl,
        message: versionData.message,
        changelog: versionData.changelog,
        features: versionData.features
      }
    });
  } catch (error) {
    console.error('Compare version error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to compare versions' 
    });
  }
});

// Helper function to compare versions
function compareVersions(current, target) {
  const c = current.split('.').map(Number);
  const t = target.split('.').map(Number);
  
  for (let i = 0; i < Math.max(c.length, t.length); i++) {
    const currentPart = c[i] || 0;
    const targetPart = t[i] || 0;
    
    if (targetPart > currentPart) return true;
    if (targetPart < currentPart) return false;
  }
  
  return false;
}

export default router;
