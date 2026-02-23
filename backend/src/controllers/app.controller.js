/**
 * App Controller
 * Handles app-level messages and notifications
 */

export const getAppMessage = async (req, res) => {
  try {
    // Return update message for version 1.0 and 1.1 users
    res.json({
      showUpdateMessage: true,
      version: '1.2.0',
      title: 'Update Available',
      message: '🎉 Version 1.2.0 is now available!\n\n✅ Auto update checking system\n✅ Lock screen media controls\n✅ Album artwork on lock screen\n✅ Background playback\n✅ Complete JioSaavn playlists\n\nDownload now to enjoy these features!',
      downloadUrl: 'https://mavrixfy.site/downloads/mavrixfy-1.2.0.apk',
      mandatory: false
    });
  } catch (error) {
    console.error('Error in getAppMessage:', error);
    res.status(500).json({ 
      message: 'Error fetching app message',
      showUpdateMessage: false 
    });
  }
};
