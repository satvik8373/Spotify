/**
 * Minimal iOS audio helpers used by the core player.
 */

let hasUnlockedIOSAudio = false;

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const configureForIOS = (audio: HTMLAudioElement): void => {
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.setAttribute('x-webkit-airplay', 'allow');
  audio.crossOrigin = 'anonymous';
  (audio as HTMLAudioElement & { disablePictureInPicture?: boolean }).disablePictureInPicture = true;
};

/**
 * iOS requires a user gesture before reliable media playback.
 * We unlock once by playing a tiny silent data URI.
 */
export const unlockAudioOnIOS = (): void => {
  if (!isIOS() || hasUnlockedIOSAudio) return;

  hasUnlockedIOSAudio = true;

  const silentAudio = new Audio();
  silentAudio.src =
    'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/////////////////////////////////////////////////';
  configureForIOS(silentAudio);

  silentAudio
    .play()
    .then(() => {
      silentAudio.pause();
      silentAudio.remove();
    })
    .catch(() => {
      // Ignore unlock failures; normal user-initiated play can still work.
    });
};
