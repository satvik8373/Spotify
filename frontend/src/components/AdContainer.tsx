import { useEffect, useRef } from 'react';

interface AdContainerProps {
  className?: string;
}

export const AdContainer = ({ className = '' }: AdContainerProps) => {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Only load the script once
    if (scriptLoaded.current) return;

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://pl28828967.effectivegatecpm.com/4473542c95a69467ff6331ad52d1452e/invoke.js';
    
    document.body.appendChild(script);
    scriptLoaded.current = true;

    return () => {
      // Cleanup: remove script when component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className={`w-full flex justify-center items-center my-6 ${className}`}>
      <div 
        id="container-4473542c95a69467ff6331ad52d1452e"
        className="max-w-full overflow-hidden"
      />
    </div>
  );
};
