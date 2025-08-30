import React, { useState, useEffect } from 'react';

interface SmoothTransitionProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  onTransitionComplete?: () => void;
}

const SmoothTransition: React.FC<SmoothTransitionProps> = ({
  children,
  className = '',
  duration = 400,
  delay = 0,
  onTransitionComplete
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (isVisible && onTransitionComplete) {
      const timer = setTimeout(onTransitionComplete, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onTransitionComplete]);

  return (
    <div
      className={`smooth-transition ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        willChange: 'opacity, transform'
      }}
    >
      {children}
    </div>
  );
};

// Loading skeleton component for smooth loading states
export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`loading-skeleton ${className}`}>
    <div className="skeleton-animation"></div>
  </div>
);

// Page transition wrapper - Normal Speed
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SmoothTransition duration={500} delay={150}>
    {children}
  </SmoothTransition>
);

// Card transition wrapper - Normal Speed with staggered delays
export const CardTransition: React.FC<{ children: React.ReactNode; index?: number }> = ({ 
  children, 
  index = 0 
}) => (
  <SmoothTransition duration={400} delay={index * 100}>
    {children}
  </SmoothTransition>
);

// Fade in transition - Normal Speed
export const FadeIn: React.FC<{ children: React.ReactNode; delay?: number }> = ({ 
  children, 
  delay = 0 
}) => (
  <SmoothTransition duration={600} delay={delay}>
    {children}
  </SmoothTransition>
);

// Slide up transition - Normal Speed
export const SlideUp: React.FC<{ children: React.ReactNode; delay?: number }> = ({ 
  children, 
  delay = 0 
}) => (
  <SmoothTransition 
    duration={500} 
    delay={delay}
    className="slide-up"
  >
    {children}
  </SmoothTransition>
);

export default SmoothTransition;
