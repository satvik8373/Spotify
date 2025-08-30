import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'white';
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className,
  text
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const variantClasses = {
    default: 'border-gray-200 border-t-gray-600',
    primary: 'border-gray-200 border-t-green-500',
    secondary: 'border-gray-200 border-t-blue-500',
    white: 'border-white/20 border-t-white'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin-slow rounded-full border-2',
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-fade-in">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
