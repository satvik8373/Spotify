import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Calendar, Edit, Save, X, Camera, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { signOut } from '@/services/hybridAuthService';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (user?.name) {
      setEditedName(user.name);
    }
  }, [isAuthenticated, user, navigate]);

  const handleSave = async () => {
    if (!editedName.trim()) return;
    
    setIsLoading(true);
    try {
      // TODO: Implement profile update logic
      // await updateProfile({ name: editedName.trim() });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedName(user?.name || '');
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-semibold">Profile</h1>
          <div className="w-8" />
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name || 'Profile'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors">
              <Camera className="h-4 w-4 text-white" />
            </button>
          </div>
          
          {/* Name Section */}
          <div className="text-center space-y-2">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-xl font-semibold bg-transparent border-b border-border focus:border-green-500 focus:outline-none text-center min-w-[120px]"
                  placeholder="Enter name"
                  maxLength={50}
                />
                <button
                  onClick={handleSave}
                  disabled={isLoading || !editedName.trim()}
                  className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <Save className="h-3 w-3 text-white" />
                </button>
                <button
                  onClick={handleCancel}
                  className="h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{user?.name || 'No name set'}</h2>
                <button
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
                >
                  <Edit className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Details */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground">{user?.email || 'No email'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Member since</p>
                <p className="text-foreground">
                  {user?.createdAt 
                    ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long' 
                      })
                    : 'Unknown'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
