import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get app version info
router.get('/check', async (req, res) => {
  try {
    const versionFilePath = path.join(__dirname, '../../../app-version.json');
    const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
    
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

    const versionFilePath = path.join(__dirname, '../../../app-version.json');
    const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
    
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
