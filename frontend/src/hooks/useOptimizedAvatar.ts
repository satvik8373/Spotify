import { useState, useEffect } from 'react';
import { imageCache } from '@/utils/imageCache';

/**
 * Hook for loading avatar images with rate limiting and fallback
 */
export const useOptimizedAvatar = (
  imageUrl: string | null | undefined,
  fallbackUrl = 'https://ui-avatars.com/api/?background=1db954&color=fff&name=User'
) => {
  const [avatarUrl, setAvatarUrl] = useState<string>(fallbackUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setAvatarUrl(fallbackUrl);
      setHasError(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    imageCache.loadImage(imageUrl, fallbackUrl)
      .then(url => {
        if (isMounted) {
          setAvatarUrl(url);
          setHasError(url === fallbackUrl && imageUrl !== fallbackUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvatarUrl(fallbackUrl);
          setHasError(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [imageUrl, fallbackUrl]);

  return { avatarUrl, isLoading, hasError };
};

export default useOptimizedAvatar;
