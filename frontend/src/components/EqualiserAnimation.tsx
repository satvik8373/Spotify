import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EqualiserAnimationProps {
  className?: string;
}

const EqualiserAnimation = ({ className }: EqualiserAnimationProps) => {
  const [bars, setBars] = useState<number[]>([]);
  
  useEffect(() => {
    // Initialize with random values
    setBars(Array.from({ length: 3 }, () => Math.random() * 100));
    
    // Update animation every 250ms
    const interval = setInterval(() => {
      setBars(Array.from({ length: 3 }, () => Math.random() * 100));
    }, 250);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className={cn('flex items-center justify-center space-x-0.5', className)}>
      {bars.map((height, i) => (
        <div 
          key={i} 
          className="w-0.5 bg-green-500" 
          style={{ height: `${Math.max(40, height)}%` }}
        ></div>
      ))}
    </div>
  );
};

export default EqualiserAnimation; 