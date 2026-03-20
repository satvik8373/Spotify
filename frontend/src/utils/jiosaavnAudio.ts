export const JIOSAAVN_AUDIO_QUALITY_ORDER = [
  '320kbps',
  '160kbps',
  '96kbps',
  '48kbps',
  '12kbps',
] as const;

export interface JioSaavnDownloadUrl {
  quality?: string;
  url?: string;
  link?: string;
}

export const getHighestQualityDownload = (
  downloadUrl?: JioSaavnDownloadUrl[] | null
): JioSaavnDownloadUrl | null => {
  if (!Array.isArray(downloadUrl) || downloadUrl.length === 0) {
    return null;
  }

  for (const quality of JIOSAAVN_AUDIO_QUALITY_ORDER) {
    const matched = downloadUrl.find((entry) => entry?.quality === quality);
    if (matched) {
      return matched;
    }
  }

  return downloadUrl[downloadUrl.length - 1] ?? null;
};

export const getHighestQualityAudioUrl = (
  downloadUrl?: JioSaavnDownloadUrl[] | null
): string => {
  const bestDownload = getHighestQualityDownload(downloadUrl);
  return bestDownload?.url || bestDownload?.link || '';
};
