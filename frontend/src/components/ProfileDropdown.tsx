import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  onLogout,
  className,
  style
}) => {
  if (!isOpen) return null;

  return (
    <div className={className} style={style}>
      <div className="py-1">
        <Link
          to="/profile"
          className="block px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onClick={onClose}
        >
          Profile
        </Link>
        <div className="border-t border-border my-1"></div>
        <Link
          to="/about"
          className="block px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onClick={onClose}
        >
          About
        </Link>
        <Link
          to="/privacy"
          className="block px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onClick={onClose}
        >
          Privacy Policy
        </Link>
        <Link
          to="/terms"
          className="block px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
          onClick={onClose}
        >
          Terms of Service
        </Link>
        <div className="border-t border-border my-1"></div>
        <button
          onClick={onLogout}
          className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent flex items-center transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default ProfileDropdown;