/**
 * Formats time in seconds to mm:ss format
 * @param seconds The time in seconds
 * @returns Formatted time string in mm:ss format
 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) {
    return '0:00';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Formats time in seconds to a more human-readable format with hours if needed
 * @param seconds The time in seconds
 * @returns Formatted time string like "2 hr 30 min" or "45 min"
 */
export const formatLongDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) {
    return '0 min';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hr ${minutes > 0 ? `${minutes} min` : ''}`;
  }

  return `${minutes} min`;
};
