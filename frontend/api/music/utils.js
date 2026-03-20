const AUDIO_QUALITY_ORDER = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];

export function getHighestQualityDownload(downloadUrl) {
  if (!Array.isArray(downloadUrl) || downloadUrl.length === 0) {
    return null;
  }

  for (const quality of AUDIO_QUALITY_ORDER) {
    const matched = downloadUrl.find((entry) => entry?.quality === quality);
    if (matched) {
      return matched;
    }
  }

  return downloadUrl[downloadUrl.length - 1] || null;
}

export function getHighestQualityAudioUrl(downloadUrl) {
  const bestDownload = getHighestQualityDownload(downloadUrl);
  return bestDownload?.url || bestDownload?.link || '';
}
