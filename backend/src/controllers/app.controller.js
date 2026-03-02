/**
 * App Controller
 * Handles app-level messages and notifications
 */

// Get APK download URL from environment variable
const apkDownloadUrl = process.env.APK_DOWNLOAD_URL || 'https://github.com/satvik8373/Mavrixfy-App/releases/download/v1.2.1/mavrixfy.apk';

export const getAppMessage = async (req, res) => {
  try {
    // Return update message for version 1.0, 1.1, and 1.2.0 users
    res.json({
      showUpdateMessage: true,
      version: '1.2.1',
      title: '🎉 Update Available',
      message: 'Version 1.2.1 is now available!\n\n✨ What\'s New:\n✅ Optimized app size - 30% smaller\n✅ Enhanced performance & stability\n✅ Better audio streaming\n✅ Android 14 support\n✅ Bug fixes & improvements\n\nDownload now for the best experience!',
      downloadUrl: apkDownloadUrl,
      mandatory: false,
      changelog: [
        'Optimized APK size for faster downloads',
        'Enhanced audio streaming performance',
        'Fixed JioSaavn playlist loading issues',
        'Improved Android 14 compatibility',
        'Better error handling and stability'
      ],
      releaseDate: '2026-03-02'
    });
  } catch (error) {
    console.error('Error in getAppMessage:', error);
    res.status(500).json({ 
      message: 'Error fetching app message',
      showUpdateMessage: false 
    });
  }
};
