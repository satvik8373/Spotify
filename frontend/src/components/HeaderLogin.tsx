import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getGoogleAuthUrl } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings } from 'lucide-react';
import { signOut } from '@/services/auth-service';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderLoginProps {
  className?: string;
}

const HeaderLogin = ({ className }: HeaderLoginProps) => {
  const { user, isAuthenticated } = useAuth();

  const handleLogin = () => {
    window.location.href = getGoogleAuthUrl();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isAuthenticated && user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full h-8 w-8 p-0 overflow-hidden hover:bg-rose-950/30">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-white" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-white">
            <DropdownMenuLabel className="text-zinc-400 font-normal">
              <div className="flex flex-col">
                <span className="text-white font-medium">{user.name}</span>
                <span className="text-xs text-zinc-500 truncate">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem 
              className="hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800"
              onClick={() => window.location.href = '/account'}
            >
              <Settings className="mr-2 h-4 w-4 text-zinc-400" />
              <span>Account</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem 
              className="hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800" 
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4 text-zinc-400" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            onClick={handleLogin}
            variant="ghost"
            className="text-zinc-400 hover:text-white hover:bg-transparent text-sm"
          >
            Sign In
          </Button>
          <Button
            onClick={handleLogin}
            className="bg-white hover:bg-white/90 text-black font-bold rounded-full text-sm px-6 py-2 h-auto"
          >
            Sign Up
          </Button>
        </div>
      )}
    </div>
  );
};

export default HeaderLogin; 