import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '@/stores/useAdminStore';
import { Playlist } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Music, Trash2, Star, StarOff, Edit, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { 
    isAdmin, 
    isAdminChecked, 
    adminPlaylists, 
    isLoading, 
    isUpdating,
    isDeleting,
    checkAdminStatus, 
    fetchAdminPlaylists,
    updatePlaylist,
    deletePlaylist,
    featurePlaylist
  } = useAdminStore();

  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    isPublic: true,
    featured: false
  });
  const [deleteConfirmPlaylist, setDeleteConfirmPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    const init = async () => {
      const isUserAdmin = await checkAdminStatus();
      if (isUserAdmin) {
        fetchAdminPlaylists();
      }
    };
    init();
  }, [checkAdminStatus, fetchAdminPlaylists]);

  // If admin status check is complete and user is not admin, redirect
  useEffect(() => {
    if (isAdminChecked && !isAdmin) {
      navigate('/');
      toast.error('You do not have admin access');
    }
  }, [isAdminChecked, isAdmin, navigate]);

  const handleEditClick = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setEditForm({
      name: playlist.name || '',
      description: playlist.description || '',
      isPublic: playlist.isPublic !== false, // Default to true if undefined
      featured: playlist.featured === true
    });
  };

  const handleEditSubmit = async () => {
    if (!editingPlaylist) return;
    
    try {
      const result = await updatePlaylist(editingPlaylist._id, {
        name: editForm.name,
        description: editForm.description,
        isPublic: editForm.isPublic,
        featured: editForm.featured
      });
      
      if (result) {
        toast.success('Playlist updated successfully');
        setEditingPlaylist(null);
      } else {
        toast.error('Failed to update playlist');
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('An error occurred while updating the playlist');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmPlaylist) return;
    
    try {
      const result = await deletePlaylist(deleteConfirmPlaylist._id);
      
      if (result) {
        toast.success('Playlist deleted successfully');
        setDeleteConfirmPlaylist(null);
      } else {
        toast.error('Failed to delete playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('An error occurred while deleting the playlist');
    }
  };

  const handleFeatureToggle = async (playlist: Playlist) => {
    try {
      const newFeaturedState = !playlist.featured;
      const result = await featurePlaylist(playlist._id, newFeaturedState);
      
      if (result) {
        toast.success(`Playlist ${newFeaturedState ? 'featured' : 'unfeatured'} successfully`);
      } else {
        toast.error(`Failed to ${newFeaturedState ? 'feature' : 'unfeature'} playlist`);
      }
    } catch (error) {
      console.error('Error toggling feature status:', error);
      toast.error('An error occurred while updating feature status');
    }
  };

  if (!isAdminChecked || (isAdminChecked && !isAdmin)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Checking admin access...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-6">Manage public playlists and site content</p>
      
      <Separator className="my-6" />
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Public Playlists</h2>
          <Button onClick={() => fetchAdminPlaylists()} variant="outline" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Refresh
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading playlists...</p>
          </div>
        ) : adminPlaylists.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <Music className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-xl font-medium">No public playlists found</h3>
            <p className="text-muted-foreground mt-2">Public playlists will appear here for management</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminPlaylists.map((playlist) => (
              <Card key={playlist._id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="line-clamp-1">{playlist.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {playlist.description || 'No description'}
                      </CardDescription>
                    </div>
                    {playlist.featured && (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">
                        Featured
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-muted/50 rounded-md overflow-hidden mb-3">
                    {playlist.imageUrl ? (
                      <img 
                        src={playlist.imageUrl} 
                        alt={playlist.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/171717/404040?text=Playlist';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Music className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Creator:</span>
                      <span>{playlist.createdBy?.fullName || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Songs:</span>
                      <span>{playlist.songs?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Visibility:</span>
                      <span>{playlist.isPublic !== false ? 'Public' : 'Private'}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleFeatureToggle(playlist)}
                      disabled={isUpdating}
                    >
                      {playlist.featured ? (
                        <StarOff className="h-4 w-4 mr-1" />
                      ) : (
                        <Star className="h-4 w-4 mr-1" />
                      )}
                      {playlist.featured ? 'Unfeature' : 'Feature'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => setDeleteConfirmPlaylist(playlist)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/playlist/${playlist._id}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleEditClick(playlist)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Edit Playlist Dialog */}
      <Dialog open={!!editingPlaylist} onOpenChange={(open) => !open && setEditingPlaylist(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>
              Make changes to the playlist details below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                className="col-span-3"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isPublic" className="text-right">
                Public
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="isPublic"
                  checked={editForm.isPublic}
                  onCheckedChange={(checked) => setEditForm({...editForm, isPublic: checked})}
                />
                <Label htmlFor="isPublic">
                  {editForm.isPublic ? 'Public' : 'Private'}
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="featured" className="text-right">
                Featured
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="featured"
                  checked={editForm.featured}
                  onCheckedChange={(checked) => setEditForm({...editForm, featured: checked})}
                />
                <Label htmlFor="featured">
                  {editForm.featured ? 'Featured' : 'Not Featured'}
                </Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlaylist(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmPlaylist} onOpenChange={(open) => !open && setDeleteConfirmPlaylist(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the playlist "{deleteConfirmPlaylist?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmPlaylist(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete Playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 