import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Trash2, Edit, Star, Music, Search, AlertCircle, Upload, X } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Playlist } from '@/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  getAllPublicPlaylists, 
  updatePublicPlaylist, 
  deletePublicPlaylist, 
  featurePlaylist,
  updatePublicPlaylistWithImage
} from '@/services/adminService';

// Default placeholder image for when Cloudinary URL fails
const DEFAULT_PLACEHOLDER = 'https://placehold.co/300x300/1DB954/FFFFFF?text=Music';

const AdminPlaylistsPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated } = useAuthStore();
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    featured: false,
    imageUrl: ''
  });
  
  // Add new state for image file upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  
  // Check if user is admin and load playlists
  useEffect(() => {
    const checkAdminAndLoadPlaylists = async () => {
      setIsLoading(true);
      
      // Check if user is logged in
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      
      // Check if user is admin
      if (!isAdmin) {
        toast.error('Unauthorized: Admin access required');
        navigate('/');
        return;
      }
      
      // Load playlists
      try {
        const publicPlaylists = await getAllPublicPlaylists();
        setPlaylists(publicPlaylists);
        setFilteredPlaylists(publicPlaylists);
      } catch (error) {
        console.error('Error loading public playlists:', error);
        toast.error('Failed to load playlists');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminAndLoadPlaylists();
  }, [isAdmin, isAuthenticated, navigate]);
  
  // Filter playlists when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPlaylists(playlists);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = playlists.filter(playlist => 
      playlist.name.toLowerCase().includes(query) ||
      playlist.description.toLowerCase().includes(query) ||
      playlist.createdBy.fullName.toLowerCase().includes(query)
    );
    
    setFilteredPlaylists(filtered);
  }, [searchQuery, playlists]);
  
  // Handle edit playlist
  const handleEditClick = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setEditFormData({
      name: playlist.name,
      description: playlist.description,
      isPublic: playlist.isPublic,
      featured: playlist.featured,
      imageUrl: playlist.imageUrl
    });
    setImagePreview(playlist.imageUrl);
    setImageFile(null);
    setIsEditDialogOpen(true);
  };
  
  // Handle image file change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match(/image\/(jpeg|jpg|png|webp)/i)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }
    
    setImageFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Remove image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setEditFormData({ ...editFormData, imageUrl: '' });
  };
  
  // Handle save edit
  const handleSaveEdit = async () => {
    if (!selectedPlaylist) return;
    
    try {
      setIsUploading(true);
      let updatedPlaylist;
      
      // Check if we need to upload a new image
      if (imageFile) {
        // Create form data for image upload
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('name', editFormData.name);
        formData.append('description', editFormData.description);
        formData.append('isPublic', String(editFormData.isPublic));
        formData.append('featured', String(editFormData.featured));
        
        // Use updatePublicPlaylistWithImage instead
        updatedPlaylist = await updatePublicPlaylistWithImage(selectedPlaylist._id, formData);
      } else {
        // Use regular update without image
        updatedPlaylist = await updatePublicPlaylist(selectedPlaylist._id, {
          ...editFormData,
          // If imagePreview is null, explicitly set imageUrl to empty string to remove image
          imageUrl: imagePreview || ''
        });
      }
      
      // Update playlists state
      setPlaylists(prevPlaylists => 
        prevPlaylists.map(p => 
          p._id === selectedPlaylist._id ? updatedPlaylist : p
        )
      );
      
      toast.success('Playlist updated successfully');
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Failed to update playlist');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle delete playlist
  const handleDeleteClick = (playlist: Playlist) => {
    setPlaylistToDelete(playlist);
    setIsDeleteDialogOpen(true);
  };
  
  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!playlistToDelete) return;
    
    try {
      await deletePublicPlaylist(playlistToDelete._id);
      
      // Update playlists state
      setPlaylists(prevPlaylists => 
        prevPlaylists.filter(p => p._id !== playlistToDelete._id)
      );
      
      toast.success('Playlist deleted successfully');
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist');
    }
  };
  
  // Handle feature/unfeature playlist
  const handleFeatureToggle = async (playlist: Playlist) => {
    try {
      const updatedPlaylist = await featurePlaylist(playlist._id, !playlist.featured);
      
      // Update playlists state
      setPlaylists(prevPlaylists => 
        prevPlaylists.map(p => 
          p._id === playlist._id ? updatedPlaylist : p
        )
      );
      
      toast.success(`Playlist ${updatedPlaylist.featured ? 'featured' : 'unfeatured'} successfully`);
    } catch (error) {
      console.error('Error featuring/unfeaturing playlist:', error);
      toast.error('Failed to update playlist');
    }
  };
  
  // Handle image error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = DEFAULT_PLACEHOLDER;
  };
  
  // If loading, show spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Admin Dashboard - Public Playlists</h1>
          <p className="text-muted-foreground">Manage all public playlists in the system</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      {filteredPlaylists.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No playlists found</h3>
          <p className="text-muted-foreground text-center">
            {searchQuery ? 'Try a different search term' : 'There are no public playlists in the system yet'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border shadow-sm">
          <ScrollArea className="h-[70vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Featured</TableHead>
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Songs</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlaylists.map((playlist) => (
                  <TableRow key={playlist._id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleFeatureToggle(playlist)}
                        className={playlist.featured ? "text-yellow-500" : "text-muted-foreground"}
                        title={playlist.featured ? "Unfeature playlist" : "Feature playlist"}
                      >
                        <Star className="h-5 w-5" fill={playlist.featured ? "currentColor" : "none"} />
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                        {playlist.imageUrl ? (
                          <img 
                            src={playlist.imageUrl} 
                            alt={playlist.name} 
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Music className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="truncate max-w-[180px]">{playlist.name}</span>
                    </TableCell>
                    <TableCell className="truncate max-w-[200px]">
                      {playlist.description || <span className="text-muted-foreground italic">No description</span>}
                    </TableCell>
                    <TableCell>{playlist.createdBy.fullName}</TableCell>
                    <TableCell>{playlist.songs.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(playlist)}
                          title="Edit playlist"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(playlist)}
                          className="text-destructive hover:text-destructive/80"
                          title="Delete playlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}
      
      {/* Edit Playlist Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>
              Make changes to the playlist details below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right font-medium">
                Name
              </label>
              <Input
                id="name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="image" className="text-right font-medium pt-2">
                Image
              </label>
              <div className="col-span-3 space-y-3">
                {imagePreview ? (
                  <div className="relative w-32 h-32 rounded-md overflow-hidden border border-border">
                    <img 
                      src={imagePreview} 
                      alt="Playlist cover" 
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-md bg-muted flex flex-col items-center justify-center border border-dashed border-border">
                    <Music className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">No image</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <label 
                    htmlFor="image-upload" 
                    className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80"
                  >
                    <Upload className="h-4 w-4" />
                    {imagePreview ? 'Change image' : 'Upload image'}
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  
                  {imagePreview && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRemoveImage}
                      type="button"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: Square JPEG or PNG, 300x300 pixels or larger
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="description" className="text-right font-medium pt-2">
                Description
              </label>
              <Textarea
                id="description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="col-span-3"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="isPublic" className="text-right font-medium">
                Public
              </label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={editFormData.isPublic}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, isPublic: checked })}
                />
                <label htmlFor="isPublic" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {editFormData.isPublic ? 'Public' : 'Private'}
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="featured" className="text-right font-medium">
                Featured
              </label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={editFormData.featured}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, featured: checked })}
                />
                <label htmlFor="featured" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {editFormData.featured ? 'Featured' : 'Not featured'}
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the playlist "{playlistToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlaylistsPage; 