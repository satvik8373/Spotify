import { usePageTracking } from '@/hooks/useAnalytics';

/**
 * Component to track page views
 * Must be placed inside RouterProvider
 */
export const PageTracker = () => {
  usePageTracking();
  return null;
};
