import express from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Get current version info
router.get('/check', async (req, res) => {
  try {
    // Read package.json to get current version
    const packagePath = join(__dirname, '../../package.json');
    const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    // You can implement your own version checking logic here
    // For example, check against a remote API, database, or environment variable
    
    const currentVersion = packageData.version;
    
    // Example: Check if there's a newer version available
    // This is where you'd implement your version comparison logic
    const latestVersion = process.env.LATEST_VERSION || currentVersion;
    const isUpdateAvailable = latestVersion !== currentVersion;
    
    if (isUpdateAvailable) {
      res.json({
        version: latestVersion,
        buildTime: new Date().toISOString(),
        features: [
          'Performance improvements',
          'Bug fixes',
          'New features',
          'Enhanced user experience'
        ],
        critical: false, // Set to true for critical updates
        currentVersion: currentVersion,
        updateAvailable: true
      });
    } else {
      res.json({
        version: currentVersion,
        buildTime: new Date().toISOString(),
        updateAvailable: false,
        message: 'You have the latest version'
      });
    }
  } catch (error) {
    console.error('Error checking version:', error);
    res.status(500).json({
      error: 'Failed to check version',
      message: error.message
    });
  }
});

// Get current version info (for debugging)
router.get('/current', async (req, res) => {
  try {
    const packagePath = join(__dirname, '../../package.json');
    const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    res.json({
      version: packageData.version,
      name: packageData.name,
      buildTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error getting current version:', error);
    res.status(500).json({
      error: 'Failed to get current version',
      message: error.message
    });
  }
});

export default router;
