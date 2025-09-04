import React, { useEffect } from 'react';

type AdSlotProps = {
  containerId?: string;
  scriptSrc?: string;
};

/**
 * Reusable ad slot that injects a third-party script and exposes a container div by id.
 * Defaults are set for RevenueCPM Gate as provided.
 */
const AdSlot: React.FC<AdSlotProps> = ({
  containerId = 'container-ceadbd924eb4874749ca79caad8b2f5a',
  scriptSrc = 'https://pl27575583.revenuecpmgate.com/ceadbd924eb4874749ca79caad8b2f5a/invoke.js',
}) => {
  useEffect(() => {
    // Avoid injecting the script multiple times
    const existing = Array.from(document.scripts).find((s) => s.src === scriptSrc);
    const script = existing || document.createElement('script');

    if (!existing) {
      script.src = scriptSrc;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      document.body.appendChild(script);
    }

    return () => {
      // Do not remove if other slots might use it; leaving script is safer for SPA navigation
      // If you must clean up, ensure reference counting across instances first
    };
  }, [scriptSrc]);

  return <div id={containerId} />;
};

export default AdSlot;


