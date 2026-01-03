import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SignInOAuthButtons() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 w-full">
      <Button
        type="button"
        className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black py-3 font-medium"
        onClick={() => navigate('/login')}
      >
        Sign in with Email
      </Button>
      
      <p className="text-center text-zinc-400 text-sm">
        One-click sign in to access all features
      </p>
    </div>
  );
}
