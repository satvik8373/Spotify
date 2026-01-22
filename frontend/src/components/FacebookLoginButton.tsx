import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { signInWithFacebook } from '@/services/facebookAuthService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface FacebookLoginButtonProps {
  onSuccess?: (user: any) => void;
  onError?: (error: any) => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
}

const FacebookLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const FacebookLoginButton: React.FC<FacebookLoginButtonProps> = ({
  onSuccess,
  onError,
  className = '',
  children,
  disabled = false,
  variant = 'outline'
}) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      const user = await signInWithFacebook();
      
      if (onSuccess) {
        onSuccess(user);
      } else {
        toast.success('Successfully signed in with Facebook!');
        navigate('/home');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in with Facebook';
      
      if (onError) {
        onError(error);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleFacebookLogin}
      disabled={disabled || loading}
      variant={variant}
      className={`flex items-center justify-center gap-2 ${className}`}
    >
      <FacebookLogo />
      {children || (
        <span>
          {loading ? 'Signing in...' : 'Continue with Facebook'}
        </span>
      )}
    </Button>
  );
};

export default FacebookLoginButton;